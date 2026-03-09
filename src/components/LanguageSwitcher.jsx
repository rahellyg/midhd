import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const isHebrew = i18n.language === 'he';

  const toggle = () => {
    i18n.changeLanguage(isHebrew ? 'en' : 'he');
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-full border border-[#2D5A4A33] bg-white/70 px-3 py-1.5 text-sm font-medium text-[#2D5A4A] transition-all hover:opacity-80"
      title={isHebrew ? 'Switch to English' : 'עבור לעברית'}
      aria-label={isHebrew ? 'Switch to English' : 'Switch to Hebrew'}
    >
      {isHebrew ? 'EN' : 'עב'}
    </button>
  );
}
