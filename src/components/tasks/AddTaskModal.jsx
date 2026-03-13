import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";
import { X, Plus, Minus } from "lucide-react";

const getDefaultForm = () => ({
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  task_type: "other",
  estimated_minutes: 25,
  steps: [],
  scheduled_date: new Date().toISOString().split("T")[0],
});

const buildFormFromTask = (taskToEdit) => {
  if (!taskToEdit) {
    return getDefaultForm();
  }

  return {
    title: taskToEdit.title || "",
    description: taskToEdit.description || "",
    status: taskToEdit.status || "todo",
    priority: taskToEdit.priority || "medium",
    task_type: ["work", "home", "personal_development", "other"].includes(taskToEdit.task_type) ? taskToEdit.task_type : "other",
    estimated_minutes: taskToEdit.estimated_minutes ?? 25,
    steps: Array.isArray(taskToEdit.steps)
      ? taskToEdit.steps.map((step) => ({ text: step?.text || "", done: Boolean(step?.done) }))
      : [],
    scheduled_date: taskToEdit.scheduled_date || "",
  };
};

export default function AddTaskModal({ onClose, onSave, taskToEdit = null }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isEditMode = Boolean(taskToEdit?.id);
  const [form, setForm] = useState(() => buildFormFromTask(taskToEdit));
  const [stepText, setStepText] = useState("");

  useEffect(() => {
    setForm(buildFormFromTask(taskToEdit));
    setStepText("");
  }, [taskToEdit]);

  const addStep = () => {
    if (!stepText.trim()) return;
    setForm(f => ({ ...f, steps: [...f.steps, { text: stepText.trim(), done: false }] }));
    setStepText("");
  };

  const removeStep = (idx) => {
    setForm(f => ({ ...f, steps: f.steps.filter((_, i) => i !== idx) }));
  };

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title.trim() || saving) return;
    setSaving(true);
    try {
      const payload = { ...form, user_email: taskToEdit?.user_email || user?.email || null };
      if (!payload.scheduled_date) {
        delete payload.scheduled_date;
      }
      const savePromise = isEditMode
        ? api.entities.Task.update(taskToEdit.id, payload)
        : api.entities.Task.create(payload);
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Save timeout')), 8000));
      await Promise.race([savePromise, timeout]);
      onSave?.();
    } catch (err) {
      console.error('Failed to save task:', err);
    } finally {
      setSaving(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 pb-24">
      <div className="glass rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-6 pb-3">
          <h2 className="text-xl font-bold text-slate-800">{isEditMode ? t("tasks.modalTitleEdit") : t("tasks.modalTitleNew")}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={22} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 flex-1">
        <div className="space-y-4">
          <input
            className="w-full bg-white/80 rounded-2xl px-4 py-3 text-slate-800 placeholder-slate-400 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder={t("tasks.titlePlaceholder")}
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
          <textarea
            className="w-full bg-white/80 rounded-2xl px-4 py-3 text-slate-800 placeholder-slate-400 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 h-20 resize-none"
            placeholder={t("tasks.descriptionPlaceholder")}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{t("tasks.priorityLabel")}</label>
              <select
                className="w-full bg-white/80 rounded-2xl px-3 py-2.5 text-slate-700 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              >
                <option value="high">🔴 {t("tasks.priorityHigh")}</option>
                <option value="medium">🟡 {t("tasks.priorityMedium")}</option>
                <option value="low">🟢 {t("tasks.priorityLow")}</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{t("tasks.taskTypeLabel")}</label>
              <select
                className="w-full bg-white/80 rounded-2xl px-3 py-2.5 text-slate-700 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={form.task_type}
                onChange={e => setForm(f => ({ ...f, task_type: e.target.value }))}
              >
                <option value="work">{t("tasks.taskTypeWork")}</option>
                <option value="home">{t("tasks.taskTypeHome")}</option>
                <option value="personal_development">{t("tasks.taskTypePersonalDevelopment")}</option>
                <option value="other">{t("tasks.taskTypeOther")}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{t("tasks.estimatedMinutesLabel")}</label>
              <input
                type="number"
                className="w-full bg-white/80 rounded-2xl px-3 py-2.5 text-slate-700 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={form.estimated_minutes}
                onChange={e => setForm(f => ({ ...f, estimated_minutes: +e.target.value }))}
                min={5}
                max={240}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{t("tasks.dateLabel")}</label>
              <input
                type="date"
                className="w-full bg-white/80 rounded-2xl px-3 py-2.5 text-slate-700 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={form.scheduled_date}
                onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-2 block">{t("tasks.stepsLabel")}</label>
            <div className="flex gap-2 mb-2">
              <input
                className="flex-1 bg-white/80 rounded-xl px-3 py-2 text-sm text-slate-700 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder={t("tasks.addStepPlaceholder")}
                value={stepText}
                onChange={e => setStepText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addStep()}
              />
              <button onClick={addStep} className="bg-indigo-100 text-indigo-600 rounded-xl px-3 py-2 hover:bg-indigo-200 transition-colors">
                <Plus size={18} />
              </button>
            </div>
            {form.steps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white/60 rounded-xl px-3 py-2 mb-1">
                <span className="flex-1 text-sm text-slate-700">{step.text}</span>
                <button onClick={() => removeStep(idx)} className="text-slate-300 hover:text-red-400">
                  <Minus size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
        </div>

        <div className="p-6 pt-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full text-white font-semibold rounded-2xl py-3.5 disabled:opacity-50"
          >
            {saving ? t("tasks.saving") : isEditMode ? `${t("tasks.updateTask")} ✨` : `${t("tasks.saveTask")} ✨`}
          </button>
        </div>
      </div>
    </div>
  );
}
