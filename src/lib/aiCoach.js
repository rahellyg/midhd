const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export const hasRemoteAI = () => Boolean(import.meta.env.VITE_OPENAI_API_KEY);

const buildPrompt = ({ problem, minutes, energy }) => {
  return [
    'You are an ADHD-friendly coach. Return strict JSON only.',
    'Language: Hebrew.',
    'Tone: warm, practical, short.',
    'Provide an actionable plan in this exact schema:',
    '{"quickReset":"...","firstStep":"...","focusBlock":"...","safetyLine":"...","targetedTips":["...","..."],"encouragement":"..."}',
    `Problem: ${problem}`,
    `Available minutes: ${minutes}`,
    `Energy: ${energy}`,
    'Constraints: No medical diagnosis, no dangerous advice, no shaming.'
  ].join('\n');
};

const safeJsonParse = (rawText) => {
  try {
    return JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

const normalizePlan = (candidate, fallbackPlan) => {
  if (!candidate || typeof candidate !== 'object') {
    return fallbackPlan;
  }
  const targetedTips = Array.isArray(candidate.targetedTips) ? candidate.targetedTips.filter(Boolean).slice(0, 4) : [];
  return {
    quickReset: candidate.quickReset || fallbackPlan.quickReset,
    firstStep: candidate.firstStep || fallbackPlan.firstStep,
    focusBlock: candidate.focusBlock || fallbackPlan.focusBlock,
    safetyLine: candidate.safetyLine || fallbackPlan.safetyLine,
    targetedTips: targetedTips.length ? targetedTips : fallbackPlan.targetedTips,
    encouragement: candidate.encouragement || fallbackPlan.encouragement
  };
};

export const generateRemoteAIPlan = async ({ problem, minutes, energy, fallbackPlan }) => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    return fallbackPlan;
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      max_tokens: 350,
      messages: [
        { role: 'system', content: 'You are a practical ADHD support coach that outputs JSON only.' },
        { role: 'user', content: buildPrompt({ problem, minutes, energy }) }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`AI request failed (${response.status})`);
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content || '';
  const parsed = safeJsonParse(text);
  return normalizePlan(parsed, fallbackPlan);
};
