package com.eldercare.repository;

import com.eldercare.model.VoiceAlarmEvent;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class VoiceEventRepository {

    public VoiceEventRepository() {
        SupabaseConfig.init();
    }

    public Optional<VoiceAlarmEvent> findById(String eventId) {
        if (eventId == null || eventId.trim().isEmpty()) return Optional.empty();
        JsonObject obj = SupabaseConfig.selectSingle("voice_alarms", "event_id=eq." + SupabaseConfig.urlEncode(eventId.trim()));
        return obj != null ? Optional.of(fromJson(obj)) : Optional.empty();
    }

    public Optional<VoiceAlarmEvent> findActiveByElderId(String elderId) {
        if (elderId == null || elderId.trim().isEmpty()) return Optional.empty();
        JsonObject obj = SupabaseConfig.selectSingle("voice_alarms", "elder_id=eq." + SupabaseConfig.urlEncode(elderId.trim()) + "&status=in.(TRIGGERED,SPOKEN)&order=created_at.desc");
        return obj != null ? Optional.of(fromJson(obj)) : Optional.empty();
    }

    public Optional<VoiceAlarmEvent> findLatestActive() {
        JsonObject obj = SupabaseConfig.selectSingle("voice_alarms", "status=in.(TRIGGERED,SPOKEN)&order=created_at.desc");
        return obj != null ? Optional.of(fromJson(obj)) : Optional.empty();
    }

    public List<VoiceAlarmEvent> findByElderId(String elderId) {
        List<VoiceAlarmEvent> list = new ArrayList<>();
        if (elderId == null || elderId.trim().isEmpty()) return list;

        JsonArray arr = SupabaseConfig.select("voice_alarms", "elder_id=eq." + SupabaseConfig.urlEncode(elderId.trim()) + "&order=created_at.desc");
        if (arr != null) {
            for (JsonElement el : arr) {
                if (el.isJsonObject()) list.add(fromJson(el.getAsJsonObject()));
            }
        }
        return list;
    }

    public VoiceAlarmEvent save(VoiceAlarmEvent v) {
        if (v == null) return null;
        JsonObject json = toJson(v);
        SupabaseConfig.upsert("voice_alarms", json, "event_id");
        return v;
    }

    private JsonObject toJson(VoiceAlarmEvent v) {
        JsonObject obj = new JsonObject();
        obj.addProperty("event_id", v.getEventId());
        obj.addProperty("elder_id", v.getElderId());
        obj.addProperty("schedule_id", v.getScheduleId());
        obj.addProperty("routine_type", v.getRoutineType() != null ? v.getRoutineType() : "CUSTOM");
        obj.addProperty("status", v.getStatus() != null ? v.getStatus() : "TRIGGERED");
        if (v.getVoicePrompt() != null) obj.addProperty("spoken_response", v.getVoicePrompt());
        if (v.getAcknowledgedAt() != null) obj.addProperty("acknowledged_at", v.getAcknowledgedAt());
        if (v.getCreatedAt() != null) obj.addProperty("created_at", v.getCreatedAt());
        return obj;
    }

    private VoiceAlarmEvent fromJson(JsonObject obj) {
        VoiceAlarmEvent v = new VoiceAlarmEvent();
        v.setEventId(getString(obj, "event_id", "eventId"));
        v.setElderId(getString(obj, "elder_id", "elderId"));
        v.setScheduleId(getString(obj, "schedule_id", "scheduleId"));
        v.setRoutineType(getString(obj, "routine_type", "routineType"));
        v.setStatus(getString(obj, "status", "TRIGGERED"));
        v.setVoicePrompt(getString(obj, "spoken_response", "voicePrompt"));
        v.setAcknowledgedAt(getString(obj, "acknowledged_at", "acknowledgedAt"));
        v.setCreatedAt(getString(obj, "created_at", "createdAt"));
        v.setTriggeredAt(getString(obj, "created_at", "triggeredAt"));
        return v;
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
