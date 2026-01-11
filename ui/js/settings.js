// Settings and Theme Management

const Settings = {
  isOpen: false,
  currentTab: 'shortcuts',
  settings: {
    preset: 'dark',
    custom_colors: {},
    font_family: 'Inter, system-ui, sans-serif',
    font_size: 16,
    mono_font: "'JetBrains Mono', monospace"
  },

  // Theme presets with preview colors
  themes: {
    'dark': { name: 'Dark', bg: '#1a1a2e', sidebar: '#16213e', header: '#0f3460', accent: '#e94560' },
    'light': { name: 'Light', bg: '#f8f9fa', sidebar: '#ffffff', header: '#e9ecef', accent: '#d63384' },
    'nord': { name: 'Nord', bg: '#2e3440', sidebar: '#3b4252', header: '#434c5e', accent: '#88c0d0' },
    'solarized-dark': { name: 'Solarized', bg: '#002b36', sidebar: '#073642', header: '#094552', accent: '#b58900' },
    'dracula': { name: 'Dracula', bg: '#282a36', sidebar: '#21222c', header: '#343746', accent: '#ff79c6' },
    'monokai': { name: 'Monokai', bg: '#272822', sidebar: '#1e1f1c', header: '#3e3d32', accent: '#f92672' },
    'ocean': { name: 'Ocean', bg: '#1b2838', sidebar: '#171d25', header: '#2a475e', accent: '#66c0f4' },
    'high-contrast': { name: 'High Contrast', bg: '#000000', sidebar: '#0a0a0a', header: '#1a1a1a', accent: '#00ffff' }
  },

  // Customizable colors
  colorVars: [
    { var: '--bg-primary', label: 'Background' },
    { var: '--bg-secondary', label: 'Secondary BG' },
    { var: '--bg-tertiary', label: 'Tertiary BG' },
    { var: '--text-primary', label: 'Text' },
    { var: '--text-secondary', label: 'Secondary Text' },
    { var: '--accent', label: 'Accent' },
    { var: '--border', label: 'Borders' },
    { var: '--success', label: 'Success' },
    { var: '--warning', label: 'Warning' },
    { var: '--error', label: 'Error' }
  ],

  // Keyboard shortcuts data
  shortcuts: [
    { keys: ['j', '↓'], desc: 'Navigate down', category: 'Navigation' },
    { keys: ['k', '↑'], desc: 'Navigate up', category: 'Navigation' },
    { keys: ['g'], desc: 'Jump to first', category: 'Navigation' },
    { keys: ['G'], desc: 'Jump to last', category: 'Navigation' },
    { keys: ['Ctrl+D'], desc: 'Page down', category: 'Navigation' },
    { keys: ['Ctrl+U'], desc: 'Page up', category: 'Navigation' },
    { keys: ['Tab'], desc: 'Toggle focus', category: 'Navigation' },
    { keys: ['Enter'], desc: 'Edit note / Create new', category: 'Actions' },
    { keys: ['Space'], desc: 'Toggle mark', category: 'Actions' },
    { keys: ['a'], desc: 'Mark all visible', category: 'Actions' },
    { keys: ['c'], desc: 'Clear all marks', category: 'Actions' },
    { keys: ['d'], desc: 'Delete selected', category: 'Actions' },
    { keys: ['F2'], desc: 'Import notes', category: 'Files' },
    { keys: ['F3'], desc: 'Export marked', category: 'Files' },
    { keys: ['Ctrl+S'], desc: 'Save note', category: 'Editor' },
    { keys: ['Escape'], desc: 'Cancel / Close', category: 'General' },
    { keys: ['Ctrl+,'], desc: 'Open settings', category: 'General' },
    { keys: ['?'], desc: 'Show help', category: 'General' }
  ],

  elements: {},

  async init() {
    // Cache DOM elements
    this.elements = {
      overlay: document.getElementById('settings-overlay'),
      closeBtn: document.getElementById('settings-close'),
      tabs: document.querySelectorAll('.settings-tab'),
      themeGrid: document.getElementById('theme-grid'),
      colorGrid: document.getElementById('color-grid'),
      shortcutsList: document.getElementById('shortcuts-list'),
      fontFamilySelect: document.getElementById('font-family-select'),
      fontSizeInput: document.getElementById('font-size-input'),
      monoFontSelect: document.getElementById('mono-font-select'),
      fontPreview: document.getElementById('font-preview'),
      saveBtn: document.getElementById('settings-save'),
      resetBtn: document.getElementById('settings-reset')
    };

    // Load saved settings
    await this.loadSettings();

    // Set up event listeners
    this.setupEventListeners();

    // Render UI
    this.renderThemeGrid();
    this.renderColorGrid();
    this.renderShortcuts();

    // Apply current settings
    this.applySettings();
  },

  setupEventListeners() {
    // Close button
    this.elements.closeBtn.addEventListener('click', () => this.close());

    // Overlay click to close
    this.elements.overlay.addEventListener('click', (e) => {
      if (e.target === this.elements.overlay) this.close();
    });

    // Tab switching
    this.elements.tabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    // Font settings
    this.elements.fontFamilySelect.addEventListener('change', () => this.updateFontPreview());
    this.elements.fontSizeInput.addEventListener('input', () => this.updateFontPreview());
    this.elements.monoFontSelect.addEventListener('change', () => this.updateFontPreview());

    // Save and Reset
    this.elements.saveBtn.addEventListener('click', () => this.saveSettings());
    this.elements.resetBtn.addEventListener('click', () => this.resetSettings());
  },

  async loadSettings() {
    try {
      const settings = await API.getThemeSettings();
      this.settings = {
        preset: settings.preset || 'dark',
        custom_colors: settings.custom_colors || {},
        font_family: settings.font_family || 'Inter, system-ui, sans-serif',
        font_size: settings.font_size || 16,
        mono_font: settings.mono_font || "'JetBrains Mono', monospace"
      };

      // Update form values
      this.elements.fontFamilySelect.value = this.settings.font_family;
      this.elements.fontSizeInput.value = this.settings.font_size;
      this.elements.monoFontSelect.value = this.settings.mono_font;
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },

  applySettings() {
    // Apply theme
    document.documentElement.setAttribute('data-theme', this.settings.preset);

    // Apply custom colors
    for (const [varName, value] of Object.entries(this.settings.custom_colors)) {
      document.documentElement.style.setProperty(varName, value);
    }

    // Apply font settings
    document.documentElement.style.setProperty('--font-family', this.settings.font_family);
    document.documentElement.style.setProperty('--font-size-base', this.settings.font_size + 'px');
    document.documentElement.style.setProperty('--font-mono', this.settings.mono_font);

    this.updateFontPreview();
  },

  async saveSettings() {
    // Get values from form
    this.settings.font_family = this.elements.fontFamilySelect.value;
    this.settings.font_size = parseInt(this.elements.fontSizeInput.value) || 16;
    this.settings.mono_font = this.elements.monoFontSelect.value;

    try {
      await API.saveThemeSettings(this.settings);
      this.applySettings();
      showToast('Settings saved', 'success');
    } catch (error) {
      showToast('Failed to save settings: ' + error, 'error');
    }
  },

  async resetSettings() {
    this.settings = {
      preset: 'dark',
      custom_colors: {},
      font_family: 'Inter, system-ui, sans-serif',
      font_size: 16,
      mono_font: "'JetBrains Mono', monospace"
    };

    // Reset form values
    this.elements.fontFamilySelect.value = this.settings.font_family;
    this.elements.fontSizeInput.value = this.settings.font_size;
    this.elements.monoFontSelect.value = this.settings.mono_font;

    // Clear custom colors from CSS
    this.colorVars.forEach(cv => {
      document.documentElement.style.removeProperty(cv.var);
    });

    this.applySettings();
    this.renderThemeGrid();
    this.renderColorGrid();

    try {
      await API.saveThemeSettings(this.settings);
      showToast('Settings reset to default', 'success');
    } catch (error) {
      console.error('Failed to save reset settings:', error);
    }
  },

  open() {
    this.isOpen = true;
    this.elements.overlay.classList.add('active');
  },

  close() {
    this.isOpen = false;
    this.elements.overlay.classList.remove('active');
  },

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  },

  switchTab(tabId) {
    this.currentTab = tabId;

    // Update tab buttons
    this.elements.tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    // Show/hide content
    document.querySelectorAll('.settings-tab-content').forEach(content => {
      content.style.display = content.id === `tab-${tabId}` ? 'block' : 'none';
    });
  },

  renderThemeGrid() {
    this.elements.themeGrid.innerHTML = Object.entries(this.themes).map(([id, theme]) => `
      <div class="theme-option ${this.settings.preset === id ? 'selected' : ''}" data-theme="${id}">
        <div class="theme-preview">
          <div class="theme-preview-sidebar" style="background: ${theme.sidebar}"></div>
          <div class="theme-preview-main">
            <div class="theme-preview-header" style="background: ${theme.header}"></div>
            <div class="theme-preview-content" style="background: ${theme.bg}"></div>
          </div>
        </div>
        <span class="theme-name">${theme.name}</span>
      </div>
    `).join('');

    // Add click handlers
    this.elements.themeGrid.querySelectorAll('.theme-option').forEach(option => {
      option.addEventListener('click', () => this.selectTheme(option.dataset.theme));
    });
  },

  selectTheme(themeId) {
    this.settings.preset = themeId;
    this.settings.custom_colors = {}; // Clear custom colors when changing theme

    // Update selection UI
    this.elements.themeGrid.querySelectorAll('.theme-option').forEach(option => {
      option.classList.toggle('selected', option.dataset.theme === themeId);
    });

    // Apply theme immediately
    document.documentElement.setAttribute('data-theme', themeId);

    // Clear custom color overrides
    this.colorVars.forEach(cv => {
      document.documentElement.style.removeProperty(cv.var);
    });

    // Re-render color grid with new theme colors
    this.renderColorGrid();
  },

  renderColorGrid() {
    this.elements.colorGrid.innerHTML = this.colorVars.map(cv => {
      const currentValue = this.settings.custom_colors[cv.var] ||
        getComputedStyle(document.documentElement).getPropertyValue(cv.var).trim();

      return `
        <div class="color-item">
          <input type="color" class="color-input" data-var="${cv.var}" value="${this.rgbToHex(currentValue)}">
          <span class="color-label">${cv.label}</span>
          <span class="color-value">${currentValue}</span>
        </div>
      `;
    }).join('');

    // Add change handlers
    this.elements.colorGrid.querySelectorAll('.color-input').forEach(input => {
      input.addEventListener('input', (e) => this.updateColor(e.target.dataset.var, e.target.value));
    });
  },

  updateColor(varName, value) {
    this.settings.custom_colors[varName] = value;
    document.documentElement.style.setProperty(varName, value);

    // Update displayed value
    const item = this.elements.colorGrid.querySelector(`[data-var="${varName}"]`).closest('.color-item');
    item.querySelector('.color-value').textContent = value;
  },

  rgbToHex(color) {
    // Handle hex colors
    if (color.startsWith('#')) {
      return color.length === 4
        ? '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3]
        : color;
    }

    // Handle rgb/rgba colors
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }

    return '#000000';
  },

  renderShortcuts() {
    // Group shortcuts by category
    const grouped = {};
    this.shortcuts.forEach(s => {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(s);
    });

    let html = '';
    for (const [category, items] of Object.entries(grouped)) {
      items.forEach(item => {
        html += `
          <div class="shortcut-row">
            <div class="shortcut-keys">
              ${item.keys.map(k => `<span class="shortcut-key">${k}</span>`).join('')}
            </div>
            <span class="shortcut-desc">${item.desc}</span>
            <span class="shortcut-category">${category}</span>
          </div>
        `;
      });
    }

    this.elements.shortcutsList.innerHTML = html;
  },

  updateFontPreview() {
    const fontFamily = this.elements.fontFamilySelect.value;
    const fontSize = this.elements.fontSizeInput.value + 'px';

    this.elements.fontPreview.style.fontFamily = fontFamily;
    this.elements.fontPreview.style.fontSize = fontSize;
  }
};

window.Settings = Settings;
