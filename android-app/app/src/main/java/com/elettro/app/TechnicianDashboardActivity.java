package com.elettro.app;

import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
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
import androidx.core.view.GravityCompat;
import androidx.drawerlayout.widget.DrawerLayout;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.bumptech.glide.Glide;
import com.elettro.app.network.ApiClient;

import com.google.android.material.navigation.NavigationView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class TechnicianDashboardActivity extends AppCompatActivity {

    // Shell & drawer
    private DrawerLayout drawerLayout;
    private NavigationView navView;
    private ImageButton btnMenu, btnBell;
    private TextView bellBadge;
    private TextView headerUserName, headerUserRole, headerUserInitial;
    private TextView sectionTitle, sectionSubtitle;
    private SwipeRefreshLayout swipeRefresh;

    // Sections
    private View viewHome, viewJobs, viewReports, viewNotifications, viewMaterials, viewInventorySection, viewProfile;

    // Home
    private TextView techName, statTodayJobs, statActiveJobs, statCompletedJobs, statPendingMaterials;
    private View cardStatToday, cardStatActive, cardStatCompleted, cardStatMaterials;
    private LinearLayout recentJobsContainer, homeNotificationsContainer;

    // Jobs
    private Button tabActive, tabCompleted;
    private LinearLayout jobsListContainer;
    private String currentJobsTab = "ACTIVE";

    // Reports
    private TextView btnNewReport;
    private LinearLayout reportsListContainer;

    // Notifications
    private TextView btnMarkAllRead;
    private LinearLayout notificationsListContainer;

    // Materials
    private TextView btnRequestMaterial;
    private LinearLayout materialsListContainer;

    // Inventory
    private LinearLayout inventoryListContainer;

    // Profile
    private TextView profileName, profileEmail, profilePhone, profileSpec, profileExp, profileSkills, profileInitial;
    private TextView btnLogout, btnViewInventory, btnGotoJobs;

    // Quick actions
    private LinearLayout btnQaUpdateProgress, btnQaSubmitReport, btnQaMaterialRequest, btnQaMyJobs;

    // Data
    private JSONObject techData;
    private JSONArray bookingsArray;
    private JSONArray notificationsArray;
    private JSONArray inventoryArray;
    private String techId = "";
    private String techNameStr = "";
    private int selectedPriority = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_technician_dashboard);

        String token = getSharedPreferences("elettro_login", MODE_PRIVATE).getString(MainActivity.KEY_TOKEN, "");
        ApiClient.setAuthToken(token);

        bindViews();
        setupDrawer();
        setupRefresh();
        setupActions();

        loadData();
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

        viewHome = findViewById(R.id.view_home_section);
        viewJobs = findViewById(R.id.view_jobs_section);
        viewReports = findViewById(R.id.view_reports_section);
        viewNotifications = findViewById(R.id.view_notifications_section);
        viewMaterials = findViewById(R.id.view_materials_section);
        viewInventorySection = findViewById(R.id.view_inventory_section);
        viewProfile = findViewById(R.id.view_profile_section);

        techName = findViewById(R.id.tech_name);
        statTodayJobs = findViewById(R.id.stat_today_jobs);
        statActiveJobs = findViewById(R.id.stat_active_jobs);
        statCompletedJobs = findViewById(R.id.stat_completed_jobs);
        statPendingMaterials = findViewById(R.id.stat_pending_materials);
        cardStatToday = findViewById(R.id.card_stat_today);
        cardStatActive = findViewById(R.id.card_stat_active);
        cardStatCompleted = findViewById(R.id.card_stat_completed);
        cardStatMaterials = findViewById(R.id.card_stat_materials);
        recentJobsContainer = findViewById(R.id.tech_recent_jobs_container);
        homeNotificationsContainer = findViewById(R.id.home_notifications_container);

        tabActive = findViewById(R.id.tab_active);
        tabCompleted = findViewById(R.id.tab_completed);
        jobsListContainer = findViewById(R.id.jobs_list_container);

        btnNewReport = findViewById(R.id.btn_new_report);
        reportsListContainer = findViewById(R.id.reports_list_container);

        btnMarkAllRead = findViewById(R.id.btn_mark_all_read);
        notificationsListContainer = findViewById(R.id.notifications_list_container);

        btnRequestMaterial = findViewById(R.id.btn_request_material);
        materialsListContainer = findViewById(R.id.materials_list_container);

        inventoryListContainer = findViewById(R.id.inventory_list_container);

        btnGotoJobs = findViewById(R.id.btn_goto_jobs);
        btnQaUpdateProgress = findViewById(R.id.btn_qa_update_progress);
        btnQaSubmitReport = findViewById(R.id.btn_qa_submit_report);
        btnQaMaterialRequest = findViewById(R.id.btn_qa_material_request);
        btnQaMyJobs = findViewById(R.id.btn_qa_my_jobs);

        profileName = findViewById(R.id.profile_name);
        profileEmail = findViewById(R.id.profile_email);
        profilePhone = findViewById(R.id.profile_phone);
        profileSpec = findViewById(R.id.profile_spec);
        profileExp = findViewById(R.id.profile_exp);
        profileSkills = findViewById(R.id.profile_skills);
        profileInitial = findViewById(R.id.profile_initial);
        btnLogout = findViewById(R.id.btn_logout);
        btnViewInventory = findViewById(R.id.btn_view_inventory);

        headerUserRole.setText(R.string.role_technician);
        headerUserInitial.setText("T");

        View header = navView.getHeaderView(0);
        if (header != null) {
            TextView role = header.findViewById(R.id.drawer_header_role);
            if (role != null) role.setText(R.string.role_technician);
        }
    }

    private void setupDrawer() {
        btnMenu.setOnClickListener(v -> drawerLayout.openDrawer(GravityCompat.START));
        btnBell.setOnClickListener(v -> showSection("notifications"));

        navView.setNavigationItemSelectedListener(item -> {
            int id = item.getItemId();
            drawerLayout.closeDrawer(GravityCompat.START);
            if (id == R.id.nav_home) { showSection("home"); return true; }
            if (id == R.id.nav_my_jobs) { showSection("jobs"); return true; }
            if (id == R.id.nav_notifications) { showSection("notifications"); return true; }
            if (id == R.id.nav_reports) { showSection("reports"); return true; }
            if (id == R.id.nav_materials) { showSection("materials"); return true; }
            if (id == R.id.nav_inventory_tech) { showSection("inventory"); return true; }
            if (id == R.id.nav_profile) { showSection("profile"); return true; }
            if (id == R.id.nav_logout) { logout(); return true; }
            return false;
        });
    }

    private void showSection(String key) {
        viewHome.setVisibility("home".equals(key) ? View.VISIBLE : View.GONE);
        viewJobs.setVisibility("jobs".equals(key) ? View.VISIBLE : View.GONE);
        viewReports.setVisibility("reports".equals(key) ? View.VISIBLE : View.GONE);
        viewNotifications.setVisibility("notifications".equals(key) ? View.VISIBLE : View.GONE);
        viewMaterials.setVisibility("materials".equals(key) ? View.VISIBLE : View.GONE);
        viewInventorySection.setVisibility("inventory".equals(key) ? View.VISIBLE : View.GONE);
        viewProfile.setVisibility("profile".equals(key) ? View.VISIBLE : View.GONE);

        int titleRes = R.string.drawer_dashboard;
        int subRes = R.string.tech_keep_up;
        int menuRes = R.id.nav_home;

        switch (key) {
            case "jobs":
                titleRes = R.string.tech_jobs_title;
                subRes = R.string.tech_jobs_subtitle;
                menuRes = R.id.nav_my_jobs;
                break;
            case "reports":
                titleRes = R.string.tech_reports_title;
                subRes = R.string.tech_reports_subtitle;
                menuRes = R.id.nav_reports;
                break;
            case "notifications":
                titleRes = R.string.notifications_title;
                subRes = R.string.notifications_subtitle;
                menuRes = R.id.nav_notifications;
                loadNotifications();
                break;
            case "materials":
                titleRes = R.string.tech_material_title;
                subRes = R.string.tech_reports_subtitle;
                menuRes = R.id.nav_materials;
                break;
            case "inventory":
                titleRes = R.string.tech_inventory_title;
                subRes = R.string.tech_inventory_subtitle;
                menuRes = R.id.nav_inventory_tech;
                if (inventoryArray == null) loadInventory();
                break;
            case "profile":
                titleRes = R.string.tech_profile_title;
                subRes = R.string.tech_profile_subtitle;
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
        Toast.makeText(this, R.string.signed_out, Toast.LENGTH_SHORT).show();
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
        tabActive.setOnClickListener(v -> {
            currentJobsTab = "ACTIVE";
            updateJobsTabs();
            renderJobs();
        });
        tabCompleted.setOnClickListener(v -> {
            currentJobsTab = "COMPLETED";
            updateJobsTabs();
            renderJobs();
        });

        btnNewReport.setOnClickListener(v -> showReportDialog(null));

        btnMarkAllRead.setOnClickListener(v -> markAllNotificationsRead());

        btnRequestMaterial.setOnClickListener(v -> showMaterialDialog(null, null));

        btnLogout.setOnClickListener(v -> logout());

        btnGotoJobs.setOnClickListener(v -> showSection("jobs"));

        btnQaUpdateProgress.setOnClickListener(v -> showSection("jobs"));
        btnQaSubmitReport.setOnClickListener(v -> showReportDialog(null));
        btnQaMaterialRequest.setOnClickListener(v -> showMaterialDialog(null, null));
        btnQaMyJobs.setOnClickListener(v -> showSection("jobs"));

        cardStatToday.setOnClickListener(v -> showSection("jobs"));
        cardStatActive.setOnClickListener(v -> showSection("jobs"));
        cardStatCompleted.setOnClickListener(v -> {
            currentJobsTab = "COMPLETED";
            updateJobsTabs();
            showSection("jobs");
            renderJobs();
        });
        cardStatMaterials.setOnClickListener(v -> showSection("materials"));

        btnViewInventory.setOnClickListener(v -> showSection("inventory"));
    }

    // === DATA ===

    private void loadData() {
        new Thread(() -> {
            try {
                String resp = ApiClient.get("/tech");
                if (resp == null) {
                    runOnUiThread(() -> Toast.makeText(this, R.string.network_error, Toast.LENGTH_SHORT).show());
                    return;
                }
                JSONObject obj = new JSONObject(resp);
                techData = obj.optJSONObject("tech");
                bookingsArray = obj.optJSONArray("bookings");

                if (techData != null) {
                    techId = techData.optString("id", "");
                    techNameStr = techData.optString("name", "");
                }

                runOnUiThread(() -> {
                    renderHome();
                    renderJobs();
                    renderReports();
                    renderMaterials();
                    renderProfile();
                    refreshDrawerHeader();
                });
                loadHomeNotifications();
            } catch (Exception e) {
                e.printStackTrace();
                runOnUiThread(() -> Toast.makeText(this, R.string.network_error, Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    private void refreshDrawerHeader() {
        String display = techNameStr.isEmpty() ? getString(R.string.role_technician) : techNameStr;
        String initial = techNameStr.isEmpty() ? "T" : String.valueOf(techNameStr.charAt(0));

        headerUserName.setText(display);
        headerUserInitial.setText(initial);
        if (profileInitial != null) profileInitial.setText(initial);

        View header = navView.getHeaderView(0);
        TextView name = header != null ? header.findViewById(R.id.drawer_header_name) : null;
        TextView role = header != null ? header.findViewById(R.id.drawer_header_role) : null;
        TextView drawerInitial = header != null ? header.findViewById(R.id.drawer_header_initial) : null;
        if (name != null) name.setText(display);
        if (role != null) role.setText(R.string.role_technician);
        if (drawerInitial != null) drawerInitial.setText(initial);
    }

    private void loadInventory() {
        runOnUiThread(() -> {
            inventoryListContainer.removeAllViews();
            showEmpty(inventoryListContainer, R.string.loading);
        });
        new Thread(() -> {
            try {
                String resp = ApiClient.get("/inventory");
                if (resp != null) {
                    inventoryArray = new JSONArray(resp);
                }
                runOnUiThread(this::renderInventory);
            } catch (Exception e) {
                e.printStackTrace();
                runOnUiThread(() -> {
                    inventoryListContainer.removeAllViews();
                    showEmpty(inventoryListContainer, R.string.network_error);
                });
            }
        }).start();
    }

    private void renderInventory() {
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

    // === HOME ===

    private void renderHome() {
        if (techData == null) return;

        techName.setText(techNameStr);

        int today = bookingsArray == null ? 0 : bookingsArray.length();
        int active = 0, completed = 0, pendingMaterials = 0;
        if (bookingsArray != null) {
            for (int i = 0; i < bookingsArray.length(); i++) {
                JSONObject b = bookingsArray.optJSONObject(i);
                if (b == null) continue;
                String status = b.optString("status", "");
                if ("ASSIGNED".equals(status) || "IN_PROGRESS".equals(status)) active++;
                if ("COMPLETED".equals(status)) completed++;

                JSONArray mats = b.optJSONArray("materialRequests");
                if (mats != null) {
                    for (int j = 0; j < mats.length(); j++) {
                        JSONObject m = mats.optJSONObject(j);
                        if (m != null && "PENDING".equals(m.optString("status", "PENDING"))) pendingMaterials++;
                    }
                }
            }
        }
        statTodayJobs.setText(String.valueOf(today));
        statActiveJobs.setText(String.valueOf(active));
        statCompletedJobs.setText(String.valueOf(completed));
        statPendingMaterials.setText(String.valueOf(pendingMaterials));
        statPendingMaterials.setTextColor(pendingMaterials > 0 ? Color.parseColor("#DC2626") : Color.parseColor("#111827"));

        recentJobsContainer.removeAllViews();
        if (bookingsArray == null || bookingsArray.length() == 0) {
            showEmpty(recentJobsContainer, R.string.no_assignments);
            return;
        }
        int count = Math.min(5, bookingsArray.length());
        for (int i = 0; i < count; i++) {
            JSONObject b = bookingsArray.optJSONObject(i);
            if (b == null) continue;
            String status = b.optString("status", "PENDING");
            String title = b.optString("title", "Job");
            String clientName = b.optJSONObject("client") != null ? b.optJSONObject("client").optString("name", "") : "";
            String start = b.optString("startDate", "");
            String schedule = start.isEmpty() ? "" : start.substring(0, Math.min(10, start.length()));

            LinearLayout row = new LinearLayout(this);
            row.setOrientation(LinearLayout.VERTICAL);
            row.setGravity(Gravity.CENTER_VERTICAL);
            row.setPadding(0, 10, 0, 10);
            row.setLayoutParams(new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

            LinearLayout topRow = new LinearLayout(this);
            topRow.setOrientation(LinearLayout.HORIZONTAL);
            topRow.setGravity(Gravity.CENTER_VERTICAL);

            View dot = new View(this);
            LinearLayout.LayoutParams dotLp = new LinearLayout.LayoutParams(8, 8);
            dotLp.setMarginEnd(10);
            dot.setLayoutParams(dotLp);
            dot.setBackgroundTintList(android.content.res.ColorStateList.valueOf(getStatusColor(status)));
            topRow.addView(dot);

            TextView tv = new TextView(this);
            tv.setText(title);
            tv.setTextColor(Color.parseColor("#101416"));
            tv.setTextSize(13);
            tv.setTypeface(null, Typeface.BOLD);
            tv.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
            topRow.addView(tv);

            TextView tvStatus = new TextView(this);
            tvStatus.setText(status.replace("_", " "));
            tvStatus.setTextColor(getStatusColor(status));
            tvStatus.setTextSize(9);
            tvStatus.setTypeface(null, Typeface.BOLD);
            tvStatus.setPadding(8, 3, 8, 3);
            tvStatus.setBackgroundResource(R.drawable.bg_pill);
            topRow.addView(tvStatus);

            row.addView(topRow);

            String info = (clientName.isEmpty() ? "" : clientName)
                    + (schedule.isEmpty() ? "" : (clientName.isEmpty() ? "" : " • ") + schedule);
            if (!info.isEmpty()) {
                TextView tvInfo = new TextView(this);
                tvInfo.setText(info);
                tvInfo.setTextColor(Color.parseColor("#68747A"));
                tvInfo.setTextSize(11);
                tvInfo.setPadding(0, 2, 0, 0);
                row.addView(tvInfo);
            }

            recentJobsContainer.addView(row);
        }
    }

    // === JOBS ===

    private void updateJobsTabs() {
        if ("ACTIVE".equals(currentJobsTab)) {
            tabActive.setBackgroundResource(R.drawable.bg_chip_selected);
            tabActive.setTextColor(Color.parseColor("#0B0F10"));
            tabActive.setTypeface(null, Typeface.BOLD);
            tabCompleted.setBackgroundResource(R.drawable.bg_chip_unselected);
            tabCompleted.setTextColor(Color.parseColor("#2563EB"));
            tabCompleted.setTypeface(null, Typeface.NORMAL);
        } else {
            tabCompleted.setBackgroundResource(R.drawable.bg_chip_selected);
            tabCompleted.setTextColor(Color.parseColor("#0B0F10"));
            tabCompleted.setTypeface(null, Typeface.BOLD);
            tabActive.setBackgroundResource(R.drawable.bg_chip_unselected);
            tabActive.setTextColor(Color.parseColor("#D97706"));
            tabActive.setTypeface(null, Typeface.NORMAL);
        }
    }

    private void renderJobs() {
        jobsListContainer.removeAllViews();
        if (bookingsArray == null) return;

        boolean any = false;
        for (int i = 0; i < bookingsArray.length(); i++) {
            JSONObject b = bookingsArray.optJSONObject(i);
            if (b == null) continue;
            String status = b.optString("status", "");
            boolean isActive = "ASSIGNED".equals(status) || "IN_PROGRESS".equals(status);
            boolean isCompleted = "COMPLETED".equals(status);

            if ("ACTIVE".equals(currentJobsTab) && !isActive) continue;
            if ("COMPLETED".equals(currentJobsTab) && !isCompleted) continue;
            any = true;

            String jobId = b.optString("id");
            String title = b.optString("title", "Job");
            String clientName = b.optJSONObject("client") != null ? b.optJSONObject("client").optString("name", "") : "";

            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(14, 14, 14, 14);
            card.setBackgroundResource(R.drawable.bg_card);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, 0, 8);
            card.setLayoutParams(lp);
            card.setOnClickListener(v -> showJobDetails(jobId, title));

            TextView tvTitle = new TextView(this);
            tvTitle.setText(title);
            tvTitle.setTextColor(Color.parseColor("#101416"));
            tvTitle.setTextSize(14);
            tvTitle.setTypeface(null, Typeface.BOLD);
            card.addView(tvTitle);

            TextView tvInfo = new TextView(this);
            tvInfo.setText(clientName.isEmpty() ? status.replace("_", " ") : clientName + " • " + status.replace("_", " "));
            tvInfo.setTextColor(getStatusColor(status));
            tvInfo.setTextSize(11);
            tvInfo.setTypeface(null, Typeface.BOLD);
            tvInfo.setPadding(0, 4, 0, 8);
            card.addView(tvInfo);

            double progressPct = getJobProgress(b);
            TextView tvProgress = new TextView(this);
            tvProgress.setText("Progress: " + Math.round(progressPct) + "%");
            tvProgress.setTextColor(Color.parseColor("#68747A"));
            tvProgress.setTextSize(12);
            tvProgress.setPadding(0, 0, 0, 8);
            card.addView(tvProgress);

            LinearLayout actionRow = new LinearLayout(this);
            actionRow.setOrientation(LinearLayout.HORIZONTAL);

            if ("ASSIGNED".equals(status)) {
                Button start = createButton("Start Job", R.drawable.bg_action_yellow);
                start.setOnClickListener(v -> updateJobStatus(jobId, "IN_PROGRESS"));
                actionRow.addView(start);
            }

            Button details = createButton("Details", R.drawable.bg_action_dark);
            details.setTextColor(Color.parseColor("#F5C400"));
            LinearLayout.LayoutParams dp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            dp.setMarginStart(8);
            details.setLayoutParams(dp);
            details.setOnClickListener(v -> showJobDetails(jobId, title));
            actionRow.addView(details);

            if ("IN_PROGRESS".equals(status)) {
                Button complete = createButton("Complete", R.drawable.bg_action_green);
                LinearLayout.LayoutParams cp = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                cp.setMarginStart(8);
                complete.setLayoutParams(cp);
                complete.setOnClickListener(v -> confirmCompleteJob(jobId));
                actionRow.addView(complete);
            }

            if ("COMPLETED".equals(status)) {
                Button material = createButton("Request Material", R.drawable.bg_action_yellow);
                material.setOnClickListener(v -> showMaterialDialog(jobId, title));
                actionRow.addView(material);
            }

            card.addView(actionRow);
            jobsListContainer.addView(card);
        }

        if (!any) {
            showEmpty(jobsListContainer, R.string.tech_no_jobs);
        }
    }

    private double getJobProgress(JSONObject booking) {
        double max = 0;
        JSONArray reports = booking.optJSONArray("reports");
        if (reports != null) {
            for (int i = 0; i < reports.length(); i++) {
                JSONObject r = reports.optJSONObject(i);
                if (r != null && r.has("progress")) {
                    max = Math.max(max, r.optDouble("progress", 0));
                }
            }
        }
        return max;
    }

    private void showJobDetails(String jobId, String jobTitle) {
        JSONObject booking = findBooking(jobId);
        if (booking == null) return;

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(30, 16, 30, 12);

        addDetailTitle(layout, "Client");
        JSONObject client = booking.optJSONObject("client");
        if (client != null) {
            addDetailText(layout, client.optString("name", "-"));
            String email = client.optString("email", "");
            String phone = client.optString("phone", "");
            addDetailSmall(layout, (email.isEmpty() ? "" : email) + (phone.isEmpty() ? "" : " • " + phone));
        } else {
            addDetailText(layout, "-");
        }

        String start = booking.optString("startDate", "");
        String end = booking.optString("endDate", "");
        addDetailTitle(layout, "Schedule");
        addDetailSmall(layout, "Start: " + (start.isEmpty() ? "-" : start.substring(0, Math.min(10, start.length())))
                + "   End: " + (end.isEmpty() ? "-" : end.substring(0, Math.min(10, end.length()))));

        String desc = booking.optString("description", "");
        if (!desc.isEmpty()) {
            addDetailTitle(layout, "Details");
            addDetailText(layout, desc);
        }

        JSONArray mats = booking.optJSONArray("materialRequests");
        if (mats != null && mats.length() > 0) {
            addDetailTitle(layout, "Material Requests");
            for (int i = 0; i < mats.length(); i++) {
                JSONObject m = mats.optJSONObject(i);
                if (m == null) continue;
                String line = m.optString("material", "") + " x" + m.optInt("quantity", 1)
                        + (m.optString("unit", "").isEmpty() ? "" : " " + m.optString("unit", ""))
                        + " — " + m.optString("status", "PENDING");
                addDetailText(layout, line);
            }
        }

        JSONArray acts = booking.optJSONArray("technicianActivities");
        addDetailTitle(layout, "Job Updates");
        if (acts == null || acts.length() == 0) {
            addDetailSmall(layout, "No updates recorded yet.");
        } else {
            for (int i = 0; i < Math.min(3, acts.length()); i++) {
                JSONObject a = acts.optJSONObject(i);
                if (a == null) continue;
                addDetailText(layout, a.optString("message", ""));
            }
        }

        new AlertDialog.Builder(this)
                .setTitle(jobTitle)
                .setView(layout)
                .setNegativeButton("Close", null)
                .show();
    }

    private JSONObject findBooking(String id) {
        if (bookingsArray == null) return null;
        for (int i = 0; i < bookingsArray.length(); i++) {
            JSONObject b = bookingsArray.optJSONObject(i);
            if (b != null && id.equals(b.optString("id"))) return b;
        }
        return null;
    }

    private void updateJobStatus(String jobId, String status) {
        new Thread(() -> {
            try {
                JSONObject json = new JSONObject();
                json.put("action", "update_status");
                json.put("bookingId", jobId);
                json.put("status", status);
                ApiClient.post("/admin", json.toString());
                runOnUiThread(() -> {
                    Toast.makeText(this, "Job status updated to " + status.replace("_", " "), Toast.LENGTH_SHORT).show();
                    loadData();
                });
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "Update failed", Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    private void confirmCompleteJob(String jobId) {
        new AlertDialog.Builder(this)
                .setTitle("Mark Completed")
                .setMessage("Confirm this job is complete?")
                .setPositiveButton("Complete", (d, w) -> updateJobStatus(jobId, "COMPLETED"))
                .setNegativeButton("Cancel", null)
                .show();
    }

    // === REPORTS ===

    private void renderReports() {
        reportsListContainer.removeAllViews();
        if (bookingsArray == null) {
            showEmpty(reportsListContainer, R.string.empty);
            return;
        }

        int total = 0;
        for (int i = 0; i < bookingsArray.length(); i++) {
            JSONObject b = bookingsArray.optJSONObject(i);
            if (b == null) continue;
            JSONArray reports = b.optJSONArray("reports");
            if (reports == null) continue;

            for (int j = 0; j < reports.length(); j++) {
                JSONObject r = reports.optJSONObject(j);
                if (r == null) continue;
                total++;

                LinearLayout card = new LinearLayout(this);
                card.setOrientation(LinearLayout.VERTICAL);
                card.setPadding(14, 14, 14, 14);
                card.setBackgroundResource(R.drawable.bg_card);
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                lp.setMargins(0, 0, 0, 8);
                card.setLayoutParams(lp);

                TextView tvJob = new TextView(this);
                tvJob.setText(b.optString("title", "Job"));
                tvJob.setTextColor(Color.parseColor("#101416"));
                tvJob.setTextSize(13);
                tvJob.setTypeface(null, Typeface.BOLD);
                card.addView(tvJob);

                if (r.has("progress")) {
                    TextView tvProgress = new TextView(this);
                    tvProgress.setText("Progress: " + Math.round(r.optDouble("progress", 0)) + "%");
                    tvProgress.setTextColor(Color.parseColor("#22A66F"));
                    tvProgress.setTextSize(11);
                    tvProgress.setTypeface(null, Typeface.BOLD);
                    card.addView(tvProgress);
                }

                TextView tvContent = new TextView(this);
                tvContent.setText(r.optString("content", ""));
                tvContent.setTextColor(Color.parseColor("#4B575C"));
                tvContent.setTextSize(12);
                tvContent.setPadding(0, 4, 0, 0);
                card.addView(tvContent);

                String workDone = r.optString("workDone", "");
                String nextWork = r.optString("nextWork", "");
                if (!workDone.isEmpty()) {
                    TextView tvWork = new TextView(this);
                    tvWork.setText("Completed: " + workDone);
                    tvWork.setTextColor(Color.parseColor("#68747A"));
                    tvWork.setTextSize(11);
                    card.addView(tvWork);
                }
                if (!nextWork.isEmpty()) {
                    TextView tvNext = new TextView(this);
                    tvNext.setText("Next: " + nextWork);
                    tvNext.setTextColor(Color.parseColor("#68747A"));
                    tvNext.setTextSize(11);
                    card.addView(tvNext);
                }

                reportsListContainer.addView(card);
            }
        }

        if (total == 0) {
            showEmpty(reportsListContainer, R.string.empty);
        }
    }

    private void showReportDialog(String preSelectedBookingId) {
        if (bookingsArray == null || bookingsArray.length() == 0) {
            Toast.makeText(this, "No active jobs to report on", Toast.LENGTH_SHORT).show();
            return;
        }

        final String[] jobNames = new String[bookingsArray.length()];
        final String[] jobIds = new String[bookingsArray.length()];
        int idx = 0;
        for (int i = 0; i < bookingsArray.length(); i++) {
            JSONObject b = bookingsArray.optJSONObject(i);
            if (b != null) {
                jobNames[i] = b.optString("title", "Job") + " (" + b.optString("status", "") + ")";
                jobIds[i] = b.optString("id");
            }
        }
        for (int i = 0; i < bookingsArray.length(); i++) {
            JSONObject b = bookingsArray.optJSONObject(i);
            if (b != null && preSelectedBookingId != null && b.optString("id").equals(preSelectedBookingId)) {
                idx = i;
            }
        }

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(40, 20, 40, 20);

        final EditText etJob = new EditText(this);
        etJob.setText(jobNames[idx]);
        etJob.setFocusable(false);
        etJob.setClickable(true);
        etJob.setOnClickListener(v -> new AlertDialog.Builder(this)
                .setTitle(getString(R.string.drawer_my_projects))
                .setItems(jobNames, (d, which) -> etJob.setText(jobNames[which]))
                .show());
        layout.addView(etJob);

        final EditText etProgress = new EditText(this);
        etProgress.setHint("Progress % (0-100)");
        etProgress.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);
        layout.addView(etProgress);

        final EditText etContent = new EditText(this);
        etContent.setHint(getString(R.string.tech_report_content));
        etContent.setMinLines(2);
        layout.addView(etContent);

        final EditText etWorkDone = new EditText(this);
        etWorkDone.setHint(getString(R.string.tech_work_done));
        layout.addView(etWorkDone);

        final EditText etIssues = new EditText(this);
        etIssues.setHint(getString(R.string.tech_issues));
        layout.addView(etIssues);

        final EditText etNext = new EditText(this);
        etNext.setHint(getString(R.string.tech_next_work));
        layout.addView(etNext);

        new AlertDialog.Builder(this)
                .setTitle(R.string.tech_submit_report_title)
                .setView(layout)
                .setPositiveButton("Submit", (dialog, which) -> {
                    String selectedJobId = jobIds[indexOfName(jobNames, etJob.getText().toString())];
                    int progress = 0;
                    try { progress = Integer.parseInt(etProgress.getText().toString().trim()); } catch (Exception ignored) {}
                    String content = etContent.getText().toString().trim();
                    if (content.isEmpty()) {
                        Toast.makeText(this, "Enter report content", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    submitReport(selectedJobId, progress, content,
                            etWorkDone.getText().toString().trim(),
                            etIssues.getText().toString().trim(),
                            etNext.getText().toString().trim());
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private int indexOfName(String[] arr, String name) {
        if (name == null) return 0;
        for (int i = 0; i < arr.length; i++) if (name.equals(arr[i])) return i;
        return 0;
    }

    private void submitReport(String bookingId, int progress, String content, String workDone, String issues, String nextWork) {
        new Thread(() -> {
            try {
                JSONObject json = new JSONObject();
                json.put("bookingId", bookingId);
                json.put("content", content);
                json.put("progress", progress);
                if (!workDone.isEmpty()) json.put("workDone", workDone);
                if (!issues.isEmpty()) json.put("issues", issues);
                if (!nextWork.isEmpty()) json.put("nextWork", nextWork);
                ApiClient.post("/reports", json.toString());
                runOnUiThread(() -> {
                    Toast.makeText(this, "Report Submitted", Toast.LENGTH_SHORT).show();
                    loadData();
                });
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "Failed to submit report", Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    // === MATERIAL REQUESTS ===

    private void renderMaterials() {
        materialsListContainer.removeAllViews();
        if (bookingsArray == null || bookingsArray.length() == 0) {
            showEmpty(materialsListContainer, R.string.empty);
            return;
        }

        int total = 0;
        for (int i = 0; i < bookingsArray.length(); i++) {
            JSONObject b = bookingsArray.optJSONObject(i);
            if (b == null) continue;
            JSONArray mats = b.optJSONArray("materialRequests");
            if (mats == null) continue;

            for (int j = 0; j < mats.length(); j++) {
                JSONObject m = mats.optJSONObject(j);
                if (m == null) continue;
                total++;

                LinearLayout card = new LinearLayout(this);
                card.setOrientation(LinearLayout.VERTICAL);
                card.setPadding(14, 14, 14, 14);
                card.setBackgroundResource(R.drawable.bg_card);
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                lp.setMargins(0, 0, 0, 8);
                card.setLayoutParams(lp);

                TextView tvMaterial = new TextView(this);
                tvMaterial.setText(m.optString("material", "Material"));
                tvMaterial.setTextColor(Color.parseColor("#101416"));
                tvMaterial.setTextSize(14);
                tvMaterial.setTypeface(null, Typeface.BOLD);
                card.addView(tvMaterial);

                String detail = "Qty: " + m.optInt("quantity", 1)
                        + (m.optString("unit", "").isEmpty() ? "" : " " + m.optString("unit", ""))
                        + " • " + ("URGENT".equals(m.optString("priority", "NORMAL")) ? "URGENT" : "NORMAL");
                TextView tvDetail = new TextView(this);
                tvDetail.setText(detail);
                tvDetail.setTextColor("URGENT".equals(m.optString("priority", "NORMAL")) ? Color.parseColor("#DC2626") : Color.parseColor("#68747A"));
                tvDetail.setTextSize(11);
                tvDetail.setTypeface(null, Typeface.BOLD);
                card.addView(tvDetail);

                String status = m.optString("status", "PENDING");
                TextView tvStatus = new TextView(this);
                tvStatus.setText("Status: " + status.replace("_", " "));
                tvStatus.setTextColor(getStatusColor(status.equals("PENDING") ? "PENDING" : status.equals("APPROVED") ? "APPROVED" : status));
                tvStatus.setTextSize(11);
                tvStatus.setPadding(0, 4, 0, 0);
                card.addView(tvStatus);

                materialsListContainer.addView(card);
            }
        }

        if (total == 0) {
            showEmpty(materialsListContainer, R.string.empty);
        }
    }

    private void showMaterialDialog(String preSelectedBookingId, String title) {
        if (bookingsArray == null || bookingsArray.length() == 0) return;

        final List<String> jobNames = new ArrayList<>();
        final List<String> jobIds = new ArrayList<>();
        int idx = 0;
        for (int i = 0; i < bookingsArray.length(); i++) {
            JSONObject b = bookingsArray.optJSONObject(i);
            if (b == null) continue;
            String status = b.optString("status", "");
            if ("ASSIGNED".equals(status) || "IN_PROGRESS".equals(status)) {
                if (preSelectedBookingId != null && b.optString("id").equals(preSelectedBookingId)) idx = jobNames.size();
                jobNames.add(b.optString("title", "Job"));
                jobIds.add(b.optString("id"));
            }
        }
        if (jobNames.isEmpty()) {
            Toast.makeText(this, "No active jobs", Toast.LENGTH_SHORT).show();
            return;
        }

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(40, 20, 40, 20);

        final EditText etJob = new EditText(this);
        etJob.setText(jobNames.get(idx));
        etJob.setFocusable(false);
        etJob.setClickable(true);
        etJob.setOnClickListener(v -> new AlertDialog.Builder(this)
                .setTitle(getString(R.string.drawer_my_projects))
                .setItems(jobNames.toArray(new String[0]), (d, which) -> etJob.setText(jobNames.get(which)))
                .show());
        layout.addView(etJob);

        final EditText etMaterial = new EditText(this);
        etMaterial.setHint(getString(R.string.tech_material_name));
        layout.addView(etMaterial);

        final EditText etQty = new EditText(this);
        etQty.setHint(getString(R.string.tech_material_qty));
        etQty.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);
        layout.addView(etQty);

        final EditText etUnit = new EditText(this);
        etUnit.setHint(getString(R.string.tech_material_unit) + " (pcs / meters / rolls)");
        layout.addView(etUnit);

        final EditText etReason = new EditText(this);
        etReason.setHint(getString(R.string.tech_material_reason));
        layout.addView(etReason);

        final String[] priorities = {getString(R.string.priority_normal), getString(R.string.priority_urgent)};
        final String[] priorityValues = {"NORMAL", "URGENT"};
        final TextView tvPriority = new TextView(this);
        tvPriority.setText(getString(R.string.tech_material_priority) + ": " + priorities[0]);
        tvPriority.setTextColor(Color.parseColor("#2563EB"));
        tvPriority.setTextSize(13);
        tvPriority.setPadding(0, 10, 0, 0);
        tvPriority.setOnClickListener(v -> new AlertDialog.Builder(this)
                .setTitle(R.string.tech_material_priority)
                .setItems(priorities, (d, which) -> {
                    selectedPriority = which;
                    tvPriority.setText(getString(R.string.tech_material_priority) + ": " + priorities[which]);
                })
                .show());
        tvPriority.setBackgroundResource(R.drawable.bg_pill);
        layout.addView(tvPriority);

        new AlertDialog.Builder(this)
                .setTitle(R.string.tech_material_title)
                .setView(layout)
                .setPositiveButton("Submit", (dialog, which) -> {
                    String selectedJobId = jobIds.get(indexOfList(jobNames, etJob.getText().toString()));
                    String material = etMaterial.getText().toString().trim();
                    int qty = 1;
                    try { qty = Integer.parseInt(etQty.getText().toString().trim()); } catch (Exception ignored) {}
                    if (material.isEmpty()) {
                        Toast.makeText(this, "Enter a material name", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    submitMaterialRequest(selectedJobId, material, qty,
                            etUnit.getText().toString().trim(),
                            etReason.getText().toString().trim(),
                            priorityValues[selectedPriority < priorities.length ? selectedPriority : 0]);
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private int indexOfList(List<String> list, String value) {
        if (value == null) return 0;
        for (int i = 0; i < list.size(); i++) if (value.equals(list.get(i))) return i;
        return 0;
    }

    private void submitMaterialRequest(String bookingId, String material, int qty, String unit, String reason, String priority) {
        new Thread(() -> {
            try {
                JSONObject json = new JSONObject();
                json.put("bookingId", bookingId);
                json.put("material", material);
                json.put("quantity", qty);
                if (!unit.isEmpty()) json.put("unit", unit);
                if (!reason.isEmpty()) json.put("reason", reason);
                json.put("priority", priority);
                ApiClient.post("/material-requests", json.toString());
                runOnUiThread(() -> {
                    Toast.makeText(this, "Material Request Submitted", Toast.LENGTH_SHORT).show();
                    loadData();
                });
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "Failed to submit request", Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    // === PROFILE ===

    private void renderProfile() {
        if (techData == null) return;
        profileName.setText(techNameStr);
        profileEmail.setText(techData.optString("email", ""));
        profilePhone.setText(techData.optString("phone", ""));
        profileSpec.setText(techData.optString("specialization", getString(R.string.not_set)));
        profileExp.setText(techData.optString("yearsOfExperience", getString(R.string.not_set)) + " years");
        profileSkills.setText(techData.optString("skills", getString(R.string.not_set)));
    }

    // === NOTIFICATIONS ===

    private void loadNotifications() {
        notificationsListContainer.removeAllViews();
        TextView tv = new TextView(this);
        tv.setText(R.string.loading);
        tv.setTextColor(Color.GRAY);
        tv.setPadding(0, 20, 0, 0);
        notificationsListContainer.addView(tv);

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

    private void loadHomeNotifications() {
        new Thread(() -> {
            try {
                String resp = ApiClient.get("/notifications");
                if (resp != null) {
                    JSONObject obj = new JSONObject(resp);
                    notificationsArray = obj.optJSONArray("notifications");
                }
                runOnUiThread(this::renderHomeNotifications);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();
    }

    private void renderHomeNotifications() {
        homeNotificationsContainer.removeAllViews();
        if (notificationsArray == null || notificationsArray.length() == 0) {
            showEmpty(homeNotificationsContainer, R.string.no_notifications);
            updateBellBadge();
            return;
        }
        int count = Math.min(3, notificationsArray.length());
        for (int i = 0; i < count; i++) {
            JSONObject n = notificationsArray.optJSONObject(i);
            if (n == null) continue;
            homeNotificationsContainer.addView(buildNotificationCard(n));
        }
        updateBellBadge();
    }

    private void updateBellBadge() {
        if (bellBadge == null) return;
        int unread = 0;
        if (notificationsArray != null) {
            for (int i = 0; i < notificationsArray.length(); i++) {
                JSONObject n = notificationsArray.optJSONObject(i);
                if (n != null && !n.optBoolean("read", false)) unread++;
            }
        }
        if (unread > 0) {
            bellBadge.setText(String.valueOf(unread));
            bellBadge.setVisibility(View.VISIBLE);
        } else {
            bellBadge.setVisibility(View.GONE);
        }
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
            notificationsListContainer.addView(buildNotificationCard(n));
        }
    }

    private LinearLayout buildNotificationCard(JSONObject n) {
        boolean read = n.optBoolean("read", false);
        String type = n.optString("type", "INFO");
        String title = n.optString("title", "Notification");
        String message = n.optString("message", "");

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(14, 14, 14, 14);
        card.setBackgroundResource(R.drawable.bg_card);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, 0, 0, 8);
        card.setLayoutParams(lp);
        if (!read) card.setBackgroundColor(Color.parseColor("#FFFBEB"));

        TextView tvTitle = new TextView(this);
        tvTitle.setText(title);
        tvTitle.setTextColor(Color.parseColor("#101416"));
        tvTitle.setTextSize(13);
        tvTitle.setTypeface(null, Typeface.BOLD);
        card.addView(tvTitle);

        if (!message.isEmpty()) {
            TextView tvMsg = new TextView(this);
            tvMsg.setText(message);
            tvMsg.setTextColor(Color.parseColor("#68747A"));
            tvMsg.setTextSize(12);
            card.addView(tvMsg);
        }

        if (!read) {
            card.setOnClickListener(v -> markNotificationRead(n.optString("id")));
        }

        return card;
    }

    private void markNotificationRead(String id) {
        new Thread(() -> {
            try {
                JSONObject obj = new JSONObject();
                obj.put("id", id);
                ApiClient.patch("/notifications", obj.toString());
                runOnUiThread(() -> {
                    loadNotifications();
                    loadHomeNotifications();
                });
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
                    Toast.makeText(this, "All marked read", Toast.LENGTH_SHORT).show();
                    loadNotifications();
                    loadHomeNotifications();
                });
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "Failed", Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    // === HELPERS ===

    private Button createButton(String text, int bgRes) {
        Button btn = new Button(this);
        btn.setText(text);
        btn.setTextSize(11);
        btn.setBackgroundResource(bgRes);
        btn.setTextColor(Color.parseColor("#0B0F10"));
        btn.setTypeface(null, Typeface.BOLD);
        btn.setAllCaps(false);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        p.setMarginEnd(4);
        btn.setLayoutParams(p);
        return btn;
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

    private void addDetailTitle(LinearLayout layout, String title) {
        TextView tv = new TextView(this);
        tv.setText(title);
        tv.setTextColor(Color.parseColor("#68747A"));
        tv.setTextSize(11);
        tv.setTypeface(null, Typeface.BOLD);
        tv.setPadding(0, 10, 0, 2);
        layout.addView(tv);
    }

    private void addDetailText(LinearLayout layout, String text) {
        if (text == null) return;
        TextView tv = new TextView(this);
        tv.setText(text);
        tv.setTextColor(Color.parseColor("#101416"));
        tv.setTextSize(13);
        tv.setPadding(0, 0, 0, 2);
        layout.addView(tv);
    }

    private void addDetailSmall(LinearLayout layout, String text) {
        TextView tv = new TextView(this);
        tv.setText(text);
        tv.setTextColor(Color.parseColor("#68747A"));
        tv.setTextSize(12);
        tv.setPadding(0, 0, 0, 2);
        layout.addView(tv);
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