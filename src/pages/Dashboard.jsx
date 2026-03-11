import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCheck, Clock3, Lightbulb, Users2 } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { getContactReceiverEmail, sendContactEmail } from "@/lib/contactEmail";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { toast } from "@/components/ui/use-toast";

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user, logout } = useAuth();
  const getDefaultContactForm = () => ({
    fullName: user?.full_name || user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    message: "",
  });
  const [contactForm, setContactForm] = useState(getDefaultContactForm);
  const [contactFile, setContactFile] = useState(null);
  const [sendingContact, setSendingContact] = useState(false);
  const [contactStatus, setContactStatus] = useState({ type: "", text: "" });
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosInstallHint, setShowIosInstallHint] = useState(false);
  const shouldShowInstallButton = !isStandalone;

  const userName = user?.full_name || user?.name || user?.email || (i18n.language === 'he' ? 'הפרופיל שלי' : 'My profile');
  const receiverEmail = getContactReceiverEmail();
  const appPages = [
    { page: "Tasks", label: t('dashboard.pages.tasks') },
    { page: "Focus", label: t('dashboard.pages.focus') },
    { page: "Calm", label: t('dashboard.pages.calm') },
    { page: "Dopamine", label: t('dashboard.pages.dopamine') },
    { page: "Forum", label: t('dashboard.pages.forum') },
    { page: "AIHelp", label: t('dashboard.pages.aihelp') },
    { page: "DailyCheckIn", label: t('dashboard.pages.dailycheckin') },
  ];

  const featureCards = [
    { title: t('dashboard.feature1_title'), description: t('dashboard.feature1_desc'), icon: Clock3, iconBg: "bg-[#E8927C26]", iconColor: "text-[#E8927C]" },
    { title: t('dashboard.feature2_title'), description: t('dashboard.feature2_desc'), icon: CheckCheck, iconBg: "bg-[#2D5A4A1A]", iconColor: "text-[#2D5A4A]" },
    { title: t('dashboard.feature3_title'), description: t('dashboard.feature3_desc'), icon: Users2, iconBg: "bg-[#A8D5BA4D]", iconColor: "text-[#4A7A6A]" },
  ];
  const stats = [
    { value: "10K+", label: t('dashboard.stats_users') },
    { value: "95%", label: t('dashboard.stats_satisfaction') },
    { value: "50+", label: t('dashboard.stats_tools') },
    { value: "24/7", label: t('dashboard.stats_support') },
  ];

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const standaloneDisplayMode = window.matchMedia?.("(display-mode: standalone)")?.matches;
    const standaloneNavigator = window.navigator.standalone === true;
    const standalone = Boolean(standaloneDisplayMode || standaloneNavigator);
    setIsStandalone(Boolean(standalone));
    setShowIosInstallHint(Boolean(isIos && !standalone));

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPromptEvent(event);
    };

    const handleAppInstalled = () => {
      setInstallPromptEvent(null);
      setIsStandalone(true);
      setShowIosInstallHint(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    setContactForm((prev) => ({
      ...prev,
      fullName: prev.fullName || user?.full_name || user?.name || "",
      email: prev.email || user?.email || "",
      phone: prev.phone || user?.phone || "",
    }));
  }, [user?.full_name, user?.name, user?.email, user?.phone]);

  const handleInstallApp = async () => {
    if (installPromptEvent) {
      installPromptEvent.prompt();
      const choiceResult = await installPromptEvent.userChoice;
      if (choiceResult?.outcome === "accepted") {
        setInstallPromptEvent(null);
      }
      return;
    }

    toast({
      title: t("dashboard.installApp"),
      description: showIosInstallHint
        ? t("dashboard.iosInstallHint")
        : t("dashboard.installNotAvailableHint"),
    });
  };

    const handleContactChange = (field, value) => {
      setContactStatus({ type: "", text: "" });
      setContactForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleContactSubmit = async (event) => {
      event.preventDefault();
      const trimmedName = contactForm.fullName.trim();
      const trimmedEmail = contactForm.email.trim();
      const trimmedPhone = contactForm.phone.trim();
      const trimmedMessage = contactForm.message.trim();

      if (!trimmedName || !trimmedEmail || !trimmedMessage) {
        setContactStatus({ type: "error", text: t('dashboard.contactErrorFillFields') });
        return;
      }

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(trimmedEmail)) {
        setContactStatus({ type: "error", text: t('dashboard.contactErrorInvalidEmail') });
        return;
      }

      if (contactFile && contactFile.size > 10 * 1024 * 1024) {
        setContactStatus({ type: "error", text: t('dashboard.contactErrorFileTooLarge') });
        return;
      }

      try {
        setSendingContact(true);
        setContactStatus({ type: "", text: "" });

        await sendContactEmail({
          fullName: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
          message: trimmedMessage,
          attachment: contactFile,
        });

        setContactForm(getDefaultContactForm());
        setContactFile(null);
        setContactStatus({ type: "success", text: t('dashboard.contactSuccess') });
      } catch (error) {
        if (String(error?.message || "").includes("missing_email_config")) {
          setContactStatus({
            type: "error",
            text: t('dashboard.contactErrorMissingConfig'),
          });
        } else {
          setContactStatus({ type: "error", text: t('dashboard.contactErrorFailed') });
        }
      } finally {
        setSendingContact(false);
      }
    };

    return (
      <div dir={i18n.language === 'he' ? 'rtl' : 'ltr'} className="relative min-h-screen overflow-hidden bg-[#F0F7F4] text-[#2D5A4A]">
        <div className="landing-gradient-blob right-0 top-0 h-96 w-96 bg-[#7FB3A8]" />
        <div className="landing-gradient-blob bottom-20 left-10 h-72 w-72 bg-[#A8D5BA] [animation-delay:-4s]" />

        <nav
          className="relative z-10 px-6 py-4"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
        >
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex items-center justify-between">
            <div className="flex flex-col items-start gap-0.5">
              <div className="flex items-center gap-3">
                <img src={`${import.meta.env.BASE_URL}app-icon.svg`} alt="Midhd logo" className="h-10 w-10 rounded-xl" />
                <span className="text-xl font-bold">Midhd</span>
              </div>
              <span className="text-xs text-[#6B9B8A] mt-0.5">{t('dashboard.version', { version: '0.0.7' })}</span>
            </div>

            <div className="hidden items-center gap-6 md:flex">
              <LanguageSwitcher />
              <a href="#features" className="font-medium transition-opacity hover:opacity-70">{t('dashboard.features')}</a>
              <a href="#about" className="font-medium transition-opacity hover:opacity-70">{t('dashboard.about')}</a>
              <a href="#contact" className="font-medium transition-opacity hover:opacity-70">{t('dashboard.contactTitle')}</a>
            </div>
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {shouldShowInstallButton && (
                  <button
                    type="button"
                    onClick={handleInstallApp}
                    className="rounded-full border border-[#2D5A4A33] bg-white/90 px-4 py-2 text-sm font-semibold text-[#2D5A4A] transition-all hover:scale-105"
                  >
                    {t('dashboard.installApp')}
                  </button>
                )}
                <Link
                  to={createPageUrl("Profile")}
                  className="rounded-full border border-[#2D5A4A33] bg-white/70 px-4 py-2 text-sm font-semibold text-[#2D5A4A] transition-all hover:scale-105"
                >
                  {t('dashboard.profile')}
                </Link>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="rounded-full bg-[#E8927C] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-105 hover:opacity-90"
                >
                  {t('dashboard.logout')}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {shouldShowInstallButton && (
                  <button
                    type="button"
                    onClick={handleInstallApp}
                    className="rounded-full border border-[#2D5A4A33] bg-white/90 px-4 py-2 text-sm font-semibold text-[#2D5A4A] transition-all hover:scale-105"
                  >
                    {t('dashboard.installApp')}
                  </button>
                )}
                <Link
                  to="/login"
                  className="rounded-full border border-[#2D5A4A33] bg-white/70 px-4 py-2 text-sm font-semibold text-[#2D5A4A] transition-all hover:scale-105"
                >
                  {t('dashboard.login')}
                </Link>
                <Link
                  to="/login?mode=subscribe"
                  className="rounded-full bg-[#E8927C] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-105 hover:opacity-90"
                >
                  {t('dashboard.signup')}
                </Link>
              </div>
            )}
            </div>
            <div className="mt-3 flex items-center justify-end gap-2 md:hidden">
              {shouldShowInstallButton && (
                <button
                  type="button"
                  onClick={handleInstallApp}
                  className="rounded-full border border-[#2D5A4A33] bg-white/90 px-4 py-2 text-sm font-semibold text-[#2D5A4A] transition-all hover:scale-105"
                >
                  {t('dashboard.installApp')}
                </button>
              )}
              <LanguageSwitcher />
            </div>
          </div>
        </nav>

        <main className="relative z-10 px-6 pb-20 pt-12" id="about">
          <div className="mx-auto w-full max-w-6xl">
            <section className="landing-fade-in mx-auto mb-16 max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#2D5A4A1A] px-4 py-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#E8927C]" />
                <span className="text-sm font-medium">{t('dashboard.personalized')}</span>
              </div>

              <h1 className="mb-6 text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
                {t('dashboard.title1')}
                <br />
                {t('dashboard.title2')}
              </h1>

              <p className="mb-8 text-lg leading-relaxed text-[#4A7A6A] md:text-xl">
                {t('dashboard.subtitle1')}
                <br />
                {t('dashboard.subtitle2')}
              </p>

              {isAuthenticated ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="rounded-full bg-[#2D5A4A1A] px-5 py-2 text-sm font-semibold text-[#2D5A4A]">
                    {t('dashboard.loggedInAs', { userName })}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {appPages.map(({ page, label }) => (
                      <Link
                        key={page}
                        to={createPageUrl(page)}
                        className="rounded-full border border-[#2D5A4A33] bg-white/80 px-4 py-2 text-sm font-semibold text-[#2D5A4A] transition-all hover:scale-105"
                      >
                        {label}
                      </Link>
                    ))}
                    <Link
                      to={createPageUrl("Profile")}
                      className="rounded-full bg-[#E8927C] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-105"
                    >
                      {t('dashboard.profile')}
                    </Link>
                    <a
                      href="#contact"
                      className="rounded-full border border-[#2D5A4A33] bg-white/90 px-5 py-2.5 text-sm font-semibold text-[#2D5A4A] transition-all hover:scale-105"
                    >
                      {t('dashboard.contactTitle')}
                    </a>
                    {shouldShowInstallButton && (
                      <button
                        type="button"
                        onClick={handleInstallApp}
                        className="rounded-full bg-[#2D5A4A] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-105"
                      >
                        {t('dashboard.installApp')}
                      </button>
                    )}
                  </div>
                  {!isStandalone && showIosInstallHint && (
                    <p className="text-xs text-[#4A7A6A]">
                      {t('dashboard.iosInstallHint')}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link
                    to="/login"
                    className="rounded-full bg-[#E8927C] px-8 py-4 text-lg font-semibold text-white shadow-[0_10px_30px_rgba(232,146,124,0.3)] transition-all hover:scale-105"
                  >
                    {t('dashboard.login')}
                  </Link>
                  <Link
                    to="/login?mode=subscribe"
                    className="rounded-full border-2 border-[#2D5A4A] bg-transparent px-8 py-4 text-lg font-semibold text-[#2D5A4A] transition-all hover:scale-105"
                  >
                    {t('dashboard.quickSignup')}
                  </Link>
                  <a
                    href="#contact"
                    className="rounded-full border border-[#2D5A4A33] bg-white/90 px-8 py-4 text-lg font-semibold text-[#2D5A4A] transition-all hover:scale-105"
                  >
                    {t('dashboard.contactTitle')}
                  </a>
                  {shouldShowInstallButton && (
                    <button
                      type="button"
                      onClick={handleInstallApp}
                      className="rounded-full bg-[#2D5A4A] px-8 py-4 text-lg font-semibold text-white transition-all hover:scale-105"
                    >
                      {t('dashboard.installApp')}
                    </button>
                  )}
                </div>
              )}
              {!isAuthenticated && !isStandalone && showIosInstallHint && (
                <p className="mt-3 text-xs text-[#4A7A6A]">
                  {t('dashboard.iosInstallHint')}
                </p>
              )}
            </section>

            <section id="features" className="grid gap-6 md:grid-cols-3">
              {featureCards.map(({ title, description, icon: Icon, iconBg, iconColor }, index) => (
                <article
                  key={title}
                  className={`landing-card-hover landing-fade-in rounded-3xl bg-white p-8 shadow-sm landing-stagger-${index + 2}`}
                >
                  <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${iconBg}`}>
                    <Icon className={`h-7 w-7 ${iconColor}`} />
                  </div>
                  <h3 className="mb-3 text-xl font-bold">{title}</h3>
                  <p className="text-[#6B9B8A]">{description}</p>
                </article>
              ))}
            </section>

            <section className="landing-fade-in mt-16 rounded-3xl bg-[#2D5A4A] p-8 md:p-12" id="contact">
              <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-3">{t('dashboard.contactTitle')}</h2>
                  <p className="text-[#D7EEE5] text-sm mb-5">{t('dashboard.contactPrompt', { receiverEmail })}</p>

                  <form onSubmit={handleContactSubmit} className="space-y-3">
                    <input
                      type="text"
                      value={contactForm.fullName}
                      onChange={(event) => handleContactChange("fullName", event.target.value)}
                      className="w-full rounded-2xl border border-[#A8D5BA66] bg-white/95 px-4 py-3 text-sm text-[#2D5A4A] placeholder:text-[#6B9B8A] focus:outline-none focus:ring-2 focus:ring-[#A8D5BA]"
                      placeholder={t('dashboard.contactFullName')}
                    />
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(event) => handleContactChange("email", event.target.value)}
                      className="w-full rounded-2xl border border-[#A8D5BA66] bg-white/95 px-4 py-3 text-sm text-[#2D5A4A] placeholder:text-[#6B9B8A] focus:outline-none focus:ring-2 focus:ring-[#A8D5BA]"
                      placeholder={t('dashboard.contactEmail')}
                    />
                    <input
                      type="tel"
                      value={contactForm.phone}
                      onChange={(event) => handleContactChange("phone", event.target.value)}
                      className="w-full rounded-2xl border border-[#A8D5BA66] bg-white/95 px-4 py-3 text-sm text-[#2D5A4A] placeholder:text-[#6B9B8A] focus:outline-none focus:ring-2 focus:ring-[#A8D5BA]"
                      placeholder={t('dashboard.contactPhone')}
                    />
                    <textarea
                      value={contactForm.message}
                      onChange={(event) => handleContactChange("message", event.target.value)}
                      rows={4}
                      className="w-full rounded-2xl border border-[#A8D5BA66] bg-white/95 px-4 py-3 text-sm text-[#2D5A4A] placeholder:text-[#6B9B8A] focus:outline-none focus:ring-2 focus:ring-[#A8D5BA]"
                      placeholder={t('dashboard.contactMessage')}
                    />
                    <div>
                      <label className="block text-xs text-[#D7EEE5] mb-1">{t('dashboard.contactFileLabel')}</label>
                      <input
                        type="file"
                        onChange={(event) => {
                          setContactStatus({ type: "", text: "" });
                          setContactFile(event.target.files?.[0] || null);
                        }}
                        className="w-full rounded-2xl border border-[#A8D5BA66] bg-white/95 px-3 py-2 text-sm text-[#2D5A4A] file:mr-2 file:rounded-lg file:border-0 file:bg-[#E8927C] file:px-3 file:py-1.5 file:text-white"
                      />
                      <p className="text-[11px] text-[#D7EEE5] mt-1">{t('dashboard.contactFileHint')}</p>
                      {contactFile && (
                        <p className="text-xs text-[#CBE8DD] mt-1">{t('dashboard.contactFileSelected', { fileName: contactFile.name })}</p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={sendingContact}
                      className="rounded-2xl bg-[#E8927C] px-5 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
                    >
                      {sendingContact ? t('dashboard.contactSending') : t('dashboard.contactSend')}
                    </button>
                  </form>

                  {contactStatus.text && (
                    <p className={`mt-3 text-sm ${contactStatus.type === "success" ? "text-[#C9F9D8]" : "text-[#FFD4CC]"}`}>
                      {contactStatus.text}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-2">
                  {stats.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-[#A8D5BA33] bg-[#376959]/60 p-4">
                      <div className="mb-1 text-2xl font-bold text-white md:text-3xl">{item.value}</div>
                      <div className="text-[#CBE8DD] text-sm">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </main>

        <footer className="relative z-10 border-t border-[#2D5A4A1A] px-6 py-8">
          <div className="mx-auto max-w-6xl text-center">
            <p className="text-[#6B9B8A]">© 2026 Midhd. {t('dashboard.footer')}</p>
          </div>
        </footer>

        <Lightbulb className="pointer-events-none absolute bottom-6 left-6 h-6 w-6 text-[#2D5A4A4D]" />
      </div>
    );
}
