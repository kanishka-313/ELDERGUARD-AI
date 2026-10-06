package com.eldercare.model;

import java.time.Instant;

public class User {
    private String userId;
    private String name;
    private String role; // ELDER, FAMILY, DOCTOR
    private String phone;
    private String email;
    private String passwordHash; // PIN or Password hashed
    private String connectedElderId;
    private String connectedElderPhone;
    private String connectedElderName;
    private String connectedFamilyId;
    private String connectedFamilyPhone;
    private String connectedFamilyEmail;
    private String connectedFamilyName;
    private String upcomingAppointmentDate;
    private String upcomingAppointmentTime;
    private String upcomingAppointmentPurpose;
    private String upcomingAppointmentLocation;
    private String doctorName;
    private String avatar;
    private Integer age;
    private String medicalHistory;
    private String bloodGroup;
    private Boolean isProfileComplete;
    private String createdAt;
    private String updatedAt;

    public User() {
        this.createdAt = Instant.now().toString();
        this.updatedAt = Instant.now().toString();
    }

    public User(String userId, String name, String role, String phone, String email, String passwordHash) {
        this.userId = userId;
        this.name = name;
        this.role = role != null ? role.toUpperCase() : "ELDER";
        this.phone = phone;
        this.email = email;
        this.passwordHash = passwordHash;
        this.createdAt = Instant.now().toString();
        this.updatedAt = Instant.now().toString();
    }

    // Getters and Setters
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role != null ? role.toUpperCase() : "ELDER"; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getConnectedElderId() { return connectedElderId; }
    public void setConnectedElderId(String connectedElderId) { this.connectedElderId = connectedElderId; }

    public String getConnectedElderPhone() { return connectedElderPhone; }
    public void setConnectedElderPhone(String connectedElderPhone) { this.connectedElderPhone = connectedElderPhone; }

    public String getConnectedElderName() { return connectedElderName; }
    public void setConnectedElderName(String connectedElderName) { this.connectedElderName = connectedElderName; }

    public String getConnectedFamilyId() { return connectedFamilyId; }
    public void setConnectedFamilyId(String connectedFamilyId) { this.connectedFamilyId = connectedFamilyId; }

    public String getConnectedFamilyPhone() { return connectedFamilyPhone; }
    public void setConnectedFamilyPhone(String connectedFamilyPhone) { this.connectedFamilyPhone = connectedFamilyPhone; }

    public String getConnectedFamilyEmail() { return connectedFamilyEmail; }
    public void setConnectedFamilyEmail(String connectedFamilyEmail) { this.connectedFamilyEmail = connectedFamilyEmail; }

    public String getConnectedFamilyName() { return connectedFamilyName; }
    public void setConnectedFamilyName(String connectedFamilyName) { this.connectedFamilyName = connectedFamilyName; }

    public String getUpcomingAppointmentDate() { return upcomingAppointmentDate; }
    public void setUpcomingAppointmentDate(String upcomingAppointmentDate) { this.upcomingAppointmentDate = upcomingAppointmentDate; }

    public String getUpcomingAppointmentTime() { return upcomingAppointmentTime; }
    public void setUpcomingAppointmentTime(String upcomingAppointmentTime) { this.upcomingAppointmentTime = upcomingAppointmentTime; }

    public String getUpcomingAppointmentPurpose() { return upcomingAppointmentPurpose; }
    public void setUpcomingAppointmentPurpose(String upcomingAppointmentPurpose) { this.upcomingAppointmentPurpose = upcomingAppointmentPurpose; }

    public String getUpcomingAppointmentLocation() { return upcomingAppointmentLocation; }
    public void setUpcomingAppointmentLocation(String upcomingAppointmentLocation) { this.upcomingAppointmentLocation = upcomingAppointmentLocation; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public String getMedicalHistory() { return medicalHistory; }
    public void setMedicalHistory(String medicalHistory) { this.medicalHistory = medicalHistory; }

    public String getBloodGroup() { return bloodGroup; }
    public void setBloodGroup(String bloodGroup) { this.bloodGroup = bloodGroup; }

    public Boolean getIsProfileComplete() { return isProfileComplete; }
    public void setIsProfileComplete(Boolean isProfileComplete) { this.isProfileComplete = isProfileComplete; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
