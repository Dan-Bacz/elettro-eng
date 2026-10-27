package com.elettro.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.GravityCompat;
import androidx.drawerlayout.widget.DrawerLayout;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.elettro.app.network.ApiClient;
import com.google.android.material.navigation.NavigationView;

import org.json.JSONArray;
import org.json.JSONObject;

public class RiderDashboardActivity extends AppCompatActivity {

    // Shell & drawer
    private DrawerLayout drawerLayout;
    private NavigationView navView;
    private ImageButton btnMenu, btnBell;
    private TextView bellBadge;
    private TextView headerUserName, headerUserRole, headerUserInitial;
    private TextView sectionTitle, sectionSubtitle;
    private GreetingUpdater greetingUpdater;
    private SwipeRefreshLayout swipeRefresh;

    // Sections
    private View viewHome, viewDeliveries, viewNotifications, viewProfile;

    // Home
    private TextView riderName, statTodayDeliveries, statPendingDeliveries, statCompletedDeliveries;
    private View cardStatToday, cardStatPending, cardStatCompleted;
    private LinearLayout recentDeliveriesContainer, homeNotificationsContainer;

    // Deliveries
    private LinearLayout deliveriesListContainer;

    // Notifications
    private LinearLayout notificationsListContainer;

    // Profile
    private TextView profileName, profileEmail, profilePhone, profileInitial;
    private TextView btnLogout;

    // Data
    private JSONObject riderData;
    private JSONArray ordersArray;
    private JSONArray notificationsArray;
    private String riderId = "";
    private String riderNameStr = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_rider_dashboard);

        String token = getSharedPreferences("elettro_login", MODE_PRIVATE).getString(MainActivity.KEY_TOKEN, "");
        ApiClient.setAuthToken(token);

        bindViews();
        setupDrawer();
        setupRefresh();
        setupActions();

        loadData();
    }

    @Override
    protected void onResume() {
        super.onResume();
        greetingUpdater.start();
    }

    @Override
    protected void onPause() {
        greetingUpdater.stop();
        super.onPause();
    }

    private void bindViews() {
        drawerLayout = findViewById(R.id.drawer_layout);
        navView = findViewById(R.id.nav_view);
        btnMenu = findViewById(R.id.btn_menu);
        btnBell = findViewById(R.id.btn_bell);
        bellBadge = findViewById(R.id.bell_badge);
        headerUserName = findViewById(R.id.header_user_name);
        headerUserRole = findViewById(R.id.header_user_role);
        headerUserInitial = findViewById(R.id.header_user_initial);
        sectionTitle = findViewById(R.id.section_title);
        sectionSubtitle = findViewById(R.id.section_subtitle);
        greetingUpdater = new GreetingUpdater(this, findViewById(R.id.rider_greeting));
        swipeRefresh = findViewById(R.id.swipe_refresh);

        viewHome = findViewById(R.id.view_home_section);
        viewDeliveries = findViewById(R.id.view_deliveries_section);
        viewNotifications = findViewById(R.id.view_notifications_section);
        viewProfile = findViewById(R.id.view_profile_section);

        riderName = findViewById(R.id.rider_name);
        statTodayDeliveries = findViewById(R.id.stat_today_deliveries);
        statPendingDeliveries = findViewById(R.id.stat_pending_deliveries);
        statCompletedDeliveries = findViewById(R.id.stat_completed_deliveries);
        cardStatToday = findViewById(R.id.card_stat_today);
        cardStatPending = findViewById(R.id.card_stat_pending);
        cardStatCompleted = findViewById(R.id.card_stat_completed);
        recentDeliveriesContainer = findViewById(R.id.rider_recent_deliveries_container);
        homeNotificationsContainer = findViewById(R.id.home_notifications_container);

        deliveriesListContainer = findViewById(R.id.deliveries_list_container);

        notificationsListContainer = findViewById(R.id.notifications_list_container);

        profileName = findViewById(R.id.profile_name);
        profileEmail = findViewById(R.id.profile_email);
        profilePhone = findViewById(R.id.profile_phone);
        profileInitial = findViewById(R.id.profile_initial);
        btnLogout = findViewById(R.id.btn_logout);

        headerUserRole.setText("Rider");
        headerUserInitial.setText("R");

        View header = navView.getHeaderView(0);
        if (header != null) {
            TextView role = header.findViewById(R.id.drawer_header_role);
            if (role != null) role.setText("Rider");
        }
    }

    private void setupDrawer() {
        btnMenu.setOnClickListener(v -> drawerLayout.openDrawer(GravityCompat.START));
        btnBell.setOnClickListener(v -> showSection("notifications"));

        navView.setNavigationItemSelectedListener(item -> {
            int id = item.getItemId();
            drawerLayout.closeDrawer(GravityCompat.START);
            if (id == R.id.nav_home) { showSection("home"); return true; }
            if (id == R.id.nav_deliveries) { showSection("deliveries"); return true; }
            if (id == R.id.nav_notifications) { showSection("notifications"); return true; }
            if (id == R.id.nav_profile) { showSection("profile"); return true; }
            if (id == R.id.nav_logout) { logout(); return true; }
            return false;
        });
    }

    private void showSection(String key) {
        viewHome.setVisibility("home".equals(key) ? View.VISIBLE : View.GONE);
        viewDeliveries.setVisibility("deliveries".equals(key) ? View.VISIBLE : View.GONE);
        viewNotifications.setVisibility("notifications".equals(key) ? View.VISIBLE : View.GONE);
        viewProfile.setVisibility("profile".equals(key) ? View.VISIBLE : View.GONE);

        int titleRes = R.string.drawer_dashboard;
        int subRes = "Keep up the great work!";
        int menuRes = R.id.nav_home;

        switch (key) {
            case "deliveries":
                titleRes = "My Deliveries";
                subRes = "Manage your assigned deliveries";
                menuRes = R.id.nav_deliveries;
                break;
            case "notifications":
                titleRes = "Notifications";
                subRes = "Stay updated";
                menuRes = R.id.nav_notifications;
                loadNotifications();
                break;
            case "profile":
                titleRes = "My Profile";
                subRes = "View your account details";
                menuRes = R.id.nav_profile;
                break;
        }

        sectionTitle.setText(titleRes);
        sectionSubtitle.setText(subRes);
        navView.setCheckedItem(menuRes);
    }

    private void logout() {
        getSharedPreferences("elettro_login", MODE_PRIVATE).edit().remove(MainActivity.KEY_TOKEN).apply();
        ApiClient.setAuthToken("");
        Toast.makeText(this, "Signed out", Toast.LENGTH_SHORT).show();
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(intent);
        finish();
    }

    private void setupRefresh() {
        swipeRefresh.setOnRefreshListener(() -> {
            loadData();
            swipeRefresh.setRefreshing(false);
        });
    }

    private void setupActions() {
        btnLogout.setOnClickListener(v -> logout());

        cardStatToday.setOnClickListener(v -> showSection("deliveries"));
        cardStatPending.setOnClickListener(v -> showSection("deliveries"));
        cardStatCompleted.setOnClickListener(v -> showSection("deliveries"));
    }

    private void loadData() {
        new Thread(() -> {
            try {
                String resp = ApiClient.get("/rider");
                if (resp == null) {
                    runOnUiThread(() -> Toast.makeText(this, "Network error", Toast.LENGTH_SHORT).show());
                    return;
                }
                JSONObject obj = new JSONObject(resp);
                riderData = obj.optJSONObject("rider");
                ordersArray = obj.optJSONArray("orders");

                if (riderData != null) {
                    riderId = riderData.optString("id", "");
                    riderNameStr = riderData.optString("name", "");
                }

                runOnUiThread(() -> {
                    renderHome();
                    renderDeliveries();
                    renderProfile();
                    refreshDrawerHeader();
                });
                loadHomeNotifications();
            } catch (Exception e) {
                e.printStackTrace();
                runOnUiThread(() -> Toast.makeText(this, "Network error", Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    private void refreshDrawerHeader() {
        String display = riderNameStr.isEmpty() ? "Rider" : riderNameStr;
        String initial = riderNameStr.isEmpty() ? "R" : String.valueOf(riderNameStr.charAt(0));

        headerUserName.setText(display);
        headerUserInitial.setText(initial);
        if (profileInitial != null) profileInitial.setText(initial);

        View header = navView.getHeaderView(0);
        TextView name = header != null ? header.findViewById(R.id.drawer_header_name) : null;
        TextView role = header != null ? header.findViewById(R.id.drawer_header_role) : null;
        TextView drawerInitial = header != null ? header.findViewById(R.id.drawer_header_initial) : null;
        if (name != null) name.setText(display);
        if (role != null) role.setText("Rider");
        if (drawerInitial != null) drawerInitial.setText(initial);
    }

    private void renderHome() {
        if (riderData != null) {
            riderName.setText(riderNameStr);
        }

        int todayCount = 0;
        int pendingCount = 0;
        int completedCount = 0;

        if (ordersArray != null) {
            for (int i = 0; i < ordersArray.length(); i++) {
                JSONObject order = ordersArray.optJSONObject(i);
                if (order == null) continue;
                String status = order.optString("status", "");
                if ("SHIPPED".equals(status) || "DELIVERED".equals(status)) {
                    todayCount++;
                }
                if ("SHIPPED".equals(status)) {
                    pendingCount++;
                }
                if ("DELIVERED".equals(status) || "COMPLETED".equals(status)) {
                    completedCount++;
                }
            }
        }

        statTodayDeliveries.setText(String.valueOf(todayCount));
        statPendingDeliveries.setText(String.valueOf(pendingCount));
        statCompletedDeliveries.setText(String.valueOf(completedCount));

        // Render recent deliveries
        recentDeliveriesContainer.removeAllViews();
        if (ordersArray != null && ordersArray.length() > 0) {
            int limit = Math.min(3, ordersArray.length());
            for (int i = 0; i < limit; i++) {
                JSONObject order = ordersArray.optJSONObject(i);
                if (order == null) continue;
                recentDeliveriesContainer.addView(createDeliveryCard(order));
            }
        } else {
            TextView empty = new TextView(this);
            empty.setText("No deliveries yet");
            empty.setGravity(Gravity.CENTER);
            empty.setPadding(16, 32, 16, 32);
            empty.setTextColor(0xFF9A9A9A);
            recentDeliveriesContainer.addView(empty);
        }
    }

    private void renderDeliveries() {
        deliveriesListContainer.removeAllViews();
        if (ordersArray == null || ordersArray.length() == 0) {
            TextView empty = new TextView(this);
            empty.setText("No deliveries assigned");
            empty.setGravity(Gravity.CENTER);
            empty.setPadding(16, 32, 16, 32);
            empty.setTextColor(0xFF9A9A9A);
            deliveriesListContainer.addView(empty);
            return;
        }

        for (int i = 0; i < ordersArray.length(); i++) {
            JSONObject order = ordersArray.optJSONObject(i);
            if (order == null) continue;
            deliveriesListContainer.addView(createDeliveryCard(order));
        }
    }

    private View createDeliveryCard(JSONObject order) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(16, 16, 16, 16);
        card.setBackgroundResource(R.drawable.bg_card);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, 0, 0, 8);
        card.setLayoutParams(lp);

        TextView ref = new TextView(this);
        ref.setText(order.optString("reference", "ORD-XXXX"));
        ref.setTextColor(0xFF101416);
        ref.setTypeface(null, android.graphics.Typeface.BOLD);
        card.addView(ref);

        TextView client = new TextView(this);
        client.setText(order.optString("clientName", "Client"));
        client.setTextColor(0xFF9A9A9A);
        client.setPadding(0, 4, 0, 0);
        card.addView(client);

        TextView status = new TextView(this);
        String statusText = order.optString("status", "PENDING");
        status.setText("Status: " + statusText.replace("_", " "));
        status.setTextColor(0xFFF5C400);
        status.setPadding(0, 4, 0, 0);
        card.addView(status);

        TextView address = new TextView(this);
        address.setText(order.optString("address", "No address"));
        address.setTextColor(0xFF68747A);
        address.setPadding(0, 4, 0, 0);
        card.addView(address);

        return card;
    }

    private void renderProfile() {
        if (riderData != null) {
            profileName.setText(riderData.optString("name", ""));
            profileEmail.setText(riderData.optString("email", ""));
            profilePhone.setText(riderData.optString("phone", ""));
            String initial = riderNameStr.isEmpty() ? "R" : String.valueOf(riderNameStr.charAt(0));
            profileInitial.setText(initial);
        }
    }

    private void loadHomeNotifications() {
        // Load notifications for home section
        homeNotificationsContainer.removeAllViews();
        // TODO: Implement notifications
    }

    private void loadNotifications() {
        new Thread(() -> {
            try {
                String resp = ApiClient.get("/notifications");
                if (resp != null) {
                    notificationsArray = new JSONArray(resp);
                }
                runOnUiThread(this::renderNotifications);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();
    }

    private void renderNotifications() {
        notificationsListContainer.removeAllViews();
        if (notificationsArray == null || notificationsArray.length() == 0) {
            TextView empty = new TextView(this);
            empty.setText("No notifications");
            empty.setGravity(Gravity.CENTER);
            empty.setPadding(16, 32, 16, 32);
            empty.setTextColor(0xFF9A9A9A);
            notificationsListContainer.addView(empty);
            return;
        }

        for (int i = 0; i < notificationsArray.length(); i++) {
            JSONObject notif = notificationsArray.optJSONObject(i);
            if (notif == null) continue;

            LinearLayout item = new LinearLayout(this);
            item.setOrientation(LinearLayout.VERTICAL);
            item.setPadding(16, 16, 16, 16);
            item.setBackgroundResource(R.drawable.bg_card);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, 0, 8);
            item.setLayoutParams(lp);

            TextView title = new TextView(this);
            title.setText(notif.optString("title", "Notification"));
            title.setTextColor(0xFF101416);
            title.setTypeface(null, android.graphics.Typeface.BOLD);
            item.addView(title);

            TextView message = new TextView(this);
            message.setText(notif.optString("message", ""));
            message.setTextColor(0xFF68747A);
            message.setPadding(0, 4, 0, 0);
            item.addView(message);

            notificationsListContainer.addView(item);
        }
    }
}
