// ── Auth helpers ─────────────────────────────────────────────────────────────
function getCaretakerSession() {
  try {
    return JSON.parse(
      localStorage.getItem('auth_session') ||
      sessionStorage.getItem('auth_session') ||
      'null'
    );
  } catch { return null; }
}

function getStorageKey() {
  const s = getCaretakerSession();
  return 'objects_' + (s ? s.username : '');
}

function getAllAppUsers() {
  try { return JSON.parse(localStorage.getItem('auth_users')) || []; }
  catch { return []; }
}

function saveAllAppUsers(users) {
  localStorage.setItem('auth_users', JSON.stringify(users));
}

// ── Dashboard tabs ────────────────────────────────────────────────────────────
function switchDashTab(tab) {
  const isObjects = tab === 'objects';
  document.getElementById('tab-objects').classList.toggle('active', isObjects);
  document.getElementById('tab-users').classList.toggle('active', !isObjects);
  document.getElementById('panel-objects').style.display = isObjects ? '' : 'none';
  document.getElementById('panel-users').style.display = isObjects ? 'none' : 'block';
  if (!isObjects) renderUserDashboard();
}

function renderUserDashboard() {
  const udContainer = document.getElementById('user-dashboard-container');
  const session = getCaretakerSession();
  const myUsername = (session ? session.username : '').toLowerCase();
  const allUsers = getAllAppUsers().filter(u => u.role === 'user');

  const visible = allUsers.filter(u =>
    (u.caretakerName || '').toLowerCase() === myUsername ||
    u.assignedTo === session.username ||
    !u.caretakerName
  );

  udContainer.innerHTML = '';

  if (visible.length === 0) {
    udContainer.innerHTML = '<p class="warning" style="padding:36px 20px;">No users found.</p>';
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'ud-grid';

  visible.forEach(u => {
    const card = document.createElement('div');
    card.className = 'ud-card';
    const isAssignedToMe = u.assignedTo === session.username;
    const nameMatchesMe = (u.caretakerName || '').toLowerCase() === myUsername;
    let btnHTML;
    if (isAssignedToMe) {
      btnHTML = `<button class="ud-btn ud-btn-unassign" onclick="unassignUser('${u.username}')">Unassign</button>`;
    } else if (nameMatchesMe && !u.assigned) {
      btnHTML = `<button class="ud-btn ud-btn-assign" onclick="assignUser('${u.username}')">Assign</button>`;
    } else {
      btnHTML = `<button class="ud-btn ud-btn-disabled" disabled>Assign</button>`;
    }
    card.innerHTML = `
      <p class="ud-row"><span class="ud-label">Name</span><span class="ud-value">${u.username}</span></p>
      <p class="ud-row"><span class="ud-label">Caretaker</span><span class="ud-value">${u.caretakerName || 'N/A'}</span></p>
      ${btnHTML}
    `;
    grid.appendChild(card);
  });
  udContainer.appendChild(grid);
}

function assignUser(username) {
  const session = getCaretakerSession();
  if (!session) return;
  const users = getAllAppUsers();
  const user = users.find(u => u.username === username && u.role === 'user');
  if (user) { user.assigned = true; user.assignedTo = session.username; saveAllAppUsers(users); renderUserDashboard(); }
}

function unassignUser(username) {
  const users = getAllAppUsers();
  const user = users.find(u => u.username === username && u.role === 'user');
  if (user) { user.assigned = false; user.assignedTo = ''; saveAllAppUsers(users); renderUserDashboard(); }
}

// ── Object storage ────────────────────────────────────────────────────────────
function loadObjects() {
  try { return JSON.parse(localStorage.getItem(getStorageKey())) || []; }
  catch { return []; }
}

function saveObjects() {
  localStorage.setItem(getStorageKey(), JSON.stringify(objects));
}

let objects = loadObjects();
let editingIndex = null;

const container = document.getElementById('object-container');
const viewPopup = document.getElementById('view-popup');
const popupName = document.getElementById('popup-obj-name');
const popupInstr = document.getElementById('popup-obj-instr');
const closeView = document.getElementById('close-view');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const inputName = document.getElementById('input-name');
const inputInstr = document.getElementById('input-instr');
const modalCancel = document.getElementById('modal-cancel');
const modalSave = document.getElementById('modal-save');

function renderCards() {
  container.innerHTML = '';

  // ── Scanner card — always first ──
  const scanCard = document.createElement('div');
  scanCard.classList.add('object-card', 'add-object-card');
  scanCard.innerHTML = `<button class="btn-view">${window.ctTranslations?.addObject || '+ Add Object'}</button>`;
  scanCard.addEventListener('click', () => window.location.href = 'scanner.html');
  container.appendChild(scanCard);

  if (objects.length === 0) {
    const msg = document.createElement('p');
    msg.classList.add('warning');
    msg.textContent = window.ctTranslations?.noObjects || 'No objects yet. Use the scanner to add one.';
    container.appendChild(msg);
    return;
  }

  objects.forEach((obj, i) => {
    const card = document.createElement('div');
    card.classList.add('object-card');

    const title = document.createElement('rh1');
    title.textContent = obj.name;
    const lang = localStorage.getItem('caretaker_lang') || 'en';
    if (lang !== 'en') {
      fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${lang}&dt=t&q=${encodeURIComponent(obj.name)}`)
        .then(r => r.json())
        .then(data => { title.textContent = data[0].map(x => x[0]).join('') || obj.name; })
        .catch(() => { });
    }

    const btnGroup = document.createElement('div');
    btnGroup.classList.add('card-btns');

    const viewBtn = document.createElement('button');
    viewBtn.classList.add('btn-view');
    viewBtn.textContent = window.ctTranslations?.view || 'VIEW INSTRUCTIONS';

    const changeBtn = document.createElement('button');
    changeBtn.classList.add('btn-change');
    changeBtn.textContent = window.ctTranslations?.change || 'EDIT INSTRUCTIONS';

    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('btn-delete');
    deleteBtn.textContent = window.ctTranslations?.delete || 'DELETE';

    const editDeleteRow = document.createElement('div');
    editDeleteRow.classList.add('card-btns-row');
    editDeleteRow.appendChild(changeBtn);
    editDeleteRow.appendChild(deleteBtn);
    btnGroup.appendChild(viewBtn);
    btnGroup.appendChild(editDeleteRow);

    const photos = JSON.parse(localStorage.getItem('scanner-photos') || '{}');
    const photo = photos[obj.name.toLowerCase()];
    const photoEl = photo ? Object.assign(document.createElement('img'), {
      src: photo, alt: obj.name, className: 'card-photo'
    }) : null;

    card.appendChild(title);
    if (photoEl) card.appendChild(photoEl);
    card.appendChild(btnGroup);
    container.appendChild(card);

    viewBtn.addEventListener('click', () => {
      popupName.textContent = obj.name;
      popupInstr.textContent = obj.instructions || 'No instructions added.';
      viewPopup.classList.add('show');
    });

    changeBtn.addEventListener('click', () => openModal(i));

    deleteBtn.addEventListener('click', () => {
      objects.splice(i, 1);
      saveObjects();
      renderCards();
    });
  });
}

closeView.addEventListener('click', () => viewPopup.classList.remove('show'));
viewPopup.addEventListener('click', e => {
  if (e.target === viewPopup) viewPopup.classList.remove('show');
});

function openModal(index = null) {
  editingIndex = index;
  if (index !== null) {
    modalTitle.textContent = window.ctTranslations?.editObjectModal || 'Edit Object';
    inputName.value = objects[index].name;
    inputInstr.value = objects[index].instructions;
  } else {
    modalTitle.textContent = window.ctTranslations?.addObjectModal || 'Add Object';
    inputName.value = '';
    inputInstr.value = '';
  }
  modalOverlay.classList.add('show');
  inputName.focus();
}

function closeModal() {
  modalOverlay.classList.remove('show');
  editingIndex = null;
}

modalCancel.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });



modalSave.addEventListener('click', () => {
  const name = inputName.value.trim();
  const instr = inputInstr.value.trim();
  if (!name) { inputName.focus(); return; }

  if (editingIndex !== null) {
    objects[editingIndex] = { name, instructions: instr };
  } else {
    objects.push({ name, instructions: instr });
  }

  saveObjects();
  renderCards();
  closeModal();
});

inputName.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); inputInstr.focus(); }
});
inputInstr.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) modalSave.click();
});

const SPEECH_LANG_MAP = {
  en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT',
  pt: 'pt-PT', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', ar: 'ar-SA',
  hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', bn: 'bn-IN', ur: 'ur-PK',
  ru: 'ru-RU', tr: 'tr-TR', vi: 'vi-VN', th: 'th-TH', pl: 'pl-PL',
  nl: 'nl-NL', sv: 'sv-SE', ro: 'ro-RO', el: 'el-GR', he: 'he-IL',
  fa: 'fa-IR', sw: 'sw-KE', tl: 'fil-PH', ms: 'ms-MY', id: 'id-ID',
};

function getSpeechLang() {
  const code = localStorage.getItem('caretaker_lang') || 'en';
  return SPEECH_LANG_MAP[code] || 'en-US';
}

// Stop the tracks right away — SpeechRecognition opens its own stream.
async function ensureMicPermission() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch (err) {
    if (err && err.name === 'NotAllowedError') {
      alert('Microphone access was denied. Please allow it in your browser settings.');
    } else {
      alert('Could not access the microphone: ' + (err && err.message ? err.message : err));
    }
    return false;
  }
}

function setupMic(btnId, targetInput) {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    btn.title = 'Speech recognition not supported in this browser';
    btn.style.opacity = '0.4';
    btn.style.cursor = 'not-allowed';
    return;
  }

  const INITIAL_TIMEOUT_MS = 4000;
  const SILENCE_TIMEOUT_MS = 3000;

  // Recreate per click — reusing one SpeechRecognition object can wedge it
  // into a state where start() silently no-ops on Chrome.
  let activeRecognition = null;
  let silenceTimer = null;
  let baseText = '';
  let finalText = '';

  function clearSilenceTimer() {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  }

  function scheduleSilenceTimeout(ms) {
    clearSilenceTimer();
    silenceTimer = setTimeout(() => {
      if (activeRecognition) {
        // Don't wait for `end` — it can be delayed or skipped on Chrome.
        stopVisuals();
        try { activeRecognition.stop(); } catch (_) { }
      }
    }, ms);
  }

  function stopVisuals() {
    btn.classList.remove('listening');
    btn.classList.remove('speaking');
  }

  btn.addEventListener('click', async () => {
    if (activeRecognition) {
      stopVisuals();
      try { activeRecognition.stop(); } catch (_) { }
      return;
    }

    const ok = await ensureMicPermission();
    if (!ok) return;

    // Don't wait for `start` — give the user feedback the click registered.
    btn.classList.add('listening');

    const existing = targetInput.value.trim();
    baseText = existing ? existing + ' ' : '';
    finalText = '';

    const r = new SpeechRecognition();
    r.interimResults = true;
    r.continuous = true;
    r.maxAlternatives = 1;
    r.lang = getSpeechLang();

    r.addEventListener('start', () => {
      scheduleSilenceTimeout(INITIAL_TIMEOUT_MS);
    });

    r.addEventListener('speechstart', () => btn.classList.add('speaking'));
    r.addEventListener('speechend', () => btn.classList.remove('speaking'));

    r.addEventListener('result', (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }
      targetInput.value = (baseText + finalText + interim).trim();
      scheduleSilenceTimeout(SILENCE_TIMEOUT_MS);
    });

    r.addEventListener('end', () => {
      activeRecognition = null;
      stopVisuals();
      clearSilenceTimer();
    });

    r.addEventListener('error', (ev) => {
      activeRecognition = null;
      stopVisuals();
      clearSilenceTimer();
      console.error('Speech error:', ev.error);
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
        alert('Microphone access was denied. Please allow it in your browser settings.');
      } else if (ev.error === 'language-not-supported') {
        alert('Your browser does not support speech recognition for the selected language.');
      } else if (ev.error === 'no-speech') {
        // Engine's own silence timeout — stop quietly.
      } else if (ev.error === 'audio-capture') {
        alert('No microphone was found. Check your device settings.');
      } else if (ev.error === 'network') {
        alert('Speech recognition needs a network connection and could not reach the service.');
      }
    });

    activeRecognition = r;
    try {
      r.start();
    } catch (err) {
      activeRecognition = null;
      stopVisuals();
      clearSilenceTimer();
      console.error('Speech start failed:', err);
      alert('Could not start speech recognition: ' + (err && err.message ? err.message : err));
    }
  });
}

setupMic('mic-name', document.getElementById('input-name'));
setupMic('mic-instr', document.getElementById('input-instr'));

renderCards();