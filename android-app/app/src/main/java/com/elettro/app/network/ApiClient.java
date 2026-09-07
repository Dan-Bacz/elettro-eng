package com.elettro.app.network;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

import java.io.IOException;

public class ApiClient {
    private static final OkHttpClient client = new OkHttpClient();
    private static String authToken;
    // Production backend URL for the deployed Elettro app
    public static String BASE_URL = "https://elettro-eng-one.vercel.app/api";

    public static void setAuthToken(String token) {
        authToken = token;
    }

    private static Request.Builder authenticated(Request.Builder builder) {
        if (authToken != null && !authToken.isEmpty()) {
            builder.addHeader("Authorization", "Bearer " + authToken);
        }
        return builder;
    }

    public static String get(String path) throws IOException {
        Request req = authenticated(new Request.Builder()
                .url(BASE_URL + path)
        ).get().build();
        try (Response resp = client.newCall(req).execute()) {
            return resp.body() != null ? resp.body().string() : null;
        }
    }

    public static String post(String path, String json) throws IOException {
        RequestBody body = RequestBody.create(json, MediaType.get("application/json; charset=utf-8"));
        Request req = authenticated(new Request.Builder()
                .url(BASE_URL + path)
                .addHeader("Content-Type", "application/json")
        ).post(body).build();
        try (Response resp = client.newCall(req).execute()) {
            return resp.body() != null ? resp.body().string() : null;
        }
    }
}
