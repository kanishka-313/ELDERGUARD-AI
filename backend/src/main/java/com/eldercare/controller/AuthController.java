package com.eldercare.controller;

import com.eldercare.model.User;
import com.eldercare.service.AuthService;
import com.google.gson.JsonObject;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;

public class AuthController implements HttpHandler {
    private final AuthService authService;

    public AuthController() {
        this.authService = new AuthService();
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (HttpHelper.handlePreflight(exchange)) return;

        String path = exchange.getRequestURI().getPath();
        String method = exchange.getRequestMethod();

        try {
            if ("POST".equalsIgnoreCase(method)) {
                if (path.endsWith("/login/elder")) {
                    handleElderLogin(exchange);
                } else if (path.endsWith("/login/family")) {
                    handleFamilyLogin(exchange);
                } else if (path.endsWith("/signup")) {
                    handleSignup(exchange);
                } else if (path.endsWith("/forgot-password")) {
                    handleForgotPassword(exchange);
                } else {
                    HttpHelper.sendErrorResponse(exchange, 404, "Endpoint not found: " + path);
                }
            } else {
                HttpHelper.sendErrorResponse(exchange, 405, "Method Not Allowed");
            }
        } catch (Exception e) {
            HttpHelper.sendErrorResponse(exchange, 500, "Auth Error: " + e.getMessage());
        }
    }

    private void handleElderLogin(HttpExchange exchange) throws IOException {
        JsonObject body = HttpHelper.parseJsonObject(exchange);
        String name = HttpHelper.getString(body, "name");
        String pin = HttpHelper.getString(body, "pin", HttpHelper.getString(body, "password"));
        String phone = HttpHelper.getString(body, "phone");

        User user = authService.loginElder(name, pin, phone);
        if (user != null) {
            HttpHelper.sendSuccessResponse(exchange, "Elder login successful", user);
        } else {
            HttpHelper.sendErrorResponse(exchange, 401, "Account not found or invalid PIN. Please register first on the 'Register New Account' tab.");
        }
    }

    private void handleFamilyLogin(HttpExchange exchange) throws IOException {
        JsonObject body = HttpHelper.parseJsonObject(exchange);
        String email = HttpHelper.getString(body, "email");
        String password = HttpHelper.getString(body, "password");
        String elderPhone = HttpHelper.getString(body, "elderPhone");

        User user = authService.loginFamily(email, password, elderPhone);
        if (user != null) {
            HttpHelper.sendSuccessResponse(exchange, "Family login successful", user);
        } else {
            HttpHelper.sendErrorResponse(exchange, 401, "Account not found or invalid password. Please register first on the 'Register New Account' tab.");
        }
    }

    private void handleSignup(HttpExchange exchange) throws IOException {
        JsonObject body = HttpHelper.parseJsonObject(exchange);
        String name = HttpHelper.getString(body, "name", "");
        if (name.trim().isEmpty()) {
            HttpHelper.sendErrorResponse(exchange, 400, "Full Name is required.");
            return;
        }
        String role = HttpHelper.getString(body, "role", "ELDER");
        String phone = HttpHelper.getString(body, "phone");
        String email = HttpHelper.getString(body, "email");
        String password = HttpHelper.getString(body, "password", HttpHelper.getString(body, "pin"));
        if (password == null || password.trim().isEmpty()) {
            HttpHelper.sendErrorResponse(exchange, 400, "Password or 4-digit PIN is required.");
            return;
        }
        String connectedContact = HttpHelper.getString(body, "connectedElderPhone", HttpHelper.getString(body, "connectedFamilyPhone"));

        User user = new User();
        user.setName(name.trim());
        user.setRole(role);
        user.setPhone(phone != null && !phone.trim().isEmpty() ? phone.trim() : null);
        user.setEmail(email != null && !email.trim().isEmpty() ? email.trim().toLowerCase() : null);
        user.setPasswordHash(password.trim());
        if ("ELDER".equalsIgnoreCase(role)) {
            user.setConnectedFamilyPhone(connectedContact);
            Integer age = HttpHelper.getInt(body, "age", null);
            if (age != null) user.setAge(age);
            String bg = HttpHelper.getString(body, "bloodGroup");
            if (bg != null) user.setBloodGroup(bg);
            String mh = HttpHelper.getString(body, "medicalHistory");
            if (mh != null) user.setMedicalHistory(mh);
            String dn = HttpHelper.getString(body, "doctorName");
            if (dn != null) user.setDoctorName(dn);
        } else {
            user.setConnectedElderPhone(connectedContact);
        }

        User saved = authService.signup(user);
        HttpHelper.sendSuccessResponse(exchange, "User registered successfully", saved);
    }

    private void handleForgotPassword(HttpExchange exchange) throws IOException {
        JsonObject body = HttpHelper.parseJsonObject(exchange);
        String identifier = HttpHelper.getString(body, "identifier", HttpHelper.getString(body, "email", HttpHelper.getString(body, "phone")));
        String newPassword = HttpHelper.getString(body, "newPassword", "1234");

        boolean success = authService.forgotPassword(identifier, newPassword);
        if (success) {
            HttpHelper.sendSuccessResponse(exchange, "Password reset successfully", null);
        } else {
            HttpHelper.sendErrorResponse(exchange, 404, "User not found with provided identifier.");
        }
    }
}
