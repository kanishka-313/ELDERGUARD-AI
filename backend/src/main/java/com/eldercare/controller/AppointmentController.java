package com.eldercare.controller;

import com.eldercare.model.Appointment;
import com.eldercare.service.AppointmentService;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.util.List;

public class AppointmentController implements HttpHandler {
    private final AppointmentService appointmentService;

    public AppointmentController() {
        this.appointmentService = new AppointmentService();
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (HttpHelper.handlePreflight(exchange)) return;

        String path = exchange.getRequestURI().getPath();
        String method = exchange.getRequestMethod();
        String userRole = HttpHelper.getUserRole(exchange);

        try {
            if ("GET".equalsIgnoreCase(method)) {
                if (path.contains("/appointments/elder/")) {
                    String elderId = path.substring(path.lastIndexOf('/') + 1);
                    List<Appointment> list = appointmentService.getAppointmentsForElder(elderId);
                    HttpHelper.sendSuccessResponse(exchange, "Appointments fetched for elder", list);
                } else if (path.endsWith("/appointments") || path.endsWith("/appointments/")) {
                    List<Appointment> list = appointmentService.getAllAppointments();
                    HttpHelper.sendSuccessResponse(exchange, "All appointments fetched", list);
                } else {
                    String appointmentId = path.substring(path.lastIndexOf('/') + 1);
                    appointmentService.getAppointmentById(appointmentId).ifPresentOrElse(
                            a -> {
                                try {
                                    HttpHelper.sendSuccessResponse(exchange, "Appointment fetched", a);
                                } catch (IOException ignored) {}
                            },
                            () -> {
                                try {
                                    HttpHelper.sendErrorResponse(exchange, 404, "Appointment not found");
                                } catch (IOException ignored) {}
                            }
                    );
                }
            } else if ("POST".equalsIgnoreCase(method)) {
                Appointment apt = HttpHelper.parseJson(exchange, Appointment.class);
                if (apt == null) {
                    HttpHelper.sendErrorResponse(exchange, 400, "Invalid appointment payload");
                    return;
                }
                Appointment created = appointmentService.createAppointment(apt, userRole);
                HttpHelper.sendSuccessResponse(exchange, "Appointment created successfully", created);
            } else if ("PUT".equalsIgnoreCase(method)) {
                String appointmentId = path.substring(path.lastIndexOf('/') + 1);
                Appointment apt = HttpHelper.parseJson(exchange, Appointment.class);
                if (apt == null) {
                    HttpHelper.sendErrorResponse(exchange, 400, "Invalid appointment payload");
                    return;
                }
                Appointment updated = appointmentService.updateAppointment(appointmentId, apt, userRole);
                HttpHelper.sendSuccessResponse(exchange, "Appointment updated successfully", updated);
            } else if ("DELETE".equalsIgnoreCase(method)) {
                String appointmentId = path.substring(path.lastIndexOf('/') + 1);
                boolean deleted = appointmentService.deleteAppointment(appointmentId, userRole);
                if (deleted) {
                    HttpHelper.sendSuccessResponse(exchange, "Appointment deleted successfully", null);
                } else {
                    HttpHelper.sendErrorResponse(exchange, 404, "Appointment not found");
                }
            } else {
                HttpHelper.sendErrorResponse(exchange, 405, "Method Not Allowed");
            }
        } catch (SecurityException se) {
            HttpHelper.sendErrorResponse(exchange, 403, se.getMessage());
        } catch (Exception e) {
            HttpHelper.sendErrorResponse(exchange, 500, "Appointment Error: " + e.getMessage());
        }
    }
}
