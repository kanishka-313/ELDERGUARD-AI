package com.eldercare.repository;

import com.google.gson.*;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

public class SupabaseConfig {
    private static final String DEFAULT_URL = "https://pvnezkcrinlobmvkopfj.supabase.co";
    private static final String DEFAULT_KEY = "sb_publishable_2deyqjtqKPrvMJV4f3YtWg_VUOM2MjU";

    private static String supabaseUrl;
    private static String supabaseKey;
    private static HttpClient httpClient;
    private static final Gson gson = new GsonBuilder().serializeNulls().setPrettyPrinting().create();
    private static boolean initialized = false;

    public static synchronized void init() {
        if (initialized) return;

        Map<String, String> envMap = loadEnvFile();

        supabaseUrl = getVal("VITE_SUPABASE_URL", envMap);
        if (supabaseUrl == null || supabaseUrl.trim().isEmpty()) {
            supabaseUrl = getVal("SUPABASE_URL", envMap);
        }
        if (supabaseUrl == null || supabaseUrl.trim().isEmpty()) {
            supabaseUrl = DEFAULT_URL;
        }
        supabaseUrl = supabaseUrl.trim();
        if (supabaseUrl.endsWith("/")) {
            supabaseUrl = supabaseUrl.substring(0, supabaseUrl.length() - 1);
        }

        supabaseKey = getVal("VITE_SUPABASE_ANON_KEY", envMap);
        if (supabaseKey == null || supabaseKey.trim().isEmpty()) {
            supabaseKey = getVal("SUPABASE_ANON_KEY", envMap);
        }
        if (supabaseKey == null || supabaseKey.trim().isEmpty()) {
            supabaseKey = getVal("SUPABASE_KEY", envMap);
        }
        if (supabaseKey == null || supabaseKey.trim().isEmpty()) {
            supabaseKey = DEFAULT_KEY;
        }
        supabaseKey = supabaseKey.trim();

        httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();

        initialized = true;

        System.out.println("[Supabase] Initializing Java Backend client connecting to: " + supabaseUrl);

        boolean pingOk = ping();
        if (pingOk) {
            System.out.println("✅ [Supabase] Connected successfully to Supabase Cloud Database!");
        } else {
            System.err.println("⚠️ [Supabase] Notice: Supabase endpoint ping returned non-200. Will retry on requests.");
        }
    }

    public static boolean ping() {
        try {
            JsonArray arr = select("users", "limit=1");
            return arr != null;
        } catch (Exception e) {
            return false;
        }
    }

    public static Gson getGson() {
        return gson;
    }

    public static String getSupabaseUrl() {
        if (!initialized) init();
        return supabaseUrl;
    }

    public static String getSupabaseKey() {
        if (!initialized) init();
        return supabaseKey;
    }

    public static JsonArray select(String table, String queryParams) {
        if (!initialized) init();
        try {
            String fullUrl = supabaseUrl + "/rest/v1/" + table;
            if (queryParams != null && !queryParams.trim().isEmpty()) {
                fullUrl += "?" + queryParams;
            }

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(fullUrl))
                    .header("apikey", supabaseKey)
                    .header("Authorization", "Bearer " + supabaseKey)
                    .header("Accept", "application/json")
                    .GET()
                    .timeout(Duration.ofSeconds(15))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                JsonElement elem = JsonParser.parseString(response.body());
                if (elem.isJsonArray()) {
                    return elem.getAsJsonArray();
                } else if (elem.isJsonObject()) {
                    JsonArray arr = new JsonArray();
                    arr.add(elem.getAsJsonObject());
                    return arr;
                }
            } else {
                System.err.println("[Supabase select " + table + "] HTTP " + response.statusCode() + ": " + response.body());
            }
        } catch (Exception e) {
            System.err.println("[Supabase select error on " + table + "]: " + e.getMessage());
        }
        return new JsonArray();
    }

    public static JsonObject selectSingle(String table, String queryParams) {
        String q = (queryParams != null && !queryParams.isEmpty()) ? queryParams + "&limit=1" : "limit=1";
        JsonArray arr = select(table, q);
        if (arr != null && arr.size() > 0 && arr.get(0).isJsonObject()) {
            return arr.get(0).getAsJsonObject();
        }
        return null;
    }

    public static JsonElement insert(String table, JsonElement body) {
        if (!initialized) init();
        try {
            String fullUrl = supabaseUrl + "/rest/v1/" + table;

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(fullUrl))
                    .header("apikey", supabaseKey)
                    .header("Authorization", "Bearer " + supabaseKey)
                    .header("Content-Type", "application/json")
                    .header("Prefer", "return=representation")
                    .POST(HttpRequest.BodyPublishers.ofString(body.toString(), StandardCharsets.UTF_8))
                    .timeout(Duration.ofSeconds(15))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return JsonParser.parseString(response.body());
            } else {
                System.err.println("[Supabase insert " + table + "] HTTP " + response.statusCode() + ": " + response.body());
            }
        } catch (Exception e) {
            System.err.println("[Supabase insert error on " + table + "]: " + e.getMessage());
        }
        return null;
    }

    public static JsonElement upsert(String table, JsonElement body, String onConflictColumn) {
        if (!initialized) init();
        try {
            String fullUrl = supabaseUrl + "/rest/v1/" + table;
            if (onConflictColumn != null && !onConflictColumn.isEmpty()) {
                fullUrl += "?on_conflict=" + URLEncoder.encode(onConflictColumn, StandardCharsets.UTF_8);
            }

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(fullUrl))
                    .header("apikey", supabaseKey)
                    .header("Authorization", "Bearer " + supabaseKey)
                    .header("Content-Type", "application/json")
                    .header("Prefer", "resolution=merge-duplicates,return=representation")
                    .POST(HttpRequest.BodyPublishers.ofString(body.toString(), StandardCharsets.UTF_8))
                    .timeout(Duration.ofSeconds(15))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return JsonParser.parseString(response.body());
            } else {
                if (body.isJsonObject() && onConflictColumn != null && body.getAsJsonObject().has(onConflictColumn)) {
                    String conflictVal = body.getAsJsonObject().get(onConflictColumn).getAsString();
                    JsonObject existing = selectSingle(table, onConflictColumn + "=eq." + urlEncode(conflictVal));
                    if (existing != null) {
                        return update(table, onConflictColumn + "=eq." + urlEncode(conflictVal), body);
                    } else {
                        return insert(table, body);
                    }
                }
                System.err.println("[Supabase upsert " + table + "] HTTP " + response.statusCode() + ": " + response.body());
            }
        } catch (Exception e) {
            System.err.println("[Supabase upsert error on " + table + "]: " + e.getMessage());
        }
        return null;
    }

    public static JsonElement update(String table, String filterQuery, JsonElement body) {
        if (!initialized) init();
        try {
            String fullUrl = supabaseUrl + "/rest/v1/" + table;
            if (filterQuery != null && !filterQuery.isEmpty()) {
                fullUrl += "?" + filterQuery;
            }

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(fullUrl))
                    .header("apikey", supabaseKey)
                    .header("Authorization", "Bearer " + supabaseKey)
                    .header("Content-Type", "application/json")
                    .header("Prefer", "return=representation")
                    .method("PATCH", HttpRequest.BodyPublishers.ofString(body.toString(), StandardCharsets.UTF_8))
                    .timeout(Duration.ofSeconds(15))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return JsonParser.parseString(response.body());
            } else {
                System.err.println("[Supabase update " + table + "] HTTP " + response.statusCode() + ": " + response.body());
            }
        } catch (Exception e) {
            System.err.println("[Supabase update error on " + table + "]: " + e.getMessage());
        }
        return null;
    }

    public static boolean delete(String table, String filterQuery) {
        if (!initialized) init();
        try {
            String fullUrl = supabaseUrl + "/rest/v1/" + table;
            if (filterQuery != null && !filterQuery.isEmpty()) {
                fullUrl += "?" + filterQuery;
            }

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(fullUrl))
                    .header("apikey", supabaseKey)
                    .header("Authorization", "Bearer " + supabaseKey)
                    .DELETE()
                    .timeout(Duration.ofSeconds(15))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            return response.statusCode() >= 200 && response.statusCode() < 300;
        } catch (Exception e) {
            System.err.println("[Supabase delete error on " + table + "]: " + e.getMessage());
            return false;
        }
    }

    public static String urlEncode(String value) {
        if (value == null) return "";
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    public static void close() {
        System.out.println("[Supabase] Backend client connections closed.");
    }

    private static String getVal(String key, Map<String, String> envMap) {
        String val = System.getenv(key);
        if (val != null && !val.trim().isEmpty()) return val.trim();
        val = System.getProperty(key);
        if (val != null && !val.trim().isEmpty()) return val.trim();
        val = envMap.get(key);
        if (val != null && !val.trim().isEmpty()) return val.trim();
        return null;
    }

    private static Map<String, String> loadEnvFile() {
        Map<String, String> map = new HashMap<>();
        String[] possiblePaths = {
            ".env",
            "../.env",
            "../../.env",
            "d:/Cohort 2.0/.env"
        };
        for (String p : possiblePaths) {
            File f = new File(p);
            if (f.exists() && f.isFile()) {
                try (BufferedReader br = new BufferedReader(new FileReader(f, StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = br.readLine()) != null) {
                        line = line.trim();
                        if (line.isEmpty() || line.startsWith("#")) continue;
                        int idx = line.indexOf('=');
                        if (idx > 0) {
                            String k = line.substring(0, idx).trim();
                            String v = line.substring(idx + 1).trim();
                            map.put(k, v);
                        }
                    }
                } catch (Exception ignored) {}
                break;
            }
        }
        return map;
    }
}
