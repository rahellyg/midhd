import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCheck, Clock3, Lightbulb, Users2 } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { getContactReceiverEmail, sendContactEmail } from "@/lib/contactEmail";

const featureCards = [
  {
    title: "ניהול זמן חכם",
    description: "טכניקות פשוטות לניהול זמן שמותאמות במיוחד לאנשים עם ADHD. פומודורו, חלוקת משימות ועוד.",
    icon: Clock3,
    iconBg: "bg-[#E8927C26]",
    iconColor: "text-[#E8927C]",
  },
  {
    title: "רשימות משימות",
    description: "מערכת משימות ויזואלית ופשוטה שעוזרת לך לעקוב אחרי ההתקדמות בלי להרגיש מוצף.",
    icon: CheckCheck,
    iconBg: "bg-[#2D5A4A1A]",
    iconColor: "text-[#2D5A4A]",
  },
  {
    title: "קהילה תומכת",
    description: "הצטרף לקהילה של אנשים שמבינים אותך. שתף, למד וגדל יחד עם אחרים שמתמודדים עם אותם אתגרים.",
    icon: Users2,
    iconBg: "bg-[#A8D5BA4D]",
    iconColor: "text-[#4A7A6A]",
  },
];

const stats = [
  { value: "10K+", label: "משתמשים פעילים" },
  { value: "95%", label: "שביעות רצון" },
  { value: "50+", label: "כלים וטכניקות" },
  { value: "24/7", label: "תמיכה זמינה" },
];

export default function Dashboard() {
  const { isAuthenticated, user, logout } = useAuth();
  const [contactForm, setContactForm] = useState({ fullName: "", email: "", message: "" });
  const [contactFile, setContactFile] = useState(null);
  const [sendingContact, setSendingContact] = useState(false);
  const [contactStatus, setContactStatus] = useState({ type: "", text: "" });
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosInstallHint, setShowIosInstallHint] = useState(false);
  const appPages = [
    { page: "Tasks", label: "משימות" },
    { page: "Focus", label: "פוקוס" },
    { page: "Calm", label: "רגיעה" },
    { page: "Dopamine", label: "דופמין" },
    { page: "Forum", label: "פורום" },
    { page: "AIHelp", label: "עזרת AI" },
    { page: "DailyCheckIn", label: "שאלון יומי" },
  ];
  const userName = user?.full_name || user?.name || user?.email || "הפרופיל שלי";
  const receiverEmail = getContactReceiverEmail();

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches;
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

  const handleInstallApp = async () => {
    if (!installPromptEvent) return;

    installPromptEvent.prompt();
    const choiceResult = await installPromptEvent.userChoice;
    if (choiceResult?.outcome === "accepted") {
      setInstallPromptEvent(null);
    }
  };

  const handleContactChange = (field, value) => {
    setContactStatus({ type: "", text: "" });
    setContactForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleContactSubmit = async (event) => {
    event.preventDefault();
    const trimmedName = contactForm.fullName.trim();
    const trimmedEmail = contactForm.email.trim();
    const trimmedMessage = contactForm.message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      setContactStatus({ type: "error", text: "נא למלא שם, אימייל והודעה לפני שליחה." });
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      setContactStatus({ type: "error", text: "נא להזין כתובת אימייל תקינה." });
      return;
    }

    if (contactFile && contactFile.size > 10 * 1024 * 1024) {
      setContactStatus({ type: "error", text: "הקובץ גדול מדי. אפשר להעלות עד 10MB." });
      return;
    }

    try {
      setSendingContact(true);
      setContactStatus({ type: "", text: "" });

      await sendContactEmail({
        fullName: trimmedName,
        email: trimmedEmail,
        message: trimmedMessage,
        attachment: contactFile,
      });

      setContactForm({ fullName: "", email: "", message: "" });
      setContactFile(null);
      setContactStatus({ type: "success", text: "ההודעה נשלחה בהצלחה. נחזור אליך בהקדם." });
    } catch (error) {
      if (String(error?.message || "").includes("missing_email_config")) {
        setContactStatus({
          type: "error",
          text: "השליחה לא מוגדרת עדיין. יש להגדיר EmailJS בסביבת הפרויקט.",
        });
      } else {
        setContactStatus({ type: "error", text: "שליחת ההודעה נכשלה. נסה שוב בעוד רגע." });
      }
    } finally {
      setSendingContact(false);
    }
  };

  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden bg-[#F0F7F4] text-[#2D5A4A]">
      <div className="landing-gradient-blob right-0 top-0 h-96 w-96 bg-[#7FB3A8]" />
      <div className="landing-gradient-blob bottom-20 left-10 h-72 w-72 bg-[#A8D5BA] [animation-delay:-4s]" />

      <nav className="relative z-10 px-6 py-4">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/app-icon.svg" alt="Midhd logo" className="h-10 w-10 rounded-xl" />
            <span className="text-xl font-bold">Midhd</span>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="font-medium transition-opacity hover:opacity-70">תכונות</a>
            <a href="#about" className="font-medium transition-opacity hover:opacity-70">אודות</a>
            <a href="#contact" className="font-medium transition-opacity hover:opacity-70">צור קשר</a>
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                to={createPageUrl("Profile")}
                className="rounded-full border border-[#2D5A4A33] bg-white/70 px-4 py-2 text-sm font-semibold text-[#2D5A4A] transition-all hover:scale-105"
              >
                פרופיל
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="rounded-full bg-[#E8927C] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-105 hover:opacity-90"
              >
                התנתק
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-full border border-[#2D5A4A33] bg-white/70 px-4 py-2 text-sm font-semibold text-[#2D5A4A] transition-all hover:scale-105"
              >
                התחברות
              </Link>
              <Link
                to="/login?mode=subscribe"
                className="rounded-full bg-[#E8927C] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-105 hover:opacity-90"
              >
                הרשמה
              </Link>
            </div>
          )}
        </div>
      </nav>

      <main className="relative z-10 px-6 pb-20 pt-12" id="about">
        <div className="mx-auto w-full max-w-6xl">
          <section className="landing-fade-in mx-auto mb-16 max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#2D5A4A1A] px-4 py-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#E8927C]" />
              <span className="text-sm font-medium">מותאם במיוחד לך</span>
            </div>

            <h1 className="mb-6 text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
              המקום שלך
              <br />
              להתמקד ולהצליח
            </h1>

            <p className="mb-8 text-lg leading-relaxed text-[#4A7A6A] md:text-xl">
              כלים, טיפים ותמיכה לאנשים עם קשב וריכוז.
              <br />
              כי כולם ראויים להזדמנות להתמקד בדרך שמתאימה להם.
            </p>

            {isAuthenticated ? (
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-[#2D5A4A1A] px-5 py-2 text-sm font-semibold text-[#2D5A4A]">
                  מחובר/ת בתור {userName}
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
                    לפרופיל
                  </Link>
                  <a
                    href="#contact"
                    className="rounded-full border border-[#2D5A4A33] bg-white/90 px-5 py-2.5 text-sm font-semibold text-[#2D5A4A] transition-all hover:scale-105"
                  >
                    צור קשר
                  </a>
                  {!isStandalone && installPromptEvent && (
                    <button
                      type="button"
                      onClick={handleInstallApp}
                      className="rounded-full bg-[#2D5A4A] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-105"
                    >
                      התקנת האפליקציה
                    </button>
                  )}
                </div>
                {!isStandalone && showIosInstallHint && (
                  <p className="text-xs text-[#4A7A6A]">
                    באייפון: לחצו על שיתוף ואז "הוספה למסך הבית" כדי להתקין את האפליקציה.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  to="/login"
                  className="rounded-full bg-[#E8927C] px-8 py-4 text-lg font-semibold text-white shadow-[0_10px_30px_rgba(232,146,124,0.3)] transition-all hover:scale-105"
                >
                  התחברות
                </Link>
                <Link
                  to="/login?mode=subscribe"
                  className="rounded-full border-2 border-[#2D5A4A] bg-transparent px-8 py-4 text-lg font-semibold text-[#2D5A4A] transition-all hover:scale-105"
                >
                  הרשמה מהירה
                </Link>
                <a
                  href="#contact"
                  className="rounded-full border border-[#2D5A4A33] bg-white/90 px-8 py-4 text-lg font-semibold text-[#2D5A4A] transition-all hover:scale-105"
                >
                  צור קשר
                </a>
                {!isStandalone && installPromptEvent && (
                  <button
                    type="button"
                    onClick={handleInstallApp}
                    className="rounded-full bg-[#2D5A4A] px-8 py-4 text-lg font-semibold text-white transition-all hover:scale-105"
                  >
                    התקנת האפליקציה
                  </button>
                )}
              </div>
            )}
            {!isAuthenticated && !isStandalone && showIosInstallHint && (
              <p className="mt-3 text-xs text-[#4A7A6A]">
                באייפון: לחצו על שיתוף ואז "הוספה למסך הבית" כדי להתקין את האפליקציה.
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
                <h2 className="text-2xl font-bold text-white mb-3">צור קשר</h2>
                <p className="text-[#D7EEE5] text-sm mb-5">יש לך שאלה, רעיון או פידבק? שלחו הודעה ישירות למייל: {receiverEmail}</p>

                <form onSubmit={handleContactSubmit} className="space-y-3">
                  <input
                    type="text"
                    value={contactForm.fullName}
                    onChange={(event) => handleContactChange("fullName", event.target.value)}
                    className="w-full rounded-2xl border border-[#A8D5BA66] bg-white/95 px-4 py-3 text-sm text-[#2D5A4A] placeholder:text-[#6B9B8A] focus:outline-none focus:ring-2 focus:ring-[#A8D5BA]"
                    placeholder="שם מלא"
                  />
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(event) => handleContactChange("email", event.target.value)}
                    className="w-full rounded-2xl border border-[#A8D5BA66] bg-white/95 px-4 py-3 text-sm text-[#2D5A4A] placeholder:text-[#6B9B8A] focus:outline-none focus:ring-2 focus:ring-[#A8D5BA]"
                    placeholder="אימייל לחזרה"
                  />
                  <textarea
                    value={contactForm.message}
                    onChange={(event) => handleContactChange("message", event.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-[#A8D5BA66] bg-white/95 px-4 py-3 text-sm text-[#2D5A4A] placeholder:text-[#6B9B8A] focus:outline-none focus:ring-2 focus:ring-[#A8D5BA]"
                    placeholder="איך אפשר לעזור?"
                  />
                  <div>
                    <label className="block text-xs text-[#D7EEE5] mb-1">קובץ מצורף (אופציונלי)</label>
                    <input
                      type="file"
                      onChange={(event) => {
                        setContactStatus({ type: "", text: "" });
                        setContactFile(event.target.files?.[0] || null);
                      }}
                      className="w-full rounded-2xl border border-[#A8D5BA66] bg-white/95 px-3 py-2 text-sm text-[#2D5A4A] file:mr-2 file:rounded-lg file:border-0 file:bg-[#E8927C] file:px-3 file:py-1.5 file:text-white"
                    />
                    <p className="text-[11px] text-[#D7EEE5] mt-1">מקסימום 10MB. מתאים למסמכים ותמונות.</p>
                    {contactFile && (
                      <p className="text-xs text-[#CBE8DD] mt-1">נבחר: {contactFile.name}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={sendingContact}
                    className="rounded-2xl bg-[#E8927C] px-5 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
                  >
                    {sendingContact ? "שולח..." : "שליחה"}
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
          <p className="text-[#6B9B8A]">© 2026 Midhd. נבנה באהבה לקהילת ה-ADHD.</p>
        </div>
      </footer>

      <Lightbulb className="pointer-events-none absolute bottom-6 left-6 h-6 w-6 text-[#2D5A4A4D]" />
    </div>
  );
}