package com.elettro.app;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.TextUtils;
import android.widget.CheckBox;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.elettro.app.network.ApiClient;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;

import org.json.JSONObject;

import java.util.Locale;

public class MainActivity extends AppCompatActivity {
    private static final String PREFS_NAME = "elettro_login";
    private static final String KEY_EMAIL = "email";
    private static final String KEY_PASSWORD = "password";
    private static final String KEY_REMEMBER = "remember";
    public static final String KEY_TOKEN = "token";

    private TextInputEditText emailInput;
    private TextInputEditText passwordInput;
    private CheckBox rememberMe;
    private MaterialButton loginBtn;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        emailInput = findViewById(R.id.email_input);
        passwordInput = findViewById(R.id.password_input);
        rememberMe = findViewById(R.id.remember_me);
        loginBtn = findViewById(R.id.login_button);

        restoreRememberedCredentials();

        loginBtn.setOnClickListener(v -> handleLogin());
        findViewById(R.id.forgot_password).setOnClickListener(v ->
                Toast.makeText(this, R.string.forgot_password_message, Toast.LENGTH_SHORT).show());
        findViewById(R.id.guest_button).setOnClickListener(v ->
                Toast.makeText(this, R.string.guest_message, Toast.LENGTH_SHORT).show());
        findViewById(R.id.signup_link).setOnClickListener(v ->
                startActivity(new Intent(this, SignupActivity.class)));
    }

    private void restoreRememberedCredentials() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        boolean remember = prefs.getBoolean(KEY_REMEMBER, true);
        rememberMe.setChecked(remember);
        if (remember) {
            emailInput.setText(prefs.getString(KEY_EMAIL, ""));
            passwordInput.setText(prefs.getString(KEY_PASSWORD, ""));
        }
    }

    private void saveRememberedCredentials(String email, String password) {
        SharedPreferences.Editor editor = getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit();
        if (rememberMe.isChecked()) {
            editor.putBoolean(KEY_REMEMBER, true);
            editor.putString(KEY_EMAIL, email);
            editor.putString(KEY_PASSWORD, password);
        } else {
            editor.clear();
        }
        editor.apply();
    }

    private void handleLogin() {
        String email = emailInput.getText() == null ? "" : emailInput.getText().toString().trim();
        String password = passwordInput.getText() == null ? "" : passwordInput.getText().toString().trim();

        if (TextUtils.isEmpty(email) || TextUtils.isEmpty(password)) {
            Toast.makeText(this, "Please enter email and password", Toast.LENGTH_SHORT).show();
            return;
        }

        loginBtn.setEnabled(false);

        new Thread(() -> {
            try {
                JSONObject payload = new JSONObject();
                payload.put("email", email);
                payload.put("password", password);
                payload.put("client", "app");

                String response = ApiClient.post("/auth/login", payload.toString());
                JSONObject json = new JSONObject(response);
                boolean ok = json.optBoolean("ok", false);
                JSONObject user = json.optJSONObject("user");
                String role = user != null ? user.optString("role", "") : "";

                runOnUiThread(() -> {
                    loginBtn.setEnabled(true);
                    if (!ok || user == null) {
                        Toast.makeText(this, "Invalid credentials", Toast.LENGTH_SHORT).show();
                        return;
                    }

                    saveRememberedCredentials(email, password);
                        getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit()
                            .putString(KEY_TOKEN, json.optString("token", ""))
                            .apply();
                        ApiClient.setAuthToken(json.optString("token", ""));

                    String normalizedRole = role.toUpperCase(Locale.US);
                    if ("ADMIN".equals(normalizedRole)) {
                        startActivity(new Intent(this, AdminDashboardActivity.class));
                        finish();
                        return;
                    }

                    if ("TECH".equals(normalizedRole) || "TECHNICIAN".equals(normalizedRole)) {
                        startActivity(new Intent(this, TechnicianDashboardActivity.class));
                        finish();
                        return;
                    }

                    Toast.makeText(this, "This account cannot sign in on the app", Toast.LENGTH_SHORT).show();
                });
            } catch (Exception e) {
                runOnUiThread(() -> {
                    loginBtn.setEnabled(true);
                    Toast.makeText(this, "Unable to connect to server. Check your internet and backend URL.", Toast.LENGTH_LONG).show();
                });
            }
        }).start();
    }
}
