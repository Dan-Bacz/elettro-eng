    package com.elettro.app;

import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.widget.EditText;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.elettro.app.network.ApiClient;
import com.google.android.material.button.MaterialButton;

import org.json.JSONObject;

import java.util.Locale;

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
        String selectedRole = selectedRoleButton != null ? selectedRoleButton.getText().toString() : "Admin";

        new Thread(() -> {
            try {
                JSONObject payload = new JSONObject();
                payload.put("email", email);
                payload.put("password", password);

                String response = ApiClient.post("/auth/login", payload.toString());
                JSONObject json = new JSONObject(response);
                boolean ok = json.optBoolean("ok", false);
                JSONObject user = json.optJSONObject("user");
                String role = user != null ? user.optString("role", "") : "";

                runOnUiThread(() -> {
                    if (!ok || user == null) {
                        Toast.makeText(this, "Invalid credentials for selected role", Toast.LENGTH_SHORT).show();
                        return;
                    }

                    String normalizedRole = role.toUpperCase(Locale.US);
                    String selectedRoleUpper = selectedRole.toUpperCase(Locale.US);

                    if ("ADMIN".equals(normalizedRole) && "ADMIN".equals(selectedRoleUpper)) {
                        startActivity(new Intent(this, AdminDashboardActivity.class));
                        finish();
                        return;
                    }

                    if ("TECHNICIAN".equals(normalizedRole) && "TECHNICIAN".equals(selectedRoleUpper)) {
                        startActivity(new Intent(this, TechnicianDashboardActivity.class));
                        finish();
                        return;
                    }

                    Toast.makeText(this, "Invalid credentials for selected role", Toast.LENGTH_SHORT).show();
                });
            } catch (Exception e) {
                runOnUiThread(() -> {
                    Toast.makeText(this, "Unable to connect to server. Check your internet and backend URL.", Toast.LENGTH_LONG).show();
                });
            }
        }).start();
    }
}
