package com.elettro.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.text.TextUtils;
import android.util.Base64;
import android.view.View;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import com.elettro.app.network.ApiClient;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;

public class SignupActivity extends AppCompatActivity {
    private static final int REQ_CAMERA = 1001;
    private static final int REQ_CAMERA_PERMISSION = 1002;
    private static final int REQ_PROFILE_PHOTO = 1003;

    private TextInputEditText nameInput;
    private TextInputEditText emailInput;
    private TextInputEditText phoneInput;
    private TextInputEditText passwordInput;
    private TextInputEditText confirmPasswordInput;
    private MaterialButton signupBtn;
    private ImageView photoPreview;
    private LinearLayout cameraPlaceholder;
    private Uri capturedImageUri;
    private String capturedImageBase64;
    private android.widget.Button captureProfileBtn;
    private RadioGroup roleGroup;
    private RadioButton roleTechnician;
    private RadioButton roleRider;

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
        photoPreview = findViewById(R.id.photo_preview);
        cameraPlaceholder = findViewById(R.id.camera_placeholder);
        captureProfileBtn = findViewById(R.id.capture_profile_btn);
        roleGroup = findViewById(R.id.role_group);
        roleTechnician = findViewById(R.id.role_technician);
        roleRider = findViewById(R.id.role_rider);

        signupBtn.setOnClickListener(v -> handleSignup());

        findViewById(R.id.camera_container).setOnClickListener(v -> openCamera());
        captureProfileBtn.setOnClickListener(v -> openCamera());
        findViewById(R.id.upload_profile_btn).setOnClickListener(v -> openPhotoPicker());

        findViewById(R.id.login_link_action).setOnClickListener(v -> {
            finish();
        });
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
            Toast.makeText(this, "No camera app found", Toast.LENGTH_SHORT).show();
            return;
        }
        try {
            File imageRoot = new File(getCacheDir(), "images");
            if (!imageRoot.exists()) imageRoot.mkdirs();
            File photoFile = new File(imageRoot, "elettro_signup_" + System.currentTimeMillis() + ".jpg");
            Uri photoUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", photoFile);
            capturedImageUri = photoUri;
            takePicture.putExtra(MediaStore.EXTRA_OUTPUT, photoUri);
            startActivityForResult(takePicture, REQ_CAMERA);
        } catch (Exception e) {
            Toast.makeText(this, "Unable to open camera", Toast.LENGTH_SHORT).show();
        }
    }

    private void openPhotoPicker() {
        Intent pickPhoto = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        pickPhoto.addCategory(Intent.CATEGORY_OPENABLE);
        pickPhoto.setType("image/*");
        try {
            startActivityForResult(pickPhoto, REQ_PROFILE_PHOTO);
        } catch (android.content.ActivityNotFoundException e) {
            Toast.makeText(this, "No photo picker found", Toast.LENGTH_SHORT).show();
        }
    }

    private void processProfileImage(Uri uri) {
        try {
            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inJustDecodeBounds = true;
            try (InputStream stream = getContentResolver().openInputStream(uri)) {
                BitmapFactory.decodeStream(stream, null, options);
            }
            if (options.outWidth < 1 || options.outHeight < 1) {
                throw new java.io.IOException("Could not decode photo");
            }

            options.inSampleSize = 1;
            while (Math.max(options.outWidth, options.outHeight) / options.inSampleSize > 1200) {
                options.inSampleSize *= 2;
            }
            options.inJustDecodeBounds = false;
            Bitmap bitmap;
            try (InputStream stream = getContentResolver().openInputStream(uri)) {
                bitmap = BitmapFactory.decodeStream(stream, null, options);
            }
            if (bitmap == null) throw new java.io.IOException("Could not decode photo");

            int maxDim = 600;
            int w = bitmap.getWidth();
            int h = bitmap.getHeight();
            if (Math.max(w, h) > maxDim) {
                float scale = (float) maxDim / Math.max(w, h);
                bitmap = Bitmap.createScaledBitmap(bitmap, Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale)), true);
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.JPEG, 80, baos);
            byte[] bytes = baos.toByteArray();
            capturedImageBase64 = "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP);

            photoPreview.setImageBitmap(bitmap);
            photoPreview.setClipToOutline(true);
            photoPreview.setOutlineProvider(new android.view.ViewOutlineProvider() {
                @Override
                public void getOutline(android.view.View view, android.graphics.Outline outline) {
                    outline.setOval(0, 0, view.getWidth(), view.getHeight());
                }
            });
            photoPreview.setVisibility(View.VISIBLE);
            cameraPlaceholder.setVisibility(View.GONE);
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
            if (capturedImageUri != null) processProfileImage(capturedImageUri);
            else if (data != null && data.getData() != null) processProfileImage(data.getData());
        } else if (requestCode == REQ_PROFILE_PHOTO && resultCode == RESULT_OK
                && data != null && data.getData() != null) {
            processProfileImage(data.getData());
        }
    }

    private void handleSignup() {
        String name = nameInput.getText() == null ? "" : nameInput.getText().toString().trim();
        String email = emailInput.getText() == null ? "" : emailInput.getText().toString().trim();
        String phone = phoneInput.getText() == null ? "" : phoneInput.getText().toString().trim();
        String password = passwordInput.getText() == null ? "" : passwordInput.getText().toString().trim();
        String confirmPassword = confirmPasswordInput.getText() == null ? "" : confirmPasswordInput.getText().toString().trim();

        // Get selected role
        final String role;
        if (roleRider.isChecked()) {
            role = "RIDER";
        } else {
            role = "TECH";
        }

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
        signupBtn.setText(R.string.loading);

        new Thread(() -> {
            try {
                JSONObject payload = new JSONObject();
                payload.put("name", name);
                payload.put("email", email);
                payload.put("phone", phone);
                payload.put("password", password);
                payload.put("role", role);
                if (capturedImageBase64 != null) payload.put("profileImage", capturedImageBase64);

                String response = ApiClient.post("/auth/signup", payload.toString());

                if (response == null) {
                    runOnUiThread(() -> {
                        signupBtn.setEnabled(true);
                        signupBtn.setText(R.string.signup_button);
                        Toast.makeText(this, "Unable to connect to server", Toast.LENGTH_LONG).show();
                    });
                    return;
                }

                JSONObject json = new JSONObject(response);
                boolean ok = json.optBoolean("ok", false);

                runOnUiThread(() -> {
                    signupBtn.setEnabled(true);
                    signupBtn.setText(R.string.signup_button);
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
                    signupBtn.setText(R.string.signup_button);
                    Toast.makeText(this, "Unable to connect to server. Check your internet and backend URL.", Toast.LENGTH_LONG).show();
                });
            }
        }).start();
    }
}