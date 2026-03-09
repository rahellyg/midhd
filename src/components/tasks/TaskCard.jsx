import { CheckCircle2, Circle, Clock, ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { api } from "@/api/apiClient";

const priorityConfig = {
  high: { label: "גבוהה", color: "bg-red-100 text-red-600", dot: "bg-red-500" },
  medium: { label: "בינונית", color: "bg-amber-100 text-amber-600", dot: "bg-amber-500" },
  low: { label: "נמוכה", color: "bg-emerald-100 text-emerald-600", dot: "bg-emerald-500" },
};

const energyConfig = {
  high: { label: "🔥 דחיפות גבוהה", color: "text-orange-500" },
  medium: { label: "⚡ דחיפות בינונית", color: "text-yellow-500" },
  low: { label: "🌿 דחיפות נמוכה", color: "text-green-500" },
};

export default function TaskCard({ task, onUpdate, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(false);

  const toggleDone = async () => {
    const newStatus = task.status === "done" ? "todo" : "done";
    await api.entities.Task.update(task.id, {
      status: newStatus,
      completed_at: newStatus === "done" ? new Date().toISOString() : null,
    });
    onUpdate?.();
  };

  const toggleStep = async (idx) => {
    const steps = [...(task.steps || [])];
    steps[idx] = { ...steps[idx], done: !steps[idx].done };
    await api.entities.Task.update(task.id, { steps });
    onUpdate?.();
  };

  const handleDelete = async () => {
    await api.entities.Task.delete(task.id);
    onDelete?.();
  };

  const isDone = task.status === "done";
  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const energy = energyConfig[task.energy_level] || energyConfig.medium;
  const stepsCount = task.steps?.length || 0;
  const doneSteps = task.steps?.filter(s => s.done).length || 0;

  return (
    <div className={`task-card glass rounded-3xl p-4 mb-3 ${isDone ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <button onClick={toggleDone} className="mt-0.5 shrink-0">
          {isDone
            ? <CheckCircle2 size={24} className="text-indigo-500" />
            : <Circle size={24} className="text-slate-300 hover:text-indigo-400 transition-colors" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-slate-800 ${isDone ? "line-through text-slate-400" : ""}`}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{task.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.color}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${priority.dot} mr-1`}></span>
              {priority.label}
            </span>
            {task.estimated_minutes && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock size={12} />
                {task.estimated_minutes} דק'
              </span>
            )}
            <span className={`text-xs ${energy.color}`}>{energy.label}</span>
          </div>
          {stepsCount > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">{doneSteps}/{stepsCount} שלבים</span>
                <button onClick={() => setExpanded(!expanded)} className="text-slate-400">
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div
                  className="bg-gradient-to-r from-indigo-400 to-purple-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${stepsCount ? (doneSteps / stepsCount) * 100 : 0}%` }}
                />
              </div>
              {expanded && (
                <div className="mt-2 space-y-1">
                  {task.steps.map((step, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleStep(idx)}
                      className="flex items-center gap-2 w-full text-right"
                    >
                      {step.done
                        ? <CheckCircle2 size={16} className="text-indigo-400 shrink-0" />
                        : <Circle size={16} className="text-slate-300 shrink-0" />}
                      <span className={`text-sm ${step.done ? "line-through text-slate-400" : "text-slate-700"}`}>
                        {step.text}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={() => onEdit?.(task)}
            className="text-slate-300 hover:text-indigo-500 transition-colors"
            aria-label="ערוך משימה"
          >
            <Pencil size={16} />
          </button>
          <button onClick={handleDelete} className="text-slate-200 hover:text-red-400 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}