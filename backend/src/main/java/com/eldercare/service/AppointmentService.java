package com.eldercare.service;

import com.eldercare.model.Appointment;
import com.eldercare.repository.AppointmentRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public class AppointmentService {
    private final AppointmentRepository appointmentRepository;

    public AppointmentService() {
        this.appointmentRepository = new AppointmentRepository();
    }

    public List<Appointment> getAppointmentsForElder(String elderId) {
        if (elderId == null || elderId.isEmpty() || elderId.equals("default")) {
            elderId = "usr-elder-1";
        }
        List<Appointment> list = appointmentRepository.findByElderId(elderId);
        if (list.isEmpty()) {
            return appointmentRepository.findAll();
        }
        return list;
    }

    public List<Appointment> getAllAppointments() {
        return appointmentRepository.findAll();
    }

    public Optional<Appointment> getAppointmentById(String appointmentId) {
        return appointmentRepository.findById(appointmentId);
    }

    public Appointment createAppointment(Appointment apt, String userRole) {
        if (apt.getAppointmentId() == null || apt.getAppointmentId().trim().isEmpty()) {
            apt.setAppointmentId("apt-" + UUID.randomUUID().toString().substring(0, 8));
        }
        if (apt.getElderId() == null || apt.getElderId().trim().isEmpty()) {
            apt.setElderId("usr-elder-1");
        }
        if (apt.getElderName() == null || apt.getElderName().trim().isEmpty()) {
            apt.setElderName("Elder");
        }
        if (apt.getStatus() == null || apt.getStatus().trim().isEmpty()) {
            apt.setStatus("CONFIRMED");
        }
        apt.setCreatedAt(Instant.now().toString());
        apt.setUpdatedAt(Instant.now().toString());
        return appointmentRepository.save(apt);
    }

    public Appointment updateAppointment(String appointmentId, Appointment apt, String userRole) {
        Optional<Appointment> existingOpt = appointmentRepository.findById(appointmentId);
        if (existingOpt.isEmpty()) {
            throw new IllegalArgumentException("Appointment not found: " + appointmentId);
        }

        Appointment existing = existingOpt.get();
        if (apt.getAppointmentDate() != null) existing.setAppointmentDate(apt.getAppointmentDate());
        if (apt.getAppointmentTime() != null) existing.setAppointmentTime(apt.getAppointmentTime());
        if (apt.getPurpose() != null) existing.setPurpose(apt.getPurpose());
        if (apt.getLocation() != null) existing.setLocation(apt.getLocation());
        if (apt.getConsultationMode() != null) existing.setConsultationMode(apt.getConsultationMode());
        if (apt.getStatus() != null) existing.setStatus(apt.getStatus());
        if (apt.getDoctorName() != null) existing.setDoctorName(apt.getDoctorName());
        if (apt.getSpecialty() != null) existing.setSpecialty(apt.getSpecialty());
        if (apt.getClinic() != null) existing.setClinic(apt.getClinic());
        existing.setUpdatedAt(Instant.now().toString());
        return appointmentRepository.save(existing);
    }

    public boolean deleteAppointment(String appointmentId, String userRole) {
        return appointmentRepository.delete(appointmentId);
    }
}
