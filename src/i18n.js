import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import he from './locales/he.json';

const LANGUAGE_KEY = 'midhd_lang';

const getStoredLanguage = () => {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    if (stored === 'en' || stored === 'he') return stored;
  } catch {}
  return 'he';
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    he: { translation: he },
  },
  lng: getStoredLanguage(),
  fallbackLng: 'he',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(LANGUAGE_KEY, lng);
  } catch {}
  const dir = lng === 'he' ? 'rtl' : 'ltr';
  const lang = lng === 'he' ? 'he' : 'en';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lang);
});

// Set initial dir/lang
const initial = i18n.language;
document.documentElement.setAttribute('dir', initial === 'he' ? 'rtl' : 'ltr');
document.documentElement.setAttribute('lang', initial === 'he' ? 'he' : 'en');

export default i18n;
