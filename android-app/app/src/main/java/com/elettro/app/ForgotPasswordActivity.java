package com.elettro.app;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.elettro.app.network.ApiClient;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.google.android.material.textfield.TextInputLayout;

import org.json.JSONObject;

/**
 * Technician-only "Forgot Password" flow.
 *
 * Step 1 asks for the account email and requests a 6-digit code.
 * Step 2 collects the emailed code.
 * Step 3 sets the new password and returns the user to login.
 *
 * The server decides which emails are eligible (active technician accounts only)
 * and answers with the same neutral message either way, so this screen cannot be
 * used to discover which email addresses are registered.
 */
public class ForgotPasswordActivity extends AppCompatActivity {

    private static final int CODE_LENGTH = 6;
    private static final int MIN_PASSWORD_LENGTH = 6;
    private static final long RESEND_COOLDOWN_MS = 60_000L;

    private LinearLayout stepEmail, stepCode, stepPassword;
    private TextInputLayout emailLayout, codeLayout, newPasswordLayout;
    private TextInputEditText emailInput, codeInput, newPasswordInput;
    private TextView codeSentLabel, resendLink;
    private MaterialButton sendCodeButton, verifyButton, resetButton;

    private String email = "";
    private long resendAvailableAt = 0L;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable resendTicker = new Runnable() {
        @Override
        public void run() {
            updateResendLink();
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_forgot_password);

        stepEmail = findViewById(R.id.step_email);
        stepCode = findViewById(R.id.step_code);
        stepPassword = findViewById(R.id.step_password);

        emailLayout = findViewById(R.id.email_layout);
        codeLayout = findViewById(R.id.code_layout);
        newPasswordLayout = findViewById(R.id.new_password_layout);

        emailInput = findViewById(R.id.email_input);
        codeInput = findViewById(R.id.code_input);
        newPasswordInput = findViewById(R.id.new_password_input);

        codeSentLabel = findViewById(R.id.code_sent_label);
        resendLink = findViewById(R.id.resend_link);

        sendCodeButton = findViewById(R.id.send_code_button);
        verifyButton = findViewById(R.id.verify_button);
        resetButton = findViewById(R.id.reset_button);

        ((ImageButton) findViewById(R.id.btn_back)).setOnClickListener(v -> finish());
        sendCodeButton.setOnClickListener(v -> requestCode(false));
        verifyButton.setOnClickListener(v -> verifyCode());
        resetButton.setOnClickListener(v -> resetPassword());
        findViewById(R.id.resend_link).setOnClickListener(v -> requestCode(true));
        findViewById(R.id.change_email_link).setOnClickListener(v -> showStep(1));

        String prefilled = getIntent() != null ? getIntent().getStringExtra(MainActivity.EXTRA_EMAIL) : null;
        if (prefilled != null) emailInput.setText(prefilled);

        codeInput.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {
            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
            }

            @Override
            public void afterTextChanged(Editable s) {
                if (s.length() == CODE_LENGTH) verifyCode();
            }
        });

        showStep(1);
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacks(resendTicker);
        super.onDestroy();
    }

    private void showStep(int step) {
        stepEmail.setVisibility(step == 1 ? View.VISIBLE : View.GONE);
        stepCode.setVisibility(step == 2 ? View.VISIBLE : View.GONE);
        stepPassword.setVisibility(step == 3 ? View.VISIBLE : View.GONE);
    }

    private void setBusy(MaterialButton button, int busyStringRes, int idleStringRes) {
        boolean idle = button.getTag() == null;
        button.setEnabled(idle);
        button.setText(idle ? getString(idleStringRes) : getString(busyStringRes));
        button.setTag(idle ? null : "busy");
    }

    private void clearErrors() {
        emailLayout.setError(null);
        codeLayout.setError(null);
        newPasswordLayout.setError(null);
    }

    // === Step 1: request the emailed code ===

    private void requestCode(boolean isResend) {
        if (isResend && System.currentTimeMillis() < resendAvailableAt) {
            updateResendLink();
            return;
        }

        String value = emailInput.getText() == null ? "" : emailInput.getText().toString().trim();
        if (value.isEmpty()) {
            emailLayout.setError(getString(R.string.forgot_password_enter_email));
            return;
        }

        clearErrors();
        email = value;
        setBusy(sendCodeButton, R.string.sending_code, R.string.send_code);

        new Thread(() -> {
            try {
                JSONObject payload = new JSONObject();
                payload.put("email", value);
                payload.put("client", "app");

                String response = ApiClient.post("/auth/forgot-password", payload.toString());
                JSONObject json = new JSONObject(response == null ? "{}" : response);
                String error = json.optString("error", "");
                String message = json.optString("message", "");
                long cooldown = json.optLong("cooldownSeconds", 60);

                runOnUiThread(() -> {
                    setBusy(sendCodeButton, R.string.sending_code, R.string.send_code);
                    if (!error.isEmpty()) {
                        Toast.makeText(this, error, Toast.LENGTH_LONG).show();
                        return;
                    }
                    // The server always answers neutrally, so treat any success as
                    // "continue" rather than revealing whether the account exists.
                    Toast.makeText(this, message.isEmpty() ? getString(R.string.forgot_password_step1_subtitle) : message, Toast.LENGTH_LONG).show();
                    codeSentLabel.setText(getString(R.string.code_sent_to, value));
                    codeInput.setText("");
                    resendAvailableAt = System.currentTimeMillis() + cooldown * 1000L;
                    handler.removeCallbacks(resendTicker);
                    handler.post(resendTicker);
                    showStep(2);
                    codeInput.requestFocus();
                });
            } catch (Exception e) {
                runOnUiThread(() -> {
                    setBusy(sendCodeButton, R.string.sending_code, R.string.send_code);
                    Toast.makeText(this, R.string.network_error, Toast.LENGTH_LONG).show();
                });
            }
        }).start();
    }

    private void updateResendLink() {
        long remaining = resendAvailableAt - System.currentTimeMillis();
        if (remaining <= 0) {
            resendLink.setEnabled(true);
            resendLink.setText(R.string.resend_code);
            handler.removeCallbacks(resendTicker);
        } else {
            long seconds = (remaining + 999) / 1000;
            resendLink.setEnabled(false);
            resendLink.setText(getString(R.string.resend_code) + " (" + seconds + "s)");
            handler.postDelayed(resendTicker, 1000);
        }
    }

    // === Step 2: verify the code before allowing the password to change ===

    private void verifyCode() {
        String code = codeInput.getText() == null ? "" : codeInput.getText().toString().trim();
        if (code.length() != CODE_LENGTH) {
            if (!code.isEmpty()) codeLayout.setError(getString(R.string.error_invalid_code));
            return;
        }
        if (verifyButton.getTag() != null) return;

        clearErrors();
        setBusy(verifyButton, R.string.verifying_code, R.string.verify_code);

        new Thread(() -> {
            try {
                JSONObject payload = new JSONObject();
                payload.put("email", email);
                payload.put("code", code);

                String response = ApiClient.post("/auth/reset-password/verify", payload.toString());
                JSONObject json = new JSONObject(response == null ? "{}" : response);
                boolean ok = json.optBoolean("ok", false);
                String error = json.optString("error", "");

                runOnUiThread(() -> {
                    setBusy(verifyButton, R.string.verifying_code, R.string.verify_code);
                    if (!ok) {
                        codeLayout.setError(error.isEmpty() ? getString(R.string.error_invalid_code) : error);
                        return;
                    }
                    newPasswordInput.setText("");
                    showStep(3);
                    newPasswordInput.requestFocus();
                });
            } catch (Exception e) {
                runOnUiThread(() -> {
                    setBusy(verifyButton, R.string.verifying_code, R.string.verify_code);
                    Toast.makeText(this, R.string.network_error, Toast.LENGTH_LONG).show();
                });
            }
        }).start();
    }

    // === Step 3: set the new password ===

    private void resetPassword() {
        String password = newPasswordInput.getText() == null ? "" : newPasswordInput.getText().toString();
        if (password.length() < MIN_PASSWORD_LENGTH) {
            newPasswordLayout.setError("Password must be at least " + MIN_PASSWORD_LENGTH + " characters");
            return;
        }
        if (resetButton.getTag() != null) return;

        clearErrors();
        setBusy(resetButton, R.string.resetting_password, R.string.reset_password);

        new Thread(() -> {
            try {
                JSONObject payload = new JSONObject();
                payload.put("email", email);
                payload.put("code", codeInput.getText() == null ? "" : codeInput.getText().toString().trim());
                payload.put("password", password);

                String response = ApiClient.post("/auth/reset-password", payload.toString());
                JSONObject json = new JSONObject(response == null ? "{}" : response);
                boolean ok = json.optBoolean("ok", false);
                String error = json.optString("error", "");

                runOnUiThread(() -> {
                    setBusy(resetButton, R.string.resetting_password, R.string.reset_password);
                    if (!ok) {
                        newPasswordLayout.setError(error.isEmpty() ? getString(R.string.error_invalid_code) : error);
                        return;
                    }
                    Toast.makeText(this, R.string.password_reset_done, Toast.LENGTH_LONG).show();
                    Intent back = new Intent(this, MainActivity.class);
                    back.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
                    back.putExtra(MainActivity.EXTRA_EMAIL, email);
                    back.putExtra(MainActivity.EXTRA_EMAIL_FOCUS, true);
                    startActivity(back);
                    finish();
                });
            } catch (Exception e) {
                runOnUiThread(() -> {
                    setBusy(resetButton, R.string.resetting_password, R.string.reset_password);
                    Toast.makeText(this, R.string.network_error, Toast.LENGTH_LONG).show();
                });
            }
        }).start();
    }
}
