/**
 * Orange Cheeto - Popup Logic
 * Handles all popup UI interactions and settings management
 * Updated for v2 schema with i18n support
 */

(async function() {
  'use strict';

  // DOM Elements
  const elements = {
    masterToggle: document.getElementById('masterToggle'),
    statsBar: document.getElementById('statsBar'),
    replaceCount: document.getElementById('replaceCount'),
    mainContent: document.getElementById('mainContent'),
    languageSelect: document.getElementById('languageSelect'),
    languageNote: document.getElementById('languageNote'),
    replacementList: document.getElementById('replacementList'),
    customText: document.getElementById('customText'),
    addCustom: document.getElementById('addCustom'),
    animationSelector: document.getElementById('animationSelector')
  };

  // Current settings and state
  let settings = null;
  let currentLanguage = 'en'; // Effective language (resolved from 'auto' if needed)

  /**
   * Initialize the popup
   */
  async function init() {
    // Load settings
    settings = await OrangeCheetoStorage.get();

    // Determine effective language
    await resolveLanguage();

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
   * Resolve the effective language (detect from page if 'auto')
   */
  async function resolveLanguage() {
    if (settings.language === 'auto') {
      // Get detected language from content script
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          const response = await chrome.tabs.sendMessage(tab.id, { type: 'getLanguage' });
          currentLanguage = response?.language || 'en';
        }
      } catch (error) {
        // Default to English if can't get from content script
        currentLanguage = 'en';
      }
    } else {
      currentLanguage = settings.language || 'en';
    }
  }

  /**
   * Render master toggle state
   */
  function renderMasterToggle() {
    elements.masterToggle.checked = settings.enabled;
    elements.mainContent.classList.toggle('main--disabled', !settings.enabled);
  }

  /**
   * Render language selector
   */
  function renderLanguageSelector() {
    elements.languageSelect.value = settings.language || 'auto';

    // Show detected language note if on 'auto'
    if (settings.language === 'auto') {
      const langMeta = OrangeCheetoLocales.LOCALES[currentLanguage]?.meta;
      elements.languageNote.textContent = langMeta
        ? `Detected: ${langMeta.nativeName}`
        : '';
    } else {
      elements.languageNote.textContent = '';
    }
  }

  /**
   * Render the replacement list with v2 schema
   * Shows built-in nicknames for current language + custom nicknames
   */
  function renderReplacementList() {
    elements.replacementList.innerHTML = '';

    // Get nicknames for current language
    const nicknames = OrangeCheetoLocales.getNicknamesForLanguage(currentLanguage);

    // Render built-in nicknames
    for (const nickname of nicknames) {
      const isEnabled = settings.enabledNicknames?.[nickname.id] ?? nickname.defaultEnabled;
      const li = createNicknameItem(nickname.text, isEnabled, nickname.id, false);
      elements.replacementList.appendChild(li);
    }

    // Render custom nicknames
    if (Array.isArray(settings.customNicknames)) {
      settings.customNicknames.forEach((custom, index) => {
        const li = createNicknameItem(custom.text, custom.enabled, index, true);
        elements.replacementList.appendChild(li);
      });
    }
  }

  /**
   * Create a nickname list item element
   */
  function createNicknameItem(text, enabled, id, isCustom) {
    const li = document.createElement('li');
    li.className = `replacement-item${enabled ? '' : ' replacement-item--disabled'}`;
    li.dataset.id = id;
    li.dataset.custom = isCustom ? 'true' : 'false';

    li.innerHTML = `
      <span class="replacement-item__text">${escapeHtml(text)}</span>
      <div class="replacement-item__actions">
        ${isCustom ? `<button class="replacement-item__delete" title="Remove">x</button>` : ''}
        <label class="replacement-item__toggle">
          <input type="checkbox" ${enabled ? 'checked' : ''}>
          <span></span>
        </label>
      </div>
    `;

    return li;
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

    // Language selector
    elements.languageSelect.addEventListener('change', async () => {
      const newLanguage = elements.languageSelect.value;
      settings.language = newLanguage;
      await OrangeCheetoStorage.setLanguage(newLanguage);

      // Re-resolve language and update UI
      await resolveLanguage();
      renderLanguageSelector();
      renderReplacementList();

      // Refresh active tab to apply new language
      refreshActiveTab();
      showToast(`Language: ${elements.languageSelect.options[elements.languageSelect.selectedIndex].text}`);
    });

    // Nickname toggles and delete buttons
    elements.replacementList.addEventListener('click', async (e) => {
      const item = e.target.closest('.replacement-item');
      if (!item) return;

      // Handle delete button
      if (e.target.classList.contains('replacement-item__delete')) {
        const index = parseInt(item.dataset.id, 10);
        const removed = settings.customNicknames[index];

        await OrangeCheetoStorage.removeCustomNickname(index);
        settings = await OrangeCheetoStorage.get();
        renderReplacementList();
        showToast(`Removed "${removed.text}"`);
        refreshActiveTab();
        return;
      }
    });

    elements.replacementList.addEventListener('change', async (e) => {
      if (e.target.type === 'checkbox') {
        const item = e.target.closest('.replacement-item');
        const isCustom = item.dataset.custom === 'true';
        const id = item.dataset.id;
        const isChecked = e.target.checked;

        if (isCustom) {
          // Toggle custom nickname
          const index = parseInt(id, 10);
          await OrangeCheetoStorage.toggleCustomNickname(index);
        } else {
          // Toggle built-in nickname
          await OrangeCheetoStorage.toggleNickname(id);
        }

        // Update visual state
        item.classList.toggle('replacement-item--disabled', !isChecked);

        // Reload settings and refresh
        settings = await OrangeCheetoStorage.get();
        refreshActiveTab();
      }
    });

    // Add custom nickname
    elements.addCustom.addEventListener('click', async () => {
      const text = elements.customText.value.trim();

      if (!text) {
        showToast('Enter a nickname first', 'error');
        return;
      }

      // Check for duplicates in custom nicknames
      const existsCustom = settings.customNicknames?.some(
        c => c.text.toLowerCase() === text.toLowerCase()
      );

      if (existsCustom) {
        showToast('That nickname already exists', 'error');
        return;
      }

      // Add to custom nicknames
      await OrangeCheetoStorage.addCustomNickname(text);
      settings = await OrangeCheetoStorage.get();

      // Clear input and re-render
      elements.customText.value = '';
      renderReplacementList();
      showToast(`Added "${text}"`);
      refreshActiveTab();
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
        await OrangeCheetoStorage.setAnimationType(e.target.value);
        showToast(`Animation: ${e.target.value}`);
      }
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
