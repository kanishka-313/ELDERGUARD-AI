package com.eldercare.model;

import java.time.Instant;

/**
 * Schedule model representing daily routine timings, medication slots, and voice reminder prompts.
 */
public class Schedule {
    private String scheduleId;
    private String elderId;
    private String title;
    private String routineType; // WAKE_UP, MEDICINE, BREAKFAST, LUNCH, DINNER, WALK, SLEEP, CUSTOM
    private String scheduledTime; // Format: "HH:mm" (e.g. "07:00", "08:30")
    private String time;        // Alias for scheduledTime
    private String displayTime; // Format: "07:00 AM", "08:30 AM"
    private String icon;        // "Sun", "Utensils", "Pill", "Footprints", "Moon", etc.
    private String description;
    private String customVoicePrompt;
    private boolean enabled;
    private boolean completed;
    private String completionStatus; // "PENDING", "TRIGGERED", "COMPLETED", "MISSED"
    private String completedAt;
    private String scheduledBy;
    private String lastTriggeredAt;
    private String lastAcknowledgedAt;
    private String createdAt;
    private String updatedAt;

    public Schedule() {
        this.enabled = true;
        this.completed = false;
        this.completionStatus = "PENDING";
        this.routineType = "CUSTOM";
        this.createdAt = Instant.now().toString();
        this.updatedAt = Instant.now().toString();
    }

    public Schedule(String scheduleId, String elderId, String title, String routineType, 
                    String scheduledTime, String displayTime, String customVoicePrompt, String scheduledBy) {
        this.scheduleId = scheduleId;
        this.elderId = elderId;
        this.title = title;
        this.routineType = routineType != null ? routineType : "CUSTOM";
        this.scheduledTime = scheduledTime;
        this.time = scheduledTime;
        this.displayTime = displayTime;
        this.customVoicePrompt = customVoicePrompt;
        this.scheduledBy = scheduledBy != null ? scheduledBy : "Self";
        this.enabled = true;
        this.completed = false;
        this.completionStatus = "PENDING";
        this.createdAt = Instant.now().toString();
        this.updatedAt = Instant.now().toString();
    }

    // Getters and Setters
    public String getScheduleId() { return scheduleId; }
    public void setScheduleId(String scheduleId) { this.scheduleId = scheduleId; }

    public String getElderId() { return elderId; }
    public void setElderId(String elderId) { this.elderId = elderId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getRoutineType() { return routineType; }
    public void setRoutineType(String routineType) { this.routineType = routineType; }

    public String getScheduledTime() { return scheduledTime != null ? scheduledTime : time; }
    public void setScheduledTime(String scheduledTime) { 
        this.scheduledTime = scheduledTime; 
        this.time = scheduledTime;
    }

    public String getTime() { return scheduledTime != null ? scheduledTime : time; }
    public void setTime(String time) { 
        this.time = time; 
        this.scheduledTime = time;
    }

    public String getDisplayTime() { return displayTime; }
    public void setDisplayTime(String displayTime) { this.displayTime = displayTime; }

    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCustomVoicePrompt() { return customVoicePrompt; }
    public void setCustomVoicePrompt(String customVoicePrompt) { this.customVoicePrompt = customVoicePrompt; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { 
        this.completed = completed; 
        if (completed) {
            this.completionStatus = "COMPLETED";
        }
    }

    public String getCompletionStatus() { 
        if (completionStatus != null) return completionStatus;
        return completed ? "COMPLETED" : "PENDING";
    }
    public void setCompletionStatus(String completionStatus) { 
        this.completionStatus = completionStatus; 
        this.completed = "COMPLETED".equalsIgnoreCase(completionStatus);
    }

    public String getCompletedAt() { return completedAt; }
    public void setCompletedAt(String completedAt) { this.completedAt = completedAt; }

    public String getScheduledBy() { return scheduledBy; }
    public void setScheduledBy(String scheduledBy) { this.scheduledBy = scheduledBy; }

    public String getLastTriggeredAt() { return lastTriggeredAt; }
    public void setLastTriggeredAt(String lastTriggeredAt) { this.lastTriggeredAt = lastTriggeredAt; }

    public String getLastAcknowledgedAt() { return lastAcknowledgedAt; }
    public void setLastAcknowledgedAt(String lastAcknowledgedAt) { this.lastAcknowledgedAt = lastAcknowledgedAt; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
