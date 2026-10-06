package com.eldercare.controller;

import com.eldercare.model.Schedule;
import com.eldercare.model.VoiceAlarmEvent;
import com.eldercare.service.ScheduleService;
import com.eldercare.service.VoiceSchedulerService;
import com.google.gson.JsonObject;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.util.Map;
import java.util.Optional;

public class VoiceController implements HttpHandler {
    private final VoiceSchedulerService voiceSchedulerService;
    private final ScheduleService scheduleService;

    public VoiceController(VoiceSchedulerService voiceSchedulerService) {
        this.voiceSchedulerService = voiceSchedulerService;
        this.scheduleService = new ScheduleService();
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (HttpHelper.handlePreflight(exchange)) return;

        String path = exchange.getRequestURI().getPath();
        String method = exchange.getRequestMethod();

        try {
            if ("GET".equalsIgnoreCase(method) && path.endsWith("/active-alarm")) {
                Map<String, String> query = HttpHelper.getQueryParams(exchange);
                String elderId = query.getOrDefault("elderId", "usr-elder-1");
                Optional<VoiceAlarmEvent> activeEvent = voiceSchedulerService.getActiveAlarm(elderId);

                if (activeEvent.isPresent()) {
                    HttpHelper.sendSuccessResponse(exchange, "Active voice alarm found", activeEvent.get());
                } else {
                    HttpHelper.sendSuccessResponse(exchange, "No active alarm at this time", null);
                }
            } else if ("POST".equalsIgnoreCase(method) && path.endsWith("/acknowledge")) {
                JsonObject body = HttpHelper.parseJsonObject(exchange);
                String eventId = HttpHelper.getString(body, "eventId");
                String elderId = HttpHelper.getString(body, "elderId", "usr-elder-1");
                String responseText = HttpHelper.getString(body, "response", "Awake / Done");

                boolean ack = voiceSchedulerService.acknowledgeAlarm(eventId, elderId, responseText);
                if (ack) {
                    HttpHelper.sendSuccessResponse(exchange, "Voice alarm acknowledged successfully", null);
                } else {
                    HttpHelper.sendSuccessResponse(exchange, "Alarm already acknowledged or expired", null);
                }
            } else if ("POST".equalsIgnoreCase(method) && path.endsWith("/trigger")) {
                if (!HttpHelper.validateSnsInternalKey(exchange)) {
                    return;
                }
                JsonObject body = HttpHelper.parseJsonObject(exchange);
                String scheduleId = HttpHelper.getString(body, "scheduleId");

                Schedule schedule = null;
                if (scheduleId != null) {
                    schedule = scheduleService.getScheduleById(scheduleId).orElse(null);
                }
                if (schedule == null) {
                    schedule = new Schedule();
                    schedule.setScheduleId("sch-test");
                    schedule.setElderId("usr-elder-1");
                    schedule.setRoutineType("MEDICINE");
                    schedule.setScheduledTime("Now");
                    schedule.setCustomVoicePrompt("This is your automated reminder for your scheduled routine.");
                }

                VoiceAlarmEvent event = voiceSchedulerService.triggerVoiceAlarm(schedule);
                HttpHelper.sendSuccessResponse(exchange, "Voice alarm manually triggered", event);
            } else if ("GET".equalsIgnoreCase(method) && path.endsWith("/status")) {
                JsonObject status = new JsonObject();
                status.addProperty("status", "ONLINE");
                status.addProperty("engine", "Meta MMS Multilingual Voice AI (Tamil, English, Malayalam)");
                status.addProperty("activePort", 8092);
                HttpHelper.sendSuccessResponse(exchange, "Voice AI Engine Status", status);
            } else {
                HttpHelper.sendErrorResponse(exchange, 404, "Endpoint not found: " + path);
            }
        } catch (Exception e) {
            HttpHelper.sendErrorResponse(exchange, 500, "Voice Controller Error: " + e.getMessage());
        }
    }
}
