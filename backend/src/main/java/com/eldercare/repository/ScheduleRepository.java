package com.eldercare.repository;

import com.eldercare.model.Schedule;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class ScheduleRepository {

    public ScheduleRepository() {
        SupabaseConfig.init();
    }

    public Optional<Schedule> findById(String scheduleId) {
        if (scheduleId == null || scheduleId.trim().isEmpty()) return Optional.empty();
        JsonObject obj = SupabaseConfig.selectSingle("schedules", "schedule_id=eq." + SupabaseConfig.urlEncode(scheduleId.trim()));
        return obj != null ? Optional.of(fromJson(obj)) : Optional.empty();
    }

    public List<Schedule> findByElderId(String elderId) {
        List<Schedule> list = new ArrayList<>();
        if (elderId == null || elderId.trim().isEmpty()) return list;

        JsonArray arr = SupabaseConfig.select("schedules", "elder_id=eq." + SupabaseConfig.urlEncode(elderId.trim()) + "&order=created_at.desc");
        if (arr != null) {
            for (JsonElement el : arr) {
                if (el.isJsonObject()) list.add(fromJson(el.getAsJsonObject()));
            }
        }
        return list;
    }

    public List<Schedule> findAllEnabled() {
        List<Schedule> list = new ArrayList<>();
        JsonArray arr = SupabaseConfig.select("schedules", "order=created_at.desc");
        if (arr != null) {
            for (JsonElement el : arr) {
                if (el.isJsonObject()) {
                    Schedule s = fromJson(el.getAsJsonObject());
                    if (s.isEnabled()) list.add(s);
                }
            }
        }
        return list;
    }

    public List<Schedule> findAll() {
        List<Schedule> list = new ArrayList<>();
        JsonArray arr = SupabaseConfig.select("schedules", "order=created_at.desc");
        if (arr != null) {
            for (JsonElement el : arr) {
                if (el.isJsonObject()) list.add(fromJson(el.getAsJsonObject()));
            }
        }
        return list;
    }

    public Schedule save(Schedule s) {
        if (s == null) return null;
        JsonObject json = toJson(s);
        SupabaseConfig.insert("schedules", json);
        return s;
    }

    public boolean delete(String scheduleId) {
        if (scheduleId == null || scheduleId.trim().isEmpty()) return false;
        return SupabaseConfig.delete("schedules", "schedule_id=eq." + SupabaseConfig.urlEncode(scheduleId.trim()));
    }

    private JsonObject toJson(Schedule s) {
        JsonObject obj = new JsonObject();
        obj.addProperty("elder_id", s.getElderId());
        obj.addProperty("title", s.getTitle() != null ? s.getTitle() : "Daily Routine");
        obj.addProperty("schedule_type", s.getRoutineType() != null ? s.getRoutineType() : "CUSTOM");
        obj.addProperty("enabled", s.isEnabled());
        if (s.getCreatedAt() != null) obj.addProperty("created_at", s.getCreatedAt());
        return obj;
    }

    private Schedule fromJson(JsonObject obj) {
        Schedule s = new Schedule();
        s.setScheduleId(getString(obj, "schedule_id", "scheduleId", "id"));
        s.setElderId(getString(obj, "elder_id", "elderId"));
        s.setTitle(getString(obj, "title", "routine_type", "schedule_type", "routineType"));
        s.setRoutineType(getString(obj, "routine_type", "schedule_type", "routineType"));
        String time = getString(obj, "scheduled_time", "scheduledTime", "time");
        if (time == null || time.isEmpty()) time = "08:00";
        s.setScheduledTime(time);
        s.setTime(time);
        s.setDisplayTime(time);
        s.setIcon(getString(obj, "icon"));
        s.setDescription(getString(obj, "description"));
        s.setCustomVoicePrompt(getString(obj, "custom_voice_prompt", "customVoicePrompt"));
        
        if (obj.has("is_enabled") && !obj.get("is_enabled").isJsonNull()) {
            s.setEnabled(obj.get("is_enabled").getAsBoolean());
        } else if (obj.has("enabled") && !obj.get("enabled").isJsonNull()) {
            s.setEnabled(obj.get("enabled").getAsBoolean());
        } else {
            s.setEnabled(true);
        }

        if (obj.has("completed") && !obj.get("completed").isJsonNull()) {
            s.setCompleted(obj.get("completed").getAsBoolean());
        }
        
        s.setCompletionStatus(getString(obj, "completion_status", "completionStatus"));
        s.setCompletedAt(getString(obj, "last_completed_at", "completedAt"));
        s.setCreatedAt(getString(obj, "created_at", "createdAt"));
        s.setUpdatedAt(getString(obj, "updated_at", "updatedAt"));
        return s;
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
