/**
 * ============================================================================
 * CYBER STRIKE // DUAL ARENA - 2-PLAYER NETWORKING ENGINE
 * Hybrid WebRTC P2P DataChannel + BroadcastChannel local multi-tab synchronization.
 * Synchronizes 3D player positions, rotations, weapons, firing, damage, and scores.
 * ============================================================================
 */

class NetworkEngine {
  constructor(scene) {
    this.scene = scene;
    this.isHost = false;
    this.isConnected = false;
    this.roomCode = null;
    this.peer = null;
    this.connection = null;

    // Local BroadcastChannel for instant same-machine 2-tab testing
    this.localChannel = null;
    this.setupBroadcastChannel();

    // Remote Opponent State & 3D Model
    this.opponent = {
      id: null,
      name: 'OPERATIVE_02',
      skin: 'neon',
      visorColor: '#00f3ff',
      position: new THREE.Vector3(0, -50, 0),
      targetPosition: new THREE.Vector3(0, -50, 0),
      yaw: 0,
      pitch: 0,
      currentWeapon: 'revolver',
      health: 100,
      maxHealth: 100,
      frags: 0,
      meshGroup: null,
      nametagEl: null,
      healthBarEl: null,
      lastSeenTime: 0
    };

    // Build Opponent 3D Humanoid Operative Mesh
    this.buildOpponentMesh();

    // Send loop timer
    this.syncInterval = null;
  }

  // --------------------------------------------------------------------------
  // BROADCAST CHANNEL (INSTANT LOCAL 2-TAB / MULTI-WINDOW PLAY)
  // --------------------------------------------------------------------------
  setupBroadcastChannel() {
    try {
      if (typeof window.BroadcastChannel !== 'undefined') {
        this.localChannel = new BroadcastChannel('cyber_strike_local_match');
        this.localChannel.onmessage = (e) => {
          this.handleIncomingPacket(e.data);
        };
      }
    } catch(e) {
      console.warn('BroadcastChannel not supported in this environment');
    }
  }

  // --------------------------------------------------------------------------
  // WEBRTC P2P VIA PEERJS (REMOTE PLAY OVER INTERNET)
  // --------------------------------------------------------------------------
  initWebRTC(roomCode, isHost = false, onReadyCallback = null) {
    this.roomCode = roomCode.toUpperCase().trim();
    this.isHost = isHost;

    // Load PeerJS dynamically if not already loaded
    if (typeof window.Peer === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js';
      script.onload = () => {
        this.startPeerSession(onReadyCallback);
      };
      script.onerror = () => {
        console.warn('PeerJS CDN unreachable, falling back to local BroadcastChannel.');
        if (onReadyCallback) onReadyCallback(false);
      };
      document.head.appendChild(script);
    } else {
      this.startPeerSession(onReadyCallback);
    }
  }

  startPeerSession(onReadyCallback) {
    const peerId = this.isHost ? `CYBER-${this.roomCode}` : `GUEST-${Date.now().toString(36)}`;

    try {
      this.peer = new window.Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      this.peer.on('open', (id) => {
        if (!this.isHost) {
          // Guest connects to Host's room
          const hostId = `CYBER-${this.roomCode}`;
          const conn = this.peer.connect(hostId, { reliable: false });
          this.setupPeerConnection(conn);
        }
        if (onReadyCallback) onReadyCallback(true, id);
      });

      this.peer.on('connection', (conn) => {
        // Host accepts guest connection
        this.setupPeerConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.warn('PeerJS connection warning:', err);
      });
    } catch(err) {
      console.warn('PeerJS initialization error:', err);
      if (onReadyCallback) onReadyCallback(false);
    }
  }

  setupPeerConnection(conn) {
    this.connection = conn;
    this.connection.on('open', () => {
      this.isConnected = true;
      this.opponent.lastSeenTime = performance.now();
      if (window.onMultiplayerConnected) window.onMultiplayerConnected();
    });

    this.connection.on('data', (data) => {
      this.handleIncomingPacket(data);
    });

    this.connection.on('close', () => {
      this.isConnected = false;
      if (window.onMultiplayerDisconnected) window.onMultiplayerDisconnected();
    });
  }

  // --------------------------------------------------------------------------
  // PACKET SENDING & HANDLING
  // --------------------------------------------------------------------------
  sendPacket(packet) {
    // 1. Send via WebRTC if connected
    if (this.connection && this.connection.open) {
      try { this.connection.send(packet); } catch(e) {}
    }

    // 2. Broadcast to local tabs
    if (this.localChannel) {
      try { this.localChannel.postMessage(packet); } catch(e) {}
    }
  }

  handleIncomingPacket(packet) {
    if (!packet || typeof packet !== 'object') return;
    this.opponent.lastSeenTime = performance.now();
    this.isConnected = true;

    switch(packet.type) {
      case 'SYNC_STATE':
        this.applyOpponentSync(packet);
        break;
      case 'FIRE_EVENT':
        this.applyOpponentFire(packet);
        break;
      case 'HIT_EVENT':
        if (window.onLocalPlayerDamaged) {
          window.onLocalPlayerDamaged(packet.damage, packet.attackerName, packet.isHeadshot);
        }
        break;
      case 'KILL_EVENT':
        if (window.onRemoteKillAnnounced) {
          window.onRemoteKillAnnounced(packet.killer, packet.victim);
        }
        break;
    }
  }

  applyOpponentSync(data) {
    this.opponent.name = data.name || 'OPERATIVE_02';
    this.opponent.skin = data.skin || 'neon';
    this.opponent.visorColor = data.visorColor || '#00f3ff';
    this.opponent.targetPosition.set(data.x, data.y, data.z);
    this.opponent.yaw = data.yaw;
    this.opponent.pitch = data.pitch;
    this.opponent.currentWeapon = data.weapon;
    this.opponent.health = data.health;
    this.opponent.frags = data.frags;

    // Update opponent model visibility & skin
    if (this.opponent.meshGroup) {
      this.opponent.meshGroup.visible = (data.health > 0);
      this.updateOpponentMaterials(data.skin, data.visorColor);
    }

    // Update scoreboard
    const oppNameEl = document.getElementById('hud-opp-name');
    const oppFragsEl = document.getElementById('hud-opp-frags');
    if (oppNameEl) oppNameEl.textContent = this.opponent.name;
    if (oppFragsEl) oppFragsEl.textContent = this.opponent.frags;
  }

  applyOpponentFire(data) {
    // Spawn tracer from opponent weapon to impact
    if (window.spawnTracerEffect) {
      const start = new THREE.Vector3(data.startX, data.startY, data.startZ);
      const end = new THREE.Vector3(data.endX, data.endY, data.endZ);
      window.spawnTracerEffect(start, end, data.color || 0xff0055);
    }
    // Play opponent gunshot
    if (window.TacticalAudio) {
      window.TacticalAudio.playWeaponRifle();
    }
  }

  // --------------------------------------------------------------------------
  // 3D HUMANOID OPPONENT OPERATIVE MESH
  // --------------------------------------------------------------------------
  buildOpponentMesh() {
    this.opponent.meshGroup = new THREE.Group();

    // Materials
    this.oppMaterials = {
      body: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 }),
      armor: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.25, metalness: 0.85 }),
      visor: new THREE.MeshBasicMaterial({ color: 0x00f3ff }),
      skinAccent: new THREE.MeshBasicMaterial({ color: 0x00f3ff })
    };

    // Torso & Chest Armor (y: 1.6 to 2.8)
    const torsoGeo = new THREE.BoxGeometry(1.2, 1.4, 0.7);
    const torsoMesh = new THREE.Mesh(torsoGeo, this.oppMaterials.body);
    torsoMesh.position.set(0, 1.9, 0);
    this.opponent.meshGroup.add(torsoMesh);

    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.9, 0.75), this.oppMaterials.armor);
    chestPlate.position.set(0, 2.05, 0.05);
    this.opponent.meshGroup.add(chestPlate);

    // Glowing Tactical Backpack Reactor
    const reactor = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.8, 8), this.oppMaterials.skinAccent);
    reactor.position.set(0, 2.0, -0.45);
    this.opponent.meshGroup.add(reactor);

    // Head & Tactical Visor (y: 2.9 to 3.5)
    const headGeo = new THREE.BoxGeometry(0.65, 0.7, 0.65);
    const headMesh = new THREE.Mesh(headGeo, this.oppMaterials.body);
    headMesh.position.set(0, 2.95, 0);
    this.opponent.meshGroup.add(headMesh);

    const visorGeo = new THREE.BoxGeometry(0.7, 0.22, 0.4);
    const visorMesh = new THREE.Mesh(visorGeo, this.oppMaterials.visor);
    visorMesh.position.set(0, 3.02, 0.2);
    this.opponent.meshGroup.add(visorMesh);

    // Left Arm & Right Arm
    const armGeo = new THREE.BoxGeometry(0.35, 1.3, 0.35);
    const leftArm = new THREE.Mesh(armGeo, this.oppMaterials.armor);
    leftArm.position.set(-0.85, 1.85, 0);
    this.opponent.meshGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, this.oppMaterials.armor);
    rightArm.position.set(0.85, 1.85, 0);
    this.opponent.meshGroup.add(rightArm);

    // Weapon in Right Hand
    const gunMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.9), this.oppMaterials.body);
    gunMesh.position.set(0.85, 1.4, -0.45);
    this.opponent.meshGroup.add(gunMesh);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.42, 1.5, 0.45);
    const leftLeg = new THREE.Mesh(legGeo, this.oppMaterials.body);
    leftLeg.position.set(-0.35, 0.75, 0);
    this.opponent.meshGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, this.oppMaterials.body);
    rightLeg.position.set(0.35, 0.75, 0);
    this.opponent.meshGroup.add(rightLeg);

    // Floating Nametag and Health HUD Billboard above head
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    this.nametagCanvas = canvas;
    this.nametagTexture = new THREE.CanvasTexture(canvas);

    const billboard = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 0.7),
      new THREE.MeshBasicMaterial({ map: this.nametagTexture, transparent: true })
    );
    billboard.position.set(0, 4.0, 0);
    this.opponent.meshGroup.add(billboard);
    this.opponent.billboard = billboard;

    this.updateNametagTexture('OPERATIVE_02', 100);

    // Make entire model shootable for hitscan
    this.opponent.meshGroup.traverse(child => {
      if (child.isMesh) {
        child.userData = { isOpponent: true, isHead: (child === headMesh || child === visorMesh) };
      }
    });

    this.opponent.meshGroup.position.set(0, -50, 0); // start hidden below arena
    this.scene.add(this.opponent.meshGroup);
  }

  updateNametagTexture(name, hp) {
    if (!this.nametagCanvas) return;
    const ctx = this.nametagCanvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);

    // Dark semi-transparent background
    ctx.fillStyle = 'rgba(5, 8, 16, 0.85)';
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.fillRect(4, 4, 248, 56);
    ctx.strokeRect(4, 4, 248, 56);

    // Name text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name.toUpperCase(), 128, 28);

    // Health Bar
    const barWidth = 220;
    const hpPercent = Math.max(0, Math.min(1, hp / 100));
    ctx.fillStyle = 'rgba(255, 0, 85, 0.3)';
    ctx.fillRect(18, 38, barWidth, 14);

    ctx.fillStyle = hp > 40 ? '#00f3ff' : '#ff0055';
    ctx.fillRect(18, 38, barWidth * hpPercent, 14);

    if (this.nametagTexture) this.nametagTexture.needsUpdate = true;
  }

  updateOpponentMaterials(skinId, visorHex) {
    if (this.oppMaterials.visor) {
      this.oppMaterials.visor.color.setStyle(visorHex || '#00f3ff');
      this.oppMaterials.skinAccent.color.setStyle(visorHex || '#00f3ff');
    }

    if (skinId === 'shadow') {
      this.oppMaterials.body.color.setHex(0x050505);
      this.oppMaterials.armor.color.setHex(0x180005);
    } else if (skinId === 'arctic') {
      this.oppMaterials.body.color.setHex(0xdbeafe);
      this.oppMaterials.armor.color.setHex(0x93c5fd);
    } else if (skinId === 'solar') {
      this.oppMaterials.body.color.setHex(0x2d1a00);
      this.oppMaterials.armor.color.setHex(0xd4af37);
    } else if (skinId === 'toxic') {
      this.oppMaterials.body.color.setHex(0x0f291e);
      this.oppMaterials.armor.color.setHex(0x15803d);
    } else {
      // Default neon
      this.oppMaterials.body.color.setHex(0x0f172a);
      this.oppMaterials.armor.color.setHex(0x1e293b);
    }
  }

  // --------------------------------------------------------------------------
  // PER-FRAME INTERPOLATION (LERP)
  // --------------------------------------------------------------------------
  update(delta) {
    if (!this.opponent.meshGroup) return;

    // Smoothly lerp opponent position to target position
    this.opponent.position.lerp(this.opponent.targetPosition, 16.0 * delta);
    this.opponent.meshGroup.position.copy(this.opponent.position);

    // Orientation
    this.opponent.meshGroup.rotation.y = this.opponent.yaw;

    // Keep nametag billboard facing camera
    if (this.opponent.billboard && window.camera) {
      this.opponent.billboard.quaternion.copy(window.camera.quaternion);
    }
  }
}

// Global export
window.NetworkEngine = NetworkEngine;
