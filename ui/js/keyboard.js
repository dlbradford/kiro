// Keyboard shortcuts handler

const Keyboard = {
  focusMode: 'search', // 'search' | 'results'

  init() {
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  },

  handleKeyDown(e) {
    // Don't handle if in editor (editor handles its own shortcuts)
    if (Editor.isActive) {
      if (e.key === 'Escape') {
        e.preventDefault();
        Editor.handleEscape();
      }
      // Let editor handle Ctrl+S itself to avoid double-save
      return;
    }

    // Check for settings panel
    if (Settings.isOpen) {
      if (e.key === 'Escape') {
        e.preventDefault();
        Settings.close();
      }
      return;
    }

    // Check for active dialogs
    if (Dialogs.isOpen()) {
      if (e.key === 'Escape') {
        e.preventDefault();
        Dialogs.closeAll();
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        Dialogs.acceptConfirm();
      }
      return;
    }

    // Global shortcuts
    if (e.ctrlKey && e.key === 'q') {
      e.preventDefault();
      const { invoke } = window.__TAURI__.core;
      invoke('window_close');
      return;
    }

    // Ctrl+, to open settings
    if (e.ctrlKey && e.key === ',') {
      e.preventDefault();
      Settings.toggle();
      return;
    }

    // F-keys
    if (e.key === 'F2') {
      e.preventDefault();
      Import.open();
      return;
    }

    if (e.key === 'F3') {
      e.preventDefault();
      Search.exportMarked();
      return;
    }

    // Help
    if (e.key === '?' && !this.isTyping()) {
      e.preventDefault();
      Dialogs.showHelp();
      return;
    }

    // Tab to toggle focus
    if (e.key === 'Tab' && !e.ctrlKey) {
      e.preventDefault();
      this.toggleFocus();
      return;
    }

    // Escape to clear/cancel
    if (e.key === 'Escape') {
      e.preventDefault();
      const searchInput = document.getElementById('search-input');
      if (searchInput.value) {
        searchInput.value = '';
        Search.performSearch();
      }
      searchInput.focus();
      this.focusMode = 'search';
      return;
    }

    // If focused on search input, only handle specific keys
    if (this.focusMode === 'search' && this.isTyping()) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const note = Search.getSelectedNote();
        if (note) {
          Editor.editNote(note);
        } else {
          // Create new note with search text as title
          const title = document.getElementById('search-input').value.trim();
          if (title) {
            Search.createNote(title);
          }
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.focusMode = 'results';
        Search.moveSelection(1);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.focusMode = 'results';
        Search.moveSelection(-1);
        return;
      }

      // Don't intercept other keys when typing
      return;
    }

    // Results navigation
    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      Search.moveSelection(1);
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      Search.moveSelection(-1);
      return;
    }

    if (e.key === 'g' && !e.ctrlKey) {
      e.preventDefault();
      Search.jumpToFirst();
      return;
    }

    if (e.key === 'G') {
      e.preventDefault();
      Search.jumpToLast();
      return;
    }

    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault();
      Search.pageDown();
      return;
    }

    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      Search.pageUp();
      return;
    }

    // Actions
    if (e.key === 'Enter') {
      e.preventDefault();
      const note = Search.getSelectedNote();
      if (note) {
        Editor.editNote(note);
      }
      return;
    }

    if (e.key === ' ' && this.focusMode === 'results') {
      e.preventDefault();
      Search.toggleCurrentMark();
      return;
    }

    if (e.key === 'a' && this.focusMode === 'results') {
      e.preventDefault();
      Search.markAll();
      return;
    }

    if (e.key === 'c' && !e.ctrlKey && this.focusMode === 'results') {
      e.preventDefault();
      Search.clearMarks();
      return;
    }

    if (e.key === 'd' && !e.ctrlKey) {
      e.preventDefault();
      Search.deleteSelected();
      return;
    }
  },

  toggleFocus() {
    const searchInput = document.getElementById('search-input');

    if (this.focusMode === 'search') {
      this.focusMode = 'results';
      searchInput.blur();
      document.getElementById('results-list').focus();
    } else {
      this.focusMode = 'search';
      searchInput.focus();
    }
  },

  isTyping() {
    const active = document.activeElement;
    return active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
  }
};

window.Keyboard = Keyboard;
