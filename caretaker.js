// ── Data ─────────────────────────────────────────────────────────────────
// Each entry matches the shape: { name: "...", instructions: "..." }
// Stored as JSON in localStorage, same key the patient scanner reads from
const STORAGE_KEY = 'accessibility_objects';

function loadObjects() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveObjects() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(objects));
}

let objects = loadObjects();
let editingIndex = null;

// ── DOM refs ──────────────────────────────────────────────────────────────
const container = document.getElementById('object-container');
const addBtn = document.getElementById('add-btn');
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

// ── Render cards — same pattern as your displayRec() ─────────────────────
function renderCards() {
  container.innerHTML = '';

  if (objects.length === 0) {
    const msg = document.createElement('p');
    msg.classList.add('warning');
    msg.textContent = "No objects yet. Click + Add Object to get started.";
    container.appendChild(msg);
    return;
  }

  objects.forEach((obj, i) => {
    // card element — mirrors how your recipe cards are built
    const card = document.createElement('div');
    card.classList.add('object-card');

    // title tag — same custom rh1 element you use
    const title = document.createElement('rh1');
    title.textContent = obj.name;
    const lang = localStorage.getItem('caretaker_lang') || 'en';
    if (lang !== 'en') {
      fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${lang}&dt=t&q=${encodeURIComponent(obj.name)}`)
        .then(r => r.json())
        .then(data => { title.textContent = data[0].map(x => x[0]).join('') || obj.name; })
        .catch(() => { });
    }

    // button group — stacked like your recipe card buttons
    const btnGroup = document.createElement('div');
    btnGroup.classList.add('card-btns');

    const viewBtn = document.createElement('button');
    viewBtn.classList.add('btn-view');
    viewBtn.textContent = window.ctTranslations?.view || 'VIEW INSTRUCTIONS';

    const changeBtn = document.createElement('button');
    changeBtn.classList.add('btn-change');
    changeBtn.textContent = window.ctTranslations?.change || 'CHANGE INSTRUCTIONS';

    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('btn-delete');
    deleteBtn.textContent = window.ctTranslations?.delete || 'DELETE';

    btnGroup.appendChild(viewBtn);
    btnGroup.appendChild(changeBtn);
    btnGroup.appendChild(deleteBtn);

    card.appendChild(title);
    card.appendChild(btnGroup);
    container.appendChild(card);

    // VIEW — opens popup with name + instructions (same as your openIngredientPanel)
    viewBtn.addEventListener('click', () => {
      popupName.textContent = obj.name;
      popupInstr.textContent = obj.instructions || 'No instructions added.';
      viewPopup.classList.add('show');
    });

    // CHANGE — opens modal pre-filled for editing
    changeBtn.addEventListener('click', () => openModal(i));

    // DELETE — removes from array, saves, re-renders
    deleteBtn.addEventListener('click', () => {
      objects.splice(i, 1);
      saveObjects();
      renderCards();
    });
  });
}

// ── View popup close ──────────────────────────────────────────────────────
closeView.addEventListener('click', () => viewPopup.classList.remove('show'));
viewPopup.addEventListener('click', e => {
  if (e.target === viewPopup) viewPopup.classList.remove('show');
});

// ── Modal open/close ──────────────────────────────────────────────────────
function openModal(index = null) {
  editingIndex = index;
  if (index !== null) {
    modalTitle.textContent = 'Edit Object';
    inputName.value = objects[index].name;
    inputInstr.value = objects[index].instructions;
  } else {
    modalTitle.textContent = 'Add Object';
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

addBtn.addEventListener('click', () => openModal());
modalCancel.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal();
});

// ── Save ──────────────────────────────────────────────────────────────────
modalSave.addEventListener('click', () => {
  const name = inputName.value.trim();
  const instr = inputInstr.value.trim();
  if (!name) { inputName.focus(); return; }

  if (editingIndex !== null) {
    // update existing object in place
    objects[editingIndex] = { name, instructions: instr };
  } else {
    // create new object and push onto array
    objects.push({ name, instructions: instr });
  }

  saveObjects();
  renderCards();
  closeModal();
});

// keyboard shortcuts
inputName.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); inputInstr.focus(); }
});
inputInstr.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) modalSave.click();
});

// ── Speech to text ────────────────────────────────────────────────────────
// Uses the browser's built-in SpeechRecognition API — no API key needed.
// Recognition language follows the caretaker's selected language.

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

// Ask the browser for microphone permission. Returns true if granted.
// We immediately stop the tracks — SpeechRecognition opens its own stream.
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

  const recognition = new SpeechRecognition();
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let listening = false;

  btn.addEventListener('click', async () => {
    if (listening) {
      recognition.stop();
      return;
    }
    const ok = await ensureMicPermission();
    if (!ok) return;
    recognition.lang = getSpeechLang();
    try { recognition.start(); }
    catch (err) { console.error('Speech start failed:', err); }
  });

  recognition.addEventListener('start', () => {
    listening = true;
    btn.classList.add('listening');
  });

  recognition.addEventListener('result', (e) => {
    const spoken = e.results[0][0].transcript;
    targetInput.value = spoken;
  });

  recognition.addEventListener('end', () => {
    listening = false;
    btn.classList.remove('listening');
  });

  recognition.addEventListener('error', (e) => {
    listening = false;
    btn.classList.remove('listening');
    console.error('Speech error:', e.error);
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      alert('Microphone access was denied. Please allow it in your browser settings.');
    } else if (e.error === 'language-not-supported') {
      alert('Your browser does not support speech recognition for the selected language.');
    }
  });
}

setupMic('mic-name', document.getElementById('input-name'));
setupMic('mic-instr', document.getElementById('input-instr'));

// ── Init ──────────────────────────────────────────────────────────────────
renderCards();