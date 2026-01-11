// Utility functions

/**
 * Debounce function execution
 */
function debounce(fn, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Format file size in human readable form
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${month}/${day}/${year}`;
}

/**
 * Format full date with time
 */
function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Count words in text
 */
function countWords(text) {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Format word count
 */
function formatWordCount(count) {
  if (count >= 10000) {
    return Math.floor(count / 1000) + 'k';
  }
  return count + 'w';
}

/**
 * Truncate text to max length
 */
function truncate(text, maxLen) {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

/**
 * Clean text for display (normalize whitespace)
 */
function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Create element with class and optional content
 */
function createElement(tag, className, content) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (content) el.textContent = content;
  return el;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toast-container');

  const toast = createElement('div', `toast ${type}`);
  toast.innerHTML = `
    <span class="toast-message">${message}</span>
    <button class="toast-close">&times;</button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => toast.remove());

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Scroll element into view within container
 */
function scrollIntoViewIfNeeded(element, container) {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  if (elementRect.top < containerRect.top) {
    element.scrollIntoView({ block: 'start', behavior: 'smooth' });
  } else if (elementRect.bottom > containerRect.bottom) {
    element.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }
}

/**
 * Generate display text for a note result
 */
function getDisplayText(title, bodyPreview, maxLen) {
  const combined = bodyPreview ? `${title} - ${bodyPreview}` : title;
  const clean = cleanText(combined);
  return truncate(clean, maxLen);
}
