/**
 * Locale Data for Orange Cheeto Extension
 * THIS IS THE SOURCE OF TRUTH for nickname translations.
 * The JSON files in src/locales/ are optional documentation for translators.
 */

const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de'];

const LOCALES = {
  en: {
    meta: { code: "en", name: "English", nativeName: "English" },
    nicknames: [
      { id: "orange-cheeto", text: "Orange Cheeto", defaultEnabled: true },
      { id: "mango-mussolini", text: "Mango Mussolini", defaultEnabled: true },
      { id: "cheeto-benito", text: "Cheeto Benito", defaultEnabled: true },
      { id: "tangerine-tyrant", text: "The Tangerine Tyrant", defaultEnabled: true },
      { id: "agent-orange", text: "Agent Orange", defaultEnabled: true },
      { id: "dorito-mussolini", text: "Dorito Mussolini", defaultEnabled: false },
      { id: "cheeto-jesus", text: "Cheeto Jesus", defaultEnabled: false }
    ]
  },
  es: {
    meta: { code: "es", name: "Spanish", nativeName: "Espanol" },
    nicknames: [
      { id: "orange-cheeto", text: "El Cheeto Naranja", defaultEnabled: true },
      { id: "mango-mussolini", text: "Don Peluca", defaultEnabled: true },
      { id: "cheeto-benito", text: "El Emperador Bronceado", defaultEnabled: true },
      { id: "tangerine-tyrant", text: "Trumpudo", defaultEnabled: true },
      { id: "agent-orange", text: "El Tuitero Loco", defaultEnabled: true },
      { id: "dorito-mussolini", text: "Mandarina en Jefe", defaultEnabled: false },
      { id: "cheeto-jesus", text: "El Guero Griton", defaultEnabled: false }
    ]
  },
  fr: {
    meta: { code: "fr", name: "French", nativeName: "Francais" },
    nicknames: [
      { id: "orange-cheeto", text: "Le Clown Orange", defaultEnabled: true },
      { id: "mango-mussolini", text: "Monsieur Toupet", defaultEnabled: true },
      { id: "cheeto-benito", text: "Le Roi Solarium", defaultEnabled: true },
      { id: "tangerine-tyrant", text: "La Carotte Presidentielle", defaultEnabled: true },
      { id: "agent-orange", text: "Tonton Tango", defaultEnabled: true },
      { id: "dorito-mussolini", text: "Le Grand Blond", defaultEnabled: false },
      { id: "cheeto-jesus", text: "Sa Majeste des Tweets", defaultEnabled: false }
    ]
  },
  de: {
    meta: { code: "de", name: "German", nativeName: "Deutsch" },
    nicknames: [
      { id: "orange-cheeto", text: "Der Orangene Gockel", defaultEnabled: true },
      { id: "mango-mussolini", text: "Toupetchen", defaultEnabled: true },
      { id: "cheeto-benito", text: "Der Mauerbauer", defaultEnabled: true },
      { id: "tangerine-tyrant", text: "Cheetolinchen", defaultEnabled: true },
      { id: "agent-orange", text: "Der Goldene Polterer", defaultEnabled: true },
      { id: "dorito-mussolini", text: "Schwurbel-Donald", defaultEnabled: false },
      { id: "cheeto-jesus", text: "Das Lachsorangen-Gespenst", defaultEnabled: false }
    ]
  }
};

/**
 * Get nicknames for a specific language
 * @param {string} langCode - Language code (en, es, fr, de)
 * @returns {Array} Array of nickname objects with id, text, defaultEnabled
 */
function getNicknamesForLanguage(langCode) {
  return LOCALES[langCode]?.nicknames || LOCALES.en.nicknames;
}

/**
 * Get all supported languages with metadata
 * @returns {Array} Array of { code, name, nativeName }
 */
function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES.map(code => LOCALES[code].meta);
}

/**
 * Check if a language code is supported
 * @param {string} langCode - Language code to check
 * @returns {boolean}
 */
function isLanguageSupported(langCode) {
  return SUPPORTED_LANGUAGES.includes(langCode);
}

// Make available globally for content scripts and popup
if (typeof window !== 'undefined') {
  window.OrangeCheetoLocales = {
    SUPPORTED_LANGUAGES,
    LOCALES,
    getNicknamesForLanguage,
    getSupportedLanguages,
    isLanguageSupported
  };
}
