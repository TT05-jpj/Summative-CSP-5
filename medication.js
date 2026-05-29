// ── Storage keys ─────────────────────────────────────────────────────────────
const DISPLAY_KEY = 'medications_active';
const HISTORY_KEY = 'medications_history';

// ── Load / save helpers ───────────────────────────────────────────────────────
function loadActive() {
  try { return JSON.parse(localStorage.getItem(DISPLAY_KEY)) || []; }
  catch { return []; }
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { return []; }
}

function saveActive(list)  { localStorage.setItem(DISPLAY_KEY, JSON.stringify(list)); }
function saveHistory(list) { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); }

// ── State ─────────────────────────────────────────────────────────────────────
let active      = loadActive();
let history     = loadHistory();
let timesPerDay = 1;
let selectedDays = [];

// ── DOM refs ──────────────────────────────────────────────────────────────────
const container    = document.getElementById('med-container');
const viewPopup    = document.getElementById('view-popup');
const closeView    = document.getElementById('close-view');
const modalOverlay = document.getElementById('modal-overlay');
const modalCancel  = document.getElementById('modal-cancel');
const modalSave    = document.getElementById('modal-save');
const inputName    = document.getElementById('input-name');
const timesDisplay = document.getElementById('times-display');
const timesMinus   = document.getElementById('times-minus');
const timesPlus    = document.getElementById('times-plus');
const daysToggle   = document.getElementById('days-toggle');
const daysMenu     = document.getElementById('days-menu');
const daysDisplay  = document.getElementById('days-selected-display');
const dayOptions   = document.querySelectorAll('.day-option');

// ── Days dropdown ─────────────────────────────────────────────────────────────
daysToggle.addEventListener('click', () => {
  daysMenu.classList.toggle('open');
});

// close dropdown when clicking outside
document.addEventListener('click', e => {
  if (!e.target.closest('.days-dropdown')) {
    daysMenu.classList.remove('open');
  }
});

// tap a day to select/deselect — no ctrl needed
dayOptions.forEach(option => {
  option.addEventListener('click', () => {
    const day = option.dataset.day;
    if (selectedDays.includes(day)) {
      selectedDays = selectedDays.filter(d => d !== day);
      option.classList.remove('selected');
    } else {
      selectedDays.push(day);
      option.classList.add('selected');
    }
    updateDaysDisplay();
  });
});

function updateDaysDisplay() {
  daysToggle.textContent = selectedDays.length
    ? `${selectedDays.length} day${selectedDays.length > 1 ? 's' : ''} selected ▾`
    : 'Select days ▾';

  daysDisplay.innerHTML = '';
  selectedDays.forEach(day => {
    const tag = document.createElement('div');
    tag.className = 'day-tag';
    tag.textContent = day;
    daysDisplay.appendChild(tag);
  });
}

// ── Render cards ──────────────────────────────────────────────────────────────
function renderCards() {
  container.innerHTML = '';

  // Add medication card — always first
  const addCard = document.createElement('div');
  addCard.className = 'med-card';
  addCard.innerHTML = `
    <button class="btn-view" style="font-size:20px;font-weight:800;width:100%;height:150px;border-radius:14px;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:#f9ead9;color:#03114F;margin:0 auto;">
      <span style="font-size:34px;">💊</span>
      <span>Add Medication</span>
    </button>
  `;
  addCard.querySelector('button').addEventListener('click', openModal);
  container.appendChild(addCard);

  // empty state
  if (active.length === 0) {
    const msg = document.createElement('p');
    msg.className = 'warning';
    msg.textContent = 'No medications yet. Click Add Medication to get started.';
    container.appendChild(msg);
    return;
  }

  // one card per active medication
  active.forEach((med, i) => {
    const card = document.createElement('div');
    card.className = 'med-card';

    const name = document.createElement('span');
    name.className = 'med-card-name';
    name.textContent = med.name;

    const sub = document.createElement('div');
    sub.className = 'med-card-sub';
    sub.textContent = `${med.days.join(', ')} · ${med.timesPerDay}x/day`;

    const btnGroup = document.createElement('div');
    btnGroup.className = 'card-btns';

    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn-view';
    viewBtn.textContent = 'VIEW DETAILS';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.textContent = 'DELETE';

    btnGroup.appendChild(viewBtn);
    btnGroup.appendChild(deleteBtn);
    card.appendChild(name);
    card.appendChild(sub);
    card.appendChild(btnGroup);
    container.appendChild(card);

    // VIEW — open phone-shaped popup
    viewBtn.addEventListener('click', () => {
      document.getElementById('popup-med-name').textContent = med.name;
      document.getElementById('popup-days').textContent     = med.days.join(', ');
      document.getElementById('popup-times').textContent    = `${med.timesPerDay} time${med.timesPerDay > 1 ? 's' : ''} per day`;
      document.getElementById('popup-start').textContent    = med.startDate;
      document.getElementById('popup-status').textContent   = 'Ongoing';
      viewPopup.classList.add('show');
    });

    // DELETE — record end date in history, remove from active
    deleteBtn.addEventListener('click', () => {
      const endDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      const histEntry = history.find(h => h.id === med.id);
      if (histEntry) { histEntry.endDate = endDate; saveHistory(history); } //// print
      active.splice(i, 1);
      saveActive(active);
      renderCards();
    });
  });
}

// ── Popup close ───────────────────────────────────────────────────────────────
closeView.addEventListener('click', () => viewPopup.classList.remove('show'));
viewPopup.addEventListener('click', e => {
  if (e.target === viewPopup) viewPopup.classList.remove('show');
});

// ── Times per day +/- ────────────────────────────────────────────────────────
timesMinus.addEventListener('click', () => {
  if (timesPerDay > 1) { timesPerDay--; timesDisplay.textContent = timesPerDay; }
});
timesPlus.addEventListener('click', () => {
  if (timesPerDay < 10) { timesPerDay++; timesDisplay.textContent = timesPerDay; }
});

// ── Modal open / close ────────────────────────────────────────────────────────
function openModal() {
  inputName.value  = '';
  timesPerDay      = 1;
  timesDisplay.textContent = '1';
  selectedDays     = [];
  dayOptions.forEach(o => o.classList.remove('selected'));
  updateDaysDisplay();
  modalOverlay.classList.add('show');
  inputName.focus();
}

modalCancel.addEventListener('click', () => modalOverlay.classList.remove('show'));
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) modalOverlay.classList.remove('show');
});

// ── Save ──────────────────────────────────────────────────────────────────────
modalSave.addEventListener('click', () => {
  const name = inputName.value.trim();
  if (!name)                { inputName.focus(); return; }
  if (!selectedDays.length) { alert('Please select at least one day.'); return; }

  const startDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const id  = Date.now();
  const med = { id, name, days: selectedDays, timesPerDay, startDate, endDate: null };

  // push to both — active for display, history for permanent record
  active.push(med);
  history.push({ ...med });
  saveActive(active);
  saveHistory(history);
  renderCards();
  modalOverlay.classList.remove('show');
});

// ── Mic ───────────────────────────────────────────────────────────────────────
function setupMic(btnId, targetInput) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    btn.style.opacity = '0.4';
    btn.style.cursor  = 'not-allowed';
    return;
  }
  const recognition      = new SpeechRecognition();
  recognition.lang       = 'en-US';
  recognition.interimResults = false;
  let listening = false;

  btn.addEventListener('click', () => {
    if (listening) { recognition.stop(); return; }
    recognition.start();
  });
  recognition.addEventListener('start', () => {
    listening = true;
    btn.classList.add('listening');
    btn.textContent = '⏹';
  });
  recognition.addEventListener('result', e => {
    targetInput.value = e.results[0][0].transcript;
  });
  recognition.addEventListener('end', () => {
    listening = false;
    btn.classList.remove('listening');
    btn.textContent = '🎤';
  });
  recognition.addEventListener('error', () => {
    listening = false;
    btn.classList.remove('listening');
    btn.textContent = '🎤';
  });
}

setupMic('mic-name', document.getElementById('input-name'));

// ── Init ──────────────────────────────────────────────────────────────────────
renderCards();