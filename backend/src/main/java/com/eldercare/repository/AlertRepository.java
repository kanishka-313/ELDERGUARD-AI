package com.eldercare.repository;

import com.eldercare.model.Alert;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class AlertRepository {

    public AlertRepository() {
        SupabaseConfig.init();
    }

    public Optional<Alert> findById(String alertId) {
        if (alertId == null || alertId.trim().isEmpty()) return Optional.empty();
        JsonObject obj = SupabaseConfig.selectSingle("alerts", "alert_id=eq." + SupabaseConfig.urlEncode(alertId.trim()));
        return obj != null ? Optional.of(fromJson(obj)) : Optional.empty();
    }

    public List<Alert> findByElderId(String elderId) {
        List<Alert> list = new ArrayList<>();
        if (elderId == null || elderId.trim().isEmpty()) return list;

        JsonArray arr = SupabaseConfig.select("alerts", "elder_id=eq." + SupabaseConfig.urlEncode(elderId.trim()) + "&order=created_at.desc");
        if (arr != null) {
            for (JsonElement el : arr) {
                if (el.isJsonObject()) list.add(fromJson(el.getAsJsonObject()));
            }
        }
        return list;
    }

    public List<Alert> findActive() {
        List<Alert> list = new ArrayList<>();
        JsonArray arr = SupabaseConfig.select("alerts", "status=eq.ACTIVE&order=created_at.desc");
        if (arr != null) {
            for (JsonElement el : arr) {
                if (el.isJsonObject()) list.add(fromJson(el.getAsJsonObject()));
            }
        }
        return list;
    }

    public List<Alert> findAll() {
        List<Alert> list = new ArrayList<>();
        JsonArray arr = SupabaseConfig.select("alerts", "order=created_at.desc");
        if (arr != null) {
            for (JsonElement el : arr) {
                if (el.isJsonObject()) list.add(fromJson(el.getAsJsonObject()));
            }
        }
        return list;
    }

    public Alert save(Alert a) {
        if (a == null) return null;
        a.setRecipientType("FAMILY");
        JsonObject json = toJson(a);
        SupabaseConfig.upsert("alerts", json, "alert_id");
        return a;
    }

    public boolean delete(String alertId) {
        if (alertId == null || alertId.trim().isEmpty()) return false;
        return SupabaseConfig.delete("alerts", "alert_id=eq." + SupabaseConfig.urlEncode(alertId.trim()));
    }

    private JsonObject toJson(Alert a) {
        JsonObject obj = new JsonObject();
        obj.addProperty("alert_id", a.getAlertId());
        obj.addProperty("elder_id", a.getElderId());
        obj.addProperty("type", a.getAlertType() != null ? a.getAlertType() : "SOS");
        obj.addProperty("severity", "CRITICAL");
        obj.addProperty("status", a.getStatus() != null ? a.getStatus() : "ACTIVE");
        obj.addProperty("message", a.getMessage());
        obj.addProperty("source", a.getLocation() != null ? a.getLocation() : "Elder Dashboard SOS");
        if (a.getResolvedAt() != null) obj.addProperty("resolved_at", a.getResolvedAt());
        if (a.getCreatedAt() != null) obj.addProperty("created_at", a.getCreatedAt());
        return obj;
    }

    private Alert fromJson(JsonObject obj) {
        Alert a = new Alert();
        a.setAlertId(getString(obj, "alert_id", "alertId"));
        a.setElderId(getString(obj, "elder_id", "elderId"));
        a.setAlertType(getString(obj, "type", "alert_type", "alertType"));
        a.setMessage(getString(obj, "message"));
        a.setRecipientType("FAMILY");
        a.setStatus(getString(obj, "status", "ACTIVE"));
        a.setElderName(getString(obj, "elder_name", "elderName"));
        a.setElderPhone(getString(obj, "elder_phone", "elderPhone"));
        a.setFamilyPhone(getString(obj, "family_phone", "familyPhone"));
        a.setLocation(getString(obj, "source", "location"));
        a.setCreatedAt(getString(obj, "created_at", "createdAt"));
        a.setResolvedAt(getString(obj, "resolved_at", "resolvedAt"));
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
