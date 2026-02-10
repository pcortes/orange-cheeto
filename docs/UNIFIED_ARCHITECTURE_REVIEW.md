# Unified Architecture + I18N v3 Red-Shirt Review

**Date:** 2026-02-10  
**Specs Reviewed:** `docs/UNIFIED_ARCHITECTURE.md`, `docs/I18N_SPEC.md`  
**Review Type:** Red-shirt (adversarial, implementation-first)  
**Decision:** **NO-GO** until P0 findings are fixed

## Panel ("World-Class Engineering Team")
- Principal Browser Extensions Engineer
- Staff Platform Engineer (storage/migrations)
- Staff Build and Release Engineer
- Staff Safari/Xcode Engineer
- Staff Localization Engineer
- Staff QA Engineer (cross-browser)
- Staff Policy and Trust Engineer

## Executive Summary
The direction is strong and much better than the previous i18n draft, but this is not yet execution-safe. Three P0 blockers remain: migration shape mismatch, invalid migration pseudocode, and Safari resource path assumptions that do not match the current Xcode project wiring.

## Findings (Ordered by Severity)

| ID | Severity | Finding | Why It Breaks | Evidence |
|---|---|---|---|---|
| F1 | P0 | Migration reads the wrong storage shape and wrong animation key | The spec reads `settings` as a nested object and maps `animation`, but production data is top-level with `animationType`; migration would miss fields and silently reset behavior | `docs/I18N_SPEC.md:216`, `docs/I18N_SPEC.md:183`, `extensions/chrome/src/shared/storage.js:10`, `extensions/chrome/src/shared/storage.js:29`, `extensions/chrome/src/background/service-worker.js:9` |
| F2 | P0 | `safeLoadSettings()` is syntactically invalid as written | `await` is used in a non-`async` function, so this code cannot run if copied directly | `docs/I18N_SPEC.md:214`, `docs/I18N_SPEC.md:216` |
| F3 | P0 | Safari sync path in architecture spec does not match project reality | `build.sh safari` writes to `Shared (Extension)/Resources`, but this repo's Xcode project currently wires resources from `Shared (Extension)` file refs; this can make Safari updates a no-op or fail | `docs/UNIFIED_ARCHITECTURE.md:179`, `docs/UNIFIED_ARCHITECTURE.md:299`, `extensions/safari/Orange Cheeto/Orange Cheeto.xcodeproj/project.pbxproj:133`, `extensions/safari/Orange Cheeto/Orange Cheeto.xcodeproj/project.pbxproj:277` |
| F4 | P1 | `all` build target is tightly coupled to Safari availability | `set -e` plus unconditional `build_safari` in `all` means missing Xcode project fails the whole build, even when Chrome/Firefox artifacts are all that is needed | `docs/UNIFIED_ARCHITECTURE.md:109`, `docs/UNIFIED_ARCHITECTURE.md:182`, `docs/UNIFIED_ARCHITECTURE.md:240` |
| F5 | P1 | CLI parsing rejects common invocation `./scripts/build.sh --zip` | First arg is always treated as target, so `--zip` becomes an invalid target instead of "all + zip" | `docs/UNIFIED_ARCHITECTURE.md:217`, `docs/UNIFIED_ARCHITECTURE.md:220`, `docs/UNIFIED_ARCHITECTURE.md:225` |
| F6 | P1 | Reprocess pseudocode targets the wrong DOM marker | Spec says remove `<orange-cheeto>` tags, while current implementation uses `.oc-replaced` spans; literal implementation would not revert/reprocess correctly | `docs/I18N_SPEC.md:307`, `extensions/chrome/src/content/replacer.js:67`, `extensions/chrome/src/content/replacer.js:170` |
| F7 | P1 | Browser scope and QA plan are internally inconsistent | Safari is marked out-of-scope for v1, but effort and implementation steps still include Safari QA/store work | `docs/I18N_SPEC.md:27`, `docs/I18N_SPEC.md:441`, `docs/I18N_SPEC.md:442`, `docs/I18N_SPEC.md:463` |
| F8 | P1 | Locale data has two proposed sources of truth with no generation contract | The spec proposes both `src/locales/*.json` and inline constants in `locales.js`, but does not define which is canonical or how drift is prevented | `docs/I18N_SPEC.md:239`, `docs/I18N_SPEC.md:275`, `docs/I18N_SPEC.md:455`, `docs/UNIFIED_ARCHITECTURE.md:324`, `docs/UNIFIED_ARCHITECTURE.md:353` |
| F9 | P2 | Decision log and estimates disagree | Effort table says 22h total, while decision log still says "updated to 38h total" | `docs/I18N_SPEC.md:443`, `docs/I18N_SPEC.md:481` |
| F10 | P2 | Repo hygiene plan for Safari is incomplete | Proposed `.gitignore` handles `build/` and `.xcarchive`, but not other common Xcode churn (`xcuserdata`, workspace user state), increasing PR noise risk | `docs/UNIFIED_ARCHITECTURE.md:430`, `docs/UNIFIED_ARCHITECTURE.md:432`, `extensions/safari/Orange Cheeto/Orange Cheeto.xcodeproj/xcuserdata` |

## Required Spec Deltas Before GO
1. Fix migration contract to match real storage keys:
   - Read/write top-level storage keys, not `settings`.
   - Preserve/rename `animationType` explicitly.
   - Add concrete before/after payload examples.
2. Correct migration pseudocode so it is executable:
   - Mark `safeLoadSettings` as `async`.
   - Add parse/shape guards for malformed replacement items.
3. Lock Safari source-of-truth path:
   - Document the exact Xcode file reference model used in this repo.
   - Update `build.sh safari` path rules to match project wiring.
   - Add a verification step that fails if copied files are not referenced.
4. Decouple Chrome/Firefox packaging from Safari:
   - Make `all` either skip Safari by default or add `--with-safari`.
   - Keep Safari build as an explicit opt-in target in non-macOS CI.
5. Resolve locale source-of-truth:
   - Either inline only, or JSON-as-source with deterministic generation into `locales.js`.
   - Add a CI check that prevents locale drift.
6. Reconcile scope, estimates, and acceptance gates:
   - If Safari is out-of-scope, remove Safari QA/store tasks from v1 estimate and implementation order.
   - Align decision log with the final estimate.

## Go/No-Go Gate
Proceed only when:
1. F1-F3 are fully resolved in spec text.
2. A dry-run implementation checklist proves Chrome+Firefox packaging works without Safari installed.
3. Migration examples pass against real v1 payload samples from `chrome.storage.sync`.

## Bottom Line
This is close, but not execution-safe yet. Fix the three P0 blockers and the plan becomes implementation-ready.
