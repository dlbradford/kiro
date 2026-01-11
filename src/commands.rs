use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{State, AppHandle, Manager};

use crate::config::Config;
use crate::store::{Note, NoteStore, SearchResult};

pub struct AppState {
    pub store: Mutex<NoteStore>,
    pub config: Mutex<Config>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DirEntry {
    pub path: PathBuf,
    pub name: String,
    pub is_selected: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub path: PathBuf,
    pub name: String,
    pub size: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportResult {
    pub imported: usize,
    pub skipped: usize,
    pub ids: Vec<i64>,
}

// Search & Notes
#[tauri::command]
pub fn search(state: State<AppState>, query: &str, limit: usize) -> Result<Vec<SearchResult>, String> {
    let store = state.store.lock().map_err(|e| e.to_string())?;
    store.search(query, limit).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_note(state: State<AppState>, id: i64) -> Result<Option<Note>, String> {
    let store = state.store.lock().map_err(|e| e.to_string())?;
    store.get(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_note(state: State<AppState>, title: &str, body: &str) -> Result<i64, String> {
    let store = state.store.lock().map_err(|e| e.to_string())?;
    store.create(title, body).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_note(state: State<AppState>, id: i64, body: &str) -> Result<(), String> {
    let store = state.store.lock().map_err(|e| e.to_string())?;
    store.update(id, body).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_note_full(state: State<AppState>, id: i64, title: &str, body: &str) -> Result<(), String> {
    let store = state.store.lock().map_err(|e| e.to_string())?;
    store.update_title_and_body(id, title, body).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_notes(state: State<AppState>, ids: Vec<i64>) -> Result<usize, String> {
    let store = state.store.lock().map_err(|e| e.to_string())?;
    store.delete_many(&ids).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_note_count(state: State<AppState>) -> Result<usize, String> {
    let store = state.store.lock().map_err(|e| e.to_string())?;
    store.count().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn seed_notes(state: State<AppState>, count: usize) -> Result<(), String> {
    let store = state.store.lock().map_err(|e| e.to_string())?;
    store.seed(count).map_err(|e| e.to_string())
}

// Import/Export
#[tauri::command]
pub fn get_home_directories() -> Result<Vec<DirEntry>, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;

    let mut entries = Vec::new();
    if let Ok(read_dir) = std::fs::read_dir(&home) {
        for entry in read_dir.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.is_dir() {
                let name = path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_string();

                // Skip hidden directories
                if !name.starts_with('.') {
                    entries.push(DirEntry {
                        path: path.clone(),
                        name,
                        is_selected: false,
                    });
                }
            }
        }
    }

    entries.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(entries)
}

#[tauri::command]
pub fn scan_directories(dirs: Vec<PathBuf>, pattern: &str) -> Result<Vec<FileEntry>, String> {
    let regex = regex::Regex::new(&glob_to_regex(pattern))
        .map_err(|e| format!("Invalid pattern: {}", e))?;

    let mut files = Vec::new();

    for dir in dirs {
        scan_dir_recursive(&dir, &regex, &mut files);
    }

    files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(files)
}

fn scan_dir_recursive(dir: &PathBuf, regex: &regex::Regex, files: &mut Vec<FileEntry>) {
    if let Ok(read_dir) = std::fs::read_dir(dir) {
        for entry in read_dir.filter_map(|e| e.ok()) {
            let path = entry.path();

            if path.is_dir() {
                // Skip hidden directories
                let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                if !name.starts_with('.') {
                    scan_dir_recursive(&path, regex, files);
                }
            } else if path.is_file() {
                let name = path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_string();

                if regex.is_match(&name) {
                    let size = std::fs::metadata(&path)
                        .map(|m| m.len())
                        .unwrap_or(0);

                    files.push(FileEntry {
                        path: path.clone(),
                        name,
                        size,
                    });
                }
            }
        }
    }
}

fn glob_to_regex(pattern: &str) -> String {
    let mut regex = String::from("^");
    for c in pattern.chars() {
        match c {
            '*' => regex.push_str(".*"),
            '?' => regex.push('.'),
            '.' => regex.push_str("\\."),
            c => regex.push(c),
        }
    }
    regex.push('$');
    regex
}

#[tauri::command]
pub fn import_files(state: State<AppState>, paths: Vec<PathBuf>) -> Result<ImportResult, String> {
    let store = state.store.lock().map_err(|e| e.to_string())?;
    let (imported, skipped, ids) = store.import_files(&paths).map_err(|e| e.to_string())?;
    Ok(ImportResult { imported, skipped, ids })
}

#[tauri::command]
pub fn export_notes(state: State<AppState>, ids: Vec<i64>) -> Result<String, String> {
    let store = state.store.lock().map_err(|e| e.to_string())?;

    let download_dir = dirs::download_dir()
        .or_else(|| dirs::home_dir().map(|p| p.join("Downloads")))
        .ok_or("Could not find downloads directory")?;

    let export_dir = download_dir.join("kiro-export");
    let id_set: HashSet<i64> = ids.into_iter().collect();

    let count = store.export_notes(&id_set, &export_dir).map_err(|e| e.to_string())?;

    Ok(format!("Exported {} notes to {:?}", count, export_dir))
}

// Config
#[tauri::command]
pub fn get_config(state: State<AppState>) -> Result<Config, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;
    Ok(config.clone())
}

#[tauri::command]
pub fn get_scan_directories(state: State<AppState>) -> Result<Vec<PathBuf>, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;
    Ok(config.scan_directories.iter().cloned().collect())
}

#[tauri::command]
pub fn set_scan_directories(state: State<AppState>, dirs: Vec<PathBuf>) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    let dir_set: HashSet<PathBuf> = dirs.into_iter().collect();
    config.set_scan_directories(dir_set).map_err(|e| e.to_string())
}

// Theme settings
use crate::config::ThemeSettings;
use std::collections::HashMap;

#[tauri::command]
pub fn get_theme_settings(state: State<AppState>) -> Result<ThemeSettings, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;
    Ok(config.theme.clone())
}

#[tauri::command]
pub fn set_theme_preset(state: State<AppState>, preset: String) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    config.theme.preset = preset;
    config.save().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_custom_colors(state: State<AppState>, colors: HashMap<String, String>) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    config.theme.custom_colors = colors;
    config.save().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_font_settings(state: State<AppState>, font_family: String, font_size: u32, mono_font: String) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    config.theme.font_family = font_family;
    config.theme.font_size = font_size;
    config.theme.mono_font = mono_font;
    config.save().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_theme_settings(state: State<AppState>, settings: ThemeSettings) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    config.theme = settings;
    config.save().map_err(|e| e.to_string())
}

// Window controls
#[tauri::command]
pub fn window_start_drag(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.start_dragging().map_err(|e| e.to_string())
    } else {
        Err("Window not found".to_string())
    }
}

#[tauri::command]
pub fn window_minimize(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.minimize().map_err(|e| e.to_string())
    } else {
        Err("Window not found".to_string())
    }
}

#[tauri::command]
pub fn window_maximize(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_maximized().unwrap_or(false) {
            window.unmaximize().map_err(|e| e.to_string())
        } else {
            window.maximize().map_err(|e| e.to_string())
        }
    } else {
        Err("Window not found".to_string())
    }
}

#[tauri::command]
pub fn window_close(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.close().map_err(|e| e.to_string())
    } else {
        Err("Window not found".to_string())
    }
}
