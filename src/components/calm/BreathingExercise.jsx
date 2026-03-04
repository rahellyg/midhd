import { useState, useEffect } from "react";

const exercises = [
  { id: "4-7-8", label: "4-7-8", desc: "להרגעה עמוקה", inhale: 4, hold: 7, exhale: 8 },
  { id: "box", label: "נשימת קופסא", desc: "לאיזון ורוגע", inhale: 4, hold: 4, exhale: 4 },
  { id: "calm", label: "נשימה רגילה", desc: "להרגעה מהירה", inhale: 4, hold: 0, exhale: 6 },
];

export default function BreathingExercise() {
  const [selected, setSelected] = useState(exercises[0]);
  const [phase, setPhase] = useState("idle"); // idle | inhale | hold | exhale
  const [count, setCount] = useState(0);
  const [rounds, setRounds] = useState(0);

  useEffect(() => {
    if (phase === "idle") return;
    const timer = setInterval(() => {
      setCount(c => {
        if (c <= 1) {
          setPhase(p => {
            if (p === "inhale") {
              if (selected.hold > 0) { setCount(selected.hold); return "hold"; }
              setCount(selected.exhale); return "exhale";
            }
            if (p === "hold") { setCount(selected.exhale); return "exhale"; }
            if (p === "exhale") {
              setRounds(r => r + 1);
              setCount(selected.inhale); return "inhale";
            }
            return p;
          });
          return c;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, selected]);

  const start = () => {
    setRounds(0);
    setCount(selected.inhale);
    setPhase("inhale");
  };

  const stop = () => { setPhase("idle"); setCount(0); };

  const phaseLabel = { inhale: "שאפ... 🌬️", hold: "עצור... 🫁", exhale: "נשוף... 💨", idle: "" };
  const phaseColor = { inhale: "from-blue-400 to-cyan-400", hold: "from-purple-400 to-indigo-400", exhale: "from-emerald-400 to-teal-400", idle: "from-slate-200 to-slate-300" };
  const scale = phase === "inhale" ? "scale-125" : phase === "hold" ? "scale-125" : phase === "exhale" ? "scale-75" : "scale-100";

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Exercise selector */}
      <div className="flex flex-col gap-2 w-full">
        {exercises.map(ex => (
          <button
            key={ex.id}
            onClick={() => { setSelected(ex); stop(); }}
            className={`flex justify-between items-center px-4 py-3 rounded-2xl border transition-all ${selected.id === ex.id ? "border-indigo-300 bg-indigo-50" : "border-slate-100 bg-white/60 hover:bg-white"}`}
          >
            <span className="font-semibold text-slate-700">{ex.label}</span>
            <span className="text-sm text-slate-500">{ex.desc}</span>
          </button>
        ))}
      </div>

      {/* Breathing circle */}
      <div className="relative flex items-center justify-center w-48 h-48">
        <div className={`absolute w-36 h-36 rounded-full bg-gradient-to-br ${phaseColor[phase]} opacity-20 transition-all duration-1000 ease-in-out ${scale}`} />
        <div className={`absolute w-28 h-28 rounded-full bg-gradient-to-br ${phaseColor[phase]} opacity-40 transition-all duration-1000 ease-in-out ${scale}`} />
        <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${phaseColor[phase]} transition-all duration-1000 ease-in-out ${scale} flex items-center justify-center text-white text-2xl font-bold shadow-xl`}>
          {phase !== "idle" ? count : ""}
        </div>
      </div>

      {phase !== "idle" && (
        <div className="text-center">
          <p className="text-xl font-bold text-slate-700">{phaseLabel[phase]}</p>
          <p className="text-sm text-slate-400 mt-1">סבב {rounds + 1}</p>
        </div>
      )}

      {phase === "idle" ? (
        <button onClick={start} className="btn-primary text-white font-semibold rounded-2xl px-10 py-3">
          התחל תרגיל 🌿
        </button>
      ) : (
        <button onClick={stop} className="bg-white/80 text-slate-600 font-semibold rounded-2xl px-10 py-3 border border-slate-200 hover:bg-slate-50 transition-all">
          עצור
        </button>
      )}
    </div>
  );
}
