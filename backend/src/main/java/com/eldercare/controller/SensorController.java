package com.eldercare.controller;

import com.eldercare.model.ActivityLog;
import com.eldercare.model.Alert;
import com.eldercare.service.ActivityService;
import com.eldercare.service.AlertService;
import com.google.gson.JsonObject;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.util.Map;

public class SensorController implements HttpHandler {
    private final ActivityService activityService;
    private final AlertService alertService;

    public SensorController() {
        this.activityService = new ActivityService();
        this.alertService = new AlertService();
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (HttpHelper.handlePreflight(exchange)) return;

        String path = exchange.getRequestURI().getPath();
        String method = exchange.getRequestMethod();

        try {
            if ("POST".equalsIgnoreCase(method) && path.endsWith("/sensors/motion")) {
                JsonObject body = HttpHelper.parseJsonObject(exchange);
                String elderId = HttpHelper.getString(body, "elderId", "usr-elder-1");
                String activity = HttpHelper.getString(body, "activity", "moving");
                Double confidence = HttpHelper.getDouble(body, "confidence", 0.95);
                String source = HttpHelper.getString(body, "source", "ESP32_PIR");
                String metadata = HttpHelper.getString(body, "metadata", "Living Room Sensor");

                ActivityLog log = activityService.ingestMotion(elderId, activity, confidence, source, metadata);
                HttpHelper.sendSuccessResponse(exchange, "Motion sensor data ingested successfully", log);
            } else if ("POST".equalsIgnoreCase(method) && path.endsWith("/sensors/emergency")) {
                // Hardware SOS Button pressed on ESP32 / Wearable
                // CRITICAL RULE: Emergency alert is routed to FAMILY ONLY! Never DOCTOR.
                JsonObject body = HttpHelper.parseJsonObject(exchange);
                String elderId = HttpHelper.getString(body, "elderId", "usr-elder-1");
                String source = HttpHelper.getString(body, "source", "ESP32_HARDWARE_BUTTON");
                String message = HttpHelper.getString(body, "message", "CRITICAL: Hardware SOS button triggered on wearable/ESP32 sensor!");

                Alert alert = alertService.triggerSos(elderId, message, source);
                HttpHelper.sendSuccessResponse(exchange, "Emergency alert created -> Routed to FAMILY ONLY", alert);
            } else if ("GET".equalsIgnoreCase(method) && path.endsWith("/activity/current")) {
                Map<String, String> query = HttpHelper.getQueryParams(exchange);
                String elderId = query.getOrDefault("elderId", "usr-elder-1");
                Map<String, Object> currentStatus = activityService.getCurrentActivity(elderId);
                HttpHelper.sendSuccessResponse(exchange, "Current activity fetched", currentStatus);
            } else {
                HttpHelper.sendErrorResponse(exchange, 404, "Endpoint not found: " + path);
            }
        } catch (Exception e) {
            HttpHelper.sendErrorResponse(exchange, 500, "Sensor Controller Error: " + e.getMessage());
        }
    }
}
