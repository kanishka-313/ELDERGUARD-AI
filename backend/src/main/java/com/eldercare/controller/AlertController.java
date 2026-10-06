package com.eldercare.controller;

import com.eldercare.model.Alert;
import com.eldercare.service.AlertService;
import com.google.gson.JsonObject;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.util.List;
import java.util.Map;

public class AlertController implements HttpHandler {
    private final AlertService alertService;

    public AlertController() {
        this.alertService = new AlertService();
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (HttpHelper.handlePreflight(exchange)) return;

        String path = exchange.getRequestURI().getPath();
        String method = exchange.getRequestMethod();
        String userRole = HttpHelper.getUserRole(exchange);

        try {
            if ("GET".equalsIgnoreCase(method)) {
                // DOCTORS MUST NEVER RECEIVE OR VIEW EMERGENCY ALERTS
                if ("DOCTOR".equalsIgnoreCase(userRole)) {
                    HttpHelper.sendSuccessResponse(exchange, "No alerts accessible for DOCTOR role", List.of());
                    return;
                }

                Map<String, String> query = HttpHelper.getQueryParams(exchange);
                String elderId = query.getOrDefault("elderId", "usr-elder-1");
                List<Alert> alerts = alertService.getAlerts(userRole, elderId);
                HttpHelper.sendSuccessResponse(exchange, "Alerts fetched successfully", alerts);
            } else if ("POST".equalsIgnoreCase(method)) {
                if (!HttpHelper.validateSnsInternalKey(exchange)) {
                    return;
                }
                if (path.endsWith("/sos") || path.endsWith("/call-dispatch")) {
                    JsonObject body = HttpHelper.parseJsonObject(exchange);
                    String elderId = HttpHelper.getString(body, "elderId", "usr-elder-1");
                    String elderName = HttpHelper.getString(body, "elderName");
                    String elderPhone = HttpHelper.getString(body, "elderPhone");
                    String familyPhone = HttpHelper.getString(body, "familyPhone");
                    String message = HttpHelper.getString(body, "message");
                    String source = HttpHelper.getString(body, "source", "Elder SOS & Call Dispatcher");

                    Alert alert = alertService.triggerSos(elderId, elderName, elderPhone, familyPhone, message, source);
                    HttpHelper.sendSuccessResponse(exchange, "SOS alert & Emergency Phone Call dispatched to FAMILY contact: " + alert.getFamilyPhone(), alert);
                } else if (path.endsWith("/fall")) {
                    JsonObject body = HttpHelper.parseJsonObject(exchange);
                    String elderId = HttpHelper.getString(body, "elderId", "usr-elder-1");
                    String message = HttpHelper.getString(body, "message", "CRITICAL: Fall detected by sensor! Checking elder status.");
                    String source = HttpHelper.getString(body, "source", "Motion / Accelerometer Sensor");

                    Alert alert = alertService.triggerFall(elderId, message, source);
                    HttpHelper.sendSuccessResponse(exchange, "Fall alert dispatched to connected FAMILY members", alert);
                } else if (path.endsWith("/unresponsive")) {
                    JsonObject body = HttpHelper.parseJsonObject(exchange);
                    String elderId = HttpHelper.getString(body, "elderId", "usr-elder-1");
                    String message = HttpHelper.getString(body, "message", "WARNING: Elder did not acknowledge scheduled routine alarm.");

                    Alert alert = alertService.triggerUnresponsive(elderId, message);
                    HttpHelper.sendSuccessResponse(exchange, "Unresponsive alert dispatched to connected FAMILY members", alert);
                } else {
                    HttpHelper.sendErrorResponse(exchange, 404, "Endpoint not found: " + path);
                }
            } else if ("PUT".equalsIgnoreCase(method) && path.endsWith("/resolve")) {
                // Check if user is DOCTOR
                if ("DOCTOR".equalsIgnoreCase(userRole)) {
                    HttpHelper.sendErrorResponse(exchange, 403, "Forbidden: Doctors cannot resolve emergency alerts.");
                    return;
                }

                String[] parts = path.split("/");
                String alertId = parts[parts.length - 2];
                Alert resolved = alertService.resolveAlert(alertId);
                HttpHelper.sendSuccessResponse(exchange, "Alert marked as RESOLVED", resolved);
            } else {
                HttpHelper.sendErrorResponse(exchange, 405, "Method Not Allowed");
            }
        } catch (Exception e) {
            HttpHelper.sendErrorResponse(exchange, 500, "Alert Controller Error: " + e.getMessage());
        }
    }
}
