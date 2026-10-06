package com.eldercare.service;

import com.eldercare.model.ActivityLog;
import com.eldercare.model.Schedule;
import com.eldercare.model.VoiceAlarmEvent;
import com.eldercare.repository.ActivityLogRepository;
import com.eldercare.repository.ScheduleRepository;
import com.eldercare.repository.UserRepository;
import com.eldercare.repository.VoiceEventRepository;

import java.time.Instant;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class VoiceSchedulerService {
    private final ScheduleRepository scheduleRepository;
    private final VoiceEventRepository voiceEventRepository;
    private final ActivityLogRepository activityLogRepository;
    private final UserRepository userRepository;
    private final ScheduledExecutorService scheduler;
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    public VoiceSchedulerService() {
        this.scheduleRepository = new ScheduleRepository();
        this.voiceEventRepository = new VoiceEventRepository();
        this.activityLogRepository = new ActivityLogRepository();
        this.userRepository = new UserRepository();
        this.scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "VoiceSchedulerThread");
            t.setDaemon(true);
            return t;
        });
        startScheduleMonitor();
    }

    private void startScheduleMonitor() {
        System.out.println("[VoiceScheduler] ⏰ Starting real-time schedule monitor (checking every 3s)...");
        scheduler.scheduleAtFixedRate(this::checkScheduledRoutines, 2, 3, TimeUnit.SECONDS);
    }

    private void checkScheduledRoutines() {
        try {
            String currentTimeStr = LocalTime.now().format(TIME_FORMATTER);
            List<Schedule> enabledSchedules = scheduleRepository.findAllEnabled();

            for (Schedule schedule : enabledSchedules) {
                if (schedule.getScheduledTime() == null) continue;

                // Normalize schedule time format (e.g., "08:00" vs "8:00")
                String schedTime = schedule.getScheduledTime().trim();
                if (schedTime.length() == 4 && schedTime.charAt(1) == ':') {
                    schedTime = "0" + schedTime;
                }

                if (currentTimeStr.equals(schedTime)) {
                    // Check if already triggered within the last 65 seconds
                    if (schedule.getLastTriggeredAt() != null) {
                        try {
                            Instant last = Instant.parse(schedule.getLastTriggeredAt());
                            if (Instant.now().getEpochSecond() - last.getEpochSecond() < 65) {
                                continue; // Already triggered for this minute
                            }
                        } catch (Exception ignored) {}
                    }

                    // Trigger Voice Alarm Event
                    triggerVoiceAlarm(schedule);
                }
            }
        } catch (Exception e) {
            System.err.println("[VoiceScheduler] Error during schedule check: " + e.getMessage());
        }
    }

    public VoiceAlarmEvent triggerVoiceAlarm(Schedule schedule) {
        if (schedule == null) return null;

        // Duplicate alarm protection: if triggered within last 65 seconds, return existing active event
        if (schedule.getLastTriggeredAt() != null) {
            try {
                Instant last = Instant.parse(schedule.getLastTriggeredAt());
                if (Instant.now().getEpochSecond() - last.getEpochSecond() < 65) {
                    System.out.println("[VoiceScheduler] ⚠️ Duplicate alarm suppressed for schedule: " + schedule.getScheduleId() + " (triggered < 65s ago)");
                    Optional<VoiceAlarmEvent> active = getActiveAlarm(schedule.getElderId());
                    if (active.isPresent() && schedule.getScheduleId() != null && schedule.getScheduleId().equals(active.get().getScheduleId())) {
                        return active.get();
                    }
                }
            } catch (Exception ignored) {}
        }

        String eventId = "vevt-" + UUID.randomUUID().toString().substring(0, 8);
        String prompt = schedule.getCustomVoicePrompt();
        if (prompt == null || prompt.trim().isEmpty()) {
            String title = schedule.getTitle() != null && !schedule.getTitle().trim().isEmpty()
                    ? schedule.getTitle().trim()
                    : (schedule.getRoutineType() != null ? schedule.getRoutineType() : "Routine");
            String time = schedule.getScheduledTime() != null ? schedule.getScheduledTime() : "now";
            
            // Dynamically resolve the elder's actual name from database
            String resolvedElderName = "Elder";
            if (schedule.getElderId() != null) {
                Optional<com.eldercare.model.User> uOpt = userRepository.findById(schedule.getElderId());
                if (uOpt.isPresent() && uOpt.get().getName() != null) {
                    String clean = uOpt.get().getName().replaceAll("(?i)\\+?91", "")
                                                       .replaceAll("[0-9+()\\[\\]:;,_\\-\\.]+", " ")
                                                       .replaceAll("\\s+", " ")
                                                       .trim();
                    if (!clean.isEmpty()) {
                        resolvedElderName = clean;
                    }
                }
            }

            prompt = title + " alarm ringing! " + resolvedElderName + ", it is " + time + ". Time for your scheduled " + title + ". Please confirm to turn off the alarm.";
        }

        VoiceAlarmEvent event = new VoiceAlarmEvent(
                eventId,
                schedule.getElderId(),
                schedule.getScheduleId(),
                schedule.getRoutineType(),
                prompt,
                schedule.getScheduledTime()
        );

        voiceEventRepository.save(event);

        // Update schedule state
        schedule.setLastTriggeredAt(Instant.now().toString());
        schedule.setCompletionStatus("TRIGGERED");
        schedule.setUpdatedAt(Instant.now().toString());
        scheduleRepository.save(schedule);

        System.out.println("[VoiceScheduler] 🔊 VOICE ALARM TRIGGERED! Event: " + eventId + " | Routine: " + schedule.getRoutineType() + " | Time: " + schedule.getScheduledTime() + " | Prompt: '" + prompt + "'");

        try {
            com.google.gson.JsonObject payload = new com.google.gson.JsonObject();
            payload.addProperty("type", "Schedule");
            payload.addProperty("eventType", "VOICE_ALARM_TRIGGERED");
            payload.addProperty("eventId", eventId);
            payload.addProperty("elderId", schedule.getElderId());
            payload.addProperty("routineType", schedule.getRoutineType());
            payload.addProperty("scheduledTime", schedule.getScheduledTime());
            payload.addProperty("voicePrompt", prompt);
            payload.addProperty("timestamp", Instant.now().toString());
            WebhookRelayService.relayPayloadAsync(null, payload);
        } catch (Exception ignored) {}

        return event;
    }

    public Optional<VoiceAlarmEvent> getActiveAlarm(String elderId) {
        if (elderId == null || elderId.isEmpty() || elderId.equals("default")) {
            return voiceEventRepository.findLatestActive();
        }
        return voiceEventRepository.findActiveByElderId(elderId);
    }

    public boolean acknowledgeAlarm(String eventId, String elderId, String responseText) {
        Optional<VoiceAlarmEvent> eventOpt = eventId != null && !eventId.isEmpty()
                ? voiceEventRepository.findById(eventId)
                : voiceEventRepository.findLatestActive();

        if (eventOpt.isPresent()) {
            VoiceAlarmEvent event = eventOpt.get();
            event.setStatus("ACKNOWLEDGED");
            event.setAcknowledgedAt(Instant.now().toString());
            voiceEventRepository.save(event);

            // Update associated schedule
            if (event.getScheduleId() != null) {
                scheduleRepository.findById(event.getScheduleId()).ifPresent(s -> {
                    s.setCompleted(true);
                    s.setCompletionStatus("COMPLETED");
                    s.setCompletedAt(java.time.LocalTime.now().format(java.time.format.DateTimeFormatter.ofPattern("hh:mm a")));
                    s.setLastAcknowledgedAt(Instant.now().toString());
                    s.setUpdatedAt(Instant.now().toString());
                    scheduleRepository.save(s);
                });
            }

            // Log activity
            ActivityLog log = new ActivityLog();
            log.setActivityId("act-" + UUID.randomUUID().toString().substring(0, 8));
            log.setElderId(event.getElderId() != null ? event.getElderId() : elderId);
            log.setActivityType("VOICE");
            log.setActivity("Routine Acknowledged: " + event.getRoutineType() + (responseText != null ? " (\"" + responseText + "\")" : ""));
            log.setConfidence(1.0);
            log.setSource("VOICE_AI");
            log.setTimestamp(Instant.now().toString());
            log.setCreatedAt(Instant.now().toString());
            activityLogRepository.save(log);

            System.out.println("[VoiceScheduler] ✓ Voice alarm acknowledged: " + event.getEventId() + " (Routine: " + event.getRoutineType() + ")");

            try {
                com.google.gson.JsonObject payload = new com.google.gson.JsonObject();
                payload.addProperty("type", "Schedule");
                payload.addProperty("eventType", "VOICE_ALARM_ACKNOWLEDGED");
                payload.addProperty("eventId", event.getEventId());
                payload.addProperty("elderId", event.getElderId() != null ? event.getElderId() : elderId);
                payload.addProperty("routineType", event.getRoutineType());
                payload.addProperty("response", responseText);
                payload.addProperty("timestamp", Instant.now().toString());
                WebhookRelayService.relayPayloadAsync(null, payload);
            } catch (Exception ignored) {}

            return true;
        }

        return false;
    }

    public void shutdown() {
        scheduler.shutdown();
    }
}
