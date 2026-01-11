pub mod note;

use std::collections::HashSet;
use std::path::{Path, PathBuf};

use chrono::{DateTime, Utc};
use rusqlite::{params, Connection};
use sha2::{Digest, Sha256};

use crate::error::{KiroError, Result};
pub use note::{Note, SearchResult};

pub struct NoteStore {
    conn: Connection,
}

impl NoteStore {
    pub fn open(path: &Path) -> Result<Self> {
        let conn = Connection::open(path)?;
        let store = Self { conn };
        store.init_schema()?;
        Ok(store)
    }

    fn init_schema(&self) -> Result<()> {
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                import_hash TEXT
            )",
            [],
        )?;

        // Add indexes
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_updated ON notes(updated_at DESC)",
            [],
        )?;
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_import_hash ON notes(import_hash)",
            [],
        )?;

        // Migration: Add import_hash column if it doesn't exist
        let has_import_hash: bool = self
            .conn
            .prepare("PRAGMA table_info(notes)")?
            .query_map([], |row| row.get::<_, String>(1))?
            .filter_map(|r| r.ok())
            .any(|col| col == "import_hash");

        if !has_import_hash {
            self.conn
                .execute("ALTER TABLE notes ADD COLUMN import_hash TEXT", [])?;
        }

        Ok(())
    }

    pub fn count(&self) -> Result<usize> {
        let count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM notes", [], |row| row.get(0))?;
        Ok(count as usize)
    }

    pub fn get(&self, id: i64) -> Result<Option<Note>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, title, body, created_at, updated_at, import_hash FROM notes WHERE id = ?",
        )?;

        let note = stmt
            .query_row([id], |row| {
                Ok(Note {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    body: row.get(2)?,
                    created_at: parse_datetime(&row.get::<_, String>(3)?),
                    updated_at: parse_datetime(&row.get::<_, String>(4)?),
                    import_hash: row.get(5)?,
                })
            })
            .optional()?;

        Ok(note)
    }

    pub fn get_many(&self, ids: &[i64]) -> Result<Vec<Note>> {
        if ids.is_empty() {
            return Ok(Vec::new());
        }

        let placeholders: String = ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        let sql = format!(
            "SELECT id, title, body, created_at, updated_at, import_hash FROM notes WHERE id IN ({}) ORDER BY updated_at DESC",
            placeholders
        );

        let mut stmt = self.conn.prepare(&sql)?;
        let params: Vec<&dyn rusqlite::ToSql> = ids.iter().map(|id| id as &dyn rusqlite::ToSql).collect();

        let notes = stmt
            .query_map(params.as_slice(), |row| {
                Ok(Note {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    body: row.get(2)?,
                    created_at: parse_datetime(&row.get::<_, String>(3)?),
                    updated_at: parse_datetime(&row.get::<_, String>(4)?),
                    import_hash: row.get(5)?,
                })
            })?
            .filter_map(|r| r.ok())
            .collect();

        Ok(notes)
    }

    pub fn search(&self, query: &str, limit: usize) -> Result<Vec<SearchResult>> {
        use note::SearchResult;

        let query = query.trim();

        // Check for date filter prefixes: y:2024, year:2024, m:01/24, month:01/24
        let (date_filter, text_query) = Self::parse_date_filter(query);

        let (sql, params_vec): (String, Vec<Box<dyn rusqlite::ToSql>>) = match (&date_filter, text_query.is_empty()) {
            (None, true) => {
                // No filter, no text - show all
                (
                    "SELECT id, title, body, created_at FROM notes ORDER BY created_at DESC LIMIT ?".to_string(),
                    vec![Box::new(limit as i64) as Box<dyn rusqlite::ToSql>],
                )
            }
            (None, false) => {
                // Text search only
                let pattern = format!("%{}%", text_query.to_lowercase());
                (
                    "SELECT id, title, body, created_at FROM notes
                     WHERE lower(title) LIKE ?1 OR lower(body) LIKE ?1
                     ORDER BY created_at DESC LIMIT ?2".to_string(),
                    vec![
                        Box::new(pattern) as Box<dyn rusqlite::ToSql>,
                        Box::new(limit as i64),
                    ],
                )
            }
            (Some((year, None)), true) => {
                // Year filter only
                let year_pattern = format!("{:04}-%", year);
                (
                    "SELECT id, title, body, created_at FROM notes
                     WHERE created_at LIKE ?1
                     ORDER BY created_at DESC LIMIT ?2".to_string(),
                    vec![
                        Box::new(year_pattern) as Box<dyn rusqlite::ToSql>,
                        Box::new(limit as i64),
                    ],
                )
            }
            (Some((year, Some(month))), true) => {
                // Year + month filter only
                let month_pattern = format!("{:04}-{:02}-%", year, month);
                (
                    "SELECT id, title, body, created_at FROM notes
                     WHERE created_at LIKE ?1
                     ORDER BY created_at DESC LIMIT ?2".to_string(),
                    vec![
                        Box::new(month_pattern) as Box<dyn rusqlite::ToSql>,
                        Box::new(limit as i64),
                    ],
                )
            }
            (Some((year, None)), false) => {
                // Year filter + text search
                let year_pattern = format!("{:04}-%", year);
                let text_pattern = format!("%{}%", text_query.to_lowercase());
                (
                    "SELECT id, title, body, created_at FROM notes
                     WHERE created_at LIKE ?1 AND (lower(title) LIKE ?2 OR lower(body) LIKE ?2)
                     ORDER BY created_at DESC LIMIT ?3".to_string(),
                    vec![
                        Box::new(year_pattern) as Box<dyn rusqlite::ToSql>,
                        Box::new(text_pattern),
                        Box::new(limit as i64),
                    ],
                )
            }
            (Some((year, Some(month))), false) => {
                // Year + month filter + text search
                let month_pattern = format!("{:04}-{:02}-%", year, month);
                let text_pattern = format!("%{}%", text_query.to_lowercase());
                (
                    "SELECT id, title, body, created_at FROM notes
                     WHERE created_at LIKE ?1 AND (lower(title) LIKE ?2 OR lower(body) LIKE ?2)
                     ORDER BY created_at DESC LIMIT ?3".to_string(),
                    vec![
                        Box::new(month_pattern) as Box<dyn rusqlite::ToSql>,
                        Box::new(text_pattern),
                        Box::new(limit as i64),
                    ],
                )
            }
        };

        let mut stmt = self.conn.prepare(&sql)?;
        let param_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();

        let results: Vec<SearchResult> = stmt
            .query_map(param_refs.as_slice(), |row| {
                let body: String = row.get(2)?;
                let word_count = body.split_whitespace().count();
                let body_preview: String = body.chars().take(100).collect();
                Ok(SearchResult {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    body_preview,
                    created_at: parse_datetime(&row.get::<_, String>(3)?),
                    word_count,
                })
            })?
            .filter_map(|r| r.ok())
            .collect();

        Ok(results)
    }

    /// Parse date filter from query. Returns (date_filter, remaining_text)
    /// Supports: y:2024, year:2024, m:01/24, month:01/24, m:1/24
    fn parse_date_filter(query: &str) -> (Option<(i32, Option<u32>)>, String) {
        let mut remaining_parts = Vec::new();
        let mut date_filter: Option<(i32, Option<u32>)> = None;

        for part in query.split_whitespace() {
            let lower = part.to_lowercase();

            // Year filter: y:2024 or year:2024
            if let Some(year_str) = lower.strip_prefix("y:").or_else(|| lower.strip_prefix("year:")) {
                if let Ok(year) = year_str.parse::<i32>() {
                    if (1900..=2100).contains(&year) {
                        date_filter = Some((year, None));
                        continue;
                    }
                }
            }

            // Month filter: m:01/24 or month:01/24 or m:1/2024
            if let Some(month_str) = lower.strip_prefix("m:").or_else(|| lower.strip_prefix("month:")) {
                if let Some((month, year)) = Self::parse_month_year(month_str) {
                    date_filter = Some((year, Some(month)));
                    continue;
                }
            }

            remaining_parts.push(part);
        }

        (date_filter, remaining_parts.join(" "))
    }

    /// Parse MM/YY or MM/YYYY format
    fn parse_month_year(s: &str) -> Option<(u32, i32)> {
        let parts: Vec<&str> = s.split('/').collect();
        if parts.len() != 2 {
            return None;
        }

        let month: u32 = parts[0].parse().ok()?;
        if !(1..=12).contains(&month) {
            return None;
        }

        let year_str = parts[1];
        let year: i32 = if year_str.len() == 2 {
            // Convert YY to YYYY (assume 2000s)
            2000 + year_str.parse::<i32>().ok()?
        } else {
            year_str.parse().ok()?
        };

        if (1900..=2100).contains(&year) {
            Some((month, year))
        } else {
            None
        }
    }

    pub fn create(&self, title: &str, body: &str) -> Result<i64> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            "INSERT INTO notes (title, body, created_at, updated_at) VALUES (?, ?, ?, ?)",
            params![title, body, now, now],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn update(&self, id: i64, body: &str) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        let rows = self.conn.execute(
            "UPDATE notes SET body = ?, updated_at = ? WHERE id = ?",
            params![body, now, id],
        )?;

        if rows == 0 {
            return Err(KiroError::NoteNotFound(id));
        }
        Ok(())
    }

    pub fn update_title_and_body(&self, id: i64, title: &str, body: &str) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        let rows = self.conn.execute(
            "UPDATE notes SET title = ?, body = ?, updated_at = ? WHERE id = ?",
            params![title, body, now, id],
        )?;

        if rows == 0 {
            return Err(KiroError::NoteNotFound(id));
        }
        Ok(())
    }

    pub fn delete(&self, id: i64) -> Result<()> {
        let rows = self.conn.execute("DELETE FROM notes WHERE id = ?", [id])?;
        if rows == 0 {
            return Err(KiroError::NoteNotFound(id));
        }
        Ok(())
    }

    pub fn delete_many(&self, ids: &[i64]) -> Result<usize> {
        if ids.is_empty() {
            return Ok(0);
        }

        let placeholders: String = ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        let sql = format!("DELETE FROM notes WHERE id IN ({})", placeholders);
        let params: Vec<&dyn rusqlite::ToSql> = ids.iter().map(|id| id as &dyn rusqlite::ToSql).collect();
        let rows = self.conn.execute(&sql, params.as_slice())?;
        Ok(rows)
    }

    pub fn seed(&self, count: usize) -> Result<()> {
        for i in 0..count {
            let title = format!("Sample note {}", i + 1);
            let body = format!(
                "This is sample note number {}.\n\nCreated for testing Kiro.\nContains keywords like alpha beta gamma delta.\n\nUse :help for commands.",
                i + 1
            );
            self.create(&title, &body)?;
        }
        Ok(())
    }

    fn compute_hash(title: &str, body: &str) -> String {
        let content = format!("{}||{}", title, body);
        let mut hasher = Sha256::new();
        hasher.update(content.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    fn hash_exists(&self, hash: &str) -> Result<bool> {
        let count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM notes WHERE import_hash = ?",
            [hash],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }

    /// Check if any note exists with similar content (for duplicate detection)
    /// Uses both import_hash check and content similarity check
    fn content_exists(&self, title: &str, body: &str) -> Result<bool> {
        // First check import hash for exact match
        let hash = Self::compute_hash(title, body);
        if self.hash_exists(&hash)? {
            return Ok(true);
        }

        // Check for existing note with same body content (regardless of title)
        // This catches manually created notes that have the same content
        let count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM notes WHERE body = ?",
            [body],
            |row| row.get(0),
        )?;
        if count > 0 {
            return Ok(true);
        }

        // Check for existing note with same title and very similar body (first 200 chars)
        // This catches notes that might have been slightly modified
        // Use char-based slicing for UTF-8 safety
        let body_prefix: String = body.chars().take(200).collect();
        let count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM notes WHERE title = ? AND body LIKE ?",
            params![title, format!("{}%", body_prefix)],
            |row| row.get(0),
        )?;

        Ok(count > 0)
    }

    pub fn import_file(&self, path: &Path) -> Result<(bool, Option<i64>)> {
        let content = std::fs::read_to_string(path)?;
        let title = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("(untitled)")
            .to_string();

        // Check for duplicates against all existing notes
        if self.content_exists(&title, &content)? {
            return Ok((false, None)); // Skip duplicate
        }

        // Get file modification time, fall back to now if unavailable
        let file_date = std::fs::metadata(path)
            .ok()
            .and_then(|m| m.modified().ok())
            .map(|t| DateTime::<Utc>::from(t))
            .unwrap_or_else(Utc::now)
            .to_rfc3339();

        let hash = Self::compute_hash(&title, &content);
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            "INSERT INTO notes (title, body, created_at, updated_at, import_hash) VALUES (?, ?, ?, ?, ?)",
            params![title, content, file_date, now, hash],
        )?;

        Ok((true, Some(self.conn.last_insert_rowid())))
    }

    pub fn import_files(&self, paths: &[PathBuf]) -> Result<(usize, usize, Vec<i64>)> {
        let mut imported = 0;
        let mut skipped = 0;
        let mut ids = Vec::new();

        for path in paths {
            match self.import_file(path) {
                Ok((true, Some(id))) => {
                    imported += 1;
                    ids.push(id);
                }
                Ok((true, None)) => {
                    // Shouldn't happen, but treat as imported without ID
                    imported += 1;
                }
                Ok((false, _)) => {
                    skipped += 1;
                }
                Err(_) => {
                    skipped += 1;
                }
            }
        }

        Ok((imported, skipped, ids))
    }

    pub fn export_notes(&self, note_ids: &HashSet<i64>, dir: &Path) -> Result<usize> {
        std::fs::create_dir_all(dir)?;

        let mut count = 0;
        for id in note_ids {
            if let Some(note) = self.get(*id)? {
                let safe_title: String = note
                    .title
                    .chars()
                    .filter(|c| c.is_alphanumeric() || *c == ' ' || *c == '-' || *c == '_')
                    .take(50)
                    .collect();
                let safe_title = safe_title.trim().replace(' ', "-");
                let filename = if safe_title.is_empty() {
                    format!("note-{}.md", id)
                } else {
                    format!("note-{}-{}.md", id, safe_title)
                };

                let content = format!(
                    "# {}\n\n_Created: {} | Updated: {}_\n\n{}",
                    note.title,
                    note.created_at.format("%Y-%m-%d %H:%M"),
                    note.updated_at.format("%Y-%m-%d %H:%M"),
                    note.body
                );

                std::fs::write(dir.join(&filename), content)?;
                count += 1;
            }
        }

        Ok(count)
    }
}

fn parse_datetime(s: &str) -> DateTime<Utc> {
    DateTime::parse_from_rfc3339(s)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now())
}

trait OptionalExt<T> {
    fn optional(self) -> std::result::Result<Option<T>, rusqlite::Error>;
}

impl<T> OptionalExt<T> for std::result::Result<T, rusqlite::Error> {
    fn optional(self) -> std::result::Result<Option<T>, rusqlite::Error> {
        match self {
            Ok(v) => Ok(Some(v)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }
}
