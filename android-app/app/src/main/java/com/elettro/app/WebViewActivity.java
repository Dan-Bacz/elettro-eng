package com.elettro.app;

import android.annotation.SuppressLint;
import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.Gravity;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.ValueCallback;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.FileProvider;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import androidx.drawerlayout.widget.DrawerLayout;

import com.google.android.material.navigation.NavigationView;
import java.io.File;
import java.io.IOException;

public class WebViewActivity extends AppCompatActivity {
    public static final String EXTRA_ROUTE = "web_route";
    public static final String EXTRA_TITLE = "web_title";
    private static final String APP_ORIGIN = "https://elettro-eng-one.vercel.app";

    private WebView webView;
    private SwipeRefreshLayout refreshLayout;
    private View loadingBar;
    private View errorPanel;
    private TextView errorMessage;
    private DrawerLayout drawerLayout;
    private NavigationView techNavView;
    private View menuButton;
    private boolean returningToLogin;
    private ValueCallback<Uri[]> fileCallback;
    private Uri cameraPhoto;
    private final ActivityResultLauncher<Uri> takePicture = registerForActivityResult(
            new ActivityResultContracts.TakePicture(),
            saved -> finishFileSelection(saved ? new Uri[]{cameraPhoto} : null));
    private final ActivityResultLauncher<String> cameraPermission = registerForActivityResult(
            new ActivityResultContracts.RequestPermission(),
            granted -> {
                if (granted) launchReportCamera();
                else finishFileSelection(null);
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_webview);

        webView = findViewById(R.id.web_view);
        refreshLayout = findViewById(R.id.web_refresh);
        loadingBar = findViewById(R.id.web_loading);
        errorPanel = findViewById(R.id.web_error_panel);
        errorMessage = findViewById(R.id.web_error_message);
        drawerLayout = findViewById(R.id.web_drawer_layout);
        techNavView = findViewById(R.id.web_tech_nav_view);
        menuButton = findViewById(R.id.web_menu_button);

        String route = getIntent().getStringExtra(EXTRA_ROUTE);
        if (route == null || route.trim().isEmpty()) route = "/admin/dashboard";
        configureTechnicianDrawer(route);

        configureWebView();
        refreshLayout.setOnChildScrollUpCallback((parent, child) -> {
            String url = webView.getUrl();
            String path = url == null ? null : Uri.parse(url).getPath();
            // The job dialog scrolls independently of the WebView's root page.
            return "/technician/jobs".equals(path) || "/technician/jobs/".equals(path)
                    || webView.canScrollVertically(-1);
        });
        refreshLayout.setOnRefreshListener(() -> {
            errorPanel.setVisibility(View.GONE);
            webView.reload();
        });
        findViewById(R.id.web_retry).setOnClickListener(v -> {
            errorPanel.setVisibility(View.GONE);
            webView.reload();
        });

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack();
                else finish();
            }
        });

        loadAuthenticatedRoute(route);
    }

    private void configureTechnicianDrawer(String route) {
        if (!route.startsWith("/technician/")) return;

        menuButton.setVisibility(View.VISIBLE);
        techNavView.setVisibility(View.VISIBLE);
        menuButton.setOnClickListener(v -> drawerLayout.openDrawer(Gravity.START));

        View header = techNavView.getHeaderView(0);
        if (header != null) {
            TextView role = header.findViewById(R.id.drawer_header_role);
            if (role != null) role.setText(R.string.role_technician);
            TextView initial = header.findViewById(R.id.drawer_header_initial);
            if (initial != null) initial.setText("T");
        }

        techNavView.setNavigationItemSelectedListener(item -> {
            drawerLayout.closeDrawer(Gravity.START);
            int id = item.getItemId();
            if (id == R.id.nav_home) {
                loadAuthenticatedRoute("/technician/dashboard");
                return true;
            }
            if (id == R.id.nav_logout) {
                returnToNativeLogin();
                return true;
            }

            if (id == R.id.nav_my_jobs) {
                loadAuthenticatedRoute("/technician/jobs");
                return true;
            }

            String section = null;
            if (id == R.id.nav_notifications) section = "notifications";
            else if (id == R.id.nav_materials) section = "materials";
            else if (id == R.id.nav_profile) section = "profile";

            if (section != null) loadAuthenticatedRoute("/technician/dashboard#" + section);
            return section != null;
        });
        techNavView.setCheckedItem(R.id.nav_home);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(false);
        settings.setUseWideViewPort(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setTextZoom(100);
        settings.setUserAgentString(settings.getUserAgentString() + " ElettroAndroid/1.0");
        webView.setVerticalScrollBarEnabled(false);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if ("elettro://logout".equals(request.getUrl().toString())) {
                    returnToNativeLogin();
                    return true;
                }
                if (isLoginUrl(request.getUrl().toString())) {
                    returnToNativeLogin();
                    return true;
                }
                return !isAppUrl(request.getUrl());
            }

            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if ("elettro://logout".equals(url)) {
                    returnToNativeLogin();
                    return true;
                }
                if (isLoginUrl(url)) {
                    returnToNativeLogin();
                    return true;
                }
                return !isAppUrl(Uri.parse(url));
            }

            @Override public void onPageStarted(WebView view, String url, Bitmap favicon) {
                if (isLoginUrl(url)) {
                    returnToNativeLogin();
                    return;
                }
                loadingBar.setVisibility(View.VISIBLE);
                errorPanel.setVisibility(View.GONE);
            }

            @Override public void onPageFinished(WebView view, String url) {
                loadingBar.setVisibility(View.GONE);
                refreshLayout.setRefreshing(false);
                if (url.contains("/login")) {
                    returnToNativeLogin();
                }
            }

            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showError("Unable to load Elettro right now. Check your connection and try again.");
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                                       FileChooserParams params) {
                String url = view.getUrl();
                if (url == null || !isAppUrl(Uri.parse(url)) || !params.isCaptureEnabled()
                        || !"/technician/jobs".equals(Uri.parse(url).getPath())) return false;
                finishFileSelection(null);
                fileCallback = callback;
                if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                    launchReportCamera();
                } else {
                    cameraPermission.launch(Manifest.permission.CAMERA);
                }
                return true;
            }

            @Override public void onProgressChanged(WebView view, int progress) {
                loadingBar.setVisibility(progress < 100 ? View.VISIBLE : View.GONE);
            }
        });
    }

    private void launchReportCamera() {
        try {
            File directory = new File(getCacheDir(), "images");
            if (!directory.isDirectory() && !directory.mkdirs()) throw new IOException("Camera cache unavailable");
            File photo = File.createTempFile("report-", ".jpg", directory);
            cameraPhoto = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", photo);
            takePicture.launch(cameraPhoto);
        } catch (IOException | RuntimeException e) {
            finishFileSelection(null);
            android.widget.Toast.makeText(this, "Unable to open camera.", android.widget.Toast.LENGTH_SHORT).show();
        }
    }

    private void finishFileSelection(Uri[] result) {
        ValueCallback<Uri[]> callback = fileCallback;
        fileCallback = null;
        cameraPhoto = null;
        if (callback != null) callback.onReceiveValue(result);
    }

    private void loadAuthenticatedRoute(String route) {
        String token = getSharedPreferences("elettro_login", MODE_PRIVATE).getString(MainActivity.KEY_TOKEN, "");
        CookieManager cookies = CookieManager.getInstance();
        cookies.setCookie(APP_ORIGIN, "token=" + Uri.encode(token) + "; Path=/; Max-Age=604800; SameSite=Lax");
        cookies.flush();
        webView.loadUrl(APP_ORIGIN + (route.startsWith("/") ? route : "/" + route));
    }

    private boolean isAppUrl(Uri uri) {
        return APP_ORIGIN.equals(uri.getScheme() + "://" + uri.getHost());
    }

    private boolean isLoginUrl(String url) {
        return isAppUrl(Uri.parse(url)) && Uri.parse(url).getPath() != null
                && Uri.parse(url).getPath().endsWith("/login");
    }

    private void showError(String message) {
        loadingBar.setVisibility(View.GONE);
        refreshLayout.setRefreshing(false);
        errorMessage.setText(message);
        errorPanel.setVisibility(View.VISIBLE);
    }

    private void returnToNativeLogin() {
        if (returningToLogin || isFinishing()) return;
        returningToLogin = true;
        getSharedPreferences("elettro_login", MODE_PRIVATE)
                .edit()
                .remove(MainActivity.KEY_TOKEN)
                .apply();
        com.elettro.app.network.ApiClient.setAuthToken("");
        CookieManager.getInstance().removeAllCookies(null);
        CookieManager.getInstance().flush();

        Intent login = new Intent(this, MainActivity.class);
        login.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(login);
        finish();
    }
}
