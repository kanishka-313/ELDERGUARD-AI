package com.eldercare.controller;

import com.eldercare.model.Schedule;
import com.eldercare.service.ScheduleService;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.util.List;
import java.util.Map;

public class ScheduleController implements HttpHandler {
    private final ScheduleService scheduleService;

    public ScheduleController() {
        this.scheduleService = new ScheduleService();
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (HttpHelper.handlePreflight(exchange)) return;

        String path = exchange.getRequestURI().getPath();
        String method = exchange.getRequestMethod();

        try {
            if ("GET".equalsIgnoreCase(method)) {
                if (path.endsWith("/active")) {
                    if (!HttpHelper.validateSnsInternalKey(exchange)) {
                        return;
                    }
                    List<Schedule> activeSchedules = scheduleService.getAllEnabledSchedules();
                    HttpHelper.sendSuccessResponse(exchange, "Active schedules fetched successfully", activeSchedules);
                    return;
                }
                Map<String, String> query = HttpHelper.getQueryParams(exchange);
                String elderId = query.getOrDefault("elderId", "usr-elder-1");
                List<Schedule> list = scheduleService.getSchedules(elderId);
                HttpHelper.sendSuccessResponse(exchange, "Schedules fetched successfully", list);
            } else if ("POST".equalsIgnoreCase(method)) {
                Schedule schedule = HttpHelper.parseJson(exchange, Schedule.class);
                if (schedule == null) {
                    HttpHelper.sendErrorResponse(exchange, 400, "Invalid schedule payload");
                    return;
                }
                Schedule created = scheduleService.createSchedule(schedule);
                HttpHelper.sendSuccessResponse(exchange, "Schedule created successfully", created);
            } else if ("PUT".equalsIgnoreCase(method)) {
                if (path.endsWith("/toggle")) {
                    String[] parts = path.split("/");
                    String scheduleId = parts[parts.length - 2];
                    Schedule toggled = scheduleService.toggleSchedule(scheduleId);
                    HttpHelper.sendSuccessResponse(exchange, "Schedule toggled", toggled);
                } else {
                    String scheduleId = path.substring(path.lastIndexOf('/') + 1);
                    Schedule updateReq = HttpHelper.parseJson(exchange, Schedule.class);
                    if (updateReq == null) {
                        HttpHelper.sendErrorResponse(exchange, 400, "Invalid schedule payload");
                        return;
                    }
                    Schedule updated = scheduleService.updateSchedule(scheduleId, updateReq);
                    HttpHelper.sendSuccessResponse(exchange, "Schedule updated successfully", updated);
                }
            } else if ("DELETE".equalsIgnoreCase(method)) {
                String scheduleId = path.substring(path.lastIndexOf('/') + 1);
                boolean deleted = scheduleService.deleteSchedule(scheduleId);
                if (deleted) {
                    HttpHelper.sendSuccessResponse(exchange, "Schedule deleted successfully", null);
                } else {
                    HttpHelper.sendErrorResponse(exchange, 404, "Schedule not found");
                }
            } else {
                HttpHelper.sendErrorResponse(exchange, 405, "Method Not Allowed");
            }
        } catch (Exception e) {
            HttpHelper.sendErrorResponse(exchange, 500, "Schedule Error: " + e.getMessage());
        }
    }
}
