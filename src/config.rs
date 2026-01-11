use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::error::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThemeSettings {
    /// Current theme preset name
    #[serde(default = "default_theme")]
    pub preset: String,

    /// Custom color overrides (CSS variable name -> color value)
    #[serde(default)]
    pub custom_colors: HashMap<String, String>,

    /// Font family
    #[serde(default = "default_font_family")]
    pub font_family: String,

    /// Font size in pixels
    #[serde(default = "default_font_size")]
    pub font_size: u32,

    /// Monospace font family
    #[serde(default = "default_mono_font")]
    pub mono_font: String,
}

fn default_theme() -> String {
    "dark".to_string()
}

fn default_font_family() -> String {
    "Inter, system-ui, -apple-system, sans-serif".to_string()
}

fn default_font_size() -> u32 {
    16
}

fn default_mono_font() -> String {
    "JetBrains Mono, Fira Code, Consolas, monospace".to_string()
}

impl Default for ThemeSettings {
    fn default() -> Self {
        Self {
            preset: default_theme(),
            custom_colors: HashMap::new(),
            font_family: default_font_family(),
            font_size: default_font_size(),
            mono_font: default_mono_font(),
        }
    }
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct Config {
    /// Directories selected for text file scanning
    #[serde(default)]
    pub scan_directories: HashSet<PathBuf>,

    /// Theme and appearance settings
    #[serde(default)]
    pub theme: ThemeSettings,
}

impl Config {
    /// Get the config file path (~/.config/kiro/config.json)
    fn config_path() -> Option<PathBuf> {
        dirs::config_dir().map(|p| p.join("kiro").join("config.json"))
    }

    /// Load config from disk, or return default if not found
    pub fn load() -> Self {
        Self::config_path()
            .and_then(|path| fs::read_to_string(&path).ok())
            .and_then(|contents| serde_json::from_str(&contents).ok())
            .unwrap_or_default()
    }

    /// Save config to disk
    pub fn save(&self) -> Result<()> {
        if let Some(path) = Self::config_path() {
            if let Some(parent) = path.parent() {
                fs::create_dir_all(parent)?;
            }
            let contents = serde_json::to_string_pretty(self)
                .map_err(|e: serde_json::Error| crate::error::KiroError::ExportFailed(e.to_string()))?;
            fs::write(&path, contents)?;
        }
        Ok(())
    }

    /// Check if scan directories have been configured
    pub fn has_scan_directories(&self) -> bool {
        !self.scan_directories.is_empty()
    }

    /// Set scan directories and save
    pub fn set_scan_directories(&mut self, dirs: HashSet<PathBuf>) -> Result<()> {
        self.scan_directories = dirs;
        self.save()
    }

    /// Clear scan directories and save
    pub fn clear_scan_directories(&mut self) -> Result<()> {
        self.scan_directories.clear();
        self.save()
    }
}
