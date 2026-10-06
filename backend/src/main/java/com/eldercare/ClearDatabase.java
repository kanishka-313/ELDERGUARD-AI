package com.eldercare;

import com.eldercare.repository.SupabaseConfig;

public class ClearDatabase {
    public static void main(String[] args) {
        System.out.println("==================================================");
        System.out.println("🧹 Clearing all Supabase tables...");
        System.out.println("==================================================");

        try {
            SupabaseConfig.init();
            String[] tables = {"voice_alarms", "activity_logs", "appointments", "alerts", "schedules", "users"};
            for (String table : tables) {
                boolean deleted = SupabaseConfig.delete(table, "id=neq.00000000-0000-0000-0000-000000000000");
                System.out.println("✔ Cleared table: " + table);
            }
            System.out.println("\n✅ Successfully cleared Supabase tables! Ready for fresh registrations.");
        } catch (Exception e) {
            System.err.println("Error clearing Supabase tables: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
