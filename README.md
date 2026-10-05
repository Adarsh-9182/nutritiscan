# NutritiScan mobile

NutritiScan is a local-first personal health history and nutrition journal built with React Native and Expo. The current app supports a manual health timeline, an appointment summary assembled from user-entered facts, meal logging, barcode product lookup, and data backup. It does not diagnose, prescribe, or interpret medical reports.

## Run locally

Expo SDK 57 requires Node.js 22.13 or newer. See the [versioned Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/) for platform requirements.

```sh
npm ci
npm run web -- --port 8081 --localhost
```

Open `http://localhost:8081` for the phone-width browser preview. Run `npm start` to open the Expo app on a device or simulator.

## Working features

- Profile with optional age, measurements, allergies, conditions and personal goals.
- Manual health history for visits, medicines, conditions, allergies, tests and procedures. Entries are searchable by date in a simple timeline and can be edited or removed.
- Doctor-visit summary generated from the details the user entered, with a place to add questions. The preview labels the source and asks users to verify the details before sharing.
- Manual meal logging with optional nutrition values, edit/repeat/remove and date-based history.
- Barcode lookup using Open Food Facts. Label values remain distinct from user-entered clinical history.
- JSON export/import for the local profile, health history and meal journal.
- Dark, light and system appearance choices.

## Data and limits

Profile, health history and meals are stored in local app storage on the device. NutritiScan does not encrypt that storage, sync it, or send health history to an AI service. Barcode lookup sends the scanned product code to Open Food Facts. Export only leaves the device if the user chooses a destination in the share sheet or saves the downloaded file.

Medical-history items and appointment summaries use only details entered by the user. They are not verified against a source report. Document upload/OCR, AI summarization, cloud backup, Apple Health, medication interaction checks and clinician tools are not connected in this build. No free model is currently running in the app. The `supabase/` directory is an earlier backend prototype and is not called by the active mobile flow.

Before a hosted AI model can process health details, the product needs explicit consent, a secure service boundary, defined retention/deletion, provenance for every extracted fact, human verification, safety evaluation and jurisdiction-specific legal review. A free model license does not make inference hosting or health-data handling free or safe by itself.

## Checks

```sh
npm test
npm run lint
npx tsc --noEmit
npx expo export --platform all
```

Tests cover local-date meal totals, barcode nutrition parsing, safe local-store migration, medical history validation and appointment-summary wording.
