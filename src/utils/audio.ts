/**
 * Web Audio API based Android Notification Sound Synthesizer
 * Plays high-quality resonant Android-style chimes and voice alerts.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Android Notification Chime (Harmonious two-tone alert for order approval)
 */
export function playOrderApprovedSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // First tone (G5 - 784 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(783.99, now);
    osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.15); // Ramp to A5

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.4, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.4);

    // Second tone (C6 - 1046.5 Hz) - Happy arrival chord
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1046.5, now + 0.18);
    osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.45); // E6

    gain2.gain.setValueAtTime(0, now + 0.18);
    gain2.gain.linearRampToValueAtTime(0.5, now + 0.22);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.18);
    osc2.stop(now + 0.9);

    // Subtle vibration haptic if supported on Android
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 150]);
    }

    // Optional Speech Synthesis announcement in Arabic
    if ('speechSynthesis' in window) {
      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance('تمت الموافقة على طلبك من قِبل الفني');
          utterance.lang = 'ar-SA';
          utterance.rate = 1.05;
          window.speechSynthesis.speak(utterance);
        } catch {
          // Ignore speech synthesis errors if voice is unavailable
        }
      }, 500);
    }
  } catch (err) {
    console.warn('Audio play failed:', err);
  }
}

/**
 * Technician Urgent Alert Chime: Plays when ANY new maintenance order is submitted by a customer.
 * High-pitched crisp dispatcher chime (E5 -> A5 -> E6) + Vibration + Voice notification.
 */
export function playNewOrderIncomingSound(serviceName?: string): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Tone 1 (659.25 Hz - E5)
    const o1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    o1.type = 'triangle';
    o1.frequency.setValueAtTime(659.25, now);
    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(0.45, now + 0.02);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    o1.connect(g1);
    g1.connect(ctx.destination);
    o1.start(now);
    o1.stop(now + 0.25);

    // Tone 2 (880 Hz - A5)
    const o2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(880, now + 0.12);
    g2.gain.setValueAtTime(0, now + 0.12);
    g2.gain.linearRampToValueAtTime(0.5, now + 0.14);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    o2.connect(g2);
    g2.connect(ctx.destination);
    o2.start(now + 0.12);
    o2.stop(now + 0.45);

    // Tone 3 (1318.5 Hz - E6) - Strong arrival ping
    const o3 = ctx.createOscillator();
    const g3 = ctx.createGain();
    o3.type = 'triangle';
    o3.frequency.setValueAtTime(1318.5, now + 0.25);
    o3.frequency.exponentialRampToValueAtTime(1567.98, now + 0.45); // G6 peak
    g3.gain.setValueAtTime(0, now + 0.25);
    g3.gain.linearRampToValueAtTime(0.6, now + 0.28);
    g3.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
    o3.connect(g3);
    g3.connect(ctx.destination);
    o3.start(now + 0.25);
    o3.stop(now + 1.1);

    // Double-pulse vibration for technician phone
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 350]);
    }

    // Voice announcement for technician
    if ('speechSynthesis' in window) {
      setTimeout(() => {
        try {
          const phrase = serviceName 
            ? `تنبيه: طلب صيانة جديد وارد، ${serviceName}`
            : 'تنبيه: طلب صيانة جديد وارد للفني عمر!';
          const utterance = new SpeechSynthesisUtterance(phrase);
          utterance.lang = 'ar-SA';
          utterance.rate = 1.05;
          window.speechSynthesis.speak(utterance);
        } catch {
          // Ignore
        }
      }, 400);
    }
  } catch (err) {
    console.warn('Technician alert audio failed:', err);
  }
}

/**
 * Subtle Message Send / Receive Sound
 */
export function playMessagePing(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch (err) {
    console.warn('Ping audio failed:', err);
  }
}

/**
 * Click / Action subtle feedback
 */
export function playClickSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.05);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  } catch (err) {
    // Ignore
  }
}
