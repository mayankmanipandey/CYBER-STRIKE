/**
 * ============================================================================
 * CYBER STRIKE // DUAL ARENA - HYBRID AUDIO SYNTHESIZER & URL AUDIO MANAGER
 * Provides 100% standalone procedural Web Audio sound synthesis +
 * dynamic user audio URL overrides for custom weapon sounds, music & SFX.
 * ============================================================================
 */

class TacticalAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    this.sfxGain = null;
    this.uiGain = null;
    this.musicGain = null;

    // Volume levels (0.0 to 1.0)
    this.volumes = {
      master: 0.8,
      sfx: 0.85,
      ui: 0.7,
      music: 0.5
    };

    // User-provided audio URL overrides
    this.customUrls = {
      weapon_revolver: '',
      weapon_rifle: '',
      weapon_shotgun: '',
      weapon_railgun: '',
      weapon_smg: '',
      reload: '',
      dash: '',
      slide: '',
      hit: '',
      headshot: '',
      kill: '',
      victory: '',
      defeat: '',
      bgm: ''
    };

    // Cached HTML5 Audio elements for user URLs
    this.audioCache = {};
    this.bgmAudio = null;
    this.isBgmPlaying = false;

    // Load saved custom audio links from localStorage if available
    this.loadSettings();
  }

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();

        // Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volumes.master, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        // SFX Gain
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.volumes.sfx, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);

        // UI Gain
        this.uiGain = this.ctx.createGain();
        this.uiGain.gain.setValueAtTime(this.volumes.ui, this.ctx.currentTime);
        this.uiGain.connect(this.masterGain);

        // Music Gain
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(this.volumes.music, this.ctx.currentTime);
        this.musicGain.connect(this.masterGain);
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('cyber_fps_audio_urls');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.customUrls = { ...this.customUrls, ...parsed };
      }
      const savedVols = localStorage.getItem('cyber_fps_audio_vols');
      if (savedVols) {
        const vols = JSON.parse(savedVols);
        this.volumes = { ...this.volumes, ...vols };
      }
    } catch(e) {}
  }

  saveSettings() {
    try {
      localStorage.setItem('cyber_fps_audio_urls', JSON.stringify(this.customUrls));
      localStorage.setItem('cyber_fps_audio_vols', JSON.stringify(this.volumes));
    } catch(e) {}
  }

  setVolume(channel, value) {
    this.init();
    const clamped = Math.max(0, Math.min(1, parseFloat(value)));
    this.volumes[channel] = clamped;
    this.saveSettings();

    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (channel === 'master' && this.masterGain) this.masterGain.gain.setValueAtTime(clamped, t);
    if (channel === 'sfx' && this.sfxGain) this.sfxGain.gain.setValueAtTime(clamped, t);
    if (channel === 'ui' && this.uiGain) this.uiGain.gain.setValueAtTime(clamped, t);
    if (channel === 'music' && this.musicGain) {
      this.musicGain.gain.setValueAtTime(clamped, t);
      if (this.bgmAudio) this.bgmAudio.volume = clamped * this.volumes.master;
    }
  }

  setCustomUrl(key, url) {
    if (this.customUrls.hasOwnProperty(key)) {
      this.customUrls[key] = (url || '').trim();
      delete this.audioCache[key]; // clear cached element
      this.saveSettings();
    }
  }

  // Play custom audio if provided; fallback to callback synthesizer
  playWithFallback(key, fallbackSynthFn, gainNode = null) {
    this.init();
    if (this.isMuted) return;

    const customUrl = this.customUrls[key];
    if (customUrl) {
      try {
        let sound = this.audioCache[key];
        if (!sound || sound.src !== customUrl) {
          sound = new Audio(customUrl);
          this.audioCache[key] = sound;
        }
        sound.volume = (this.volumes.sfx || 0.8) * (this.volumes.master || 0.8);
        sound.currentTime = 0;
        const playPromise = sound.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // If user link fails (e.g. 404 or CORS), use procedural synth
            fallbackSynthFn();
          });
        }
        return;
      } catch(e) {
        fallbackSynthFn();
        return;
      }
    }

    // Default: High-fidelity procedural synth
    fallbackSynthFn();
  }

  // --------------------------------------------------------------------------
  // PROCEDURAL WEAPON SOUND SYNTHESIZERS
  // --------------------------------------------------------------------------

  // 1. Revolver (Plasma Hawk)
  playWeaponRevolver() {
    this.playWithFallback('weapon_revolver', () => {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;

      // Heavy Laser Zap
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(950, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.14);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(4000, t);
      filter.frequency.exponentialRampToValueAtTime(250, t + 0.14);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.16);

      // Sub-Bass Shockwave
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(190, t);
      sub.frequency.exponentialRampToValueAtTime(30, t + 0.12);

      subGain.gain.setValueAtTime(0.48, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

      sub.connect(subGain);
      subGain.connect(this.sfxGain);
      sub.start(t);
      sub.stop(t + 0.14);
    });
  }

  // 2. Pulse Carbine ARC-4 (Assault Rifle)
  playWeaponRifle() {
    this.playWithFallback('weapon_rifle', () => {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;

      // High kinetic snap
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.exponentialRampToValueAtTime(240, t + 0.07);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.09);

      // Noise punch
      const bufferSize = this.ctx.sampleRate * 0.06;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.32, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      noise.connect(nGain);
      nGain.connect(this.sfxGain);
      noise.start(t);
    });
  }

  // 3. Scatter Shotgun (Vortex Breaker)
  playWeaponShotgun() {
    this.playWithFallback('weapon_shotgun', () => {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;

      // Heavy bass blast
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.22);

      gain.gain.setValueAtTime(0.55, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.25);

      // Wide explosive noise spread
      const bufferSize = this.ctx.sampleRate * 0.18;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, t);
      filter.frequency.exponentialRampToValueAtTime(300, t + 0.18);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.48, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.19);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.sfxGain);
      noise.start(t);
    });
  }

  // 4. Spectre Rail (Railgun Sniper)
  playWeaponRailgun() {
    this.playWithFallback('weapon_railgun', () => {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;

      // Charged high-frequency beam
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.28);

      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.32);

      // Resonant electric crack
      const dist = this.ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = (Math.PI + 35) * x / (Math.PI + 35 * Math.abs(x));
      }
      dist.curve = curve;

      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sawtooth';
      sub.frequency.setValueAtTime(520, t);
      sub.frequency.exponentialRampToValueAtTime(40, t + 0.35);

      subGain.gain.setValueAtTime(0.4, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      sub.connect(dist);
      dist.connect(subGain);
      subGain.connect(this.sfxGain);
      sub.start(t);
      sub.stop(t + 0.36);
    });
  }

  // 5. Viper-9 (Plasma SMG)
  playWeaponSMG() {
    this.playWithFallback('weapon_smg', () => {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(820, t);
      osc.frequency.exponentialRampToValueAtTime(190, t + 0.05);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.07);
    });
  }

  // --------------------------------------------------------------------------
  // TACTICAL MOVEMENT & COMBAT SOUNDS
  // --------------------------------------------------------------------------

  playDash() {
    this.playWithFallback('dash', () => {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(840, t + 0.16);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  playSlide() {
    this.playWithFallback('slide', () => {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.25;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, t);
      filter.frequency.exponentialRampToValueAtTime(400, t + 0.24);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      noise.start(t);
    });
  }

  playJump() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.12);
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  playReload() {
    this.playWithFallback('reload', () => {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;
      // Mechanical click 1
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(550, t);
      osc1.frequency.exponentialRampToValueAtTime(900, t + 0.08);
      gain1.gain.setValueAtTime(0.2, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc1.connect(gain1);
      gain1.connect(this.sfxGain);
      osc1.start(t);
      osc1.stop(t + 0.1);

      // Power chamber slide lock (after 0.3s)
      setTimeout(() => {
        if (!this.ctx) return;
        const t2 = this.ctx.currentTime;
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(320, t2);
        osc2.frequency.exponentialRampToValueAtTime(1100, t2 + 0.12);
        gain2.gain.setValueAtTime(0.3, t2);
        gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.14);
        osc2.connect(gain2);
        gain2.connect(this.sfxGain);
        osc2.start(t2);
        osc2.stop(t2 + 0.15);
      }, 300);
    });
  }

  playHit(isHeadshot = false) {
    const key = isHeadshot ? 'headshot' : 'hit';
    this.playWithFallback(key, () => {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = isHeadshot ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(isHeadshot ? 1760 : 880, t);
      osc.frequency.exponentialRampToValueAtTime(isHeadshot ? 2200 : 440, t + 0.08);
      gain.gain.setValueAtTime(isHeadshot ? 0.45 : 0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.1);
    });
  }

  playElimination() {
    this.playWithFallback('kill', () => {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;
      // Dual high-tech harmonic chord
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.05);
        gain.gain.setValueAtTime(0.2, t + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t + idx * 0.05);
        osc.stop(t + 0.4);
      });
    });
  }

  playBootChord() {
    this.init();
    if (!this.ctx || !this.uiGain) return;
    const t = this.ctx.currentTime;
    [220, 329.63, 440, 659.25, 880].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 0.7, t);
      osc.frequency.exponentialRampToValueAtTime(freq, t + 0.4);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      osc.connect(gain);
      gain.connect(this.uiGain);
      osc.start(t);
      osc.stop(t + 1.3);
    });
  }

  playUIClick() {
    this.init();
    if (!this.ctx || !this.uiGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.04);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain);
    gain.connect(this.uiGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  playUIHover() {
    this.init();
    if (!this.ctx || !this.uiGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.03);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    osc.connect(gain);
    gain.connect(this.uiGain);
    osc.start(t);
    osc.stop(t + 0.04);
  }
}

// Global instance export
window.TacticalAudio = new TacticalAudioEngine();
