# NutritiScan mobile product audit

**Reviewed:** 5 October 2026
**Scope:** Expo mobile app in `Developer/nutritiscan`, its local data flows, mobile/web preview, and inactive Supabase prototype.

## Product direction

The app should help a person carry a coherent health history into their next appointment. The useful first promise is “keep your history together and prepare questions for your clinician,” not “AI doctor.” Nutrition logging and label lookup remain supporting tools. Any future model must point to the user's source records, separate extracted facts from inference, and let the user correct every fact before it enters the timeline.

## Findings and changes

| Finding in the prototype | Change made | Remaining work |
|---|---|---|
| Fictional lab results, medicine lists and a sample patient could appear as the current user's history. | Removed those fixtures from the default journey. Empty screens say when data is unavailable; the active offline assistant no longer invents personalized medical facts. | Audit inactive prototype routes and backend functions before reactivating them. |
| Photo scan returned the same sample meal without analyzing the photo. | Replaced the active scanner with manual meal entry and real barcode product lookup. | Food-photo recognition needs a real service and explicit review of each proposed ingredient/portion. |
| Profile and meal screens had no reliable persistence. | Added a queued, validated local repository with legacy migration, profile and meal CRUD, recoverable meal removal, and backup import/export. | Local storage is not encrypted and has no multi-device sync. |
| Privacy toggles and actions did not match their promises. | Removed fictional controls, implemented export and confirmed reset, and explained local storage and barcode lookup. | Add operating-system protected storage/encryption design before supporting imported sensitive documents. |
| Medical history and appointment preparation were not connected. | Added an editable local timeline for visits, medicines, conditions, allergies, tests and procedures. A reviewable plain-text appointment summary uses only these entered facts. | No PDF/image import, OCR, model extraction, source-page citations, medication reconciliation or clinician sharing workspace yet. |
| Barcode nutrition totals were not read from the current public API schema. | Added parsing for Open Food Facts' normalized nutrition values and skips estimated/computed values. The UI shows product-source attribution and unknown fields stay blank. | Confirm live camera behavior on a physical iPhone and Android device. |
| The mobile folder had no Git metadata and the README described inactive cloud/AI flows as working. | Updated product/setup documentation and found the matching GitHub mobile repository for a clean source sync. | Commit/push of the current milestone is pending network access from the shell. |

## Current architecture

- Expo Router and React Native screens.
- Versioned `HealthData` local store; v1 journals migrate on read to v2 with an empty medical-history list.
- Pure validation and summary builders in `src/domain` so date, nutrition and wording rules can run without the UI.
- Manual profile, meal and medical-history entries are persisted on device. The appointment summary is deterministic; no model processes health data.
- Barcode product lookup calls Open Food Facts with the barcode only. It does not attach profile or journal details to that request.
- The old Supabase and AI code is not part of the active flow.

## Verification

- 17 unit tests cover migration, concurrent writes, error recovery, validation, barcode nutrition parsing, and appointment-summary content.
- ESLint and TypeScript checks pass.
- Previous SDK 57 exports succeeded for iOS, Android and web. Re-run after this medical-history milestone and verify in Safari.
- Safari previously verified profile/meal persistence, meal edits, barcode lookup, portion scaling and history. Health-history UI flows are new and still need browser smoke testing.

## Next milestones

1. Smoke-test add/edit/remove history and summary sharing in Safari and the Expo native runtime.
2. Add source-document import with private app-owned storage, verified OCR fields, page-level provenance and user correction before save.
3. Decide whether AI runs on-device or through a private backend. Compare models on a fixed document-extraction and summary evaluation set; do not select a model by “free” label alone.
4. Keep the first agent read-only: retrieve user-approved facts, cite the exact record/date/page, ask when evidence is missing, and prepare visit questions. Exclude diagnosis, medication changes, interaction clearance and urgent triage from the first release.
5. Complete privacy/security, accessibility, physical-device camera/share, and India-specific legal/regulatory reviews before production release.
