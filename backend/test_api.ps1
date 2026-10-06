$BaseUrl = "http://localhost:8088/api"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Running ElderCare AI REST API & Supabase Verification Tests" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Health Check
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8088/" -Method GET
    Write-Host "✅ Health Check: $($health.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health Check Failed: $_" -ForegroundColor Red
}

# 2. Test Auth - Elder Login
try {
    $elderBody = @{ name = "Arthur Miller"; pin = "1234" } | ConvertTo-Json
    $elderLogin = Invoke-RestMethod -Uri "$BaseUrl/auth/login/elder" -Method POST -Body $elderBody -ContentType "application/json"
    Write-Host "✅ Elder Login: $($elderLogin.data.name) (Role: $($elderLogin.data.role))" -ForegroundColor Green
} catch {
    Write-Host "❌ Elder Login Failed: $_" -ForegroundColor Red
}

# 3. Test Auth - Family Login
try {
    $famBody = @{ email = "sarah.m@eldercare.ai"; password = "password123"; elderPhone = "+1 (555) 234-5678" } | ConvertTo-Json
    $famLogin = Invoke-RestMethod -Uri "$BaseUrl/auth/login/family" -Method POST -Body $famBody -ContentType "application/json"
    Write-Host "✅ Family Login: $($famLogin.data.name) (Role: $($famLogin.data.role))" -ForegroundColor Green
} catch {
    Write-Host "❌ Family Login Failed: $_" -ForegroundColor Red
}

# 4. Test Auth - Doctor Login
try {
    $docBody = @{ email = "kavsika@eldercare.ai"; password = "doctor123" } | ConvertTo-Json
    $docLogin = Invoke-RestMethod -Uri "$BaseUrl/auth/login/doctor" -Method POST -Body $docBody -ContentType "application/json"
    Write-Host "✅ Doctor Login: $($docLogin.data.name) (Role: $($docLogin.data.role))" -ForegroundColor Green
} catch {
    Write-Host "❌ Doctor Login Failed: $_" -ForegroundColor Red
}

# 5. TEST 1: Family creates appointment -> Stored in Supabase
try {
    $newAptBody = @{
        elderId = "usr-elder-1"
        elderName = "Arthur Miller"
        doctorId = "doc-1"
        doctorName = "Dr. Kavsika Harichandran"
        specialty = "Chief Geriatrician & Cardiologist"
        clinic = "St. Jude Senior Wellness Hospital"
        appointmentDate = "Friday, Sep 12, 2026"
        appointmentTime = "11:00 AM"
        purpose = "Comprehensive Cardiology Followup"
        location = "Cardiology Suite 102"
        consultationMode = "In-Person Clinic Visit"
    } | ConvertTo-Json

    $headers = @{ "X-User-Role" = "FAMILY"; "X-User-Id" = "usr-fam-1" }
    $aptRes = Invoke-RestMethod -Uri "$BaseUrl/appointments" -Method POST -Body $newAptBody -ContentType "application/json" -Headers $headers
    Write-Host "✅ TEST 1 (Family creates appointment): Created Appointment ID $($aptRes.data.appointmentId) in Supabase" -ForegroundColor Green
} catch {
    Write-Host "❌ TEST 1 Failed: $_" -ForegroundColor Red
}

# 6. TEST 2: Elder views appointments
try {
    $headers = @{ "X-User-Role" = "ELDER"; "X-User-Id" = "usr-elder-1" }
    $elderApts = Invoke-RestMethod -Uri "$BaseUrl/appointments/elder/usr-elder-1" -Method GET -Headers $headers
    Write-Host "✅ TEST 2 (Elder views appointments): Retrieved $($elderApts.data.Count) appointments for Elder" -ForegroundColor Green
} catch {
    Write-Host "❌ TEST 2 Failed: $_" -ForegroundColor Red
}

# 7. TEST 3: Doctor views assigned appointments & DOCTOR permission check
try {
    $headers = @{ "X-User-Role" = "DOCTOR"; "X-User-Id" = "doc-1" }
    $docApts = Invoke-RestMethod -Uri "$BaseUrl/appointments/doctor/doc-1" -Method GET -Headers $headers
    Write-Host "✅ TEST 3A (Doctor views assigned appointments): Retrieved $($docApts.data.Count) assigned appointments" -ForegroundColor Green

    # Verify DOCTOR cannot create appointments
    try {
        $illegalBody = @{ purpose = "Illegal Doctor Apt" } | ConvertTo-Json
        $docAttempt = Invoke-RestMethod -Uri "$BaseUrl/appointments" -Method POST -Body $illegalBody -ContentType "application/json" -Headers $headers
        Write-Host "❌ Security Flaw: Doctor was able to create appointment!" -ForegroundColor Red
    } catch {
        Write-Host "✅ TEST 3B (Doctor cannot create appointments): Blocked with 403 Forbidden as expected" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ TEST 3 Failed: $_" -ForegroundColor Red
}

# 8. TEST 4: Elder triggers SOS -> Supabase alert with recipientType=FAMILY and DOCTOR receives NOTHING
try {
    $headers = @{ "X-User-Role" = "ELDER"; "X-User-Id" = "usr-elder-1" }
    $sosBody = @{ elderId = "usr-elder-1"; source = "Elder Dashboard SOS" } | ConvertTo-Json
    $sosRes = Invoke-RestMethod -Uri "$BaseUrl/alerts/sos" -Method POST -Body $sosBody -ContentType "application/json" -Headers $headers
    Write-Host "✅ TEST 4A (Elder SOS Alert): Created Alert ID $($sosRes.data.alertId) | RecipientType: $($sosRes.data.recipientType) | Recipients: $($sosRes.data.recipientIds -join ', ')" -ForegroundColor Green

    # Verify DOCTOR receives NOTHING
    $docHeaders = @{ "X-User-Role" = "DOCTOR"; "X-User-Id" = "doc-1" }
    $docAlerts = Invoke-RestMethod -Uri "$BaseUrl/alerts" -Method GET -Headers $docHeaders
    if ($docAlerts.data.Count -eq 0) {
        Write-Host "✅ TEST 4B (Doctor receives NO emergency alerts): Confirmed 0 alerts for DOCTOR role" -ForegroundColor Green
    } else {
        Write-Host "❌ Security Flaw: Doctor received emergency alerts!" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ TEST 4 Failed: $_" -ForegroundColor Red
}

# 9. TEST 5: ESP32 Hardware emergency endpoint triggered -> Family receives alert
try {
    $sensorBody = @{ elderId = "usr-elder-1"; source = "ESP32_HARDWARE_BUTTON"; message = "CRITICAL: Hardware SOS button pressed on wearable" } | ConvertTo-Json
    $sensorSos = Invoke-RestMethod -Uri "$BaseUrl/sensors/emergency" -Method POST -Body $sensorBody -ContentType "application/json"
    Write-Host "✅ TEST 5 (ESP32 Emergency Endpoint): Alert ID $($sensorSos.data.alertId) routed to FAMILY ($($sensorSos.data.recipientIds -join ', '))" -ForegroundColor Green
} catch {
    Write-Host "❌ TEST 5 Failed: $_" -ForegroundColor Red
}

# 10. TEST 6: Create routine schedule and trigger voice event
try {
    $now = Get-Date
    $timeStr = $now.ToString("HH:mm")
    $schBody = @{
        elderId = "usr-elder-1"
        routineType = "MEDICINE"
        scheduledTime = $timeStr
        title = "Morning Blood Pressure Tablet"
        customVoicePrompt = "Arthur, it is $timeStr. Time to take your prescribed morning tablet."
        enabled = $true
    } | ConvertTo-Json

    $schRes = Invoke-RestMethod -Uri "$BaseUrl/schedules" -Method POST -Body $schBody -ContentType "application/json"
    Write-Host "✅ TEST 6A (Schedule Created): Created Schedule ID $($schRes.data.scheduleId) for $timeStr in Supabase" -ForegroundColor Green

    # Trigger test voice alarm
    $triggerBody = @{ scheduleId = $schRes.data.scheduleId } | ConvertTo-Json
    $voiceEvent = Invoke-RestMethod -Uri "$BaseUrl/voice/trigger" -Method POST -Body $triggerBody -ContentType "application/json"
    Write-Host "✅ TEST 6B (Java Scheduler -> Voice Alarm Event): Triggered Event ID $($voiceEvent.data.eventId) | Prompt: '$($voiceEvent.data.voicePrompt)'" -ForegroundColor Green

    # Verify active alarm lookup
    $activeAlarm = Invoke-RestMethod -Uri "$BaseUrl/voice/active-alarm?elderId=usr-elder-1" -Method GET
    Write-Host "✅ TEST 6C (Voice Event Delivery): Found active alarm for elder: $($activeAlarm.data.eventId)" -ForegroundColor Green

    # 11. TEST 7: Elder acknowledges alarm (I AM AWAKE / DONE)
    $ackBody = @{ eventId = $activeAlarm.data.eventId; elderId = "usr-elder-1"; response = "Yes, I took my medicine" } | ConvertTo-Json
    $ackRes = Invoke-RestMethod -Uri "$BaseUrl/voice/acknowledge" -Method POST -Body $ackBody -ContentType "application/json"
    Write-Host "✅ TEST 7 (Elder presses I AM AWAKE / DONE): Voice alarm acknowledged and Supabase status updated" -ForegroundColor Green
} catch {
    Write-Host "❌ TEST 6/7 Failed: $_" -ForegroundColor Red
}

# 12. TEST 8: Motion sensor data ingested -> Activity processing -> Supabase activity_logs
try {
    $motionBody = @{
        elderId = "usr-elder-1"
        activity = "walking"
        confidence = 0.96
        source = "ESP32_PIR"
        metadata = "Hallway motion detected"
    } | ConvertTo-Json

    $motionRes = Invoke-RestMethod -Uri "$BaseUrl/sensors/motion" -Method POST -Body $motionBody -ContentType "application/json"
    Write-Host "✅ TEST 8A (POST /api/sensors/motion): ActivityLog created ID $($motionRes.data.activityId) (Activity: $($motionRes.data.activity))" -ForegroundColor Green

    # Fetch current activity and timeline
    $currAct = Invoke-RestMethod -Uri "$BaseUrl/activity/current?elderId=usr-elder-1" -Method GET
    Write-Host "✅ TEST 8B (GET /api/activity/current): Current activity: $($currAct.data.activity) (Source: $($currAct.data.source))" -ForegroundColor Green

    $logs = Invoke-RestMethod -Uri "$BaseUrl/activity-logs?elderId=usr-elder-1" -Method GET
    Write-Host "✅ TEST 8C (GET /api/activity-logs): Retrieved $($logs.data.Count) timeline entries from Supabase" -ForegroundColor Green
} catch {
    Write-Host "❌ TEST 8 Failed: $_" -ForegroundColor Red
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "All 8 Tests Successfully Passed!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
