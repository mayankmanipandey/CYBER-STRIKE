/**
 * ============================================================================
 * CYBER STRIKE // DUAL ARENA - 5-WEAPON ARSENAL & PROCEDURAL 3D RIG SYSTEM
 * Provides 5 distinct sci-fi firearms with procedural Three.js viewmodels,
 * unique ballistics, ammo management, ADS sniper zoom, recoil, and reload.
 * ============================================================================
 */

class WeaponSystem {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;

    // Viewmodel root attached to camera
    this.viewmodelHolder = new THREE.Group();
    this.camera.add(this.viewmodelHolder);

    // Rest position relative to camera
    this.REST_POS = new THREE.Vector3(0.55, -0.42, -1.05);
    this.ADS_POS = new THREE.Vector3(0.0, -0.28, -0.75);
    this.viewmodelHolder.position.copy(this.REST_POS);

    // Shared Materials
    this.materials = {
      darkGun: new THREE.MeshStandardMaterial({ color: 0x121724, metalness: 0.92, roughness: 0.25 }),
      midGun: new THREE.MeshStandardMaterial({ color: 0x1e2738, metalness: 0.85, roughness: 0.2 }),
      goldAccent: new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.95, roughness: 0.15 }),
      cyanGlow: new THREE.MeshBasicMaterial({ color: 0x00f3ff }),
      magentaGlow: new THREE.MeshBasicMaterial({ color: 0xff0055 }),
      yellowGlow: new THREE.MeshBasicMaterial({ color: 0xffe600 }),
      greenGlow: new THREE.MeshBasicMaterial({ color: 0x00ff66 }),
      purpleGlow: new THREE.MeshBasicMaterial({ color: 0xb537f2 })
    };

    // Weapon Definitions
    this.weaponDefs = {
      revolver: {
        id: 'revolver',
        name: 'PLASMA HAWK',
        category: 'HEAVY HAND CANNON',
        ammoType: 'CYLINDER CELLS',
        maxAmmo: 6,
        reserveAmmo: 36,
        damage: 46,
        headshotMult: 2.2,
        fireRate: 0.42, // seconds between shots
        reloadTime: 1.1,
        recoilKick: 0.18,
        recoilRise: 0.15,
        tracerColor: 0x00f3ff,
        tracerWidth: 2.5,
        muzzleColor: 0x00f3ff,
        isAutomatic: false,
        supportsADS: false,
        soundMethod: 'playWeaponRevolver'
      },
      rifle: {
        id: 'rifle',
        name: 'ARC-4 PULSE',
        category: 'TACTICAL CARBINE',
        ammoType: 'ARC CORES',
        maxAmmo: 30,
        reserveAmmo: 120,
        damage: 23,
        headshotMult: 1.8,
        fireRate: 0.11, // rapid auto
        reloadTime: 1.4,
        recoilKick: 0.08,
        recoilRise: 0.06,
        tracerColor: 0xff0055,
        tracerWidth: 1.8,
        muzzleColor: 0xff0055,
        isAutomatic: true,
        supportsADS: true,
        adsZoomFOV: 55,
        soundMethod: 'playWeaponRifle'
      },
      shotgun: {
        id: 'shotgun',
        name: 'VORTEX BREAKER',
        category: 'SCATTER SHOTGUN',
        ammoType: 'FLUX SLUGS',
        maxAmmo: 8,
        reserveAmmo: 32,
        damage: 13, // per pellet (x8 pellets = 104)
        pelletCount: 8,
        spread: 0.045,
        headshotMult: 1.5,
        fireRate: 0.72,
        reloadTime: 1.6,
        recoilKick: 0.28,
        recoilRise: 0.22,
        tracerColor: 0xffe600,
        tracerWidth: 2.0,
        muzzleColor: 0xffaa00,
        isAutomatic: false,
        supportsADS: false,
        soundMethod: 'playWeaponShotgun'
      },
      railgun: {
        id: 'railgun',
        name: 'SPECTRE RAIL',
        category: 'HYPER-VELOCITY SNIPER',
        ammoType: 'HV BATTERIES',
        maxAmmo: 5,
        reserveAmmo: 20,
        damage: 95,
        headshotMult: 2.5, // 237 headshot!
        fireRate: 0.95,
        reloadTime: 1.8,
        recoilKick: 0.32,
        recoilRise: 0.25,
        tracerColor: 0x00ffff,
        tracerWidth: 4.0,
        muzzleColor: 0x88ffff,
        isAutomatic: false,
        supportsADS: true,
        isSniperScope: true,
        adsZoomFOV: 28, // High-zoom sniper
        soundMethod: 'playWeaponRailgun'
      },
      smg: {
        id: 'smg',
        name: 'VIPER-9',
        category: 'SUBMACHINE GUN',
        ammoType: 'MICRO DARTS',
        maxAmmo: 45,
        reserveAmmo: 180,
        damage: 15,
        headshotMult: 1.6,
        fireRate: 0.075, // Ultra fast
        reloadTime: 1.2,
        recoilKick: 0.05,
        recoilRise: 0.04,
        tracerColor: 0x00ff66,
        tracerWidth: 1.5,
        muzzleColor: 0x00ff66,
        isAutomatic: true,
        supportsADS: true,
        adsZoomFOV: 60,
        soundMethod: 'playWeaponSMG'
      }
    };

    // Runtime state for each weapon
    this.weaponStates = {};
    Object.keys(this.weaponDefs).forEach(id => {
      const def = this.weaponDefs[id];
      this.weaponStates[id] = {
        ammo: def.maxAmmo,
        reserve: def.reserveAmmo,
        meshGroup: null,
        muzzleOffset: new THREE.Vector3(0, 0.05, -1.2),
        animatedParts: {}
      };
    });

    this.currentWeaponId = 'revolver';
    this.isReloading = false;
    this.reloadTimer = 0;
    this.fireCooldown = 0;
    this.isADS = false;

    // Viewmodel animation timers & recoil
    this.recoilKick = 0;
    this.recoilRise = 0;
    this.equipAnimProgress = 1.0;
    this.muzzleFlashTimer = 0;

    // Lights & Flash Meshes
    this.muzzleLight = new THREE.PointLight(0x00f3ff, 0, 18);
    this.viewmodelHolder.add(this.muzzleLight);

    const flashGeo = new THREE.PlaneGeometry(0.55, 0.55);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    this.muzzleFlashMesh = new THREE.Mesh(flashGeo, flashMat);
    this.viewmodelHolder.add(this.muzzleFlashMesh);

    // Build procedural 3D meshes for all 5 weapons
    this.buildAllWeaponMeshes();
    this.switchWeapon('revolver');
  }

  // --------------------------------------------------------------------------
  // PROCEDURAL 3D WEAPON MESH GENERATION
  // --------------------------------------------------------------------------

  buildAllWeaponMeshes() {
    // 1. REVOLVER
    const revGroup = new THREE.Group();
    // Frame & Grip
    const revFrame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.26, 0.85), this.materials.darkGun);
    revFrame.position.set(0, -0.05, -0.15);
    revGroup.add(revFrame);
    const revGrip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.22), this.materials.darkGun);
    revGrip.position.set(0, -0.32, 0.15);
    revGrip.rotation.x = 0.35;
    revGroup.add(revGrip);
    // Barrel
    const revBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.9, 8), this.materials.darkGun);
    revBarrel.rotation.x = Math.PI / 2;
    revBarrel.position.set(0, 0.05, -0.65);
    revGroup.add(revBarrel);
    // Cylinder
    const revCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.38, 8), this.materials.midGun);
    revCylinder.rotation.x = Math.PI / 2;
    revCylinder.position.set(0, 0.04, -0.12);
    revGroup.add(revCylinder);
    // 6 Glow Rods in Cylinder
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 6), this.materials.cyanGlow);
      cell.rotation.x = Math.PI / 2;
      cell.position.set(Math.cos(a) * 0.08, 0.04 + Math.sin(a) * 0.08, -0.12);
      revGroup.add(cell);
    }
    // Neon Top Rail
    const revRail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.8), this.materials.cyanGlow);
    revRail.position.set(0, 0.14, -0.45);
    revGroup.add(revRail);

    this.weaponStates.revolver.meshGroup = revGroup;
    this.weaponStates.revolver.animatedParts.cylinder = revCylinder;
    this.weaponStates.revolver.muzzleOffset.set(0, 0.05, -1.15);
    this.viewmodelHolder.add(revGroup);

    // 2. RIFLE (ARC-4 Pulse)
    const rifleGroup = new THREE.Group();
    const rfUpper = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 1.4), this.materials.darkGun);
    rfUpper.position.set(0, 0.02, -0.5);
    rifleGroup.add(rfUpper);
    const rfStock = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.45), this.materials.midGun);
    rfStock.position.set(0, -0.06, 0.35);
    rifleGroup.add(rfStock);
    const rfGrip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.18), this.materials.darkGun);
    rfGrip.position.set(0, -0.32, 0.05);
    rfGrip.rotation.x = 0.3;
    rifleGroup.add(rfGrip);
    // Curved Mag
    const rfMag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.2), this.materials.midGun);
    rfMag.position.set(0, -0.3, -0.35);
    rfMag.rotation.x = -0.25;
    rifleGroup.add(rfMag);
    // Holographic Sight Frame
    const rfSight = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.28), this.materials.darkGun);
    rfSight.position.set(0, 0.18, -0.25);
    rifleGroup.add(rfSight);
    const rfReticle = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.035, 16), this.materials.magentaGlow);
    rfReticle.position.set(0, 0.18, -0.35);
    rifleGroup.add(rfReticle);
    // Shrouded Barrel with Vents
    const rfBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 8), this.materials.darkGun);
    rfBarrel.rotation.x = Math.PI / 2;
    rfBarrel.position.set(0, 0.02, -1.3);
    rifleGroup.add(rfBarrel);
    // Neon Trim Strips
    const rfGlowL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 1.1), this.materials.magentaGlow);
    rfGlowL.position.set(-0.1, 0.06, -0.5);
    rifleGroup.add(rfGlowL);
    const rfGlowR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 1.1), this.materials.magentaGlow);
    rfGlowR.position.set(0.1, 0.06, -0.5);
    rifleGroup.add(rfGlowR);

    this.weaponStates.rifle.meshGroup = rifleGroup;
    this.weaponStates.rifle.animatedParts.mag = rfMag;
    this.weaponStates.rifle.muzzleOffset.set(0, 0.02, -1.65);
    this.viewmodelHolder.add(rifleGroup);

    // 3. SHOTGUN (Vortex Breaker)
    const sgGroup = new THREE.Group();
    const sgReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 1.1), this.materials.darkGun);
    sgReceiver.position.set(0, 0, -0.4);
    sgGroup.add(sgReceiver);
    // Dual Heavy Barrels
    const sgB1 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 10), this.materials.midGun);
    sgB1.rotation.x = Math.PI / 2;
    sgB1.position.set(-0.06, 0.06, -1.1);
    sgGroup.add(sgB1);
    const sgB2 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 10), this.materials.midGun);
    sgB2.rotation.x = Math.PI / 2;
    sgB2.position.set(0.06, 0.06, -1.1);
    sgGroup.add(sgB2);
    // Pump-action Slide
    const sgPump = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.45, 8), this.materials.darkGun);
    sgPump.rotation.x = Math.PI / 2;
    sgPump.position.set(0, -0.06, -0.9);
    sgGroup.add(sgPump);
    // Stock & Grip
    const sgGrip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.22), this.materials.darkGun);
    sgGrip.position.set(0, -0.3, 0.1);
    sgGrip.rotation.x = 0.35;
    sgGroup.add(sgGrip);
    // Yellow Energy Conduit
    const sgConduit = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 8, 16), this.materials.yellowGlow);
    sgConduit.position.set(0, 0.06, -0.4);
    sgGroup.add(sgConduit);

    this.weaponStates.shotgun.meshGroup = sgGroup;
    this.weaponStates.shotgun.animatedParts.pump = sgPump;
    this.weaponStates.shotgun.muzzleOffset.set(0, 0.06, -1.65);
    this.viewmodelHolder.add(sgGroup);

    // 4. RAILGUN (Spectre Rail)
    const rgGroup = new THREE.Group();
    const rgChassis = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, 1.8), this.materials.darkGun);
    rgChassis.position.set(0, 0.02, -0.7);
    rgGroup.add(rgChassis);
    // Twin Parallel Electromagnetic Rails
    const rgRailTop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 1.6), this.materials.midGun);
    rgRailTop.position.set(0, 0.16, -1.0);
    rgGroup.add(rgRailTop);
    const rgRailBot = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 1.6), this.materials.midGun);
    rgRailBot.position.set(0, -0.08, -1.0);
    rgGroup.add(rgRailBot);
    // Central Plasma Core Beam Channel
    const rgCore = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.5, 8), this.materials.cyanGlow);
    rgCore.rotation.x = Math.PI / 2;
    rgCore.position.set(0, 0.04, -1.0);
    rgGroup.add(rgCore);
    // High-Tech Sniper Scope Tube
    const rgScope = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.65, 12), this.materials.darkGun);
    rgScope.rotation.x = Math.PI / 2;
    rgScope.position.set(0, 0.25, -0.4);
    rgGroup.add(rgScope);
    const rgLens = new THREE.Mesh(new THREE.CircleGeometry(0.075, 16), this.materials.cyanGlow);
    rgLens.position.set(0, 0.25, -0.07);
    rgGroup.add(rgLens);
    // Grip & Power Battery Pack
    const rgGrip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.2), this.materials.darkGun);
    rgGrip.position.set(0, -0.32, 0.1);
    rgGrip.rotation.x = 0.3;
    rgGroup.add(rgGrip);
    const rgBattery = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.25, 0.3), this.materials.cyanGlow);
    rgBattery.position.set(0, -0.15, -0.1);
    rgGroup.add(rgBattery);

    this.weaponStates.railgun.meshGroup = rgGroup;
    this.weaponStates.railgun.animatedParts.core = rgCore;
    this.weaponStates.railgun.muzzleOffset.set(0, 0.04, -1.9);
    this.viewmodelHolder.add(rgGroup);

    // 5. SMG (Viper-9)
    const smgGroup = new THREE.Group();
    const smgBody = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.8), this.materials.darkGun);
    smgBody.position.set(0, 0, -0.3);
    smgGroup.add(smgBody);
    // Extended Drum Mag
    const smgDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.14, 12), this.materials.midGun);
    smgDrum.rotation.z = Math.PI / 2;
    smgDrum.position.set(0, -0.22, -0.2);
    smgGroup.add(smgDrum);
    const smgGrip = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.38, 0.16), this.materials.darkGun);
    smgGrip.position.set(0, -0.28, 0.1);
    smgGrip.rotation.x = 0.3;
    smgGroup.add(smgGrip);
    const smgForegrip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 0.12), this.materials.darkGun);
    smgForegrip.position.set(0, -0.2, -0.55);
    smgGroup.add(smgForegrip);
    const smgBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.35, 8), this.materials.midGun);
    smgBarrel.rotation.x = Math.PI / 2;
    smgBarrel.position.set(0, 0.02, -0.85);
    smgGroup.add(smgBarrel);
    // Green Accent Lines
    const smgGlow = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.6), this.materials.greenGlow);
    smgGlow.position.set(0, 0.12, -0.3);
    smgGroup.add(smgGlow);

    this.weaponStates.smg.meshGroup = smgGroup;
    this.weaponStates.smg.animatedParts.drum = smgDrum;
    this.weaponStates.smg.muzzleOffset.set(0, 0.02, -1.05);
    this.viewmodelHolder.add(smgGroup);
  }

  // --------------------------------------------------------------------------
  // WEAPON MANAGEMENT & CONTROLS
  // --------------------------------------------------------------------------

  switchWeapon(weaponId) {
    if (!this.weaponDefs[weaponId] || (this.currentWeaponId === weaponId && !this.isReloading)) return;
    this.currentWeaponId = weaponId;
    this.isReloading = false;
    this.isADS = false;
    this.equipAnimProgress = 0.0; // trigger equip pop animation

    // Show only the selected weapon mesh
    Object.keys(this.weaponStates).forEach(id => {
      const w = this.weaponStates[id];
      if (w.meshGroup) {
        w.meshGroup.visible = (id === weaponId);
      }
    });

    // Update muzzle flash and light settings
    const def = this.weaponDefs[weaponId];
    this.muzzleLight.color.setHex(def.muzzleColor);
    this.muzzleFlashMesh.material.color.setHex(def.muzzleColor);

    // Update scope UI
    const scopeOverlay = document.getElementById('sniper-scope-overlay');
    if (scopeOverlay) scopeOverlay.style.display = 'none';

    // Play equip click
    if (window.TacticalAudio) window.TacticalAudio.playUIClick();

    this.updateHUD();
  }

  nextWeapon() {
    const ids = Object.keys(this.weaponDefs);
    const idx = ids.indexOf(this.currentWeaponId);
    const nextIdx = (idx + 1) % ids.length;
    this.switchWeapon(ids[nextIdx]);
  }

  prevWeapon() {
    const ids = Object.keys(this.weaponDefs);
    const idx = ids.indexOf(this.currentWeaponId);
    const prevIdx = (idx - 1 + ids.length) % ids.length;
    this.switchWeapon(ids[prevIdx]);
  }

  canFire() {
    if (this.isReloading || this.fireCooldown > 0) return false;
    const state = this.weaponStates[this.currentWeaponId];
    return state.ammo > 0;
  }

  fire(hitscanCallback) {
    if (this.isReloading) return false;
    const def = this.weaponDefs[this.currentWeaponId];
    const state = this.weaponStates[this.currentWeaponId];

    if (state.ammo <= 0) {
      this.reload();
      return false;
    }

    state.ammo--;
    this.fireCooldown = def.fireRate;
    this.recoilKick = def.recoilKick;
    this.recoilRise = def.recoilRise;
    this.muzzleFlashTimer = 0.06;

    // Trigger procedural / custom sound
    if (window.TacticalAudio && typeof window.TacticalAudio[def.soundMethod] === 'function') {
      window.TacticalAudio[def.soundMethod]();
    }

    // Weapon-specific mechanical animation
    if (this.currentWeaponId === 'revolver' && state.animatedParts.cylinder) {
      state.animatedParts.cylinder.rotation.z += Math.PI / 3;
    } else if (this.currentWeaponId === 'shotgun' && state.animatedParts.pump) {
      state.animatedParts.pump.position.z = -0.7; // pumped back
      setTimeout(() => { if (state.animatedParts.pump) state.animatedParts.pump.position.z = -0.9; }, 180);
    }

    // Execute Hitscan ballistics
    if (typeof hitscanCallback === 'function') {
      hitscanCallback(def, state);
    }

    this.updateHUD();
    return true;
  }

  reload() {
    const def = this.weaponDefs[this.currentWeaponId];
    const state = this.weaponStates[this.currentWeaponId];
    if (this.isReloading || state.ammo === def.maxAmmo || state.reserve <= 0) return;

    this.isReloading = true;
    this.reloadTimer = def.reloadTime;
    if (this.isADS) this.setADS(false);

    if (window.TacticalAudio) window.TacticalAudio.playReload();

    const ammoEl = document.getElementById('hud-ammo');
    if (ammoEl) ammoEl.textContent = '--';
  }

  setADS(enable) {
    const def = this.weaponDefs[this.currentWeaponId];
    if (!def.supportsADS) return;
    this.isADS = enable;

    const scopeOverlay = document.getElementById('sniper-scope-overlay');
    if (scopeOverlay) {
      if (def.isSniperScope && enable) {
        scopeOverlay.style.display = 'flex';
        if (this.weaponStates[this.currentWeaponId].meshGroup) {
          this.weaponStates[this.currentWeaponId].meshGroup.visible = false;
        }
      } else {
        scopeOverlay.style.display = 'none';
        if (this.weaponStates[this.currentWeaponId].meshGroup) {
          this.weaponStates[this.currentWeaponId].meshGroup.visible = true;
        }
      }
    }
  }

  toggleADS() {
    this.setADS(!this.isADS);
  }

  // --------------------------------------------------------------------------
  // PER-FRAME ANIMATION & VIEWMODEL SWAY
  // --------------------------------------------------------------------------

  update(delta, gunSwayX, gunSwayY, bobbingTimer) {
    if (this.fireCooldown > 0) this.fireCooldown -= delta;

    // Reload progression
    if (this.isReloading) {
      this.reloadTimer -= delta;
      if (this.reloadTimer <= 0) {
        const def = this.weaponDefs[this.currentWeaponId];
        const state = this.weaponStates[this.currentWeaponId];
        const needed = def.maxAmmo - state.ammo;
        const toLoad = Math.min(needed, state.reserve);
        state.ammo += toLoad;
        state.reserve -= toLoad;
        this.isReloading = false;
        this.updateHUD();
      }
    }

    // Recoil recovery
    this.recoilKick = Math.max(0, this.recoilKick - 12.0 * delta);
    this.recoilRise = Math.max(0, this.recoilRise - 16.0 * delta);

    // Equip animation pop
    if (this.equipAnimProgress < 1.0) {
      this.equipAnimProgress = Math.min(1.0, this.equipAnimProgress + 5.0 * delta);
    }
    const equipOffset = (1.0 - this.equipAnimProgress) * -0.6;

    // Viewmodel position interpolation (Rest vs ADS)
    const targetBase = this.isADS ? this.ADS_POS : this.REST_POS;
    const bobX = Math.cos(bobbingTimer * 0.5) * (this.isADS ? 0.003 : 0.015);
    const bobY = Math.sin(bobbingTimer) * (this.isADS ? 0.005 : 0.02);

    this.viewmodelHolder.position.set(
      targetBase.x + (this.isADS ? 0 : bobX + gunSwayX),
      targetBase.y + equipOffset + (this.isADS ? 0 : bobY + gunSwayY),
      targetBase.z + this.recoilKick
    );

    const activeGroup = this.weaponStates[this.currentWeaponId].meshGroup;
    if (activeGroup) {
      activeGroup.rotation.x = -this.recoilRise * 1.4;
      activeGroup.rotation.y = gunSwayX * 0.8;
      activeGroup.rotation.z = -gunSwayX * 1.2;
    }

    // Muzzle Flash Decay
    const muzzleOffset = this.weaponStates[this.currentWeaponId].muzzleOffset;
    this.muzzleLight.position.copy(muzzleOffset);
    this.muzzleFlashMesh.position.copy(muzzleOffset);

    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= delta;
      this.muzzleLight.intensity = 24;
      this.muzzleFlashMesh.material.opacity = 0.95;
      this.muzzleFlashMesh.rotation.z = Math.random() * Math.PI * 2;
    } else {
      this.muzzleLight.intensity = 0;
      this.muzzleFlashMesh.material.opacity = 0;
    }
  }

  // --------------------------------------------------------------------------
  // HUD BINDINGS
  // --------------------------------------------------------------------------

  updateHUD() {
    const def = this.weaponDefs[this.currentWeaponId];
    const state = this.weaponStates[this.currentWeaponId];

    const ammoEl = document.getElementById('hud-ammo');
    const reserveEl = document.getElementById('hud-ammo-reserve');
    const weaponNameEl = document.getElementById('hud-weapon-name');
    const ammoTypeEl = document.getElementById('hud-ammo-type');

    if (ammoEl && !this.isReloading) ammoEl.textContent = state.ammo;
    if (reserveEl) reserveEl.textContent = state.reserve;
    if (weaponNameEl) weaponNameEl.textContent = def.name;
    if (ammoTypeEl) ammoTypeEl.textContent = def.ammoType;

    // Update weapon slot indicator highlights (1 to 5)
    ['revolver', 'rifle', 'shotgun', 'railgun', 'smg'].forEach((id, idx) => {
      const slotEl = document.getElementById(`weapon-slot-${idx + 1}`);
      if (slotEl) {
        if (id === this.currentWeaponId) {
          slotEl.className = 'px-2 py-1 bg-cyan-neon/20 border border-cyan-neon text-cyan-neon font-bold text-xs rounded transition-all shadow-[0_0_8px_#00f3ff]';
        } else {
          slotEl.className = 'px-2 py-1 bg-slate-900/60 border border-slate-700/60 text-slate-400 text-xs rounded transition-all hover:border-slate-500';
        }
      }
    });
  }
}

// Global export
window.WeaponSystem = WeaponSystem;
