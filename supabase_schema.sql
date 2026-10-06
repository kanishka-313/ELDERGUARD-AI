-- ==============================================================================
-- ElderCare AI - Complete Supabase PostgreSQL Schema & Realtime Setup
-- ==============================================================================
-- Run this entire script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ELDER', 'FAMILY')),
  phone TEXT,
  email TEXT,
  pin TEXT,
  password_hash TEXT,
  connected_family_phone TEXT,
  connected_family_name TEXT,
  connected_family_email TEXT,
  connected_family_id TEXT,
  connected_elder_phone TEXT,
  connected_elder_name TEXT,
  connected_elder_id TEXT,
  preferred_language TEXT DEFAULT 'en',
  is_profile_complete BOOLEAN DEFAULT FALSE,
  address TEXT,
  doctor_phone TEXT,
  doctor_name TEXT,
  health_conditions TEXT,
  allergies TEXT,
  emergency_notes TEXT,
  upcoming_appointment_date TEXT,
  upcoming_appointment_time TEXT,
  upcoming_appointment_purpose TEXT,
  upcoming_appointment_location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id TEXT,
  elder_id TEXT,
  title TEXT,
  routine_type TEXT,
  category TEXT,
  scheduled_time TEXT,
  custom_voice_prompt TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  is_enabled BOOLEAN DEFAULT TRUE,
  completed BOOLEAN DEFAULT FALSE,
  completion_status TEXT DEFAULT 'PENDING',
  last_completed_at TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist in schedules
ALTER TABLE public.schedules 
  ADD COLUMN IF NOT EXISTS schedule_id TEXT,
  ADD COLUMN IF NOT EXISTS routine_type TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_time TEXT,
  ADD COLUMN IF NOT EXISTS custom_voice_prompt TEXT,
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS completion_status TEXT DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS last_completed_at TEXT;

-- 3. ALERTS TABLE
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id TEXT,
  elder_id TEXT,
  type TEXT,
  severity TEXT,
  status TEXT DEFAULT 'ACTIVE',
  message TEXT,
  source TEXT DEFAULT 'APP',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.alerts
  ALTER COLUMN elder_id TYPE TEXT;

-- 4. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id TEXT,
  elder_id TEXT,
  activity TEXT,
  source TEXT DEFAULT 'ESP32_PIR',
  confidence NUMERIC DEFAULT 1.0,
  metadata TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id TEXT,
  elder_id TEXT,
  elder_name TEXT,
  doctor_name TEXT,
  purpose TEXT,
  location TEXT,
  appointment_date TEXT,
  appointment_time TEXT,
  status TEXT DEFAULT 'CONFIRMED',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.appointments 
  ADD COLUMN IF NOT EXISTS appointment_id TEXT,
  ADD COLUMN IF NOT EXISTS elder_name TEXT,
  ADD COLUMN IF NOT EXISTS doctor_name TEXT;

-- 6. VOICE ALARMS TABLE
CREATE TABLE IF NOT EXISTS public.voice_alarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT,
  schedule_id TEXT,
  elder_id TEXT,
  routine_type TEXT,
  status TEXT DEFAULT 'TRIGGERED',
  spoken_response TEXT,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- UNIQUE INDEXES (Required for fast lookups & Supabase REST upserts)
-- ==============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_id ON public.users(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedules_schedule_id ON public.schedules(schedule_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_alert_id ON public.alerts(alert_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_logs_log_id ON public.activity_logs(log_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_appointment_id ON public.appointments(appointment_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_voice_alarms_event_id ON public.voice_alarms(event_id);

-- ==============================================================================
-- COLUMN TYPE AND MIGRATION FIXES
-- ==============================================================================
ALTER TABLE public.schedules ALTER COLUMN elder_id TYPE TEXT USING elder_id::TEXT;
ALTER TABLE public.alerts ALTER COLUMN elder_id TYPE TEXT USING elder_id::TEXT;
ALTER TABLE public.activity_logs ALTER COLUMN elder_id TYPE TEXT USING elder_id::TEXT;
ALTER TABLE public.appointments ALTER COLUMN elder_id TYPE TEXT USING elder_id::TEXT;
ALTER TABLE public.voice_alarms ALTER COLUMN elder_id TYPE TEXT USING elder_id::TEXT;

-- GRANT PERMISSIONS TO ANON & AUTHENTICATED
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- POLICIES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_alarms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access for users" ON public.users;
CREATE POLICY "Public access for users" ON public.users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for schedules" ON public.schedules;
CREATE POLICY "Public access for schedules" ON public.schedules FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for alerts" ON public.alerts;
CREATE POLICY "Public access for alerts" ON public.alerts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for activity_logs" ON public.activity_logs;
CREATE POLICY "Public access for activity_logs" ON public.activity_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for appointments" ON public.appointments;
CREATE POLICY "Public access for appointments" ON public.appointments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for voice_alarms" ON public.voice_alarms;
CREATE POLICY "Public access for voice_alarms" ON public.voice_alarms FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ENABLE REALTIME
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users, public.schedules, public.alerts, public.activity_logs, public.appointments, public.voice_alarms;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

SELECT 'ElderGuard AI Supabase schema and column migrations completed successfully!' AS status;
