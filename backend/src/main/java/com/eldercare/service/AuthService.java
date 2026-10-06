package com.eldercare.service;

import com.eldercare.model.Appointment;
import com.eldercare.model.User;
import com.eldercare.repository.AppointmentRepository;
import com.eldercare.repository.UserRepository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public class AuthService {
    private final UserRepository userRepository;

    public AuthService() {
        this.userRepository = new UserRepository();
    }

    public static String hashPassword(String password) {
        if (password == null) return "";
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(password.trim().getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return password;
        }
    }

    public String sanitizeName(String name) {
        if (name == null) return "";
        // Remove any phone numbers, country codes, digits, brackets, and punctuation safely
        String cleaned = name.replaceAll("(?i)\\+?91", "")
                             .replaceAll("\\([^)]*\\)", "")
                             .replaceAll("\\[[^\\]]*\\]", "")
                             .replaceAll("[0-9+()\\[\\]:;,_\\-\\.]+", " ")
                             .replaceAll("\\s+", " ")
                             .trim();
        return cleaned.isEmpty() ? name.trim() : cleaned;
    }

    public User loginElder(String name, String pin, String phone) {
        if (pin == null || pin.trim().isEmpty()) return null;
        String hashedPin = hashPassword(pin);
        String cleanName = sanitizeName(name);
        String cleanPhone = phone != null ? phone.trim() : "";

        // 1. Try finding registered elder by exact human name
        if (!cleanName.isEmpty()) {
            Optional<User> byName = userRepository.findElderByName(cleanName);
            if (byName.isPresent()) {
                User user = byName.get();
                if (hashedPin.equals(user.getPasswordHash()) || pin.trim().equals(user.getPasswordHash())) {
                    if (!cleanPhone.isEmpty() && (user.getPhone() == null || user.getPhone().isEmpty())) {
                        user.setPhone(cleanPhone);
                        user.setUpdatedAt(Instant.now().toString());
                        userRepository.save(user);
                    }
                    return user;
                }
            }
        }

        // 2. If not matched by name, try finding registered elder by phone
        if (!cleanPhone.isEmpty()) {
            Optional<User> byPhone = userRepository.findByPhone(cleanPhone);
            if (byPhone.isPresent() && "ELDER".equalsIgnoreCase(byPhone.get().getRole())) {
                User user = byPhone.get();
                if (hashedPin.equals(user.getPasswordHash()) || pin.trim().equals(user.getPasswordHash())) {
                    return user;
                }
            }
        }

        // NO auto-provisioning: Unregistered elders must register on the registration page first
        return null;
    }

    public User loginElder(String nameOrPhone, String pin) {
        return loginElder(nameOrPhone, pin, null);
    }

    public User loginFamily(String email, String password, String elderPhone) {
        if (email == null || password == null) return null;
        String hashed = hashPassword(password);
        String cleanEmail = email.trim().toLowerCase();

        Optional<User> byEmail = userRepository.findByEmail(cleanEmail);
        if (byEmail.isPresent() && "FAMILY".equalsIgnoreCase(byEmail.get().getRole())) {
            User user = byEmail.get();
            if (hashed.equals(user.getPasswordHash()) || password.trim().equals(user.getPasswordHash())) {
                if (elderPhone != null && !elderPhone.trim().isEmpty()) {
                    user.setConnectedElderPhone(elderPhone.trim());
                    userRepository.findByPhone(elderPhone.trim()).ifPresent(elder -> {
                        user.setConnectedElderName(elder.getName());
                    });
                    user.setUpdatedAt(Instant.now().toString());
                    userRepository.save(user);
                }
                return user;
            }
        }

        // Also check if family member logged in by registered phone number
        Optional<User> byPhone = userRepository.findByPhone(email.trim());
        if (byPhone.isPresent() && "FAMILY".equalsIgnoreCase(byPhone.get().getRole())) {
            User user = byPhone.get();
            if (hashed.equals(user.getPasswordHash()) || password.trim().equals(user.getPasswordHash())) {
                if (elderPhone != null && !elderPhone.trim().isEmpty()) {
                    user.setConnectedElderPhone(elderPhone.trim());
                    user.setUpdatedAt(Instant.now().toString());
                    userRepository.save(user);
                }
                return user;
            }
        }

        // NO auto-provisioning: Unregistered family members must register on the registration page first
        return null;
    }

    public User signup(User user) {
        if (user == null) return null;
        String roleUpper = user.getRole() != null ? user.getRole().toUpperCase() : "ELDER";
        user.setRole(roleUpper);
        if (user.getUserId() == null || user.getUserId().isEmpty()) {
            user.setUserId("usr-" + roleUpper.toLowerCase() + "-" + UUID.randomUUID().toString().substring(0, 8));
        }
        if (user.getName() == null || user.getName().trim().isEmpty()) {
            user.setName("User");
        } else {
            user.setName(user.getName().trim());
        }
        if (user.getPasswordHash() != null && !user.getPasswordHash().isEmpty()) {
            if (user.getPasswordHash().length() < 64) {
                user.setPasswordHash(hashPassword(user.getPasswordHash()));
            }
        }

        if ("ELDER".equals(roleUpper)) {
            if (user.getIsProfileComplete() == null) {
                user.setIsProfileComplete(false); // Flag profile as incomplete so profile update modal prompts elder
            }
            if (user.getConnectedFamilyPhone() != null && !user.getConnectedFamilyPhone().trim().isEmpty()) {
                String famPhone = user.getConnectedFamilyPhone().trim();
                user.setConnectedFamilyPhone(famPhone);
                // Bidirectional auto-linking: find if family member with this phone is registered
                userRepository.findByPhone(famPhone).ifPresent(family -> {
                    if ("FAMILY".equalsIgnoreCase(family.getRole())) {
                        user.setConnectedFamilyId(family.getUserId());
                        user.setConnectedFamilyName(family.getName());
                        user.setConnectedFamilyEmail(family.getEmail());
                        family.setConnectedElderId(user.getUserId());
                        family.setConnectedElderPhone(user.getPhone());
                        family.setConnectedElderName(user.getName());
                        family.setUpdatedAt(Instant.now().toString());
                        userRepository.save(family);
                    }
                });
            }
        } else if ("FAMILY".equals(roleUpper) && user.getConnectedElderPhone() != null && !user.getConnectedElderPhone().trim().isEmpty()) {
            String eldPhone = user.getConnectedElderPhone().trim();
            user.setConnectedElderPhone(eldPhone);
            // Bidirectional auto-linking: find if elder with this phone is registered
            userRepository.findByPhone(eldPhone).ifPresent(elder -> {
                if ("ELDER".equalsIgnoreCase(elder.getRole())) {
                    user.setConnectedElderId(elder.getUserId());
                    user.setConnectedElderName(elder.getName());
                    elder.setConnectedFamilyId(user.getUserId());
                    elder.setConnectedFamilyPhone(user.getPhone());
                    elder.setConnectedFamilyName(user.getName());
                    elder.setConnectedFamilyEmail(user.getEmail());
                    elder.setUpdatedAt(Instant.now().toString());
                    userRepository.save(elder);
                }
            });
        }

        user.setCreatedAt(Instant.now().toString());
        user.setUpdatedAt(Instant.now().toString());
        User savedUser = userRepository.save(user);

        // If newly registered elder, seed baseline daily routine schedules
        if ("ELDER".equals(roleUpper)) {
            try {
                ScheduleService scheduleService = new ScheduleService();
                scheduleService.seedBaseSchedulesForElder(savedUser.getUserId());
            } catch (Exception e) {
                System.err.println("[AuthService] Warning seeding schedules for new elder: " + e.getMessage());
            }
        }

        return savedUser;
    }

    public User signup(String name, String role, String phone, String email, String password, String connectedElderPhone) {
        User user = new User();
        user.setName(name);
        user.setRole(role);
        user.setPhone(phone);
        user.setEmail(email);
        user.setPasswordHash(password != null ? hashPassword(password.trim()) : null);
        if ("ELDER".equalsIgnoreCase(role)) {
            user.setConnectedFamilyPhone(connectedElderPhone);
        } else {
            user.setConnectedElderPhone(connectedElderPhone);
        }
        return signup(user);
    }

    public boolean forgotPassword(String identifier, String newPassword) {
        if (identifier == null || newPassword == null) return false;
        Optional<User> user = userRepository.findByEmail(identifier.trim().toLowerCase());
        if (user.isEmpty()) {
            user = userRepository.findByPhone(identifier.trim());
        }
        if (user.isPresent()) {
            User u = user.get();
            u.setPasswordHash(hashPassword(newPassword.trim()));
            u.setUpdatedAt(Instant.now().toString());
            userRepository.save(u);
            return true;
        }
        return false;
    }

    public Optional<User> getProfile(String userId) {
        return userRepository.findById(userId);
    }

    public User updateProfile(User user) {
        if (user == null || user.getUserId() == null) return null;
        Optional<User> existingOpt = userRepository.findById(user.getUserId());
        if (existingOpt.isPresent()) {
            User existing = existingOpt.get();
            if (user.getName() != null && !user.getName().trim().isEmpty()) existing.setName(user.getName().trim());
            if (user.getPhone() != null && !user.getPhone().trim().isEmpty()) existing.setPhone(user.getPhone().trim());
            if (user.getEmail() != null && !user.getEmail().trim().isEmpty()) existing.setEmail(user.getEmail().trim().toLowerCase());
            if (user.getPasswordHash() != null && !user.getPasswordHash().trim().isEmpty()) {
                String pwd = user.getPasswordHash().trim();
                if (pwd.length() < 64) {
                    existing.setPasswordHash(hashPassword(pwd));
                } else {
                    existing.setPasswordHash(pwd);
                }
            }
            if (user.getAge() != null) existing.setAge(user.getAge());
            if (user.getBloodGroup() != null) existing.setBloodGroup(user.getBloodGroup());
            if (user.getMedicalHistory() != null) existing.setMedicalHistory(user.getMedicalHistory());
            if (user.getConnectedFamilyPhone() != null) existing.setConnectedFamilyPhone(user.getConnectedFamilyPhone().trim());
            if (user.getConnectedFamilyName() != null) existing.setConnectedFamilyName(user.getConnectedFamilyName().trim());
            if (user.getConnectedFamilyEmail() != null) existing.setConnectedFamilyEmail(user.getConnectedFamilyEmail().trim());
            if (user.getConnectedFamilyId() != null) existing.setConnectedFamilyId(user.getConnectedFamilyId().trim());
            if (user.getConnectedElderPhone() != null) existing.setConnectedElderPhone(user.getConnectedElderPhone().trim());
            if (user.getConnectedElderName() != null) existing.setConnectedElderName(user.getConnectedElderName().trim());
            if (user.getConnectedElderId() != null) existing.setConnectedElderId(user.getConnectedElderId().trim());
            if (user.getUpcomingAppointmentDate() != null) existing.setUpcomingAppointmentDate(user.getUpcomingAppointmentDate().trim());
            if (user.getUpcomingAppointmentTime() != null) existing.setUpcomingAppointmentTime(user.getUpcomingAppointmentTime().trim());
            if (user.getUpcomingAppointmentPurpose() != null) existing.setUpcomingAppointmentPurpose(user.getUpcomingAppointmentPurpose().trim());
            if (user.getUpcomingAppointmentLocation() != null) existing.setUpcomingAppointmentLocation(user.getUpcomingAppointmentLocation().trim());
            if (user.getIsProfileComplete() != null) existing.setIsProfileComplete(user.getIsProfileComplete());

            // If an appointment was scheduled in profile, also insert/update in Appointment collection
            if (existing.getUpcomingAppointmentDate() != null && !existing.getUpcomingAppointmentDate().isEmpty() &&
                existing.getUpcomingAppointmentTime() != null && !existing.getUpcomingAppointmentTime().isEmpty()) {
                try {
                    AppointmentRepository aptRepo = new AppointmentRepository();
                    String elderId = "ELDER".equalsIgnoreCase(existing.getRole()) ? existing.getUserId() : existing.getConnectedElderId();
                    String elderName = "ELDER".equalsIgnoreCase(existing.getRole()) ? existing.getName() : existing.getConnectedElderName();
                    if (elderId == null || elderId.isEmpty()) elderId = "usr-elder-1";
                    
                    Appointment apt = new Appointment();
                    apt.setAppointmentId("apt-" + UUID.randomUUID().toString().substring(0, 8));
                    apt.setElderId(elderId);
                    apt.setElderName(elderName != null ? elderName : "Elder");
                    apt.setAppointmentDate(existing.getUpcomingAppointmentDate());
                    apt.setAppointmentTime(existing.getUpcomingAppointmentTime());
                    apt.setPurpose(existing.getUpcomingAppointmentPurpose() != null && !existing.getUpcomingAppointmentPurpose().isEmpty() ? existing.getUpcomingAppointmentPurpose() : "Medical Consultation");
                    apt.setLocation(existing.getUpcomingAppointmentLocation() != null && !existing.getUpcomingAppointmentLocation().isEmpty() ? existing.getUpcomingAppointmentLocation() : "Healthcare Clinic");
                    apt.setStatus("CONFIRMED");
                    apt.setCreatedAt(Instant.now().toString());
                    apt.setUpdatedAt(Instant.now().toString());
                    aptRepo.save(apt);
                } catch (Exception ex) {
                    System.err.println("[AuthService] Error creating appointment from profile: " + ex.getMessage());
                }
            }

            // Bidirectional linking upon profile update
            if ("ELDER".equalsIgnoreCase(existing.getRole()) && existing.getConnectedFamilyPhone() != null && !existing.getConnectedFamilyPhone().isEmpty()) {
                userRepository.findByPhone(existing.getConnectedFamilyPhone()).ifPresent(family -> {
                    if ("FAMILY".equalsIgnoreCase(family.getRole())) {
                        existing.setConnectedFamilyId(family.getUserId());
                        if (existing.getConnectedFamilyName() == null || existing.getConnectedFamilyName().isEmpty()) {
                            existing.setConnectedFamilyName(family.getName());
                        }
                        if (existing.getConnectedFamilyEmail() == null || existing.getConnectedFamilyEmail().isEmpty()) {
                            existing.setConnectedFamilyEmail(family.getEmail());
                        }
                        family.setConnectedElderId(existing.getUserId());
                        family.setConnectedElderPhone(existing.getPhone());
                        family.setConnectedElderName(existing.getName());
                        family.setUpcomingAppointmentDate(existing.getUpcomingAppointmentDate());
                        family.setUpcomingAppointmentTime(existing.getUpcomingAppointmentTime());
                        family.setUpcomingAppointmentPurpose(existing.getUpcomingAppointmentPurpose());
                        family.setUpcomingAppointmentLocation(existing.getUpcomingAppointmentLocation());
                        family.setUpdatedAt(Instant.now().toString());
                        userRepository.save(family);
                    }
                });
            } else if ("FAMILY".equalsIgnoreCase(existing.getRole()) && existing.getConnectedElderPhone() != null && !existing.getConnectedElderPhone().isEmpty()) {
                userRepository.findByPhone(existing.getConnectedElderPhone()).ifPresent(elder -> {
                    if ("ELDER".equalsIgnoreCase(elder.getRole())) {
                        existing.setConnectedElderId(elder.getUserId());
                        if (existing.getConnectedElderName() == null || existing.getConnectedElderName().isEmpty()) {
                            existing.setConnectedElderName(elder.getName());
                        }
                        elder.setConnectedFamilyId(existing.getUserId());
                        elder.setConnectedFamilyPhone(existing.getPhone());
                        elder.setConnectedFamilyName(existing.getName());
                        elder.setConnectedFamilyEmail(existing.getEmail());
                        elder.setUpcomingAppointmentDate(existing.getUpcomingAppointmentDate());
                        elder.setUpcomingAppointmentTime(existing.getUpcomingAppointmentTime());
                        elder.setUpcomingAppointmentPurpose(existing.getUpcomingAppointmentPurpose());
                        elder.setUpcomingAppointmentLocation(existing.getUpcomingAppointmentLocation());
                        elder.setUpdatedAt(Instant.now().toString());
                        userRepository.save(elder);
                    }
                });
            }

            existing.setUpdatedAt(Instant.now().toString());
            return userRepository.save(existing);
        }
        user.setUpdatedAt(Instant.now().toString());
        return userRepository.save(user);
    }
}
