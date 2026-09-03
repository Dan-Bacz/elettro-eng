package com.elettro.app.network;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

import java.io.IOException;

public class ApiClient {
    private static final OkHttpClient client = new OkHttpClient();
    // Update this to point to your deployed backend (Vercel URL)
    public static String BASE_URL = "https://your-backend.example.com/api";

    public static String get(String path) throws IOException {
        Request req = new Request.Builder().url(BASE_URL + path).build();
        try (Response resp = client.newCall(req).execute()){
            return resp.body() != null ? resp.body().string() : null;
        }
    }

    public static String post(String path, String json) throws IOException {
        RequestBody body = RequestBody.create(json, MediaType.get("application/json; charset=utf-8"));
        Request req = new Request.Builder().url(BASE_URL + path).post(body).build();
        try (Response resp = client.newCall(req).execute()){
            return resp.body() != null ? resp.body().string() : null;
        }
    }
}
