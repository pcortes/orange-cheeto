/**
 * Text Replacement Engine
 * Handles finding and replacing target words with styled spans
 */

const Replacer = {
  // Pattern to match "trump" as a whole word (case-insensitive)
  PATTERN: /\btrump\b/gi,

  // Track replacement count for this page
  replacementCount: 0,

  // Current settings cache
  settings: null,
  enabledReplacements: [],

  /**
   * Initialize with settings
   * @param {object} settings - Settings from storage
   * @param {string[]} enabledReplacements - Array of enabled replacement texts
   */
  init(settings, enabledReplacements) {
    this.settings = settings;
    this.enabledReplacements = enabledReplacements;
    this.replacementCount = 0;
  },

  /**
   * Get a random replacement from enabled list
   * @returns {string}
   */
  getRandomReplacement() {
    if (this.enabledReplacements.length === 0) {
      return "orange cheeto"; // Fallback
    }
    const index = Math.floor(Math.random() * this.enabledReplacements.length);
    return this.enabledReplacements[index];
  },

  /**
   * Preserve original text case in replacement
   * @param {string} original - Original matched text
   * @param {string} replacement - Replacement text
   * @returns {string} Case-adjusted replacement
   */
  matchCase(original, replacement) {
    // All uppercase
    if (original === original.toUpperCase()) {
      return replacement.toUpperCase();
    }
    // Title case (first letter uppercase)
    if (original[0] === original[0].toUpperCase()) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    }
    // Lowercase
    return replacement.toLowerCase();
  },

  /**
   * Create a replacement span element
   * @param {string} original - Original text that was matched
   * @param {string} replacement - Replacement text
   * @returns {HTMLSpanElement}
   */
  createReplacementSpan(original, replacement) {
    const span = document.createElement('span');
    span.className = 'oc-replaced oc-replaced--entering';
    span.textContent = this.matchCase(original, replacement);
    span.setAttribute('data-original', original);
    span.setAttribute('title', `Originally: "${original}"`);

    // Add animation class based on settings
    if (this.settings && this.settings.animationType !== 'none') {
      // Add animation after entry animation completes
      setTimeout(() => {
        span.classList.remove('oc-replaced--entering');
        if (this.settings.animationType) {
          span.classList.add(`oc-replaced--${this.settings.animationType}`);
        }
      }, 350);
    } else {
      // No animation, just remove entering class
      setTimeout(() => {
        span.classList.remove('oc-replaced--entering');
      }, 350);
    }

    return span;
  },

  /**
   * Replace matches in a single text node
   * @param {Text} textNode - Text node to process
   * @returns {number} Number of replacements made
   */
  replaceInTextNode(textNode) {
    const text = textNode.textContent;

    // Quick check - skip if no match
    if (!this.PATTERN.test(text)) {
      return 0;
    }

    // Reset pattern lastIndex for new search
    this.PATTERN.lastIndex = 0;

    // Create a document fragment to hold the new content
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;
    let count = 0;

    while ((match = this.PATTERN.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.slice(lastIndex, match.index))
        );
      }

      // Create replacement span
      const replacement = this.getRandomReplacement();
      const span = this.createReplacementSpan(match[0], replacement);
      fragment.appendChild(span);

      lastIndex = match.index + match[0].length;
      count++;
    }

    // Add remaining text after last match
    if (lastIndex < text.length) {
      fragment.appendChild(
        document.createTextNode(text.slice(lastIndex))
      );
    }

    // Replace the original text node with our fragment
    if (count > 0) {
      textNode.parentNode.replaceChild(fragment, textNode);
      this.replacementCount += count;
    }

    return count;
  },

  /**
   * Process an element and all its text nodes
   * @param {Node} root - Root element to process
   * @returns {number} Number of replacements made
   */
  processElement(root = document.body) {
    if (!this.settings?.enabled) {
      return 0;
    }

    const textNodes = TextWalker.findMatchingNodes(this.PATTERN, root);
    let totalReplacements = 0;

    for (const node of textNodes) {
      totalReplacements += this.replaceInTextNode(node);
    }

    return totalReplacements;
  },

  /**
   * Revert all replacements (for when extension is disabled)
   */
  revertAll() {
    const replaced = document.querySelectorAll('.oc-replaced');

    for (const span of replaced) {
      const original = span.getAttribute('data-original');
      if (original) {
        const textNode = document.createTextNode(original);
        span.parentNode.replaceChild(textNode, span);
      }
    }

    this.replacementCount = 0;
  },

  /**
   * Get current replacement count
   * @returns {number}
   */
  getCount() {
    return this.replacementCount;
  },

  /**
   * Update count from existing replacements on page
   * (useful after page reload)
   */
  updateCountFromDOM() {
    this.replacementCount = document.querySelectorAll('.oc-replaced').length;
    return this.replacementCount;
  },

  /**
   * Reset the replacer state (used before reprocessing with new language/settings)
   */
  reset() {
    this.settings = null;
    this.enabledReplacements = [];
    this.replacementCount = 0;
  }
};

// Make available globally
if (typeof window !== 'undefined') {
  window.Replacer = Replacer;
}
