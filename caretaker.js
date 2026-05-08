// ── Data ─────────────────────────────────────────────────────────────────
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

// ── Render cards ──────────────────────────────────────────────────────────
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
    const card = document.createElement('div');
    card.classList.add('object-card');

    const title = document.createElement('rh1');
    title.textContent = obj.name;
    const lang = localStorage.getItem('caretaker_lang') || 'en';
    if (lang !== 'en') {
      fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(obj.name)}`)
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

    viewBtn.addEventListener('click', () => {
      const lang = localStorage.getItem('caretaker_lang') || 'en';
      if (lang !== 'en') {
        fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${lang}&dt=t&q=${encodeURIComponent(obj.name)}`)
          .then(r => r.json())
          .then(d => { popupName.textContent = d[0].map(x => x[0]).join('') || obj.name; })
          .catch(() => { popupName.textContent = obj.name; });
        if (obj.instructions) {
          fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${lang}&dt=t&q=${encodeURIComponent(obj.instructions)}`)
            .then(r => r.json())
            .then(d => { popupInstr.textContent = d[0].map(x => x[0]).join('') || obj.instructions; })
            .catch(() => { popupInstr.textContent = obj.instructions; });
        } else {
          popupInstr.textContent = 'No instructions added.';
        }
      } else {
        popupName.textContent = obj.name;
        popupInstr.textContent = obj.instructions || 'No instructions added.';
      }
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

// ── View popup close ──────────────────────────────────────────────────────
closeView.addEventListener('click', () => viewPopup.classList.remove('show'));
viewPopup.addEventListener('click', e => {
  if (e.target === viewPopup) viewPopup.classList.remove('show');
});

// ── Modal open/close ──────────────────────────────────────────────────────
function openModal(index = null) {
  editingIndex = index;
  const lang = localStorage.getItem('caretaker_lang') || 'en';

  if (index !== null) {
    modalTitle.textContent = window.translatedTitles?.edit || 'Edit Object';
    if (lang !== 'en') {
      inputName.value = objects[index].name;
      inputInstr.value = objects[index].instructions || '';
      fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${lang}&dt=t&q=${encodeURIComponent(objects[index].name)}`)
        .then(r => r.json())
        .then(d => { inputName.value = d[0].map(x => x[0]).join('') || objects[index].name; })
        .catch(() => { });
      if (objects[index].instructions) {
        fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${lang}&dt=t&q=${encodeURIComponent(objects[index].instructions)}`)
          .then(r => r.json())
          .then(d => { inputInstr.value = d[0].map(x => x[0]).join('') || objects[index].instructions; })
          .catch(() => { });
      }
    } else {
      inputName.value = objects[index].name;
      inputInstr.value = objects[index].instructions || '';
    }
  } else {
    modalTitle.textContent = window.translatedTitles?.add || 'Add Object';
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
modalSave.addEventListener('click', async () => {
  const name = inputName.value.trim();
  const instr = inputInstr.value.trim();
  if (!name) { inputName.focus(); return; }

  // always save in English so translations work correctly later
  const lang = localStorage.getItem('caretaker_lang') || 'en';
  let englishName = name;
  let englishInstr = instr;

  if (lang !== 'en') {
    try {
      const [n, ins] = await Promise.all([
        fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(name)}`).then(r => r.json()).then(d => d[0].map(x => x[0]).join('')),
        instr ? fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(instr)}`).then(r => r.json()).then(d => d[0].map(x => x[0]).join('')) : Promise.resolve('')
      ]);
      englishName = n || name;
      englishInstr = ins || instr;
    } catch (e) { }
  }

  if (editingIndex !== null) {
    objects[editingIndex] = { name: englishName, instructions: englishInstr };
  } else {
    objects.push({ name: englishName, instructions: englishInstr });
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

// ── Speech to text ────────────────────────────────────────────────────────
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
  let activeRecognition = null;
  let silenceTimer = null;
  let baseText = '';
  let finalText = '';

  function clearSilenceTimer() {
    if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
  }

  function scheduleSilenceTimeout(ms) {
    clearSilenceTimer();
    silenceTimer = setTimeout(() => {
      if (activeRecognition) {
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

    btn.classList.add('listening');
    const existing = targetInput.value.trim();
    baseText = existing ? existing + ' ' : '';
    finalText = '';

    const r = new SpeechRecognition();
    r.interimResults = true;
    r.continuous = true;
    r.maxAlternatives = 1;
    r.lang = getSpeechLang();

    r.addEventListener('start', () => { scheduleSilenceTimeout(INITIAL_TIMEOUT_MS); });
    r.addEventListener('speechstart', () => btn.classList.add('speaking'));
    r.addEventListener('speechend', () => btn.classList.remove('speaking'));
    r.addEventListener('result', (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) { finalText += transcript; }
        else { interim += transcript; }
      }
      targetInput.value = (baseText + finalText + interim).trim();
      scheduleSilenceTimeout(SILENCE_TIMEOUT_MS);
    });
    r.addEventListener('end', () => { activeRecognition = null; stopVisuals(); clearSilenceTimer(); });
    r.addEventListener('error', (ev) => {
      activeRecognition = null; stopVisuals(); clearSilenceTimer();
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
        alert('Microphone access was denied.');
      } else if (ev.error === 'language-not-supported') {
        alert('Speech recognition not supported for this language.');
      } else if (ev.error === 'audio-capture') {
        alert('No microphone found.');
      } else if (ev.error === 'network') {
        alert('Network connection needed for speech recognition.');
      }
    });

    activeRecognition = r;
    try { r.start(); } catch (err) {
      activeRecognition = null; stopVisuals(); clearSilenceTimer();
    }
  });
}

setupMic('mic-name', document.getElementById('input-name'));
setupMic('mic-instr', document.getElementById('input-instr'));

// ── Init ──────────────────────────────────────────────────────────────────
renderCards();