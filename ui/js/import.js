// Import functionality

const Import = {
  directories: [],
  selectedDirs: new Set(),
  files: [],
  selectedFiles: new Set(),

  elements: {
    dialog: null,
    directoryList: null,
    fileFilter: null,
    fileList: null,
    scanBtn: null,
    selectAllBtn: null,
    clearBtn: null,
    confirmBtn: null,
    closeBtn: null,
  },

  init() {
    this.elements.dialog = document.getElementById('import-dialog');
    this.elements.directoryList = document.getElementById('directory-list');
    this.elements.fileFilter = document.getElementById('file-filter');
    this.elements.fileList = document.getElementById('file-list');
    this.elements.scanBtn = document.getElementById('scan-files');
    this.elements.selectAllBtn = document.getElementById('import-select-all');
    this.elements.clearBtn = document.getElementById('import-clear');
    this.elements.confirmBtn = document.getElementById('import-confirm');
    this.elements.closeBtn = document.getElementById('import-close');

    // Event handlers
    this.elements.closeBtn.addEventListener('click', () => this.close());
    this.elements.scanBtn.addEventListener('click', () => this.scanFiles());
    this.elements.selectAllBtn.addEventListener('click', () => this.selectAllFiles());
    this.elements.clearBtn.addEventListener('click', () => this.clearFiles());
    this.elements.confirmBtn.addEventListener('click', () => this.importSelected());

    // Directory list click
    this.elements.directoryList.addEventListener('click', (e) => {
      const item = e.target.closest('.directory-item');
      if (item) {
        const path = item.dataset.path;
        this.toggleDirectory(path);
      }
    });

    // File list click
    this.elements.fileList.addEventListener('click', (e) => {
      const item = e.target.closest('.file-item');
      if (item) {
        const path = item.dataset.path;
        this.toggleFile(path);
      }
    });

    // Close on overlay click
    this.elements.dialog.addEventListener('click', (e) => {
      if (e.target === this.elements.dialog) {
        this.close();
      }
    });
  },

  async open() {
    // Load home directories
    try {
      this.directories = await API.getHomeDirectories();
      this.selectedDirs.clear();
      this.files = [];
      this.selectedFiles.clear();

      // Load previously configured directories
      const configDirs = await API.getScanDirectories();
      configDirs.forEach(d => this.selectedDirs.add(d));

      this.renderDirectories();
      this.renderFiles();

      this.elements.dialog.classList.add('active');
    } catch (error) {
      showToast('Failed to load directories: ' + error, 'error');
    }
  },

  close() {
    this.elements.dialog.classList.remove('active');
  },

  renderDirectories() {
    this.elements.directoryList.innerHTML = this.directories.map(dir => {
      const isSelected = this.selectedDirs.has(dir.path);
      return `
        <div class="directory-item ${isSelected ? 'selected' : ''}" data-path="${dir.path}">
          <input type="checkbox" class="directory-checkbox" ${isSelected ? 'checked' : ''}>
          <span class="directory-name">${escapeHtml(dir.name)}</span>
        </div>
      `;
    }).join('');
  },

  toggleDirectory(path) {
    if (this.selectedDirs.has(path)) {
      this.selectedDirs.delete(path);
    } else {
      this.selectedDirs.add(path);
    }
    this.renderDirectories();
  },

  async scanFiles() {
    if (this.selectedDirs.size === 0) {
      showToast('Please select at least one directory', 'warning');
      return;
    }

    const pattern = this.elements.fileFilter.value.trim() || '*.txt';

    try {
      this.elements.scanBtn.disabled = true;
      this.elements.scanBtn.textContent = 'Scanning...';

      const dirs = Array.from(this.selectedDirs);
      this.files = await API.scanDirectories(dirs, pattern);
      this.selectedFiles.clear();

      // Auto-select all files
      this.files.forEach(f => this.selectedFiles.add(f.path));

      this.renderFiles();
      showToast(`Found ${this.files.length} files`, 'success');
    } catch (error) {
      showToast('Scan failed: ' + error, 'error');
    } finally {
      this.elements.scanBtn.disabled = false;
      this.elements.scanBtn.textContent = 'Scan';
    }
  },

  renderFiles() {
    if (this.files.length === 0) {
      this.elements.fileList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-description">Select directories and click Scan</div>
        </div>
      `;
      return;
    }

    this.elements.fileList.innerHTML = this.files.map(file => {
      const isSelected = this.selectedFiles.has(file.path);
      return `
        <div class="file-item ${isSelected ? 'selected' : ''}" data-path="${file.path}">
          <input type="checkbox" class="file-checkbox" ${isSelected ? 'checked' : ''}>
          <span class="file-name">${escapeHtml(file.name)}</span>
          <span class="file-size">${formatFileSize(file.size)}</span>
        </div>
      `;
    }).join('');
  },

  toggleFile(path) {
    if (this.selectedFiles.has(path)) {
      this.selectedFiles.delete(path);
    } else {
      this.selectedFiles.add(path);
    }
    this.renderFiles();
  },

  selectAllFiles() {
    this.files.forEach(f => this.selectedFiles.add(f.path));
    this.renderFiles();
  },

  clearFiles() {
    this.selectedFiles.clear();
    this.renderFiles();
  },

  async importSelected() {
    if (this.selectedFiles.size === 0) {
      showToast('No files selected', 'warning');
      return;
    }

    try {
      this.elements.confirmBtn.disabled = true;
      this.elements.confirmBtn.textContent = 'Importing...';

      const paths = Array.from(this.selectedFiles);
      const result = await API.importFiles(paths);

      showToast(`Imported ${result.imported} files (${result.skipped} skipped)`, 'success');

      // Refresh search
      await Search.performSearch();
      await Search.updateTotalCount();

      this.close();
    } catch (error) {
      showToast('Import failed: ' + error, 'error');
    } finally {
      this.elements.confirmBtn.disabled = false;
      this.elements.confirmBtn.textContent = 'Import Selected';
    }
  }
};

// HTML escape helper (if not already defined)
if (typeof escapeHtml === 'undefined') {
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

window.Import = Import;
