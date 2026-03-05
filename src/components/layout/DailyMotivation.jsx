import { useMemo } from 'react';

const MOTIVATION_SENTENCES = [
  'צעד קטן היום הוא התקדמות אמיתית, גם אם זה לא מושלם.',
  'אתה לא צריך מוטיבציה מושלמת, רק התחלה קטנה אחת.',
  'כל משימה שאתה מסיים בונה ביטחון ליום הבא.',
  'ריכוז הוא שריר. כל דקה של תרגול מחזקת אותו.',
  'היום מספיק להיות טוב ב-1% מאתמול.',
  'נשימה עמוקה, התחלה קצרה, ותראה איך זה מתקדם.',
  'גם עצירה יזומה היא חלק מניהול קשב בריא.',
  'הצלחות קטנות מצטברות לשינוי גדול לאורך זמן.',
  'אתה לא מאחור, אתה בדרך שלך ובקצב שלך.',
  'תבחר משימה אחת עכשיו. זה כל מה שצריך כדי לזוז קדימה.'
];

const pickDailySentence = () => {
  const today = new Date();
  const seed = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 2147483647;
  }
  return MOTIVATION_SENTENCES[Math.abs(hash) % MOTIVATION_SENTENCES.length];
};

export default function DailyMotivation() {
  const sentence = useMemo(() => pickDailySentence(), []);

  return (
    <div className="max-w-lg mx-auto px-4 pt-5">
      <div className="rounded-2xl border border-indigo-100/80 bg-white/70 backdrop-blur px-4 py-3 shadow-sm">
        <p className="text-xs font-semibold text-indigo-600 mb-1">המשפט היומי</p>
        <p className="text-sm text-slate-700 leading-6">{sentence}</p>
      </div>
    </div>
  );
}
