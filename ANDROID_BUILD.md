# Android APK Build & Release Process

## Overview

This document describes how to build and release the Padhai Buddy Android APK using GitHub Actions.

## Prerequisites

### Required GitHub Secrets

Configure these in **Settings → Secrets and variables → Actions**:

| Secret | Description | Required |
|--------|-------------|----------|
| `CAPACITOR_SERVER_URL` | Production HTTPS URL (e.g., `https://padhaibuddy.onrender.com`) | **Yes** |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase client config | **Yes** |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase client config | **Yes** |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase client config | **Yes** |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase client config | **Yes** |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase client config | **Yes** |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Firebase client config | **Yes** |
| `GROQ_API_KEY` | Groq AI API key | **Yes** |
| `FIREBASE_ADMIN_PROJECT_ID` | Firebase Admin SDK | **Yes** |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Firebase Admin SDK | **Yes** |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Firebase Admin SDK (with `\n` newlines) | **Yes** |
| `NEXT_PUBLIC_SITE_URL` | Production site URL | **Yes** |

### Optional (for Play Store Release)

| Secret | Description |
|--------|-------------|
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded keystore file |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias (e.g., `padhaibuddy`) |
| `ANDROID_KEY_PASSWORD` | Key password |

## Generating a Release Keystore

```bash
# Generate keystore (run once, store securely!)
keytool -genkey -v -keystore padhai-buddy.keystore \
  -alias padhaibuddy \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD \
  -dname "CN=Padhai Buddy, OU=Engineering, O=Padhai Buddy, L=City, ST=State, C=IN"

# Encode to base64 for GitHub secret
base64 -w 0 padhai-buddy.keystore
# Copy output to ANDROID_KEYSTORE_BASE64 secret
```

**Important:** Store the keystore file and passwords securely! Losing them means you cannot update the app on Play Store.

## Build Triggers

The workflow runs automatically on:
- **Push to `main` branch** - builds unsigned APK (artifact only)
- **Git tags matching `v*`** (e.g., `v1.0.0`) - builds signed APK + creates GitHub Release
- **Manual trigger** - with optional version input

## How It Works

1. **Checkout** - Gets full git history for version detection
2. **Setup** - Node.js 20, Java 21 (Temurin), Gradle 8.13
3. **Install** - `npm ci` with production env vars
4. **Build Next.js** - Production build with all API routes
5. **Capacitor Sync** - Syncs web assets to Android project
6. **Signing Config** - Creates `signing.properties` if keystore secrets exist
7. **Build APK** - Runs `./gradlew assembleRelease`
8. **Verify** - Confirms APK exists and measures size
9. **Artifact** - Uploads APK as GitHub Actions artifact (30 days)
10. **Release** - On tags/manual with version: creates GitHub Release with APK attached

## APK Types

| Build Type | Signing | Use Case |
|------------|---------|----------|
| Main branch push | ❌ Unsigned | Testing, internal distribution |
| Tag push (v*) | ✅ Signed (if keystore) | Play Store, public releases |
| Manual with version | ✅ Signed (if keystore) | Play Store, public releases |
| Manual without version | ❌ Unsigned | Testing |

## Version Numbering

- **Tags**: Uses tag name (e.g., `v1.0.0`)
- **Manual with input**: Uses provided version
- **Main branch**: `v0.1.0-<short-commit-hash>`

## Local Development

### Preview Android Build

```bash
# Set required env vars
export CAPACITOR_SERVER_URL=https://your-dev-url.com
export CAPACITOR_BUILD=true

# Build and sync
npm run build
npx cap sync android
npx cap open android  # Opens Android Studio
```

### Build APK Locally

```bash
cd android
./gradlew assembleRelease
# APK at: app/build/outputs/apk/release/app-release.apk
```

## Android Configuration

### App ID & Version

- **App ID**: `com.padhaibuddy.app` (in `capacitor.config.ts` and `android/app/build.gradle`)
- **Version Code**: Increment in `android/app/build.gradle` (`versionCode`)
- **Version Name**: Increment in `android/app/build.gradle` (`versionName`)

### Minimum SDK

- **minSdkVersion**: 24 (Android 7.0)
- **targetSdkVersion**: 36 (Android 14)
- **compileSdkVersion**: 36

### Permissions

- `INTERNET` - Required for API calls
- Camera - For Photo Doubt feature (via Capacitor Camera plugin)

## Troubleshooting

### Build Fails: "CAPACITOR_SERVER_URL must be set"

Ensure `CAPACITOR_SERVER_URL` is configured in GitHub Secrets and is a valid HTTPS URL.

### Build Fails: "Keystore not found"

If you want signed APKs, add all 4 signing secrets to GitHub Secrets. Without them, the build produces an unsigned APK (only for testing).

### APK Too Large

- Check `android/app/build.gradle` for unnecessary dependencies
- Enable `minifyEnabled true` and `shrinkResources true` in release buildType
- Use `bundle` instead of `apk` for Play Store (smaller downloads)

### Gradle Out of Memory

Increase JVM args in workflow:
```yaml
./gradlew assembleRelease -Dorg.gradle.jvmargs="-Xmx4096m"
```

## Distribution

### GitHub Releases (Automatic)

When you push a tag like `v1.0.0`, the workflow creates a GitHub Release with the APK attached. Users can download from:
```
https://github.com/InfinityGenAi/Padhai-Buddy/releases
```

### Direct Download Link

Latest release APK (if available):
```
https://github.com/InfinityGenAi/Padhai-Buddy/releases/latest/download/padhai-buddy-v*.apk
```

### Play Store

1. Build signed AAB instead of APK for Play Store:
   ```bash
   ./gradlew bundleRelease
   ```
2. Upload `app/build/outputs/bundle/release/app-release.aab` to Play Console
3. Use the same keystore for all updates

## Security Notes

- **Never commit keystore files** to the repository
- **Use GitHub Secrets** for all sensitive values
- **Rotate secrets** if compromised
- **Unsigned APKs** cannot be installed on devices without enabling "Unknown Sources" - only for testing

## Architecture

The Android app is a **Capacitor wrapper** that loads the web app from `CAPACITOR_SERVER_URL`. This means:
- ✅ Single codebase (web + mobile)
- ✅ Instant updates (no app store review for web changes)
- ⚠️ Requires internet for full functionality
- ⚠️ Native features limited to Capacitor plugins