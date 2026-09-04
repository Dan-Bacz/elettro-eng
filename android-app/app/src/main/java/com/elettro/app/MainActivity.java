    package com.elettro.app;

import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.widget.EditText;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;

public class MainActivity extends AppCompatActivity {
    private EditText emailInput;
    private EditText passwordInput;
    private RadioGroup roleGroup;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        emailInput = findViewById(R.id.email_input);
        passwordInput = findViewById(R.id.password_input);
        roleGroup = findViewById(R.id.role_group);
        MaterialButton loginBtn = findViewById(R.id.login_button);

        loginBtn.setOnClickListener(v -> handleLogin());
    }

    private void handleLogin() {
        String email = emailInput.getText() == null ? "" : emailInput.getText().toString().trim();
        String password = passwordInput.getText() == null ? "" : passwordInput.getText().toString().trim();

        if (TextUtils.isEmpty(email) || TextUtils.isEmpty(password)) {
            Toast.makeText(this, "Please enter email and password", Toast.LENGTH_SHORT).show();
            return;
        }

        int selectedId = roleGroup.getCheckedRadioButtonId();
        RadioButton selectedRoleButton = findViewById(selectedId);
        String role = selectedRoleButton != null ? selectedRoleButton.getText().toString() : "Admin";

        boolean validAdmin = "eldred@elettro.com".equalsIgnoreCase(email) && "admin123".equals(password);
        boolean validTech = "tech@elettro.com".equalsIgnoreCase(email) && "tech123".equals(password);

        if (validAdmin && "Admin".equals(role)) {
            startActivity(new Intent(this, AdminDashboardActivity.class));
            finish();
            return;
        }

        if (validTech && "Technician".equals(role)) {
            startActivity(new Intent(this, TechnicianDashboardActivity.class));
            finish();
            return;
        }

        Toast.makeText(this, "Invalid credentials for selected role", Toast.LENGTH_SHORT).show();
    }
}
