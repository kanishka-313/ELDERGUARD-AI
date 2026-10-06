// Web Speech Synthesis (TTS), Speech Recognition (STT), and Microphone Voice Activity Detector (VAD)

class SpeechService {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.recognition = null;
    this.isListening = false;
    this.isSpeaking = false;
    this.currentUtterance = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.analyser = null;
    this.vadInterval = null;
    this.silenceTimer = null;
    this.ttsTimeout = null;
    this.voices = [];
    this.language = typeof localStorage !== 'undefined' ? (localStorage.getItem('eldercare_language') || 'en') : 'en';

    if (this.synth) {
      this.initVoices();
      if (typeof this.synth.onvoiceschanged !== 'undefined') {
        this.synth.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  initVoices() {
    if (!this.synth) return;
    try {
      this.voices = this.synth.getVoices() || [];
    } catch (e) {
      this.voices = [];
    }
  }

  setLanguage(lang) {
    if (['en', 'ta', 'ml'].includes(lang)) {
      this.language = lang;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('eldercare_language', lang);
      }
    }
  }

  getLanguage() {
    return this.language || 'en';
  }

  isSupported() {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition || navigator.mediaDevices?.getUserMedia);
  }

  getSpeechRecognition() {
    if (typeof window === 'undefined') return null;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = this.language === 'ta' ? 'ta-IN' : this.language === 'ml' ? 'ml-IN' : 'en-US';
      recognition.maxAlternatives = 1;
      return recognition;
    } catch (e) {
      console.warn('Could not instantiate SpeechRecognition:', e);
      return null;
    }
  }

  // Find best available voice for language (Tamil, Malayalam, English)
  getPreferredVoice(targetLang) {
    if (!this.voices || this.voices.length === 0) {
      this.initVoices();
    }
    const voices = this.voices || [];

    if (targetLang === 'ta') {
      // 1. Direct Tamil matches
      const taVoice = voices.find(v => 
        (v.lang && (v.lang.toLowerCase().startsWith('ta') || v.lang.toLowerCase().includes('ta-in') || v.lang.toLowerCase().includes('ta_in'))) ||
        (v.name && (v.name.toLowerCase().includes('tamil') || v.name.toLowerCase().includes('valluvar') || v.name.toLowerCase().includes('latha')))
      );
      if (taVoice) return taVoice;

      // 2. Indian English / Hindi voice fallback if OS lacks local Tamil voice
      return voices.find(v => v.lang && (v.lang.includes('IN') || v.lang.startsWith('hi')));
    }

    if (targetLang === 'ml') {
      // 1. Direct Malayalam matches
      const mlVoice = voices.find(v => 
        (v.lang && (v.lang.toLowerCase().startsWith('ml') || v.lang.toLowerCase().includes('ml-in') || v.lang.toLowerCase().includes('ml_in'))) ||
        (v.name && v.name.toLowerCase().includes('malayalam'))
      );
      if (mlVoice) return mlVoice;

      // 2. Indian regional fallback voice
      return voices.find(v => v.lang && (v.lang.includes('IN') || v.lang.startsWith('hi') || v.lang.startsWith('ta')));
    }

    // English
    return voices.find(v => 
      (v.name && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny') || v.name.includes('Zira') || v.name.includes('English'))) && 
      v.lang && v.lang.startsWith('en')
    ) || voices.find(v => v.lang && v.lang.startsWith('en'));
  }

  // Text-To-Speech with garbage collection prevention & multilingual resilience
  speak(text, { onStart, onEnd, onError } = {}) {
    if (!text || !text.trim()) {
      if (onEnd) onEnd();
      return;
    }

    if (!this.synth) {
      console.warn('Speech synthesis not supported in this browser.');
      if (onEnd) onEnd();
      return;
    }

    try {
      if (this.synth.paused) {
        this.synth.resume();
      }
      this.synth.cancel();
      if (this.ttsTimeout) clearTimeout(this.ttsTimeout);
    } catch (e) {}

    const cleanText = text.trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    this.currentUtterance = utterance;
    if (typeof window !== 'undefined') {
      window.__activeElderUtterance = utterance;
    }

    // Set parameters based on language
    const currentLang = this.language;
    utterance.rate = currentLang === 'en' ? 0.95 : 0.88;
    utterance.pitch = 1.05;
    utterance.volume = 1;

    // Set BCP-47 language tag
    if (currentLang === 'ta') {
      utterance.lang = 'ta-IN';
    } else if (currentLang === 'ml') {
      utterance.lang = 'ml-IN';
    } else {
      utterance.lang = 'en-US';
    }

    const preferredVoice = this.getPreferredVoice(currentLang);
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    let finished = false;
    const finishSpeech = () => {
      if (finished) return;
      finished = true;
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (this.ttsTimeout) clearTimeout(this.ttsTimeout);
      if (onEnd) onEnd();
    };

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (onStart) onStart();
    };

    utterance.onend = () => {
      finishSpeech();
    };

    utterance.onerror = (e) => {
      console.warn('[SpeechService] TTS warning/event:', e.error || e);
      // If language-unavailable, retry once with generic locale
      if (e.error === 'language-unavailable' || e.error === 'voice-unavailable') {
        try {
          const fallbackUtterance = new SpeechSynthesisUtterance(cleanText);
          fallbackUtterance.lang = 'en-US';
          fallbackUtterance.onend = () => finishSpeech();
          fallbackUtterance.onerror = () => finishSpeech();
          this.synth.speak(fallbackUtterance);
          return;
        } catch (fbErr) {}
      }
      if (onError) onError(e);
      finishSpeech();
    };

    // Safety fallback timeout: estimate reading duration
    const wordCount = cleanText.split(/\s+/).length;
    const maxDurationMs = Math.max(4000, Math.min(25000, (wordCount / 2.0) * 1000 + 2500));
    this.ttsTimeout = setTimeout(() => {
      if (this.isSpeaking) {
        finishSpeech();
      }
    }, maxDurationMs);

    setTimeout(() => {
      try {
        if (this.synth.paused) this.synth.resume();
        this.synth.speak(utterance);
      } catch (err) {
        console.warn('Synth speak error:', err);
        finishSpeech();
      }
    }, 20);
  }

  stopSpeaking() {
    if (this.ttsTimeout) clearTimeout(this.ttsTimeout);
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
      this.isSpeaking = false;
      this.currentUtterance = null;
    }
  }

  // Start combined Web Speech Recognition (STT) + Live Microphone Volume (VAD)
  async startListening({ onResult, onPartial, onVolume, onVoiceDetected, onError, onEnd }) {
    this.stopListening();
    this.isListening = true;

    let hasDelivered = false;
    let latestTranscript = '';

    const deliverResult = (transcript) => {
      if (!hasDelivered && transcript) {
        hasDelivered = true;
        this.stopListening();
        if (onResult) onResult(transcript);
      }
    };

    // 1. Start Hardware Microphone Audio Stream for live volume & sound meter
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        this.mediaStream = stream;

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          this.audioContext = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          this.analyser = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          this.vadInterval = setInterval(() => {
            if (!this.isListening || hasDelivered) return;

            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const volumePercent = Math.min(100, Math.round((average / 128) * 100));

            if (onVolume) onVolume(volumePercent);

            if (average > 20) {
              if (onVoiceDetected) {
                onVoiceDetected(average);
              }
            }
          }, 80);
        }
      } catch (micErr) {
        console.warn('[SpeechService] Hardware mic permission or stream error:', micErr);
      }
    }

    // 2. Start Web Speech Recognition with target language (Tamil, Malayalam, English)
    this.recognition = this.getSpeechRecognition();
    if (this.recognition) {
      try {
        this.recognition.onstart = () => {
          this.isListening = true;
        };

        this.recognition.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const item = event.results[i];
            if (item.isFinal) {
              finalTranscript += item[0].transcript;
            } else {
              interimTranscript += item[0].transcript;
            }
          }

          const trimmedFinal = finalTranscript.trim();
          const trimmedInterim = interimTranscript.trim();

          if (trimmedFinal) {
            latestTranscript = trimmedFinal;
            deliverResult(trimmedFinal);
          } else if (trimmedInterim) {
            latestTranscript = trimmedInterim;
            if (onPartial) onPartial(trimmedInterim);

            // Wait for silence pause before delivering partial speech
            if (this.silenceTimer) clearTimeout(this.silenceTimer);
            this.silenceTimer = setTimeout(() => {
              if (latestTranscript && !hasDelivered) {
                deliverResult(latestTranscript);
              }
            }, 1400);
          }
        };

        this.recognition.onerror = (event) => {
          console.warn('[SpeechService] Recognition error:', event.error);
          if (event.error !== 'no-speech') {
            if (onError) onError(event.error);
          }
        };

        this.recognition.onend = () => {
          if (latestTranscript && !hasDelivered) {
            deliverResult(latestTranscript);
          } else if (this.isListening && !hasDelivered) {
            // Auto restart recognition if user is still in listening mode
            try {
              this.recognition?.start();
            } catch (e) {
              this.isListening = false;
              if (onEnd) onEnd();
            }
          } else {
            this.isListening = false;
            if (onEnd) onEnd();
          }
        };

        this.recognition.start();
      } catch (recErr) {
        console.warn('[SpeechService] Recognition start failed:', recErr);
      }
    }

    return true;
  }

  stopListening() {
    this.isListening = false;

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {}
      this.recognition = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach(track => track.stop());
      } catch (e) {}
      this.mediaStream = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {}
      this.audioContext = null;
      this.analyser = null;
    }
  }
}

export const speechService = new SpeechService();
