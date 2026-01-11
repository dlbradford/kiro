// Main application entry point

// Window controls using Tauri invoke commands
const WindowControls = {
  init() {
    const { invoke } = window.__TAURI__.core;

    // Drag functionality - attach to header
    const header = document.querySelector('.header');
    if (header) {
      header.addEventListener('mousedown', async (e) => {
        // Don't drag if clicking on interactive elements
        if (e.target.closest('.search-container') ||
            e.target.closest('.window-controls') ||
            e.target.closest('button') ||
            e.target.closest('input')) {
          return;
        }
        try {
          await invoke('window_start_drag');
        } catch (err) {
          console.error('Drag error:', err);
        }
      });
    }

    const minimizeBtn = document.getElementById('win-minimize');
    const maximizeBtn = document.getElementById('win-maximize');
    const closeBtn = document.getElementById('win-close');

    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await invoke('window_minimize');
        } catch (err) {
          console.error('Minimize error:', err);
        }
      });
    }

    if (maximizeBtn) {
      maximizeBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await invoke('window_maximize');
        } catch (err) {
          console.error('Maximize error:', err);
        }
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await invoke('window_close');
        } catch (err) {
          console.error('Close error:', err);
        }
      });
    }
  }
};

window.WindowControls = WindowControls;

// Dialogs helper
const Dialogs = {
  confirmCallback: null,

  init() {
    const confirmDialog = document.getElementById('confirm-dialog');
    const confirmClose = document.getElementById('confirm-close');
    const confirmCancel = document.getElementById('confirm-cancel');
    const confirmOk = document.getElementById('confirm-ok');

    confirmClose.addEventListener('click', () => this.cancelConfirm());
    confirmCancel.addEventListener('click', () => this.cancelConfirm());
    confirmOk.addEventListener('click', () => this.acceptConfirm());

    // Help dialog
    const helpDialog = document.getElementById('help-dialog');
    const helpClose = document.getElementById('help-close');
    const helpOk = document.getElementById('help-ok');

    helpClose.addEventListener('click', () => this.closeHelp());
    helpOk.addEventListener('click', () => this.closeHelp());

    // Close on overlay click
    confirmDialog.addEventListener('click', (e) => {
      if (e.target === confirmDialog) this.cancelConfirm();
    });

    helpDialog.addEventListener('click', (e) => {
      if (e.target === helpDialog) this.closeHelp();
    });
  },

  confirm(title, message) {
    return new Promise((resolve) => {
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-message').innerHTML = message;
      document.getElementById('confirm-dialog').classList.add('active');

      this.confirmCallback = resolve;
    });
  },

  acceptConfirm() {
    document.getElementById('confirm-dialog').classList.remove('active');
    if (this.confirmCallback) {
      this.confirmCallback(true);
      this.confirmCallback = null;
    }
  },

  cancelConfirm() {
    document.getElementById('confirm-dialog').classList.remove('active');
    if (this.confirmCallback) {
      this.confirmCallback(false);
      this.confirmCallback = null;
    }
  },

  showHelp() {
    document.getElementById('help-dialog').classList.add('active');
  },

  closeHelp() {
    document.getElementById('help-dialog').classList.remove('active');
  },

  isOpen() {
    return document.getElementById('confirm-dialog').classList.contains('active') ||
           document.getElementById('help-dialog').classList.contains('active') ||
           document.getElementById('import-dialog').classList.contains('active');
  },

  closeAll() {
    this.cancelConfirm();
    this.closeHelp();
    Import.close();
  }
};

window.Dialogs = Dialogs;

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Kiro GUI initializing...');

  // Initialize all modules
  WindowControls.init();
  Dialogs.init();
  await Settings.init();
  Search.init();
  Editor.init();
  Import.init();
  Keyboard.init();

  // Focus search input
  document.getElementById('search-input').focus();

  console.log('Kiro GUI ready');
});

// Handle unhandled errors
window.addEventListener('error', (e) => {
  console.error('Unhandled error:', e.error);
  showToast('An error occurred: ' + e.message, 'error');
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  showToast('An error occurred: ' + e.reason, 'error');
});
