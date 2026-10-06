package com.eldercare.controller;

import com.eldercare.service.WebhookRelayService;
import com.google.gson.JsonObject;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.time.Instant;
import java.util.List;

public class WebhookRelayController implements HttpHandler {

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (HttpHelper.handlePreflight(exchange)) return;

        String path = exchange.getRequestURI().getPath();
        String method = exchange.getRequestMethod();

        try {
            if ("POST".equalsIgnoreCase(method)) {
                if (path.endsWith("/test") || path.endsWith("/ping")) {
                    JsonObject body = HttpHelper.parseJsonObject(exchange);
                    String targetUrl = HttpHelper.getString(body, "webhookUrl", null);

                    JsonObject testPayload = new JsonObject();
                    testPayload.addProperty("type", "Test/Ping");
                    testPayload.addProperty("eventType", "TRIGGER_NODE_TEST_PING");
                    testPayload.addProperty("message", "Manual test ping from ElderCare AI Dashboard to verify Webhook Trigger Node");
                    testPayload.addProperty("timestamp", Instant.now().toString());
                    testPayload.addProperty("elderId", "usr-elder-1");
                    testPayload.addProperty("elderName", "Elder User");
                    testPayload.addProperty("status", "ONLINE");

                    JsonObject result = WebhookRelayService.relayPayload(targetUrl, testPayload);
                    HttpHelper.sendJsonResponse(exchange, 200, result);
                    return;
                }

                // Standard /api/webhook/relay endpoint
                JsonObject body = HttpHelper.parseJsonObject(exchange);
                String targetUrl = HttpHelper.getString(body, "webhookUrl", null);

                JsonObject payloadToSend;
                if (body.has("payload") && body.get("payload").isJsonObject()) {
                    payloadToSend = body.getAsJsonObject("payload");
                } else {
                    payloadToSend = body;
                }

                JsonObject result = WebhookRelayService.relayPayload(targetUrl, payloadToSend);
                HttpHelper.sendJsonResponse(exchange, 200, result);

            } else if ("GET".equalsIgnoreCase(method)) {
                if (path.endsWith("/logs")) {
                    List<JsonObject> logs = WebhookRelayService.getRecentLogs();
                    HttpHelper.sendSuccessResponse(exchange, "Recent webhook dispatches fetched", logs);
                } else if (path.endsWith("/status")) {
                    JsonObject status = new JsonObject();
                    status.addProperty("status", "ONLINE");
                    status.addProperty("defaultWebhookUrl", WebhookRelayService.resolveWebhookUrl(null));
                    status.addProperty("totalLogs", WebhookRelayService.getRecentLogs().size());
                    HttpHelper.sendSuccessResponse(exchange, "Webhook Relay Engine Status", status);
                } else {
                    HttpHelper.sendErrorResponse(exchange, 404, "Endpoint not found: " + path);
                }
            } else {
                HttpHelper.sendErrorResponse(exchange, 405, "Method Not Allowed");
            }
        } catch (Exception e) {
            HttpHelper.sendErrorResponse(exchange, 500, "Webhook Relay Controller Error: " + e.getMessage());
        }
    }
}
