package com.eldercare.repository;

import com.eldercare.model.ActivityLog;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class ActivityLogRepository {

    public ActivityLogRepository() {
        SupabaseConfig.init();
    }

    public Optional<ActivityLog> findById(String activityId) {
        if (activityId == null || activityId.trim().isEmpty()) return Optional.empty();
        JsonObject obj = SupabaseConfig.selectSingle("activity_logs", "log_id=eq." + SupabaseConfig.urlEncode(activityId.trim()));
        return obj != null ? Optional.of(fromJson(obj)) : Optional.empty();
    }

    public List<ActivityLog> findByElderId(String elderId) {
        List<ActivityLog> list = new ArrayList<>();
        if (elderId == null || elderId.trim().isEmpty()) return list;

        JsonArray arr = SupabaseConfig.select("activity_logs", "elder_id=eq." + SupabaseConfig.urlEncode(elderId.trim()) + "&order=created_at.desc");
        if (arr != null) {
            for (JsonElement el : arr) {
                if (el.isJsonObject()) list.add(fromJson(el.getAsJsonObject()));
            }
        }
        return list;
    }

    public List<ActivityLog> findRecentByElderId(String elderId, int limit) {
        List<ActivityLog> list = new ArrayList<>();
        if (elderId == null || elderId.trim().isEmpty()) return list;

        JsonArray arr = SupabaseConfig.select("activity_logs", "elder_id=eq." + SupabaseConfig.urlEncode(elderId.trim()) + "&order=created_at.desc&limit=" + limit);
        if (arr != null) {
            for (JsonElement el : arr) {
                if (el.isJsonObject()) list.add(fromJson(el.getAsJsonObject()));
            }
        }
        return list;
    }

    public Optional<ActivityLog> findLatestByElderId(String elderId) {
        if (elderId == null || elderId.trim().isEmpty()) return Optional.empty();
        JsonObject obj = SupabaseConfig.selectSingle("activity_logs", "elder_id=eq." + SupabaseConfig.urlEncode(elderId.trim()) + "&order=created_at.desc");
        return obj != null ? Optional.of(fromJson(obj)) : Optional.empty();
    }

    public List<ActivityLog> findAll() {
        List<ActivityLog> list = new ArrayList<>();
        JsonArray arr = SupabaseConfig.select("activity_logs", "order=created_at.desc");
        if (arr != null) {
            for (JsonElement el : arr) {
                if (el.isJsonObject()) list.add(fromJson(el.getAsJsonObject()));
            }
        }
        return list;
    }

    public ActivityLog save(ActivityLog log) {
        if (log == null) return null;
        JsonObject json = toJson(log);
        SupabaseConfig.upsert("activity_logs", json, "log_id");
        return log;
    }

    private JsonObject toJson(ActivityLog a) {
        JsonObject obj = new JsonObject();
        obj.addProperty("log_id", a.getActivityId());
        obj.addProperty("elder_id", a.getElderId());
        obj.addProperty("activity", a.getActivity() != null ? a.getActivity() : "Active");
        obj.addProperty("source", a.getSource() != null ? a.getSource() : "ESP32_PIR");
        obj.addProperty("confidence", a.getConfidence() != null ? a.getConfidence() : 1.0);
        if (a.getMetadata() != null) obj.addProperty("metadata", a.getMetadata());
        if (a.getCreatedAt() != null) obj.addProperty("created_at", a.getCreatedAt());
        return obj;
    }

    private ActivityLog fromJson(JsonObject obj) {
        ActivityLog a = new ActivityLog();
        a.setActivityId(getString(obj, "log_id", "activity_id", "activityId"));
        a.setElderId(getString(obj, "elder_id", "elderId"));
        a.setActivity(getString(obj, "activity"));
        a.setActivityType(getString(obj, "activity_type", "activity"));
        a.setSource(getString(obj, "source", "ESP32_PIR"));
        a.setMetadata(getString(obj, "metadata"));
        if (obj.has("confidence") && !obj.get("confidence").isJsonNull()) {
            a.setConfidence(obj.get("confidence").getAsDouble());
        } else {
            a.setConfidence(1.0);
        }
        String ts = getString(obj, "created_at", "timestamp");
        a.setTimestamp(ts);
        a.setCreatedAt(ts);
        return a;
    }

    private String getString(JsonObject obj, String... keys) {
        for (String k : keys) {
            if (obj.has(k) && !obj.get(k).isJsonNull()) {
                return obj.get(k).getAsString();
            }
        }
        return null;
    }
}
