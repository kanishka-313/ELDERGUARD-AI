package com.eldercare.model;

import java.time.Instant;

public class VoiceAlarmEvent {
    private String eventId;
    private String elderId;
    private String scheduleId;
    private String routineType; // WAKE_UP, MEDICINE, BREAKFAST, LUNCH, DINNER, WALK, SLEEP, CUSTOM
    private String voicePrompt; // Text to be spoken
    private String scheduledTime; // "08:00"
    private String triggeredAt;
    private String acknowledgedAt;
    private String status = "TRIGGERED"; // TRIGGERED, SPOKEN, ACKNOWLEDGED, MISSED
    private String createdAt;

    public VoiceAlarmEvent() {
        this.triggeredAt = Instant.now().toString();
        this.createdAt = Instant.now().toString();
    }

    public VoiceAlarmEvent(String eventId, String elderId, String scheduleId, String routineType, String voicePrompt, String scheduledTime) {
        this.eventId = eventId;
        this.elderId = elderId;
        this.scheduleId = scheduleId;
        this.routineType = routineType;
        this.voicePrompt = voicePrompt;
        this.scheduledTime = scheduledTime;
        this.status = "TRIGGERED";
        this.triggeredAt = Instant.now().toString();
        this.createdAt = Instant.now().toString();
    }

    // Getters and Setters
    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public String getElderId() { return elderId; }
    public void setElderId(String elderId) { this.elderId = elderId; }

    public String getScheduleId() { return scheduleId; }
    public void setScheduleId(String scheduleId) { this.scheduleId = scheduleId; }

    public String getRoutineType() { return routineType; }
    public void setRoutineType(String routineType) { this.routineType = routineType; }

    public String getVoicePrompt() { return voicePrompt; }
    public void setVoicePrompt(String voicePrompt) { this.voicePrompt = voicePrompt; }

    public String getScheduledTime() { return scheduledTime; }
    public void setScheduledTime(String scheduledTime) { this.scheduledTime = scheduledTime; }

    public String getTriggeredAt() { return triggeredAt; }
    public void setTriggeredAt(String triggeredAt) { this.triggeredAt = triggeredAt; }

    public String getAcknowledgedAt() { return acknowledgedAt; }
    public void setAcknowledgedAt(String acknowledgedAt) { this.acknowledgedAt = acknowledgedAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
