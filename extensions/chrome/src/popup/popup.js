/**
 * Orange Cheeto - Popup Logic
 * Handles all popup UI interactions and settings management
 */

(async function() {
  'use strict';

  // DOM Elements
  const elements = {
    masterToggle: document.getElementById('masterToggle'),
    statsBar: document.getElementById('statsBar'),
    replaceCount: document.getElementById('replaceCount'),
    mainContent: document.getElementById('mainContent'),
    replacementList: document.getElementById('replacementList'),
    customText: document.getElementById('customText'),
    addCustom: document.getElementById('addCustom'),
    animationSelector: document.getElementById('animationSelector'),
    languageSelect: document.getElementById('languageSelect'),
    languageDetected: document.getElementById('languageDetected')
  };

  // Detected language from page
  let detectedLanguage = 'en';

  // Current settings
  let settings = null;

  /**
   * Initialize the popup
   */
  async function init() {
    // Load settings
    settings = await OrangeCheetoStorage.get();

    // Detect page language
    await detectPageLanguage();

    // Render UI
    renderMasterToggle();
    renderLanguageSelector();
    renderReplacementList();
    renderAnimationSelector();

    // Load replacement count from active tab
    await loadReplacementCount();

    // Attach event listeners
    attachEventListeners();
  }

  /**
   * Render master toggle state
   */
  function renderMasterToggle() {
    elements.masterToggle.checked = settings.enabled;
    elements.mainContent.classList.toggle('main--disabled', !settings.enabled);
  }

  /**
   * Render the replacement list
   */
  function renderReplacementList() {
    elements.replacementList.innerHTML = '';

    settings.replacements.forEach((replacement, index) => {
      const li = document.createElement('li');
      li.className = `replacement-item${replacement.enabled ? '' : ' replacement-item--disabled'}`;

      // Check if this is a custom (user-added) item
      const isCustom = replacement.isCustom === true;

      li.innerHTML = `
        <span class="replacement-item__text">${escapeHtml(replacement.text)}</span>
        <div class="replacement-item__actions">
          ${isCustom ? `<button class="replacement-item__delete" data-index="${index}" title="Remove">×</button>` : ''}
          <label class="replacement-item__toggle">
            <input type="checkbox" data-index="${index}" ${replacement.enabled ? 'checked' : ''}>
            <span></span>
          </label>
        </div>
      `;

      elements.replacementList.appendChild(li);
    });
  }

  /**
   * Render animation selector
   */
  function renderAnimationSelector() {
    const radios = elements.animationSelector.querySelectorAll('input[name="animation"]');

    for (const radio of radios) {
      radio.checked = radio.value === settings.animationType;
    }
  }

  /**
   * Detect the language of the current page
   */
  async function detectPageLanguage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tab?.id) {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'getPageLanguage' });
        if (response?.language) {
          detectedLanguage = response.language;
        }
      }
    } catch (error) {
      // Content script might not be loaded, default to 'en'
      detectedLanguage = 'en';
    }
  }

  /**
   * Render language selector
   */
  function renderLanguageSelector() {
    // Set the select value
    elements.languageSelect.value = settings.language || 'auto';

    // Show detected language if in auto mode
    updateDetectedLanguageDisplay();
  }

  /**
   * Update the detected language display
   */
  function updateDetectedLanguageDisplay() {
    if (settings.language === 'auto') {
      const langName = getLanguageName(detectedLanguage);
      elements.languageDetected.textContent = `Detected: ${langName}`;
      elements.languageDetected.style.display = 'block';
    } else {
      elements.languageDetected.style.display = 'none';
    }
  }

  /**
   * Get human-readable language name
   * @param {string} code - Language code
   * @returns {string} Language name
   */
  function getLanguageName(code) {
    const names = {
      en: 'English',
      es: 'Español',
      fr: 'Français',
      de: 'Deutsch'
    };
    return names[code] || 'English';
  }

  /**
   * Get the effective language (resolved auto-detect)
   * @returns {string} Language code
   */
  function getEffectiveLanguage() {
    if (settings.language === 'auto') {
      return detectedLanguage;
    }
    return settings.language;
  }

  /**
   * Load replacement count from active tab
   */
  async function loadReplacementCount() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tab?.id) {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'getCount' });
        elements.replaceCount.textContent = response?.count || 0;
      }
    } catch (error) {
      // Content script might not be loaded
      elements.replaceCount.textContent = '-';
    }
  }

  /**
   * Attach all event listeners
   */
  function attachEventListeners() {
    // Master toggle
    elements.masterToggle.addEventListener('change', async () => {
      settings.enabled = elements.masterToggle.checked;
      await OrangeCheetoStorage.set({ enabled: settings.enabled });

      elements.mainContent.classList.toggle('main--disabled', !settings.enabled);
      showToast(settings.enabled ? 'Extension enabled' : 'Extension disabled');

      // Refresh active tab
      refreshActiveTab();
    });

    // Replacement toggles and delete buttons
    elements.replacementList.addEventListener('click', async (e) => {
      // Handle delete button
      if (e.target.classList.contains('replacement-item__delete')) {
        const index = parseInt(e.target.dataset.index, 10);
        const removed = settings.replacements[index];
        settings.replacements.splice(index, 1);

        await OrangeCheetoStorage.set({ replacements: settings.replacements });
        renderReplacementList();
        showToast(`Removed "${removed.text}"`);
        return;
      }
    });

    elements.replacementList.addEventListener('change', async (e) => {
      if (e.target.type === 'checkbox') {
        const index = parseInt(e.target.dataset.index, 10);
        settings.replacements[index].enabled = e.target.checked;

        await OrangeCheetoStorage.set({ replacements: settings.replacements });

        // Update visual state
        const item = e.target.closest('.replacement-item');
        item.classList.toggle('replacement-item--disabled', !e.target.checked);
      }
    });

    // Add custom nickname
    elements.addCustom.addEventListener('click', async () => {
      const text = elements.customText.value.trim();

      if (!text) {
        showToast('Enter a nickname first', 'error');
        return;
      }

      // Check for duplicates
      const exists = settings.replacements.some(
        r => r.text.toLowerCase() === text.toLowerCase()
      );

      if (exists) {
        showToast('That nickname already exists', 'error');
        return;
      }

      // Add to list
      settings.replacements.push({
        text: text,
        enabled: true,
        isCustom: true
      });

      await OrangeCheetoStorage.set({ replacements: settings.replacements });

      // Clear input and re-render
      elements.customText.value = '';
      renderReplacementList();
      showToast(`Added "${text}"`);
    });

    // Custom text enter key
    elements.customText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        elements.addCustom.click();
      }
    });

    // Animation selector
    elements.animationSelector.addEventListener('change', async (e) => {
      if (e.target.name === 'animation') {
        settings.animationType = e.target.value;
        await OrangeCheetoStorage.set({ animationType: settings.animationType });
        showToast(`Animation: ${e.target.value}`);
      }
    });

    // Language selector
    elements.languageSelect.addEventListener('change', async (e) => {
      settings.language = e.target.value;
      await OrangeCheetoStorage.set({ language: settings.language });
      updateDetectedLanguageDisplay();
      showToast(`Language: ${e.target.value === 'auto' ? 'Auto-detect' : getLanguageName(e.target.value)}`);

      // Refresh active tab to apply new language
      refreshActiveTab();
    });
  }

  /**
   * Refresh the active tab content script
   */
  async function refreshActiveTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, { type: 'refresh' });
        // Reload count after refresh
        setTimeout(loadReplacementCount, 500);
      }
    } catch (error) {
      // Content script might not be loaded
    }
  }

  /**
   * Show a toast notification
   * @param {string} message - Message to show
   * @param {string} type - 'success' | 'error' | '' (default)
   */
  function showToast(message, type = '') {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) {
      existing.remove();
    }

    // Create new toast
    const toast = document.createElement('div');
    toast.className = `toast${type ? ` toast--${type}` : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Show toast
    requestAnimationFrame(() => {
      toast.classList.add('toast--visible');
    });

    // Hide after delay
    setTimeout(() => {
      toast.classList.remove('toast--visible');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
