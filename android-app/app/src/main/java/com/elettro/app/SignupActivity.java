package com.elettro.app;

import android.os.Bundle;
import android.text.TextUtils;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.elettro.app.network.ApiClient;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;

import org.json.JSONObject;

public class SignupActivity extends AppCompatActivity {
    private TextInputEditText nameInput;
    private TextInputEditText emailInput;
    private TextInputEditText phoneInput;
    private TextInputEditText passwordInput;
    private TextInputEditText confirmPasswordInput;
    private MaterialButton signupBtn;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_signup);

        nameInput = findViewById(R.id.name_input);
        emailInput = findViewById(R.id.email_input);
        phoneInput = findViewById(R.id.phone_input);
        passwordInput = findViewById(R.id.password_input);
        confirmPasswordInput = findViewById(R.id.confirm_password_input);
        signupBtn = findViewById(R.id.signup_button);

        signupBtn.setOnClickListener(v -> handleSignup());

        findViewById(R.id.login_link_action).setOnClickListener(v -> {
            finish();
        });
    }

    private void handleSignup() {
        String name = nameInput.getText() == null ? "" : nameInput.getText().toString().trim();
        String email = emailInput.getText() == null ? "" : emailInput.getText().toString().trim();
        String phone = phoneInput.getText() == null ? "" : phoneInput.getText().toString().trim();
        String password = passwordInput.getText() == null ? "" : passwordInput.getText().toString().trim();
        String confirmPassword = confirmPasswordInput.getText() == null ? "" : confirmPasswordInput.getText().toString().trim();

        if (TextUtils.isEmpty(name)) {
            nameInput.setError("Name is required");
            nameInput.requestFocus();
            return;
        }

        if (TextUtils.isEmpty(email)) {
            emailInput.setError("Email is required");
            emailInput.requestFocus();
            return;
        }

        if (TextUtils.isEmpty(password)) {
            passwordInput.setError("Password is required");
            passwordInput.requestFocus();
            return;
        }

        if (password.length() < 6) {
            passwordInput.setError("Password must be at least 6 characters");
            passwordInput.requestFocus();
            return;
        }

        if (!password.equals(confirmPassword)) {
            confirmPasswordInput.setError("Passwords do not match");
            confirmPasswordInput.requestFocus();
            return;
        }

        signupBtn.setEnabled(false);

        new Thread(() -> {
            try {
                JSONObject payload = new JSONObject();
                payload.put("name", name);
                payload.put("email", email);
                payload.put("phone", phone);
                payload.put("password", password);

                String response = ApiClient.post("/auth/signup", payload.toString());

                if (response == null) {
                    runOnUiThread(() -> {
                        signupBtn.setEnabled(true);
                        Toast.makeText(this, "Unable to connect to server", Toast.LENGTH_LONG).show();
                    });
                    return;
                }

                JSONObject json = new JSONObject(response);
                boolean ok = json.optBoolean("ok", false);

                runOnUiThread(() -> {
                    signupBtn.setEnabled(true);
                    if (!ok) {
                        String error = json.optString("error", "Signup failed");
                        Toast.makeText(this, error, Toast.LENGTH_LONG).show();
                        return;
                    }

                    new androidx.appcompat.app.AlertDialog.Builder(this)
                            .setTitle(R.string.signup_pending_title)
                            .setMessage(R.string.signup_pending_message)
                            .setPositiveButton("Back to Login", (dialog, which) -> {
                                dialog.dismiss();
                                finish();
                            })
                            .setCancelable(false)
                            .show();
                });
            } catch (Exception e) {
                runOnUiThread(() -> {
                    signupBtn.setEnabled(true);
                    Toast.makeText(this, "Unable to connect to server. Check your internet and backend URL.", Toast.LENGTH_LONG).show();
                });
            }
        }).start();
    }
}