// Tauri API wrapper

const { invoke } = window.__TAURI__.core;

const API = {
  // Search & Notes
  async search(query, limit = 500) {
    return await invoke('search', { query, limit });
  },

  async getNote(id) {
    return await invoke('get_note', { id });
  },

  async createNote(title, body) {
    return await invoke('create_note', { title, body });
  },

  async updateNote(id, body) {
    return await invoke('update_note', { id, body });
  },

  async updateNoteFull(id, title, body) {
    return await invoke('update_note_full', { id, title, body });
  },

  async deleteNotes(ids) {
    return await invoke('delete_notes', { ids });
  },

  async getNoteCount() {
    return await invoke('get_note_count');
  },

  async seedNotes(count) {
    return await invoke('seed_notes', { count });
  },

  // Import/Export
  async getHomeDirectories() {
    return await invoke('get_home_directories');
  },

  async scanDirectories(dirs, pattern) {
    return await invoke('scan_directories', { dirs, pattern });
  },

  async importFiles(paths) {
    return await invoke('import_files', { paths });
  },

  async exportNotes(ids) {
    return await invoke('export_notes', { ids });
  },

  // Config
  async getConfig() {
    return await invoke('get_config');
  },

  async getScanDirectories() {
    return await invoke('get_scan_directories');
  },

  async setScanDirectories(dirs) {
    return await invoke('set_scan_directories', { dirs });
  },

  // Theme settings
  async getThemeSettings() {
    return await invoke('get_theme_settings');
  },

  async setThemePreset(preset) {
    return await invoke('set_theme_preset', { preset });
  },

  async setCustomColors(colors) {
    return await invoke('set_custom_colors', { colors });
  },

  async setFontSettings(fontFamily, fontSize, monoFont) {
    return await invoke('set_font_settings', { fontFamily, fontSize, monoFont });
  },

  async saveThemeSettings(settings) {
    return await invoke('save_theme_settings', { settings });
  }
};

// Export for use in other modules
window.API = API;
