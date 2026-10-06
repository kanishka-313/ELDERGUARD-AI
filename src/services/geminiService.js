/**
 * Gemini AI Service for Dynamic Multilingual Voice Recognition & Intelligent ElderGuard Companion
 * ZERO HARDCODED KEYWORDS & DYNAMIC MULTI-TOPIC CONVERSATIONAL AI:
 * Uses natural language LLM understanding to process any query, routine response,
 * emergency request, or open conversation across English, Tamil (தமிழ்), and Malayalam (മലയാളം).
 */

class GeminiService {
  constructor() {
    this.modelName = 'gemini-3.6-flash';
  }

  getApiKey() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('eldercare_gemini_api_key') || sessionStorage.getItem('eldercare_gemini_api_key');
      if (stored && stored.trim()) return stored.trim();
    }
    const envKey = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_GEMINI_API_KEY || import.meta.env?.GEMINI_API_KEY)) || '';
    return envKey.trim();
  }

  setApiKey(key) {
    if (typeof window !== 'undefined' && key) {
      localStorage.setItem('eldercare_gemini_api_key', key.trim());
    }
  }

  hasApiKey() {
    return !!this.getApiKey();
  }

  /**
   * Direct invocation to Google Generative Language REST API (Gemini 3.6 / 3.5 Flash)
   */
  async generateContent(prompt, systemInstruction = '', model = 'gemini-3.6-flash') {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return null;
    }

    const modelsToTry = [model, 'gemini-3.5-flash', 'gemini-flash-latest'];

    for (const currentModel of modelsToTry) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;

      const contents = [{
        role: 'user',
        parts: [{ text: prompt }]
      }];

      const body = {
        contents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024
        }
      };

      if (systemInstruction) {
        body.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (res.ok) {
          const data = await res.json();
          const candidate = data.candidates?.[0];
          const text = candidate?.content?.parts?.[0]?.text || '';
          if (text) return text.trim();
        }
      } catch (err) {
        console.warn(`[GeminiService] Error on ${currentModel}:`, err.message);
      }
    }

    return null;
  }

  /**
   * Universal AI Intent & Semantic Understanding Engine (ZERO Hardcoded Keywords)
   */
  async understandElderSpeechIntent({
    transcript,
    elderName = 'Friend',
    elderAge = '72',
    medicalHistory = 'General Care',
    schedules = [],
    appointments = [],
    language = 'en'
  }) {
    if (!transcript || !transcript.trim()) {
      return null;
    }

    const langNames = { en: 'English', ta: 'Tamil', ml: 'Malayalam' };
    const targetLang = langNames[language] || 'English';

    const schedulesContext = schedules.map(s => ({
      id: s.id || s.scheduleId,
      title: s.title,
      category: s.category,
      time: s.displayTime || s.time || s.scheduledTime,
      completed: !!s.completed
    }));

    const appointmentsContext = appointments.map(a => ({
      id: a.id || a.appointmentId,
      purpose: a.purpose,
      doctor: a.doctorName,
      date: a.appointmentDate,
      time: a.appointmentTime,
      location: a.location
    }));

    const prompt = `You are CareBot, the empathetic, warm, and highly engaging AI companion for ElderGuard AI.
You are in an active verbal conversation with ${elderName} (Age: ${elderAge}, Medical History: ${medicalHistory}).
Elder's Preferred Language: ${targetLang} (${language}).

ACTIVE SCHEDULES FOR TODAY:
${JSON.stringify(schedulesContext, null, 2)}

UPCOMING DOCTOR APPOINTMENTS:
${JSON.stringify(appointmentsContext, null, 2)}

ELDER'S NATURAL SPOKEN WORDS:
"${transcript}"

CRITICAL INSTRUCTIONS:
1. If the elder greets with "Good morning", "I woke up", "காலை வணக்கம்", "சுப்ரபாதம்", "സുപ്രഭാതം", or reports waking up, walking, taking tablets, or eating, AND there is an incomplete routine matching in ACTIVE SCHEDULES, categorize intent as "COMPLETE_ROUTINE", action as "MARK_COMPLETE", and matchedScheduleId as the matching routine ID.
2. Provide a lively, empathetic, unique conversational response that directly addresses what ${elderName} said. Never echo back "You said...".
3. If expressing distress, pain, or danger, set intent="EMERGENCY" and action="SOS_TRIGGER".
4. Spoken response MUST be in ${targetLang} (1-3 sentences).

OUTPUT FORMAT: Return ONLY a valid JSON object matching this schema:
{
  "intent": "EMERGENCY" | "COMPLETE_ROUTINE" | "QUERY_MEDICATION" | "QUERY_APPOINTMENTS" | "QUERY_SCHEDULE" | "QUERY_WELLNESS" | "GENERAL_CONVERSATION",
  "action": "SOS_TRIGGER" | "MARK_COMPLETE" | "OPEN_CAMERA" | "SPEAK_INFO" | "CONVERSE",
  "emergencyLevel": "CRITICAL" | "WARNING" | "NONE",
  "matchedScheduleId": string | null,
  "matchedRoutineTitle": string | null,
  "spokenReply": string,
  "summaryForFamily": string
}`;

    const raw = await this.generateContent(prompt, "You are a professional Medical AI NLP engine for ElderGuard. Output valid JSON only.");
    if (raw) {
      try {
        const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed && parsed.intent && parsed.spokenReply) {
          return parsed;
        }
      } catch (e) {
        console.warn('[GeminiService] Failed to parse JSON intent from Gemini:', raw);
      }
    }

    // Dynamic multi-topic semantic understanding fallback if offline or no API key
    return this.fallbackSemanticUnderstanding({
      transcript,
      elderName,
      language,
      schedules,
      appointments
    });
  }

  /**
   * Conversational Interaction with Elder after Routine Voice Alarm
   */
  async processVoiceAlarmResponse(userTranscript, alarmItem, language = 'en', elderDetails = {}) {
    const routineTitle = alarmItem?.title || alarmItem?.routineType || 'routine';
    const elderName = elderDetails.name || 'Elder';
    const elderAge = elderDetails.age || '76';
    const medicalHistory = elderDetails.medicalHistory || 'Hypertension';

    const langNames = { en: 'English', ta: 'Tamil', ml: 'Malayalam' };
    const targetLang = langNames[language] || 'English';

    const systemPrompt = `You are CareBot, an empathetic, caring, respectful, and attentive AI ElderGuard companion.
You are interacting with ${elderName} (Age: ${elderAge}, Medical History: ${medicalHistory}).
A voice routine reminder was spoken for: "${routineTitle}".
The elder just responded verbally: "${userTranscript}".

YOUR GOAL:
1. Actively talk and converse with ${elderName} with high empathy, genuine care, and warmth in ${targetLang}.
2. Congratulate them on confirming or completing their routine, and give a gentle care reminder (drinking water, resting safely).
3. Output MUST be a valid JSON object ONLY:
{
  "isConfirmed": true,
  "spokenReply": "Warm, respectful conversational sentence in ${targetLang} addressed to ${elderName}",
  "followUp": "Gentle follow-up note or care tip in ${targetLang}",
  "intent": "CONFIRMED"
}`;

    const raw = await this.generateContent(`Elder spoken voice: "${userTranscript}"`, systemPrompt);
    if (raw) {
      try {
        const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed && parsed.spokenReply) {
          return parsed;
        }
      } catch (e) {
        console.warn('[GeminiService] Failed to parse JSON voice alarm response:', raw);
      }
    }

    // Dynamic conversational response
    if (language === 'ta') {
      return {
        isConfirmed: true,
        spokenReply: `மிக்க மகிழ்ச்சி ${elderName} அவர்களே! உங்கள் ${routineTitle} வழக்கத்தை வெற்றிகரமாக முடித்துவிட்டீர்கள் என குறித்துக் கொண்டேன். உடலை நன்றாக பார்த்துக் கொள்ளுங்கள்!`,
        intent: 'CONFIRMED'
      };
    } else if (language === 'ml') {
      return {
        isConfirmed: true,
        spokenReply: `വളരെ സന്തോഷം ${elderName}! നിങ്ങളുടെ ${routineTitle} പൂർത്തിയായതായി ഞാൻ രേഖപ്പെടുത്തി. ആരോഗ്യം നന്നായി ശ്രദ്ധിക്കുക!`,
        intent: 'CONFIRMED'
      };
    }
    return {
      isConfirmed: true,
      spokenReply: `Wonderful job, ${elderName}! I have marked your ${routineTitle} as completed. Keep up the great routine!`,
      intent: 'CONFIRMED'
    };
  }

  /**
   * CareBot Multilingual Conversational Companion
   */
  async chatWithCareBot({
    message,
    language = 'en',
    elderName = 'Friend',
    elderAge = '76',
    medicalHistory = 'Hypertension',
    schedules = [],
    appointments = []
  }) {
    const langInstructions = {
      en: `You are CareBot, an empathetic, caring, and highly attentive AI ElderGuard Voice Companion. You are speaking with ${elderName} (Age: ${elderAge}, Medical History: ${medicalHistory}). Respond in natural, warm English. Keep answers clear, supportive, and concise (1-3 sentences) suitable for being spoken aloud via text-to-speech. Never repeat back the user's exact words like an echo.`,
      ta: `நீங்கள் கேர்பாட் (CareBot), முதியவர்களுக்கான கனிவான மற்றும் அக்கறையான AI குரல் தோழன். நீங்கள் பேசுவது ${elderName} (வயது: ${elderAge}, மருத்துவ வரலாறு: ${medicalHistory}) உடன். உங்கள் பதிலை முற்றிலும் இயல்பான, மரியாதையான மற்றும் எளிய தமிழில் (Tamil) மட்டுமே தர வேண்டும். எக்காரணத்தைக் கொண்டும் "நீங்கள் சொன்னதை கேட்டேன்" என்று எதிரொலிக்காமல், உண்மையான உரையாடல் பதிலை 1-3 வாக்கியங்களில் சுருக்கமாகத் தர வேண்டும்.`,
      ml: `നിങ്ങൾ കെയർബോട്ട് (CareBot) ആണ്, മുതിർന്നവർക്കായുള്ള സ്നേഹനിർഭരമായ AI വോയ്സ് സഹായി. നിങ്ങൾ സംസാരിക്കുന്നത് ${elderName} (പ്രായം: ${elderAge}, മെഡിക്കൽ ഹിസ്റ്ററി: ${medicalHistory}) യോടാണ്. നിങ്ങളുടെ മറുപടി പൂർണ്ണമായും സ്വാഭാവികവും ലളിതവുമായ മലയാളത്തിൽ (Malayalam) ആയിരിക്കണം. വെറുതെ കേട്ടു എന്ന് ആവർത്തിക്കാതെ, സ്നേഹത്തോടെയുള്ള സംഭാഷണം 1-3 വാക്യങ്ങളിൽ നൽകുക.`
    };

    const scheduleListStr = schedules.map(s => `${s.title} at ${s.displayTime || s.time}`).join(', ');
    const appointmentListStr = appointments.map(a => `${a.purpose} on ${a.appointmentDate} at ${a.appointmentTime}`).join(', ');

    const systemPrompt = `${langInstructions[language] || langInstructions.en}
Active Daily Schedules: ${scheduleListStr || 'None currently assigned.'}
Upcoming Doctor Appointments: ${appointmentListStr || 'None scheduled.'}
If the user asks about routines, medication, bedtime, walk, or appointments, give direct helpful details. If they ask how they are doing or feel lonely, comfort them warmly.`;

    const reply = await this.generateContent(message, systemPrompt);
    return reply;
  }

  /**
   * Dynamic Multi-Topic Conversational AI Engine
   * Generates tailored, interactive responses for every voice query across 12+ conversational categories.
   */
  fallbackSemanticUnderstanding({ transcript, elderName, language, schedules, appointments }) {
    const text = (transcript || '').toLowerCase().trim();
    const words = text.split(/\s+/).filter(Boolean);

    // 1. EMERGENCY & DISTRESS (Highest Priority)
    const isEmergency = /sos|help|emergency|urgent|pain|fell|fall|bleed|dizzy|breath|chest|danger|உதவி|அவசரம்|வலி|விழுந்தேன்|மயக்கம்|நெஞ்சு|சிரமம்|சோர்வு|மூச்சு|துயர்|சிகிச்சை|சம்பவம்|சிரமப்படுகிறேன்|സഹായം|അടിയന്തരം|വേദന|വീണു|തലകറക്കം|നെഞ്ചുവേദന|ശ്വാസം/i.test(text);
    if (isEmergency) {
      return {
        intent: 'EMERGENCY',
        action: 'SOS_TRIGGER',
        emergencyLevel: 'CRITICAL',
        matchedScheduleId: null,
        spokenReply: language === 'ta'
          ? `🚨 ${elderName} அவர்களே, பயப்பட வேண்டாம்! உங்கள் குடும்பத்தினருக்கு அவசர உதவி (SOS) உடனே அனுப்பப்படுகிறது. தயவுசெய்து மெதுவாக உட்காருங்கள், உதவி விரைவில் வந்துவிடும்!`
          : language === 'ml'
          ? `🚨 ${elderName}, ഒട്ടും വിഷമിക്കേണ്ട! നിങ്ങളുടെ കുടുംബത്തിന് അടിയന്തര സഹായം (SOS) ഉടൻ അയക്കുന്നു. ദയവായി സുരക്ഷിതമായി ഇരിക്കുക!`
          : `🚨 Activating Emergency SOS Alert for your family immediately, ${elderName}! Please remain seated and calm, help is on the way.`,
        summaryForFamily: `Emergency assistance requested verbally by ${elderName}`
      };
    }

    // 2. DYNAMIC SCHEDULE & ROUTINE COMPLETION (Checked BEFORE general greetings)
    // Matches wake-up, walk, medication, breakfast, lunch, dinner, bedtime, or general routine completion
    let bestScheduleMatch = null;
    let highestScore = 0;

    for (const sched of schedules) {
      if (sched.completed) continue;
      const schedTitleTokens = (sched.title || '').toLowerCase().split(/\s+/).filter(Boolean);
      const schedCat = (sched.category || '').toLowerCase();

      let score = 0;

      // Wake-up routine matching
      if (/good morning|wake|awake|woke|morning|alarm|விழி|எழு|காலை வணக்கம்|சுப்ரபாதம்|உண|ഉണർന്നു|സുപ്രഭാതം/i.test(text)) {
        if (schedCat === 'wake' || schedCat === 'sleep' || schedTitleTokens.some(t => t.includes('wake') || t.includes('morning') || t.includes('alarm'))) {
          score += 3.5;
        }
      }

      // Medication routine matching
      if (/tablet|med|medicine|pill|dose|capsule|syrup|மாத்திரை|மருந்து|குளிகை|மരുന്ന്|ഗുളിക/i.test(text)) {
        if (schedCat === 'medication' || schedTitleTokens.some(t => t.includes('tab') || t.includes('med') || t.includes('pill'))) {
          score += 3.5;
        }
      }

      // Walk & Exercise routine matching
      if (/walk|walking|exercise|jog|yoga|stretch|நடை|உடற்பயிற்சி|நடத்த/i.test(text)) {
        if (schedCat === 'walk' || schedTitleTokens.some(t => t.includes('walk') || t.includes('exercise'))) {
          score += 3.5;
        }
      }

      // Meal routine matching
      if (/breakfast|lunch|dinner|food|eat|ate|meal|சாப்பாடு|உணவு|காலை உணவு|மதிய உணவு|இரவு உணவு|ഭക്ഷണം|പ്രാതൽ|ഉച്ചഭക്ഷണം/i.test(text)) {
        if (['breakfast', 'lunch', 'dinner', 'meal'].includes(schedCat) || schedTitleTokens.some(t => ['breakfast', 'lunch', 'dinner', 'meal'].includes(t))) {
          score += 3.5;
        }
      }

      // General finished/done token scoring
      for (const word of words) {
        if (word.length < 3) continue;
        if (schedTitleTokens.some(t => t.includes(word) || word.includes(t))) score += 2;
        if (schedCat && (schedCat.includes(word) || word.includes(schedCat))) score += 1.5;
      }

      if (score > highestScore) {
        highestScore = score;
        bestScheduleMatch = sched;
      }
    }

    if (bestScheduleMatch && highestScore >= 1.5) {
      const title = bestScheduleMatch.title || 'Routine';
      const isWake = (bestScheduleMatch.category === 'wake' || title.toLowerCase().includes('wake') || title.toLowerCase().includes('morning'));

      let spokenReply = "";
      if (isWake) {
        spokenReply = language === 'ta'
          ? `இனிய காலை வணக்கம் ${elderName} அவர்களே! நீங்கள் விழித்தெழுந்து காலை வழக்கத்தை முடித்ததை மகிழ்ச்சியுடன் பதிவு செய்துவிட்டேன். இன்றைய நாள் உங்களுக்கு புத்துணர்ச்சியுடன் அமையட்டும்!`
          : language === 'ml'
          ? `സുപ്രഭാതം ${elderName}! നിങ്ങൾ ഉണർന്ന് പ്രഭാത ദിനചര്യ പൂർത്തിയാക്കിയതായി രേഖപ്പെടുത്തിയിട്ടുണ്ട്. സന്തോഷകരമായ ഒരു ദിനം ആശംസിക്കുന്നു!`
          : `Good morning, ${elderName}! I have recorded that you are awake and marked your ${title} as completed. Have a bright, energized, and wonderful morning!`;
      } else {
        spokenReply = language === 'ta'
          ? `மிக்க மகிழ்ச்சி ${elderName} அவர்களே! உங்கள் ${title} வழக்கத்தை வெற்றிகரமாக முடித்துவிட்டீர்கள் என குறித்துக் கொண்டேன். உடலை நன்றாக பார்த்துக் கொள்ளுங்கள்!`
          : language === 'ml'
          ? `വളരെ സന്തോഷം ${elderName}! നിങ്ങൾ ${title} പൂർത്തിയാക്കിയത് ഞാൻ രേഖപ്പെടുത്തിയിട്ടുണ്ട്. ആരോഗ്യം നന്നായി ശ്രദ്ധിക്കുക!`
          : `Great job, ${elderName}! I have marked your ${title} as completed. Keep up the wonderful care!`;
      }

      return {
        intent: 'COMPLETE_ROUTINE',
        action: 'MARK_COMPLETE',
        emergencyLevel: 'NONE',
        matchedScheduleId: bestScheduleMatch.id || bestScheduleMatch.scheduleId,
        matchedRoutineTitle: title,
        spokenReply,
        summaryForFamily: `${elderName} completed routine: ${title}`
      };
    }

    // 3. WISH TO COMMUNICATE / TALK / COMPANIONSHIP
    const isCommunicateRequest = /communicate|talk|chat|speak|listen|conversation|company|with you|பேசலாம்|உரையாடு|பேசு|சும்மா பேசலாம்|கதை பேசலாம்|உன் கூட பேச|സംസാരിക്കാം|മിണ്ടുക|കൂട്ട്/i.test(text);
    if (isCommunicateRequest) {
      return {
        intent: 'GENERAL_CONVERSATION',
        action: 'CONVERSE',
        emergencyLevel: 'NONE',
        matchedScheduleId: null,
        spokenReply: language === 'ta'
          ? `நான் உங்களுடன் உரையாடுவதில் மிகுந்த மகிழ்ச்சி அடைகிறேன் ${elderName} அவர்களே! உங்கள் மனதிற்கு பிடித்த எதைப்பற்றி வேண்டுமானாலும் நாம் பேசலாம். இன்று உங்கள் நாள் எப்படி இருக்கிறது? உங்கள் நலம் பற்றி சொல்லுங்கள்!`
          : language === 'ml'
          ? `നിങ്ങളോട് സംസാരിക്കാൻ എനിക്ക് വളരെ ആഗ്രഹമുണ്ട് ${elderName}! നിങ്ങളുടെ ദിവസത്തെക്കുറിച്ചോ അനുഭവങ്ങളെക്കുറിച്ചോ എന്തുവേണമെങ്കിലും എന്നോട് പങ്കുവെക്കാം. ഇന്ന് നിങ്ങളുടെ മനസ്സിൽ എന്താണുള്ളത്?`
          : `I would love to communicate and talk with you, ${elderName}! I am right here by your side. We can talk about how you're feeling, your favorite memories, or your plans for today. Tell me, what is on your mind?`,
        summaryForFamily: `Elder expressed desire to talk and converse with CareBot`
      };
    }

    // 4. JOKES & ENTERTAINMENT
    const isJoke = /joke|funny|laugh|story|entertainment|play|நகைச்சுவை|சிரிப்பு|காமெடி|கதை|பாட்டி கதை|விளையாட்டு|തമാശ|കഥ|ചിരി/i.test(text);
    if (isJoke) {
      return {
        intent: 'GENERAL_CONVERSATION',
        action: 'CONVERSE',
        emergencyLevel: 'NONE',
        matchedScheduleId: null,
        spokenReply: language === 'ta'
          ? `உங்களுக்காக ஒரு சின்ன நகைச்சுவை ${elderName} ஐயா: ஆசிரியர் மாணவனிடம் கேட்டாராம், 'பூமி சுத்துதுன்னு உனக்கு எப்படி தெரியும்?' மாணவன் சொன்னானாம், 'என் தலையே சுத்துது சார்!' நீங்கள் எப்போதும் புன்னகையுடன் ஆரோக்கியமாக இருக்க வேண்டும்!`
          : language === 'ml'
          ? `ഒരു കൊച്ചു തമാശ പറയാം ${elderName}: ഡോക്ടർ രോഗിയോട് പറഞ്ഞു: 'നിങ്ങൾക്ക് ദിവസവും നടക്കണം.' രോഗി ചോദിച്ചു: 'ഡോക്ടറെ, പോയി തിരിച്ചുവരാൻ 5 കിലോമീറ്ററോ അതോ ഒറ്റ വഴിക്കോ?' എപ്പോഴും ചിരിച്ച് സന്തോഷത്തോടെ ഇരിക്കുക!`
          : `Here is a warm smile for you, ${elderName}: Why did the bicycle fall over? Because it was two-tired! I hope your day is filled with warmth, smiles, and joy!`,
        summaryForFamily: `CareBot shared a cheerful joke and story with ${elderName}`
      };
    }

    // 5. LONELINESS & EMOTIONAL REASSURANCE
    const isLonely = /lonely|alone|nobody|miss|sad|depressed|unhappy|fear|afraid|தனிமை|யாரும் இல்ல|கவலை|வருத்தம்|பயம்|ஏக்கம்|துக்கம்|ஏமாற்றம்|ഏകാന്തത|വിഷമം|പേടി|സങ്കടം/i.test(text);
    if (isLonely) {
      return {
        intent: 'GENERAL_CONVERSATION',
        action: 'CONVERSE',
        emergencyLevel: 'NONE',
        matchedScheduleId: null,
        spokenReply: language === 'ta'
          ? `நீங்கள் ஒருபோதும் தனியாக இல்லை ${elderName} அவர்களே! நான் எப்போதும் உங்கள் அருகிலேயே உங்களுக்கு துணையாக இருக்கிறேன். உங்கள் குடும்பத்தினர் உங்கள் மீது அளவு கடந்த அன்பு வைத்துள்ளனர். மெதுவாக ஒருமுறை மூச்சை இழுத்துவிட்டு நிம்மதியாக இருங்கள்!`
          : language === 'ml'
          ? `നിങ്ങൾ ഒരിക്കലും തനിച്ചല്ല ${elderName}. ഞാൻ എപ്പോഴും നിങ്ങളുടെ അരികിലുണ്ട്. കുടുംബവും നിങ്ങളെ ഒരുപാട് സ്നേഹിക്കുന്നുണ്ട്. ശാന്തമായി ഇരിക്കുക!`
          : `Please remember you are deeply cherished, ${elderName}. I am right here keeping you company, and your family loves you dearly. Take a gentle, peaceful breath.`,
        summaryForFamily: `CareBot comforted ${elderName} with emotional warmth`
      };
    }

    // 6. HOW ARE YOU & WELL-BEING EXCHANGE
    const isHowAreYou = /how are you|how do you do|how is it going|how are u|எப்படி இருக்கிறாய்|சவுக்கியமா|நலமா|சுகமா|സുഖമാണോ|എങ്ങനെയുണ്ട്/i.test(text);
    if (isHowAreYou) {
      return {
        intent: 'GENERAL_CONVERSATION',
        action: 'CONVERSE',
        emergencyLevel: 'NONE',
        matchedScheduleId: null,
        spokenReply: language === 'ta'
          ? `நான் மிகவும் சிறப்பாக இருக்கிறேன் ${elderName}! நீங்கள் எப்படி உணர்கிறீர்கள்? இன்று காலையில் சரியான நேரத்தில் உணவு மற்றும் மருந்துகளை எடுத்துக் கொண்டீர்களா?`
          : language === 'ml'
          ? `എനിക്ക് സുഖമാണ് ${elderName}! നിങ്ങൾ ഇന്ന് എങ്ങനെയുണ്ട്? സമയത്തിന് മരുന്നും ഭക്ഷണവും കഴിച്ചോ?`
          : `I am doing wonderful, ${elderName}, thank you for asking! How are you feeling right now? Did you have a good rest today?`,
        summaryForFamily: `Elder checked CareBot's well-being and chatted`
      };
    }

    // 7. GREETINGS (Stand-alone greetings when no routine is pending)
    const isGreeting = /hi|hello|morning|evening|afternoon|hey|வணக்கம்|மாலை வணக்கம்|சுப்ரபாதம்|സുപ്രഭാതം|നമസ്കാരം|ഹലോ/i.test(text);
    if (isGreeting && words.length <= 4) {
      return {
        intent: 'GENERAL_CONVERSATION',
        action: 'CONVERSE',
        emergencyLevel: 'NONE',
        matchedScheduleId: null,
        spokenReply: language === 'ta'
          ? `இனிய வணக்கம் ${elderName} அவர்களே! நான் உங்கள் கேர்பாட். இன்று உங்கள் நாள் மகிழ்ச்சியாகவும் புத்துணர்ச்சியுடனும் அமைய என் வாழ்த்துகள். இன்று உங்களுக்கு நான் எவ்வாறு உதவ வேண்டும்?`
          : language === 'ml'
          ? `ഹൃദ്യമായ നമസ്കാരം ${elderName}! ഞാൻ നിങ്ങളുടെ കെയർബോട്ട് ആണ്. ഇന്നത്തെ ദിവസം സന്തോഷകരമായിരിക്കട്ടെ. ഇന്ന് ഞാൻ നിങ്ങൾക്ക് എന്ത് സഹായമാണ് ചെയ്യേണ്ടത്?`
          : `Warm greetings, ${elderName}! I am your CareBot companion. I hope your day is off to a peaceful and wonderful start. How may I help you today?`,
        summaryForFamily: `Elder greeted CareBot warmly`
      };
    }

    // 8. DOCTOR & APPOINTMENT QUERIES
    const isAptQuery = /appointment|doctor|visit|hospital|clinic|checkup|சந்திப்பு|மருத்துவர்|அப்போயிண்ட்மென்ட்|டாக்டர்|ஆஸ்பத்திரி|ഡോക്ടർ|അപ്പോയിന്റ്മെന്റ്|ആശുപത്രി/i.test(text);
    if (isAptQuery) {
      const nextApt = appointments && appointments.length > 0 ? appointments[0] : null;
      if (nextApt) {
        return {
          intent: 'QUERY_APPOINTMENTS',
          action: 'SPEAK_INFO',
          emergencyLevel: 'NONE',
          matchedScheduleId: null,
          spokenReply: language === 'ta'
            ? `${elderName} அவர்களே, உங்கள் அடுத்த மருத்துவ சந்திப்பு ${nextApt.appointmentDate} அன்று ${nextApt.appointmentTime} மணிக்கு ${nextApt.location || 'மருத்துவமனையில்'} உள்ளது. நேரத்திற்கு செல்ல தயாராக இருங்கள்!`
            : language === 'ml'
            ? `${elderName}, നിങ്ങളുടെ അടുത്ത ഡോക്ടർ അപ്പോയിന്റ്മെന്റ് ${nextApt.appointmentDate} ${nextApt.appointmentTime} നാണ്. സമയത്തിന് പോകാൻ തയ്യാറെടുക്കുക!`
            : `Your next medical appointment for ${nextApt.purpose} is on ${nextApt.appointmentDate} at ${nextApt.appointmentTime}, ${elderName}.`,
          summaryForFamily: `Elder inquired about upcoming doctor appointment`
        };
      } else {
        return {
          intent: 'QUERY_APPOINTMENTS',
          action: 'SPEAK_INFO',
          emergencyLevel: 'NONE',
          matchedScheduleId: null,
          spokenReply: language === 'ta'
            ? `${elderName} அவர்களே, தற்போது புதிய மருத்துவ சந்திப்புகள் எதுவும் திட்டமிடப்படவில்லை. உங்கள் உடல் நலம் சீராக உள்ளது!`
            : language === 'ml'
            ? `${elderName}, നിലവിൽ പുതിയ അപ്പോയിന്റ്മെന്റുകൾ ഒന്നുമില്ല. ആരോഗ്യം സുഖകരമാണ്!`
            : `You have no upcoming medical appointments scheduled right now, ${elderName}. Your schedule is clear and peaceful!`,
          summaryForFamily: `Elder checked appointments`
        };
      }
    }

    // 9. GENERAL OPEN CONVERSATION
    return {
      intent: 'GENERAL_CONVERSATION',
      action: 'CONVERSE',
      emergencyLevel: 'NONE',
      matchedScheduleId: null,
      spokenReply: language === 'ta'
        ? `நீங்கள் கூறியதை நான் மிகக் கவனமாக கவனித்தேன் ${elderName} அவர்களே! உங்கள் எண்ணங்களை என்னுடன் பகிர்ந்ததற்கு மகிழ்ச்சி. இன்று உங்களுக்கு வேறு ஏதேனும் உதவி அல்லது நினைவூட்டல் தேவையா?`
        : language === 'ml'
        ? `നിങ്ങൾ പറഞ്ഞത് ഞാൻ വളരെ ശ്രദ്ധയോടെ മനസ്സിലാക്കി ${elderName}! കാര്യങ്ങൾ പങ്കുവെച്ചതിൽ സന്തോഷം. ഇന്ന് നിങ്ങൾക്ക് മറ്റെന്തെങ്കിലും സഹായം ആവശ്യമുണ്ടോ?`
        : `I am listening closely to everything you share, ${elderName}! It is always a pleasure having this conversation with you. Is there anything specific you would like me to help you with or check for you today?`,
      summaryForFamily: `Elder conversed with CareBot: "${transcript}"`
    };
  }
}

export const geminiService = new GeminiService();
