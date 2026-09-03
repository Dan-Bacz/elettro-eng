# Elettro Android

Import this folder into Android Studio: `File -> New -> Import Project...` and select the `android-app` folder.

Configuration
- Update `app/src/main/res/values/strings.xml` `api_base_url` to point to your deployed backend (Vercel URL), or set `ApiClient.BASE_URL` in `ApiClient.java`.

Build

1. Open in Android Studio.
2. Let Gradle sync and download dependencies.
3. Run on emulator or device.

Notes
- This is a minimal Java scaffold mapping the web app sections to Activities. Implement forms and API integrations as needed.
