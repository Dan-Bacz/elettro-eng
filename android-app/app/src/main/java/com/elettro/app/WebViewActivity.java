package com.elettro.app;

import android.annotation.SuppressLint;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

public class WebViewActivity extends AppCompatActivity {
    public static final String EXTRA_ROUTE = "web_route";
    public static final String EXTRA_TITLE = "web_title";
    private static final String APP_ORIGIN = "https://elettro-eng-one.vercel.app";

    private WebView webView;
    private SwipeRefreshLayout refreshLayout;
    private View loadingBar;
    private View errorPanel;
    private TextView errorMessage;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_webview);

        webView = findViewById(R.id.web_view);
        refreshLayout = findViewById(R.id.web_refresh);
        loadingBar = findViewById(R.id.web_loading);
        errorPanel = findViewById(R.id.web_error_panel);
        errorMessage = findViewById(R.id.web_error_message);

        configureWebView();
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

        String route = getIntent().getStringExtra(EXTRA_ROUTE);
        if (route == null || route.trim().isEmpty()) route = "/admin/dashboard";
        loadAuthenticatedRoute(route);
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

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !isAppUrl(request.getUrl());
            }

            @Override public void onPageStarted(WebView view, String url, Bitmap favicon) {
                loadingBar.setVisibility(View.VISIBLE);
                errorPanel.setVisibility(View.GONE);
            }

            @Override public void onPageFinished(WebView view, String url) {
                loadingBar.setVisibility(View.GONE);
                refreshLayout.setRefreshing(false);
                if (url.contains("/login")) {
                    showError("Your session has expired. Please sign in again.");
                }
            }

            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showError("Unable to load Elettro right now. Check your connection and try again.");
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int progress) {
                loadingBar.setVisibility(progress < 100 ? View.VISIBLE : View.GONE);
            }
        });
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

    private void showError(String message) {
        loadingBar.setVisibility(View.GONE);
        refreshLayout.setRefreshing(false);
        errorMessage.setText(message);
        errorPanel.setVisibility(View.VISIBLE);
    }
}
