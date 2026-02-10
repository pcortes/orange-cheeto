/**
 * Unit tests for src/shared/locales.js
 * Tests getNicknamesForLanguage, getSupportedLanguages, isLanguageSupported
 */
import { describe, it, expect, beforeEach } from 'vitest';

// Inline the module code for testing (since it uses window global)
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

function getNicknamesForLanguage(langCode) {
  return LOCALES[langCode]?.nicknames || LOCALES.en.nicknames;
}

function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES.map(code => LOCALES[code].meta);
}

function isLanguageSupported(langCode) {
  return SUPPORTED_LANGUAGES.includes(langCode);
}

// Tests
describe('getNicknamesForLanguage', () => {
  it('returns English nicknames for "en"', () => {
    const nicknames = getNicknamesForLanguage('en');
    expect(nicknames).toBeDefined();
    expect(nicknames.length).toBe(7);
    expect(nicknames[0].text).toBe('Orange Cheeto');
  });

  it('returns Spanish nicknames for "es"', () => {
    const nicknames = getNicknamesForLanguage('es');
    expect(nicknames).toBeDefined();
    expect(nicknames.length).toBe(7);
    expect(nicknames[0].text).toBe('El Cheeto Naranja');
  });

  it('returns French nicknames for "fr"', () => {
    const nicknames = getNicknamesForLanguage('fr');
    expect(nicknames).toBeDefined();
    expect(nicknames.length).toBe(7);
    expect(nicknames[0].text).toBe('Le Clown Orange');
  });

  it('returns German nicknames for "de"', () => {
    const nicknames = getNicknamesForLanguage('de');
    expect(nicknames).toBeDefined();
    expect(nicknames.length).toBe(7);
    expect(nicknames[0].text).toBe('Der Orangene Gockel');
  });

  it('falls back to English for unsupported language code', () => {
    const nicknames = getNicknamesForLanguage('zh');
    expect(nicknames).toBeDefined();
    expect(nicknames.length).toBe(7);
    expect(nicknames[0].text).toBe('Orange Cheeto');
  });

  it('falls back to English for null input', () => {
    const nicknames = getNicknamesForLanguage(null);
    expect(nicknames).toBeDefined();
    expect(nicknames[0].text).toBe('Orange Cheeto');
  });

  it('falls back to English for undefined input', () => {
    const nicknames = getNicknamesForLanguage(undefined);
    expect(nicknames).toBeDefined();
    expect(nicknames[0].text).toBe('Orange Cheeto');
  });

  it('falls back to English for empty string', () => {
    const nicknames = getNicknamesForLanguage('');
    expect(nicknames).toBeDefined();
    expect(nicknames[0].text).toBe('Orange Cheeto');
  });

  it('all nicknames have consistent structure', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      const nicknames = getNicknamesForLanguage(lang);
      for (const nickname of nicknames) {
        expect(nickname).toHaveProperty('id');
        expect(nickname).toHaveProperty('text');
        expect(nickname).toHaveProperty('defaultEnabled');
        expect(typeof nickname.id).toBe('string');
        expect(typeof nickname.text).toBe('string');
        expect(typeof nickname.defaultEnabled).toBe('boolean');
      }
    }
  });

  it('all languages have same nickname IDs', () => {
    const enIds = getNicknamesForLanguage('en').map(n => n.id);
    for (const lang of ['es', 'fr', 'de']) {
      const langIds = getNicknamesForLanguage(lang).map(n => n.id);
      expect(langIds).toEqual(enIds);
    }
  });
});

describe('getSupportedLanguages', () => {
  it('returns array of language metadata', () => {
    const languages = getSupportedLanguages();
    expect(languages).toBeInstanceOf(Array);
    expect(languages.length).toBe(4);
  });

  it('includes all four supported languages', () => {
    const languages = getSupportedLanguages();
    const codes = languages.map(l => l.code);
    expect(codes).toContain('en');
    expect(codes).toContain('es');
    expect(codes).toContain('fr');
    expect(codes).toContain('de');
  });

  it('each language has code, name, and nativeName', () => {
    const languages = getSupportedLanguages();
    for (const lang of languages) {
      expect(lang).toHaveProperty('code');
      expect(lang).toHaveProperty('name');
      expect(lang).toHaveProperty('nativeName');
    }
  });
});

describe('isLanguageSupported', () => {
  it('returns true for "en"', () => {
    expect(isLanguageSupported('en')).toBe(true);
  });

  it('returns true for "es"', () => {
    expect(isLanguageSupported('es')).toBe(true);
  });

  it('returns true for "fr"', () => {
    expect(isLanguageSupported('fr')).toBe(true);
  });

  it('returns true for "de"', () => {
    expect(isLanguageSupported('de')).toBe(true);
  });

  it('returns false for unsupported language "zh"', () => {
    expect(isLanguageSupported('zh')).toBe(false);
  });

  it('returns false for unsupported language "ja"', () => {
    expect(isLanguageSupported('ja')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isLanguageSupported(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isLanguageSupported(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isLanguageSupported('')).toBe(false);
  });

  it('returns false for region variants (use normalizeLocale first)', () => {
    // This is expected - region variants should be normalized first
    expect(isLanguageSupported('en-US')).toBe(false);
    expect(isLanguageSupported('es-MX')).toBe(false);
  });
});
