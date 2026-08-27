# AI Resume Builder Mobile Application Setup

This directory contains the production-ready mobile app package for the **AI Resume Builder** platform using **Capacitor**. It wraps the highly responsive, mobile-optimized HTML5/JS frontend and bridges it directly to native platforms (Android & iOS).

## Key Features Configured
1. **Dynamic Backend Routing**: Automatically switches the frontend `BASE_URL` to point to the secure, production Cloud Run backend when running in a mobile/hybrid wrapper, while continuing to route through local `/api` proxies on web.
2. **Native Asset Syncing**: Fully synchronized with the visual updates, premium light themes, and multi-step builder flows located in `/Fontend`.
3. **No Duplicate Logic**: Interacts securely with the exact same scalable backend, authentication engines, and AI services using the user's real JWT credentials.

---

## Step-by-Step Installation & Compilation

### 1. Prerequisite Checklist
Ensure you have the following installed on your developer machine:
- **Node.js** (v18+)
- **NPM** (v9+)
- **Android Studio** (for building Android `.apk`/`.aab`)
- **Xcode** (for building iOS `.ipa` - macOS only)

### 2. Set Up Dependencies
From this `/mobile` folder, run:
```bash
npm install
```
This installs the latest core Capacitor CLI and platforms (`@capacitor/core`, `@capacitor/android`, `@capacitor/ios`).

### 3. Initialize Capacitor
Initialize the Capacitor app and point it to the frontend directory:
```bash
npx cap init "AI Resume Forge" "dev.resumeforge.app" --web-dir=../Fontend
```

### 4. Add Native Platforms
Add Android and iOS platforms to the project:
```bash
# Add Android App
npx cap add android

# Add iOS App (macOS required)
npx cap add ios
```

### 5. Synchronize Web Assets
Whenever you make visual, layout, or structural updates in the `/Fontend` folder, synchronize the native mobile directories by running:
```bash
npx cap sync
```

### 6. Build & Run on Emulators or Devices

#### Android:
To open the project in Android Studio, compile the native APK, and run it on an emulator or a connected physical phone:
```bash
npx cap open android
```
- In Android Studio, click **Run** (green play button) or select **Build > Build Bundle(s) / APK(s) > Build APK(s)** to generate the production-ready package.

#### iOS:
To open the project in Xcode (macOS only):
```bash
npx cap open ios
```
- Select your target device/simulator and press **Cmd + R** to run.
