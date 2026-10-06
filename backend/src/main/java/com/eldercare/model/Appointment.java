package com.eldercare.model;

import java.time.Instant;

/**
 * Appointment model representing consultation sessions between Elders, Family Members, and Doctors.
 */
public class Appointment {
    private String appointmentId;
    private String elderId;
    private String doctorId;
    private String familyId;
    private String elderName;
    private String doctorName;
    private String specialty;
    private String clinic;
    private String appointmentDate; // e.g. "Tomorrow, Sep 6, 2026" or "2026-09-06"
    private String appointmentTime; // e.g. "10:30 AM"
    private String purpose;         // e.g. "Routine Wellness Checkup & Health Review"
    private String location;        // e.g. "ElderCare Clinic / Room 304"
    private String consultationMode;// e.g. "IN_PERSON", "VIDEO_CONSULTATION", "HOME_VISIT"
    private String status;          // "CONFIRMED", "COMPLETED", "CANCELLED", "RESCHEDULED"
    private String notes;
    private String createdAt;
    private String updatedAt;

    public Appointment() {
        this.status = "CONFIRMED";
        this.consultationMode = "IN_PERSON";
        this.createdAt = Instant.now().toString();
        this.updatedAt = Instant.now().toString();
    }

    public Appointment(String appointmentId, String elderId, String doctorId, String familyId, 
                       String elderName, String doctorName, String specialty, String clinic,
                       String appointmentDate, String appointmentTime, 
                       String purpose, String location, String consultationMode) {
        this.appointmentId = appointmentId;
        this.elderId = elderId;
        this.doctorId = doctorId;
        this.familyId = familyId;
        this.elderName = elderName;
        this.doctorName = doctorName;
        this.specialty = specialty;
        this.clinic = clinic;
        this.appointmentDate = appointmentDate;
        this.appointmentTime = appointmentTime;
        this.purpose = purpose;
        this.location = location;
        this.consultationMode = consultationMode != null ? consultationMode : "IN_PERSON";
        this.status = "CONFIRMED";
        this.createdAt = Instant.now().toString();
        this.updatedAt = Instant.now().toString();
    }

    // Getters and Setters
    public String getAppointmentId() { return appointmentId; }
    public void setAppointmentId(String appointmentId) { this.appointmentId = appointmentId; }

    public String getElderId() { return elderId; }
    public void setElderId(String elderId) { this.elderId = elderId; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getFamilyId() { return familyId; }
    public void setFamilyId(String familyId) { this.familyId = familyId; }

    public String getElderName() { return elderName; }
    public void setElderName(String elderName) { this.elderName = elderName; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getSpecialty() { return specialty; }
    public void setSpecialty(String specialty) { this.specialty = specialty; }

    public String getClinic() { return clinic; }
    public void setClinic(String clinic) { this.clinic = clinic; }

    public String getAppointmentDate() { return appointmentDate; }
    public void setAppointmentDate(String appointmentDate) { this.appointmentDate = appointmentDate; }

    public String getAppointmentTime() { return appointmentTime; }
    public void setAppointmentTime(String appointmentTime) { this.appointmentTime = appointmentTime; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getConsultationMode() { return consultationMode; }
    public void setConsultationMode(String consultationMode) { this.consultationMode = consultationMode; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
