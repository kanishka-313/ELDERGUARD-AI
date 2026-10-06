package com.eldercare.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class Alert {
    private String alertId;
    private String elderId;
    private String alertType; // SOS, FALL, UNRESPONSIVE, SENSOR_EMERGENCY
    private String message;
    private String recipientType = "FAMILY"; // CRITICAL: Emergency alerts must strictly go to FAMILY only!
    private List<String> recipientIds = new ArrayList<>();
    private String status = "ACTIVE"; // ACTIVE, RESOLVED
    private String elderName;
    private String elderPhone;
    private String familyPhone;
    private boolean callDispatched = false;
    private String callDispatchStatus = "PENDING"; // PENDING, CALL_INITIATED, DIALED, CONNECTED
    private String location = "Living Room (Suite 204)";
    private String createdAt;
    private String resolvedAt;

    public Alert() {
        this.createdAt = Instant.now().toString();
        this.recipientType = "FAMILY";
    }

    public Alert(String alertId, String elderId, String alertType, String message, List<String> recipientIds) {
        this.alertId = alertId;
        this.elderId = elderId;
        this.alertType = alertType;
        this.message = message;
        this.recipientType = "FAMILY"; // Enforce strictly
        if (recipientIds != null) {
            this.recipientIds = new ArrayList<>(recipientIds);
        }
        this.status = "ACTIVE";
        this.createdAt = Instant.now().toString();
    }

    // Getters and Setters
    public String getAlertId() { return alertId; }
    public void setAlertId(String alertId) { this.alertId = alertId; }

    public String getElderId() { return elderId; }
    public void setElderId(String elderId) { this.elderId = elderId; }

    public String getAlertType() { return alertType; }
    public void setAlertType(String alertType) { this.alertType = alertType; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getRecipientType() { return recipientType; }
    // Enforce FAMILY recipient only
    public void setRecipientType(String recipientType) {
        this.recipientType = "FAMILY";
    }

    public List<String> getRecipientIds() { return recipientIds; }
    public void setRecipientIds(List<String> recipientIds) {
        this.recipientIds = recipientIds != null ? new ArrayList<>(recipientIds) : new ArrayList<>();
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getElderName() { return elderName; }
    public void setElderName(String elderName) { this.elderName = elderName; }

    public String getElderPhone() { return elderPhone; }
    public void setElderPhone(String elderPhone) { this.elderPhone = elderPhone; }

    public String getFamilyPhone() { return familyPhone; }
    public void setFamilyPhone(String familyPhone) { this.familyPhone = familyPhone; }

    public boolean isCallDispatched() { return callDispatched; }
    public void setCallDispatched(boolean callDispatched) { this.callDispatched = callDispatched; }

    public String getCallDispatchStatus() { return callDispatchStatus; }
    public void setCallDispatchStatus(String callDispatchStatus) { this.callDispatchStatus = callDispatchStatus; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(String resolvedAt) { this.resolvedAt = resolvedAt; }
}
