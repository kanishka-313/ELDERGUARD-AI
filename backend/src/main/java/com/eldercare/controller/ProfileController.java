package com.eldercare.controller;

import com.eldercare.model.User;
import com.eldercare.service.AuthService;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.util.Optional;

public class ProfileController implements HttpHandler {
    private final AuthService authService;

    public ProfileController() {
        this.authService = new AuthService();
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (HttpHelper.handlePreflight(exchange)) return;

        String method = exchange.getRequestMethod();
        String userId = HttpHelper.getUserId(exchange);

        try {
            if ("GET".equalsIgnoreCase(method)) {
                Optional<User> user = authService.getProfile(userId);
                if (user.isPresent()) {
                    HttpHelper.sendSuccessResponse(exchange, "Profile fetched", user.get());
                } else {
                    // Fallback to elder profile if not found
                    authService.getProfile("usr-elder-1").ifPresentOrElse(
                            u -> {
                                try {
                                    HttpHelper.sendSuccessResponse(exchange, "Profile fetched", u);
                                } catch (IOException ignored) {}
                            },
                            () -> {
                                try {
                                    HttpHelper.sendErrorResponse(exchange, 404, "User not found");
                                } catch (IOException ignored) {}
                            }
                    );
                }
            } else if ("PUT".equalsIgnoreCase(method)) {
                User updatedUser = HttpHelper.parseJson(exchange, User.class);
                if (updatedUser == null) {
                    HttpHelper.sendErrorResponse(exchange, 400, "Invalid profile payload");
                    return;
                }
                if (updatedUser.getUserId() == null || updatedUser.getUserId().isEmpty()) {
                    updatedUser.setUserId(userId);
                }
                User saved = authService.updateProfile(updatedUser);
                HttpHelper.sendSuccessResponse(exchange, "Profile updated successfully", saved);
            } else {
                HttpHelper.sendErrorResponse(exchange, 405, "Method Not Allowed");
            }
        } catch (Exception e) {
            HttpHelper.sendErrorResponse(exchange, 500, "Profile Error: " + e.getMessage());
        }
    }
}
