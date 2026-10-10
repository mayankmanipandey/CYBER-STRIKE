/**
 * ============================================================================
 * CYBER STRIKE // DUAL ARENA - DUAL SETTINGS ARCHITECTURE & STORAGE MANAGER
 * Manages two completely distinct configuration consoles:
 * 1. Global Game Management (System, Graphics, Audio Link Overrides, Keybinds)
 * 2. Match Play Settings (Combat physics, Game rules, Kill limit, Bot difficulty)
 * ============================================================================
 */

class SettingsManager {
  constructor() {
    // 1. Global Game Management Settings
    this.globalSettings = {
      graphics: {
        shadowQuality: 'medium', // off, medium, high
        scanlines: true,
        bloomGlow: true,
        dynamicFOV: true,
        baseFOV: 75,
        targetFPS: 60,
        particleDensity: 'high'
      },
      keybinds: {
        forward: 'KeyW',
        backward: 'KeyS',
        left: 'KeyA',
        right: 'KeyD',
        jump: 'Space',
        dash: 'KeyQ',
        slide: 'KeyC',
        reload: 'KeyR',
        weapon1: 'Digit1',
        weapon2: 'Digit2',
        weapon3: 'Digit3',
        weapon4: 'Digit4',
        weapon5: 'Digit5'
      }
    };

    // 2. Match Play Settings
    this.playSettings = {
      gameMode: 'duel', // duel, frags10, frags20, timeAttack
      fragLimit: 10,
      timeLimitMinutes: 5,
      speedMultiplier: 1.0, // 1.0 to 1.5
      gravityScale: 1.0, // 0.6 (low-g) to 1.0
      dashCooldown: 1.5,
      infiniteAmmo: false,
      healthRegen: 'normal', // off, slow, normal, fast
      botDifficulty: 'medium' // easy, medium, hard, demon
    };

    // Operative Customization State
    this.operativeProfile = {
      name: 'CYBER_VIPER',
      skin: 'neon', // neon, shadow, arctic, solar, toxic
      armorStyle: 'assault', // recon, assault, heavy
      visorColor: '#00f3ff',
      weaponCamo: 'default'
    };

    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const savedGlobal = localStorage.getItem('cyber_fps_global_settings');
      if (savedGlobal) this.globalSettings = JSON.parse(savedGlobal);

      const savedPlay = localStorage.getItem('cyber_fps_play_settings');
      if (savedPlay) this.playSettings = JSON.parse(savedPlay);

      const savedProfile = localStorage.getItem('cyber_fps_profile');
      if (savedProfile) this.operativeProfile = JSON.parse(savedProfile);
    } catch(e) {}
  }

  saveToStorage() {
    try {
      localStorage.setItem('cyber_fps_global_settings', JSON.stringify(this.globalSettings));
      localStorage.setItem('cyber_fps_play_settings', JSON.stringify(this.playSettings));
      localStorage.setItem('cyber_fps_profile', JSON.stringify(this.operativeProfile));
    } catch(e) {}
  }

  // Bind settings UI modals to data
  initUIBindings() {
    this.populateGlobalSettingsUI();
    this.populatePlaySettingsUI();
  }

  populateGlobalSettingsUI() {
    // Scanlines toggle
    const scanlineToggle = document.getElementById('setting-scanlines');
    if (scanlineToggle) {
      scanlineToggle.checked = this.globalSettings.graphics.scanlines;
      scanlineToggle.onchange = (e) => {
        this.globalSettings.graphics.scanlines = e.target.checked;
        const scanlineEl = document.querySelector('.scanlines');
        if (scanlineEl) scanlineEl.style.display = e.target.checked ? 'block' : 'none';
        this.saveToStorage();
      };
    }

    // Shadow quality
    const shadowSelect = document.getElementById('setting-shadows');
    if (shadowSelect) {
      shadowSelect.value = this.globalSettings.graphics.shadowQuality;
      shadowSelect.onchange = (e) => {
        this.globalSettings.graphics.shadowQuality = e.target.value;
        this.saveToStorage();
      };
    }

    // FOV Slider
    const fovSlider = document.getElementById('setting-fov');
    const fovValEl = document.getElementById('setting-fov-val');
    if (fovSlider && fovValEl) {
      fovSlider.value = this.globalSettings.graphics.baseFOV;
      fovValEl.textContent = this.globalSettings.graphics.baseFOV + '°';
      fovSlider.oninput = (e) => {
        const val = parseInt(e.target.value, 10);
        this.globalSettings.graphics.baseFOV = val;
        fovValEl.textContent = val + '°';
        if (window.camera) {
          window.camera.fov = val;
          window.camera.updateProjectionMatrix();
        }
        this.saveToStorage();
      };
    }

    // Audio Sliders
    ['master', 'sfx', 'ui', 'music'].forEach(channel => {
      const slider = document.getElementById(`setting-vol-${channel}`);
      if (slider && window.TacticalAudio) {
        slider.value = window.TacticalAudio.volumes[channel] * 100;
        slider.oninput = (e) => {
          const v = parseFloat(e.target.value) / 100;
          window.TacticalAudio.setVolume(channel, v);
        };
      }
    });

    // Custom Audio Link Inputs
    const audioUrlKeys = [
      'weapon_revolver', 'weapon_rifle', 'weapon_shotgun', 'weapon_railgun', 'weapon_smg',
      'reload', 'dash', 'hit', 'kill', 'bgm'
    ];
    audioUrlKeys.forEach(k => {
      const input = document.getElementById(`audio-url-${k}`);
      if (input && window.TacticalAudio) {
        input.value = window.TacticalAudio.customUrls[k] || '';
        input.onchange = (e) => {
          window.TacticalAudio.setCustomUrl(k, e.target.value);
        };
      }
      const testBtn = document.getElementById(`btn-test-audio-${k}`);
      if (testBtn && window.TacticalAudio) {
        testBtn.onclick = () => {
          if (k.startsWith('weapon_')) {
            const m = k.replace('weapon_', '');
            if (m === 'revolver') window.TacticalAudio.playWeaponRevolver();
            else if (m === 'rifle') window.TacticalAudio.playWeaponRifle();
            else if (m === 'shotgun') window.TacticalAudio.playWeaponShotgun();
            else if (m === 'railgun') window.TacticalAudio.playWeaponRailgun();
            else if (m === 'smg') window.TacticalAudio.playWeaponSMG();
          } else if (k === 'reload') window.TacticalAudio.playReload();
          else if (k === 'dash') window.TacticalAudio.playDash();
          else if (k === 'hit') window.TacticalAudio.playHit();
          else if (k === 'kill') window.TacticalAudio.playElimination();
        };
      }
    });
  }

  populatePlaySettingsUI() {
    // Mode Select
    const modeSelect = document.getElementById('play-setting-mode');
    if (modeSelect) {
      modeSelect.value = this.playSettings.gameMode;
      modeSelect.onchange = (e) => {
        this.playSettings.gameMode = e.target.value;
        this.saveToStorage();
      };
    }

    // Kill Limit
    const killSelect = document.getElementById('play-setting-kills');
    if (killSelect) {
      killSelect.value = this.playSettings.fragLimit;
      killSelect.onchange = (e) => {
        this.playSettings.fragLimit = parseInt(e.target.value, 10);
        this.saveToStorage();
      };
    }

    // Speed Multiplier
    const speedSelect = document.getElementById('play-setting-speed');
    if (speedSelect) {
      speedSelect.value = this.playSettings.speedMultiplier;
      speedSelect.onchange = (e) => {
        this.playSettings.speedMultiplier = parseFloat(e.target.value);
        this.saveToStorage();
      };
    }

    // Gravity (Earth vs Low-G)
    const gravSelect = document.getElementById('play-setting-gravity');
    if (gravSelect) {
      gravSelect.value = this.playSettings.gravityScale;
      gravSelect.onchange = (e) => {
        this.playSettings.gravityScale = parseFloat(e.target.value);
        this.saveToStorage();
      };
    }

    // Infinite Ammo
    const infAmmoToggle = document.getElementById('play-setting-infammo');
    if (infAmmoToggle) {
      infAmmoToggle.checked = this.playSettings.infiniteAmmo;
      infAmmoToggle.onchange = (e) => {
        this.playSettings.infiniteAmmo = e.target.checked;
        this.saveToStorage();
      };
    }

    // Bot Difficulty
    const botSelect = document.getElementById('play-setting-bot');
    if (botSelect) {
      botSelect.value = this.playSettings.botDifficulty;
      botSelect.onchange = (e) => {
        this.playSettings.botDifficulty = e.target.value;
        if (window.botAI) window.botAI.difficulty = e.target.value;
        this.saveToStorage();
      };
    }
  }

  // Profile Reset with Accidental Data Loss Prevention Confirmation
  confirmResetProfile(onConfirmed) {
    const modal = document.getElementById('modal-reset-confirm');
    if (modal) {
      modal.classList.add('active');
      const confirmBtn = document.getElementById('btn-confirm-reset');
      const cancelBtn = document.getElementById('btn-cancel-reset');

      if (confirmBtn) {
        confirmBtn.onclick = () => {
          modal.classList.remove('active');
          localStorage.clear();
          this.loadFromStorage();
          if (onConfirmed) onConfirmed();
        };
      }
      if (cancelBtn) {
        cancelBtn.onclick = () => {
          modal.classList.remove('active');
        };
      }
    }
  }
}

// Global export
window.SettingsManager = new SettingsManager();
