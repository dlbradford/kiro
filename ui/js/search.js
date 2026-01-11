// Search and results management

const Search = {
  results: [],
  selectedIndex: -1,
  markedIds: new Set(),

  elements: {
    input: null,
    resultsList: null,
    resultsCount: null,
    previewTitle: null,
    previewMeta: null,
    previewContent: null,
    statusTotal: null,
    statusMarked: null,
  },

  init() {
    this.elements.input = document.getElementById('search-input');
    this.elements.resultsList = document.getElementById('results-list');
    this.elements.resultsCount = document.getElementById('results-count');
    this.elements.previewTitle = document.getElementById('preview-title');
    this.elements.previewMeta = document.getElementById('preview-meta');
    this.elements.previewContent = document.getElementById('preview-content');
    this.elements.statusTotal = document.getElementById('status-total');
    this.elements.statusMarked = document.getElementById('status-marked');

    // Search input handler with debounce
    this.elements.input.addEventListener('input', debounce(() => {
      this.performSearch();
    }, 150));

    // Results list click handler
    this.elements.resultsList.addEventListener('click', (e) => {
      const item = e.target.closest('.result-item');
      if (!item) return;

      const index = parseInt(item.dataset.index);
      const checkbox = e.target.closest('.result-checkbox');

      if (checkbox) {
        this.toggleMark(index);
      } else {
        this.selectIndex(index);
      }
    });

    // Double-click to edit
    this.elements.resultsList.addEventListener('dblclick', (e) => {
      const item = e.target.closest('.result-item');
      if (item) {
        Editor.editNote(this.results[this.selectedIndex]);
      }
    });

    // Initial load
    this.performSearch();
    this.updateTotalCount();
  },

  async performSearch() {
    const query = this.elements.input.value;

    try {
      this.results = await API.search(query, 500);
      this.renderResults();

      // Select first result if we have results
      if (this.results.length > 0) {
        this.selectIndex(0);
      } else {
        this.selectedIndex = -1;
        this.showEmptyPreview();
      }
    } catch (error) {
      console.error('Search failed:', error);
      showToast('Search failed: ' + error, 'error');
    }
  },

  renderResults() {
    this.elements.resultsCount.textContent = `(${this.results.length})`;

    if (this.results.length === 0) {
      this.elements.resultsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">No notes found</div>
          <div class="empty-state-description">Press Enter to create a new note</div>
        </div>
      `;
      return;
    }

    this.elements.resultsList.innerHTML = this.results.map((result, index) => {
      const isSelected = index === this.selectedIndex;
      const isMarked = this.markedIds.has(result.id);
      const displayText = getDisplayText(result.title, result.body_preview, 50);
      const dateStr = formatDate(result.created_at);
      const wordsStr = formatWordCount(result.word_count);

      return `
        <div class="result-item ${isSelected ? 'selected' : ''} ${isMarked ? 'marked' : ''}"
             data-index="${index}" data-id="${result.id}" tabindex="-1">
          <input type="checkbox" class="result-checkbox" ${isMarked ? 'checked' : ''}>
          <div class="result-content">
            <div class="result-title">${escapeHtml(displayText)}</div>
            <div class="result-meta">
              <span class="result-date">${dateStr}</span>
              <span class="result-words">${wordsStr}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  selectIndex(index) {
    if (index < 0 || index >= this.results.length) return;

    this.selectedIndex = index;

    // Update visual selection
    const items = this.elements.resultsList.querySelectorAll('.result-item');
    items.forEach((item, i) => {
      item.classList.toggle('selected', i === index);
    });

    // Scroll into view
    const selectedItem = items[index];
    if (selectedItem) {
      scrollIntoViewIfNeeded(selectedItem, this.elements.resultsList);
    }

    // Show preview
    this.showPreview(this.results[index]);
  },

  async showPreview(result) {
    try {
      const note = await API.getNote(result.id);
      if (!note) {
        this.showEmptyPreview();
        return;
      }

      this.elements.previewTitle.textContent = note.title;
      this.elements.previewMeta.innerHTML = `
        Created: ${formatDateTime(note.created_at)} |
        Updated: ${formatDateTime(note.updated_at)} |
        ${countWords(note.body)} words
      `;
      this.elements.previewContent.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(note.body)}</pre>`;
    } catch (error) {
      console.error('Failed to load note:', error);
    }
  },

  showEmptyPreview() {
    this.elements.previewTitle.textContent = 'Select a note';
    this.elements.previewMeta.textContent = '';
    this.elements.previewContent.innerHTML = `
      <div class="preview-empty">
        ${this.results.length === 0 ? 'Type to search or create a new note' : 'Select a note to view its contents'}
      </div>
    `;
  },

  // Navigation
  moveSelection(delta) {
    const newIndex = Math.max(0, Math.min(this.results.length - 1, this.selectedIndex + delta));
    this.selectIndex(newIndex);
  },

  jumpToFirst() {
    if (this.results.length > 0) {
      this.selectIndex(0);
    }
  },

  jumpToLast() {
    if (this.results.length > 0) {
      this.selectIndex(this.results.length - 1);
    }
  },

  pageDown() {
    this.moveSelection(10);
  },

  pageUp() {
    this.moveSelection(-10);
  },

  // Marking
  toggleMark(index) {
    if (index < 0 || index >= this.results.length) return;

    const id = this.results[index].id;
    if (this.markedIds.has(id)) {
      this.markedIds.delete(id);
    } else {
      this.markedIds.add(id);
    }

    this.renderResults();
    this.updateMarkedStatus();
  },

  toggleCurrentMark() {
    this.toggleMark(this.selectedIndex);
  },

  markAll() {
    this.results.forEach(r => this.markedIds.add(r.id));
    this.renderResults();
    this.updateMarkedStatus();
  },

  clearMarks() {
    this.markedIds.clear();
    this.renderResults();
    this.updateMarkedStatus();
  },

  updateMarkedStatus() {
    const count = this.markedIds.size;
    if (count > 0) {
      this.elements.statusMarked.textContent = `Marked: ${count}`;
      this.elements.statusMarked.style.display = 'inline';
    } else {
      this.elements.statusMarked.style.display = 'none';
    }
  },

  async updateTotalCount() {
    try {
      const count = await API.getNoteCount();
      this.elements.statusTotal.textContent = `${count} notes`;
    } catch (error) {
      console.error('Failed to get note count:', error);
    }
  },

  getSelectedNote() {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.results.length) {
      return this.results[this.selectedIndex];
    }
    return null;
  },

  getMarkedIds() {
    return Array.from(this.markedIds);
  },

  // Actions
  async deleteSelected() {
    const idsToDelete = this.markedIds.size > 0
      ? this.getMarkedIds()
      : (this.getSelectedNote() ? [this.getSelectedNote().id] : []);

    if (idsToDelete.length === 0) {
      showToast('No notes selected', 'warning');
      return;
    }

    const confirmed = await Dialogs.confirm(
      'Delete Notes',
      `Are you sure you want to delete ${idsToDelete.length} note(s)?<br><br><span class="confirm-warning">This action cannot be undone.</span>`
    );

    if (!confirmed) return;

    try {
      const deleted = await API.deleteNotes(idsToDelete);
      showToast(`Deleted ${deleted} note(s)`, 'success');

      // Clear marks and refresh
      this.markedIds.clear();
      await this.performSearch();
      await this.updateTotalCount();
    } catch (error) {
      showToast('Delete failed: ' + error, 'error');
    }
  },

  async exportMarked() {
    const ids = this.getMarkedIds();
    if (ids.length === 0) {
      showToast('No notes marked for export', 'warning');
      return;
    }

    try {
      const result = await API.exportNotes(ids);
      showToast(result, 'success');
    } catch (error) {
      showToast('Export failed: ' + error, 'error');
    }
  },

  async createNote(title) {
    try {
      const id = await API.createNote(title, '');
      showToast('Note created', 'success');

      await this.performSearch();
      await this.updateTotalCount();

      // Find and select the new note
      const index = this.results.findIndex(r => r.id === id);
      if (index >= 0) {
        this.selectIndex(index);
        const note = await API.getNote(id);
        Editor.editNote(note);
      }
    } catch (error) {
      showToast('Failed to create note: ' + error, 'error');
    }
  }
};

// HTML escape helper
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.Search = Search;
