package com.eldercare.controller;

import com.eldercare.repository.SupabaseConfig;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

public class HttpHelper {
    private static final Gson gson = SupabaseConfig.getGson();

    public static void setCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Role, X-User-Id, X-Requested-With, X-SNS-Internal-Key");
    }

    public static boolean validateSnsInternalKey(HttpExchange exchange) throws IOException {
        String expectedKey = System.getenv("SNS_INTERNAL_KEY");
        if (expectedKey == null || expectedKey.trim().isEmpty()) {
            return true; // If not configured in environment, allow access (local dev mode)
        }
        String providedKey = getHeader(exchange, "X-SNS-Internal-Key");
        if (providedKey == null || !providedKey.trim().equals(expectedKey.trim())) {
            sendErrorResponse(exchange, 401, "Unauthorized: Invalid or missing X-SNS-Internal-Key header");
            return false;
        }
        return true;
    }

    public static boolean handlePreflight(HttpExchange exchange) throws IOException {
        setCorsHeaders(exchange);
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
            exchange.close();
            return true;
        }
        return false;
    }

    public static String readBody(HttpExchange exchange) throws IOException {
        InputStream is = exchange.getRequestBody();
        return new String(is.readAllBytes(), StandardCharsets.UTF_8);
    }

    public static <T> T parseJson(HttpExchange exchange, Class<T> clazz) throws IOException {
        String body = readBody(exchange);
        if (body.trim().isEmpty()) {
            return null;
        }
        return gson.fromJson(body, clazz);
    }

    public static JsonObject parseJsonObject(HttpExchange exchange) throws IOException {
        String body = readBody(exchange);
        if (body.trim().isEmpty()) {
            return new JsonObject();
        }
        return gson.fromJson(body, JsonObject.class);
    }

    public static void sendJsonResponse(HttpExchange exchange, int statusCode, Object data) throws IOException {
        setCorsHeaders(exchange);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        String json = gson.toJson(data);
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    public static void sendSuccessResponse(HttpExchange exchange, String message, Object data) throws IOException {
        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", message);
        if (data != null) {
            resp.put("data", data);
        }
        sendJsonResponse(exchange, 200, resp);
    }

    public static void sendErrorResponse(HttpExchange exchange, int statusCode, String message) throws IOException {
        Map<String, Object> resp = new HashMap<>();
        resp.put("success", false);
        resp.put("error", message);
        sendJsonResponse(exchange, statusCode, resp);
    }

    public static String getHeader(HttpExchange exchange, String name) {
        return exchange.getRequestHeaders().getFirst(name);
    }

    public static String getUserRole(HttpExchange exchange) {
        String role = getHeader(exchange, "X-User-Role");
        return role != null ? role.toUpperCase() : "FAMILY";
    }

    public static String getUserId(HttpExchange exchange) {
        String id = getHeader(exchange, "X-User-Id");
        return id != null ? id : "usr-fam-1";
    }

    public static Map<String, String> getQueryParams(HttpExchange exchange) {
        Map<String, String> params = new HashMap<>();
        String query = exchange.getRequestURI().getQuery();
        if (query != null && !query.isEmpty()) {
            String[] pairs = query.split("&");
            for (String pair : pairs) {
                String[] kv = pair.split("=", 2);
                if (kv.length == 2) {
                    params.put(kv[0], kv[1]);
                } else if (kv.length == 1) {
                    params.put(kv[0], "");
                }
            }
        }
        return params;
    }

    public static String getString(JsonObject obj, String key, String defaultValue) {
        if (obj == null || !obj.has(key)) return defaultValue;
        com.google.gson.JsonElement elem = obj.get(key);
        if (elem == null || elem.isJsonNull()) return defaultValue;
        try {
            return elem.getAsString();
        } catch (Exception e) {
            return defaultValue;
        }
    }

    public static String getString(JsonObject obj, String key) {
        return getString(obj, key, null);
    }

    public static Integer getInt(JsonObject obj, String key, Integer defaultValue) {
        if (obj == null || !obj.has(key)) return defaultValue;
        com.google.gson.JsonElement elem = obj.get(key);
        if (elem == null || elem.isJsonNull()) return defaultValue;
        try {
            return elem.getAsInt();
        } catch (Exception e) {
            return defaultValue;
        }
    }

    public static Double getDouble(JsonObject obj, String key, Double defaultValue) {
        if (obj == null || !obj.has(key)) return defaultValue;
        com.google.gson.JsonElement elem = obj.get(key);
        if (elem == null || elem.isJsonNull()) return defaultValue;
        try {
            return elem.getAsDouble();
        } catch (Exception e) {
            return defaultValue;
        }
    }
}
