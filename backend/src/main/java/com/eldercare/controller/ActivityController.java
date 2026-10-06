package com.eldercare.controller;

import com.eldercare.model.ActivityLog;
import com.eldercare.service.ActivityService;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.util.List;
import java.util.Map;

public class ActivityController implements HttpHandler {
    private final ActivityService activityService;

    public ActivityController() {
        this.activityService = new ActivityService();
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (HttpHelper.handlePreflight(exchange)) return;

        String method = exchange.getRequestMethod();

        try {
            if ("GET".equalsIgnoreCase(method)) {
                Map<String, String> query = HttpHelper.getQueryParams(exchange);
                String elderId = query.getOrDefault("elderId", "usr-elder-1");
                int limit = 50;
                if (query.containsKey("limit")) {
                    try {
                        limit = Integer.parseInt(query.get("limit"));
                    } catch (NumberFormatException ignored) {}
                }
                List<ActivityLog> logs = activityService.getActivityLogs(elderId, limit);
                HttpHelper.sendSuccessResponse(exchange, "Activity logs retrieved", logs);
            } else if ("POST".equalsIgnoreCase(method)) {
                ActivityLog log = HttpHelper.parseJson(exchange, ActivityLog.class);
                if (log == null) {
                    HttpHelper.sendErrorResponse(exchange, 400, "Invalid activity log payload");
                    return;
                }
                ActivityLog created = activityService.createActivityLog(log);
                HttpHelper.sendSuccessResponse(exchange, "Activity log recorded", created);
            } else {
                HttpHelper.sendErrorResponse(exchange, 405, "Method Not Allowed");
            }
        } catch (Exception e) {
            HttpHelper.sendErrorResponse(exchange, 500, "Activity Controller Error: " + e.getMessage());
        }
    }
}
