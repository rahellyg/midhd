import { useMemo, useState, useEffect } from "react";
import { MessageCircleQuestion, Send, Users, MessageSquareReply } from "lucide-react";
import BottomNav from "@/components/layout/BottomNav";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/api/apiClient";

const FORUM_REPORTS_STORAGE_KEY = "midhd_forum_reports_v1";
const FORUM_BLOCKED_USERS_STORAGE_KEY = "midhd_forum_blocked_users_v1";
const MODERATION_REPORT_EMAIL = "rahelly23@gmail.com";
const MODERATION_REPORT_WEBHOOK = import.meta.env.VITE_MODERATION_REPORT_WEBHOOK || "";

const INAPPROPRIATE_PATTERNS = [
  "fuck",
  "f*ck",
  "shit",
  "bitch",
  "slut",
  "nigger",
  "nigga",
  "whore",
  "asshole",
  "motherfucker",
  "kike",
  "faggot",
  "dick",
  "cock",
  "cunt",
  "בן זונה",
  "בת זונה",
  "זין",
  "כוס אמא",
  "כוסעמק",
  "שרמוטה",
  "מזדיין",
  "ניגר",
  "הומו מסריח",
  "יא זבל",
];

const getNowIso = () => new Date().toISOString();

const normalizeText = (value) => String(value || "").toLowerCase().replace(/\s+/g, " ").trim();

const createId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const readList = (key) => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeList = (key, value) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
};

const docToThread = (doc) => ({
  id: doc.id,
  question: doc.question || "",
  author: doc.author || "אנונימי",
  createdAt: doc.created_date || doc.createdAt || new Date().toISOString(),
  answers: Array.isArray(doc.answers) ? doc.answers : [],
});

const detectInappropriateTerms = (text) => {
  const normalized = normalizeText(text);
  if (!normalized) {
    return [];
  }
  return INAPPROPRIATE_PATTERNS.filter((term) => normalized.includes(term));
};

const createUserIdentifier = (user) => {
  return String(user?.id || user?.email || user?.user_email || user?.full_name || "anonymous");
};

const buildModerationEmailLink = (report) => {
  const subject = encodeURIComponent(`[Forum Moderation] Blocked ${report.type}`);
  const body = encodeURIComponent(
    [
      `Timestamp: ${report.createdAt}`,
      `User: ${report.userName}`,
      `User ID: ${report.userId}`,
      `Type: ${report.type}`,
      `Matched Terms: ${report.matchedTerms.join(", ")}`,
      "",
      "Submitted Content:",
      report.content,
    ].join("\n")
  );
  return `mailto:${MODERATION_REPORT_EMAIL}?subject=${subject}&body=${body}`;
};

const reportModerationIncident = async (report) => {
  const reports = readList(FORUM_REPORTS_STORAGE_KEY);
  writeList(FORUM_REPORTS_STORAGE_KEY, [report, ...reports]);

  if (MODERATION_REPORT_WEBHOOK) {
    try {
      await fetch(MODERATION_REPORT_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });
      return;
    } catch {
      // Fall back to email compose if webhook is unavailable.
    }
  }

  if (typeof window !== "undefined") {
    const mailtoUrl = buildModerationEmailLink(report);
    window.open(mailtoUrl, "_blank", "noopener,noreferrer");
  }
};

const getDisplayName = (user) => {
  return (
    user?.full_name ||
    user?.name ||
    user?.email ||
    user?.user_email ||
    "משתמש/ת"
  );
};

const formatDate = (isoDate) => {
  try {
    return new Date(isoDate).toLocaleString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

export default function Forum() {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [questionText, setQuestionText] = useState("");
  const [answerInputs, setAnswerInputs] = useState({});
  const [blockedUsers, setBlockedUsers] = useState(() => readList(FORUM_BLOCKED_USERS_STORAGE_KEY));
  const [moderationMessage, setModerationMessage] = useState("");

  const loadThreadsFromFirestore = async () => {
    try {
      setThreadsLoading(true);
      const list = await api.entities.ForumThread.list("-created_date", 200);
      setThreads(list.map(docToThread));
    } catch (e) {
      console.error("Forum load failed:", e);
      setThreads([]);
    } finally {
      setThreadsLoading(false);
    }
  };

  useEffect(() => {
    loadThreadsFromFirestore();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const currentUserId = useMemo(() => createUserIdentifier(user), [user]);
  const isCurrentUserBlocked = useMemo(() => blockedUsers.includes(currentUserId), [blockedUsers, currentUserId]);

  const sortedThreads = useMemo(() => {
    return [...threads].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [threads]);

  const totalAnswers = useMemo(() => {
    return sortedThreads.reduce((count, thread) => count + (thread.answers?.length || 0), 0);
  }, [sortedThreads]);

  const blockAndReportUser = async ({ type, content, matchedTerms }) => {
    const nextBlockedUsers = blockedUsers.includes(currentUserId)
      ? blockedUsers
      : [...blockedUsers, currentUserId];

    setBlockedUsers(nextBlockedUsers);
    writeList(FORUM_BLOCKED_USERS_STORAGE_KEY, nextBlockedUsers);

    const report = {
      id: createId(),
      type,
      userId: currentUserId,
      userName: getDisplayName(user),
      content,
      matchedTerms,
      createdAt: getNowIso(),
    };

    await reportModerationIncident(report);
    setModerationMessage("התוכן זוהה כלא הולם. החשבון נחסם מפרסום בפורום ודווח לצוות.");
  };

  const submitQuestion = async () => {
    if (isCurrentUserBlocked) {
      setModerationMessage("החשבון שלך חסום מפרסום בפורום עקב תוכן לא הולם.");
      return;
    }

    const trimmed = questionText.trim();
    if (!trimmed) {
      return;
    }

    const matchedTerms = detectInappropriateTerms(trimmed);
    if (matchedTerms.length > 0) {
      await blockAndReportUser({
        type: "question",
        content: trimmed,
        matchedTerms,
      });
      setQuestionText("");
      return;
    }

    try {
      await api.entities.ForumThread.create({
        question: trimmed,
        author: getDisplayName(user),
        user_email: user?.email || null,
        answers: [],
      });
      await loadThreadsFromFirestore();
      setQuestionText("");
      setModerationMessage("");
    } catch (e) {
      console.error("Forum create failed:", e);
      setModerationMessage("שמירת השאלה נכשלה. נסה שוב.");
    }
  };

  const submitAnswer = async (threadId) => {
    if (isCurrentUserBlocked) {
      setModerationMessage("החשבון שלך חסום מפרסום בפורום עקב תוכן לא הולם.");
      return;
    }

    const trimmed = (answerInputs[threadId] || "").trim();
    if (!trimmed) {
      return;
    }

    const matchedTerms = detectInappropriateTerms(trimmed);
    if (matchedTerms.length > 0) {
      await blockAndReportUser({
        type: "answer",
        content: trimmed,
        matchedTerms,
      });
      setAnswerInputs((prev) => ({ ...prev, [threadId]: "" }));
      return;
    }

    const thread = threads.find((t) => t.id === threadId);
    if (!thread) return;
    const newAnswer = {
      id: createId(),
      text: trimmed,
      author: getDisplayName(user),
      createdAt: getNowIso(),
    };
    try {
      await api.entities.ForumThread.update(threadId, {
        answers: [...(thread.answers || []), newAnswer],
      });
      await loadThreadsFromFirestore();
      setAnswerInputs((prev) => ({ ...prev, [threadId]: "" }));
      setModerationMessage("");
    } catch (e) {
      console.error("Forum answer failed:", e);
      setModerationMessage("שמירת התשובה נכשלה. נסה שוב.");
    }
  };

  return (
    <div className="min-h-screen pb-28 px-4 pt-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">פורום קהילה</h1>
        <p className="text-slate-500 text-sm">שאלו שאלות, שתפו ניסיון, ותענו לאחרים.</p>
      </div>

      <section className="glass rounded-3xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-3 text-slate-700">
          <MessageCircleQuestion size={18} className="text-indigo-500" />
          <span className="font-semibold">שאלה חדשה</span>
        </div>
        <textarea
          value={questionText}
          onChange={(event) => setQuestionText(event.target.value)}
          placeholder="מה הייתם רוצים לשאול את הקהילה?"
          disabled={isCurrentUserBlocked}
          className="w-full min-h-24 bg-white/85 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <button
          onClick={submitQuestion}
          disabled={isCurrentUserBlocked}
          className="mt-3 w-full sm:w-auto rounded-2xl bg-indigo-600 text-white px-5 py-2.5 font-semibold hover:bg-indigo-700 transition-colors"
        >
          פרסם שאלה
        </button>
        {moderationMessage && (
          <p className="mt-3 text-sm rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-700">
            {moderationMessage}
          </p>
        )}
        {isCurrentUserBlocked && (
          <p className="mt-2 text-xs text-slate-500">
            לפרטי חסימה או ערעור ניתן לפנות אל {MODERATION_REPORT_EMAIL}
          </p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 mb-5">
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{sortedThreads.length}</p>
          <p className="text-xs text-slate-500">שאלות בפורום</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{totalAnswers}</p>
          <p className="text-xs text-slate-500">תגובות מהקהילה</p>
        </div>
      </section>

      {threadsLoading ? (
        <div className="glass rounded-3xl p-8 text-center">
          <p className="font-semibold text-slate-700">טוען פורום...</p>
        </div>
      ) : sortedThreads.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center">
          <Users className="mx-auto text-slate-400 mb-3" size={36} />
          <p className="font-semibold text-slate-700">עדיין אין שאלות בפורום</p>
          <p className="text-sm text-slate-500 mt-1">תהיו הראשונים לשאול שאלה ולקבל עזרה.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedThreads.map((thread) => (
            <article key={thread.id} className="glass rounded-3xl p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="font-semibold text-slate-800 leading-7">{thread.question}</p>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                נכתב על ידי {thread.author} • {formatDate(thread.createdAt)}
              </p>

              <div className="space-y-2 mb-4">
                {(thread.answers || []).map((answer) => (
                  <div key={answer.id} className="rounded-2xl border border-slate-100 bg-white/80 p-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <MessageSquareReply size={14} className="text-emerald-600" />
                      <span>{answer.author}</span>
                      <span>•</span>
                      <span>{formatDate(answer.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-6">{answer.text}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  value={answerInputs[thread.id] || ""}
                  onChange={(event) =>
                    setAnswerInputs((prev) => ({
                      ...prev,
                      [thread.id]: event.target.value,
                    }))
                  }
                  placeholder="כתבו תשובה..."
                  disabled={isCurrentUserBlocked}
                  className="flex-1 bg-white/85 rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
                <button
                  onClick={() => submitAnswer(thread.id)}
                  disabled={isCurrentUserBlocked}
                  className="rounded-2xl bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700 transition-colors"
                  aria-label="שלח תשובה"
                >
                  <Send size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
