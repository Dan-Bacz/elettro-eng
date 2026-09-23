package com.elettro.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Typeface;
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
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.core.view.GravityCompat;
import androidx.drawerlayout.widget.DrawerLayout;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.bumptech.glide.Glide;
import com.elettro.app.network.ApiClient;

import com.google.android.material.navigation.NavigationView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class AdminDashboardActivity extends AppCompatActivity {

    // Shell & drawer
    private DrawerLayout drawerLayout;
    private NavigationView navView;
    private ImageButton btnMenu, btnBell;
    private TextView bellBadge;
    private TextView headerUserName, headerUserRole, headerUserInitial;
    private TextView sectionTitle;
    private TextView sectionSubtitle;
    private SwipeRefreshLayout swipeRefresh;

    // Stat views
    private TextView statTotalBookings, statActiveProjects, statRegistrations, statLowStock;
    private TextView tileApproved, tileAssigned, tileStockUnits, tileSuspended;

    // Section containers
    private View viewDashboard, viewBookings, viewProjects, viewNotifications;
    private View viewClients, viewTechnicians, viewInventory, viewReports, viewSettings, viewMore;
    // List containers
    private LinearLayout recentBookingsContainer, bookingsListContainer, projectsListContainer;
    private LinearLayout registrationsListContainer, inventoryListContainer, techniciansListContainer;
    private LinearLayout clientsListContainer, reportsListContainer, notificationsListContainer;
    // Settings fields
    private EditText settingsOrgName, settingsSupportEmail;
    private TextView btnSaveSettings;
    // Notifications
    private TextView btnMarkAllRead;
    private TextView regBadge;

    // Action buttons
    private TextView btnAddInventoryItem, btnAddTechnician;
    private TextView btnGotoBookings;
    private LinearLayout btnQaAddClient, btnQaNewBooking, btnQaAssignTech, btnQaAddInventory;
    private LinearLayout rowMoreClients, rowMoreTechnicians, rowMoreInventory, rowMoreReports, rowMoreSettings;

    // Filter chips
    private Button filterAll, filterPending, filterApproved, filterAssigned, filterCompleted;
    private String currentBookingFilter = "ALL";

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
    private JSONArray projectsArray;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_admin_dashboard);

        String token = getSharedPreferences("elettro_login", MODE_PRIVATE).getString(MainActivity.KEY_TOKEN, "");
        ApiClient.setAuthToken(token);

        bindViews();
        setupDrawer();
        setupSwipeRefresh();
        setupActionButtons();

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
        swipeRefresh = findViewById(R.id.swipe_refresh);

        statTotalBookings = findViewById(R.id.stat_total_bookings);
        statActiveProjects = findViewById(R.id.stat_active_projects);
        statRegistrations = findViewById(R.id.stat_registrations);
        statLowStock = findViewById(R.id.stat_low_stock);

        tileApproved = findViewById(R.id.tile_approved);
        tileAssigned = findViewById(R.id.tile_assigned);
        tileStockUnits = findViewById(R.id.tile_stock_units);
        tileSuspended = findViewById(R.id.tile_suspended);

        viewDashboard = findViewById(R.id.view_dashboard_section);
        viewBookings = findViewById(R.id.view_bookings_section);
        viewProjects = findViewById(R.id.view_projects_section);
        viewNotifications = findViewById(R.id.view_notifications_section);
        viewClients = findViewById(R.id.view_clients_section);
        viewTechnicians = findViewById(R.id.view_technicians_section);
        viewInventory = findViewById(R.id.view_inventory_section);
        viewReports = findViewById(R.id.view_reports_section);
        viewSettings = findViewById(R.id.view_settings_section);
        viewMore = findViewById(R.id.view_more_section);

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
        regBadge = findViewById(R.id.more_reg_badge);

        btnAddInventoryItem = findViewById(R.id.btn_add_inventory);
        btnAddTechnician = findViewById(R.id.btn_add_technician);
        btnGotoBookings = findViewById(R.id.btn_goto_bookings);

        btnQaAddClient = findViewById(R.id.btn_qa_add_client);
        btnQaNewBooking = findViewById(R.id.btn_qa_new_booking);
        btnQaAssignTech = findViewById(R.id.btn_qa_assign_tech);
        btnQaAddInventory = findViewById(R.id.btn_qa_add_inventory);

        rowMoreClients = findViewById(R.id.row_more_clients);
        rowMoreTechnicians = findViewById(R.id.row_more_technicians);
        rowMoreInventory = findViewById(R.id.row_more_inventory);
        rowMoreReports = findViewById(R.id.row_more_reports);
        rowMoreSettings = findViewById(R.id.row_more_settings);

        filterAll = findViewById(R.id.filter_all);
        filterPending = findViewById(R.id.filter_pending);
        filterApproved = findViewById(R.id.filter_approved);
        filterAssigned = findViewById(R.id.filter_assigned);
        filterCompleted = findViewById(R.id.filter_completed);

        headerUserName.setText("Admin");
        headerUserRole.setText(R.string.role_admin);
        headerUserInitial.setText("A");

        View header = navView.getHeaderView(0);
        if (header != null) {
            ((TextView) header.findViewById(R.id.drawer_header_name)).setText("Admin");
            ((TextView) header.findViewById(R.id.drawer_header_role)).setText(R.string.role_admin);
            TextView initial = header.findViewById(R.id.drawer_header_initial);
            if (initial != null) initial.setText("A");
        }
    }

    private void setupSwipeRefresh() {
        swipeRefresh.setOnRefreshListener(() -> {
            loadDashboardData();
            swipeRefresh.setRefreshing(false);
        });
    }

    private void setupDrawer() {
        btnMenu.setOnClickListener(v -> drawerLayout.openDrawer(GravityCompat.START));
        btnBell.setOnClickListener(v -> showSection("notifications"));

        navView.setNavigationItemSelectedListener(item -> {
            int id = item.getItemId();
            drawerLayout.closeDrawer(GravityCompat.START);
            if (id == R.id.nav_home) { showSection("home"); return true; }
            if (id == R.id.nav_bookings) { showSection("bookings"); return true; }
            if (id == R.id.nav_projects) { showSection("projects"); return true; }
            if (id == R.id.nav_notifications) { showSection("notifications"); return true; }
            if (id == R.id.nav_more) { showSection("more"); return true; }
            if (id == R.id.nav_technicians) { showSection("technicians"); return true; }
            if (id == R.id.nav_inventory) { showSection("inventory"); return true; }
            if (id == R.id.nav_reports) { showSection("reports"); return true; }
            if (id == R.id.nav_settings) { showSection("settings"); hideKeyboard(); return true; }
            if (id == R.id.nav_logout) { logout(); return true; }
            return false;
        });
    }

    private void showSection(String key) {
        viewDashboard.setVisibility("home".equals(key) ? View.VISIBLE : View.GONE);
        viewBookings.setVisibility("bookings".equals(key) ? View.VISIBLE : View.GONE);
        viewProjects.setVisibility("projects".equals(key) ? View.VISIBLE : View.GONE);
        viewNotifications.setVisibility("notifications".equals(key) ? View.VISIBLE : View.GONE);
        viewClients.setVisibility("clients".equals(key) ? View.VISIBLE : View.GONE);
        viewTechnicians.setVisibility("technicians".equals(key) ? View.VISIBLE : View.GONE);
        viewInventory.setVisibility("inventory".equals(key) ? View.VISIBLE : View.GONE);
        viewReports.setVisibility("reports".equals(key) ? View.VISIBLE : View.GONE);
        viewSettings.setVisibility("settings".equals(key) ? View.VISIBLE : View.GONE);
        viewMore.setVisibility("more".equals(key) ? View.VISIBLE : View.GONE);

        int titleRes = R.string.drawer_dashboard;
        int subRes = R.string.welcome_admin_3;
        int menuRes = R.id.nav_home;

        switch (key) {
            case "bookings":
                titleRes = R.string.bookings_title;
                subRes = R.string.bookings_subtitle;
                menuRes = R.id.nav_bookings;
                break;
            case "projects":
                titleRes = R.string.projects_title;
                subRes = R.string.projects_subtitle;
                menuRes = R.id.nav_projects;
                break;
            case "notifications":
                titleRes = R.string.notifications_title;
                subRes = R.string.notifications_subtitle;
                menuRes = R.id.nav_notifications;
                loadNotifications();
                break;
            case "more":
                titleRes = R.string.more_title;
                subRes = R.string.more_subtitle;
                menuRes = R.id.nav_more;
                break;
            case "clients":
                titleRes = R.string.clients_title;
                subRes = R.string.clients_subtitle;
                menuRes = 0;
                break;
            case "technicians":
                titleRes = R.string.technicians_title;
                subRes = R.string.technicians_subtitle;
                menuRes = R.id.nav_technicians;
                break;
            case "inventory":
                titleRes = R.string.inventory_title;
                subRes = R.string.inventory_subtitle;
                menuRes = R.id.nav_inventory;
                break;
            case "reports":
                titleRes = R.string.reports_title;
                subRes = R.string.reports_subtitle;
                menuRes = R.id.nav_reports;
                break;
            case "settings":
                titleRes = R.string.settings_title;
                subRes = R.string.settings_subtitle;
                menuRes = R.id.nav_settings;
                loadSettings();
                break;
        }

        sectionTitle.setText(titleRes);
        sectionSubtitle.setText(subRes);
        if (menuRes != 0) {
            navView.setCheckedItem(menuRes);
        }
        if (!"notifications".equals(key)) {
            swipeRefresh.post(() -> swipeRefresh.setEnabled(true));
        }
    }

    private void hideKeyboard() {
        android.view.inputmethod.InputMethodManager imm =
                (android.view.inputmethod.InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
        if (imm != null && getCurrentFocus() != null) {
            imm.hideSoftInputFromWindow(getCurrentFocus().getWindowToken(), 0);
        }
    }

    private void logout() {
        getSharedPreferences("elettro_login", MODE_PRIVATE).edit().remove(MainActivity.KEY_TOKEN).apply();
        ApiClient.setAuthToken("");
        Toast.makeText(this, R.string.signed_out, Toast.LENGTH_SHORT).show();
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(intent);
        finish();
    }

    private void setupActionButtons() {
        btnGotoBookings.setOnClickListener(v -> showSection("bookings"));
        btnAddInventoryItem.setOnClickListener(v -> showAddInventoryDialog());
        btnAddTechnician.setOnClickListener(v -> showAddTechnicianDialog());
        btnSaveSettings.setOnClickListener(v -> saveSettings());
        btnMarkAllRead.setOnClickListener(v -> markAllNotificationsRead());

        btnQaAddClient.setOnClickListener(v -> showAddClientDialog());
        btnQaNewBooking.setOnClickListener(v -> showNewBookingDialog());
        btnQaAssignTech.setOnClickListener(v -> showAssignTechFlow());
        btnQaAddInventory.setOnClickListener(v -> showAddInventoryDialog());

        rowMoreClients.setOnClickListener(v -> showSection("clients"));
        rowMoreTechnicians.setOnClickListener(v -> showSection("technicians"));
        rowMoreInventory.setOnClickListener(v -> showSection("inventory"));
        rowMoreReports.setOnClickListener(v -> showSection("reports"));
        rowMoreSettings.setOnClickListener(v -> showSection("settings"));

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
                    projectsArray = dashboardData.optJSONArray("projects");
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
            statActiveProjects.setText(String.valueOf(stats.optInt("inProgress")));
            statRegistrations.setText(String.valueOf(stats.optInt("pendingRegistrations")));
            statLowStock.setText(String.valueOf(stats.optInt("lowStock")));
            tileApproved.setText(String.valueOf(stats.optInt("approved")));
            tileAssigned.setText(String.valueOf(stats.optInt("assigned")));
            tileStockUnits.setText(String.valueOf(stats.optInt("totalInventory")));
            tileSuspended.setText(String.valueOf(stats.optInt("suspendedTechnicians")));
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

        int unread = 0;
        for (int i = 0; i < notificationsArray.length(); i++) {
            JSONObject n = notificationsArray.optJSONObject(i);
            if (n != null && !n.optBoolean("read", false)) unread++;
        }
        setBellBadge(unread);
    }

    private void setBellBadge(int unread) {
        if (bellBadge == null) return;
        if (unread > 0) {
            bellBadge.setText(String.valueOf(unread));
            bellBadge.setVisibility(View.VISIBLE);
        } else {
            bellBadge.setVisibility(View.GONE);
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
            String clientName = b.optJSONObject("client") != null ? b.optJSONObject("client").optString("name", "") : "";

            LinearLayout row = new LinearLayout(this);
            row.setOrientation(LinearLayout.HORIZONTAL);
            row.setGravity(Gravity.CENTER_VERTICAL);
            row.setPadding(0, 10, 0, 10);
            row.setLayoutParams(new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

            View dot = new View(this);
            LinearLayout.LayoutParams dotLp = new LinearLayout.LayoutParams(8, 8);
            dotLp.setMarginEnd(10);
            dot.setLayoutParams(dotLp);
            dot.setBackgroundTintList(android.content.res.ColorStateList.valueOf(getStatusColor(status)));
            row.addView(dot);

            LinearLayout textCol = new LinearLayout(this);
            textCol.setOrientation(LinearLayout.VERTICAL);

            TextView tvTitle = new TextView(this);
            tvTitle.setText(title);
            tvTitle.setTextColor(Color.parseColor("#101416"));
            tvTitle.setTextSize(13);
            tvTitle.setTypeface(null, Typeface.BOLD);
            textCol.addView(tvTitle);

            if (!clientName.isEmpty()) {
                TextView tvClient = new TextView(this);
                tvClient.setText(clientName);
                tvClient.setTextColor(Color.parseColor("#68747A"));
                tvClient.setTextSize(11);
                textCol.addView(tvClient);
            }
            textCol.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
            row.addView(textCol);

            TextView tvStatus = new TextView(this);
            tvStatus.setText(status.replace("_", " "));
            tvStatus.setTextColor(getStatusColor(status));
            tvStatus.setTextSize(9);
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
            String clientName = b.optJSONObject("client") != null ? b.optJSONObject("client").optString("name", "") : "";

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

            if (!clientName.isEmpty()) {
                TextView tvClient = new TextView(this);
                tvClient.setText("Client: " + clientName);
                tvClient.setTextColor(Color.parseColor("#68747A"));
                tvClient.setTextSize(11);
                card.addView(tvClient);
            }

            TextView tvStatus = new TextView(this);
            tvStatus.setText(status.replace("_", " "));
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

            if ("PENDING".equals(status) || "APPROVED".equals(status)) {
                Button btnDecline = createSmallButton("Decline", Color.parseColor("#DC2626"));
                LinearLayout.LayoutParams dp = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                dp.setMarginStart(8);
                btnDecline.setLayoutParams(dp);
                btnDecline.setOnClickListener(v -> declineBookingDialog(bookingId, title));
                actionRow.addView(btnDecline);
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
        if (bookingsArray == null && projectsArray == null) return;

        boolean hasProjects = false;

        if (projectsArray != null && projectsArray.length() > 0) {
            for (int i = 0; i < projectsArray.length(); i++) {
                JSONObject project = projectsArray.optJSONObject(i);
                if (project == null) continue;
                JSONObject booking = project.optJSONObject("booking");
                String status = project.optString("status", "");
                if (booking != null && !booking.optString("status", "").isEmpty()) {
                    status = booking.optString("status", status);
                }
                if (status.isEmpty()) continue;
                hasProjects = true;

                final JSONObject finalProject = project;
                final String finalBookingId = booking != null ? booking.optString("id", "") : "";

                LinearLayout card = new LinearLayout(this);
                card.setOrientation(LinearLayout.VERTICAL);
                card.setPadding(14, 14, 14, 14);
                card.setBackgroundResource(R.drawable.bg_card);
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                lp.setMargins(0, 0, 0, 8);
                card.setLayoutParams(lp);
                card.setClickable(true);
                card.setOnClickListener(v -> showProjectDetailDialog(finalProject, finalBookingId));

                String title = booking != null ? booking.optString("title", project.optString("title", "Project")) : project.optString("title", "Project");

                TextView tvTitle = new TextView(this);
                tvTitle.setText(title);
                tvTitle.setTextColor(Color.parseColor("#101416"));
                tvTitle.setTextSize(14);
                tvTitle.setTypeface(null, Typeface.BOLD);
                card.addView(tvTitle);

                TextView tvInfo = new TextView(this);
                tvInfo.setText(status.replace("_", " "));
                tvInfo.setTextColor(getStatusColor(status));
                tvInfo.setTextSize(11);
                tvInfo.setTypeface(null, Typeface.BOLD);
                tvInfo.setPadding(0, 4, 0, 0);
                card.addView(tvInfo);

                String clientName = "";
                if (booking != null) {
                    JSONObject client = booking.optJSONObject("client");
                    if (client != null) clientName = client.optString("name", "");
                }
                if (!clientName.isEmpty()) {
                    TextView tvClient = new TextView(this);
                    tvClient.setText("Client: " + clientName);
                    tvClient.setTextColor(Color.parseColor("#68747A"));
                    tvClient.setTextSize(12);
                    tvClient.setPadding(0, 4, 0, 0);
                    card.addView(tvClient);
                }

                projectsListContainer.addView(card);
            }
        }

        if (!hasProjects) {
            for (int i = 0; i < bookingsArray.length(); i++) {
                JSONObject b = bookingsArray.optJSONObject(i);
                if (b == null) continue;
                String status = b.optString("status", "");
                if (!("APPROVED".equals(status) || "ASSIGNED".equals(status) || "IN_PROGRESS".equals(status) || "COMPLETED".equals(status))) continue;
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

                String techName = "Unassigned";
                JSONObject techObj = b.optJSONObject("assignedTo");
                if (techObj != null) techName = techObj.optString("name", "Unassigned");

                TextView tvInfo = new TextView(this);
                tvInfo.setText("Tech: " + techName + " • " + status.replace("_", " "));
                tvInfo.setTextColor(getStatusColor(status));
                tvInfo.setTextSize(11);
                tvInfo.setTypeface(null, Typeface.BOLD);
                tvInfo.setPadding(0, 4, 0, 0);
                card.addView(tvInfo);

                projectsListContainer.addView(card);
            }
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
            loadInventoryImage(iv, image);

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

    private void loadInventoryImage(ImageView iv, String image) {
        if (image == null || image.isEmpty()) {
            iv.setImageResource(android.R.drawable.ic_menu_gallery);
            return;
        }
        if (image.startsWith("data:image/")) {
            try {
                String b64 = image.substring(image.indexOf(',') + 1);
                byte[] raw = Base64.decode(b64, Base64.DEFAULT);
                Bitmap bmp = BitmapFactory.decodeByteArray(raw, 0, raw.length);
                if (bmp != null) {
                    iv.setImageBitmap(bmp);
                    return;
                }
            } catch (Exception ignored) {}
            iv.setImageResource(android.R.drawable.ic_menu_gallery);
            return;
        }
        if (image.startsWith("http://") || image.startsWith("https://")) {
            Glide.with(this).load(image).centerCrop().into(iv);
            return;
        }
        iv.setImageResource(android.R.drawable.ic_menu_gallery);
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
            card.setOrientation(LinearLayout.HORIZONTAL);
            card.setPadding(14, 14, 14, 14);
            card.setBackgroundResource(R.drawable.bg_card);
            card.setGravity(android.view.Gravity.CENTER_VERTICAL);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, 0, 6);
            card.setLayoutParams(lp);

            ImageView avatar = new ImageView(this);
            int avatarSize = (int) (40 * getResources().getDisplayMetrics().density);
            LinearLayout.LayoutParams avatarLp = new LinearLayout.LayoutParams(avatarSize, avatarSize);
            avatarLp.setMarginEnd(12);
            avatar.setLayoutParams(avatarLp);
            avatar.setScaleType(ImageView.ScaleType.CENTER_CROP);

            String profileUrl = tech.optString("profileImageUrl", "");
            if (!profileUrl.isEmpty() && !profileUrl.equals("null")) {
                com.bumptech.glide.Glide.with(this)
                        .load(profileUrl)
                        .placeholder(R.drawable.bg_avatar)
                        .error(R.drawable.bg_avatar)
                        .circleCrop()
                        .into(avatar);
            } else {
                avatar.setBackgroundResource(R.drawable.bg_avatar);
                avatar.setImageDrawable(null);
            }
            card.addView(avatar);

            LinearLayout textContainer = new LinearLayout(this);
            textContainer.setOrientation(LinearLayout.VERTICAL);
            textContainer.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));

            TextView tvName = new TextView(this);
            tvName.setText(tech.optString("name", "Tech"));
            tvName.setTextColor(Color.parseColor("#101416"));
            tvName.setTypeface(null, Typeface.BOLD);
            tvName.setTextSize(13);
            textContainer.addView(tvName);

            String spec = tech.optString("specialization", "");
            TextView tvEmail = new TextView(this);
            tvEmail.setText(spec.isEmpty() ? tech.optString("email", "") : tech.optString("email", "") + " • " + spec);
            tvEmail.setTextColor(Color.parseColor("#68747A"));
            tvEmail.setTextSize(12);
            textContainer.addView(tvEmail);

            card.addView(textContainer);

            String status = tech.optString("status", "ACTIVE");
            if ("SUSPENDED".equals(status)) {
                TextView tvBadge = new TextView(this);
                tvBadge.setText("Suspended");
                tvBadge.setTextSize(10);
                tvBadge.setTypeface(null, Typeface.BOLD);
                tvBadge.setTextColor(Color.WHITE);
                tvBadge.setBackgroundColor(Color.parseColor("#9CA3AF"));
                tvBadge.setPadding(12, 4, 12, 4);
                card.addView(tvBadge);
            }

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

    private void showProjectDetailDialog(JSONObject project, String bookingId) {
        JSONObject booking = project.optJSONObject("booking");
        String title = booking != null ? booking.optString("title", project.optString("title", "Project")) : project.optString("title", "Project");
        String status = project.optString("status", "");
        if (booking != null && !booking.optString("status", "").isEmpty()) {
            status = booking.optString("status", status);
        }

        String clientName = "";
        if (booking != null) {
            JSONObject client = booking.optJSONObject("client");
            if (client != null) clientName = client.optString("name", "");
        }

        StringBuilder team = new StringBuilder();
        JSONArray assignments = project.optJSONArray("assignments");
        if (assignments != null && assignments.length() > 0) {
            for (int i = 0; i < assignments.length(); i++) {
                JSONObject a = assignments.optJSONObject(i);
                JSONObject t = a != null ? a.optJSONObject("tech") : null;
                if (t != null) {
                    if (team.length() > 0) team.append("\n");
                    team.append("• ").append(t.optString("name"));
                }
            }
        } else {
            team.append("No technicians assigned");
        }

        AlertDialog.Builder builder = new AlertDialog.Builder(this)
                .setTitle(title)
                .setMessage("Status: " + status.replace("_", " ") + "\nClient: " + clientName + "\n\nProject Team:\n" + team)
                .setPositiveButton("Close", null);

        final String finalStatus = status;
        if (bookingId != null && !bookingId.isEmpty()) {
            builder.setNeutralButton("Add Technician", (dialog, which) -> showAddTechnicianDialog(bookingId, project));
            if ("APPROVED".equals(finalStatus)) {
                builder.setNegativeButton("Decline", (dialog, which) -> declineBookingDialog(bookingId, title));
            }
        }
        builder.show();
    }

    private void showAddTechnicianDialog(String bookingId, JSONObject project) {
        if (techniciansArray == null || techniciansArray.length() == 0) {
            Toast.makeText(this, "No technicians available", Toast.LENGTH_LONG).show();
            return;
        }
        JSONArray assignments = project.optJSONArray("assignments");
        List<String> names = new ArrayList<>();
        List<String> ids = new ArrayList<>();
        for (int i = 0; i < techniciansArray.length(); i++) {
            JSONObject t = techniciansArray.optJSONObject(i);
            if (t == null) continue;
            String id = t.optString("id");
            boolean already = false;
            if (assignments != null) {
                for (int j = 0; j < assignments.length(); j++) {
                    JSONObject a = assignments.optJSONObject(j);
                    JSONObject tech = a != null ? a.optJSONObject("tech") : null;
                    if (tech != null && id.equals(tech.optString("id"))) {
                        already = true;
                        break;
                    }
                }
            }
            if (already) continue;
            names.add(t.optString("name") + " (" + t.optString("email") + ")");
            ids.add(id);
        }
        if (ids.isEmpty()) {
            Toast.makeText(this, "All available technicians are already on the team", Toast.LENGTH_LONG).show();
            return;
        }
        new AlertDialog.Builder(this)
                .setTitle("Add Technician to Project")
                .setItems(names.toArray(new String[0]), (dialog, which) -> addTechnicianToProject(bookingId, ids.get(which)))
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void addTechnicianToProject(String bookingId, String techId) {
        new Thread(() -> {
            try {
                JSONObject json = new JSONObject();
                json.put("action", "add_technician");
                json.put("bookingId", bookingId);
                json.put("assignToId", techId);
                ApiClient.post("/admin", json.toString());
                runOnUiThread(() -> {
                    Toast.makeText(this, "Technician Added to Project", Toast.LENGTH_SHORT).show();
                    loadDashboardData();
                });
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "Add technician failed", Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    private void declineBookingDialog(String bookingId, String title) {
        new AlertDialog.Builder(this)
                .setTitle("Decline Booking")
                .setMessage("Decline \"" + title + "\"? The client will be notified that the booking was declined.")
                .setPositiveButton("Decline", (dialog, which) -> declineBooking(bookingId))
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void declineBooking(String bookingId) {
        new Thread(() -> {
            try {
                JSONObject json = new JSONObject();
                json.put("action", "decline");
                json.put("bookingId", bookingId);
                ApiClient.post("/admin", json.toString());
                runOnUiThread(() -> {
                    Toast.makeText(this, "Booking Declined", Toast.LENGTH_SHORT).show();
                    loadDashboardData();
                });
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "Decline failed", Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    private void showAssignTechFlow() {
        if (bookingsArray == null || bookingsArray.length() == 0) {
            Toast.makeText(this, "No bookings to assign", Toast.LENGTH_SHORT).show();
            return;
        }
        List<String> names = new ArrayList<>();
        List<String> ids = new ArrayList<>();
        for (int i = 0; i < bookingsArray.length(); i++) {
            JSONObject b = bookingsArray.optJSONObject(i);
            if (b == null) continue;
            if (b.optString("assignedToId", "").isEmpty()) {
                String status = b.optString("status", "PENDING");
                if ("PENDING".equals(status) || "APPROVED".equals(status)) {
                    names.add(b.optString("title", "Booking") + " (" + status + ")");
                    ids.add(b.optString("id"));
                }
            }
        }
        if (ids.isEmpty()) {
            Toast.makeText(this, "No unassigned bookings", Toast.LENGTH_LONG).show();
            return;
        }
        new AlertDialog.Builder(this)
                .setTitle("Select Booking")
                .setItems(names.toArray(new String[0]), (dialog, which) -> showAssignTechDialog(ids.get(which), names.get(which)))
                .setNegativeButton("Cancel", null)
                .show();
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

    // === QUICK ACTIONS ===

    private void showAddClientDialog() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(40, 20, 40, 20);

        final EditText etName = new EditText(this);
        etName.setHint("Client Name");
        layout.addView(etName);

        final EditText etEmail = new EditText(this);
        etEmail.setHint("Email Address");
        etEmail.setInputType(android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        layout.addView(etEmail);

        final EditText etPass = new EditText(this);
        etPass.setHint("Password (e.g. client123)");
        layout.addView(etPass);

        new AlertDialog.Builder(this)
                .setTitle("Add Client Account")
                .setView(layout)
                .setPositiveButton("Create", (dialog, which) -> {
                    String name = etName.getText().toString().trim();
                    String email = etEmail.getText().toString().trim();
                    String pass = etPass.getText().toString().trim();
                    if (!name.isEmpty() && !email.isEmpty()) {
                        createUser(name, email, pass.isEmpty() ? "client123" : pass, "CLIENT");
                    } else {
                        Toast.makeText(this, "Enter name and email", Toast.LENGTH_SHORT).show();
                    }
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void showNewBookingDialog() {
        if (clientsArray == null || clientsArray.length() == 0) {
            Toast.makeText(this, "No clients yet. Add a client first.", Toast.LENGTH_LONG).show();
            return;
        }
        final String[] clientNames = new String[clientsArray.length()];
        final String[] clientIds = new String[clientsArray.length()];
        for (int i = 0; i < clientsArray.length(); i++) {
            JSONObject c = clientsArray.optJSONObject(i);
            clientNames[i] = (c != null ? c.optString("name", "Client") : "Client") + " (" + (c != null ? c.optString("email", "") : "") + ")";
            clientIds[i] = c != null ? c.optString("id") : "";
        }

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(40, 20, 40, 20);

        final EditText etClient = new EditText(this);
        etClient.setText(clientNames[0]);
        etClient.setFocusable(false);
        etClient.setClickable(true);
        etClient.setOnClickListener(v -> new AlertDialog.Builder(this)
                .setTitle("Select Client")
                .setItems(clientNames, (d, which) -> etClient.setText(clientNames[which]))
                .show());
        layout.addView(etClient);

        final EditText etTitle = new EditText(this);
        etTitle.setHint("Service / Project Title");
        layout.addView(etTitle);

        final EditText etDescription = new EditText(this);
        etDescription.setHint("Description");
        etDescription.setMinLines(2);
        layout.addView(etDescription);

        final EditText etStart = new EditText(this);
        etStart.setHint("Start Date (YYYY-MM-DD, optional)");
        layout.addView(etStart);

        final EditText etEnd = new EditText(this);
        etEnd.setHint("End Date (YYYY-MM-DD, optional)");
        layout.addView(etEnd);

        new AlertDialog.Builder(this)
                .setTitle("New Booking")
                .setView(layout)
                .setPositiveButton("Create", (dialog, which) -> {
                    String title = etTitle.getText().toString().trim();
                    if (title.isEmpty()) {
                        Toast.makeText(this, "Enter a booking title", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    String description = etDescription.getText().toString().trim();
                    String startDate = parseDate(etStart.getText().toString().trim());
                    String endDate = parseDate(etEnd.getText().toString().trim());
                    final String selectedClientId = clientIds[indexOf(clientNames, etClient.getText().toString())];
                    createBooking(selectedClientId, title, description, startDate, endDate);
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private int indexOf(String[] arr, String value) {
        if (value == null) return 0;
        for (int i = 0; i < arr.length; i++) if (value.equals(arr[i])) return i;
        return 0;
    }

    private String parseDate(String value) {
        if (value == null || value.isEmpty()) return null;
        try {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            Date date = sdf.parse(value);
            if (date != null) {
                SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                return iso.format(date);
            }
        } catch (Exception ignored) {}
        return null;
    }

    private void createBooking(String clientId, String title, String description, String startDate, String endDate) {
        new Thread(() -> {
            try {
                JSONObject json = new JSONObject();
                json.put("clientId", clientId);
                json.put("title", title);
                if (!description.isEmpty()) json.put("description", description);
                if (startDate != null) json.put("startDate", startDate);
                if (endDate != null) json.put("endDate", endDate);
                ApiClient.post("/bookings", json.toString());
                runOnUiThread(() -> {
                    Toast.makeText(this, "Booking Created", Toast.LENGTH_SHORT).show();
                    loadDashboardData();
                });
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "Failed to create booking", Toast.LENGTH_SHORT).show());
            }
        }).start();
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
        btnCapture.setText("Capture Photo");
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

    // === USER ACCOUNTS ===

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
                        createUser(name, email, pass.isEmpty() ? "tech123" : pass, "TECH");
                    } else {
                        Toast.makeText(this, "Enter name and email", Toast.LENGTH_SHORT).show();
                    }
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void createUser(String name, String email, String password, String role) {
        new Thread(() -> {
            try {
                JSONObject json = new JSONObject();
                json.put("action", "create_user");
                json.put("name", name);
                json.put("email", email);
                json.put("password", password);
                json.put("role", role);
                ApiClient.post("/admin", json.toString());
                runOnUiThread(() -> {
                    Toast.makeText(this, "Account created (" + role + ")", Toast.LENGTH_SHORT).show();
                    loadDashboardData();
                });
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "Failed to create account", Toast.LENGTH_SHORT).show());
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
        return createSmallButton(text, Color.parseColor("#0B0F10"), R.drawable.bg_action_yellow);
    }

    private Button createSmallButton(String text, int textColor) {
        return createSmallButton(text, textColor, R.drawable.bg_action_outline);
    }

    private Button createSmallButton(String text, int textColor, int backgroundRes) {
        Button btn = new Button(this);
        btn.setText(text);
        btn.setTextSize(11);
        btn.setBackgroundResource(backgroundRes);
        btn.setTextColor(textColor);
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