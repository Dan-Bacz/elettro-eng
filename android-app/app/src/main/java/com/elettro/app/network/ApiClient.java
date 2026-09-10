package com.elettro.app.network;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

public class ApiClient {
    private static final OkHttpClient client = new OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)
            .build();

    private static String authToken;
    public static String BASE_URL = "https://elettro-eng-one.vercel.app/api";
    public static String LOCAL_URL = "http://10.0.2.2:3000/api";

    public static void setAuthToken(String token) {
        authToken = token;
    }

    private static Request.Builder authenticated(Request.Builder builder) {
        if (authToken != null && !authToken.isEmpty()) {
            builder.addHeader("Authorization", "Bearer " + authToken);
        }
        return builder;
    }

    private static String getActiveUrl(String path) {
        if (path.startsWith("http://") || path.startsWith("https://")) {
            return path;
        }
        return BASE_URL + (path.startsWith("/") ? path : "/" + path);
    }

    public static String get(String path) throws IOException {
        String url = getActiveUrl(path);
        Request req = authenticated(new Request.Builder().url(url)).get().build();
        try {
            try (Response resp = client.newCall(req).execute()) {
                if (resp.isSuccessful() && resp.body() != null) {
                    return resp.body().string();
                }
            }
        } catch (IOException e) {
            if (!url.startsWith(LOCAL_URL)) {
                String fallbackUrl = LOCAL_URL + (path.startsWith("/") ? path : "/" + path);
                Request fallbackReq = authenticated(new Request.Builder().url(fallbackUrl)).get().build();
                try (Response resp = client.newCall(fallbackReq).execute()) {
                    return resp.body() != null ? resp.body().string() : null;
                }
            }
            throw e;
        }
        return null;
    }

    public static String post(String path, String json) throws IOException {
        String url = getActiveUrl(path);
        RequestBody body = RequestBody.create(json, MediaType.get("application/json; charset=utf-8"));
        Request req = authenticated(new Request.Builder()
                .url(url)
                .addHeader("Content-Type", "application/json")
        ).post(body).build();

        try {
            try (Response resp = client.newCall(req).execute()) {
                return resp.body() != null ? resp.body().string() : null;
            }
        } catch (IOException e) {
            if (!url.startsWith(LOCAL_URL)) {
                String fallbackUrl = LOCAL_URL + (path.startsWith("/") ? path : "/" + path);
                Request fallbackReq = authenticated(new Request.Builder()
                        .url(fallbackUrl)
                        .addHeader("Content-Type", "application/json")
                ).post(body).build();
                try (Response resp = client.newCall(fallbackReq).execute()) {
                    return resp.body() != null ? resp.body().string() : null;
                }
            }
            throw e;
        }
    }

    public static String delete(String path, String json) throws IOException {
        String url = getActiveUrl(path);
        RequestBody body = RequestBody.create(json, MediaType.get("application/json; charset=utf-8"));
        Request req = authenticated(new Request.Builder()
                .url(url)
                .addHeader("Content-Type", "application/json")
        ).delete(body).build();

        try (Response resp = client.newCall(req).execute()) {
            return resp.body() != null ? resp.body().string() : null;
        }
    }
}
