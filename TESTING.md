# Kiro Testing Guide

This document describes how to test the Kiro application and lists all test cases.

## Running Tests

### Interactive Test Runner

Kiro includes an interactive HTML-based test runner for manual testing:

1. Start the application:
   ```bash
   cargo tauri dev
   ```

2. Open the test runner in your browser:
   ```bash
   # Linux
   xdg-open tests/test_runner.html

   # macOS
   open tests/test_runner.html

   # Or navigate directly to:
   # file:///path/to/kiro/tests/test_runner.html
   ```

3. Follow the test cases, checking boxes as tests pass.

4. The summary at the bottom tracks your progress.

### Quick Smoke Test

Before running the full test suite, verify basic functionality:

1. Application launches without errors
2. Window can be dragged and resized
3. Search input is focused on startup
4. Typing in search updates results

---

## Test Cases

### 1. Search Tests

#### 1.1 Empty search shows all notes
- **Steps:** Clear search input, wait for results
- **Expected:** All notes displayed (up to 500), sorted by date

#### 1.2 Text search filters results
- **Steps:** Type a keyword that exists in some notes
- **Expected:** Only matching notes shown, count updates

#### 1.3 Year filter (y:2024)
- **Steps:** Type `y:2024` in search
- **Expected:** Only notes from 2024 shown

#### 1.4 Month filter (m:01/24)
- **Steps:** Type `m:01/24` in search
- **Expected:** Only notes from January 2024 shown

#### 1.5 Combined filter (y:2024 keyword)
- **Steps:** Type `y:2024 sample` in search
- **Expected:** Only notes from 2024 containing "sample"

#### 1.6 Search updates as user types
- **Steps:** Type slowly, observe results changing
- **Expected:** Results update with ~150ms debounce

---

### 2. Note CRUD Tests

#### 2.1 Create note via search
- **Steps:** Type "New Test Note" with no matches, press Enter
- **Expected:** New note created, editor opens with title set

#### 2.2 Read note preview
- **Steps:** Click on a result item
- **Expected:** Preview panel shows title, dates, word count, body

#### 2.3 Update note
- **Steps:** Select note, press Enter, edit body, press Ctrl+S
- **Expected:** Changes saved, toast confirmation shown

#### 2.4 Delete single note
- **Steps:** Select note (no marks), press 'd', confirm
- **Expected:** Note deleted, removed from list, count updated

#### 2.5 Delete multiple marked notes
- **Steps:** Mark several notes with Space, press 'd', confirm
- **Expected:** All marked notes deleted

---

### 3. Navigation Tests

#### 3.1 Arrow keys / j/k navigation
- **Steps:** Press j or ↓ to move down, k or ↑ to move up
- **Expected:** Selection moves, preview updates

#### 3.2 Jump to first (g)
- **Steps:** Navigate to middle, press 'g'
- **Expected:** Selection jumps to first result

#### 3.3 Jump to last (G)
- **Steps:** Press Shift+G
- **Expected:** Selection jumps to last result

#### 3.4 Page down (Ctrl+D)
- **Steps:** Press Ctrl+D
- **Expected:** Selection moves down 10 items

#### 3.5 Page up (Ctrl+U)
- **Steps:** Press Ctrl+U
- **Expected:** Selection moves up 10 items

#### 3.6 Tab toggles focus
- **Steps:** Press Tab repeatedly
- **Expected:** Focus alternates between search input and results

#### 3.7 Escape clears search
- **Steps:** Type in search, press Escape
- **Expected:** Search cleared, all results shown

---

### 4. Marking Tests

#### 4.1 Toggle mark with Space
- **Steps:** Select a result, press Space
- **Expected:** Checkbox toggles, row highlighted, status bar updates

#### 4.2 Mark all visible (a)
- **Steps:** Press 'a'
- **Expected:** All visible results marked

#### 4.3 Clear all marks (c)
- **Steps:** Mark some notes, press 'c'
- **Expected:** All marks cleared, status bar hidden

#### 4.4 Mark count in status bar
- **Steps:** Mark several notes
- **Expected:** "Marked: N" shown in status bar

#### 4.5 Marks persist across searches
- **Steps:** Mark notes, change search, clear search
- **Expected:** Previously marked notes still marked

#### 4.6 Click checkbox to toggle mark
- **Steps:** Click directly on a checkbox
- **Expected:** Mark toggles without changing selection

---

### 5. Import Tests

#### 5.1 F2 opens import dialog
- **Steps:** Press F2
- **Expected:** Import dialog opens with home directories listed

#### 5.2 Directory selection
- **Steps:** Click on directories in the list
- **Expected:** Directories toggle selection, checkboxes update

#### 5.3 File scanning with filter
- **Steps:** Select dirs, set filter to "*.txt", click Scan
- **Expected:** Matching files listed with names and sizes

#### 5.4 Import selected files
- **Steps:** Select some files, click Import Selected
- **Expected:** Files imported, toast shows count

#### 5.5 Duplicate detection
- **Steps:** Try to import same files again
- **Expected:** Duplicates skipped, toast shows "X skipped"

#### 5.6 File date preserved
- **Steps:** Import a file, check its created date
- **Expected:** Created date matches original file modification date

---

### 6. Export Tests

#### 6.1 F3 exports marked notes
- **Steps:** Mark some notes, press F3
- **Expected:** Notes exported to `~/Downloads/kiro-export/`

#### 6.2 F3 without marks shows warning
- **Steps:** Clear marks, press F3
- **Expected:** Warning toast "No notes marked for export"

#### 6.3 Export file format
- **Steps:** Open an exported .md file
- **Expected:** Contains `# title`, dates, and body content

---

### 7. Editor Tests

#### 7.1 Enter opens editor
- **Steps:** Select a note, press Enter
- **Expected:** Editor opens with title and body loaded

#### 7.2 Ctrl+S saves changes
- **Steps:** Edit note, press Ctrl+S
- **Expected:** Changes saved, toast confirmation

#### 7.3 Unsaved changes indicator
- **Steps:** Make changes in editor
- **Expected:** Yellow dot appears next to title

#### 7.4 Escape with unsaved changes
- **Steps:** Edit note, press Escape
- **Expected:** Confirmation dialog appears

#### 7.5 Escape without changes
- **Steps:** Open editor, don't edit, press Escape
- **Expected:** Returns to search view immediately

#### 7.6 Title is required
- **Steps:** Clear title, try to save
- **Expected:** Warning toast, title input focused

---

### 8. Keyboard Shortcut Tests

#### 8.1 Help dialog (?)
- **Steps:** Press ? when not typing
- **Expected:** Help dialog opens with all shortcuts

#### 8.2 Escape closes dialogs
- **Steps:** Open help, press Escape
- **Expected:** Dialog closes

#### 8.3 Shortcuts blocked while typing
- **Steps:** Focus search, type 'g', 'j', 'k'
- **Expected:** Characters typed, not interpreted as shortcuts

#### 8.4 Arrow keys work while typing
- **Steps:** Focus search, press Arrow Down
- **Expected:** Selection moves in results list

---

### 9. UI/UX Tests

#### 9.1 Results show title, date, word count
- **Steps:** View results list
- **Expected:** Each row shows truncated title, MM/DD/YY date, Nw count

#### 9.2 Date format is US (MM/DD/YY)
- **Steps:** Check dates in results list
- **Expected:** Dates formatted as 01/15/24 (not 15/01/24)

#### 9.3 Selected item highlighted
- **Steps:** Navigate results
- **Expected:** Selected row has distinct background color

#### 9.4 Marked items highlighted differently
- **Steps:** Mark a note
- **Expected:** Marked rows have purple/different background

#### 9.5 Status bar shows shortcuts
- **Steps:** Check bottom of window
- **Expected:** F2 Import, F3 Export, d Delete, ? Help visible

#### 9.6 Toast notifications
- **Steps:** Perform actions (save, delete, etc.)
- **Expected:** Toast appears in bottom-right, auto-dismisses

#### 9.7 Scrolling maintains selection visible
- **Steps:** Navigate with j/k through long list
- **Expected:** Selection scrolls into view automatically

---

### 10. Window Tests

#### 10.1 Window dragging
- **Steps:** Click and drag the header area
- **Expected:** Window moves without errors

#### 10.2 Window minimize
- **Steps:** Click minimize button (—)
- **Expected:** Window minimizes to taskbar

#### 10.3 Window maximize
- **Steps:** Click maximize button (□)
- **Expected:** Window maximizes/restores

#### 10.4 Window close
- **Steps:** Click close button (×)
- **Expected:** Application closes

#### 10.5 Panel resize
- **Steps:** Drag the divider between results and preview
- **Expected:** Panels resize (200-600px range)

#### 10.6 Rounded corners
- **Steps:** Observe window edges
- **Expected:** Window has rounded corners

---

### 11. Theme Tests

#### 11.1 Open settings
- **Steps:** Press Ctrl+, or click settings
- **Expected:** Settings panel opens

#### 11.2 Change theme preset
- **Steps:** Select a different theme (e.g., Nord)
- **Expected:** Colors update immediately

#### 11.3 Theme persists
- **Steps:** Change theme, restart app
- **Expected:** Theme preference saved and restored

---

## Test Data Setup

To populate test data for thorough testing:

1. **Create sample notes:** Type various titles in search and press Enter
2. **Import files:** Use F2 to import `.txt` files from your system
3. **Seed data:** The app can generate sample notes via the backend

## Reporting Issues

If a test fails:

1. Note the exact steps to reproduce
2. Capture any error messages (check browser dev tools with F12)
3. Include your OS and version
4. Open an issue on GitHub with the details

## Test Coverage Summary

| Category | Test Count |
|----------|------------|
| Search | 6 |
| CRUD | 5 |
| Navigation | 7 |
| Marking | 6 |
| Import | 6 |
| Export | 3 |
| Editor | 6 |
| Keyboard | 4 |
| UI/UX | 7 |
| Window | 6 |
| Theme | 3 |
| **Total** | **59** |
