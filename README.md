# NutritiScan · Android

NutritiScan is a conversation-first educational health companion for people and families of all ages, built with Expo SDK 57 and React Native. Younger users should involve a parent or guardian when sharing personal health information. The midnight/lime/mint design and plus mark match [nutritiscan.com](https://nutritiscan.com).

[Download the Android APK](https://github.com/Adarsh-9182/nutritiscan/releases) from GitHub Releases. The signed standalone APK includes its JavaScript bundle; Expo Go is not needed.

## Product surfaces

- **Ask**: public health-chat transport to the website, consent before sending messages, and conversations saved on this device. No local profile or meal journal is silently attached to messages. AI unavailability is disclosed. Emergency phrase checks can run without a provider; they are not a validated triage service.
- **Reports & shared health**: secure account credential storage, private report upload, explicit storage/cloud consent and review before confirming extracted lab values. Requires the separately deployed FastAPI service in `nutritiscan-ai` to be connected to the web deployment. The app shows the connection status.
- **Voice**: explicit microphone permission, a bounded voice recording, provider transcription when enabled, then user-edited text before sending. Requires shared-account cloud consent. Keyboard dictation remains available without that service.
- **Journal / You**: the existing local meal journal, barcode lookup, profile and health history, doctor-visit summary, export/import and deletion remain available. Local journal entries are separate from the shared account and are not automatically synchronized.

Shared backend source and deployment instructions: [nutritiscan-ai/backend](https://github.com/Adarsh-9182/nutritiscan-ai/tree/main/backend).

## Develop

```sh
npm ci
npm start
npm run lint
npm run typecheck
npm test
```

The default public endpoint is `https://nutritiscan.com`; `EXPO_PUBLIC_WEB_ORIGIN` can override it for development. Never put model keys, backend credentials or signing materials in public Expo environment variables.

## Android release

The `Android APK` workflow generates native code, checks the app, builds a release bundle, signs the standalone APK with encrypted GitHub Actions secrets and verifies the signature. A `v*` tag publishes a GitHub prerelease with APK and SHA-256 checksums. Workflow dispatch builds an artifact without publishing. The persistent release key is backed up locally under ignored `.credentials/`; preserve it for compatible future updates. Generated `android/` and `ios/` directories remain ignored.

Supported APK architectures are arm64-v8a and x86_64; Android 7+ is required. This beta does not claim Play Store approval or completed clinical validation.

## Data boundaries

Local profile, history, meals and conversations use AsyncStorage and are not encrypted by NutritiScan. Device deletion removes local history/conversations; shared account deletion is separate. Native shared-account access tokens use Expo SecureStore. Public chat sends chosen messages after consent. Shared records require separate storage consent; optional cloud AI processing requires another choice. Do not include real patient information until the service, provider terms, clinical evaluation and privacy controls have been reviewed.

Educational information and record keeping only. No diagnosis, prescribing, medication changes or emergency assessment. In an emergency, contact urgent medical care; in India dial 112.
