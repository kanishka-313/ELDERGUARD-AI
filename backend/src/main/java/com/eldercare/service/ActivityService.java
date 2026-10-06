package com.eldercare.service;

import com.eldercare.model.ActivityLog;
import com.eldercare.repository.ActivityLogRepository;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public class ActivityService {
    private final ActivityLogRepository activityLogRepository;
    private final AlertService alertService;

    public ActivityService() {
        this.activityLogRepository = new ActivityLogRepository();
        this.alertService = new AlertService();
    }

    public ActivityLog ingestMotion(String elderId, String activity, Double confidence, String source, String metadata) {
        if (elderId == null || elderId.isEmpty()) {
            elderId = "usr-elder-1";
        }
        if (activity == null || activity.trim().isEmpty()) {
            activity = "moving";
        }
        if (source == null || source.trim().isEmpty()) {
            source = "ESP32_PIR";
        }
        if (confidence == null) {
            confidence = 0.95;
        }

        ActivityLog log = new ActivityLog();
        log.setActivityId("act-" + UUID.randomUUID().toString().substring(0, 8));
        log.setElderId(elderId);
        log.setActivityType("MOTION");
        log.setActivity(activity.toLowerCase().trim());
        log.setConfidence(confidence);
        log.setSource(source);
        log.setMetadata(metadata);
        log.setTimestamp(Instant.now().toString());
        log.setCreatedAt(Instant.now().toString());

        // Check if motion represents a fall event
        if (activity.toLowerCase().contains("fall")) {
            alertService.triggerFall(elderId, "Fall detected via " + source + " sensor with " + (int)(confidence * 100) + "% confidence.", source);
        }

        return activityLogRepository.save(log);
    }

    public Map<String, Object> getCurrentActivity(String elderId) {
        if (elderId == null || elderId.isEmpty()) {
            elderId = "usr-elder-1";
        }
        Optional<ActivityLog> latest = activityLogRepository.findLatestByElderId(elderId);

        Map<String, Object> status = new HashMap<>();
        if (latest.isPresent()) {
            ActivityLog log = latest.get();
            status.put("elderId", elderId);
            status.put("activity", log.getActivity());
            status.put("activityType", log.getActivityType());
            status.put("source", log.getSource());
            status.put("confidence", log.getConfidence());
            status.put("timestamp", log.getTimestamp());
            status.put("status", "ACTIVE");
        } else {
            status.put("elderId", elderId);
            status.put("activity", "resting");
            status.put("activityType", "MOTION");
            status.put("source", "SYSTEM");
            status.put("confidence", 0.90);
            status.put("timestamp", Instant.now().toString());
            status.put("status", "ONLINE");
        }
        return status;
    }

    public List<ActivityLog> getActivityLogs(String elderId, int limit) {
        if (elderId == null || elderId.isEmpty() || elderId.equals("default")) {
            elderId = "usr-elder-1";
        }
        if (limit <= 0) limit = 50;
        return activityLogRepository.findRecentByElderId(elderId, limit);
    }

    public ActivityLog createActivityLog(ActivityLog log) {
        if (log.getActivityId() == null || log.getActivityId().trim().isEmpty()) {
            log.setActivityId("act-" + UUID.randomUUID().toString().substring(0, 8));
        }
        if (log.getTimestamp() == null) {
            log.setTimestamp(Instant.now().toString());
        }
        log.setCreatedAt(Instant.now().toString());
        return activityLogRepository.save(log);
    }
}
