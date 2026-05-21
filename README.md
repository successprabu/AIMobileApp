# Account UI Mobile (AIMobileApp)

Expo/React Native companion for **Account_UI** — same APIs, mobile UI only.

## Run in development

```bash
npm install
npx expo start
```

Scan QR with **Expo Go** for quick tests. Some features (voice, full OCR) work best in a **development build or APK**.

## Install APK on your phone

See **[docs/BUILD_APK.md](docs/BUILD_APK.md)** for full steps.

Quick version:

```bash
npm install -g eas-cli
eas login
cd account-ui-mobile && npm install
eas init          # first time only
npm run eas:apk   # builds APK on Expo cloud
```

Download the `.apk` from https://expo.dev and install on Android.

## API smoke tests

```bash
TEST_USER=your_mobile TEST_PASS=your_password node scripts/test-new-receipt.mjs
```

Similar scripts exist for user master, receipt list, expenses, and others.

## Repo

https://github.com/successprabu/AIMobileApp
