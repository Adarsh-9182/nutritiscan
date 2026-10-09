NutritiScan's Android beta now matches nutritiscan.com's midnight, lime and mint design, with the same plus logo and a conversation-first home.

Download **NutritiScan.apk** below. It is a standalone release build, signed with NutritiScan's persistent private release key; Expo Go is not required. SHA256SUMS is included. Supports Android 7+ on arm64-v8a phones and x86_64 devices.

Included:
- Consent before sending public health-chat messages; conversations saved on the device.
- Local nutrition journal, health history and doctor-visit summaries.
- Shared account/report interface with secure credential storage, review before confirming lab values and consent controls.
- Voice recording and editable transcription flow when the shared service and transcription provider are enabled.

The shared FastAPI service must be deployed and connected to the website to activate private cloud reports and shared account features. The app shows its connection status. Public chat also depends on the matching web update being deployed. An unavailable AI service is disclosed rather than presented as a personal assessment.

Educational prototype for adults 18+. Not a diagnosis, prescription or emergency service. The engineering safety rules have not completed clinical validation. Local journal and conversation storage are not encrypted by NutritiScan. No real patient data is included in this release.
