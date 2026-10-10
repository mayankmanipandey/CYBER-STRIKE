/**
 * ============================================================================
 * CYBER STRIKE // DUAL ARENA - 4-THEMATIC ARENA ENGINE & MAP MANAGER
 * Procedural generation and management of 4 distinct maps:
 * 1. Sector 07: Cyber Grid
 * 2. Solaris Station: Orbital Bay
 * 3. Inferno Void: Volcanic Crucible
 * 4. Synth Oasis: Cyber Temple
 * ============================================================================
 */

class MapManager {
  constructor(scene) {
    this.scene = scene;
    this.currentMapId = 'sector07';
    this.mapGroup = new THREE.Group();
    this.scene.add(this.mapGroup);

    // Collision & Hit Data
    this.colliders = [];
    this.groundColliders = [];
    this.shootableMeshes = [];
    this.jumpPads = [];
    this.hazardZones = [];
    this.animatedMeshes = [];

    // Spawn points for 1v1 players
    this.spawnPoints = {
      p1: new THREE.Vector3(0, 3, 30),
      p2: new THREE.Vector3(0, 3, -30)
    };

    // Shared procedural texture generator
    this.createTexture = this.createGridTexture.bind(this);
  }

  // Procedural canvas grid texture maker
  createGridTexture(gridColor, bgColor, size = 512, divisions = 16, accentLines = true) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.35;
    const step = size / divisions;
    for (let i = 0; i <= size; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
    }

    if (accentLines) {
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.85;
      ctx.strokeRect(2, 2, size - 4, size - 4);
      ctx.fillStyle = gridColor;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(size / 2 - 4, size / 2 - 4, 8, 8);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  clearCurrentMap() {
    // Remove all objects from mapGroup
    while (this.mapGroup.children.length > 0) {
      const obj = this.mapGroup.children[0];
      this.mapGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    this.colliders = [];
    this.groundColliders = [];
    this.shootableMeshes = [];
    this.jumpPads = [];
    this.hazardZones = [];
    this.animatedMeshes = [];
  }

  registerBoxCollider(minX, minY, minZ, maxX, maxY, maxZ) {
    this.colliders.push(new THREE.Box3(new THREE.Vector3(minX, minY, minZ), new THREE.Vector3(maxX, maxY, maxZ)));
  }

  registerGroundSurface(minX, minZ, maxX, maxZ, yLevel) {
    this.groundColliders.push({ minX, minZ, maxX, maxZ, y: yLevel });
  }

  registerJumpPad(x, y, z, forceY = 28.0, boostZ = 0) {
    const padGeo = new THREE.CylinderGeometry(2.2, 2.6, 0.4, 16);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x0099bb,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.2
    });
    const padMesh = new THREE.Mesh(padGeo, padMat);
    padMesh.position.set(x, y + 0.2, z);
    this.mapGroup.add(padMesh);
    this.shootableMeshes.push(padMesh);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.1, 8, 24), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y + 0.35, z);
    this.mapGroup.add(ring);
    this.animatedMeshes.push({ mesh: ring, type: 'pulseRing' });

    this.jumpPads.push({
      x, y, z,
      radius: 2.5,
      forceY,
      boostZ
    });
  }

  // --------------------------------------------------------------------------
  // 1. SECTOR 07: CYBER GRID (CYBERPUNK SYNTHWAVE)
  // --------------------------------------------------------------------------
  buildSector07() {
    this.currentMapId = 'sector07';
    this.scene.background = new THREE.Color(0x05070f);
    this.scene.fog = new THREE.FogExp2(0x05070f, 0.008);

    const floorTex = this.createGridTexture('#00ffff', '#050814', 512, 8);
    floorTex.repeat.set(24, 24);
    const wallTex = this.createGridTexture('#ff0055', '#080c1a', 512, 4);
    wallTex.repeat.set(6, 4);
    const platTex = this.createGridTexture('#00ff66', '#09101f', 512, 4);
    platTex.repeat.set(3, 3);

    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.25, metalness: 0.65 });
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.3, metalness: 0.8 });
    const platMat = new THREE.MeshStandardMaterial({ map: platTex, roughness: 0.2, metalness: 0.7 });
    const neonCyan = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const neonMagenta = new THREE.MeshBasicMaterial({ color: 0xff0055 });

    // Main Ground Floor (160x160)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.mapGroup.add(floor);
    this.shootableMeshes.push(floor);
    this.registerGroundSurface(-80, -80, 80, 80, 0);

    // High Perimeter Walls
    const wallH = 24;
    const wallGeoX = new THREE.BoxGeometry(160, wallH, 4);
    const wallGeoZ = new THREE.BoxGeometry(4, wallH, 160);

    const nw = new THREE.Mesh(wallGeoX, wallMat); nw.position.set(0, wallH/2, -80); this.mapGroup.add(nw); this.shootableMeshes.push(nw);
    const sw = new THREE.Mesh(wallGeoX, wallMat); sw.position.set(0, wallH/2, 80); this.mapGroup.add(sw); this.shootableMeshes.push(sw);
    const ww = new THREE.Mesh(wallGeoZ, wallMat); ww.position.set(-80, wallH/2, 0); this.mapGroup.add(ww); this.shootableMeshes.push(ww);
    const ew = new THREE.Mesh(wallGeoZ, wallMat); ew.position.set(80, wallH/2, 0); this.mapGroup.add(ew); this.shootableMeshes.push(ew);

    this.registerBoxCollider(-80, 0, -82, 80, wallH, -78);
    this.registerBoxCollider(-80, 0, 78, 80, wallH, 82);
    this.registerBoxCollider(-82, 0, -80, -78, wallH, 80);
    this.registerBoxCollider(78, 0, -80, 82, wallH, 80);

    // Central Octagon Platform (h = 3.2)
    const centerPlat = new THREE.Mesh(new THREE.CylinderGeometry(18, 20, 3.2, 8), platMat);
    centerPlat.position.set(0, 1.6, 0);
    this.mapGroup.add(centerPlat);
    this.shootableMeshes.push(centerPlat);
    this.registerGroundSurface(-16, -16, 16, 16, 3.2);
    this.registerBoxCollider(-16, 0, -16, 16, 3.2, 16);

    // Rotating Octahedron Core Crystal
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(2.5, 0), new THREE.MeshStandardMaterial({
      color: 0x00f3ff, emissive: 0x00a8cc, emissiveIntensity: 0.95, roughness: 0.1, metalness: 0.9
    }));
    core.position.set(0, 6.8, 0);
    this.mapGroup.add(core);
    this.shootableMeshes.push(core);
    this.animatedMeshes.push({ mesh: core, type: 'rotateY' });

    // 4 Corner Elevated Decks (h = 7.5) with Jump Pads
    const decks = [
      { x: -40, z: -40 }, { x: 40, z: -40 },
      { x: -40, z: 40 }, { x: 40, z: 40 }
    ];
    decks.forEach(d => {
      const dMesh = new THREE.Mesh(new THREE.BoxGeometry(22, 1.5, 22), platMat);
      dMesh.position.set(d.x, 6.75, d.z);
      this.mapGroup.add(dMesh);
      this.shootableMeshes.push(dMesh);
      this.registerGroundSurface(d.x - 11, d.z - 11, d.x + 11, d.z + 11, 7.5);
      this.registerBoxCollider(d.x - 11, 0, d.z - 11, d.x + 11, 7.5, d.z + 11);

      // Support pillar
      const sup = new THREE.Mesh(new THREE.BoxGeometry(5, 7.5, 5), wallMat);
      sup.position.set(d.x, 3.75, d.z);
      this.mapGroup.add(sup);
      this.shootableMeshes.push(sup);

      // Jump Pad leading up to each deck
      const jx = d.x * 0.55;
      const jz = d.z * 0.55;
      this.registerJumpPad(jx, 0, jz, 26.0);
    });

    // Tactical Cover Barriers
    const barriers = [
      { x: 0, z: -35, w: 14, h: 6, d: 3 },
      { x: 0, z: 35, w: 14, h: 6, d: 3 },
      { x: -35, z: 0, w: 3, h: 6, d: 14 },
      { x: 35, z: 0, w: 3, h: 6, d: 14 }
    ];
    barriers.forEach(b => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), wallMat);
      mesh.position.set(b.x, b.h / 2, b.z);
      this.mapGroup.add(mesh);
      this.shootableMeshes.push(mesh);
      this.registerBoxCollider(b.x - b.w/2, 0, b.z - b.d/2, b.x + b.w/2, b.h, b.z + b.d/2);
    });

    this.spawnPoints.p1.set(0, 3, 45);
    this.spawnPoints.p2.set(0, 3, -45);
  }

  // --------------------------------------------------------------------------
  // 2. SOLARIS STATION: ORBITAL BAY (DEEP SPACE HANGAR)
  // --------------------------------------------------------------------------
  buildSolarisStation() {
    this.currentMapId = 'solaris';
    this.scene.background = new THREE.Color(0x02030a);
    this.scene.fog = new THREE.FogExp2(0x02030a, 0.005);

    // Procedural Starfield Dome
    const starCount = 600;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 350;
      starPos[i + 1] = 20 + Math.random() * 120;
      starPos[i + 2] = (Math.random() - 0.5) * 350;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.2 });
    const stars = new THREE.Points(starGeo, starMat);
    this.mapGroup.add(stars);

    const metalTex = this.createGridTexture('#38bdf8', '#0c1524', 512, 8);
    metalTex.repeat.set(20, 20);
    const hangarMat = new THREE.MeshStandardMaterial({ map: metalTex, roughness: 0.2, metalness: 0.85 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.3 });
    const hazardMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    // Hangar Main Deck
    const deck = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), hangarMat);
    deck.rotation.x = -Math.PI / 2;
    deck.receiveShadow = true;
    this.mapGroup.add(deck);
    this.shootableMeshes.push(deck);
    this.registerGroundSurface(-75, -75, 75, 75, 0);

    // Perimeter Airlock Walls with Glass Observation Ports
    const wallH = 22;
    const nAirlock = new THREE.Mesh(new THREE.BoxGeometry(150, wallH, 4), steelMat);
    nAirlock.position.set(0, wallH/2, -75); this.mapGroup.add(nAirlock); this.shootableMeshes.push(nAirlock);
    const sAirlock = new THREE.Mesh(new THREE.BoxGeometry(150, wallH, 4), steelMat);
    sAirlock.position.set(0, wallH/2, 75); this.mapGroup.add(sAirlock); this.shootableMeshes.push(sAirlock);
    const wAirlock = new THREE.Mesh(new THREE.BoxGeometry(4, wallH, 150), steelMat);
    wAirlock.position.set(-75, wallH/2, 0); this.mapGroup.add(wAirlock); this.shootableMeshes.push(wAirlock);
    const eAirlock = new THREE.Mesh(new THREE.BoxGeometry(4, wallH, 150), steelMat);
    eAirlock.position.set(75, wallH/2, 0); this.mapGroup.add(eAirlock); this.shootableMeshes.push(eAirlock);

    this.registerBoxCollider(-75, 0, -77, 75, wallH, -73);
    this.registerBoxCollider(-75, 0, 73, 75, wallH, 77);
    this.registerBoxCollider(-77, 0, -75, -73, wallH, 75);
    this.registerBoxCollider(73, 0, -75, 77, wallH, 75);

    // Suspended High Catwalks (Cross-shaped over arena, h = 9.0)
    const catX = new THREE.Mesh(new THREE.BoxGeometry(110, 1.2, 8), hangarMat);
    catX.position.set(0, 8.4, 0);
    this.mapGroup.add(catX);
    this.shootableMeshes.push(catX);
    this.registerGroundSurface(-55, -4, 55, 4, 9.0);
    this.registerBoxCollider(-55, 0, -4, 55, 9.0, 4);

    const catZ = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 110), hangarMat);
    catZ.position.set(0, 8.4, 0);
    this.mapGroup.add(catZ);
    this.shootableMeshes.push(catZ);
    this.registerGroundSurface(-4, -55, 4, 55, 9.0);
    this.registerBoxCollider(-4, 0, -55, 4, 9.0, 55);

    // Central Plasma Reactor Core
    const reactor = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 16, 16), steelMat);
    reactor.position.set(0, 8, 0);
    this.mapGroup.add(reactor);
    this.shootableMeshes.push(reactor);
    this.registerBoxCollider(-6, 0, -6, 6, 16, 6);

    const reactorRing = new THREE.Mesh(new THREE.TorusGeometry(8.5, 0.4, 12, 32), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    reactorRing.rotation.x = Math.PI / 2;
    reactorRing.position.set(0, 9.0, 0);
    this.mapGroup.add(reactorRing);
    this.animatedMeshes.push({ mesh: reactorRing, type: 'rotateZ' });

    // Gravity Lift Jump Pads to access Catwalks
    this.registerJumpPad(-25, 0, 0, 30.0);
    this.registerJumpPad(25, 0, 0, 30.0);
    this.registerJumpPad(0, 0, -25, 30.0);
    this.registerJumpPad(0, 0, 25, 30.0);

    this.spawnPoints.p1.set(0, 3, 50);
    this.spawnPoints.p2.set(0, 3, -50);
  }

  // --------------------------------------------------------------------------
  // 3. INFERNO VOID: VOLCANIC CRUCIBLE
  // --------------------------------------------------------------------------
  buildInfernoVoid() {
    this.currentMapId = 'inferno';
    this.scene.background = new THREE.Color(0x120406);
    this.scene.fog = new THREE.FogExp2(0x180507, 0.012);

    const basaltTex = this.createGridTexture('#ef4444', '#110508', 512, 8);
    basaltTex.repeat.set(16, 16);
    const basaltMat = new THREE.MeshStandardMaterial({ map: basaltTex, roughness: 0.8, metalness: 0.2 });
    const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff3b00 });
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    // Main Arena Island Floor (y = 0)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), basaltMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.mapGroup.add(floor);
    this.shootableMeshes.push(floor);
    this.registerGroundSurface(-70, -70, 70, 70, 0);

    // Molten Lava Trenches (Cross canal through center, hazard)
    const lava1 = new THREE.Mesh(new THREE.PlaneGeometry(140, 10), lavaMat);
    lava1.rotation.x = -Math.PI / 2;
    lava1.position.set(0, 0.05, 0);
    this.mapGroup.add(lava1);

    const lava2 = new THREE.Mesh(new THREE.PlaneGeometry(10, 140), lavaMat);
    lava2.rotation.x = -Math.PI / 2;
    lava2.position.set(0, 0.05, 0);
    this.mapGroup.add(lava2);

    // Lava Hazard Zones (Stepping in these drains HP)
    this.hazardZones.push({ minX: -70, maxX: 70, minZ: -5, maxZ: 5, dps: 25 });
    this.hazardZones.push({ minX: -5, maxX: 5, minZ: -70, maxZ: 70, dps: 25 });

    // 4 Heavy Obsidian Fortress Platforms in each quadrant (h = 5.0)
    const forts = [
      { x: -30, z: -30 }, { x: 30, z: -30 },
      { x: -30, z: 30 }, { x: 30, z: 30 }
    ];
    forts.forEach(f => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(24, 5, 24), basaltMat);
      b.position.set(f.x, 2.5, f.z);
      this.mapGroup.add(b);
      this.shootableMeshes.push(b);
      this.registerGroundSurface(f.x - 12, f.z - 12, f.x + 12, f.z + 12, 5.0);
      this.registerBoxCollider(f.x - 12, 0, f.z - 12, f.x + 12, 5.0, f.z + 12);
    });

    // Elevated Suspension Bridges connecting the fortresses
    const bridgeZ1 = new THREE.Mesh(new THREE.BoxGeometry(6, 1.0, 40), basaltMat);
    bridgeZ1.position.set(-30, 4.5, 0);
    this.mapGroup.add(bridgeZ1);
    this.shootableMeshes.push(bridgeZ1);
    this.registerGroundSurface(-33, -20, -27, 20, 5.0);

    const bridgeZ2 = new THREE.Mesh(new THREE.BoxGeometry(6, 1.0, 40), basaltMat);
    bridgeZ2.position.set(30, 4.5, 0);
    this.mapGroup.add(bridgeZ2);
    this.shootableMeshes.push(bridgeZ2);
    this.registerGroundSurface(27, -20, 33, 20, 5.0);

    // Jump pads crossing the central lava intersection
    this.registerJumpPad(0, 0, -20, 22.0, 25.0);
    this.registerJumpPad(0, 0, 20, 22.0, -25.0);

    // Perimeter Magma Basalt Walls
    const wallH = 20;
    this.registerBoxCollider(-70, 0, -72, 70, wallH, -68);
    this.registerBoxCollider(-70, 0, 68, 70, wallH, 72);
    this.registerBoxCollider(-72, 0, -70, -68, wallH, 70);
    this.registerBoxCollider(68, 0, -70, 72, wallH, 70);

    this.spawnPoints.p1.set(-30, 7, 30);
    this.spawnPoints.p2.set(30, 7, -30);
  }

  // --------------------------------------------------------------------------
  // 4. SYNTH OASIS: CYBER TEMPLE (VAPORWAVE DUSK SANCTUARY)
  // --------------------------------------------------------------------------
  buildSynthOasis() {
    this.currentMapId = 'oasis';
    this.scene.background = new THREE.Color(0x0e091e);
    this.scene.fog = new THREE.FogExp2(0x140e2d, 0.007);

    const marbleTex = this.createGridTexture('#a855f7', '#0e1124', 512, 12);
    marbleTex.repeat.set(18, 18);
    const marbleMat = new THREE.MeshStandardMaterial({ map: marbleTex, roughness: 0.15, metalness: 0.5 });
    const poolMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.85 });
    const toriiMat = new THREE.MeshStandardMaterial({ color: 0xff0055, roughness: 0.3, metalness: 0.7 });

    // Main Sanctuary Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), marbleMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.mapGroup.add(floor);
    this.shootableMeshes.push(floor);
    this.registerGroundSurface(-80, -80, 80, 80, 0);

    // Turquoise Reflection Pool in Center
    const pool = new THREE.Mesh(new THREE.CircleGeometry(22, 32), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, 0.05, 0);
    this.mapGroup.add(pool);

    // Floating Holographic Torii Gate Arches
    [-35, 35].forEach(zPos => {
      const toriiL = new THREE.Mesh(new THREE.BoxGeometry(2, 16, 2), toriiMat);
      toriiL.position.set(-14, 8, zPos);
      this.mapGroup.add(toriiL);
      this.shootableMeshes.push(toriiL);
      this.registerBoxCollider(-15, 0, zPos - 1, -13, 16, zPos + 1);

      const toriiR = new THREE.Mesh(new THREE.BoxGeometry(2, 16, 2), toriiMat);
      toriiR.position.set(14, 8, zPos);
      this.mapGroup.add(toriiR);
      this.shootableMeshes.push(toriiR);
      this.registerBoxCollider(13, 0, zPos - 1, 15, 16, zPos + 1);

      const topBeam = new THREE.Mesh(new THREE.BoxGeometry(34, 2.5, 2.5), toriiMat);
      topBeam.position.set(0, 16.5, zPos);
      this.mapGroup.add(topBeam);
      this.shootableMeshes.push(topBeam);
    });

    // Elevated Sanctuary Shrines (North and South, h = 6.0)
    const nShrine = new THREE.Mesh(new THREE.BoxGeometry(30, 6, 20), marbleMat);
    nShrine.position.set(0, 3, -55);
    this.mapGroup.add(nShrine);
    this.shootableMeshes.push(nShrine);
    this.registerGroundSurface(-15, -65, 15, -45, 6.0);
    this.registerBoxCollider(-15, 0, -65, 15, 6.0, -45);

    const sShrine = new THREE.Mesh(new THREE.BoxGeometry(30, 6, 20), marbleMat);
    sShrine.position.set(0, 3, 55);
    this.mapGroup.add(sShrine);
    this.shootableMeshes.push(sShrine);
    this.registerGroundSurface(-15, 45, 15, 65, 6.0);
    this.registerBoxCollider(-15, 0, 45, 15, 6.0, 65);

    // Jump pads in center pool launching toward shrines
    this.registerJumpPad(0, 0, -10, 24.0, -18.0);
    this.registerJumpPad(0, 0, 10, 24.0, 18.0);

    // Perimeter Boundary Colliders
    this.registerBoxCollider(-80, 0, -82, 80, 20, -78);
    this.registerBoxCollider(-80, 0, 78, 80, 20, 82);
    this.registerBoxCollider(-82, 0, -80, -78, 20, 80);
    this.registerBoxCollider(78, 0, -80, 82, 20, 80);

    this.spawnPoints.p1.set(0, 8, 55);
    this.spawnPoints.p2.set(0, 8, -55);
  }

  // --------------------------------------------------------------------------
  // MAP SWITCHER & RUNTIME UPDATER
  // --------------------------------------------------------------------------
  loadMap(mapId) {
    this.clearCurrentMap();
    if (mapId === 'solaris') this.buildSolarisStation();
    else if (mapId === 'inferno') this.buildInfernoVoid();
    else if (mapId === 'oasis') this.buildSynthOasis();
    else this.buildSector07();
  }

  update(delta, time) {
    // Animate map specific rotating/pulsing items
    for (let i = 0; i < this.animatedMeshes.length; i++) {
      const item = this.animatedMeshes[i];
      if (item.type === 'rotateY') item.mesh.rotation.y += delta * 1.4;
      else if (item.type === 'rotateZ') item.mesh.rotation.z += delta * 0.8;
      else if (item.type === 'pulseRing') {
        const s = 1.0 + Math.sin(time * 0.005) * 0.12;
        item.mesh.scale.set(s, s, s);
      }
    }
  }

  // Check if player stepped on any jump pad
  checkJumpPad(playerPos) {
    for (let i = 0; i < this.jumpPads.length; i++) {
      const p = this.jumpPads[i];
      const dx = playerPos.x - p.x;
      const dz = playerPos.z - p.z;
      if (dx * dx + dz * dz < p.radius * p.radius && Math.abs(playerPos.y - p.y) < 2.0) {
        return p;
      }
    }
    return null;
  }

  // Check hazard zone damage
  checkHazardDamage(playerPos) {
    for (let i = 0; i < this.hazardZones.length; i++) {
      const h = this.hazardZones[i];
      if (playerPos.x >= h.minX && playerPos.x <= h.maxX &&
          playerPos.z >= h.minZ && playerPos.z <= h.maxZ &&
          playerPos.y <= 1.2) {
        return h.dps;
      }
    }
    return 0;
  }
}

// Global export
window.MapManager = MapManager;
