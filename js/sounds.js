class SoundManager {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
  }

  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

 
  playTone(frequency, duration, type = 'sine', volume = 0.3) {
    if (!this.enabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }


  playCorrect() {
    this.playTone(523.25, 0.1, 'sine', 0.3);
    setTimeout(() => this.playTone(659.25, 0.1, 'sine', 0.3), 100); 
    setTimeout(() => this.playTone(783.99, 0.15, 'sine', 0.3), 200);
  }


  playWrong() {
    this.playTone(200, 0.3, 'sawtooth', 0.2);
  }


  playTick() {
    this.playTone(800, 0.05, 'square', 0.1);
  }


  playWarning() {
    this.playTone(600, 0.1, 'square', 0.2);
  }


  playTimeUp() {
    this.playTone(300, 0.2, 'sawtooth', 0.3);
    setTimeout(() => this.playTone(200, 0.3, 'sawtooth', 0.3), 200);
  }


  playComplete() {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.2, 'sine', 0.3), i * 150);
    });
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

export const soundManager = new SoundManager();
