import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Coffee } from "lucide-react";

export default function PomodoroTimer({ onSessionComplete }) {
  const [mode, setMode] = useState("focus"); // focus | break
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [focusMin, setFocusMin] = useState(25);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s === 0) {
            setMinutes(m => {
              if (m === 0) {
                clearInterval(intervalRef.current);
                setRunning(false);
                if (mode === "focus") onSessionComplete?.(focusMin);
                // switch mode
                if (mode === "focus") { setMode("break"); setMinutes(5); }
                else { setMode("focus"); setMinutes(focusMin); }
                return mode === "focus" ? 5 : focusMin;
              }
              return m - 1;
            });
            return 59;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode, focusMin]);

  const reset = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setMode("focus");
    setMinutes(focusMin);
    setSeconds(0);
  };

  const progress = mode === "focus"
    ? 1 - (minutes * 60 + seconds) / (focusMin * 60)
    : 1 - (minutes * 60 + seconds) / (5 * 60);

  const circumference = 2 * Math.PI * 90;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Mode tabs */}
      <div className="flex gap-2 glass rounded-2xl p-1">
        {[{ key: "focus", label: "🎯 פוקוס" }, { key: "break", label: "☕ הפסקה" }].map(m => (
          <button
            key={m.key}
            onClick={() => { setMode(m.key); setMinutes(m.key === "focus" ? focusMin : 5); setSeconds(0); setRunning(false); }}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${mode === m.key ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow" : "text-slate-500"}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Circle timer */}
      <div className="relative w-52 h-52">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="90" fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <circle
            cx="100" cy="100" r="90" fill="none"
            stroke="url(#grad)" strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={mode === "focus" ? "#6366f1" : "#10b981"} />
              <stop offset="100%" stopColor={mode === "focus" ? "#a855f7" : "#3b82f6"} />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold text-slate-800 tabular-nums">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
          <span className="text-sm text-slate-500 mt-1">{mode === "focus" ? "זמן פוקוס" : "הפסקה"}</span>
        </div>
      </div>

      {/* Duration selector */}
      {mode === "focus" && (
        <div className="flex gap-2">
          {[15, 25, 30, 45].map(min => (
            <button
              key={min}
              onClick={() => { setFocusMin(min); setMinutes(min); setSeconds(0); setRunning(false); }}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${focusMin === min ? "bg-indigo-500 text-white" : "bg-white/70 text-slate-600 hover:bg-indigo-50"}`}
            >
              {min}′
            </button>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-4 items-center">
        <button onClick={reset} className="w-12 h-12 rounded-2xl bg-white/70 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-all">
          <RotateCcw size={20} />
        </button>
        <button
          onClick={() => setRunning(r => !r)}
          className="w-20 h-20 rounded-3xl btn-primary flex items-center justify-center text-white shadow-xl"
        >
          {running ? <Pause size={30} /> : <Play size={30} className="mr-[-3px]" />}
        </button>
        <div className="w-12 h-12 rounded-2xl bg-white/70 flex items-center justify-center text-slate-400">
          <Coffee size={20} />
        </div>
      </div>
    </div>
  );
}
