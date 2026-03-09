import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const SENTENCE_COUNT = 10;

const pickDailyIndex = () => {
  const today = new Date();
  const seed = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 2147483647;
  }
  return Math.abs(hash) % SENTENCE_COUNT;
};

export default function DailyMotivation() {
  const { t } = useTranslation();
  const sentenceKey = useMemo(() => {
    const index = pickDailyIndex();
    return `dailyMotivation.sentence${index + 1}`;
  }, []);

  return (
    <div className="max-w-lg mx-auto px-4 pt-5">
      <div className="rounded-2xl border border-indigo-100/80 bg-white/70 backdrop-blur px-4 py-3 shadow-sm">
        <p className="text-xs font-semibold text-indigo-600 mb-1">{t('dailyMotivation.title')}</p>
        <p className="text-sm text-slate-700 leading-6">{t(sentenceKey)}</p>
      </div>
    </div>
  );
}
