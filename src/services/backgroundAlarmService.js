/**
 * Background Alarm & Notification Service
 * Ensures voice alarms and routine reminders ring reliably even when
 * the elder or user is outside the app, minimized, or on another browser tab.
 */

class BackgroundAlarmService {
  constructor() {
    this.worker = null;
    this.titleFlashInterval = null;
    this.originalTitle = typeof document !== 'undefined' ? document.title : 'ElderGuard AI';
    this.activeNotification = null;
    this.listeners = new Set();
    this.initTimerWorker();
    this.initNotificationPermission();
  }

  // Create an unthrottled background timer worker via inline Blob
  initTimerWorker() {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;

    try {
      const workerBlob = new Blob([
        `
        let timer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (timer) clearInterval(timer);
            timer = setInterval(function() {
              self.postMessage('tick');
            }, 1000);
          } else if (e.data === 'stop') {
            if (timer) clearInterval(timer);
            timer = null;
          }
        };
        `
      ], { type: 'application/javascript' });

      const blobUrl = URL.createObjectURL(workerBlob);
      this.worker = new Worker(blobUrl);

      this.worker.onmessage = (e) => {
        if (e.data === 'tick') {
          this.listeners.forEach((callback) => {
            try {
              callback(new Date());
            } catch (err) {
              console.warn('[BackgroundAlarmService] Listener error:', err);
            }
          });
        }
      };

      this.worker.postMessage('start');
    } catch (e) {
      console.warn('[BackgroundAlarmService] Web Worker fallback to setInterval:', e);
      setInterval(() => {
        this.listeners.forEach((cb) => cb(new Date()));
      }, 1000);
    }
  }

  // Subscribe a callback to the unthrottled 1-second background clock
  onTick(callback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Check and request Native OS Desktop Notification permission
  async initNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'default') {
      try {
        const result = await Notification.requestPermission();
        return result === 'granted';
      } catch (e) {
        return false;
      }
    }

    return false;
  }

  getNotificationPermissionStatus() {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission; // 'granted' | 'denied' | 'default'
  }

  // Show a native OS desktop notification with voice message that stays on screen
  showDesktopNotification({ title, body, icon = '🔔', tag = 'eldercare-routine-alarm', onDismiss, onClick }) {
    if (typeof window === 'undefined' || !('Notification' in window)) return null;

    try {
      if (Notification.permission === 'granted') {
        // Close previous active notification if any
        if (this.activeNotification) {
          try { this.activeNotification.close(); } catch (e) {}
        }

        const notif = new Notification(title || 'ElderGuard Voice Alarm', {
          body: body || 'Time for your scheduled routine! Click to view and confirm.',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: tag,
          requireInteraction: true, // Remains on screen until user interacts with it
          silent: false,
          vibrate: [200, 100, 200, 100, 200]
        });

        notif.onclick = () => {
          window.focus();
          if (onClick) onClick();
          try { notif.close(); } catch (e) {}
        };

        notif.onclose = () => {
          if (onDismiss) onDismiss();
        };

        this.activeNotification = notif;
        return notif;
      } else if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch (e) {
      console.warn('[BackgroundAlarmService] Desktop notification error:', e);
    }

    return null;
  }

  // Flash the document title in browser tab bar to capture immediate visual attention
  startTitleFlash(alarmTitle) {
    if (typeof document === 'undefined') return;
    this.stopTitleFlash();
    this.originalTitle = document.title || 'ElderGuard AI';

    let isFlashing = false;
    this.titleFlashInterval = setInterval(() => {
      isFlashing = !isFlashing;
      document.title = isFlashing 
        ? `🚨 ALARM: ${alarmTitle || 'Routine Reminder'}! ⏰` 
        : `🔔 PLEASE CONFIRM: ${this.originalTitle}`;
    }, 800);
  }

  stopTitleFlash() {
    if (this.titleFlashInterval) {
      clearInterval(this.titleFlashInterval);
      this.titleFlashInterval = null;
    }
    if (typeof document !== 'undefined' && this.originalTitle) {
      document.title = this.originalTitle;
    }
  }

  // Dismiss any active desktop notification
  dismissNotification() {
    if (this.activeNotification) {
      try {
        this.activeNotification.close();
      } catch (e) {}
      this.activeNotification = null;
    }
    this.stopTitleFlash();
  }
}

export const backgroundAlarmService = new BackgroundAlarmService();
