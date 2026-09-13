package com.elettro.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.Space;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.bumptech.glide.Glide;
import com.elettro.app.network.ApiClient;
import com.google.android.material.bottomnavigation.BottomNavigationView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

public class AdminDashboardActivity extends AppCompatActivity {

    // Header & Nav
    private BottomNavigationView bottomNav;
    private TextView sectionTitle;
    private TextView sectionSubtitle;
    private ImageButton btnRefresh;
    private SwipeRefreshLayout swipeRefresh;

    // Stat views
    private TextView statTotalBookings, statPending, statInventory, statLowStock, statTechnicians, statClients;

    // Section containers
    private View viewDashboard, viewBookings, viewProjects, viewNotifications, viewMore;
    // More sub-sections
    private View subRegistrations, subInventory, subTechnicians, subClients, subReports, subSettings;
    // More grid cards
    private LinearLayout moreRegistrations, moreInventory, moreTechnicians, moreClients, moreReports, moreSettings;
    // List containers
    private LinearLayout recentBookingsContainer, bookingsListContainer, projectsListContainer;
    private LinearLayout registrationsListContainer, inventoryListContainer, techniciansListContainer;
    private LinearLayout clientsListContainer, reportsListContainer, notificationsListContainer;
    // Settings fields
    private EditText settingsOrgName, settingsSupportEmail;
    // Notifications
    private Button btnMarkAllRead;
    private TextView regBadge;

    // Action buttons
    private Button btnAddInventoryItem, btnAddTechnician;
    private TextView btnGotoBookings;
    private Button btnSaveSettings;

    // Filter chips
    private Button filterAll, filterPending, filterApproved, filterAssigned, filterCompleted;
    private String currentBookingFilter = "ALL";

    // Back buttons for MORE sub-sections
    private Button btnBackRegistrations, btnBackInventory, btnBackTechnicians, btnBackClients, btnBackReports, btnBackSettings;

    // Camera
    private static final int REQ_CAMERA = 1001;
    private static final int REQ_CAMERA_PERMISSION = 1002;
    private Uri capturedImageUri;
    private String capturedImageBase64;
    private ImageView inventoryPhotoPreview;
    private TextView inventoryPhotoStatus;

    // Cached data
    private JSONObject dashboardData;
    private JSONArray bookingsArray;
    private JSONArray inventoryArray;
    private JSONArray techniciansArray;
    private JSONArray clientsArray;
    private JSONArray reportsArray;
    private JSONArray pendingUsersArray;
    private JSONArray notificationsArray;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_admin_dashboard);

        String token = getSharedPreferences("elettro_login", MODE_PRIVATE).getString(MainActivity.KEY_TOKEN, "");
        ApiClient.setAuthToken(token);

        bindViews();
        setupBottomNav();
        setupSwipeRefresh();
        setupActionButtons();
        setupMoreNavigation();

        showSection("home");
        loadDashboardData();
    }

    @Override
    protected void onResume() {
        super.onResume();
        String currentTitle = sectionTitle.getText().toString();
        if (getString(R.string.notifications_title).equals(currentTitle) || "Alerts & Notifications".equals(currentTitle)) {
            loadNotifications();
        }
    }

    private void bindViews() {
        bottomNav = findViewById(R.id.bottom_nav);
        sectionTitle = findViewById(R.id.section_title);
        sectionSubtitle = findViewById(R.id.section_subtitle);
        btnRefresh = findViewById(R.id.btn_refresh);
        swipeRefresh = findViewById(R.id.swipe_refresh);

        statTotalBookings = findViewById(R.id.stat_total_bookings);
        statPending = findViewById(R.id.stat_pending);
        statInventory = findViewById(R.id.stat_inventory);
        statLowStock = findViewById(R.id.stat_low_stock);
        statTechnicians = findViewById(R.id.stat_technicians);
        statClients = findViewById(R.id.stat_clients);

        viewDashboard = findViewById(R.id.view_dashboard_section);
        viewBookings = findViewById(R.id.view_bookings_section);
        viewProjects = findViewById(R.id.view_projects_section);
        viewNotifications = findViewById(R.id.view_notifications_section);
        viewMore = findViewById(R.id.view_more_section);

        subRegistrations = findViewById(R.id.sub_registrations);
        subInventory = findViewById(R.id.sub_inventory);
        subTechnicians = findViewById(R.id.sub_technicians);
        subClients = findViewById(R.id.sub_clients);
        subReports = findViewById(R.id.sub_reports);
        subSettings = findViewById(R.id.sub_settings);

        moreRegistrations = findViewById(R.id.more_registrations);
        moreInventory = findViewById(R.id.more_inventory);
        moreTechnicians = findViewById(R.id.more_technicians);
        moreClients = findViewById(R.id.more_clients);
        moreReports = findViewById(R.id.more_reports);
        moreSettings = findViewById(R.id.more_settings);
        regBadge = findViewById(R.id.more_reg_badge);

        recentBookingsContainer = findViewById(R.id.recent_bookings_container);
        bookingsListContainer = findViewById(R.id.bookings_list_container);
        projectsListContainer = findViewById(R.id.projects_list_container);
        registrationsListContainer = findViewById(R.id.registrations_list_container);
        inventoryListContainer = findViewById(R.id.inventory_list_container);
        techniciansListContainer = findViewById(R.id.technicians_list_container);
        clientsListContainer = findViewById(R.id.clients_list_container);
        reportsListContainer = findViewById(R.id.reports_list_container);
        notificationsListContainer = findViewById(R.id.notifications_list_container);

        settingsOrgName = findViewById(R.id.settings_org_name);
        settingsSupportEmail = findViewById(R.id.settings_support_email);
        btnSaveSettings = findViewById(R.id.btn_save_settings);
        btnMarkAllRead = findViewById(R.id.btn_mark_all_read);

        btnAddInventoryItem = findViewById(R.id.btn_add_inventory);
        btnAddTechnician = findViewById(R.id.btn_add_technician);
        btnGotoBookings = findViewById(R.id.btn_goto_bookings);

        filterAll = findViewById(R.id.filter_all);
        filterPending = findViewById(R.id.filter_pending);
        filterApproved = findViewById(R.id.filter_approved);
        filterAssigned = findViewById(R.id.filter_assigned);
        filterCompleted = findViewById(R.id.filter_completed);

        btnBackRegistrations = findViewById(R.id.btn_back_registrations);
        btnBackInventory = findViewById(R.id.btn_back_inventory);
        btnBackTechnicians = findViewById(R.id.btn_back_technicians);
        btnBackClients = findViewById(R.id.btn_back_clients);
        btnBackReports = findViewById(R.id.btn_back_reports);
        btnBackSettings = findViewById(R.id.btn_back_settings);
    }

    private void setupSwipeRefresh() {
        swipeRefresh.setOnRefreshListener(() -> {
            loadDashboardData();
            swipeRefresh.setRefreshing(false);
        });
        btnRefresh.setOnClickListener(v -> {
            Toast.makeText(this, R.string.refresh, Toast.LENGTH_SHORT).show();
            loadDashboardData();
        });
    }

    private void setupBottomNav() {
        bottomNav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_home) { showSection("home"); return true; }
            if (id == R.id.nav_bookings) { showSection("bookings"); return true; }
            if (id == R.id.nav_projects) { showSection("projects"); return true; }
            if (id == R.id.nav_notifications) { showSection("notifications"); return true; }
            if (id == R.id.nav_more) { showSection("more"); return true; }
            return false;
        });
    }

    private void showSection(String key) {
        viewDashboard.setVisibility("home".equals(key) ? View.VISIBLE : View.GONE);
        viewBookings.setVisibility("bookings".equals(key) ? View.VISIBLE : View.GONE);
        viewProjects.setVisibility("projects".equals(key) ? View.VISIBLE : View.GONE);
        viewNotifications.setVisibility("notifications".equals(key) ? View.VISIBLE : View.GONE);
        viewMore.setVisibility("more".equals(key) ? View.VISIBLE : View.GONE);

        hideMoreSubs();

        switch (key) {
            case "home":
                sectionTitle.setText(R.string.admin_title_dashboard);
                sectionSubtitle.setText(R.string.admin_subtitle_dashboard);
                break;
            case "bookings":
                sectionTitle.setText(R.string.bookings_title);
                sectionSubtitle.setText(R.string.bookings_subtitle);
                break;
            case "projects":
                sectionTitle.setText(R.string.projects_title);
                sectionSubtitle.setText(R.string.projects_subtitle);
                break;
            case "notifications":
                sectionTitle.setText(R.string.notifications_title);
                sectionSubtitle.setText(R.string.notifications_subtitle);
                loadNotifications();
                break;
            case "more":
                sectionTitle.setText(R.string.more_title);
                sectionSubtitle.setText(R.string.more_subtitle);
                break;
        }
    }

    private void hideMoreSubs() {
        subRegistrations.setVisibility(View.GONE);
        subInventory.setVisibility(View.GONE);
        subTechnicians.setVisibility(View.GONE);
        subClients.setVisibility(View.GONE);
        subReports.setVisibility(View.GONE);
        subSettings.setVisibility(View.GONE);
        moreRegistrations.setVisibility(View.VISIBLE);
        moreInventory.setVisibility(View.VISIBLE);
        moreTechnicians.setVisibility(View.VISIBLE);
        moreClients.setVisibility(View.VISIBLE);
        moreReports.setVisibility(View.VISIBLE);
        moreSettings.setVisibility(View.VISIBLE);
    }

    private void showMoreSub(View sub) {
        moreRegistrations.setVisibility(View.GONE);
        moreInventory.setVisibility(View.GONE);
        moreTechnicians.setVisibility(View.GONE);
        moreClients.setVisibility(View.GONE);
        moreReports.setVisibility(View.GONE);
        moreSettings.setVisibility(View.GONE);
        sub.setVisibility(View.VISIBLE);
    }

    private void setupMoreNavigation() {
        moreRegistrations.setOnClickListener(v -> { loadRegistrations(); showMoreSub(subRegistrations); });
        moreInventory.setOnClickListener(v -> { showMoreSub(subInventory); });
        moreTechnicians.setOnClickListener(v -> { showMoreSub(subTechnicians); });
        moreClients.setOnClickListener(v -> { showMoreSub(subClients); });
        moreReports.setOnClickListener(v -> { loadReports(); showMoreSub(subReports); });
        moreSettings.setOnClickListener(v -> { loadSettings(); showMoreSub(subSettings); });

        btnBackRegistrations.setOnClickListener(v -> showSection("more"));
        btnBackInventory.setOnClickListener(v -> showSection("more"));
        btnBackTechnicians.setOnClickListener(v -> showSection("more"));
        btnBackClients.setOnClickListener(v -> showSection("more"));
        btnBackReports.setOnClickListener(v -> showSection("more"));
        btnBackSettings.setOnClickListener(v -> showSection("more"));
    }

    private void setupActionButtons() {
        btnGotoBookings.setOnClickListener(v -> { bottomNav.setSelectedItemId(R.id.nav_bookings); });
        btnAddInventoryItem.setOnClickListener(v -> showAddInventoryDialog());
        btnAddTechnician.setOnClickListener(v -> showAddTechnicianDialog());
        btnSaveSettings.setOnClickListener(v -> saveSettings());
        btnMarkAllRead.setOnClickListener(v -> markAllNotificationsRead());

        filterAll.setOnClickListener(v -> { currentBookingFilter = "ALL"; updateFilterChips(); renderBookingsList(); });
        filterPending.setOnClickListener(v -> { currentBookingFilter = "PENDING"; updateFilterChips(); renderBookingsList(); });
        filterApproved.setOnClickListener(v -> { currentBookingFilter = "APPROVED"; updateFilterChips(); renderBookingsList(); });
        filterAssigned.setOnClickListener(v -> { currentBookingFilter = "ASSIGNED"; updateFilterChips(); renderBookingsList(); });
        filterCompleted.setOnClickListener(v -> { currentBookingFilter = "COMPLETED"; updateFilterChips(); renderBookingsList(); });
    }

    private void updateFilterChips() {
        int selectedColor = Color.parseColor("#0B0F10");
        int defaultText = Color.parseColor("#68747A");

        Button[] chips = {filterAll, filterPending, filterApproved, filterAssigned, filterCompleted};
        String[] keys = {"ALL", "PENDING", "APPROVED", "ASSIGNED", "COMPLETED"};

        for (int i = 0; i < chips.length; i++) {
            if (keys[i].equals(currentBookingFilter)) {
                chips[i].setBackgroundResource(R.drawable.bg_chip_selected);
                chips[i].setTextColor(selectedColor);
                chips[i].setTypeface(null, Typeface.BOLD);
            } else {
                chips[i].setBackgroundResource(R.drawable.bg_chip_unselected);
                chips[i].setTextColor(defaultText);
                chips[i].setTypeface(null, Typeface.NORMAL);
            }
        }
    }

    // === DATA LOADING ===

    private void loadDashboardData() {
        new Thread(() -> {
            try {
                String dashboardResp = ApiClient.get("/dashboard");
                if (dashboardResp != null) {
                    dashboardData = new JSONObject(dashboardResp);
                    bookingsArray = dashboardData.optJSONArray("bookings");
                    inventoryArray = dashboardData.optJSONArray("inventory");
                    techniciansArray = dashboardData.optJSONArray("technicians");
                    clientsArray = dashboardData.optJSONArray("clients");
                    pendingUsersArray = dashboardData.optJSONArray("pendingUsers");
                }

                String reportsResp = ApiClient.get("/reports");
                if (reportsResp != null) {
                    JSONObject repObj = new JSONObject(reportsResp);
                    reportsArray = repObj.optJSONArray("reports");
                }

                runOnUiThread(this::renderAllSections);
            } catch (Exception e) {
                e.printStackTrace();
                runOnUiThread(() -> Toast.makeText(this, R.string.network_error, Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    private void renderAllSections() {
        if (dashboardData == null) {
            sectionSubtitle.setText(R.string.network_error);
            return;
        }

        JSONObject stats = dashboardData.optJSONObject("stats");
        if (stats != null) {
            statTotalBookings.setText(String.valueOf(stats.optInt("totalBookings")));
            statPending.setText(String.valueOf(stats.optInt("pending")));
            statInventory.setText(String.valueOf(stats.optInt("totalInventory")));
            statLowStock.setText(String.valueOf(stats.optInt("lowStock")));
            statTechnicians.setText(String.valueOf(stats.optInt("technicians")));
            statClients.setText(String.valueOf(stats.optInt("clients")));
        }

        renderRecentBookings();
        renderBookingsList();
        renderProjectsList();
        renderRegistrationsList();
        renderInventoryList();
        renderTechniciansList();
        renderClientsList();

        if (pendingUsersArray != null && pendingUsersArray.length() > 0) {
            regBadge.setText(pendingUsersArray.length() + " pending");
            regBadge.setVisibility(View.VISIBLE);
        } else {
            regBadge.setVisibility(View.GONE);
        }
    }

    // === NOTIFICATIONS ===

    private void loadNotifications() {
        notificationsListContainer.removeAllViews();
        showLoadingSpinner(notificationsListContainer);

        new Thread(() -> {
            try {
                String resp = ApiClient.get("/notifications");
                if (resp != null) {
                    JSONObject obj = new JSONObject(resp);
                    notificationsArray = obj.optJSONArray("notifications");
                }
                runOnUiThread(this::renderNotifications);
            } catch (Exception e) {
                e.printStackTrace();
                runOnUiThread(() -> {
                    notificationsListContainer.removeAllViews();
                    showEmpty(notificationsListContainer, R.string.network_error);
                });
            }
        }).start();
    }

    private void renderNotifications() {
        notificationsListContainer.removeAllViews();
        if (notificationsArray == null || notificationsArray.length() == 0) {
            showEmpty(notificationsListContainer, R.string.no_notifications);
            return;
        }

        for (int i = 0; i < notificationsArray.length(); i++) {
            JSONObject n = notificationsArray.optJSONObject(i);
            if (n == null) continue;

            boolean read = n.optBoolean("read", false);
            String title = n.optString("title", "Notification");
            String message = n.optString("message", "");
            String type = n.optString("type", "INFO");
            String time = n.optString("createdAt", "");

            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(14, 14, 14, 14);
            card.setBackgroundResource(R.drawable.bg_card);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, 0, 8);
            card.setLayoutParams(lp);
            if (!read) card.setBackgroundColor(Color.parseColor("#FFFBEB"));

            // Title + type badge row
            LinearLayout titleRow = new LinearLayout(this);
            titleRow.setOrientation(LinearLayout.HORIZONTAL);
            titleRow.setGravity(Gravity.CENTER_VERTICAL);

            TextView tvType = new TextView(this);
            tvType.setText(type.replace("_", " "));
            tvType.setTextColor(getTypeColor(type));
            tvType.setTextSize(9);
            tvType.setTypeface(null, Typeface.BOLD);
            tvType.setPadding(6, 3, 6, 3);
            tvType.setBackgroundResource(R.drawable.bg_pill);
            tvType.getBackground().setTint(getTypeColor(type));
            tvType.setTextColor(Color.WHITE);
            titleRow.addView(tvType);

            TextView tvTitle = new TextView(this);
            tvTitle.setText(title);
            tvTitle.setTextColor(Color.parseColor("#101416"));
            tvTitle.setTextSize(13);
            tvTitle.setTypeface(null, Typeface.BOLD);
            LinearLayout.LayoutParams tp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
            tp.setMarginStart(8);
            tvTitle.setLayoutParams(tp);
            titleRow.addView(tvTitle);

            card.addView(titleRow);

            if (!message.isEmpty()) {
                TextView tvMsg = new TextView(this);
                tvMsg.setText(message);
                tvMsg.setTextColor(Color.parseColor("#68747A"));
                tvMsg.setTextSize(12);
                tvMsg.setPadding(0, 6, 0, 0);
                card.addView(tvMsg);
            }

            if (!read) {
                card.setOnClickListener(v -> markNotificationRead(n.optString("id")));
            }

            notificationsListContainer.addView(card);
        }
    }

    private int getTypeColor(String type) {
        if (type == null) return Color.parseColor("#6B7280");
        switch (type.toUpperCase()) {
            case "MATERIAL_REQUEST": return Color.parseColor("#2563EB");
            case "REPORT": return Color.parseColor("#22A66F");
            case "BOOKING": return Color.parseColor("#D97706");
            case "REGISTRATION": return Color.parseColor("#7C3AED");
            case "STATUS_CHANGE": return Color.parseColor("#2563EB");
            default: return Color.parseColor("#6B7280");
        }
    }

    private void markNotificationRead(String id) {
        new Thread(() -> {
            try {
                JSONObject obj = new JSONObject();
                obj.put("id", id);
                ApiClient.patch("/notifications", obj.toString());
                runOnUiThread(this::loadNotifications);
            } catch (Exception ignored) {}
        }).start();
    }

    private void markAllNotificationsRead() {
        new Thread(() -> {
            try {
                JSONObject obj = new JSONObject();
                obj.put("markAll", true);
                ApiClient.patch("/notifications", obj.toString());
                runOnUiThread(() -> {
                    Toast.makeText(this, "All notifications marked read", Toast.LENGTH_SHORT).show();
                    loadNotifications();
                });
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "Failed", Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    // === RECENT BOOKINGS ===

    private void renderRecentBookings() {
        recentBookingsContainer.removeAllViews();
        if (bookingsArray == null || bookingsArray.length() == 0) {
            showEmpty(recentBookingsContainer, R.string.no_recent_bookings);
            return;
        }
        int count = Math.min(5, bookingsArray.length());
        for (int i = 0; i < count; i++) {
            JSONObject b = bookingsArray.optJSONObject(i);
            if (b == null) continue;

            String title = b.optString("title", "Service Request");
            String status = b.optString("status", "PENDING");
            String id = b.optString("id", "");

            LinearLayout row = new LinearLayout(this);
            row.setOrientation(LinearLayout.HORIZONTAL);
            row.setGravity(Gravity.CENTER_VERTICAL);
            row.setPadding(0, 10, 0, 10);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.setMarginStart(0);
            row.setLayoutParams(lp);

            View dot = new View(this);
            LinearLayout.LayoutParams dotLp = new LinearLayout.LayoutParams(8, 8);
            dotLp.setMarginEnd(10);
            dot.setLayoutParams(dotLp);
            dot.setBackgroundTintList(android.content.res.ColorStateList.valueOf(getStatusColor(status)));
            row.addView(dot);

            TextView tvTitle = new TextView(this);
            tvTitle.setText(title);
            tvTitle.setTextColor(Color.parseColor("#101416"));
            tvTitle.setTextSize(13);
            tvTitle.setTypeface(null, Typeface.BOLD);
            LinearLayout.LayoutParams tLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
            tvTitle.setLayoutParams(tLp);
            row.addView(tvTitle);

            TextView tvStatus = new TextView(this);
            tvStatus.setText(status);
            tvStatus.setTextColor(getStatusColor(status));
            tvStatus.setTextSize(10);
            tvStatus.setTypeface(null, Typeface.BOLD);
            tvStatus.setPadding(8, 3, 8, 3);
            tvStatus.setBackgroundResource(R.drawable.bg_pill);
            tvStatus.getBackground().setTint(getStatusColor(status) & 0x11FFFFFF);
            row.addView(tvStatus);

            recentBookingsContainer.addView(row);
        }
    }

    private int getStatusColor(String status) {
        if (status == null) return Color.parseColor("#6B7280");
        switch (status) {
            case "PENDING": return Color.parseColor("#D97706");
            case "APPROVED": return Color.parseColor("#B37700");
            case "ASSIGNED": return Color.parseColor("#2563EB");
            case "IN_PROGRESS": return Color.parseColor("#2563EB");
            case "COMPLETED": return Color.parseColor("#22A66F");
            case "CANCELLED": return Color.parseColor("#6B7280");
            default: return Color.parseColor("#6B7280");
        }
    }

    // === BOOKINGS ===

    private void renderBookingsList() {
        bookingsListContainer.removeAllViews();
        if (bookingsArray == null || bookingsArray.length() == 0) {
            showEmpty(bookingsListContainer, R.string.no_bookings);
            return;
        }

        for (int i = 0; i < bookingsArray.length(); i++) {
            JSONObject b = bookingsArray.optJSONObject(i);
            if (b == null) continue;

            String status = b.optString("status", "PENDING");
            if (!"ALL".equals(currentBookingFilter) && !status.equalsIgnoreCase(currentBookingFilter)) continue;

            String bookingId = b.optString("id");
            String title = b.optString("title", "Booking Request");

            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(14, 14, 14, 14);
            card.setBackgroundResource(R.drawable.bg_card);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, 0, 8);
            card.setLayoutParams(lp);

            TextView tvTitle = new TextView(this);
            tvTitle.setText(title);
            tvTitle.setTextColor(Color.parseColor("#101416"));
            tvTitle.setTextSize(14);
            tvTitle.setTypeface(null, Typeface.BOLD);
            card.addView(tvTitle);

            TextView tvStatus = new TextView(this);
            tvStatus.setText(status);
            tvStatus.setTextColor(getStatusColor(status));
            tvStatus.setTextSize(11);
            tvStatus.setTypeface(null, Typeface.BOLD);
            tvStatus.setPadding(0, 4, 0, 10);
            card.addView(tvStatus);

            LinearLayout actionRow = new LinearLayout(this);
            actionRow.setOrientation(LinearLayout.HORIZONTAL);

            if ("PENDING".equals(status)) {
                Button btnApprove = createYellowSmallButton("Approve");
                btnApprove.setOnClickListener(v -> approveBooking(bookingId));
                actionRow.addView(btnApprove);
            }

            Button btnAssign = createYellowSmallButton("Assign Tech");
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            p.setMarginStart(8);
            btnAssign.setLayoutParams(p);
            btnAssign.setOnClickListener(v -> showAssignTechDialog(bookingId, title));
            actionRow.addView(btnAssign);

            card.addView(actionRow);
            bookingsListContainer.addView(card);
        }
    }

    // === PROJECTS ===

    private void renderProjectsList() {
        projectsListContainer.removeAllViews();
        if (bookingsArray == null) return;

        boolean hasProjects = false;
        for (int i = 0; i < bookingsArray.length(); i++) {
            JSONObject b = bookingsArray.optJSONObject(i);
            if (b == null) continue;
            String status = b.optString("status", "");
            if (!("ASSIGNED".equals(status) || "IN_PROGRESS".equals(status) || "COMPLETED".equals(status))) continue;
            hasProjects = true;

            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(14, 14, 14, 14);
            card.setBackgroundResource(R.drawable.bg_card);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, 0, 8);
            card.setLayoutParams(lp);

            TextView tvTitle = new TextView(this);
            tvTitle.setText(b.optString("title", "Project"));
            tvTitle.setTextColor(Color.parseColor("#101416"));
            tvTitle.setTextSize(14);
            tvTitle.setTypeface(null, Typeface.BOLD);
            card.addView(tvTitle);

            JSONObject techObj = b.optJSONObject("assignedTo");
            String techName = techObj != null ? techObj.optString("name", "Unassigned") : "Unassigned";

            TextView tvInfo = new TextView(this);
            tvInfo.setText("Tech: " + techName + " • " + status);
            tvInfo.setTextColor(getStatusColor(status));
            tvInfo.setTextSize(11);
            tvInfo.setTypeface(null, Typeface.BOLD);
            tvInfo.setPadding(0, 4, 0, 0);
            card.addView(tvInfo);

            JSONObject clientObj = b.optJSONObject("client");
            if (clientObj != null) {
                TextView tvClient = new TextView(this);
                tvClient.setText("Client: " + clientObj.optString("name", ""));
                tvClient.setTextColor(Color.parseColor("#68747A"));
                tvClient.setTextSize(12);
                tvClient.setPadding(0, 4, 0, 0);
                card.addView(tvClient);
            }

            projectsListContainer.addView(card);
        }

        if (!hasProjects) {
            showEmpty(projectsListContainer, R.string.empty);
        }
    }

    // === REGISTRATIONS ===

    private void loadRegistrations() { renderRegistrationsList(); }

    private void renderRegistrationsList() {
        registrationsListContainer.removeAllViews();
        if (pendingUsersArray == null || pendingUsersArray.length() == 0) {
            showEmpty(registrationsListContainer, R.string.empty);
            return;
        }

        for (int i = 0; i < pendingUsersArray.length(); i++) {
            JSONObject u = pendingUsersArray.optJSONObject(i);
            if (u == null) continue;

            final String userId = u.optString("id");
            String name = u.optString("name", "Technician");
            String email = u.optString("email", "");
            String phone = u.optString("phone", "");

            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(14, 14, 14, 14);
            card.setBackgroundResource(R.drawable.bg_card);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, 0, 8);
            card.setLayoutParams(lp);

            TextView tvName = new TextView(this);
            tvName.setText(name);
            tvName.setTextColor(Color.parseColor("#101416"));
            tvName.setTextSize(14);
            tvName.setTypeface(null, Typeface.BOLD);
            card.addView(tvName);

            TextView tvEmail = new TextView(this);
            tvEmail.setText(email + (phone.isEmpty() ? "" : " • " + phone));
            tvEmail.setTextColor(Color.parseColor("#68747A"));
            tvEmail.setTextSize(12);
            tvEmail.setPadding(0, 3, 0, 8);
            card.addView(tvEmail);

            LinearLayout actionRow = new LinearLayout(this);
            actionRow.setOrientation(LinearLayout.HORIZONTAL);

            Button btnApprove = createYellowSmallButton("Approve");
            btnApprove.setOnClickListener(v -> approveUser(userId));
            actionRow.addView(btnApprove);

            Button btnReject = new Button(this);
            btnReject.setText("Reject");
            btnReject.setTextSize(11);
            btnReject.setBackgroundResource(R.drawable.bg_action_red);
            btnReject.setTextColor(Color.WHITE);
            btnReject.setTypeface(null, Typeface.BOLD);
            LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            rp.setMarginStart(8);
            btnReject.setLayoutParams(rp);
            btnReject.setOnClickListener(v -> rejectUser(userId));
            actionRow.addView(btnReject);

            card.addView(actionRow);
            registrationsListContainer.addView(card);
        }
    }

    // === INVENTORY ===

    private void renderInventoryList() {
        inventoryListContainer.removeAllViews();
        if (inventoryArray == null || inventoryArray.length() == 0) {
            showEmpty(inventoryListContainer, R.string.empty);
            return;
        }

        for (int i = 0; i < inventoryArray.length(); i++) {
            JSONObject inv = inventoryArray.optJSONObject(i);
            if (inv == null) continue;

            LinearLayout item = new LinearLayout(this);
            item.setOrientation(LinearLayout.HORIZONTAL);
            item.setGravity(Gravity.CENTER_VERTICAL);
            item.setPadding(12, 12, 12, 12);
            item.setBackgroundResource(R.drawable.bg_card);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, 0, 6);
            item.setLayoutParams(lp);

            ImageView iv = new ImageView(this);
            int size = (int) (48 * getResources().getDisplayMetrics().density);
            LinearLayout.LayoutParams ivLp = new LinearLayout.LayoutParams(size, size);
            ivLp.setMarginEnd(12);
            iv.setLayoutParams(ivLp);
            iv.setScaleType(ImageView.ScaleType.CENTER_CROP);
            iv.setBackgroundResource(R.drawable.bg_icon_circle);
            item.addView(iv);

            String image = inv.optString("imageUrl");
            if (image == null || image.isEmpty()) image = inv.optString("imageData");
            if (image != null && !image.isEmpty()) {
                Glide.with(this).load(image).centerCrop().into(iv);
            } else {
                iv.setImageResource(android.R.drawable.ic_menu_gallery);
            }

            LinearLayout textCol = new LinearLayout(this);
            textCol.setOrientation(LinearLayout.VERTICAL);

            TextView tvName = new TextView(this);
            tvName.setText(inv.optString("name", "Item"));
            tvName.setTextColor(Color.parseColor("#101416"));
            tvName.setTypeface(null, Typeface.BOLD);
            tvName.setTextSize(13);
            textCol.addView(tvName);

            int qty = inv.optInt("quantity");
            String unit = inv.optString("unit", "pcs");
            String category = inv.optString("category", "General");
            int reorderLevel = inv.optInt("reorderLevel", 10);

            TextView tvDetail = new TextView(this);
            tvDetail.setText(category + " • " + qty + " " + unit);
            tvDetail.setTextColor(qty <= reorderLevel ? Color.parseColor("#DC2626") : Color.parseColor("#68747A"));
            tvDetail.setTextSize(12);
            textCol.addView(tvDetail);

            item.addView(textCol);
            inventoryListContainer.addView(item);
        }
    }

    // === TECHNICIANS ===

    private void renderTechniciansList() {
        techniciansListContainer.removeAllViews();
        if (techniciansArray == null || techniciansArray.length() == 0) {
            showEmpty(techniciansListContainer, R.string.empty);
            return;
        }

        for (int i = 0; i < techniciansArray.length(); i++) {
            JSONObject tech = techniciansArray.optJSONObject(i);
            if (tech == null) continue;

            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(14, 14, 14, 14);
            card.setBackgroundResource(R.drawable.bg_card);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, 0, 6);
            card.setLayoutParams(lp);

            TextView tvName = new TextView(this);
            tvName.setText(tech.optString("name", "Tech"));
            tvName.setTextColor(Color.parseColor("#101416"));
            tvName.setTypeface(null, Typeface.BOLD);
            tvName.setTextSize(13);
            card.addView(tvName);

            TextView tvEmail = new TextView(this);
            tvEmail.setText(tech.optString("email", ""));
            tvEmail.setTextColor(Color.parseColor("#68747A"));
            tvEmail.setTextSize(12);
            card.addView(tvEmail);

            techniciansListContainer.addView(card);
        }
    }

    // === CLIENTS ===

    private void renderClientsList() {
        clientsListContainer.removeAllViews();
        if (clientsArray == null || clientsArray.length() == 0) {
            showEmpty(clientsListContainer, R.string.empty);
            return;
        }

        for (int i = 0; i < clientsArray.length(); i++) {
            JSONObject client = clientsArray.optJSONObject(i);
            if (client == null) continue;

            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(14, 14, 14, 14);
            card.setBackgroundResource(R.drawable.bg_card);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, 0, 6);
            card.setLayoutParams(lp);

            TextView tvName = new TextView(this);
            tvName.setText(client.optString("name", "Client"));
            tvName.setTextColor(Color.parseColor("#101416"));
            tvName.setTypeface(null, Typeface.BOLD);
            tvName.setTextSize(13);
            card.addView(tvName);

            TextView tvEmail = new TextView(this);
            tvEmail.setText(client.optString("email", ""));
            tvEmail.setTextColor(Color.parseColor("#68747A"));
            tvEmail.setTextSize(12);
            card.addView(tvEmail);

            clientsListContainer.addView(card);
        }
    }

    // === REPORTS ===

    private void loadReports() { renderReportsList(); }

    private void renderReportsList() {
        reportsListContainer.removeAllViews();
        if (reportsArray == null || reportsArray.length() == 0) {
            showEmpty(reportsListContainer, R.string.empty);
            return;
        }

        for (int i = 0; i < reportsArray.length(); i++) {
            JSONObject r = reportsArray.optJSONObject(i);
            if (r == null) continue;

            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(14, 14, 14, 14);
            card.setBackgroundResource(R.drawable.bg_card);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, 0, 6);
            card.setLayoutParams(lp);

            JSONObject booking = r.optJSONObject("booking");
            if (booking != null) {
                TextView tvBooking = new TextView(this);
                tvBooking.setText(booking.optString("title", "Booking"));
                tvBooking.setTextColor(Color.parseColor("#101416"));
                tvBooking.setTextSize(13);
                tvBooking.setTypeface(null, Typeface.BOLD);
                card.addView(tvBooking);
            }

            JSONObject author = r.optJSONObject("author");
            if (author != null) {
                TextView tvAuthor = new TextView(this);
                tvAuthor.setText("By " + author.optString("name", "Unknown"));
                tvAuthor.setTextColor(Color.parseColor("#68747A"));
                tvAuthor.setTextSize(12);
                card.addView(tvAuthor);
            }

            TextView tvContent = new TextView(this);
            tvContent.setText(r.optString("content", ""));
            tvContent.setTextColor(Color.parseColor("#4B575C"));
            tvContent.setTextSize(12);
            tvContent.setPadding(0, 4, 0, 0);
            card.addView(tvContent);

            reportsListContainer.addView(card);
        }
    }

    // === SETTINGS ===

    private void loadSettings() {
        new Thread(() -> {
            try {
                String resp = ApiClient.get("/settings");
                if (resp != null) {
                    JSONObject obj = new JSONObject(resp);
                    JSONObject settings = obj.optJSONObject("settings");
                    if (settings != null) {
                        final String orgName = settings.optString("orgName", "");
                        final String supportEmail = settings.optString("supportEmail", "");
                        runOnUiThread(() -> {
                            settingsOrgName.setText(orgName);
                            settingsSupportEmail.setText(supportEmail);
                        });
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();
    }

    private void saveSettings() {
        String orgName = settingsOrgName.getText().toString().trim();
        String supportEmail = settingsSupportEmail.getText().toString().trim();

        if (orgName.isEmpty() && supportEmail.isEmpty()) {
            Toast.makeText(this, "Enter at least one setting to save", Toast.LENGTH_SHORT).show();
            return;
        }

        new Thread(() -> {
            try {
                JSONObject settings = new JSONObject();
                if (!orgName.isEmpty()) settings.put("orgName", orgName);
                if (!supportEmail.isEmpty()) settings.put("supportEmail", supportEmail);

                JSONObject payload = new JSONObject();
                payload.put("settings", settings);
                ApiClient.put("/settings", payload.toString());
                runOnUiThread(() -> Toast.makeText(this, "Settings Saved", Toast.LENGTH_SHORT).show());
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "Failed to save settings", Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    // === ACTIONS ===

    private void approveBooking(String bookingId) {
        new Thread(() -> {
            try {
                JSONObject json = new JSONObject();
                json.put("action", "approve");
                json.put("bookingId", bookingId);
                ApiClient.post("/admin", json.toString());
                runOnUiThread(() -> {
                    Toast.makeText(this, "Booking Approved", Toast.LENGTH_SHORT).show();
                    loadDashboardData();
                });
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "Approval failed", Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    private void showAssignTechDialog(String bookingId, String bookingTitle) {
        if (techniciansArray == null || techniciansArray.length() == 0) {
            Toast.makeText(this, "No technicians available", Toast.LENGTH_LONG).show();
            return;
        }
        List<String> names = new ArrayList<>();
        List<String> ids = new ArrayList<>();
        for (int i = 0; i < techniciansArray.length(); i++) {
            JSONObject t = techniciansArray.optJSONObject(i);
            if (t != null) {
                names.add(t.optString("name") + " (" + t.optString("email") + ")");
                ids.add(t.optString("id"));
            }
        }
        new AlertDialog.Builder(this)
                .setTitle("Assign Tech: " + bookingTitle)
                .setItems(names.toArray(new String[0]), (dialog, which) -> assignTechToBooking(bookingId, ids.get(which)))
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void assignTechToBooking(String bookingId, String techId) {
        new Thread(() -> {
            try {
                JSONObject json = new JSONObject();
                json.put("action", "assign");
                json.put("bookingId", bookingId);
                json.put("assignToId", techId);
                ApiClient.post("/admin", json.toString());
                runOnUiThread(() -> {
                    Toast.makeText(this, "Technician Assigned", Toast.LENGTH_SHORT).show();
                    loadDashboardData();
                });
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "Assignment failed", Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    private void approveUser(String userId) {
        new Thread(() -> {
            try {
                JSONObject json = new JSONObject();
                json.put("action", "approve_user");
                json.put("userId", userId);
                ApiClient.post("/admin", json.toString());
                runOnUiThread(() -> {
                    Toast.makeText(this, "Registration Approved", Toast.LENGTH_SHORT).show();
                    loadDashboardData();
                });
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "Approval failed", Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    private void rejectUser(String userId) {
        new AlertDialog.Builder(this)
                .setTitle("Reject Registration")
                .setMessage("Are you sure? The account will be removed.")
                .setPositiveButton("Reject", (dialog, which) -> {
                    new Thread(() -> {
                        try {
                            JSONObject json = new JSONObject();
                            json.put("action", "reject_user");
                            json.put("userId", userId);
                            ApiClient.post("/admin", json.toString());
                            runOnUiThread(() -> {
                                Toast.makeText(this, "Registration Rejected", Toast.LENGTH_SHORT).show();
                                loadDashboardData();
                            });
                        } catch (Exception e) {
                            runOnUiThread(() -> Toast.makeText(this, "Reject failed", Toast.LENGTH_SHORT).show());
                        }
                    }).start();
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    // === INVENTORY DIALOG ===

    private void showAddInventoryDialog() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(40, 20, 40, 20);

        final EditText etName = new EditText(this);
        etName.setHint("Item Name (e.g. 20A Circuit Breaker)");
        layout.addView(etName);

        final EditText etCategory = new EditText(this);
        etCategory.setHint("Category (Wiring / Breakers / Lighting)");
        layout.addView(etCategory);

        final EditText etQty = new EditText(this);
        etQty.setHint("Quantity");
        etQty.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);
        layout.addView(etQty);

        final EditText etUnit = new EditText(this);
        etUnit.setHint("Unit (pcs / meters / rolls)");
        layout.addView(etUnit);

        Button btnCapture = new Button(this);
        btnCapture.setText("📷 Capture Photo");
        btnCapture.setTextSize(12);
        btnCapture.setBackgroundResource(R.drawable.bg_action_yellow);
        btnCapture.setTextColor(Color.parseColor("#0B0F10"));
        LinearLayout.LayoutParams paramsBtn = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        paramsBtn.setMargins(0, 14, 0, 4);
        btnCapture.setLayoutParams(paramsBtn);
        layout.addView(btnCapture);

        final TextView photoStatus = new TextView(this);
        photoStatus.setText(capturedImageBase64 == null ? "No photo captured" : "Photo captured");
        photoStatus.setTextColor(Color.GRAY);
        photoStatus.setTextSize(12);
        layout.addView(photoStatus);

        final ImageView preview = new ImageView(this);
        LinearLayout.LayoutParams paramsPreview = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 220);
        paramsPreview.setMargins(0, 8, 0, 0);
        preview.setLayoutParams(paramsPreview);
        preview.setScaleType(ImageView.ScaleType.CENTER_CROP);
        preview.setBackgroundResource(R.drawable.bg_dashboard_card);
        layout.addView(preview);

        inventoryPhotoPreview = preview;
        inventoryPhotoStatus = photoStatus;
        btnCapture.setOnClickListener(v -> openCamera());

        if (capturedImageBase64 != null) {
            try {
                byte[] raw = Base64.decode(capturedImageBase64.split(",")[1], Base64.DEFAULT);
                Bitmap bmp = BitmapFactory.decodeByteArray(raw, 0, raw.length);
                if (bmp != null) preview.setImageBitmap(bmp);
            } catch (Exception ignored) {}
        }

        new AlertDialog.Builder(this)
                .setTitle("Add Stock Item")
                .setView(layout)
                .setPositiveButton("Save Item", (dialog, which) -> {
                    String name = etName.getText().toString().trim();
                    String cat = etCategory.getText().toString().trim();
                    String unit = etUnit.getText().toString().trim();
                    int qty = 1;
                    try { qty = Integer.parseInt(etQty.getText().toString().trim()); } catch (Exception ignored) {}
                    if (!name.isEmpty()) saveInventoryItem(name, cat, qty, unit.isEmpty() ? "pcs" : unit);
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void saveInventoryItem(String name, String category, int qty, String unit) {
        new Thread(() -> {
            try {
                JSONObject json = new JSONObject();
                json.put("name", name);
                json.put("category", category);
                json.put("quantity", qty);
                json.put("unit", unit);
                if (capturedImageBase64 != null && !capturedImageBase64.isEmpty()) {
                    json.put("imageData", capturedImageBase64);
                }
                ApiClient.post("/inventory", json.toString());
                runOnUiThread(() -> {
                    Toast.makeText(this, "Item Saved to Inventory", Toast.LENGTH_SHORT).show();
                    capturedImageBase64 = null;
                    capturedImageUri = null;
                    loadDashboardData();
                });
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "Failed to save item", Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    // === TECHNICIAN DIALOG ===

    private void showAddTechnicianDialog() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(40, 20, 40, 20);

        final EditText etName = new EditText(this);
        etName.setHint("Technician Name");
        layout.addView(etName);

        final EditText etEmail = new EditText(this);
        etEmail.setHint("Email Address");
        etEmail.setInputType(android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        layout.addView(etEmail);

        final EditText etPass = new EditText(this);
        etPass.setHint("Password (e.g. tech123)");
        layout.addView(etPass);

        new AlertDialog.Builder(this)
                .setTitle("Add Technician Account")
                .setView(layout)
                .setPositiveButton("Create", (dialog, which) -> {
                    String name = etName.getText().toString().trim();
                    String email = etEmail.getText().toString().trim();
                    String pass = etPass.getText().toString().trim();
                    if (!name.isEmpty() && !email.isEmpty()) {
                        createTechnician(name, email, pass.isEmpty() ? "tech123" : pass);
                    }
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void createTechnician(String name, String email, String password) {
        new Thread(() -> {
            try {
                JSONObject json = new JSONObject();
                json.put("action", "create_user");
                json.put("name", name);
                json.put("email", email);
                json.put("password", password);
                json.put("role", "TECH");
                ApiClient.post("/admin", json.toString());
                runOnUiThread(() -> {
                    Toast.makeText(this, "Technician Account Created", Toast.LENGTH_SHORT).show();
                    loadDashboardData();
                });
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "Failed to create technician", Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    // === CAMERA ===

    private void openCamera() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA}, REQ_CAMERA_PERMISSION);
            return;
        }
        dispatchTakePictureIntent();
    }

    private void dispatchTakePictureIntent() {
        Intent takePicture = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        if (takePicture.resolveActivity(getPackageManager()) == null) {
            Toast.makeText(this, "No camera app found", Toast.LENGTH_SHORT).show();
            return;
        }
        try {
            File imageRoot = new File(getCacheDir(), "images");
            if (!imageRoot.exists()) imageRoot.mkdirs();
            File photoFile = new File(imageRoot, "elettro_" + System.currentTimeMillis() + ".jpg");
            Uri photoUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", photoFile);
            capturedImageUri = photoUri;
            takePicture.putExtra(MediaStore.EXTRA_OUTPUT, photoUri);
            startActivityForResult(takePicture, REQ_CAMERA);
        } catch (Exception e) {
            Toast.makeText(this, "Unable to open camera", Toast.LENGTH_SHORT).show();
        }
    }

    private void processCapturedImage(Uri uri) {
        try {
            InputStream is = getContentResolver().openInputStream(uri);
            Bitmap bitmap = BitmapFactory.decodeStream(is);
            if (is != null) is.close();
            if (bitmap == null) return;

            int maxDim = 1200;
            int w = bitmap.getWidth();
            int h = bitmap.getHeight();
            if (Math.max(w, h) > maxDim) {
                float scale = (float) maxDim / Math.max(w, h);
                bitmap = Bitmap.createScaledBitmap(bitmap, (int)(w * scale), (int)(h * scale), true);
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.JPEG, 80, baos);
            byte[] bytes = baos.toByteArray();
            capturedImageBase64 = "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP);

            if (inventoryPhotoPreview != null) inventoryPhotoPreview.setImageBitmap(bitmap);
            if (inventoryPhotoStatus != null) {
                inventoryPhotoStatus.setText("Photo captured (" + Math.round(bytes.length / 1024f) + " KB)");
                inventoryPhotoStatus.setTextColor(Color.parseColor("#22A66F"));
            }
        } catch (Exception e) {
            Toast.makeText(this, "Failed to process photo", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_CAMERA_PERMISSION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                dispatchTakePictureIntent();
            } else {
                Toast.makeText(this, "Camera permission required", Toast.LENGTH_LONG).show();
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_CAMERA && resultCode == RESULT_OK) {
            if (capturedImageUri != null) processCapturedImage(capturedImageUri);
            else if (data != null && data.getData() != null) processCapturedImage(data.getData());
        }
    }

    // === HELPERS ===

    private Button createYellowSmallButton(String text) {
        Button btn = new Button(this);
        btn.setText(text);
        btn.setTextSize(11);
        btn.setBackgroundResource(R.drawable.bg_action_yellow);
        btn.setTextColor(Color.parseColor("#0B0F10"));
        btn.setTypeface(null, Typeface.BOLD);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        p.setMarginEnd(4);
        btn.setLayoutParams(p);
        return btn;
    }

    private void showLoadingSpinner(LinearLayout container) {
        TextView tv = new TextView(this);
        tv.setText(R.string.loading);
        tv.setTextColor(Color.GRAY);
        tv.setPadding(0, 20, 0, 0);
        container.addView(tv);
    }

    private void showEmpty(LinearLayout container, int stringRes) {
        TextView tv = new TextView(this);
        tv.setText(stringRes);
        tv.setTextColor(Color.parseColor("#9EA8AC"));
        tv.setPadding(0, 24, 0, 0);
        tv.setTextSize(13);
        container.addView(tv);
    }
}