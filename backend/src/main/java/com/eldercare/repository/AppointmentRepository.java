package com.eldercare.repository;

import com.eldercare.model.Appointment;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class AppointmentRepository {

    public AppointmentRepository() {
        SupabaseConfig.init();
    }

    public Optional<Appointment> findById(String appointmentId) {
        if (appointmentId == null || appointmentId.trim().isEmpty()) return Optional.empty();
        JsonObject obj = SupabaseConfig.selectSingle("appointments", "id=eq." + SupabaseConfig.urlEncode(appointmentId.trim()));
        if (obj == null) {
            obj = SupabaseConfig.selectSingle("appointments", "appointment_id=eq." + SupabaseConfig.urlEncode(appointmentId.trim()));
        }
        return obj != null ? Optional.of(fromJson(obj)) : Optional.empty();
    }

    public List<Appointment> findByElderId(String elderId) {
        List<Appointment> list = new ArrayList<>();
        if (elderId == null || elderId.trim().isEmpty()) return list;

        JsonArray arr = SupabaseConfig.select("appointments", "elder_id=eq." + SupabaseConfig.urlEncode(elderId.trim()) + "&order=appointment_date.asc");
        if (arr != null) {
            for (JsonElement el : arr) {
                if (el.isJsonObject()) list.add(fromJson(el.getAsJsonObject()));
            }
        }
        return list;
    }

    public List<Appointment> findByDoctorId(String doctorId) {
        List<Appointment> list = new ArrayList<>();
        if (doctorId == null || doctorId.trim().isEmpty()) return list;

        JsonArray arr = SupabaseConfig.select("appointments", "purpose=ilike.*" + SupabaseConfig.urlEncode(doctorId.trim()) + "*&order=appointment_date.asc");
        if (arr != null) {
            for (JsonElement el : arr) {
                if (el.isJsonObject()) list.add(fromJson(el.getAsJsonObject()));
            }
        }
        return list;
    }

    public List<Appointment> findAll() {
        List<Appointment> list = new ArrayList<>();
        JsonArray arr = SupabaseConfig.select("appointments", "order=appointment_date.asc");
        if (arr != null) {
            for (JsonElement el : arr) {
                if (el.isJsonObject()) list.add(fromJson(el.getAsJsonObject()));
            }
        }
        return list;
    }

    public Appointment save(Appointment a) {
        if (a == null) return null;
        JsonObject json = toJson(a);
        SupabaseConfig.insert("appointments", json);
        return a;
    }

    public boolean delete(String appointmentId) {
        if (appointmentId == null || appointmentId.trim().isEmpty()) return false;
        return SupabaseConfig.delete("appointments", "id=eq." + SupabaseConfig.urlEncode(appointmentId.trim()));
    }

    private JsonObject toJson(Appointment a) {
        JsonObject obj = new JsonObject();
        obj.addProperty("elder_id", a.getElderId());
        obj.addProperty("purpose", a.getPurpose() != null ? a.getPurpose() : "Medical Checkup");
        obj.addProperty("location", a.getLocation() != null ? a.getLocation() : "Clinic");
        obj.addProperty("appointment_date", a.getAppointmentDate() != null ? a.getAppointmentDate() : "");
        obj.addProperty("appointment_time", a.getAppointmentTime() != null ? a.getAppointmentTime() : "");
        obj.addProperty("status", a.getStatus() != null ? a.getStatus() : "CONFIRMED");
        if (a.getCreatedAt() != null) obj.addProperty("created_at", a.getCreatedAt());
        return obj;
    }

    private Appointment fromJson(JsonObject obj) {
        Appointment a = new Appointment();
        a.setAppointmentId(getString(obj, "appointment_id", "appointmentId", "id"));
        a.setElderId(getString(obj, "elder_id", "elderId"));
        a.setElderName(getString(obj, "elder_name", "elderName", "purpose"));
        a.setDoctorName(getString(obj, "doctor_name", "doctorName", "location"));
        a.setPurpose(getString(obj, "purpose"));
        a.setLocation(getString(obj, "location"));
        a.setAppointmentDate(getString(obj, "appointment_date", "appointmentDate"));
        a.setAppointmentTime(getString(obj, "appointment_time", "appointmentTime"));
        a.setStatus(getString(obj, "status", "CONFIRMED"));
        a.setCreatedAt(getString(obj, "created_at", "createdAt"));
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
