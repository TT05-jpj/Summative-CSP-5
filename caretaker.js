// Data
    // Each object is stored as { name: "...", instructions: "..." }
    // The whole array is saved to localStorage as JSON under this key
    const STORAGE_KEY = 'accessibility_objects';

    function load() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
      catch { return []; }
    }

    function save() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(objects));
    }

    let objects = load();      // the live array
    let editingIndex = null;   // null = adding new, number = editing existing

    // DOM refs
    const grid         = document.getElementById('grid');
    const empty        = document.getElementById('empty');
    const addBtn       = document.getElementById('add-btn');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle   = document.getElementById('modal-title');
    const inputName    = document.getElementById('input-name');
    const inputInstr   = document.getElementById('input-instructions');
    const modalCancel  = document.getElementById('modal-cancel');
    const modalSave    = document.getElementById('modal-save');

    // Render all cards
    function render() {
      // Clear existing cards (but keep the empty state div)
      grid.querySelectorAll('.card').forEach(c => c.remove());
      empty.style.display = objects.length ? 'none' : 'block';

      objects.forEach((obj, i) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <div class="card-title">${obj.name}</div>
          <div class="card-buttons">
            <button class="btn-view">View instructions</button>
            <button class="btn-change">Change</button>
            <button class="btn-delete">✕</button>
          </div>
          <div class="card-instructions">${obj.instructions || 'No instructions added.'}</div>
        `;

        // View: toggle the instructions block open/closed
        const instrDiv = card.querySelector('.card-instructions');
        card.querySelector('.btn-view').addEventListener('click', () => {
          instrDiv.classList.toggle('show');
        });

        // Change: open modal pre-filled with this card's data
        card.querySelector('.btn-change').addEventListener('click', () => {
          openModal(i);
        });

        // Delete: remove from array, save, re-render
        card.querySelector('.btn-delete').addEventListener('click', () => {
          objects.splice(i, 1);
          save();
          render();
        });

        grid.appendChild(card);
      });
    }

    //Modal helpers
    function openModal(index = null) {
      editingIndex = index;
      if (index !== null) {
        // Editing existing — pre-fill fields
        modalTitle.textContent    = 'Edit Object';
        inputName.value           = objects[index].name;
        inputInstr.value          = objects[index].instructions;
      } else {
        // Adding new — blank fields
        modalTitle.textContent    = 'Add Object';
        inputName.value           = '';
        inputInstr.value          = '';
      }
      modalOverlay.classList.add('show');
      inputName.focus();
    }

    function closeModal() {
      modalOverlay.classList.remove('show');
      editingIndex = null;
    }

    //Modal events
    addBtn.addEventListener('click', () => openModal());
    modalCancel.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) closeModal();
    });

    modalSave.addEventListener('click', () => {
      const name  = inputName.value.trim();
      const instr = inputInstr.value.trim();
      if (!name) { inputName.focus(); return; }

      if (editingIndex !== null) {
        // Update existing object in place
        objects[editingIndex] = { name, instructions: instr };
      } else {
        // Push new object onto the array
        objects.push({ name, instructions: instr });
      }

      save();
      render();
      closeModal();
    });

    // Enter in name field → jump to instructions
    inputName.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); inputInstr.focus(); }
    });
    // Ctrl+Enter in instructions → save
    inputInstr.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) modalSave.click();
    });

    render();