# Land Capture Configuration & Build Guide

This document outlines the workflows and configurations used to build and package the **Land Capture** mobile game.

---

## 1. GitHub Actions Build Workflows

We have configured three workflows in `.github/workflows/` that allow you to build the application on GitHub's cloud runners without local setup overhead.

### Workflow A: Build Android APK (Debug Build)
* **File:** `.github/workflows/build-apk.yml`
* **Purpose:** Generates a **Debug APK** (`app-debug.apk`) for immediate development testing.
* **How to run from Web UI:**
  1. Go to your repository on GitHub.
  2. Click on the **Actions** tab.
  3. Select **Build Android APK** from the left list.
  4. Click **Run workflow**, choose your branch (e.g., `dev`), and click **Run workflow**.
  5. Once completed, download the `app-debug-apk` artifact.

### Workflow B: Build Android Preview (Preview Build)
* **File:** `.github/workflows/build-preview.yml`
* **Purpose:** Generates a **Release-optimized Preview APK** (`app-preview-apk`) to test production behavior and share with friends/testers.
* **How to run from Web UI:**
  1. Go to your repository on GitHub.
  2. Click on the **Actions** tab.
  3. Select **Build Android Preview** from the left list.
  4. Click **Run workflow**, choose your branch (e.g., `dev`), and click **Run workflow**.
  5. Once completed, download the `app-preview-apk` artifact.

### Workflow C: Build Android Production (Production Build)
* **File:** `.github/workflows/build-production.yml`
* **Purpose:** Generates a **Release APK** (for friends) and a **Release AAB** (Android App Bundle, required to publish on the Google Play Store).
* **How to run from Web UI:**
  1. Go to your repository on GitHub.
  2. Click on the **Actions** tab.
  3. Select **Build Android Production** from the left list.
  4. Click **Run workflow**, choose your branch (e.g., `dev`), and click **Run workflow**.
  5. Once completed, download the `app-release-apk` and `app-release-aab` artifacts.

### Triggering Workflows via GitHub CLI (`gh`)
If you have the GitHub CLI installed, you can trigger these builds directly from your local terminal. Run the commands below, substituting `--ref dev` with your desired target branch:

* **Run Debug Build:**
  ```bash
  gh workflow run build-apk.yml --ref dev
  ```
* **Run Preview Build:**
  ```bash
  gh workflow run build-preview.yml --ref dev
  ```
* **Run Production Build:**
  ```bash
  gh workflow run build-production.yml --ref dev
  ```

To download the build artifacts directly to your machine once the run has finished:
```bash
gh run download
```

*Note: All workflows are optimized with a `Free Disk Space` step to free ~25GB on the runner and complete within GitHub's runtime limits.*

---

## 2. `app.json` Property Guide

The `app.json` file is the entry point for Expo configuration. It defines properties used during `npx expo prebuild` to generate the native Android platform code.

| Property | Value / Structure | Description | Why We Need It |
| :--- | :--- | :--- | :--- |
| **`name`** | `"Land Capture"` | The user-facing name of the application. | Appears below the app icon on the device home screen. |
| **`slug`** | `"land-capture"` | The URL-friendly name used by the Expo CLI and Expo Go. | Used as the identifier when publishing to Expo Dev Services. |
| **`version`** | `"1.0.0"` | The version code of the app release (e.g., `major.minor.patch`). | Required by app stores to manage updates and user version tracking. |
| **`orientation`** | `"portrait"` | Locks the application rotation orientation to portrait only. | Prevents the layout from breaking/rotating when the device orientation changes. |
| **`icon`** | `"./assets/images/icon.png"` | Path to the main application logo image. | Used as the app icon on standard launch pads and settings screens. |
| **`scheme`** | `"landcapture"` | Custom deep-linking scheme (e.g., `landcapture://`). | Allows other apps or browsers to open Land Capture directly. |
| **`userInterfaceStyle`**| `"automatic"` | Supports both Dark and Light themes depending on system setting. | Enables responsive dark/light mode detection. |
| **`ios`** | `{ "icon": ... }` | iOS-specific platform settings. | Configures icons and bundles specifically for Apple device builds. |
| **`android`** | `{ ... }` | Android-specific configurations. | Root object for all configurations targeting Android OS. |
| **`android.package`** | `"com.sidharthg.landcapture"`| The unique bundle/package identifier for the Android app. | **Critical:** Used by the OS and Play Store as the app's unique identity. Also required for non-interactive native prebuilds. |
| **`android.adaptiveIcon`**| `{ ... }` | Properties defining the Android adaptive launcher icon. | Ensures the app icon looks modern and scales nicely on all Android launchers. |
| **`android.adaptiveIcon.backgroundColor`**| `"#030712"` | Background color under the icon layer. | Matches our game's dark theme color and fills the icon's outer margins. |
| **`android.adaptiveIcon.foregroundImage`**| `"..."` | Foreground logo layer path. | Shows the 3x3 glowing neon grid board directly as the icon graphic. |
| **`web`** | `{ "output": "static", ... }`| Web browser targeting options. | Configures favicon and assets if building a web version of the game. |
| **`plugins`** | `["expo-router", ...]` | Native plugins hook configuration. | Extends Expo with advanced capabilities like file-based routing and custom splash screens. |
| **`experiments`** | `{ "reactCompiler": true, ... }`| Experimental build options. | Optimizes compile performance (e.g., enables React Compiler and Typed Routes). |

---

## 3. `eas.json` Property Guide

`eas.json` configures the **EAS Build** (Expo Application Services) system. Even when building locally or via custom scripts on GitHub Actions, it is standard practice to maintain this to outline the build profiles.

| Profile Name | Property | Value | Description | Why We Need It |
| :--- | :--- | :--- | :--- | :--- |
| **`cli`** | `version` | `">= 9.0.0"` | Restricts EAS CLI tool versions. | Guarantees syntax compatibility and prevents CLI failures during builds. |
| **`build.development`**| `developmentClient` | `true` | Builds a development simulator client. | Bundles the React Native DevTools & Metro bundler so you can live-debug. |
| | `distribution` | `"internal"` | Restricts distribution to testers. | Prevents development builds from accidentally being uploaded to store tracks. |
| | `android.buildType` | `"apk"` | Generates a development `.apk` file. | Targets Android exclusively for development client builds. |
| **`build.preview`** | `distribution` | `"internal"` | Installs directly to devices. | Allows sharing early releases to friends/testers via local install. |
| | `android.buildType` | `"apk"` | Generates a standard `.apk` file. | Targets Android exclusively for preview testing. |
| **`build.production`**| `android.buildType` | `"app-bundle"`| Generates a `.aab` file. | **Google Play Store Requirement:** App Bundles optimize the download size on user devices. |
