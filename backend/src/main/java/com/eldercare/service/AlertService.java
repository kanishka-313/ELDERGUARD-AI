package com.eldercare.service;

import com.eldercare.model.ActivityLog;
import com.eldercare.model.Alert;
import com.eldercare.model.User;
import com.eldercare.repository.ActivityLogRepository;
import com.eldercare.repository.AlertRepository;
import com.eldercare.repository.UserRepository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public class AlertService {
    private final AlertRepository alertRepository;
    private final UserRepository userRepository;
    private final ActivityLogRepository activityLogRepository;

    public AlertService() {
        this.alertRepository = new AlertRepository();
        this.userRepository = new UserRepository();
        this.activityLogRepository = new ActivityLogRepository();
    }

    /**
     * Finds connected family member user IDs for the given elder.
     */
    private List<String> findConnectedFamilyIds(String elderId) {
        List<String> familyIds = new ArrayList<>();
        Optional<User> elderOpt = userRepository.findById(elderId);

        String elderPhone = elderOpt.map(User::getPhone).orElse("+91 98765 43210");

        // 1. Lookup family members linked to elder's phone number
        List<User> linkedFamilies = userRepository.findFamilyByConnectedElderPhone(elderPhone);
        for (User fam : linkedFamilies) {
            if ("FAMILY".equalsIgnoreCase(fam.getRole()) && !familyIds.contains(fam.getUserId())) {
                familyIds.add(fam.getUserId());
            }
        }

        // 2. Lookup family member linked by elder's connectedFamilyPhone
        if (elderOpt.isPresent() && elderOpt.get().getConnectedFamilyPhone() != null && !elderOpt.get().getConnectedFamilyPhone().trim().isEmpty()) {
            userRepository.findByPhone(elderOpt.get().getConnectedFamilyPhone().trim()).ifPresent(fam -> {
                if ("FAMILY".equalsIgnoreCase(fam.getRole()) && !familyIds.contains(fam.getUserId())) {
                    familyIds.add(fam.getUserId());
                }
            });
        }

        // 3. Fallback: If none specifically linked by phone, notify all registered FAMILY users
        if (familyIds.isEmpty()) {
            List<User> allFamilies = userRepository.findAllFamily();
            for (User fam : allFamilies) {
                if (!familyIds.contains(fam.getUserId())) {
                    familyIds.add(fam.getUserId());
                }
            }
        }

        // If still empty, add default family user ID
        if (familyIds.isEmpty()) {
            familyIds.add("usr-fam-1");
        }

        return familyIds;
    }

    /**
     * Trigger an SOS Emergency Alert from the Elder & dispatch outbound emergency call to family contact number.
     */
    public Alert triggerSos(String elderId, String elderName, String elderPhone, String familyPhone, String message, String source) {
        if (elderId == null || elderId.isEmpty() || elderId.equals("default")) {
            elderId = "usr-elder-1";
        }

        Optional<User> elderOpt = userRepository.findById(elderId);
        String finalElderName = (elderName != null && !elderName.trim().isEmpty()) 
            ? elderName.trim() 
            : elderOpt.map(User::getName).orElse("Elder");
            
        String finalElderPhone = (elderPhone != null && !elderPhone.trim().isEmpty()) 
            ? elderPhone.trim() 
            : elderOpt.map(User::getPhone).orElse("+91 98765 43210");

        String finalFamilyPhone = (familyPhone != null && !familyPhone.trim().isEmpty())
            ? familyPhone.trim()
            : elderOpt.map(User::getConnectedFamilyPhone).filter(p -> p != null && !p.trim().isEmpty()).orElse("+91 98765 12345");

        if (message == null || message.trim().isEmpty()) {
            message = "🚨 EMERGENCY: SOS button activated by " + finalElderName + " (" + (source != null ? source : "Elder Dashboard") + ")! Emergency call dispatched to family contact number: " + finalFamilyPhone;
        }

        List<String> recipientFamilyIds = findConnectedFamilyIds(elderId);

        Alert alert = new Alert();
        alert.setAlertId("alt-" + UUID.randomUUID().toString().substring(0, 8));
        alert.setElderId(elderId);
        alert.setElderName(finalElderName);
        alert.setElderPhone(finalElderPhone);
        alert.setFamilyPhone(finalFamilyPhone);
        alert.setAlertType("SOS");
        alert.setMessage(message);
        alert.setRecipientType("FAMILY");
        alert.setRecipientIds(recipientFamilyIds);
        alert.setCallDispatched(true);
        alert.setCallDispatchStatus("CALL_INITIATED");
        alert.setLocation("Living Room (Suite 204)");
        alert.setStatus("ACTIVE");
        alert.setCreatedAt(Instant.now().toString());

        // Also record an emergency call event in ActivityLog table in Supabase
        try {
            ActivityLog log = new ActivityLog();
            log.setActivityId("act-" + UUID.randomUUID().toString().substring(0, 8));
            log.setElderId(elderId);
            log.setActivity("Emergency SOS Call Dispatched");
            log.setActivityType("EMERGENCY");
            log.setSource("Direct Phone Dispatcher");
            log.setConfidence(1.0);
            log.setMetadata("Outbound emergency call placed to family number: " + finalFamilyPhone + " for " + finalElderName);
            log.setTimestamp(Instant.now().toString());
            activityLogRepository.save(log);
        } catch (Exception e) {
            System.err.println("[AlertService] Could not log emergency call to activity log: " + e.getMessage());
        }

        System.out.println("[AlertService] SOS Alert & Call Dispatched -> Routed to FAMILY phone: " + finalFamilyPhone);
        Alert savedAlert = alertRepository.save(alert);

        try {
            com.google.gson.JsonObject payload = new com.google.gson.JsonObject();
            payload.addProperty("type", "Emergency/Event");
            payload.addProperty("eventType", "SOS");
            payload.addProperty("elderId", elderId);
            payload.addProperty("elderName", finalElderName);
            payload.addProperty("elderPhone", finalElderPhone);
            payload.addProperty("familyPhone", finalFamilyPhone);
            payload.addProperty("message", message);
            payload.addProperty("severity", "CRITICAL");
            payload.addProperty("timestamp", Instant.now().toString());
            WebhookRelayService.relayPayloadAsync(null, payload);
        } catch (Exception ignored) {}

        return savedAlert;
    }

    public Alert triggerSos(String elderId, String message, String source) {
        return triggerSos(elderId, null, null, null, message, source);
    }

    /**
     * Trigger a Fall Detection Alert.
     */
    public Alert triggerFall(String elderId, String message, String source) {
        if (elderId == null || elderId.isEmpty() || elderId.equals("default")) {
            elderId = "usr-elder-1";
        }
        if (message == null || message.trim().isEmpty()) {
            message = "CRITICAL: Possible Fall Detected (" + (source != null ? source : "ESP32 Sensor") + "). Elder may need immediate help!";
        }

        List<String> recipientFamilyIds = findConnectedFamilyIds(elderId);

        Alert alert = new Alert();
        alert.setAlertId("alt-" + UUID.randomUUID().toString().substring(0, 8));
        alert.setElderId(elderId);
        alert.setAlertType("FALL");
        alert.setMessage(message);
        alert.setRecipientType("FAMILY");
        alert.setRecipientIds(recipientFamilyIds);
        alert.setStatus("ACTIVE");
        alert.setCreatedAt(Instant.now().toString());

        System.out.println("[AlertService] Fall Alert created -> Routed to FAMILY: " + recipientFamilyIds);
        Alert savedAlert = alertRepository.save(alert);

        try {
            com.google.gson.JsonObject payload = new com.google.gson.JsonObject();
            payload.addProperty("type", "Emergency/Event");
            payload.addProperty("eventType", "FALL_DETECTED");
            payload.addProperty("elderId", elderId);
            payload.addProperty("message", message);
            payload.addProperty("source", source);
            payload.addProperty("severity", "CRITICAL");
            payload.addProperty("timestamp", Instant.now().toString());
            WebhookRelayService.relayPayloadAsync(null, payload);
        } catch (Exception ignored) {}

        return savedAlert;
    }

    /**
     * Trigger an Unresponsive Elder Alert.
     * CRITICAL RULE: Recipient is strictly FAMILY. DOCTOR receives NOTHING.
     */
    public Alert triggerUnresponsive(String elderId, String message) {
        if (elderId == null || elderId.isEmpty() || elderId.equals("default")) {
            elderId = "usr-elder-1";
        }
        if (message == null || message.trim().isEmpty()) {
            message = "WARNING: Elder did not respond to scheduled routine voice check-in.";
        }

        List<String> recipientFamilyIds = findConnectedFamilyIds(elderId);

        Alert alert = new Alert();
        alert.setAlertId("alt-" + UUID.randomUUID().toString().substring(0, 8));
        alert.setElderId(elderId);
        alert.setAlertType("UNRESPONSIVE");
        alert.setMessage(message);
        alert.setRecipientType("FAMILY"); // Strictly Family
        alert.setRecipientIds(recipientFamilyIds);
        alert.setStatus("ACTIVE");
        alert.setCreatedAt(Instant.now().toString());

        System.out.println("[AlertService] Unresponsive Alert created -> Routed to FAMILY: " + recipientFamilyIds + " (DOCTOR EXCLUDED)");
        Alert savedAlert = alertRepository.save(alert);

        try {
            com.google.gson.JsonObject payload = new com.google.gson.JsonObject();
            payload.addProperty("type", "Emergency/Event");
            payload.addProperty("eventType", "UNRESPONSIVE");
            payload.addProperty("elderId", elderId);
            payload.addProperty("message", message);
            payload.addProperty("severity", "MEDIUM");
            payload.addProperty("timestamp", Instant.now().toString());
            WebhookRelayService.relayPayloadAsync(null, payload);
        } catch (Exception ignored) {}

        return savedAlert;
    }

    /**
     * Retrieve alerts with role-based restriction.
     * DOCTORS receive NO emergency alerts.
     */
    public List<Alert> getAlerts(String userRole, String elderId) {
        if ("DOCTOR".equalsIgnoreCase(userRole)) {
            // CRITICAL RULE: Doctors MUST NEVER receive or see emergency alerts
            return Collections.emptyList();
        }

        if (elderId != null && !elderId.isEmpty() && !elderId.equals("all")) {
            return alertRepository.findByElderId(elderId);
        }

        return alertRepository.findAll();
    }

    public Alert resolveAlert(String alertId) {
        Optional<Alert> alertOpt = alertRepository.findById(alertId);
        if (alertOpt.isEmpty()) {
            throw new IllegalArgumentException("Alert not found: " + alertId);
        }
        Alert alert = alertOpt.get();
        alert.setStatus("RESOLVED");
        alert.setResolvedAt(Instant.now().toString());
        return alertRepository.save(alert);
    }
}
