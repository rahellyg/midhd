import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function UpdatePrompt() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const win = /** @type {any} */ (window);
    if (win.__pendingUpdateSW) {
      setVisible(true);
    }

    const handleUpdateReady = () => setVisible(true);
    window.addEventListener('swUpdateReady', handleUpdateReady);
    return () => window.removeEventListener('swUpdateReady', handleUpdateReady);
  }, []);

  if (!visible) return null;

  const handleUpdate = () => {
    setVisible(false);
    const win = /** @type {any} */ (window);
    win.__activatePendingUpdate?.();
  };

  const handleDismiss = () => setVisible(false);

  return (
    <div
      role="alert"
      className="fixed bottom-20 inset-x-0 z-50 flex justify-center px-4 pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-indigo-600 text-white shadow-xl px-4 py-3 flex items-center gap-3">
        <span className="text-sm flex-1 leading-snug">{t('update.ready')}</span>
        <button
          type="button"
          onClick={handleUpdate}
          className="shrink-0 rounded-xl bg-white text-indigo-700 text-sm font-semibold px-3 py-1.5 hover:bg-indigo-50 transition-colors"
        >
          {t('update.action')}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t('update.dismiss')}
          className="shrink-0 text-indigo-200 hover:text-white text-lg leading-none"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
