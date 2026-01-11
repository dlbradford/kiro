use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Compact result for search listings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub id: i64,
    pub title: String,
    pub body_preview: String,
    pub created_at: DateTime<Utc>,
    pub word_count: usize,
}

impl SearchResult {
    /// Format title + body preview to fill available width
    pub fn display_text(&self, max_len: usize) -> String {
        // Combine title and body, separated by " - "
        let combined = if self.body_preview.is_empty() {
            self.title.clone()
        } else {
            format!("{} - {}", self.title, self.body_preview)
        };

        // Clean up whitespace
        let clean: String = combined
            .chars()
            .map(|c| if c.is_whitespace() { ' ' } else { c })
            .collect::<String>()
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" ");

        let char_count = clean.chars().count();
        if char_count > max_len {
            let truncated: String = clean.chars().take(max_len.saturating_sub(3)).collect();
            format!("{}...", truncated)
        } else {
            clean
        }
    }

    /// Format the date compactly (original file date) - US format
    pub fn date_str(&self) -> String {
        self.created_at.format("%m/%d/%y").to_string()
    }

    /// Format word count compactly with 'w' suffix
    pub fn words_str(&self) -> String {
        if self.word_count >= 10000 {
            format!("{}k", self.word_count / 1000)
        } else {
            format!("{}w", self.word_count)
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: i64,
    pub title: String,
    pub body: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub import_hash: Option<String>,
}

impl Note {
    pub fn new(id: i64, title: String, body: String) -> Self {
        let now = Utc::now();
        Self {
            id,
            title,
            body,
            created_at: now,
            updated_at: now,
            import_hash: None,
        }
    }

    pub fn snippet(&self, max_len: usize) -> String {
        let combined = format!("{}\n{}", self.title, self.body);
        let single_line: String = combined
            .chars()
            .map(|c| if c == '\n' { ' ' } else { c })
            .collect();
        if single_line.len() > max_len {
            format!("{}...", &single_line[..max_len])
        } else {
            single_line
        }
    }
}
