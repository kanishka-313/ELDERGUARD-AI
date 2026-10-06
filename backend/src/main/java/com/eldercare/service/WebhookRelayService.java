package com.eldercare.service;

import com.eldercare.repository.SupabaseConfig;
import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CompletableFuture;

public class WebhookRelayService {
    private static final Gson gson = SupabaseConfig.getGson();
    private static final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(6))
            .build();

    private static final String DEFAULT_WEBHOOK_URL = "https://api.agents.snsihub.ai/webhook-test/eldercare-events";
    private static final List<JsonObject> recentLogs = Collections.synchronizedList(new ArrayList<>());
    private static final int MAX_LOGS = 30;

    public static String resolveWebhookUrl(String customUrl) {
        if (customUrl != null && !customUrl.trim().isEmpty() && customUrl.startsWith("http")) {
            return customUrl.trim();
        }
        String envUrl = System.getenv("VITE_SNS_WEBHOOK_URL");
        if (envUrl != null && !envUrl.trim().isEmpty() && envUrl.startsWith("http")) {
            return envUrl.trim();
        }
        String altEnv = System.getenv("SNS_WEBHOOK_URL");
        if (altEnv != null && !altEnv.trim().isEmpty() && altEnv.startsWith("http")) {
            return altEnv.trim();
        }
        return DEFAULT_WEBHOOK_URL;
    }

    public static JsonObject relayPayload(String targetUrl, JsonObject payload) {
        String webhookUrl = resolveWebhookUrl(targetUrl);
        long startTime = System.currentTimeMillis();

        JsonObject logEntry = new JsonObject();
        logEntry.addProperty("timestamp", Instant.now().toString());
        logEntry.addProperty("webhookUrl", webhookUrl);
        logEntry.add("payload", payload);

        System.out.println("[WebhookRelay] 🚀 Outbound POST to: " + webhookUrl);
        System.out.println("[WebhookRelay] 📦 Payload: " + gson.toJson(payload));

        try {
            String jsonBody = gson.toJson(payload);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(webhookUrl))
                    .timeout(Duration.ofSeconds(12))
                    .header("Content-Type", "application/json; charset=UTF-8")
                    .header("Accept", "application/json, text/plain, */*")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            long duration = System.currentTimeMillis() - startTime;
            int statusCode = response.statusCode();
            String responseBody = response.body();

            // Smart Auto-Fallback: If /webhook/ returned 404 (workflow inactive) or /webhook-test/ returned 404, try the alternate
            if (statusCode == 404 && responseBody.contains("inactive")) {
                String alternateUrl = webhookUrl.contains("/webhook-test/")
                        ? webhookUrl.replace("/webhook-test/", "/webhook/")
                        : webhookUrl.replace("/webhook/", "/webhook-test/");

                System.out.println("[WebhookRelay] ⚠️ Primary endpoint returned 404 inactive. Retrying alternate URL: " + alternateUrl);

                HttpRequest retryReq = HttpRequest.newBuilder()
                        .uri(URI.create(alternateUrl))
                        .timeout(Duration.ofSeconds(12))
                        .header("Content-Type", "application/json; charset=UTF-8")
                        .header("Accept", "application/json, text/plain, */*")
                        .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                        .build();

                HttpResponse<String> retryResp = httpClient.send(retryReq, HttpResponse.BodyHandlers.ofString());
                if (retryResp.statusCode() >= 200 && retryResp.statusCode() < 300) {
                    response = retryResp;
                    statusCode = retryResp.statusCode();
                    responseBody = retryResp.body();
                    webhookUrl = alternateUrl;
                    System.out.println("[WebhookRelay] ✅ Alternate endpoint succeeded | HTTP " + statusCode + " | URL: " + alternateUrl);
                }
            }

            System.out.println("[WebhookRelay] ✅ Response received in " + duration + "ms | HTTP " + statusCode + " | Body: " + responseBody);

            logEntry.addProperty("statusCode", statusCode);
            logEntry.addProperty("durationMs", duration);
            logEntry.addProperty("success", statusCode >= 200 && statusCode < 300);

            JsonObject result = new JsonObject();
            result.addProperty("success", statusCode >= 200 && statusCode < 300);
            result.addProperty("statusCode", statusCode);
            result.addProperty("durationMs", duration);

            try {
                JsonElement parsed = JsonParser.parseString(responseBody);
                result.add("response", parsed);
                logEntry.add("response", parsed);
            } catch (Exception e) {
                result.addProperty("responseText", responseBody);
                logEntry.addProperty("responseText", responseBody);
            }

            addLog(logEntry);
            return result;

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            System.err.println("[WebhookRelay] ❌ Outbound POST failed after " + duration + "ms: " + e.getMessage());

            logEntry.addProperty("success", false);
            logEntry.addProperty("statusCode", 500);
            logEntry.addProperty("error", e.getMessage());
            logEntry.addProperty("durationMs", duration);
            addLog(logEntry);

            JsonObject err = new JsonObject();
            err.addProperty("success", false);
            err.addProperty("statusCode", 500);
            err.addProperty("error", e.getMessage());
            err.addProperty("durationMs", duration);
            return err;
        }
    }

    public static CompletableFuture<JsonObject> relayPayloadAsync(String targetUrl, JsonObject payload) {
        return CompletableFuture.supplyAsync(() -> relayPayload(targetUrl, payload));
    }

    private static void addLog(JsonObject log) {
        recentLogs.add(0, log);
        while (recentLogs.size() > MAX_LOGS) {
            recentLogs.remove(recentLogs.size() - 1);
        }
    }

    public static List<JsonObject> getRecentLogs() {
        return new ArrayList<>(recentLogs);
    }
}
