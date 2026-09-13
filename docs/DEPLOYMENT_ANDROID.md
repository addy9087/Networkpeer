# NetworkPeer Android Deployment Guide

## 1. Prerequisites
- JDK 17 (`JAVA_HOME=/opt/homebrew/opt/openjdk@17`)
- Android SDK API 35 Build Tools
- Gradle 8.11.1 wrapper

## 2. Build Commands
- Clean build:
  ```bash
  JAVA_HOME=/opt/homebrew/opt/openjdk@17 ./gradlew clean
  ```
- Compile Kotlin Development Debug:
  ```bash
  JAVA_HOME=/opt/homebrew/opt/openjdk@17 ./gradlew compileDevelopmentDebugKotlin
  ```
- Assemble APK:
  ```bash
  JAVA_HOME=/opt/homebrew/opt/openjdk@17 ./gradlew assembleDevelopmentDebug
  ```
- Generated Artifact:
  `app/build/outputs/apk/development/debug/app-development-debug.apk`

## 3. Installation via ADB
- List connected devices:
  ```bash
  adb devices
  ```
- Install APK:
  ```bash
  adb install -r app/build/outputs/apk/development/debug/app-development-debug.apk
  ```

## 4. Google Play Store Production Release (.aab)

### A. Generate Production Keystore (One-Time)
```bash
keytool -genkeypair -v -keystore apps/android/networkpeer-release.jks \
  -alias networkpeer -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=NetworkPeer, OU=Mobile, O=NetworkPeer Inc, L=Stockholm, C=SE"
```

### B. Build Production App Bundle
Run the Gradle production release bundle task:
```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@17 ANDROID_HOME=/Users/adityasharma/Library/Android/sdk \
  ./gradlew bundleProductionRelease
```
- **Generated Bundle Artifact**:
  `app/build/outputs/bundle/productionRelease/app-production-release.aab`
- Upload this `.aab` file directly to **Google Play Console** -> **Production** or **Internal Testing** track.

### C. Build Signed Production APK (Direct Sideload / Enterprise)
```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@17 ANDROID_HOME=/Users/adityasharma/Library/Android/sdk \
  ./gradlew assembleProductionRelease
```

---

## 5. Rapido Design Tokens
- Primary Yellow: `#F9C933` / `#FFC72C`
- Background / Dark Text: `#111827`
- Surface Light: `#FFFFFF`
- Card Corner Radius: `16.dp`

