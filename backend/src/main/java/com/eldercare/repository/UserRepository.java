package com.eldercare.repository;

import com.eldercare.model.User;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class UserRepository {

    public UserRepository() {
        SupabaseConfig.init();
    }

    public Optional<User> findById(String userId) {
        if (userId == null || userId.trim().isEmpty()) return Optional.empty();
        JsonObject obj = SupabaseConfig.selectSingle("users", "user_id=eq." + SupabaseConfig.urlEncode(userId.trim()));
        return obj != null ? Optional.of(fromJson(obj)) : Optional.empty();
    }

    public Optional<User> findByPhone(String phone) {
        if (phone == null || phone.trim().isEmpty()) return Optional.empty();
        String clean = phone.trim();
        String digits = clean.replaceAll("\\D", "");
        String last10 = digits.length() >= 10 ? digits.substring(digits.length() - 10) : digits;

        String query = "or=(phone.eq." + SupabaseConfig.urlEncode(clean) + ",phone.ilike.*" + SupabaseConfig.urlEncode(last10) + "*)";
        JsonObject obj = SupabaseConfig.selectSingle("users", query);
        return obj != null ? Optional.of(fromJson(obj)) : Optional.empty();
    }

    public Optional<User> findByEmail(String email) {
        if (email == null || email.trim().isEmpty()) return Optional.empty();
        JsonObject obj = SupabaseConfig.selectSingle("users", "email=ilike." + SupabaseConfig.urlEncode(email.trim().toLowerCase()));
        return obj != null ? Optional.of(fromJson(obj)) : Optional.empty();
    }

    public Optional<User> findByName(String name) {
        if (name == null || name.trim().isEmpty()) return Optional.empty();
        JsonObject obj = SupabaseConfig.selectSingle("users", "name=ilike." + SupabaseConfig.urlEncode(name.trim()));
        return obj != null ? Optional.of(fromJson(obj)) : Optional.empty();
    }

    public Optional<User> findElderByName(String name) {
        if (name == null || name.trim().isEmpty()) return Optional.empty();
        JsonObject obj = SupabaseConfig.selectSingle("users", "role=eq.ELDER&name=ilike." + SupabaseConfig.urlEncode(name.trim()));
        return obj != null ? Optional.of(fromJson(obj)) : Optional.empty();
    }

    public Optional<User> findElderByNameAndPhone(String name, String phone) {
        if (name == null || name.trim().isEmpty()) return Optional.empty();
        if (phone != null && !phone.trim().isEmpty()) {
            String digits = phone.trim().replaceAll("\\D", "");
            String last10 = digits.length() >= 10 ? digits.substring(digits.length() - 10) : digits;
            JsonObject obj = SupabaseConfig.selectSingle("users", "role=eq.ELDER&name=ilike." + SupabaseConfig.urlEncode(name.trim()) + "&phone=ilike.*" + SupabaseConfig.urlEncode(last10) + "*");
            if (obj != null) return Optional.of(fromJson(obj));
        }
        return findElderByName(name);
    }

    public List<User> findFamilyByConnectedElderPhone(String elderPhone) {
        List<User> list = new ArrayList<>();
        if (elderPhone == null || elderPhone.trim().isEmpty()) return list;
        String digits = elderPhone.trim().replaceAll("\\D", "");
        String last10 = digits.length() >= 10 ? digits.substring(digits.length() - 10) : digits;

        JsonArray arr = SupabaseConfig.select("users", "role=eq.FAMILY&connected_elder_phone=ilike.*" + SupabaseConfig.urlEncode(last10) + "*");
        if (arr != null) {
            for (JsonElement el : arr) {
                if (el.isJsonObject()) list.add(fromJson(el.getAsJsonObject()));
            }
        }
        return list;
    }

    public List<User> findFamilyByConnectedElderId(String elderId) {
        List<User> list = new ArrayList<>();
        if (elderId == null || elderId.trim().isEmpty()) return list;

        JsonArray arr = SupabaseConfig.select("users", "role=eq.FAMILY&connected_elder_id=eq." + SupabaseConfig.urlEncode(elderId.trim()));
        if (arr != null) {
            for (JsonElement el : arr) {
                if (el.isJsonObject()) list.add(fromJson(el.getAsJsonObject()));
            }
        }
        return list;
    }

    public List<User> findAllFamily() {
        List<User> list = new ArrayList<>();
        JsonArray arr = SupabaseConfig.select("users", "role=eq.FAMILY&order=created_at.desc");
        if (arr != null) {
            for (JsonElement el : arr) {
                if (el.isJsonObject()) list.add(fromJson(el.getAsJsonObject()));
            }
        }
        return list;
    }

    public List<User> findAllElder() {
        List<User> list = new ArrayList<>();
        JsonArray arr = SupabaseConfig.select("users", "role=eq.ELDER&order=created_at.desc");
        if (arr != null) {
            for (JsonElement el : arr) {
                if (el.isJsonObject()) list.add(fromJson(el.getAsJsonObject()));
            }
        }
        return list;
    }

    public List<User> findAll() {
        List<User> list = new ArrayList<>();
        JsonArray arr = SupabaseConfig.select("users", "order=created_at.desc");
        if (arr != null) {
            for (JsonElement el : arr) {
                if (el.isJsonObject()) list.add(fromJson(el.getAsJsonObject()));
            }
        }
        return list;
    }

    public User save(User user) {
        if (user == null) return null;
        JsonObject json = toJson(user);
        SupabaseConfig.upsert("users", json, "user_id");
        return user;
    }

    public boolean delete(String userId) {
        if (userId == null || userId.trim().isEmpty()) return false;
        return SupabaseConfig.delete("users", "user_id=eq." + SupabaseConfig.urlEncode(userId.trim()));
    }

    private JsonObject toJson(User u) {
        JsonObject obj = new JsonObject();
        obj.addProperty("user_id", u.getUserId());
        obj.addProperty("name", u.getName());
        obj.addProperty("role", u.getRole() != null ? u.getRole().toUpperCase() : "ELDER");
        if (u.getPhone() != null) obj.addProperty("phone", u.getPhone());
        if (u.getEmail() != null) obj.addProperty("email", u.getEmail().toLowerCase());
        if (u.getPasswordHash() != null) {
            obj.addProperty("password_hash", u.getPasswordHash());
            obj.addProperty("pin", u.getPasswordHash());
        }
        if (u.getConnectedElderId() != null) obj.addProperty("connected_elder_id", u.getConnectedElderId());
        if (u.getConnectedElderPhone() != null) obj.addProperty("connected_elder_phone", u.getConnectedElderPhone());
        if (u.getConnectedElderName() != null) obj.addProperty("connected_elder_name", u.getConnectedElderName());
        if (u.getConnectedFamilyId() != null) obj.addProperty("connected_family_id", u.getConnectedFamilyId());
        if (u.getConnectedFamilyPhone() != null) obj.addProperty("connected_family_phone", u.getConnectedFamilyPhone());
        if (u.getConnectedFamilyEmail() != null) obj.addProperty("connected_family_email", u.getConnectedFamilyEmail());
        if (u.getConnectedFamilyName() != null) obj.addProperty("connected_family_name", u.getConnectedFamilyName());
        if (u.getUpcomingAppointmentDate() != null) obj.addProperty("upcoming_appointment_date", u.getUpcomingAppointmentDate());
        if (u.getUpcomingAppointmentTime() != null) obj.addProperty("upcoming_appointment_time", u.getUpcomingAppointmentTime());
        if (u.getUpcomingAppointmentPurpose() != null) obj.addProperty("upcoming_appointment_purpose", u.getUpcomingAppointmentPurpose());
        if (u.getUpcomingAppointmentLocation() != null) obj.addProperty("upcoming_appointment_location", u.getUpcomingAppointmentLocation());
        if (u.getDoctorName() != null) obj.addProperty("doctor_name", u.getDoctorName());
        if (u.getIsProfileComplete() != null) obj.addProperty("is_profile_complete", u.getIsProfileComplete());
        if (u.getMedicalHistory() != null) obj.addProperty("health_conditions", u.getMedicalHistory());
        if (u.getCreatedAt() != null) obj.addProperty("created_at", u.getCreatedAt());
        if (u.getUpdatedAt() != null) obj.addProperty("updated_at", u.getUpdatedAt());
        return obj;
    }

    private User fromJson(JsonObject obj) {
        User u = new User();
        u.setUserId(getString(obj, "user_id", "userId"));
        u.setName(getString(obj, "name", "User"));
        u.setRole(getString(obj, "role", "ELDER"));
        u.setPhone(getString(obj, "phone"));
        u.setEmail(getString(obj, "email"));
        u.setPasswordHash(getString(obj, "password_hash", "pin", "password"));
        u.setConnectedElderId(getString(obj, "connected_elder_id", "connectedElderId"));
        u.setConnectedElderPhone(getString(obj, "connected_elder_phone", "connectedElderPhone"));
        u.setConnectedElderName(getString(obj, "connected_elder_name", "connectedElderName"));
        u.setConnectedFamilyId(getString(obj, "connected_family_id", "connectedFamilyId"));
        u.setConnectedFamilyPhone(getString(obj, "connected_family_phone", "connectedFamilyPhone"));
        u.setConnectedFamilyEmail(getString(obj, "connected_family_email", "connectedFamilyEmail"));
        u.setConnectedFamilyName(getString(obj, "connected_family_name", "connectedFamilyName"));
        u.setUpcomingAppointmentDate(getString(obj, "upcoming_appointment_date", "upcomingAppointmentDate"));
        u.setUpcomingAppointmentTime(getString(obj, "upcoming_appointment_time", "upcomingAppointmentTime"));
        u.setUpcomingAppointmentPurpose(getString(obj, "upcoming_appointment_purpose", "upcomingAppointmentPurpose"));
        u.setUpcomingAppointmentLocation(getString(obj, "upcoming_appointment_location", "upcomingAppointmentLocation"));
        u.setDoctorName(getString(obj, "doctor_name", "doctorName"));
        u.setMedicalHistory(getString(obj, "health_conditions", "medicalHistory"));
        if (obj.has("is_profile_complete") && !obj.get("is_profile_complete").isJsonNull()) {
            u.setIsProfileComplete(obj.get("is_profile_complete").getAsBoolean());
        }
        u.setCreatedAt(getString(obj, "created_at", "createdAt"));
        u.setUpdatedAt(getString(obj, "updated_at", "updatedAt"));
        return u;
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
