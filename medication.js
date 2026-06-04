// ── Storage keys
const DISPLAY_KEY = 'medications_active';
const HISTORY_KEY = 'medications_history';

// ── Load / save helpers
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

// ── State
let active       = loadActive();
let history      = loadHistory();
let timesPerDay  = 1;
let selectedDays = [];

// ── Edit state
let editingId    = null;   // id of med being edited, or null for new
let editTimesPerDay  = 1;
let editSelectedDays = [];

// ── DOM refs
const container    = document.getElementById('med-container');
const viewPopup    = document.getElementById('view-popup');
const closeView    = document.getElementById('close-view');
const modalOverlay = document.getElementById('modal-overlay');
const modalCancel  = document.getElementById('modal-cancel');
const modalSave    = document.getElementById('modal-save');
const modalTitle   = document.getElementById('modal-title');
const inputName    = document.getElementById('input-name');
const timesDisplay = document.getElementById('times-display');
const timesMinus   = document.getElementById('times-minus');
const timesPlus    = document.getElementById('times-plus');
const daysToggle   = document.getElementById('days-toggle');
const daysMenu     = document.getElementById('days-menu');
const daysDisplay  = document.getElementById('days-selected-display');
const dayOptions   = document.querySelectorAll('.day-option');

// ── Days dropdown
daysToggle.addEventListener('click', () => {
  daysMenu.classList.toggle('open');
});

document.addEventListener('click', e => {
  if (!e.target.closest('.days-dropdown')) {
    daysMenu.classList.remove('open');
  }
});

dayOptions.forEach(option => {
  option.addEventListener('click', () => {
    const day = option.dataset.day;
    if (editSelectedDays.includes(day)) {
      editSelectedDays = editSelectedDays.filter(d => d !== day);
      option.classList.remove('selected');
    } else {
      editSelectedDays.push(day);
      option.classList.add('selected');
    }
    updateDaysDisplay();
  });
});

function updateDaysDisplay() {
  daysToggle.textContent = editSelectedDays.length
    ? `${editSelectedDays.length} day${editSelectedDays.length > 1 ? 's' : ''} selected ▾`
    : 'Select days ▾';

  daysDisplay.innerHTML = '';
  editSelectedDays.forEach(day => {
    const tag = document.createElement('div');
    tag.className = 'day-tag';
    tag.textContent = day;
    daysDisplay.appendChild(tag);
  });
}

// ── Card action popup state
let cardPopupMed = null;

// ── Render list
function renderCards() {
  container.innerHTML = '';

  // Add button — always first
  const addRow = document.createElement('div');
  addRow.className = 'add-row';
  addRow.innerHTML = `<button class="btn-add-med"><span>💊</span> Add Medication</button>`;
  addRow.querySelector('button').addEventListener('click', () => openModal(null));
  container.appendChild(addRow);

  if (active.length === 0) {
    const msg = document.createElement('p');
    msg.className = 'warning';
    msg.textContent = 'No medications yet. Tap Add Medication to get started.';
    container.appendChild(msg);
    return;
  }

  active.forEach((med) => {
    const row = document.createElement('div');
    row.className = 'med-row';
    row.innerHTML = `
      <span class="med-row-name">${med.name}</span>
      <span class="med-row-arrow">›</span>
    `;
    row.addEventListener('click', () => openCardPopup(med));
    container.appendChild(row);
  });
}

// ── Card action popup (opens when you tap a med row)
function openCardPopup(med) {
  cardPopupMed = med;
  document.getElementById('card-popup-name').textContent = med.name;
  document.getElementById('card-popup').classList.add('show');
}

function closeCardPopup() {
  document.getElementById('card-popup').classList.remove('show');
  cardPopupMed = null;
}

document.getElementById('card-popup').addEventListener('click', e => {
  if (e.target === document.getElementById('card-popup')) closeCardPopup();
});

document.getElementById('card-btn-cancel').addEventListener('click', closeCardPopup);

document.getElementById('card-btn-view').addEventListener('click', () => {
  const med = cardPopupMed;
  const histEntry = history.find(h => h.id === med.id);
  const changeLog = (histEntry && histEntry.changeLog) ? histEntry.changeLog : [];

  document.getElementById('popup-med-name').textContent = med.name;
  document.getElementById('popup-days').textContent     = med.days.join(', ');
  document.getElementById('popup-times').textContent    = `${med.timesPerDay} time${med.timesPerDay > 1 ? 's' : ''} per day`;
  document.getElementById('popup-start').textContent    = med.startDate;
  document.getElementById('popup-status').textContent   = 'Ongoing';

  const logContainer = document.getElementById('popup-changelog');
  logContainer.innerHTML = '';
  if (changeLog.length > 0) {
    const heading = document.createElement('div');
    heading.className = 'detail-label';
    heading.style.marginTop = '8px';
    heading.textContent = 'Change History';
    logContainer.appendChild(heading);
    changeLog.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'changelog-entry';
      item.innerHTML = `<span class="changelog-date">${entry.date}</span><span class="changelog-desc">${entry.description}</span>`;
      logContainer.appendChild(item);
    });
  }

  closeCardPopup();
  viewPopup.classList.add('show');
});

document.getElementById('card-btn-edit').addEventListener('click', () => {
  const med = cardPopupMed;
  closeCardPopup();
  openModal(med);
});

document.getElementById('card-btn-delete').addEventListener('click', () => {
  const med = cardPopupMed;
  const endDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const histEntry = history.find(h => h.id === med.id);
  if (histEntry) { histEntry.endDate = endDate; saveHistory(history); }
  const idx = active.findIndex(m => m.id === med.id);
  if (idx !== -1) active.splice(idx, 1);
  saveActive(active);
  closeCardPopup();
  renderCards();
});

// ── Popup close
closeView.addEventListener('click', () => viewPopup.classList.remove('show'));
viewPopup.addEventListener('click', e => {
  if (e.target === viewPopup) viewPopup.classList.remove('show');
});

// ── Times per day +/-
timesMinus.addEventListener('click', () => {
  if (editTimesPerDay > 1) { editTimesPerDay--; timesDisplay.textContent = editTimesPerDay; }
});
timesPlus.addEventListener('click', () => {
  if (editTimesPerDay < 10) { editTimesPerDay++; timesDisplay.textContent = editTimesPerDay; }
});

// ── Modal open
// Pass null for new medication, or a med object to edit
function openModal(med) {
  if (med) {
    // Edit mode
    editingId = med.id;
    modalTitle.textContent = 'Change Medication';
    inputName.value = med.name;
    editTimesPerDay = med.timesPerDay;
    editSelectedDays = [...med.days];
  } else {
    // Add mode
    editingId = null;
    modalTitle.textContent = 'Add Medication';
    inputName.value = '';
    editTimesPerDay = 1;
    editSelectedDays = [];
  }

  timesDisplay.textContent = editTimesPerDay;

  // Sync day checkboxes
  dayOptions.forEach(o => {
    if (editSelectedDays.includes(o.dataset.day)) {
      o.classList.add('selected');
    } else {
      o.classList.remove('selected');
    }
  });

  updateDaysDisplay();
  modalOverlay.classList.add('show');
  inputName.focus();
}

modalCancel.addEventListener('click', () => modalOverlay.classList.remove('show'));
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) modalOverlay.classList.remove('show');
});

// ── Save (handles both add and edit)
modalSave.addEventListener('click', () => {
  const name = inputName.value.trim();
  if (!name)                { inputName.focus(); return; }
  if (!editSelectedDays.length) { alert('Please select at least one day.'); return; }

  if (editingId !== null) {
    // ── EDIT existing med
    const activeIndex = active.findIndex(m => m.id === editingId);
    const histEntry   = history.find(h => h.id === editingId);
    if (activeIndex === -1) { modalOverlay.classList.remove('show'); return; }

    const old = active[activeIndex];

    // Detect what actually changed
    const changes = [];
    if (old.name !== name) {
      changes.push(`Name: "${old.name}" → "${name}"`);
    }
    const oldDaysSorted = [...old.days].sort().join(',');
    const newDaysSorted = [...editSelectedDays].sort().join(',');
    if (oldDaysSorted !== newDaysSorted) {
      changes.push(`Days: ${old.days.join(', ')} → ${editSelectedDays.join(', ')}`);
    }
    if (old.timesPerDay !== editTimesPerDay) {
      changes.push(`Frequency: ${old.timesPerDay}x/day → ${editTimesPerDay}x/day`);
    }

    if (changes.length === 0) {
      // Nothing actually changed — just close, no record
      modalOverlay.classList.remove('show');
      return;
    }

    // Apply changes to active list
    active[activeIndex] = {
      ...old,
      name: name,
      days: editSelectedDays,
      timesPerDay: editTimesPerDay
    };

    const changeDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const sameDay = histEntry && histEntry.startDate === changeDate;

    if (sameDay) {
      // Changed on the same day it was created — just update in place, no new record
      histEntry.name        = name;
      histEntry.days        = editSelectedDays;
      histEntry.timesPerDay = editTimesPerDay;
    } else {
      // Different day — close old entry and push a new one to the front
      if (histEntry) {
        histEntry.endDate = changeDate;
      }
      const newHistEntry = {
        id: editingId,
        _histId: Date.now(),
        name,
        days: editSelectedDays,
        timesPerDay: editTimesPerDay,
        startDate: changeDate,
        endDate: null,
        changeLog: [{ date: changeDate, description: changes.join(' | ') }]
      };
      history.unshift(newHistEntry);
    }

    saveActive(active);
    saveHistory(history);
    renderCards();
    modalOverlay.classList.remove('show');

  } else {
    // ── ADD new med
    const startDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const id  = Date.now();
    const med = { id, name, days: editSelectedDays, timesPerDay: editTimesPerDay, startDate, endDate: null, changeLog: [] };

    active.push(med);
    history.push({ ...med, changeLog: [] });
    saveActive(active);
    saveHistory(history);
    renderCards();
    modalOverlay.classList.remove('show');
  }
});

// ── Mic
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

// ── Print history
document.getElementById('print-btn').addEventListener('click', () => {
  const log = loadHistory();

  const rows = log.map(med => `
    <tr>
      <td>${med.name}</td>
      <td>${med.days.join(', ')}</td>
      <td>${med.timesPerDay}x / day</td>
      <td>${med.startDate}</td>
      <td>${med.endDate || 'Present'}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Medication History</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: system-ui, sans-serif;
          background: #fff;
          color: #111;
          padding: 48px;
        }

        .print-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 32px;
          border-bottom: 2px solid #03114F;
          padding-bottom: 16px;
        }

        .print-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #03114F;
        }

        .print-header p {
          font-size: 13px;
          color: #888;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 15px;
        }

        thead {
          background: #03114F;
          color: #fff;
        }

        thead th {
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          font-size: 13px;
        }

        tbody tr:nth-child(even) { background: #f9ead9; }
        tbody tr:nth-child(odd)  { background: #fff; }

        tbody td {
          padding: 12px 16px;
          color: #111;
          border-bottom: 1px solid #e8ddd1;
          vertical-align: top;
        }

        tbody tr:last-child td { border-bottom: none; }

        .no-data {
          text-align: center;
          padding: 48px;
          color: #888;
          font-size: 16px;
        }

        .print-footer {
          margin-top: 32px;
          font-size: 12px;
          color: #aaa;
          text-align: center;
          border-top: 1px solid #e8ddd1;
          padding-top: 16px;
        }

        @media print {
          body { padding: 24px; }
        }
      </style>
    </head>
    <body>
      <div class="print-header">
        <h1>Medication History</h1>
        <p>Printed on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      ${log.length === 0
        ? `<p class="no-data">No medication history found.</p>`
        : `<table>
            <thead>
              <tr>
                <th>Medication</th>
                <th>Days</th>
                <th>Frequency</th>
                <th>Start Date</th>
                <th>End Date</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>`
      }

      <div class="print-footer">
        Generated by A-TEN
      </div>

      <script>
        window.onload = () => { window.print(); }
      </script>
    </body>
    </html>
  `;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
});

setupMic('mic-name', document.getElementById('input-name'));

// ── Init
renderCards();