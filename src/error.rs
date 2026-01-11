use thiserror::Error;

#[derive(Error, Debug)]
pub enum KiroError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Note not found: {0}")]
    NoteNotFound(i64),

    #[error("Invalid path: {0}")]
    InvalidPath(String),

    #[error("Import failed: {0}")]
    ImportFailed(String),

    #[error("Export failed: {0}")]
    ExportFailed(String),
}

pub type Result<T> = std::result::Result<T, KiroError>;
