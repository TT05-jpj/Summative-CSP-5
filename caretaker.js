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

  // ── Scanner card — always first ──
  const scanCard = document.createElement('div');
  scanCard.classList.add('object-card');
  scanCard.style.cursor = 'pointer';
  scanCard.innerHTML = `
    <rh1 style="font-size:26px;"></rh1>
    <div class="card-btns">
      <button class="btn-view" style="font-size:20px;padding:16px 0;font-weight:800;height:150px;width:80%;margin:0 auto;display:block;">Add Object +</button>
    </div>
  `;
  scanCard.addEventListener('click', () => window.location.href = 'scanner.html');
  container.appendChild(scanCard);

  if (objects.length === 0) {
    const msg = document.createElement('p');
    msg.classList.add('warning');
    msg.textContent = "No objects yet. Use the scanner to add one.";
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
// When the mic button is clicked, it listens and dumps the spoken text
// straight into the target input/textarea, then stops automatically.

function setupMic(btnId, targetInput) {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  // Check browser support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    btn.title = 'Speech recognition not supported in this browser';
    btn.style.opacity = '0.4';
    btn.style.cursor = 'not-allowed';
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';       // change this if your caretaker speaks a different language
  recognition.interimResults = false; // only give us the final result, not partial words
  recognition.maxAlternatives = 1;

  let listening = false;

  btn.addEventListener('click', () => {
    if (listening) {
      recognition.stop();
      return;
    }
    recognition.start();
  });

  recognition.addEventListener('start', () => {
    listening = true;
    btn.classList.add('listening');
    btn.textContent = '⏹';   // show stop icon while recording
  });

  recognition.addEventListener('result', (e) => {
    // e.results[0][0].transcript is the spoken text as a string
    const spoken = e.results[0][0].transcript;
    targetInput.value = spoken;   // drop it straight into the field
  });

  recognition.addEventListener('end', () => {
    listening = false;
    btn.classList.remove('listening');
    btn.textContent = 'mic';  // restore mic icon
  });

  recognition.addEventListener('error', (e) => {
    listening = false;
    btn.classList.remove('listening');
    btn.textContent = 'mic';
    console.error('Speech error:', e.error);
    if (e.error === 'not-allowed') {
      alert('Microphone access was denied. Please allow it in your browser settings.');
    }
  });
}

// Wire up both mic buttons to their fields
setupMic('mic-name', document.getElementById('input-name'));
setupMic('mic-instr', document.getElementById('input-instr'));

// ── Init ──────────────────────────────────────────────────────────────────
renderCards();