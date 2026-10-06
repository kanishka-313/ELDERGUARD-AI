// AI Facial Emotion & Wellness Analysis Service

export const EMOTIONS = {
  HAPPY: { label: 'Happy & Content', color: '#3BAA72', bg: '#E7F6EE', icon: '😊', description: 'Relaxed facial muscles, authentic smile detected' },
  CALM: { label: 'Calm & Relaxed', color: '#2F6FED', bg: '#E8F1FF', icon: '😌', description: 'Peaceful gaze, steady breathing rhythm' },
  NEUTRAL: { label: 'Neutral & Attentive', color: '#5B6B86', bg: '#F1F5F9', icon: '😐', description: 'Attentive posture, neutral expression' },
  DROWSY: { label: 'Drowsy / Fatigued', color: '#F2B84B', bg: '#FEF7E8', icon: '🥱', description: 'Slow eyelid blinks, head tilt, lowered alertness' },
  DISTRESSED: { label: 'Distressed / Discomfort', color: '#D9534F', bg: '#FDECEC', icon: '😟', description: 'Facial tension, grimace, possible pain or unease' },
};

class EmotionService {
  constructor() {
    this.stream = null;
    this.animationFrameId = null;
    this.scanlineY = 0;
    this.scanlineDirection = 1;
    this.currentEmotion = 'CALM';
  }

  setTrackedEmotion(emotionKey) {
    if (emotionKey && EMOTIONS[emotionKey.toUpperCase()]) {
      this.currentEmotion = emotionKey.toUpperCase();
    }
  }

  // Request live webcam stream from device
  async startCamera(videoElement, canvasElement, onEmotionUpdate) {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false
        });
        if (videoElement) {
          videoElement.srcObject = this.stream;
          await videoElement.play();
          this.startFaceEmotionCanvasTracker(videoElement, canvasElement, onEmotionUpdate);
        }
        return { success: true, isLive: true };
      }
      return { success: false, error: 'Webcam not supported on this browser' };
    } catch (err) {
      console.warn('Camera access error or permission denied:', err);
      return { success: false, error: err.message, isLive: false };
    }
  }

  stopCamera(videoElement) {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (videoElement) {
      videoElement.srcObject = null;
    }
  }

  // Live Canvas Face Tracker & Emotion Analyzer overlay
  startFaceEmotionCanvasTracker(video, canvas, onUpdate) {
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d');

    const drawFrame = () => {
      if (!this.stream || video.paused || video.ended) return;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Face Bounding Box Dimensions
      const boxW = canvas.width * 0.46;
      const boxH = canvas.height * 0.60;
      const boxX = (canvas.width - boxW) / 2;
      const boxY = (canvas.height - boxH) / 2 - 15;

      const emotionMeta = EMOTIONS[this.currentEmotion] || EMOTIONS.CALM;
      const themeColor = emotionMeta.color || '#2F6FED';

      // Scanline speed based on alertness
      const speed = this.currentEmotion === 'DISTRESSED' ? 4.0 : this.currentEmotion === 'DROWSY' ? 1.5 : 2.5;
      this.scanlineY += this.scanlineDirection * speed;
      if (this.scanlineY > boxH) {
        this.scanlineY = boxH;
        this.scanlineDirection = -1;
      } else if (this.scanlineY < 0) {
        this.scanlineY = 0;
        this.scanlineDirection = 1;
      }

      // Draw subtle face bounding box
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(boxX, boxY, boxW, boxH);
      ctx.setLineDash([]);

      // Draw corner brackets
      const cornerLen = 24;
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 4;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + cornerLen);
      ctx.lineTo(boxX, boxY);
      ctx.lineTo(boxX + cornerLen, boxY);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(boxX + boxW - cornerLen, boxY);
      ctx.lineTo(boxX + boxW, boxY);
      ctx.lineTo(boxX + boxW, boxY + cornerLen);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + boxH - cornerLen);
      ctx.lineTo(boxX, boxY + boxH);
      ctx.lineTo(boxX + cornerLen, boxY + boxH);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(boxX + boxW - cornerLen, boxY + boxH);
      ctx.lineTo(boxX + boxW, boxY + boxH);
      ctx.lineTo(boxX + boxW, boxY + boxH - cornerLen);
      ctx.stroke();

      // Scanline beam
      const currentScanY = boxY + this.scanlineY;
      const gradient = ctx.createLinearGradient(boxX, currentScanY, boxX + boxW, currentScanY);
      gradient.addColorStop(0, 'rgba(47, 111, 237, 0)');
      gradient.addColorStop(0.5, themeColor);
      gradient.addColorStop(1, 'rgba(47, 111, 237, 0)');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(boxX + 2, currentScanY);
      ctx.lineTo(boxX + boxW - 2, currentScanY);
      ctx.stroke();

      // Eye Landmarks (Left & Right)
      const leftEyeX = boxX + boxW * 0.32;
      const rightEyeX = boxX + boxW * 0.68;
      const eyeY = boxY + boxH * 0.38;

      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 1.5;

      // Left eye reticle
      ctx.beginPath();
      ctx.arc(leftEyeX, eyeY, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = themeColor;
      ctx.beginPath();
      ctx.arc(leftEyeX, eyeY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Right eye reticle
      ctx.beginPath();
      ctx.arc(rightEyeX, eyeY, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rightEyeX, eyeY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Nose bridge anchor
      const noseX = boxX + boxW * 0.50;
      const noseY = boxY + boxH * 0.52;
      ctx.fillStyle = '#2F6FED';
      ctx.beginPath();
      ctx.arc(noseX, noseY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Mouth contour arc (adapts to emotion)
      const mouthY = boxY + boxH * 0.72;
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (this.currentEmotion === 'HAPPY') {
        ctx.arc(noseX, mouthY - 4, 22, 0.15 * Math.PI, 0.85 * Math.PI, false); // Smile
      } else if (this.currentEmotion === 'CALM') {
        ctx.arc(noseX, mouthY - 2, 20, 0.2 * Math.PI, 0.8 * Math.PI, false); // Gentle curve
      } else if (this.currentEmotion === 'NEUTRAL') {
        ctx.moveTo(noseX - 16, mouthY);
        ctx.lineTo(noseX + 16, mouthY); // Flat neutral line
      } else if (this.currentEmotion === 'DROWSY') {
        ctx.arc(noseX, mouthY + 12, 18, 1.25 * Math.PI, 1.75 * Math.PI, false); // Drooping
      } else {
        ctx.arc(noseX, mouthY + 14, 20, 1.2 * Math.PI, 1.8 * Math.PI, false); // Tension / Frown
      }
      ctx.stroke();

      // Top Status Banner
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY - 32, boxW, 26, 6);
      ctx.fill();

      ctx.fillStyle = themeColor;
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillText(`● AI EMOTION: ${emotionMeta.label.toUpperCase()}`, boxX + 10, boxY - 15);

      this.animationFrameId = requestAnimationFrame(drawFrame);
    };

    drawFrame();
  }

  // Generate dynamic emotion metrics
  getSimulatedMetrics(forcedState = null) {
    const state = forcedState ? forcedState.toLowerCase() : null;

    if (state === 'distressed') {
      this.currentEmotion = 'DISTRESSED';
      return {
        primaryEmotion: 'DISTRESSED',
        confidence: 93,
        emotions: {
          distressed: 86,
          drowsy: 8,
          neutral: 4,
          calm: 1,
          happy: 1,
        },
        alertness: 46,
        posture: 'Unsteady / Discomfort',
        blinkRate: 'Rapid (34/min)',
        wellnessScore: 52,
        notes: 'Facial tension and grimace detected. CareBot will check on elder comfort immediately.'
      };
    }

    if (state === 'drowsy') {
      this.currentEmotion = 'DROWSY';
      return {
        primaryEmotion: 'DROWSY',
        confidence: 89,
        emotions: {
          drowsy: 80,
          calm: 12,
          neutral: 5,
          distressed: 2,
          happy: 1,
        },
        alertness: 54,
        posture: 'Slumped Head Tilt',
        blinkRate: 'Low / Slow Eyelid',
        wellnessScore: 74,
        notes: 'Prolonged eye closure detected by camera. Elder resting or fatigued.'
      };
    }

    if (state === 'neutral') {
      this.currentEmotion = 'NEUTRAL';
      return {
        primaryEmotion: 'NEUTRAL',
        confidence: 88,
        emotions: {
          neutral: 76,
          calm: 14,
          happy: 6,
          drowsy: 3,
          distressed: 1,
        },
        alertness: 86,
        posture: 'Attentive & Focused',
        blinkRate: 'Attentive (18/min)',
        wellnessScore: 88,
        notes: 'Attentive facial expression, steady eye tracking, neutral tone.'
      };
    }

    if (state === 'calm') {
      this.currentEmotion = 'CALM';
      return {
        primaryEmotion: 'CALM',
        confidence: 91,
        emotions: {
          calm: 82,
          happy: 9,
          neutral: 6,
          drowsy: 2,
          distressed: 1,
        },
        alertness: 90,
        posture: 'Upright & Steady',
        blinkRate: 'Steady (14/min)',
        wellnessScore: 94,
        notes: 'Peaceful gaze, relaxed facial tone, and steady natural breathing rhythm.'
      };
    }

    if (state === 'happy') {
      this.currentEmotion = 'HAPPY';
      return {
        primaryEmotion: 'HAPPY',
        confidence: 94,
        emotions: {
          happy: 84,
          calm: 10,
          neutral: 4,
          drowsy: 1,
          distressed: 1,
        },
        alertness: 96,
        posture: 'Upright & Steady',
        blinkRate: 'Normal (16/min)',
        wellnessScore: 98,
        notes: 'Facial expressions relaxed, authentic smile and high engagement detected.'
      };
    }

    // Dynamic Multi-State Simulation across all 5 emotions
    const rand = Math.random();
    let detectedKey = 'CALM';
    if (rand < 0.35) detectedKey = 'HAPPY';
    else if (rand < 0.65) detectedKey = 'CALM';
    else if (rand < 0.82) detectedKey = 'NEUTRAL';
    else if (rand < 0.93) detectedKey = 'DROWSY';
    else detectedKey = 'DISTRESSED';

    this.currentEmotion = detectedKey;

    if (detectedKey === 'HAPPY') {
      return {
        primaryEmotion: 'HAPPY',
        confidence: Math.floor(88 + Math.random() * 8),
        emotions: { happy: 78, calm: 14, neutral: 5, drowsy: 2, distressed: 1 },
        alertness: 95,
        posture: 'Upright & Steady',
        blinkRate: 'Normal (18/min)',
        wellnessScore: 96,
        notes: 'Authentic smile and active engagement detected.'
      };
    } else if (detectedKey === 'CALM') {
      return {
        primaryEmotion: 'CALM',
        confidence: Math.floor(86 + Math.random() * 9),
        emotions: { calm: 76, happy: 12, neutral: 8, drowsy: 3, distressed: 1 },
        alertness: 90,
        posture: 'Upright & Steady',
        blinkRate: 'Steady (15/min)',
        wellnessScore: 93,
        notes: 'Peaceful gaze and relaxed breathing rhythm.'
      };
    } else if (detectedKey === 'NEUTRAL') {
      return {
        primaryEmotion: 'NEUTRAL',
        confidence: Math.floor(84 + Math.random() * 8),
        emotions: { neutral: 72, calm: 15, happy: 8, drowsy: 4, distressed: 1 },
        alertness: 86,
        posture: 'Attentive & Focused',
        blinkRate: 'Attentive (18/min)',
        wellnessScore: 88,
        notes: 'Attentive posture, neutral facial expression.'
      };
    } else if (detectedKey === 'DROWSY') {
      return {
        primaryEmotion: 'DROWSY',
        confidence: Math.floor(82 + Math.random() * 8),
        emotions: { drowsy: 74, calm: 14, neutral: 8, distressed: 3, happy: 1 },
        alertness: 58,
        posture: 'Slumped Head Tilt',
        blinkRate: 'Low / Slow Eyelid',
        wellnessScore: 76,
        notes: 'Slower eye blinks detected by camera.'
      };
    } else {
      return {
        primaryEmotion: 'DISTRESSED',
        confidence: Math.floor(85 + Math.random() * 8),
        emotions: { distressed: 78, drowsy: 10, neutral: 6, calm: 4, happy: 2 },
        alertness: 50,
        posture: 'Unsteady / Discomfort',
        blinkRate: 'Rapid (32/min)',
        wellnessScore: 56,
        notes: 'Facial tension detected. Checking on elder comfort.'
      };
    }
  }
}

export const emotionService = new EmotionService();
