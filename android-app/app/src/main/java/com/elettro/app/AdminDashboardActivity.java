package com.elettro.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ImageButton;
import android.widget.Toast;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.drawerlayout.widget.DrawerLayout;

import com.elettro.app.network.ApiClient;

import org.json.JSONArray;
import org.json.JSONObject;

public class AdminDashboardActivity extends AppCompatActivity {
    private DrawerLayout drawerLayout;
    private ImageButton menuButton;
    private Button logoutButton;
    private TextView totalBookings;
    private TextView totalInventory;
    private TextView lowStock;
    private TextView technicians;
    private TextView recentBookings;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_admin_dashboard);

        drawerLayout = findViewById(R.id.admin_drawer_layout);
        menuButton = findViewById(R.id.menu_button);
        logoutButton = findViewById(R.id.logout_button);
        totalBookings = findViewById(R.id.total_bookings_value);
        totalInventory = findViewById(R.id.total_inventory_value);
        lowStock = findViewById(R.id.low_stock_value);
        technicians = findViewById(R.id.technicians_value);
        recentBookings = findViewById(R.id.recent_bookings_value);

        String token = getSharedPreferences("elettro_login", MODE_PRIVATE)
            .getString(MainActivity.KEY_TOKEN, "");
        ApiClient.setAuthToken(token);
        loadDashboard();

        menuButton.setOnClickListener(v -> {
            if (drawerLayout.isDrawerOpen(findViewById(R.id.admin_sidebar))) {
                drawerLayout.closeDrawer(findViewById(R.id.admin_sidebar));
            } else {
                drawerLayout.openDrawer(findViewById(R.id.admin_sidebar));
            }
        });

        logoutButton.setOnClickListener(v -> {
            getSharedPreferences("elettro_login", MODE_PRIVATE).edit().remove(MainActivity.KEY_TOKEN).apply();
            ApiClient.setAuthToken("");
            Toast.makeText(this, "Logged out", Toast.LENGTH_SHORT).show();
            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            finish();
        });
    }

    private void loadDashboard() {
        new Thread(() -> {
            try {
                String response = ApiClient.get("/dashboard");
                JSONObject dashboard = new JSONObject(response);
                JSONObject stats = dashboard.getJSONObject("stats");
                JSONArray bookings = dashboard.getJSONArray("recentBookings");
                StringBuilder bookingText = new StringBuilder();
                for (int i = 0; i < bookings.length(); i++) {
                    JSONObject booking = bookings.getJSONObject(i);
                    if (i > 0) bookingText.append("\n\n");
                    bookingText.append(booking.optString("title", "Booking"))
                            .append("\n")
                            .append(booking.optString("clientName", "Unknown client"))
                            .append(" • ")
                            .append(booking.optString("status", "PENDING"));
                }
                runOnUiThread(() -> {
                    totalBookings.setText(String.valueOf(stats.optInt("totalBookings")));
                    totalInventory.setText(String.valueOf(stats.optInt("totalInventory")));
                    lowStock.setText(String.valueOf(stats.optInt("lowStock")));
                    technicians.setText(String.valueOf(stats.optInt("technicians")));
                    recentBookings.setText(bookingText.length() == 0 ? "No bookings yet" : bookingText.toString());
                });
            } catch (Exception error) {
                runOnUiThread(() -> Toast.makeText(this, "Unable to load live dashboard data", Toast.LENGTH_LONG).show());
            }
        }).start();
    }
}
