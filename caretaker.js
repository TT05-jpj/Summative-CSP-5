const addBtn = document.getElementById('add-btn');
const objectContainer = document.getElementById('object-container');

const viewPopup = document.getElementById('view-popup');
const closeView = document.getElementById('close-view');
const popupObjName = document.getElementById('popup-obj-name');
const popupObjInstr = document.getElementById('popup-obj-instr');

const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const inputName = document.getElementById('input-name');
const inputInstr = document.getElementById('input-instr');
const micName = document.getElementById('mic-name');
const micInstr = document.getElementById('mic-instr');
const modalCancel = document.getElementById('modal-cancel');
const modalSave = document.getElementById('modal-save');

let objects = JSON.parse(localStorage.getItem('caretaker-objects') || '[]');
let editingId = null;

function save() {
    localStorage.setItem('caretaker-objects', JSON.stringify(objects));
}

function render() {
    objectContainer.innerHTML = '';
    const photos = JSON.parse(localStorage.getItem('scanner-photos') || '{}');
    objects.forEach(obj => {
        const photo = photos[obj.name.toLowerCase()];
        const card = document.createElement('div');
        card.className = 'object-card';
        card.innerHTML = `
            <h3 style="font-size:20px;font-weight:600;color:#fff;text-transform:capitalize;">${obj.name}</h3>
            ${photo ? `<img class="card-photo" src="${photo}" alt="${obj.name}" />` : ''}
            <div class="card-btns">
                <button class="btn-view" data-id="${obj.id}">View Instructions</button>
                <div class="card-btns-row">
                    <button class="btn-change" data-id="${obj.id}">Edit</button>
                    <button class="btn-delete" data-id="${obj.id}">Delete</button>
                </div>
            </div>
        `;
        objectContainer.appendChild(card);
    });
}

function openModal(obj = null) {
    editingId = obj ? obj.id : null;
    modalTitle.textContent = obj ? 'Edit Object' : 'Add Object';
    inputName.value = obj ? obj.name : '';
    inputInstr.value = obj ? obj.instructions : '';
    modalOverlay.classList.add('active');
    inputName.focus();
}

function closeModal() {
    modalOverlay.classList.remove('active');
    editingId = null;
}

addBtn.addEventListener('click', () => openModal());

modalCancel.addEventListener('click', closeModal);

modalOverlay.addEventListener('click', e => {
    if (e.target === modalOverlay) closeModal();
});

modalSave.addEventListener('click', () => {
    const name = inputName.value.trim();
    const instructions = inputInstr.value.trim();
    if (!name) { inputName.focus(); return; }

    if (editingId !== null) {
        const obj = objects.find(o => o.id === editingId);
        if (obj) { obj.name = name; obj.instructions = instructions; }
    } else {
        objects.push({ id: Date.now(), name, instructions });
    }

    save();
    render();
    closeModal();
});

objectContainer.addEventListener('click', e => {
    const id = Number(e.target.dataset.id);
    if (!id) return;
    const obj = objects.find(o => o.id === id);
    if (!obj) return;

    if (e.target.classList.contains('btn-view')) {
        popupObjName.textContent = obj.name;
        popupObjInstr.textContent = obj.instructions || 'No instructions added.';
        viewPopup.classList.add('active');
    } else if (e.target.classList.contains('btn-change')) {
        openModal(obj);
    } else if (e.target.classList.contains('btn-delete')) {
        objects = objects.filter(o => o.id !== id);
        save();
        render();
    }
});

closeView.addEventListener('click', () => viewPopup.classList.remove('active'));

viewPopup.addEventListener('click', e => {
    if (e.target === viewPopup) viewPopup.classList.remove('active');
});

function useMic(targetInput) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition is not supported in this browser.'); return; }
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.onresult = e => {
        targetInput.value += (targetInput.value ? ' ' : '') + e.results[0][0].transcript;
    };
    rec.start();
}

micName.addEventListener('click', () => useMic(inputName));
micInstr.addEventListener('click', () => useMic(inputInstr));

render();
