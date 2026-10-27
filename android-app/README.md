# Elettro Android

Import this folder into Android Studio: `File -> New -> Import Project...` and select the `android-app` folder.

Configuration
- Update `app/src/main/res/values/strings.xml` `api_base_url` to point to your deployed backend (Vercel URL), or set `ApiClient.BASE_URL` in `ApiClient.java`.

Build

1. Open in Android Studio.
2. Let Gradle sync and download dependencies.
3. Run on emulator or device.

Notes
- Staff sign-in routes Sales and Warehouse users to their department dashboard. Sales can submit material requests; Warehouse can review requests, record stock receipts or adjustments, and verify releases.
- Admin inventory is view-only in the Android app. Stock changes are restricted to Warehouse and are recorded through the warehouse API.
- The Android Admin screens use the shared backend for live bookings, orders, inventory, workers, and stock movement data.
- The Android app is source-buildable without installing it on a device; receipt printing is available from the web-based department portals.
