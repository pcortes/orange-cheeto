# I18N Spec Red-Shirt Review

**Date:** 2026-02-10
**Spec Reviewed:** `docs/I18N_SPEC.md`
**Review Type:** Red-shirt (adversarial, implementation-first)
**Decision:** **NO-GO** until blocking issues are resolved

## Panel ("World-Class Eng Team")
- Principal Browser Extensions Engineer
- Staff Frontend Engineer (Popup/UI)
- Staff Platform Engineer (Storage + migration)
- Staff Localization Engineer
- Staff QA Engineer (cross-browser)
- Staff Release Engineer (packaging/store)
- Staff Policy/Safety Engineer

## Executive Summary
The spec has strong product intent, but it is not implementation-complete for this codebase. The current draft underestimates scope, omits critical files, and does not define a safe migration path from the existing `replacements[]` schema. The language detection strategy is too weakly specified for deterministic behavior, and the cross-browser plan is inconsistent (tests include Safari, implementation plan does not).

## Debate Log (Condensed but Complete)

### Round 1: Is the file-level scope accurate?
**Principal Extensions Eng:** "No. The spec lists 5 files, but defaults exist in background workers too. Missing those creates schema drift and silent resets."

**Staff Release Eng:** "Also missing manifest/build touchpoints for locale assets and optional loader."

**Decision:** Scope in `docs/I18N_SPEC.md:156` is incomplete and must be expanded before implementation starts.

### Round 2: Can we safely migrate existing users?
**Staff Platform Eng:** "Current production schema is `replacements: [{text, enabled, isCustom?}]` in both browser trees (`extensions/chrome/src/shared/storage.js:8`, `extensions/firefox/src/shared/storage.js:8`)."

**Staff QA Eng:** "Spec claims migration testing (`docs/I18N_SPEC.md:181`) but never defines mapping rules from old text values to stable IDs, nor conflict handling for custom nicknames."

**Decision:** Migration is currently undefined. This is a blocker.

### Round 3: Is language detection robust enough?
**Staff Localization Eng:** "Detection tiers are reasonable, but return values are not normalized to supported languages. We need strict BCP-47 normalization + supported-language mapping."

**Principal Extensions Eng:** "`og:locale` and `Content-Language` can contain region/multi-language values. Current pseudo-code (`docs/I18N_SPEC.md:26`) does not parse these safely."

**Decision:** Keep tiered detection, but add normalization/parsing rules and deterministic fallback behavior.

### Round 4: Does runtime behavior match the test plan?
**Staff Frontend Eng:** "Spec asks for SPA navigation testing (`docs/I18N_SPEC.md:183`), but design only detects language on init. No route/lang-change mechanism is specified."

**Staff QA Eng:** "Current runtime change handling already has gaps (`extensions/chrome/src/content/index.js:100`); language switch behavior would be inconsistent without explicit refresh/reprocess semantics."

**Decision:** Add explicit runtime update model (when and how language recalculates/reprocesses).

### Round 5: Is the cross-browser claim real?
**Staff QA Eng:** "Repo has duplicated Chrome + Firefox source trees, not a shared build (`extensions/chrome/src/...`, `extensions/firefox/src/...`)."

**Staff Release Eng:** "Spec estimate of `~270` lines total across both browsers (`docs/I18N_SPEC.md:173`) is optimistic."

**Principal Extensions Eng:** "Safari is listed in tests (`docs/I18N_SPEC.md:182`) but no Safari implementation plan is provided."

**Decision:** Re-estimate and split implementation by browser path. Define Safari explicitly as in-scope or out-of-scope.

### Round 6: Any policy/store risk?
**Staff Policy/Safety Eng:** "Localized insult strings increase moderation sensitivity in store reviews. Need policy review for each locale set and regional slang."

**Staff Localization Eng:** "Several entries are region-specific/slang-heavy (`docs/I18N_SPEC.md:121`, `docs/I18N_SPEC.md:143`) and need native-speaker vetting."

**Decision:** Add a localization QA + policy gate before submission.

## Findings (Ordered by Severity)

| ID | Severity | Finding | Why It Breaks | Evidence |
|---|---|---|---|---|
| F1 | P0 | File scope omits critical schema owners | Defaults/migration are duplicated in background workers; updating only storage layer causes drift | `docs/I18N_SPEC.md:156`, `extensions/chrome/src/background/service-worker.js:7`, `extensions/firefox/src/background/service-worker.js:7` |
| F2 | P0 | Migration is not actually specified | Existing user toggles/customs can be lost or remapped incorrectly | `docs/I18N_SPEC.md:86`, `docs/I18N_SPEC.md:181`, `extensions/chrome/src/shared/storage.js:8`, `extensions/chrome/src/popup/popup.js:57` |
| F3 | P0 | Locale file placement/build packaging is ambiguous | Locale files may not ship in release artifact depending on placement | `docs/I18N_SPEC.md:65`, `docs/I18N_SPEC.md:167`, `scripts/package.sh:40`, `scripts/package.sh:43` |
| F4 | P1 | Detection algorithm lacks normalization/parsing contract | Region tags and multi-value headers can resolve to unsupported keys | `docs/I18N_SPEC.md:14`, `docs/I18N_SPEC.md:26`, `docs/I18N_SPEC.md:102` |
| F5 | P1 | 95% coverage claim is unvalidated | Spec includes a reliability claim with no measurement methodology | `docs/I18N_SPEC.md:57` |
| F6 | P1 | Runtime language updates are undefined | SPA/language changes will not reliably apply without re-detect + reprocess strategy | `docs/I18N_SPEC.md:183`, `extensions/chrome/src/content/index.js:20`, `extensions/chrome/src/content/index.js:100` |
| F7 | P1 | Cross-browser effort is underestimated | Two separate code trees double implementation and QA effort | `docs/I18N_SPEC.md:173`, `extensions/chrome/src/shared/storage.js:1`, `extensions/firefox/src/shared/storage.js:1` |
| F8 | P1 | Safari is in test scope but not in implementation scope | Inconsistent delivery target; review/launch risk | `docs/I18N_SPEC.md:182`, `docs/I18N_SPEC.md:156` |
| F9 | P2 | Manifest and loader changes are not listed | Optional `locale-loader.js` still requires script/asset wiring decisions | `docs/I18N_SPEC.md:171`, `extensions/chrome/manifest.json:34`, `extensions/firefox/manifest.json:43` |
| F10 | P2 | Locale quality/policy process missing | Region-specific slang may trigger quality or moderation issues | `docs/I18N_SPEC.md:121`, `docs/I18N_SPEC.md:143` |

## Required Spec Deltas Before GO

1. Expand file touch list to include:
   - Chrome + Firefox: `src/shared/storage.js`, `src/content/index.js`, `src/content/replacer.js`, `src/popup/index.html`, `src/popup/popup.js`, `src/background/service-worker.js`, `manifest.json`
   - Packaging: `scripts/package.sh` (if locale files are outside `src`)
   - Safari: explicitly in scope or out of scope
2. Add explicit migration algorithm:
   - Introduce `schemaVersion`
   - Map legacy built-in text values to stable IDs
   - Preserve `isCustom` records into `customNicknames`
   - Define conflict rules for duplicate/custom collisions
   - Define rollback behavior on parse failure
3. Define language normalization contract:
   - Normalize to lowercase BCP-47
   - Convert region variants (`es-MX` -> `es`) when supported
   - Parse comma-separated `Content-Language`
   - Unsupported locales fall back deterministically
4. Define runtime refresh model:
   - When language is recalculated (init, route change, explicit refresh, settings change)
   - Whether existing replacements are re-rendered or only new nodes are affected
5. Define locale asset loading strategy:
   - Inline constants vs JSON fetch
   - If JSON: exact path per browser tree + packaging guarantees
6. Add localization quality gate:
   - Native-speaker review for `es/fr/de`
   - Policy review for store-facing content risk
7. Update estimates and milestones:
   - Implementation, QA, store updates separated by browser

## Revised Effort Estimate

- Engineering (Chrome + Firefox): **24-36 hours**
- QA matrix (desktop browsers + SPA scenarios): **8-12 hours**
- Localization/policy review: **4-8 hours**
- Store collateral updates: **4-6 hours**
- Total calendar: **4-6 working days** (single engineer, normal review loop)

## Proposed Go/No-Go Gate

Proceed only after:
1. Spec includes all P0/P1 deltas above
2. Migration plan is written with example input/output payloads
3. Browser scope is explicit (`Chrome+Firefox` only, or include Safari with concrete tasks)

## Bottom Line
Current draft is directionally good but not build-ready. Treat this as a solid concept document, not an implementation spec. Converting it to executable engineering guidance requires closing the P0 blockers first.
