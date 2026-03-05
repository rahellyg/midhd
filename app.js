(function () {
  'use strict';

  const STORAGE_KEYS = {
    userName: 'midhd_user_name',
    tasks: 'midhd_tasks',
    points: 'midhd_points',
    tasksCompleted: 'midhd_tasks_completed',
    sprintsFinished: 'midhd_sprints_finished',
    brainDump: 'midhd_brain_dump',
    sprintMinutes: 'midhd_sprint_minutes',
    lastActiveDate: 'midhd_last_active_date',
    streakCount: 'midhd_streak_count',
    dailyGoalTasks: 'midhd_daily_goal_tasks',
    dailyGoalMinutes: 'midhd_daily_goal_minutes',
    dailyStats: 'midhd_daily_stats',
  };

  const DEFAULT_TASKS = [
    { id: '1', text: 'לסיים את הדו"ח', done: false, favorite: false },
    { id: '2', text: 'להתקשר לרופא שיניים', done: true, favorite: false },
    { id: '3', text: '20 דקות אימון', done: false, favorite: false },
  ];

  let timerInterval = null;
  let timerSecondsLeft = 0;
  let timerPaused = false;
  let currentSprintTaskText = '';
  let currentSprintMinutes = 12;

  function getStorage(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v !== null ? JSON.parse(v) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function setStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(function (el) {
      el.classList.remove('active');
    });
    const screen = document.getElementById('screen-' + screenId);
    if (screen) screen.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-screen') === screenId);
    });

    if (screenId === 'progress') updateProgressStats();
    if (screenId === 'profile') updateProfileScreen();
    if (screenId === 'dashboard') recordActivity();
  }

  function getTodayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function getDailyStats() {
    return getStorage(STORAGE_KEYS.dailyStats, {});
  }

  function getTodayStats() {
    const all = getDailyStats();
    const key = getTodayKey();
    return all[key] || { tasksDone: 0, focusMinutes: 0 };
  }

  function addTodayTaskDone() {
    const key = getTodayKey();
    const all = getDailyStats();
    if (!all[key]) all[key] = { tasksDone: 0, focusMinutes: 0 };
    all[key].tasksDone = (all[key].tasksDone || 0) + 1;
    setStorage(STORAGE_KEYS.dailyStats, all);
  }

  function addTodayFocusMinutes(minutes) {
    const key = getTodayKey();
    const all = getDailyStats();
    if (!all[key]) all[key] = { tasksDone: 0, focusMinutes: 0 };
    all[key].focusMinutes = (all[key].focusMinutes || 0) + minutes;
    setStorage(STORAGE_KEYS.dailyStats, all);
  }

  function recordActivity() {
    const today = getTodayKey();
    const last = getStorage(STORAGE_KEYS.lastActiveDate, '');
    const streak = getStorage(STORAGE_KEYS.streakCount, 0);
    if (last === today) return;
    let newStreak = streak;
    if (last) {
      const lastD = new Date(last);
      const todayD = new Date(today);
      const diffDays = Math.round((todayD - lastD) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) newStreak = streak + 1;
      else if (diffDays > 1) newStreak = 1;
      else newStreak = 1;
    } else {
      newStreak = 1;
    }
    setStorage(STORAGE_KEYS.lastActiveDate, today);
    setStorage(STORAGE_KEYS.streakCount, newStreak);
  }

  function getStreak() {
    const today = getTodayKey();
    const last = getStorage(STORAGE_KEYS.lastActiveDate, '');
    if (last !== today) return getStorage(STORAGE_KEYS.streakCount, 0);
    return getStorage(STORAGE_KEYS.streakCount, 0);
  }

  function updateProfileScreen() {
    recordActivity();
    const streak = getStreak();
    const goalTasks = getStorage(STORAGE_KEYS.dailyGoalTasks, 3);
    const goalMinutes = getStorage(STORAGE_KEYS.dailyGoalMinutes, 25);
    const today = getTodayStats();
    const totalTasks = getStorage(STORAGE_KEYS.tasksCompleted, 0);
    const totalSprints = getSprintsFinished();
    const points = getPoints();
    const todayTasks = today.tasksDone || 0;
    const todayMinutes = today.focusMinutes || 0;
    const dayProgress = Math.min(100, Math.round(((todayTasks / Math.max(1, goalTasks)) + (todayMinutes / Math.max(1, goalMinutes))) * 50));
    const el = function (id) { return document.getElementById(id); };
    if (el('streak-value')) el('streak-value').textContent = streak;
    if (el('goal-tasks')) el('goal-tasks').value = goalTasks;
    if (el('goal-minutes')) el('goal-minutes').value = goalMinutes;
    if (el('profile-today-tasks')) el('profile-today-tasks').textContent = todayTasks;
    if (el('profile-goal-tasks')) el('profile-goal-tasks').textContent = goalTasks;
    if (el('profile-today-minutes')) el('profile-today-minutes').textContent = todayMinutes;
    if (el('profile-goal-minutes')) el('profile-goal-minutes').textContent = goalMinutes;
    if (el('profile-day-fill')) el('profile-day-fill').style.width = dayProgress + '%';
    if (el('profile-total-tasks')) el('profile-total-tasks').textContent = totalTasks;
    if (el('profile-total-sprints')) el('profile-total-sprints').textContent = totalSprints;
    if (el('profile-total-points')) el('profile-total-points').textContent = points;
  }

  function loadTasks() {
    return getStorage(STORAGE_KEYS.tasks, DEFAULT_TASKS);
  }

  function saveTasks(tasks) {
    setStorage(STORAGE_KEYS.tasks, tasks);
    renderTasks();
  }

  function renderTasks() {
    const tasks = loadTasks();
    const list = document.getElementById('task-list');
    if (!list) return;

    list.innerHTML = tasks.map(function (t) {
      return (
        '<li class="task" data-id="' +
        t.id +
        '">' +
        '<span class="task-num">' + (tasks.indexOf(t) + 1) + '.</span>' +
        '<span class="task-text' + (t.done ? ' done' : '') + '">' + escapeHtml(t.text) + '</span>' +
        '<span class="task-actions">' +
        '<button type="button" class="task-star' + (t.favorite ? ' favorite' : '') + '" aria-label="סימון">⭐</button>' +
        '<input type="checkbox" class="task-check" aria-label="סיום"' + (t.done ? ' checked' : '') + '>' +
        '</span></li>'
      );
    }).join('');

    list.querySelectorAll('.task-check').forEach(function (cb) {
      cb.addEventListener('change', function () {
        const id = cb.closest('.task').getAttribute('data-id');
        const tasks = loadTasks();
        const task = tasks.find(function (t) { return t.id === id; });
        if (task) {
          task.done = cb.checked;
          saveTasks(tasks);
          if (cb.checked) {
            const completed = getStorage(STORAGE_KEYS.tasksCompleted, 0);
            setStorage(STORAGE_KEYS.tasksCompleted, completed + 1);
            addTodayTaskDone();
            recordActivity();
            updateProgressStats();
          }
        }
      });
    });

    list.querySelectorAll('.task-star').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.closest('.task').getAttribute('data-id');
        const tasks = loadTasks();
        const task = tasks.find(function (t) { return t.id === id; });
        if (task) {
          task.favorite = !task.favorite;
          saveTasks(tasks);
          renderTasks();
        }
      });
    });
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function getPoints() {
    return getStorage(STORAGE_KEYS.points, 0);
  }

  function addPoints(n) {
    const p = getPoints() + n;
    setStorage(STORAGE_KEYS.points, p);
    return p;
  }

  function getSprintsFinished() {
    return getStorage(STORAGE_KEYS.sprintsFinished, 0);
  }

  function incrementSprints() {
    const n = getSprintsFinished() + 1;
    setStorage(STORAGE_KEYS.sprintsFinished, n);
    return n;
  }

  function updateProgressStats() {
    const tasksEl = document.getElementById('stat-tasks');
    const sprintsEl = document.getElementById('stat-sprints');
    if (tasksEl) tasksEl.textContent = getStorage(STORAGE_KEYS.tasksCompleted, 0);
    if (sprintsEl) sprintsEl.textContent = getSprintsFinished();
  }

  function getSprintMinutes() {
    const n = parseInt(document.getElementById('sprint-minutes')?.value || '12', 10);
    return isNaN(n) ? 12 : Math.max(5, Math.min(60, n));
  }

  function startTimer(minutes, taskText) {
    if (timerInterval) clearInterval(timerInterval);
    currentSprintMinutes = Number(minutes) || 12;
    timerSecondsLeft = currentSprintMinutes * 60;
    timerPaused = false;
    currentSprintTaskText = taskText || 'משימה';
    showScreen('timer');
    document.getElementById('timer-current-task').textContent = 'משימה: ' + currentSprintTaskText;
    updateTimerDisplay();
    timerInterval = setInterval(tick, 1000);
  }

  function tick() {
    if (timerPaused) return;
    timerSecondsLeft--;
    updateTimerDisplay();
    if (timerSecondsLeft <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      finishSprint();
    }
  }

  function updateTimerDisplay() {
    const m = Math.floor(timerSecondsLeft / 60);
    const s = timerSecondsLeft % 60;
    const el = document.getElementById('timer-display');
    if (el) el.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function finishSprint() {
    const points = 10;
    addPoints(points);
    incrementSprints();
    addTodayFocusMinutes(currentSprintMinutes);
    recordActivity();
    updateProgressStats();
    document.getElementById('reward-points').textContent = '+' + points + ' נקודות';
    showScreen('reward');
  }

  function pauseTimer() {
    timerPaused = !timerPaused;
    const btn = document.getElementById('btn-pause');
    if (btn) btn.textContent = timerPaused ? 'המשך' : 'השהה';
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    showScreen('dashboard');
  }

  function getFirstUnfinishedTask() {
    const tasks = loadTasks();
    const first = tasks.find(function (t) { return !t.done; });
    return first ? first.text : 'זמן ריכוז';
  }

  function initWelcome() {
    document.getElementById('btn-join').addEventListener('click', function () {
      recordActivity();
      showScreen('dashboard');
    });
  }

  function initDashboard() {
    const userName = getStorage(STORAGE_KEYS.userName, 'שרה');
    const welcome = document.querySelector('#screen-dashboard .welcome-msg');
    if (welcome) welcome.textContent = 'שלום ' + userName + '! ✨';

    document.getElementById('btn-start-sprint').addEventListener('click', function () {
      const minutes = getStorage(STORAGE_KEYS.sprintMinutes, 12);
      startTimer(Number(minutes) || 12, getFirstUnfinishedTask());
    });
  }

  function initNav() {
    document.querySelectorAll('.nav-item[data-screen]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const screen = btn.getAttribute('data-screen');
        if (screen) showScreen(screen);
      });
    });
  }

  function initTimer() {
    document.getElementById('btn-pause').addEventListener('click', pauseTimer);
    document.getElementById('btn-stop').addEventListener('click', stopTimer);
  }

  function initReward() {
    document.getElementById('btn-continue').addEventListener('click', function () {
      showScreen('dashboard');
    });
  }

  function initBrainDump() {
    const ta = document.getElementById('brain-dump-text');
    if (ta) {
      ta.value = getStorage(STORAGE_KEYS.brainDump, '');
      document.getElementById('btn-save-dump').addEventListener('click', function () {
        setStorage(STORAGE_KEYS.brainDump, ta.value);
        alert('נשמר.');
      });
    }
  }

  function initSettings() {
    const sprintInput = document.getElementById('sprint-minutes');
    const nameInput = document.getElementById('user-name-input');
    if (sprintInput) sprintInput.value = getStorage(STORAGE_KEYS.sprintMinutes, 12);
    if (nameInput) nameInput.value = getStorage(STORAGE_KEYS.userName, 'שרה');

    document.getElementById('btn-save-settings').addEventListener('click', function () {
      setStorage(STORAGE_KEYS.sprintMinutes, getSprintMinutes());
      setStorage(STORAGE_KEYS.userName, (nameInput && nameInput.value.trim()) || 'שרה');
      const welcome = document.querySelector('#screen-dashboard .welcome-msg');
      if (welcome) welcome.textContent = 'שלום ' + getStorage(STORAGE_KEYS.userName, 'שרה') + '! ✨';
      alert('ההגדרות נשמרו.');
    });
  }

  function initProfile() {
    var goalTasksEl = document.getElementById('goal-tasks');
    var goalMinutesEl = document.getElementById('goal-minutes');
    if (goalTasksEl) goalTasksEl.value = getStorage(STORAGE_KEYS.dailyGoalTasks, 3);
    if (goalMinutesEl) goalMinutesEl.value = getStorage(STORAGE_KEYS.dailyGoalMinutes, 25);
    document.getElementById('btn-save-goals').addEventListener('click', function () {
      var tasks = parseInt(goalTasksEl?.value || '3', 10) || 3;
      var minutes = parseInt(goalMinutesEl?.value || '25', 10) || 25;
      setStorage(STORAGE_KEYS.dailyGoalTasks, Math.max(1, Math.min(20, tasks)));
      setStorage(STORAGE_KEYS.dailyGoalMinutes, Math.max(5, Math.min(120, minutes)));
      if (document.getElementById('profile-goal-tasks')) document.getElementById('profile-goal-tasks').textContent = getStorage(STORAGE_KEYS.dailyGoalTasks, 3);
      if (document.getElementById('profile-goal-minutes')) document.getElementById('profile-goal-minutes').textContent = getStorage(STORAGE_KEYS.dailyGoalMinutes, 25);
      alert('היעדים נשמרו.');
    });
  }

  function init() {
    renderTasks();
    updateProgressStats();
    initWelcome();
    initDashboard();
    initNav();
    initTimer();
    initReward();
    initBrainDump();
    initSettings();
    initProfile();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
