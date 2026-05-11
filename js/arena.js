import * as THREE from 'three';

export function buildArena(scene) {
    const arena = new THREE.Group();
    const colliders = [];
    const HALF = 80; // 160x160 map (4x original)

    // ===== GROUND =====
    const groundGeo = new THREE.PlaneGeometry(HALF * 2, HALF * 2, 80, 80);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0a0a12, roughness: 0.9, metalness: 0.1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    arena.add(ground);

    // Subtle ground grid (very faint, no wireframe)
    for (let i = -HALF; i <= HALF; i += 40) {
        const lineGeo = new THREE.BoxGeometry(HALF * 2, 0.03, 0.06);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0x331122, transparent: true, opacity: 0.15 });
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.position.set(0, 0.02, i);
        arena.add(line);
        const line2 = line.clone();
        line2.rotation.y = Math.PI / 2;
        line2.position.set(i, 0.02, 0);
        arena.add(line2);
    }

    // ===== WALLS (neon borders) =====
    const wallH = 12, wallT = 1.5;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0a0a1e, roughness: 0.3, metalness: 0.5, emissive: 0x110022, emissiveIntensity: 0.3 });
    const wallData = [
        { pos: [0, wallH/2, -HALF], size: [HALF*2, wallH, wallT] },
        { pos: [0, wallH/2, HALF], size: [HALF*2, wallH, wallT] },
        { pos: [-HALF, wallH/2, 0], size: [wallT, wallH, HALF*2] },
        { pos: [HALF, wallH/2, 0], size: [wallT, wallH, HALF*2] },
    ];
    wallData.forEach(w => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...w.size), wallMat);
        mesh.position.set(...w.pos);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        arena.add(mesh);
        // Neon top strip
        const stripMat = new THREE.MeshBasicMaterial({ color: 0xff0066, transparent: true, opacity: 0.8 });
        const strip = new THREE.Mesh(new THREE.BoxGeometry(w.size[0], 0.3, w.size[2]), stripMat);
        strip.position.set(w.pos[0], wallH + 0.15, w.pos[2]);
        arena.add(strip);
        colliders.push({ min: new THREE.Vector3(w.pos[0]-w.size[0]/2, 0, w.pos[2]-w.size[2]/2), max: new THREE.Vector3(w.pos[0]+w.size[0]/2, w.size[1], w.pos[2]+w.size[2]/2) });
    });

    // ===== ZONE 1: JUJUTSU SCHOOL (center-north) =====
    buildSchool(arena, colliders, 0, -45);

    // ===== ZONE 2: SHIBUYA SUBWAY (east) =====
    buildSubway(arena, colliders, 50, 0);

    // ===== ZONE 3: CURSED FOREST (west) =====
    buildForest(arena, colliders, -50, 0);

    // ===== ZONE 4: ANCIENT RUINS / TEMPLE (south) =====
    buildTemple(arena, colliders, 0, 50);

    // ===== ZONE 5: CENTRAL ARENA (center) =====
    buildCentralArena(arena, colliders, 0, 0);

    // ===== SCATTERED ELEMENTS =====
    // Neon pillars throughout
    const pillarPositions = [
        [-30, -30], [30, -30], [-30, 30], [30, 30],
        [-55, -40], [55, -40], [-55, 40], [55, 40],
        [-20, 60], [20, 60], [-20, -60], [20, -60],
        [60, -30], [-60, -30], [60, 30], [-60, 30],
    ];
    pillarPositions.forEach(([x, z]) => addNeonPillar(arena, colliders, x, z));

    // Floating cursed energy orbs (decorative)
    for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 15 + Math.random() * 60;
        addFloatingOrb(arena, Math.cos(angle) * r, 4 + Math.random() * 8, Math.sin(angle) * r);
    }

    // Neon light strips on ground connecting zones
    addGroundStrip(arena, 0, -20, 0, -45, 0xff0066);
    addGroundStrip(arena, 0, 20, 0, 50, 0x8800ff);
    addGroundStrip(arena, 20, 0, 50, 0, 0x00aaff);
    addGroundStrip(arena, -20, 0, -50, 0, 0x00ff66);

    // Atmospheric fog volumes
    addFogVolume(arena, -50, 0, 0x00ff44, 25);
    addFogVolume(arena, 0, -45, 0xff2244, 20);
    addFogVolume(arena, 50, 0, 0x4488ff, 20);
    addFogVolume(arena, 0, 50, 0x8800ff, 22);

    scene.add(arena);
    return { colliders, bounds: { min: -HALF + 2, max: HALF - 2 } };
}

function buildSchool(parent, colliders, cx, cz) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.5, metalness: 0.2, emissive: 0x110011, emissiveIntensity: 0.1 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x0a0a1e, roughness: 0.3, emissive: 0x220033, emissiveIntensity: 0.2 });
    const neonMat = new THREE.MeshBasicMaterial({ color: 0xff2266 });

    // Main building
    addBox(parent, colliders, cx, cz, 24, 14, 14, mat);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(18, 6, 4), roofMat);
    roof.position.set(cx, 17, cz);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    parent.add(roof);

    // Windows (emissive mesh only, no per-window lights)
    const winMat = new THREE.MeshBasicMaterial({ color: 0xffaa22, transparent: true, opacity: 0.9 });
    for (let wx = -3; wx <= 3; wx++) {
        for (let wy = 0; wy < 3; wy++) {
            const win = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2), winMat);
            win.position.set(cx + wx * 2.8, 3 + wy * 4, cz + 7.01);
            parent.add(win);
        }
    }
    // Single light for all windows
    const wLight = new THREE.PointLight(0xffaa22, 0.6, 20);
    wLight.position.set(cx, 6, cz + 10);
    parent.add(wLight);

    // Side wings
    addBox(parent, colliders, cx - 18, cz, 8, 8, 10, mat);
    addBox(parent, colliders, cx + 18, cz, 8, 8, 10, mat);

    // Courtyard walls
    addBox(parent, colliders, cx - 10, cz + 12, 4, 3, 1, mat);
    addBox(parent, colliders, cx + 10, cz + 12, 4, 3, 1, mat);

    // Neon sign
    const signMat = new THREE.MeshBasicMaterial({ color: 0xff0066, transparent: true, opacity: 0.9 });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(10, 1.5, 0.2), signMat);
    sign.position.set(cx, 12, cz + 7.2);
    parent.add(sign);
    const signLight = new THREE.PointLight(0xff0066, 2, 15);
    signLight.position.set(cx, 12, cz + 9);
    parent.add(signLight);

    // Torii gate at entrance
    addNeonTorii(parent, cx, cz + 20, 0xff2244);
}

function buildSubway(parent, colliders, cx, cz) {
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x181820, roughness: 0.8, metalness: 0.1 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x2a2a35, roughness: 0.3, metalness: 0.7 });

    // Subway entrance structure
    addBox(parent, colliders, cx, cz, 16, 6, 20, concreteMat);

    // Tunnel openings (gaps in walls)
    addBox(parent, colliders, cx - 10, cz - 5, 3, 8, 3, metalMat);
    addBox(parent, colliders, cx + 10, cz - 5, 3, 8, 3, metalMat);
    addBox(parent, colliders, cx - 10, cz + 5, 3, 8, 3, metalMat);
    addBox(parent, colliders, cx + 10, cz + 5, 3, 8, 3, metalMat);

    // Platform edges
    addBox(parent, colliders, cx, cz - 12, 18, 1.5, 2, concreteMat);
    addBox(parent, colliders, cx, cz + 12, 18, 1.5, 2, concreteMat);

    // Ticket gates
    for (let i = -2; i <= 2; i++) {
        addBox(parent, colliders, cx + i * 3, cz + 16, 0.5, 3, 1.5, metalMat);
    }

    // Neon strip lights (blue theme) — 2 lights + emissive strips
    for (let i = -3; i <= 3; i++) {
        const stripMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 0.15, 0.15), new THREE.MeshBasicMaterial({ color: 0x0088ff }));
        stripMesh.position.set(cx + i * 4, 5.8, cz);
        parent.add(stripMesh);
    }
    const subL1 = new THREE.PointLight(0x0088ff, 0.8, 20);
    subL1.position.set(cx - 8, 5.5, cz);
    parent.add(subL1);
    const subL2 = new THREE.PointLight(0x0088ff, 0.8, 20);
    subL2.position.set(cx + 8, 5.5, cz);
    parent.add(subL2);

    // Warning signs
    const warnMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 });
    [-1, 1].forEach(s => {
        const warn = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 0.1), warnMat);
        warn.position.set(cx + s * 7, 4, cz - 12.1);
        parent.add(warn);
    });

    // Vending machines
    const vendMat = new THREE.MeshStandardMaterial({ color: 0x223344, emissive: 0x0044aa, emissiveIntensity: 0.4 });
    addBox(parent, colliders, cx + 14, cz - 8, 2, 4, 1.5, vendMat);
    addBox(parent, colliders, cx + 14, cz + 8, 2, 4, 1.5, vendMat);
}

function buildForest(parent, colliders, cx, cz) {
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x1a0a05, roughness: 0.8 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x003311, roughness: 0.7, emissive: 0x001a08, emissiveIntensity: 0.3 });
    const cursedLeafMat = new THREE.MeshStandardMaterial({ color: 0x110022, roughness: 0.6, emissive: 0x220044, emissiveIntensity: 0.5 });

    // Dense trees
    for (let i = 0; i < 35; i++) {
        const tx = cx + (Math.random() - 0.5) * 40;
        const tz = cz + (Math.random() - 0.5) * 50;
        const isCursed = Math.random() < 0.3;
        const h = 4 + Math.random() * 6;

        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, h, 6), treeMat);
        trunk.position.set(tx, h / 2, tz);
        trunk.castShadow = true;
        parent.add(trunk);

        const lmat = isCursed ? cursedLeafMat : leafMat;
        const leaves1 = new THREE.Mesh(new THREE.ConeGeometry(3 + Math.random() * 2, 6, 6), lmat);
        leaves1.position.set(tx, h + 2, tz);
        leaves1.castShadow = true;
        parent.add(leaves1);
        const leaves2 = new THREE.Mesh(new THREE.ConeGeometry(2 + Math.random(), 4, 6), lmat);
        leaves2.position.set(tx, h + 5, tz);
        parent.add(leaves2);

        if (isCursed) {
            // Use emissive material only — no per-tree lights
        }
    }

    // Cursed altar in clearing
    const altarMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2e, emissive: 0x440066, emissiveIntensity: 0.6 });
    addBox(parent, colliders, cx, cz, 4, 2, 4, altarMat);
    const altarGlow = new THREE.PointLight(0x8800ff, 2, 15);
    altarGlow.position.set(cx, 4, cz);
    parent.add(altarGlow);

    // Stone path through forest
    for (let i = -8; i <= 8; i++) {
        const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 0.3, 5), new THREE.MeshStandardMaterial({ color: 0x2a2a2a }));
        stone.position.set(cx + i * 3 + Math.random(), 0.15, cz + Math.sin(i) * 3);
        parent.add(stone);
    }

    // Mushrooms (glowing)
    for (let i = 0; i < 12; i++) {
        const mx = cx + (Math.random() - 0.5) * 35;
        const mz = cz + (Math.random() - 0.5) * 35;
        const mColor = [0x00ff88, 0xff00aa, 0x00aaff][Math.floor(Math.random() * 3)];
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.8, 6), new THREE.MeshStandardMaterial({ color: 0xddddcc }));
        stem.position.set(mx, 0.4, mz);
        parent.add(stem);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: mColor, transparent: true, opacity: 0.7 }));
        cap.position.set(mx, 0.8, mz);
        parent.add(cap);
    }

    // Single forest ambient light
    const forestLight = new THREE.PointLight(0x004422, 0.8, 35);
    forestLight.position.set(cx, 5, cz);
    parent.add(forestLight);
}

function buildTemple(parent, colliders, cx, cz) {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.6, metalness: 0.2, emissive: 0x110011, emissiveIntensity: 0.15 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0x8a6a1a, roughness: 0.3, metalness: 0.8, emissive: 0x443300, emissiveIntensity: 0.3 });

    // Temple platform (raised)
    addBox(parent, colliders, cx, cz, 30, 2, 30, stoneMat);

    // Main temple structure
    addBox(parent, colliders, cx, cz, 14, 12, 14, stoneMat);

    // Tiered roof
    for (let tier = 0; tier < 3; tier++) {
        const s = 16 - tier * 4;
        const roofMesh = new THREE.Mesh(new THREE.BoxGeometry(s, 1, s), goldMat);
        roofMesh.position.set(cx, 14 + tier * 3, cz);
        parent.add(roofMesh);
        // Upturned edges
        [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dz]) => {
            const edge = new THREE.Mesh(new THREE.BoxGeometry(dx === 0 ? s : 1.5, 0.5, dz === 0 ? s : 1.5), goldMat);
            edge.position.set(cx + dx * s / 2, 14.5 + tier * 3, cz + dz * s / 2);
            parent.add(edge);
        });
    }

    // Temple pillars
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const px = cx + Math.cos(angle) * 12;
        const pz = cz + Math.sin(angle) * 12;
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 10, 8), stoneMat);
        pillar.position.set(px, 7, pz);
        pillar.castShadow = true;
        parent.add(pillar);
        colliders.push({ min: new THREE.Vector3(px - 1, 0, pz - 1), max: new THREE.Vector3(px + 1, 10, pz + 1) });
    }

    // Stone lanterns
    const lanternPositions = [[cx-8, cz+16], [cx+8, cz+16], [cx-8, cz-16], [cx+8, cz-16]];
    lanternPositions.forEach(([lx, lz]) => {
        addBox(parent, colliders, lx, lz, 1.5, 3, 1.5, stoneMat);
        const lampMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 1), lampMat);
        lamp.position.set(lx, 3.5, lz);
        parent.add(lamp);
        const lLight = new THREE.PointLight(0xff6600, 0.8, 10);
        lLight.position.set(lx, 4, lz);
        parent.add(lLight);
    });

    // Cursed seal on ground (glowing circle)
    const sealGeo = new THREE.TorusGeometry(8, 0.15, 8, 64);
    const sealMat = new THREE.MeshBasicMaterial({ color: 0x8800ff, transparent: true, opacity: 0.5 });
    const seal = new THREE.Mesh(sealGeo, sealMat);
    seal.rotation.x = Math.PI / 2;
    seal.position.set(cx, 2.1, cz);
    parent.add(seal);
    const innerSeal = new THREE.Mesh(new THREE.TorusGeometry(5, 0.1, 8, 32), sealMat);
    innerSeal.rotation.x = Math.PI / 2;
    innerSeal.position.set(cx, 2.1, cz);
    parent.add(innerSeal);
    const sealLight = new THREE.PointLight(0x8800ff, 1.5, 12);
    sealLight.position.set(cx, 3, cz);
    parent.add(sealLight);

    // Torii gates leading to temple
    addNeonTorii(parent, cx, cz + 22, 0x8800ff);
    addNeonTorii(parent, cx, cz - 22, 0xff6600);
}

function buildCentralArena(parent, colliders, cx, cz) {
    // Central fighting ring
    const ringGeo = new THREE.TorusGeometry(12, 0.3, 8, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff0044, transparent: true, opacity: 0.6 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(cx, 0.1, cz);
    parent.add(ring);

    // Inner ring
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(6, 0.2, 8, 32), new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.5 }));
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.set(cx, 0.1, cz);
    parent.add(innerRing);

    // Central pillar
    const centralMat = new THREE.MeshStandardMaterial({ color: 0x1a0a1a, emissive: 0xff0044, emissiveIntensity: 0.4, metalness: 0.6 });
    const centralPillar = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, 15, 8), centralMat);
    centralPillar.position.set(cx, 7.5, cz);
    centralPillar.castShadow = true;
    parent.add(centralPillar);
    colliders.push({ min: new THREE.Vector3(cx - 2, 0, cz - 2), max: new THREE.Vector3(cx + 2, 15, cz + 2) });

    // Orbiting energy ring
    const orbitRing = new THREE.Mesh(new THREE.TorusGeometry(3, 0.1, 8, 32), new THREE.MeshBasicMaterial({ color: 0xff0088 }));
    orbitRing.position.set(cx, 12, cz);
    parent.add(orbitRing);

    // Corner cover blocks
    const coverMat = new THREE.MeshStandardMaterial({ color: 0x151520, emissive: 0x220022, emissiveIntensity: 0.2 });
    [[-8, -8], [8, -8], [-8, 8], [8, 8]].forEach(([dx, dz]) => {
        addBox(parent, colliders, cx + dx, cz + dz, 3, 2.5, 3, coverMat);
    });

    // Spectator energy columns (emissive mesh only)
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const x = cx + Math.cos(angle) * 14;
        const z = cz + Math.sin(angle) * 14;
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 20, 6), new THREE.MeshBasicMaterial({ color: 0xff0066, transparent: true, opacity: 0.15 }));
        col.position.set(x, 10, z);
        parent.add(col);
    }
    // Single center arena light
    const arenaLight = new THREE.PointLight(0xff0044, 1.0, 25);
    arenaLight.position.set(cx, 10, cz);
    parent.add(arenaLight);
}

// === Utility builders ===

function addBox(parent, colliders, cx, cz, w, h, d, mat) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(cx, h / 2, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    colliders.push({ min: new THREE.Vector3(cx - w/2, 0, cz - d/2), max: new THREE.Vector3(cx + w/2, h, cz + d/2) });
    return mesh;
}

function addNeonPillar(parent, colliders, x, z) {
    const colors = [0xff0066, 0x4488ff, 0x00ff88, 0xff6600, 0x8800ff];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const h = 6 + Math.random() * 4;

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.3, metalness: 0.5 });
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, h, 6), pillarMat);
    pillar.position.set(x, h / 2, z);
    pillar.castShadow = true;
    parent.add(pillar);

    // Neon ring at top
    const neonRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 8, 16), new THREE.MeshBasicMaterial({ color }));
    neonRing.position.set(x, h, z);
    neonRing.rotation.x = Math.PI / 2;
    parent.add(neonRing);

    // Neon strips on pillar
    for (let i = 0; i < 3; i++) {
        const stripAngle = (i / 3) * Math.PI * 2;
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, h, 0.08), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 }));
        strip.position.set(x + Math.cos(stripAngle) * 0.7, h / 2, z + Math.sin(stripAngle) * 0.7);
        parent.add(strip);
    }

    // No per-pillar light — emissive mesh is enough
    colliders.push({ min: new THREE.Vector3(x - 1, 0, z - 1), max: new THREE.Vector3(x + 1, h, z + 1) });
}

function addNeonTorii(parent, cx, cz, color) {
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, roughness: 0.3 });
    const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 10, 8), mat);
    pillarL.position.set(cx - 5, 5, cz);
    parent.add(pillarL);
    const pillarR = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 10, 8), mat);
    pillarR.position.set(cx + 5, 5, cz);
    parent.add(pillarR);
    const beam1 = new THREE.Mesh(new THREE.BoxGeometry(12, 0.8, 0.8), mat);
    beam1.position.set(cx, 9.5, cz);
    parent.add(beam1);
    const beam2 = new THREE.Mesh(new THREE.BoxGeometry(11, 0.5, 0.6), mat);
    beam2.position.set(cx, 8, cz);
    parent.add(beam2);

    const glow = new THREE.PointLight(color, 1, 15);
    glow.position.set(cx, 8, cz);
    parent.add(glow);
}

function addFloatingOrb(parent, x, y, z) {
    const colors = [0xff0066, 0x8800ff, 0x00aaff, 0xff6600, 0x00ff88];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = 0.2 + Math.random() * 0.4;

    const orb = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 }));
    orb.position.set(x, y, z);
    parent.add(orb);

    // Glow
    const glow = new THREE.Mesh(new THREE.SphereGeometry(size * 3, 8, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.08 }));
    orb.add(glow);

    // Animate floating
    orb.userData.floatOffset = Math.random() * Math.PI * 2;
    orb.userData.floatSpeed = 0.5 + Math.random() * 1.5;
    orb.userData.baseY = y;
}

function addGroundStrip(parent, x1, z1, x2, z2, color) {
    const dx = x2 - x1, dz = z2 - z1;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);

    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, length), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25 }));
    strip.position.set((x1 + x2) / 2, 0.03, (z1 + z2) / 2);
    strip.rotation.y = angle;
    parent.add(strip);
}

function addFogVolume(parent, x, z, color, radius) {
    const fogSphere = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 16, 16),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.015, side: THREE.BackSide })
    );
    fogSphere.position.set(x, radius * 0.4, z);
    parent.add(fogSphere);
}
