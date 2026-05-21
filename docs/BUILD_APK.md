# Build Android APK (install on your phone)

This app uses **native modules** (speech recognition, image picker). An **APK** from EAS is the right way to test on a real device — not Expo Go.

Package name: `com.successprabu.aimobileapp`

---

## What you need

1. **Expo account** (free): https://expo.dev/signup  
2. **Node.js** on your PC (same as development)  
3. **Git** — latest code: `git pull origin main` in `account-ui-mobile`

---

## One-time setup

```bash
cd account-ui-mobile
npm install
npm install -g eas-cli
eas login
```

Use your Expo username/password (or browser login).

Link the project to Expo (first time only):

```bash
eas init
```

Choose **Create a new project** or link to an existing one. This adds `extra.eas.projectId` to `app.json`.

---

## Build the APK (cloud — recommended)

The repo is already configured for an **APK** via the `preview` profile in `eas.json`.

```bash
npm run eas:apk
```

Same command:

```bash
eas build --platform android --profile preview
```

- Build runs on Expo servers (~10–20 minutes).
- When finished, open the link in the terminal or go to https://expo.dev → your project → **Builds**.
- Download the **`.apk`** file.

---

## Install on your Android phone

1. Copy the APK to the phone (USB, Google Drive, or open the EAS download link on the phone).
2. **Settings → Security** (or **Install unknown apps**) → allow your browser/files app to install apps.
3. Tap the APK → **Install**.
4. Open **account-ui-mobile** and log in with your Success API credentials.

---

## API URL

The app calls: `https://successapi.azurewebsites.net/api/`

To change it, set in `.env` before building:

```
EXPO_PUBLIC_API_BASE_URL=https://successapi.azurewebsites.net/api/
```

EAS picks up env vars if you add them in `eas.json` `env` section or Expo dashboard **Secrets** for production builds.

---

## Troubleshooting

| Issue | Fix |
|--------|-----|
| `Not logged in` | Run `eas login` |
| No `projectId` | Run `eas init` |
| Build fails on credentials | Run `eas credentials` or let EAS manage Android keystore (default) |
| Voice not working | Normal in APK if mic permission granted; was disabled in Expo Go only |
| Install blocked | Enable “Install unknown apps” for your file manager |

---

## Production Play Store build (optional)

For Google Play (AAB, not APK):

```bash
npm run eas:aab
```

---

## Local build (advanced)

Only if you have Android Studio + SDK installed:

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

APK path is usually under `android/app/build/outputs/apk/`. EAS cloud build is simpler for most users.
