package com.eldercare.service;

import com.eldercare.model.Schedule;
import com.eldercare.repository.ScheduleRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public class ScheduleService {
    private final ScheduleRepository scheduleRepository;

    public ScheduleService() {
        this.scheduleRepository = new ScheduleRepository();
    }

    public List<Schedule> getSchedules(String elderId) {
        if (elderId == null || elderId.isEmpty() || elderId.equals("default")) {
            elderId = "usr-elder-1";
        }
        List<Schedule> list = scheduleRepository.findByElderId(elderId);
        if (list.isEmpty() && !elderId.equals("usr-elder-1")) {
            return seedBaseSchedulesForElder(elderId);
        }
        return list;
    }

    public List<Schedule> seedBaseSchedulesForElder(String elderId) {
        String[][] base = {
            {"WAKE_UP", "07:00", "Good morning! Time to wake up and start your day."},
            {"WALK", "07:30", "Time for your morning walk and fresh air exercise."},
            {"BREAKFAST", "08:15", "Time for your healthy morning breakfast meal."},
            {"MEDICATION", "08:45", "Time to take your prescribed morning tablets with water."},
            {"LUNCH", "13:00", "Time for your afternoon lunch and hydration."},
            {"MEDICATION", "14:00", "Time to take your afternoon post-lunch tablets."},
            {"WALK", "17:30", "Time for your refreshing evening walk."},
            {"DINNER", "19:30", "Time for your evening dinner meal."},
            {"MEDICATION", "20:30", "Time to take your bedtime medication tablets."},
            {"SLEEP", "22:00", "Time to rest and get a good night sleep."}
        };
        for (String[] item : base) {
            Schedule s = new Schedule();
            s.setScheduleId("sch-" + UUID.randomUUID().toString().substring(0, 8));
            s.setElderId(elderId);
            s.setRoutineType(item[0]);
            s.setScheduledTime(item[1]);
            s.setCustomVoicePrompt(item[2]);
            s.setEnabled(true);
            s.setCompletionStatus("PENDING");
            s.setCreatedAt(Instant.now().toString());
            s.setUpdatedAt(Instant.now().toString());
            scheduleRepository.save(s);
        }
        return scheduleRepository.findByElderId(elderId);
    }

    public List<Schedule> getAllSchedules() {
        return scheduleRepository.findAll();
    }

    public List<Schedule> getAllEnabledSchedules() {
        return scheduleRepository.findAllEnabled();
    }

    public Optional<Schedule> getScheduleById(String scheduleId) {
        return scheduleRepository.findById(scheduleId);
    }

    public Schedule createSchedule(Schedule schedule) {
        if (schedule.getScheduleId() == null || schedule.getScheduleId().trim().isEmpty()) {
            schedule.setScheduleId("sch-" + UUID.randomUUID().toString().substring(0, 8));
        }
        if (schedule.getElderId() == null || schedule.getElderId().trim().isEmpty()) {
            schedule.setElderId("usr-elder-1");
        }
        if (schedule.getTitle() == null || schedule.getTitle().trim().isEmpty()) {
            schedule.setTitle(schedule.getRoutineType() != null ? schedule.getRoutineType() : "Scheduled Routine");
        }
        if (schedule.getCompletionStatus() == null || schedule.getCompletionStatus().trim().isEmpty()) {
            schedule.setCompletionStatus("PENDING");
        }
        if (schedule.getCustomVoicePrompt() == null || schedule.getCustomVoicePrompt().trim().isEmpty()) {
            schedule.setCustomVoicePrompt("Time for your " + schedule.getTitle() + ".");
        }
        schedule.setCreatedAt(Instant.now().toString());
        schedule.setUpdatedAt(Instant.now().toString());
        Schedule saved = scheduleRepository.save(schedule);

        // Asynchronously relay schedule creation to SNS Agent Workbench Webhook
        try {
            com.google.gson.JsonObject payload = new com.google.gson.JsonObject();
            payload.addProperty("type", "Schedule");
            payload.addProperty("eventType", "SCHEDULE_CREATED");
            payload.addProperty("scheduleId", saved.getScheduleId());
            payload.addProperty("elderId", saved.getElderId());
            payload.addProperty("title", saved.getTitle());
            payload.addProperty("routineTitle", saved.getTitle());
            payload.addProperty("routineType", saved.getRoutineType());
            payload.addProperty("scheduledTime", saved.getScheduledTime());
            payload.addProperty("displayTime", saved.getDisplayTime());
            payload.addProperty("voicePrompt", saved.getCustomVoicePrompt());
            payload.addProperty("status", saved.getCompletionStatus());
            payload.addProperty("timestamp", Instant.now().toString());
            WebhookRelayService.relayPayloadAsync(null, payload);
        } catch (Exception ignored) {}

        return saved;
    }

    public Schedule updateSchedule(String scheduleId, Schedule schedule) {
        Optional<Schedule> existingOpt = scheduleRepository.findById(scheduleId);
        if (existingOpt.isEmpty()) {
            throw new IllegalArgumentException("Schedule not found: " + scheduleId);
        }
        Schedule existing = existingOpt.get();
        if (schedule.getTitle() != null && !schedule.getTitle().trim().isEmpty()) existing.setTitle(schedule.getTitle().trim());
        if (schedule.getRoutineType() != null) existing.setRoutineType(schedule.getRoutineType());
        if (schedule.getScheduledTime() != null) existing.setScheduledTime(schedule.getScheduledTime());
        if (schedule.getTime() != null) existing.setTime(schedule.getTime());
        if (schedule.getDisplayTime() != null) existing.setDisplayTime(schedule.getDisplayTime());
        if (schedule.getIcon() != null) existing.setIcon(schedule.getIcon());
        if (schedule.getDescription() != null) existing.setDescription(schedule.getDescription());
        if (schedule.getCustomVoicePrompt() != null) existing.setCustomVoicePrompt(schedule.getCustomVoicePrompt());
        if (schedule.getScheduledBy() != null) existing.setScheduledBy(schedule.getScheduledBy());
        existing.setEnabled(schedule.isEnabled());
        if (schedule.getCompletionStatus() != null) {
            existing.setCompletionStatus(schedule.getCompletionStatus());
            existing.setCompleted("COMPLETED".equalsIgnoreCase(schedule.getCompletionStatus()));
        } else if (schedule.isCompleted() != existing.isCompleted()) {
            existing.setCompleted(schedule.isCompleted());
            existing.setCompletionStatus(schedule.isCompleted() ? "COMPLETED" : "PENDING");
        }
        if (schedule.getCompletedAt() != null) {
            existing.setCompletedAt(schedule.getCompletedAt());
        } else if (existing.isCompleted() && existing.getCompletedAt() == null) {
            existing.setCompletedAt(java.time.LocalTime.now().format(java.time.format.DateTimeFormatter.ofPattern("hh:mm a")));
        } else if (!existing.isCompleted()) {
            existing.setCompletedAt(null);
        }
        existing.setUpdatedAt(Instant.now().toString());
        Schedule updated = scheduleRepository.save(existing);

        try {
            com.google.gson.JsonObject payload = new com.google.gson.JsonObject();
            payload.addProperty("type", "Schedule");
            payload.addProperty("eventType", "SCHEDULE_UPDATED");
            payload.addProperty("scheduleId", updated.getScheduleId());
            payload.addProperty("elderId", updated.getElderId());
            payload.addProperty("title", updated.getTitle());
            payload.addProperty("routineTitle", updated.getTitle());
            payload.addProperty("routineType", updated.getRoutineType());
            payload.addProperty("scheduledTime", updated.getScheduledTime());
            payload.addProperty("displayTime", updated.getDisplayTime());
            payload.addProperty("completed", updated.isCompleted());
            payload.addProperty("completionStatus", updated.getCompletionStatus());
            payload.addProperty("timestamp", Instant.now().toString());
            WebhookRelayService.relayPayloadAsync(null, payload);
        } catch (Exception ignored) {}

        return updated;
    }

    public Schedule toggleSchedule(String scheduleId) {
        Optional<Schedule> existingOpt = scheduleRepository.findById(scheduleId);
        if (existingOpt.isEmpty()) {
            throw new IllegalArgumentException("Schedule not found: " + scheduleId);
        }
        Schedule existing = existingOpt.get();
        boolean isCurrentlyCompleted = existing.isCompleted() || "COMPLETED".equalsIgnoreCase(existing.getCompletionStatus());
        boolean newCompleted = !isCurrentlyCompleted;
        existing.setCompleted(newCompleted);
        existing.setCompletionStatus(newCompleted ? "COMPLETED" : "PENDING");
        existing.setCompletedAt(newCompleted ? java.time.LocalTime.now().format(java.time.format.DateTimeFormatter.ofPattern("hh:mm a")) : null);
        existing.setUpdatedAt(Instant.now().toString());
        Schedule saved = scheduleRepository.save(existing);

        try {
            com.google.gson.JsonObject payload = new com.google.gson.JsonObject();
            payload.addProperty("type", "Schedule");
            payload.addProperty("eventType", saved.isCompleted() ? "SCHEDULE_COMPLETED" : "SCHEDULE_UNCOMPLETED");
            payload.addProperty("scheduleId", saved.getScheduleId());
            payload.addProperty("elderId", saved.getElderId());
            payload.addProperty("title", saved.getTitle());
            payload.addProperty("routineTitle", saved.getTitle());
            payload.addProperty("routineType", saved.getRoutineType());
            payload.addProperty("completed", saved.isCompleted());
            payload.addProperty("completionStatus", saved.getCompletionStatus());
            payload.addProperty("completedAt", saved.getCompletedAt() != null ? saved.getCompletedAt() : "");
            payload.addProperty("timestamp", Instant.now().toString());
            WebhookRelayService.relayPayloadAsync(null, payload);
        } catch (Exception ignored) {}

        return saved;
    }

    public boolean deleteSchedule(String scheduleId) {
        return scheduleRepository.delete(scheduleId);
    }
}
