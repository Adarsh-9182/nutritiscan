# Google Play testing bundle

`NutritiScan.aab` is a signed Android App Bundle for Play Console. The separate `Play-Upload-Certificate.pem` is public; register it as the upload certificate when Play Console asks. Keep the private upload key and password out of source control. SHA-256 hashes are in `SHA256SUMS`.

This beta is an educational health journal and public-question prototype for all ages. Younger users should involve a parent or guardian before sharing personal health information. The shared report service, account-backed health records, report parsing, and consent-based voice transcription remain unavailable until their backend and provider are configured. Local profile, meals, history and conversations are stored on-device without NutritiScan encryption. The public chat uses the configured website service only after explicit consent; do not submit real health information while clinical review and the shared service are incomplete.

Google Play requires the Health Apps declaration, an active public privacy-policy URL, an accurate Data safety form, and disclosure and consent for health-sensitive permissions. Select Nutrition and Weight Management and Health Information as applicable to the final shipped features. Describe the product as educational; it does not diagnose, prescribe, recommend treatment or replace a clinician. Complete the console forms against the actual tested build.

First upload the bundle to an internal or closed test track. If the Play developer account is a personal account created after 13 November 2023, Google requires at least 12 testers to remain opted into a closed test for 14 continuous days before applying for production access.

## Listing draft

**App name:** NutritiScan

**Short description:** A personal health journal for meals, notes and questions to discuss with your doctor.

**Full description:**

NutritiScan gives people and families a calm place to keep health notes, meals and questions for a doctor visit.

In this early-access build you can:

- Save a profile, meal entries and health history on your device.
- Keep and revisit local conversations.
- Prepare a factual visit summary from information you entered.
- Review the privacy and consent controls before using available chat features.

The private cloud account, report uploads, lab report interpretation and voice transcription are not available in this build. NutritiScan does not provide a diagnosis, prescription, treatment recommendation or emergency service. Its content is educational and has not completed clinical validation. Consult a qualified clinician about health decisions. If you may need urgent care, contact local emergency services.

Your on-device journal is stored in app storage and is not encrypted by NutritiScan. Do not store information you would not want someone with access to your unlocked device to see. Chat messages are sent to the website service only after you choose to allow AI chat; that service may forward them to a configured AI provider. Review the privacy policy before sending a message.

For all ages. Younger users should ask a parent or guardian to review privacy and consent before sharing personal health information. The current release does not include verified parental consent for a child’s shared health records.

**Play Console release note:** Declaring children in the target audience triggers Google Play Families requirements. Review the current Families policy, child-directed API/SDK restrictions, health-app declaration and Data safety disclosures before submitting an all-ages listing. The current release has not completed that review.

**Category:** Health & Fitness

**Contact email:** adarshbhardwaj9182@gmail.com

**Privacy policy:** https://nutritiscan.com/privacy (publish and verify the updated policy before submitting)
