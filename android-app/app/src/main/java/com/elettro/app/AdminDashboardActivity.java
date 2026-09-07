package com.elettro.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ImageButton;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.drawerlayout.widget.DrawerLayout;

public class AdminDashboardActivity extends AppCompatActivity {
    private DrawerLayout drawerLayout;
    private ImageButton menuButton;
    private Button logoutButton;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_admin_dashboard);

        drawerLayout = findViewById(R.id.admin_drawer_layout);
        menuButton = findViewById(R.id.menu_button);
        logoutButton = findViewById(R.id.logout_button);

        menuButton.setOnClickListener(v -> {
            if (drawerLayout.isDrawerOpen(findViewById(R.id.admin_sidebar))) {
                drawerLayout.closeDrawer(findViewById(R.id.admin_sidebar));
            } else {
                drawerLayout.openDrawer(findViewById(R.id.admin_sidebar));
            }
        });

        logoutButton.setOnClickListener(v -> {
            Toast.makeText(this, "Logged out", Toast.LENGTH_SHORT).show();
            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            finish();
        });
    }
}
