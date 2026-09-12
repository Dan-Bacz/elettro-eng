package com.elettro.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.view.Gravity;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.util.Base64;
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
import androidx.drawerlayout.widget.DrawerLayout;

import com.bumptech.glide.Glide;
import com.elettro.app.network.ApiClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

public class AdminDashboardActivity extends AppCompatActivity {
    private DrawerLayout drawerLayout;
    private ImageButton menuButton;
    private ImageButton btnRefresh;
    private Button logoutButton;

    // Titles
    private TextView sectionTitle;
    private TextView sectionSubtitle;

    // Stats Views
    private TextView totalBookingsVal;
    private TextView pendingVal;
    private TextView totalInventoryVal;
    private TextView lowStockVal;
    private TextView techniciansVal;
    private TextView clientsVal;

    // Containers
    private View viewDashboard;
    private View viewBookings;
    private View viewProjects;
    private View viewRegistrations;
    private View viewInventory;
    private View viewTechnicians;
    private View viewClients;
    private View viewReports;
    private View viewNotifications;
    private View viewSettings;

    private LinearLayout recentBookingsContainer;
    private LinearLayout bookingsListContainer;
    private LinearLayout projectsListContainer;
    private LinearLayout registrationsListContainer;
    private LinearLayout inventoryListContainer;
    private LinearLayout techniciansListContainer;
    private LinearLayout clientsListContainer;
    private LinearLayout reportsListContainer;
    private LinearLayout notificationsListContainer;

    // Action Buttons
    private Button btnAddInventoryItem;
    private Button btnAddTechnician;
    private TextView btnGotoBookings;

    // Camera capture
    private static final int REQ_CAMERA = 1001;
    private static final int REQ_CAMERA_PERMISSION = 1002;
    private Uri capturedImageUri;
    private String capturedImageBase64;
    private ImageView inventoryPhotoPreview;
    private TextView inventoryPhotoStatus;

    // Nav TextViews
    private TextView navDashboard;
    private TextView navBookings;
    private TextView navProjects;
    private TextView navRegistrations;
    private TextView navInventory;
    private TextView navTechnicians;
    private TextView navClients;
    private TextView navReports;
    private TextView navNotifications;
    private TextView navSettings;

    // Filter Buttons
    private Button filterAll, filterPending, filterApproved, filterAssigned, filterCompleted;
    private String currentBookingFilter = "ALL";

    // Cached Data
    private JSONObject dashboardData;
    private JSONArray bookingsArray;
    private JSONArray inventoryArray;
    private JSONArray techniciansArray;
    private JSONArray clientsArray;
    private JSONArray reportsArray;
    private JSONArray pendingUsersArray;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_admin_dashboard);

        bindViews();
        setupSidebarNavigation();
        setupActionButtons();

        switchSection("dashboard", "Dashboard Overview", "Operations and real-time database metrics");

        String token = getSharedPreferences("elettro_login", MODE_PRIVATE).getString(MainActivity.KEY_TOKEN, "");
        ApiClient.setAuthToken(token);

        loadDashboardData();
    }

    private void bindViews() {
        drawerLayout = findViewById(R.id.admin_drawer_layout);
        menuButton = findViewById(R.id.menu_button);
        btnRefresh = findViewById(R.id.btn_refresh);
        logoutButton = findViewById(R.id.logout_button);

        sectionTitle = findViewById(R.id.section_title);
        sectionSubtitle = findViewById(R.id.section_subtitle);

        totalBookingsVal = findViewById(R.id.total_bookings_value);
        pendingVal = findViewById(R.id.pending_value);
        totalInventoryVal = findViewById(R.id.total_inventory_value);
        lowStockVal = findViewById(R.id.low_stock_value);
        techniciansVal = findViewById(R.id.technicians_value);
        clientsVal = findViewById(R.id.clients_value);

        viewDashboard = findViewById(R.id.view_dashboard_section);
        viewBookings = findViewById(R.id.view_bookings_section);
        viewProjects = findViewById(R.id.view_projects_section);
        viewRegistrations = findViewById(R.id.view_registrations_section);
        viewInventory = findViewById(R.id.view_inventory_section);
        viewTechnicians = findViewById(R.id.view_technicians_section);
        viewClients = findViewById(R.id.view_clients_section);
        viewReports = findViewById(R.id.view_reports_section);
        viewNotifications = findViewById(R.id.view_notifications_section);
        viewSettings = findViewById(R.id.view_settings_section);

        navDashboard = findViewById(R.id.nav_dashboard);
        navBookings = findViewById(R.id.nav_bookings);
        navProjects = findViewById(R.id.nav_projects);
        navRegistrations = findViewById(R.id.nav_registrations);
        navInventory = findViewById(R.id.nav_inventory);
        navTechnicians = findViewById(R.id.nav_technicians);
        navClients = findViewById(R.id.nav_clients);
        navReports = findViewById(R.id.nav_reports);
        navNotifications = findViewById(R.id.nav_notifications);
        navSettings = findViewById(R.id.nav_settings);

        recentBookingsContainer = findViewById(R.id.recent_bookings_container);
        bookingsListContainer = findViewById(R.id.bookings_list_container);
        projectsListContainer = findViewById(R.id.projects_list_container);
        registrationsListContainer = findViewById(R.id.registrations_list_container);
        inventoryListContainer = findViewById(R.id.inventory_list_container);
        techniciansListContainer = findViewById(R.id.technicians_list_container);
        clientsListContainer = findViewById(R.id.clients_list_container);
        reportsListContainer = findViewById(R.id.reports_list_container);
        notificationsListContainer = findViewById(R.id.notifications_list_container);

        btnAddInventoryItem = findViewById(R.id.btn_add_inventory_item);
        btnAddTechnician = findViewById(R.id.btn_add_technician);
        btnGotoBookings = findViewById(R.id.btn_goto_bookings);

        filterAll = findViewById(R.id.filter_all);
        filterPending = findViewById(R.id.filter_pending);
        filterApproved = findViewById(R.id.filter_approved);
        filterAssigned = findViewById(R.id.filter_assigned);
        filterCompleted = findViewById(R.id.filter_completed);
    }

    private void setupSidebarNavigation() {
        menuButton.setOnClickListener(v -> {
            View sidebar = findViewById(R.id.admin_sidebar);
            if (drawerLayout.isDrawerOpen(sidebar)) {
                drawerLayout.closeDrawer(sidebar);
            } else {
                drawerLayout.openDrawer(sidebar);
            }
        });

        btnRefresh.setOnClickListener(v -> {
            Toast.makeText(this, "Refreshing database data...", Toast.LENGTH_SHORT).show();
            loadDashboardData();
        });

        logoutButton.setOnClickListener(v -> {
            getSharedPreferences("elettro_login", MODE_PRIVATE).edit().remove(MainActivity.KEY_TOKEN).apply();
            ApiClient.setAuthToken("");
            Toast.makeText(this, "Signed Out", Toast.LENGTH_SHORT).show();
            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            finish();
        });

        navDashboard.setOnClickListener(v -> switchSection("dashboard", "Dashboard Overview", "Operations and real-time database metrics"));
        navBookings.setOnClickListener(v -> switchSection("bookings", "Inquiry & Bookings", "Verify client requests and manage booking lifecycle"));
        navProjects.setOnClickListener(v -> switchSection("projects", "Active Projects", "Assigned electrical installation & maintenance jobs"));
        navRegistrations.setOnClickListener(v -> switchSection("registrations", "Pending Registrations", "Review technician account registration requests"));
        navInventory.setOnClickListener(v -> switchSection("inventory", "Inventory & Materials", "Monitor equipment stock and material catalog"));
        navTechnicians.setOnClickListener(v -> switchSection("technicians", "Technician Personnel", "Manage field engineers and job assignments"));
        navClients.setOnClickListener(v -> switchSection("clients", "Client Directory", "Client profiles and booking histories"));
        navReports.setOnClickListener(v -> switchSection("reports", "Diagnostic Reports", "Field inspection findings & job completion logs"));
        navNotifications.setOnClickListener(v -> switchSection("notifications", "Alerts & Notifications", "Pending inquiries and inventory warnings"));
        navSettings.setOnClickListener(v -> switchSection("settings", "System Settings", "Organization configuration & preferences"));
    }

    private void updateNavHighlight(TextView navItem, boolean isActive) {
        if (navItem == null) return;
        if (isActive) {
            navItem.setBackgroundResource(R.drawable.bg_action_yellow);
            navItem.setTextColor(Color.parseColor("#0B0F10"));
            navItem.setTypeface(null, Typeface.BOLD);
        } else {
            navItem.setBackgroundResource(0);
            navItem.setTextColor(Color.parseColor("#FFFFFF"));
            navItem.setTypeface(null, Typeface.NORMAL);
        }
    }

    private void switchSection(String sectionKey, String title, String subtitle) {
        sectionTitle.setText(title);
        sectionSubtitle.setText(subtitle);

        viewDashboard.setVisibility("dashboard".equals(sectionKey) ? View.VISIBLE : View.GONE);
        viewBookings.setVisibility("bookings".equals(sectionKey) ? View.VISIBLE : View.GONE);
        viewProjects.setVisibility("projects".equals(sectionKey) ? View.VISIBLE : View.GONE);
        viewRegistrations.setVisibility("registrations".equals(sectionKey) ? View.VISIBLE : View.GONE);
        viewInventory.setVisibility("inventory".equals(sectionKey) ? View.VISIBLE : View.GONE);
        viewTechnicians.setVisibility("technicians".equals(sectionKey) ? View.VISIBLE : View.GONE);
        viewClients.setVisibility("clients".equals(sectionKey) ? View.VISIBLE : View.GONE);
        viewReports.setVisibility("reports".equals(sectionKey) ? View.VISIBLE : View.GONE);
        viewNotifications.setVisibility("notifications".equals(sectionKey) ? View.VISIBLE : View.GONE);
        viewSettings.setVisibility("settings".equals(sectionKey) ? View.VISIBLE : View.GONE);

        updateNavHighlight(navDashboard, "dashboard".equals(sectionKey));
        updateNavHighlight(navBookings, "bookings".equals(sectionKey));
        updateNavHighlight(navProjects, "projects".equals(sectionKey));
        updateNavHighlight(navRegistrations, "registrations".equals(sectionKey));
        updateNavHighlight(navInventory, "inventory".equals(sectionKey));
        updateNavHighlight(navTechnicians, "technicians".equals(sectionKey));
        updateNavHighlight(navClients, "clients".equals(sectionKey));
        updateNavHighlight(navReports, "reports".equals(sectionKey));
        updateNavHighlight(navNotifications, "notifications".equals(sectionKey));
        updateNavHighlight(navSettings, "settings".equals(sectionKey));

        View sidebar = findViewById(R.id.admin_sidebar);
        if (drawerLayout.isDrawerOpen(sidebar)) {
            drawerLayout.closeDrawer(sidebar);
        }
    }

    private void setupActionButtons() {
        btnGotoBookings.setOnClickListener(v -> switchSection("bookings", "Inquiry & Bookings", "Verify client requests and manage booking lifecycle"));

        btnAddInventoryItem.setOnClickListener(v -> showAddInventoryDialog());
        btnAddTechnician.setOnClickListener(v -> showAddTechnicianDialog());

        filterAll.setOnClickListener(v -> { currentBookingFilter = "ALL"; renderBookingsList(); });
        filterPending.setOnClickListener(v -> { currentBookingFilter = "PENDING"; renderBookingsList(); });
        filterApproved.setOnClickListener(v -> { currentBookingFilter = "APPROVED"; renderBookingsList(); });
        filterAssigned.setOnClickListener(v -> { currentBookingFilter = "ASSIGNED"; renderBookingsList(); });
        filterCompleted.setOnClickListener(v -> { currentBookingFilter = "COMPLETED"; renderBookingsList(); });
    }

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
                runOnUiThread(() -> Toast.makeText(this, "Unable to load database data", Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    private void renderAllSections() {
        if (dashboardData == null) return;

        JSONObject stats = dashboardData.optJSONObject("stats");
        if (stats != null) {
            totalBookingsVal.setText(String.valueOf(stats.optInt("totalBookings")));
            pendingVal.setText(String.valueOf(stats.optInt("pending")));
            totalInventoryVal.setText(String.valueOf(stats.optInt("totalInventory")));
            lowStockVal.setText(String.valueOf(stats.optInt("lowStock")));
            techniciansVal.setText(String.valueOf(stats.optInt("technicians")));
            clientsVal.setText(String.valueOf(stats.optInt("clients")));
        }

        renderRecentBookings();
        renderBookingsList();
        renderProjectsList();
        renderRegistrationsList();
        renderInventoryList();
        renderTechniciansList();
        renderClientsList();
        renderReportsList();
        renderNotificationsList();
    }

    private void renderRecentBookings() {
        recentBookingsContainer.removeAllViews();
        if (bookingsArray == null || bookingsArray.length() == 0) {
            TextView tv = new TextView(this);
            tv.setText("No recent inquiries recorded.");
            tv.setTextColor(Color.GRAY);
            recentBookingsContainer.addView(tv);
            return;
        }

        int count = Math.min(5, bookingsArray.length());
        for (int i = 0; i < count; i++) {
            JSONObject b = bookingsArray.optJSONObject(i);
            if (b == null) continue;

            TextView tv = new TextView(this);
            tv.setText(b.optString("title", "Service Request") + " • " + b.optString("status", "PENDING"));
            tv.setTextColor(Color.parseColor("#101416"));
            tv.setTypeface(null, Typeface.BOLD);
            tv.setTextSize(13);
            tv.setPadding(0, 12, 0, 12);
            recentBookingsContainer.addView(tv);
        }
    }

    private void renderBookingsList() {
        bookingsListContainer.removeAllViews();
        if (bookingsArray == null || bookingsArray.length() == 0) {
            TextView tv = new TextView(this);
            tv.setText("No bookings found.");
            tv.setTextColor(Color.GRAY);
            bookingsListContainer.addView(tv);
            return;
        }

        for (int i = 0; i < bookingsArray.length(); i++) {
            JSONObject b = bookingsArray.optJSONObject(i);
            if (b == null) continue;

            String status = b.optString("status", "PENDING");
            if (!"ALL".equals(currentBookingFilter) && !status.equalsIgnoreCase(currentBookingFilter)) {
                continue;
            }

            String bookingId = b.optString("id");
            String title = b.optString("title", "Booking Request");

            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(16, 16, 16, 16);
            card.setBackgroundResource(R.drawable.bg_dashboard_card);
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            params.setMargins(0, 0, 0, 14);
            card.setLayoutParams(params);

            TextView tvTitle = new TextView(this);
            tvTitle.setText(title);
            tvTitle.setTextColor(Color.parseColor("#101416"));
            tvTitle.setTextSize(15);
            tvTitle.setTypeface(null, Typeface.BOLD);
            card.addView(tvTitle);

            TextView tvStatus = new TextView(this);
            tvStatus.setText("Status: " + status);
            tvStatus.setTextColor("PENDING".equals(status) ? Color.parseColor("#D97706") : Color.parseColor("#2563EB"));
            tvStatus.setTextSize(12);
            tvStatus.setPadding(0, 4, 0, 10);
            card.addView(tvStatus);

            LinearLayout actionRow = new LinearLayout(this);
            actionRow.setOrientation(LinearLayout.HORIZONTAL);

            if ("PENDING".equals(status)) {
                Button btnApprove = new Button(this);
                btnApprove.setText("Verify & Approve");
                btnApprove.setTextSize(11);
                btnApprove.setBackgroundResource(R.drawable.bg_action_yellow);
                btnApprove.setTextColor(Color.parseColor("#0B0F10"));
                btnApprove.setOnClickListener(v -> approveBooking(bookingId));
                actionRow.addView(btnApprove);
            }

            Button btnAssign = new Button(this);
            btnAssign.setText("Assign Tech");
            btnAssign.setTextSize(11);
            btnAssign.setBackgroundResource(R.drawable.bg_action_yellow);
            btnAssign.setTextColor(Color.parseColor("#0B0F10"));
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            p.setMarginStart(12);
            btnAssign.setLayoutParams(p);
            btnAssign.setOnClickListener(v -> showAssignTechDialog(bookingId, title));
            actionRow.addView(btnAssign);

            card.addView(actionRow);
            bookingsListContainer.addView(card);
        }
    }

    private void renderProjectsList() {
        projectsListContainer.removeAllViews();
        if (bookingsArray == null) return;

        for (int i = 0; i < bookingsArray.length(); i++) {
            JSONObject b = bookingsArray.optJSONObject(i);
            if (b == null) continue;

            String status = b.optString("status", "");
            if ("ASSIGNED".equals(status) || "IN_PROGRESS".equals(status) || "COMPLETED".equals(status)) {
                LinearLayout card = new LinearLayout(this);
                card.setOrientation(LinearLayout.VERTICAL);
                card.setPadding(16, 16, 16, 16);
                card.setBackgroundResource(R.drawable.bg_dashboard_card);
                LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                params.setMargins(0, 0, 0, 12);
                card.setLayoutParams(params);

                TextView tvTitle = new TextView(this);
                tvTitle.setText(b.optString("title"));
                tvTitle.setTextColor(Color.parseColor("#101416"));
                tvTitle.setTextSize(15);
                tvTitle.setTypeface(null, Typeface.BOLD);
                card.addView(tvTitle);

                JSONObject techObj = b.optJSONObject("assignedTo");
                String techName = techObj != null ? techObj.optString("name", "Assigned Tech") : "Lead Technician";

                TextView tvInfo = new TextView(this);
                tvInfo.setText("Lead Tech: " + techName + " • " + status);
                tvInfo.setTextColor(Color.parseColor("#68747A"));
                tvInfo.setTextSize(12);
                tvInfo.setPadding(0, 4, 0, 0);
                card.addView(tvInfo);

                projectsListContainer.addView(card);
            }
        }
    }

    private void renderRegistrationsList() {
        registrationsListContainer.removeAllViews();
        if (pendingUsersArray == null || pendingUsersArray.length() == 0) {
            TextView tv = new TextView(this);
            tv.setText("No pending technician registrations.");
            tv.setTextColor(Color.GRAY);
            tv.setPadding(0, 12, 0, 12);
            registrationsListContainer.addView(tv);
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
            card.setPadding(16, 16, 16, 16);
            card.setBackgroundResource(R.drawable.bg_dashboard_card);
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            params.setMargins(0, 0, 0, 14);
            card.setLayoutParams(params);

            TextView tvName = new TextView(this);
            tvName.setText(name);
            tvName.setTextColor(Color.parseColor("#101416"));
            tvName.setTextSize(15);
            tvName.setTypeface(null, Typeface.BOLD);
            card.addView(tvName);

            TextView tvEmail = new TextView(this);
            tvEmail.setText(email + (phone.isEmpty() ? "" : " • " + phone));
            tvEmail.setTextColor(Color.parseColor("#68747A"));
            tvEmail.setTextSize(12);
            tvEmail.setPadding(0, 4, 0, 8);
            card.addView(tvEmail);

            TextView tvPending = new TextView(this);
            tvPending.setText("Status: PENDING APPROVAL");
            tvPending.setTextColor(Color.parseColor("#D97706"));
            tvPending.setTextSize(11);
            tvPending.setTypeface(null, Typeface.BOLD);
            tvPending.setPadding(0, 0, 0, 10);
            card.addView(tvPending);

            LinearLayout actionRow = new LinearLayout(this);
            actionRow.setOrientation(LinearLayout.HORIZONTAL);

            Button btnApprove = new Button(this);
            btnApprove.setText("Approve");
            btnApprove.setTextSize(11);
            btnApprove.setBackgroundResource(R.drawable.bg_action_yellow);
            btnApprove.setTextColor(Color.parseColor("#0B0F10"));
            btnApprove.setOnClickListener(v -> approveUser(userId));
            actionRow.addView(btnApprove);

            Button btnReject = new Button(this);
            btnReject.setText("Reject");
            btnReject.setTextSize(11);
            btnReject.setBackgroundResource(R.drawable.bg_action_red);
            btnReject.setTextColor(Color.WHITE);
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            p.setMarginStart(12);
            btnReject.setLayoutParams(p);
            btnReject.setOnClickListener(v -> rejectUser(userId));
            actionRow.addView(btnReject);

            card.addView(actionRow);
            registrationsListContainer.addView(card);
        }
    }

    private void approveUser(String userId) {
        new Thread(() -> {
            try {
                JSONObject json = new JSONObject();
                json.put("action", "approve_user");
                json.put("userId", userId);
                ApiClient.post("/admin", json.toString());
                runOnUiThread(() -> {
                    Toast.makeText(this, "Technician Registration Approved", Toast.LENGTH_SHORT).show();
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
                .setMessage("Are you sure you want to reject this technician registration? The account will be removed.")
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

    private void renderInventoryList() {
        inventoryListContainer.removeAllViews();
        if (inventoryArray == null || inventoryArray.length() == 0) return;

        for (int i = 0; i < inventoryArray.length(); i++) {
            JSONObject inv = inventoryArray.optJSONObject(i);
            if (inv == null) continue;

            LinearLayout itemLayout = new LinearLayout(this);
            itemLayout.setOrientation(LinearLayout.HORIZONTAL);
            itemLayout.setGravity(Gravity.CENTER_VERTICAL);
            itemLayout.setPadding(14, 14, 14, 14);
            itemLayout.setBackgroundResource(R.drawable.bg_dashboard_card);
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            params.setMargins(0, 0, 0, 10);
            itemLayout.setLayoutParams(params);

            ImageView iv = new ImageView(this);
            int size = (int) (64 * getResources().getDisplayMetrics().density);
            LinearLayout.LayoutParams ivParams = new LinearLayout.LayoutParams(size, size);
            ivParams.setMarginEnd(12);
            iv.setLayoutParams(ivParams);
            iv.setScaleType(ImageView.ScaleType.CENTER_CROP);
            iv.setBackgroundResource(R.drawable.bg_dashboard_card);
            itemLayout.addView(iv);

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
            tvName.setText(inv.optString("name"));
            tvName.setTextColor(Color.parseColor("#101416"));
            tvName.setTypeface(null, Typeface.BOLD);
            textCol.addView(tvName);

            TextView tvDetail = new TextView(this);
            tvDetail.setText("Category: " + inv.optString("category", "General") + " • Quantity: " + inv.optInt("quantity") + " " + inv.optString("unit", "pcs"));
            tvDetail.setTextColor(Color.parseColor("#68747A"));
            tvDetail.setTextSize(12);
            textCol.addView(tvDetail);

            itemLayout.addView(textCol);
            inventoryListContainer.addView(itemLayout);
        }
    }

    private void renderTechniciansList() {
        techniciansListContainer.removeAllViews();
        if (techniciansArray == null || techniciansArray.length() == 0) return;

        for (int i = 0; i < techniciansArray.length(); i++) {
            JSONObject tech = techniciansArray.optJSONObject(i);
            if (tech == null) continue;

            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(14, 14, 14, 14);
            card.setBackgroundResource(R.drawable.bg_dashboard_card);
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            params.setMargins(0, 0, 0, 10);
            card.setLayoutParams(params);

            TextView tvName = new TextView(this);
            tvName.setText(tech.optString("name"));
            tvName.setTextColor(Color.parseColor("#101416"));
            tvName.setTypeface(null, Typeface.BOLD);
            card.addView(tvName);

            TextView tvEmail = new TextView(this);
            tvEmail.setText(tech.optString("email"));
            tvEmail.setTextColor(Color.parseColor("#68747A"));
            tvEmail.setTextSize(12);
            card.addView(tvEmail);

            techniciansListContainer.addView(card);
        }
    }

    private void renderClientsList() {
        clientsListContainer.removeAllViews();
        if (clientsArray == null || clientsArray.length() == 0) return;

        for (int i = 0; i < clientsArray.length(); i++) {
            JSONObject client = clientsArray.optJSONObject(i);
            if (client == null) continue;

            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(14, 14, 14, 14);
            card.setBackgroundResource(R.drawable.bg_dashboard_card);
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            params.setMargins(0, 0, 0, 10);
            card.setLayoutParams(params);

            TextView tvName = new TextView(this);
            tvName.setText(client.optString("name"));
            tvName.setTextColor(Color.parseColor("#101416"));
            tvName.setTypeface(null, Typeface.BOLD);
            card.addView(tvName);

            TextView tvEmail = new TextView(this);
            tvEmail.setText(client.optString("email"));
            tvEmail.setTextColor(Color.parseColor("#68747A"));
            tvEmail.setTextSize(12);
            card.addView(tvEmail);

            clientsListContainer.addView(card);
        }
    }

    private void renderReportsList() {
        reportsListContainer.removeAllViews();
        if (reportsArray == null || reportsArray.length() == 0) {
            TextView tv = new TextView(this);
            tv.setText("No diagnostic site reports recorded.");
            tv.setTextColor(Color.GRAY);
            reportsListContainer.addView(tv);
            return;
        }

        for (int i = 0; i < reportsArray.length(); i++) {
            JSONObject r = reportsArray.optJSONObject(i);
            if (r == null) continue;

            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(14, 14, 14, 14);
            card.setBackgroundResource(R.drawable.bg_dashboard_card);
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            params.setMargins(0, 0, 0, 10);
            card.setLayoutParams(params);

            TextView tvContent = new TextView(this);
            tvContent.setText(r.optString("content"));
            tvContent.setTextColor(Color.parseColor("#101416"));
            tvContent.setTextSize(13);
            card.addView(tvContent);

            reportsListContainer.addView(card);
        }
    }

    private void renderNotificationsList() {
        notificationsListContainer.removeAllViews();
        if (dashboardData == null) return;

        if (pendingUsersArray != null) {
            for (int i = 0; i < pendingUsersArray.length(); i++) {
                JSONObject u = pendingUsersArray.optJSONObject(i);
                if (u == null) continue;

                TextView tv = new TextView(this);
                tv.setText("New Technician Registration: " + u.optString("name") + " (" + u.optString("email") + ") is pending approval.");
                tv.setTextColor(Color.parseColor("#7C3AED"));
                tv.setPadding(14, 14, 14, 14);
                tv.setBackgroundResource(R.drawable.bg_dashboard_card);
                LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                params.setMargins(0, 0, 0, 10);
                tv.setLayoutParams(params);
                notificationsListContainer.addView(tv);
            }
        }

        JSONArray alerts = dashboardData.optJSONArray("inventoryAlerts");
        if (alerts != null) {
            for (int i = 0; i < alerts.length(); i++) {
                JSONObject inv = alerts.optJSONObject(i);
                if (inv == null) continue;

                TextView tv = new TextView(this);
                tv.setText("Low Stock Alert: " + inv.optString("name") + " has only " + inv.optInt("quantity") + " units remaining.");
                tv.setTextColor(Color.parseColor("#DC2626"));
                tv.setPadding(14, 14, 14, 14);
                tv.setBackgroundResource(R.drawable.bg_dashboard_card);
                notificationsListContainer.addView(tv);
            }
        }
    }

    private void approveBooking(String bookingId) {
        new Thread(() -> {
            try {
                JSONObject json = new JSONObject();
                json.put("action", "approve");
                json.put("bookingId", bookingId);
                ApiClient.post("/admin", json.toString());
                runOnUiThread(() -> {
                    Toast.makeText(this, "Inquiry Verified & Approved", Toast.LENGTH_SHORT).show();
                    loadDashboardData();
                });
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "Approval failed", Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    private void showAssignTechDialog(String bookingId, String bookingTitle) {
        if (techniciansArray == null || techniciansArray.length() == 0) {
            Toast.makeText(this, "No technicians available to assign", Toast.LENGTH_LONG).show();
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
                .setTitle("Assign Tech for: " + bookingTitle)
                .setItems(names.toArray(new String[0]), (dialog, which) -> {
                    String selectedTechId = ids.get(which);
                    assignTechToBooking(bookingId, selectedTechId);
                })
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
                    Toast.makeText(this, "Technician Assigned Successfully", Toast.LENGTH_SHORT).show();
                    loadDashboardData();
                });
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "Assignment failed", Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

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
        btnCapture.setText("📷 Capture Product Photo");
        btnCapture.setTextSize(12);
        btnCapture.setBackgroundResource(R.drawable.bg_action_yellow);
        btnCapture.setTextColor(Color.parseColor("#0B0F10"));
        LinearLayout.LayoutParams paramsBtn = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        paramsBtn.setMargins(0, 14, 0, 4);
        btnCapture.setLayoutParams(paramsBtn);
        layout.addView(btnCapture);

        final TextView photoStatus = new TextView(this);
        photoStatus.setText(capturedImageBase64 == null ? "No photo captured yet" : "Photo captured — will upload to Cloudinary");
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

                    if (!name.isEmpty()) {
                        saveInventoryItem(name, cat, qty, unit.isEmpty() ? "pcs" : unit);
                    }
                })
                .setNegativeButton("Cancel", (dialog, which) -> {})
                .show();
    }

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
            Toast.makeText(this, "No camera app found on this device", Toast.LENGTH_LONG).show();
            return;
        }
        try {
            File imageRoot = new File(getCacheDir(), "images");
            if (!imageRoot.exists()) imageRoot.mkdirs();
            File photoFile = new File(imageRoot, "elettro_inventory_" + System.currentTimeMillis() + ".jpg");
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
                bitmap = Bitmap.createScaledBitmap(bitmap, (int) (w * scale), (int) (h * scale), true);
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.JPEG, 80, baos);
            byte[] bytes = baos.toByteArray();
            capturedImageBase64 = "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP);

            if (inventoryPhotoPreview != null) inventoryPhotoPreview.setImageBitmap(bitmap);
            if (inventoryPhotoStatus != null) {
                inventoryPhotoStatus.setText("Photo captured (" + Math.round(bytes.length / 1024f) + " KB) — will upload to Cloudinary");
                inventoryPhotoStatus.setTextColor(Color.parseColor("#22A66F"));
            }
        } catch (Exception e) {
            Toast.makeText(this, "Failed to process captured photo", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_CAMERA_PERMISSION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                dispatchTakePictureIntent();
            } else {
                Toast.makeText(this, "Camera permission is required to capture product photos", Toast.LENGTH_LONG).show();
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_CAMERA && resultCode == RESULT_OK) {
            if (capturedImageUri != null) {
                processCapturedImage(capturedImageUri);
            } else if (data != null && data.getData() != null) {
                processCapturedImage(data.getData());
            }
        }
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
                    Toast.makeText(this, "Item Saved to Inventory" + (capturedImageBase64 != null ? " (photo uploaded)" : ""), Toast.LENGTH_SHORT).show();
                    capturedImageBase64 = null;
                    capturedImageUri = null;
                    loadDashboardData();
                });
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "Failed to save item", Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

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
                .setTitle("Add Field Technician Account")
                .setView(layout)
                .setPositiveButton("Create Account", (dialog, which) -> {
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
}
