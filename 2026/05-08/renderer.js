const CIRCUMFERENCE = 2 * Math.PI * 88; // ~552.92

const MODES = {
  work: { label: '专注', duration: 25 * 60, color: 'red', btn: '开始专注' },
  shortBreak: { label: '短休息', duration: 5 * 60, color: 'green', btn: '开始休息' },
  longBreak: { label: '长休息', duration: 15 * 60, color: 'blue', btn: '开始休息' },
};

let currentMode = 'work';
let timeLeft = MODES.work.duration;
let totalDuration = MODES.work.duration;
let timerId = null;
let isRunning = false;
let sessions = [];

const el = {
  timeDisplay: document.getElementById('timeDisplay'),
  statusLabel: document.getElementById('statusLabel'),
  progressCircle: document.getElementById('progressCircle'),
  btnMain: document.getElementById('btnMain'),
  btnLabel: document.getElementById('btnLabel'),
  btnReset: document.getElementById('btnReset'),
  sessions: document.getElementById('sessions'),
  tabs: document.querySelectorAll('.mode-tab'),
};

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [440, 554, 659].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.2);
      osc.stop(ctx.currentTime + i * 0.2 + 0.4);
    });
  } catch (_) {}
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function setProgress(fraction) {
  const offset = CIRCUMFERENCE * (1 - fraction);
  el.progressCircle.style.strokeDashoffset = offset;
}

function updateDisplay() {
  el.timeDisplay.textContent = formatTime(timeLeft);
  el.timeDisplay.classList.toggle('warning', timeLeft <= 60 && currentMode === 'work' && isRunning);
  const fraction = timeLeft / totalDuration;
  setProgress(fraction);

  const mode = MODES[currentMode];
  if (isRunning) {
    el.statusLabel.textContent = `${mode.label}中...`;
  } else if (timeLeft === totalDuration) {
    el.statusLabel.textContent = '准备开始';
  } else {
    el.statusLabel.textContent = '已暂停';
  }
}

function setModeColors() {
  const mode = MODES[currentMode];
  el.progressCircle.classList.remove('mode-green', 'mode-blue');
  el.btnMain.classList.remove('paused');
  if (currentMode === 'shortBreak') el.progressCircle.classList.add('mode-green');
  if (currentMode === 'longBreak') el.progressCircle.classList.add('mode-blue');

  el.tabs.forEach(t => {
    t.classList.remove('mode-red', 'mode-green', 'mode-blue');
    const m = t.dataset.mode;
    if (m === currentMode) {
      t.classList.add(`mode-${mode.color}`);
    }
  });

  if (!isRunning) {
    el.btnMain.style.background = currentMode === 'work' ? 'var(--red)' :
      currentMode === 'shortBreak' ? 'var(--green)' : 'var(--blue)';
    el.btnMain.style.boxShadow = 'none';
  }
}

function tick() {
  if (timeLeft <= 0) {
    finishTimer();
    return;
  }
  timeLeft--;
  updateDisplay();
}

function finishTimer() {
  clearInterval(timerId);
  timerId = null;
  isRunning = false;

  if (currentMode === 'work') {
    sessions.push('work');
  }

  playBeep();

  notify(`${MODES[currentMode].label}完成！`, getNextHint());

  renderSessions();
  switchMode(nextMode());
  updateDisplay();
  updateButton();
  setModeColors();
}

function getNextHint() {
  const completed = sessions.filter(s => s === 'work').length;
  if (currentMode === 'work') {
    return completed % 4 === 0 ? '该做一次长休息了' : '休息一下吧';
  }
  return '开始下一个番茄吧';
}

function nextMode() {
  if (currentMode === 'work') {
    const workCount = sessions.filter(s => s === 'work').length;
    return workCount % 4 === 0 ? 'longBreak' : 'shortBreak';
  }
  return 'work';
}

function switchMode(mode) {
  currentMode = mode;
  timeLeft = MODES[mode].duration;
  totalDuration = MODES[mode].duration;
  el.tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
}

function updateButton() {
  const mode = MODES[currentMode];
  if (isRunning) {
    el.btnLabel.textContent = '暂停';
    el.btnMain.classList.add('paused');
  } else {
    el.btnLabel.textContent = mode.btn;
    el.btnMain.classList.remove('paused');
  }
}

function notify(title, body) {
  if (window.electronAPI?.sendNotification) {
    window.electronAPI.sendNotification({ title, body });
  } else if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

function renderSessions() {
  el.sessions.innerHTML = '';
  for (const s of sessions.slice(-20)) {
    const dot = document.createElement('div');
    dot.className = 'session-dot filled';
    el.sessions.appendChild(dot);
  }
}

el.btnMain.addEventListener('click', () => {
  if (isRunning) {
    clearInterval(timerId);
    timerId = null;
    isRunning = false;
  } else {
    if (timeLeft <= 0) {
      timeLeft = totalDuration;
    }
    timerId = setInterval(tick, 1000);
    isRunning = true;
  }
  updateDisplay();
  updateButton();
  setModeColors();
});

el.btnReset.addEventListener('click', () => {
  clearInterval(timerId);
  timerId = null;
  isRunning = false;
  timeLeft = totalDuration;
  el.btnMain.style.background = '';
  el.btnMain.style.boxShadow = '';
  updateDisplay();
  updateButton();
  setModeColors();
});

el.tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    if (isRunning) {
      clearInterval(timerId);
      timerId = null;
      isRunning = false;
    }
    switchMode(tab.dataset.mode);
    el.btnMain.style.background = '';
    el.btnMain.style.boxShadow = '';
    updateDisplay();
    updateButton();
    setModeColors();
  });
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    el.btnMain.click();
  }
});

if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

updateDisplay();
renderSessions();
setModeColors();
