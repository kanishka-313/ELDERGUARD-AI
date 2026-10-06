package com.eldercare;

import com.eldercare.controller.*;
import com.eldercare.repository.SupabaseConfig;
import com.eldercare.service.VoiceSchedulerService;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.BindException;
import java.net.InetSocketAddress;
import java.util.concurrent.Executors;

public class ElderCareServer {
    private static final int DEFAULT_PORT = 8080;
    private static final int FALLBACK_PORT = 8088;

    public static void main(String[] args) {
        System.out.println("==================================================");
        System.out.println("🚀 Starting ElderCare AI Java 21 REST API Server (Supabase Powered)");
        System.out.println("==================================================");

        try {
            // 1. Initialize Supabase Cloud Database connection
            SupabaseConfig.init();

            // 2. Start Voice Scheduler service (Java 21 ScheduledExecutorService)
            VoiceSchedulerService voiceSchedulerService = new VoiceSchedulerService();

            // 3. Resolve Port
            int port = DEFAULT_PORT;
            String portEnv = System.getenv("PORT");
            if (portEnv != null && !portEnv.trim().isEmpty()) {
                try {
                    port = Integer.parseInt(portEnv.trim());
                } catch (NumberFormatException ignored) {}
            }

            HttpServer server = null;
            try {
                server = HttpServer.create(new InetSocketAddress(port), 0);
            } catch (BindException be) {
                if (port == DEFAULT_PORT) {
                    System.out.println("[ElderCareServer] Port 8080 is currently occupied by a local system process. Attempting fallback port " + FALLBACK_PORT + "...");
                    port = FALLBACK_PORT;
                    server = HttpServer.create(new InetSocketAddress(port), 0);
                } else {
                    throw be;
                }
            }

            // 4. Instantiate Controllers
            AuthController authController = new AuthController();
            ProfileController profileController = new ProfileController();
            AppointmentController appointmentController = new AppointmentController();
            ScheduleController scheduleController = new ScheduleController();
            VoiceController voiceController = new VoiceController(voiceSchedulerService);
            SensorController sensorController = new SensorController();
            AlertController alertController = new AlertController();
            ActivityController activityController = new ActivityController();
            WebhookRelayController webhookRelayController = new WebhookRelayController();

            // 5. Register HTTP Contexts
            server.createContext("/api/auth", authController);
            server.createContext("/api/profile", profileController);
            server.createContext("/api/appointments", appointmentController);
            server.createContext("/api/schedules", scheduleController);
            server.createContext("/api/voice", voiceController);
            server.createContext("/api/sensors", sensorController);
            server.createContext("/api/activity/current", sensorController);
            server.createContext("/api/alerts", alertController);
            server.createContext("/api/activity-logs", activityController);
            server.createContext("/api/webhook", webhookRelayController);

            // Health check root endpoint
            server.createContext("/", exchange -> {
                if (HttpHelper.handlePreflight(exchange)) return;
                String path = exchange.getRequestURI().getPath();
                if ("/".equals(path) || "/health".equals(path)) {
                    HttpHelper.sendSuccessResponse(exchange, "ElderCare AI Java 21 REST API Server is RUNNING", null);
                } else {
                    HttpHelper.sendErrorResponse(exchange, 404, "Endpoint not found: " + path);
                }
            });

            // 6. Use Java 21 Virtual Threads Executor for high-concurrency request handling
            server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());

            // 7. Start the server
            server.start();

            System.out.println("✅ ElderCare AI Server listening on: http://localhost:" + port);
            System.out.println("✅ Database: Supabase Cloud Database (PostgreSQL + Realtime)");
            System.out.println("✅ Virtual Thread Pool enabled (Java 21)");
            System.out.println("✅ Schedule Automation Engine: Delegated to SNS Agent Workbench");
            System.out.println("==================================================");

            final HttpServer finalServer = server;
            final int finalPort = port;

            // Register JVM shutdown hook
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                System.out.println("\n[ElderCareServer] Shutting down server and voice scheduler...");
                voiceSchedulerService.shutdown();
                finalServer.stop(1);
                SupabaseConfig.close();
                System.out.println("[ElderCareServer] Server stopped successfully.");
            }));

        } catch (IOException e) {
            System.err.println("❌ Failed to start ElderCare AI Server: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
