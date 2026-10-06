package com.eldercare.model;

import java.time.Instant;

public class ActivityLog {
    private String activityId;
    private String elderId;
    private String activityType; // MOTION, SENSOR, WEARABLE, VOICE, FALL
    private String activity; // walking, standing, sitting, lying, moving, idle, fall/emergency event
    private String timestamp;
    private Double confidence; // e.g., 0.95
    private String source; // ESP32_PIR, ESP32_ACCEL, WEARABLE, CAMERA, VOICE, MANUAL
    private String metadata; // JSON or text details
    private String createdAt;

    public ActivityLog() {
        this.timestamp = Instant.now().toString();
        this.createdAt = Instant.now().toString();
    }

    public ActivityLog(String activityId, String elderId, String activityType, String activity, Double confidence, String source) {
        this.activityId = activityId;
        this.elderId = elderId;
        this.activityType = activityType;
        this.activity = activity;
        this.confidence = confidence;
        this.source = source;
        this.timestamp = Instant.now().toString();
        this.createdAt = Instant.now().toString();
    }

    // Getters and Setters
    public String getActivityId() { return activityId; }
    public void setActivityId(String activityId) { this.activityId = activityId; }

    public String getElderId() { return elderId; }
    public void setElderId(String elderId) { this.elderId = elderId; }

    public String getActivityType() { return activityType; }
    public void setActivityType(String activityType) { this.activityType = activityType; }

    public String getActivity() { return activity; }
    public void setActivity(String activity) { this.activity = activity; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public Double getConfidence() { return confidence; }
    public void setConfidence(Double confidence) { this.confidence = confidence; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getMetadata() { return metadata; }
    public void setMetadata(String metadata) { this.metadata = metadata; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
