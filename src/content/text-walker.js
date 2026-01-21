/**
 * Text Walker - Safe DOM traversal using TreeWalker API
 * Finds text nodes while skipping script, style, and editable elements
 */

const TextWalker = {
  // Elements to skip during traversal
  SKIP_TAGS: new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED',
    'TEXTAREA', 'INPUT', 'SELECT', 'OPTION',
    'CODE', 'PRE', 'KBD', 'SAMP', 'VAR',
    'SVG', 'MATH', 'CANVAS'
  ]),

  // Class to mark already-processed elements
  PROCESSED_CLASS: 'oc-replaced',

  /**
   * Check if an element should be skipped
   * @param {Node} node - Node to check
   * @returns {boolean}
   */
  shouldSkip(node) {
    // Skip if it's one of our replaced spans
    if (node.classList && node.classList.contains(this.PROCESSED_CLASS)) {
      return true;
    }

    // Skip certain tag types
    if (this.SKIP_TAGS.has(node.tagName)) {
      return true;
    }

    // Skip contenteditable elements
    if (node.isContentEditable) {
      return true;
    }

    // Skip hidden elements
    if (node.style && (node.style.display === 'none' || node.style.visibility === 'hidden')) {
      return true;
    }

    return false;
  },

  /**
   * Create a TreeWalker that finds text nodes
   * @param {Node} root - Root element to start from
   * @returns {TreeWalker}
   */
  createWalker(root = document.body) {
    return document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip empty text nodes
          if (!node.textContent.trim()) {
            return NodeFilter.FILTER_REJECT;
          }

          // Check parent chain for skip conditions
          let parent = node.parentElement;
          while (parent) {
            if (this.shouldSkip(parent)) {
              return NodeFilter.FILTER_REJECT;
            }
            parent = parent.parentElement;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
  },

  /**
   * Get all text nodes containing the target pattern
   * @param {RegExp} pattern - Pattern to match
   * @param {Node} root - Root element
   * @returns {Node[]} Array of matching text nodes
   */
  findMatchingNodes(pattern, root = document.body) {
    const walker = this.createWalker(root);
    const matches = [];
    let node;

    while ((node = walker.nextNode())) {
      if (pattern.test(node.textContent)) {
        matches.push(node);
      }
    }

    return matches;
  },

  /**
   * Create a MutationObserver to watch for new content
   * @param {function} callback - Callback when new nodes are added
   * @returns {MutationObserver}
   */
  createObserver(callback) {
    const observer = new MutationObserver((mutations) => {
      const addedNodes = [];

      for (const mutation of mutations) {
        // Handle added nodes
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Skip our own replaced spans
            if (!node.classList?.contains(this.PROCESSED_CLASS)) {
              addedNodes.push(node);
            }
          } else if (node.nodeType === Node.TEXT_NODE) {
            // Check if parent should be processed
            const parent = node.parentElement;
            if (parent && !this.shouldSkip(parent)) {
              addedNodes.push(parent);
            }
          }
        }

        // Handle text changes in existing nodes
        if (mutation.type === 'characterData') {
          const parent = mutation.target.parentElement;
          if (parent && !this.shouldSkip(parent)) {
            addedNodes.push(parent);
          }
        }
      }

      if (addedNodes.length > 0) {
        // Deduplicate and remove nested nodes
        const uniqueNodes = this.deduplicateNodes(addedNodes);
        callback(uniqueNodes);
      }
    });

    return observer;
  },

  /**
   * Remove duplicate and nested nodes from array
   * @param {Node[]} nodes - Array of nodes
   * @returns {Node[]} Deduplicated array
   */
  deduplicateNodes(nodes) {
    const unique = [];
    const seen = new Set();

    for (const node of nodes) {
      // Skip if we've seen this exact node
      if (seen.has(node)) continue;

      // Skip if any ancestor is already in our list
      let isNested = false;
      for (const existing of unique) {
        if (existing.contains(node)) {
          isNested = true;
          break;
        }
      }

      if (!isNested) {
        // Remove any existing nodes that are children of this one
        for (let i = unique.length - 1; i >= 0; i--) {
          if (node.contains(unique[i])) {
            unique.splice(i, 1);
          }
        }
        unique.push(node);
        seen.add(node);
      }
    }

    return unique;
  },

  /**
   * Start observing document for changes
   * @param {function} callback - Callback when new nodes are added
   * @returns {MutationObserver}
   */
  observe(callback) {
    const observer = this.createObserver(callback);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    return observer;
  }
};

// Make available globally
if (typeof window !== 'undefined') {
  window.TextWalker = TextWalker;
}
