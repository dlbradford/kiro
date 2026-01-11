pub mod commands;
pub mod config;
pub mod error;
pub mod store;

use std::sync::Mutex;

use commands::AppState;
use config::Config;
use store::NoteStore;

fn get_db_path() -> std::path::PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("kiro")
        .join("notes.db")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Ensure database directory exists
    let db_path = get_db_path();
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).expect("Failed to create database directory");
    }

    // Open database
    let store = NoteStore::open(&db_path).expect("Failed to open database");
    let config = Config::load();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            store: Mutex::new(store),
            config: Mutex::new(config),
        })
        .invoke_handler(tauri::generate_handler![
            commands::search,
            commands::get_note,
            commands::create_note,
            commands::update_note,
            commands::update_note_full,
            commands::delete_notes,
            commands::get_note_count,
            commands::seed_notes,
            commands::get_home_directories,
            commands::scan_directories,
            commands::import_files,
            commands::export_notes,
            commands::get_config,
            commands::get_scan_directories,
            commands::set_scan_directories,
            commands::get_theme_settings,
            commands::set_theme_preset,
            commands::set_custom_colors,
            commands::set_font_settings,
            commands::save_theme_settings,
            commands::window_start_drag,
            commands::window_minimize,
            commands::window_maximize,
            commands::window_close,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
