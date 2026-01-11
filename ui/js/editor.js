// Note editor

const Editor = {
  currentNote: null,
  isDirty: false,
  isActive: false,

  elements: {
    panel: null,
    title: null,
    body: null,
    saveBtn: null,
    cancelBtn: null,
    unsavedIndicator: null,
    previewPanel: null,
  },

  init() {
    this.elements.panel = document.getElementById('editor-panel');
    this.elements.title = document.getElementById('editor-title');
    this.elements.body = document.getElementById('editor-body');
    this.elements.saveBtn = document.getElementById('editor-save');
    this.elements.cancelBtn = document.getElementById('editor-cancel');
    this.elements.unsavedIndicator = document.getElementById('unsaved-indicator');
    this.elements.previewPanel = document.getElementById('preview-panel');

    // Save button
    this.elements.saveBtn.addEventListener('click', () => this.save());

    // Cancel button
    this.elements.cancelBtn.addEventListener('click', () => this.cancel());

    // Track changes
    this.elements.title.addEventListener('input', () => this.markDirty());
    this.elements.body.addEventListener('input', () => this.markDirty());

    // Keyboard shortcuts in editor
    this.elements.body.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.save();
      }
    });

    this.elements.title.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.save();
      }
    });
  },

  async editNote(note) {
    if (!note) return;

    // Load full note
    try {
      const fullNote = await API.getNote(note.id);
      if (!fullNote) {
        showToast('Note not found', 'error');
        return;
      }

      this.currentNote = fullNote;
      this.isDirty = false;
      this.isActive = true;

      // Populate editor
      this.elements.title.value = fullNote.title;
      this.elements.body.value = fullNote.body;
      this.elements.unsavedIndicator.style.display = 'none';

      // Show editor, hide preview
      this.elements.previewPanel.style.display = 'none';
      this.elements.panel.classList.add('active');

      // Focus body
      this.elements.body.focus();
    } catch (error) {
      showToast('Failed to load note: ' + error, 'error');
    }
  },

  async createNew(title = '') {
    this.currentNote = null;
    this.isDirty = false;
    this.isActive = true;

    // Clear editor
    this.elements.title.value = title;
    this.elements.body.value = '';
    this.elements.unsavedIndicator.style.display = 'none';

    // Show editor, hide preview
    this.elements.previewPanel.style.display = 'none';
    this.elements.panel.classList.add('active');

    // Focus title if empty, else body
    if (title) {
      this.elements.body.focus();
    } else {
      this.elements.title.focus();
    }
  },

  markDirty() {
    if (!this.isDirty) {
      this.isDirty = true;
      this.elements.unsavedIndicator.style.display = 'block';
    }
  },

  async save() {
    const title = this.elements.title.value.trim();
    const body = this.elements.body.value;

    if (!title) {
      showToast('Title is required', 'warning');
      this.elements.title.focus();
      return;
    }

    try {
      if (this.currentNote) {
        // Update existing note
        await API.updateNoteFull(this.currentNote.id, title, body);
        showToast('Note saved', 'success');
      } else {
        // Create new note
        const id = await API.createNote(title, body);
        this.currentNote = { id, title, body };
        showToast('Note created', 'success');
      }

      this.isDirty = false;
      this.elements.unsavedIndicator.style.display = 'none';

      // Refresh search and stay in editor
      await Search.performSearch();
      await Search.updateTotalCount();
    } catch (error) {
      showToast('Failed to save: ' + error, 'error');
    }
  },

  async cancel() {
    if (this.isDirty) {
      const confirmed = await Dialogs.confirm(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to discard them?'
      );
      if (!confirmed) return;
    }

    this.close();
  },

  close() {
    this.currentNote = null;
    this.isDirty = false;
    this.isActive = false;

    // Hide editor, show preview
    this.elements.panel.classList.remove('active');
    this.elements.previewPanel.style.display = 'flex';

    // Return focus to search
    document.getElementById('search-input').focus();
  },

  handleEscape() {
    if (this.isActive) {
      this.cancel();
      return true;
    }
    return false;
  }
};

window.Editor = Editor;
