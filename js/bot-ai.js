/**
 * ============================================================================
 * CYBER STRIKE // DUAL ARENA - COMBAT BOT AI & TARGET DRONE ENGINE
 * Provides tactical sparring bots with patrol, strafing, jump pads, and firing,
 * alongside interactive target drones for comprehensive practice mode.
 * ============================================================================
 */

class BotAIEngine {
  constructor(scene, playerRef) {
    this.scene = scene;
    this.player = playerRef;
    this.active = false;
    this.difficulty = 'medium'; // easy, medium, hard, demon

    this.bot = {
      position: new THREE.Vector3(0, 3, -30),
      velocity: new THREE.Vector3(0, 0, 0),
      health: 100,
      maxHealth: 100,
      frags: 0,
      state: 'patrol', // patrol, chase, strafe
      strafeTimer: 0,
      strafeDir: 1,
      fireTimer: 0,
      jumpTimer: 0,
      meshGroup: null,
      billboard: null
    };

    // Target Drones pool
    this.drones = [];

    this.buildBotMesh();
    this.buildPracticeDrones();
  }

  buildBotMesh() {
    this.bot.meshGroup = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.8 });
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.25, metalness: 0.85 });
    const visorMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.7), bodyMat);
    torso.position.set(0, 1.9, 0);
    this.bot.meshGroup.add(torso);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.9, 0.75), armorMat);
    chest.position.set(0, 2.05, 0.05);
    this.bot.meshGroup.add(chest);

    // Head & Crimson Visor
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.7, 0.65), bodyMat);
    head.position.set(0, 2.95, 0);
    this.bot.meshGroup.add(head);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.4), visorMat);
    visor.position.set(0, 3.02, 0.2);
    this.bot.meshGroup.add(visor);

    // Limbs
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.3, 0.35), armorMat);
    leftArm.position.set(-0.85, 1.85, 0);
    this.bot.meshGroup.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.3, 0.35), armorMat);
    rightArm.position.set(0.85, 1.85, 0);
    this.bot.meshGroup.add(rightArm);

    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.5, 0.45), bodyMat);
    leftLeg.position.set(-0.35, 0.75, 0);
    this.bot.meshGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.5, 0.45), bodyMat);
    rightLeg.position.set(0.35, 0.75, 0);
    this.bot.meshGroup.add(rightLeg);

    // Weapon
    const botGun = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.9), armorMat);
    botGun.position.set(0.85, 1.4, -0.45);
    this.bot.meshGroup.add(botGun);

    // Floating Billboard Name & HP
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    this.nametagCanvas = canvas;
    this.nametagTexture = new THREE.CanvasTexture(canvas);

    const billboard = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 0.7),
      new THREE.MeshBasicMaterial({ map: this.nametagTexture, transparent: true })
    );
    billboard.position.set(0, 4.0, 0);
    this.bot.meshGroup.add(billboard);
    this.bot.billboard = billboard;

    this.updateBotNametag();

    this.bot.meshGroup.traverse(child => {
      if (child.isMesh) {
        child.userData = { isBot: true, isHead: (child === head || child === visor) };
      }
    });

    this.bot.meshGroup.position.copy(this.bot.position);
    this.scene.add(this.bot.meshGroup);
  }

  updateBotNametag() {
    if (!this.nametagCanvas) return;
    const ctx = this.nametagCanvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);

    ctx.fillStyle = 'rgba(5, 8, 16, 0.85)';
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 2;
    ctx.fillRect(4, 4, 248, 56);
    ctx.strokeRect(4, 4, 248, 56);

    ctx.fillStyle = '#ff0055';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`AI // ${this.difficulty.toUpperCase()}`, 128, 28);

    const hpPercent = Math.max(0, Math.min(1, this.bot.health / 100));
    ctx.fillStyle = 'rgba(255, 0, 85, 0.3)';
    ctx.fillRect(18, 38, 220, 14);
    ctx.fillStyle = '#ff0055';
    ctx.fillRect(18, 38, 220 * hpPercent, 14);

    if (this.nametagTexture) this.nametagTexture.needsUpdate = true;
  }

  buildPracticeDrones() {
    const coords = [
      { x: 18, y: 12, z: -25 },
      { x: -22, y: 14, z: -18 },
      { x: 0, y: 15, z: 30 },
      { x: 30, y: 11, z: 12 },
      { x: -28, y: 13, z: 22 }
    ];

    coords.forEach((c, idx) => {
      const droneMesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.4),
        new THREE.MeshStandardMaterial({
          color: 0xff0055,
          emissive: 0xaa0033,
          emissiveIntensity: 0.9,
          wireframe: true
        })
      );
      droneMesh.position.set(c.x, c.y, c.z);
      droneMesh.castShadow = true;
      droneMesh.userData = {
        isDrone: true,
        health: 3,
        maxHealth: 3,
        id: idx,
        initialY: c.y,
        speed: 0.8 + idx * 0.3
      };
      this.scene.add(droneMesh);
      this.drones.push(droneMesh);
    });
  }

  update(delta, time, groundColliders, obstacles, shootableMeshes) {
    // 1. Animate Drones
    this.drones.forEach(d => {
      d.rotation.y += delta * 1.6;
      d.rotation.x += delta * 0.8;
      d.position.y = d.userData.initialY + Math.sin(time * 0.002 * d.userData.speed) * 1.5;
    });

    if (!this.active || this.bot.health <= 0) return;

    // 2. Keep billboard facing camera
    if (this.bot.billboard && window.camera) {
      this.bot.billboard.quaternion.copy(window.camera.quaternion);
    }

    // 3. AI Combat Logic
    const toPlayer = new THREE.Vector3().subVectors(this.player.position, this.bot.position);
    const dist = toPlayer.length();

    // Look at player (yaw)
    this.bot.meshGroup.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);

    // AI strafing & repositioning
    this.bot.strafeTimer -= delta;
    if (this.bot.strafeTimer <= 0) {
      this.bot.strafeTimer = 1.0 + Math.random() * 1.5;
      this.bot.strafeDir = Math.random() > 0.5 ? 1 : -1;
    }

    const speed = this.difficulty === 'demon' ? 22 : (this.difficulty === 'hard' ? 16 : 10);
    const perp = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).normalize().multiplyScalar(this.bot.strafeDir);

    if (dist > 18) {
      // Approach
      const move = toPlayer.clone().normalize().add(perp.multiplyScalar(0.5)).normalize();
      this.bot.position.x += move.x * speed * delta;
      this.bot.position.z += move.z * speed * delta;
    } else if (dist < 8) {
      // Backpedal
      const move = toPlayer.clone().negate().normalize().add(perp.multiplyScalar(0.7)).normalize();
      this.bot.position.x += move.x * speed * delta;
      this.bot.position.z += move.z * speed * delta;
    } else {
      // Circle strafe
      this.bot.position.x += perp.x * speed * delta;
      this.bot.position.z += perp.z * speed * delta;
    }

    // Keep bot in bounds
    this.bot.position.x = Math.max(-65, Math.min(65, this.bot.position.x));
    this.bot.position.z = Math.max(-65, Math.min(65, this.bot.position.z));
    this.bot.meshGroup.position.copy(this.bot.position);

    // 4. AI Shooting at Player
    const fireInterval = this.difficulty === 'demon' ? 0.22 : (this.difficulty === 'hard' ? 0.45 : 0.9);
    this.bot.fireTimer -= delta;

    if (this.bot.fireTimer <= 0 && dist < 70) {
      this.bot.fireTimer = fireInterval;
      if (this.difficulty !== 'easy') {
        // Fire burst
        const startPos = this.bot.position.clone().add(new THREE.Vector3(0.85, 1.4, -0.45));
        const endPos = this.player.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.0, 0));

        if (window.spawnTracerEffect) {
          window.spawnTracerEffect(startPos, endPos, 0xff0055);
        }
        if (window.TacticalAudio) {
          window.TacticalAudio.playWeaponRifle();
        }

        // Hit chance calculation based on difficulty
        const hitChance = this.difficulty === 'demon' ? 0.75 : (this.difficulty === 'hard' ? 0.45 : 0.2);
        if (Math.random() < hitChance) {
          const dmg = this.difficulty === 'demon' ? 18 : 12;
          if (window.onLocalPlayerDamaged) {
            window.onLocalPlayerDamaged(dmg, 'AI COMBAT BOT', false);
          }
        }
      }
    }
  }

  damageBot(dmg, isHeadshot) {
    if (this.bot.health <= 0) return;
    this.bot.health -= dmg;
    this.updateBotNametag();

    // Hit reaction animation
    this.bot.meshGroup.scale.set(1.15, 1.15, 1.15);
    setTimeout(() => { if (this.bot.meshGroup) this.bot.meshGroup.scale.set(1, 1, 1); }, 60);

    if (this.bot.health <= 0) {
      if (window.TacticalAudio) window.TacticalAudio.playElimination();
      if (window.showKillToast) window.showKillToast('YOU ELIMINATED AI BOT +100');
      this.bot.meshGroup.visible = false;

      // Respawn after 3 seconds
      setTimeout(() => {
        this.bot.health = this.bot.maxHealth;
        this.bot.position.set((Math.random() - 0.5) * 60, 3, (Math.random() - 0.5) * 60);
        this.bot.meshGroup.position.copy(this.bot.position);
        this.bot.meshGroup.visible = true;
        this.updateBotNametag();
      }, 3000);
    }
  }
}

// Global export
window.BotAIEngine = BotAIEngine;
