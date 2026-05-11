import * as THREE from 'three';

export function buildArena(scene) {
    const arena = new THREE.Group();

    // Ground
    const groundGeo = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.8 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    arena.add(ground);

    // Grid lines on ground
    const gridGeo = new THREE.PlaneGeometry(80, 80);
    const gridMat = new THREE.MeshBasicMaterial({
        color: 0x334455, wireframe: true, transparent: true, opacity: 0.15
    });
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = 0.01;
    arena.add(grid);

    // Arena walls (invisible colliders + visible low walls)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.5 });
    const wallH = 6, wallT = 1;
    const walls = [
        { pos: [0, wallH/2, -40], size: [80, wallH, wallT] },
        { pos: [0, wallH/2, 40], size: [80, wallH, wallT] },
        { pos: [-40, wallH/2, 0], size: [wallT, wallH, 80] },
        { pos: [40, wallH/2, 0], size: [wallT, wallH, 80] },
    ];
    const colliders = [];
    walls.forEach(w => {
        const geo = new THREE.BoxGeometry(...w.size);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.set(...w.pos);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        arena.add(mesh);
        colliders.push({ min: new THREE.Vector3(w.pos[0]-w.size[0]/2, 0, w.pos[2]-w.size[2]/2), max: new THREE.Vector3(w.pos[0]+w.size[0]/2, w.size[1], w.pos[2]+w.size[2]/2) });
    });

    // School building (center-back)
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3e, roughness: 0.6 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2e, roughness: 0.5 });
    addBuilding(arena, colliders, 0, -25, 16, 10, 10, buildingMat, roofMat);

    // Side structures
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x333355, roughness: 0.4 });
    addPillar(arena, colliders, -18, 0, pillarMat);
    addPillar(arena, colliders, 18, 0, pillarMat);
    addPillar(arena, colliders, -10, 15, pillarMat);
    addPillar(arena, colliders, 10, 15, pillarMat);
    addPillar(arena, colliders, -10, -10, pillarMat);
    addPillar(arena, colliders, 10, -10, pillarMat);

    // Cover blocks
    const coverMat = new THREE.MeshStandardMaterial({ color: 0x2e2e44, roughness: 0.7 });
    addCover(arena, colliders, -25, -15, 4, 2, 3, coverMat);
    addCover(arena, colliders, 25, -15, 4, 2, 3, coverMat);
    addCover(arena, colliders, -25, 15, 3, 1.5, 6, coverMat);
    addCover(arena, colliders, 25, 15, 3, 1.5, 6, coverMat);
    addCover(arena, colliders, 0, 8, 6, 1.5, 2, coverMat);

    // Torii gate (decorative)
    addTorii(arena, 0, 25, 0xff2244);

    // Lanterns (decorative with lights)
    addLantern(arena, -12, -20, 0xff6633);
    addLantern(arena, 12, -20, 0xff6633);
    addLantern(arena, -30, 0, 0x4488ff);
    addLantern(arena, 30, 0, 0x4488ff);

    // Trees (low-poly)
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const r = 32 + Math.random() * 5;
        addTree(arena, Math.cos(angle) * r, Math.sin(angle) * r);
    }

    scene.add(arena);
    return { colliders, bounds: { min: -39, max: 39 } };
}

function addBuilding(parent, colliders, x, z, w, h, d, mat, roofMat) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h/2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);

    const roofGeo = new THREE.ConeGeometry(w * 0.75, 4, 4);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(x, h + 2, z);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    parent.add(roof);

    // Windows
    const winMat = new THREE.MeshBasicMaterial({ color: 0xffaa44 });
    for (let wx = -2; wx <= 2; wx += 2) {
        for (let wy = 0; wy < 2; wy++) {
            const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), winMat);
            win.position.set(x + wx * 1.5, 3 + wy * 3.5, z + d/2 + 0.01);
            parent.add(win);
        }
    }

    colliders.push({
        min: new THREE.Vector3(x - w/2, 0, z - d/2),
        max: new THREE.Vector3(x + w/2, h, z + d/2)
    });
}

function addPillar(parent, colliders, x, z, mat) {
    const geo = new THREE.CylinderGeometry(0.8, 0.8, 5, 8);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 2.5, z);
    mesh.castShadow = true;
    parent.add(mesh);

    const capGeo = new THREE.BoxGeometry(2.4, 0.4, 2.4);
    const cap = new THREE.Mesh(capGeo, mat);
    cap.position.set(x, 5.2, z);
    parent.add(cap);

    colliders.push({
        min: new THREE.Vector3(x - 1, 0, z - 1),
        max: new THREE.Vector3(x + 1, 5, z + 1)
    });
}

function addCover(parent, colliders, x, z, w, h, d, mat) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h/2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    colliders.push({
        min: new THREE.Vector3(x - w/2, 0, z - d/2),
        max: new THREE.Vector3(x + w/2, h, z + d/2)
    });
}

function addTorii(parent, x, z, color) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
    const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 8, 8), mat);
    pillarL.position.set(x - 4, 4, z);
    parent.add(pillarL);
    const pillarR = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 8, 8), mat);
    pillarR.position.set(x + 4, 4, z);
    parent.add(pillarR);
    const beam1 = new THREE.Mesh(new THREE.BoxGeometry(10, 0.6, 0.6), mat);
    beam1.position.set(x, 7.5, z);
    parent.add(beam1);
    const beam2 = new THREE.Mesh(new THREE.BoxGeometry(9, 0.4, 0.5), mat);
    beam2.position.set(x, 6.5, z);
    parent.add(beam2);
}

function addLantern(parent, x, z, color) {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3, 6), poleMat);
    pole.position.set(x, 1.5, z);
    parent.add(pole);

    const lampMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), lampMat);
    lamp.position.set(x, 3.2, z);
    parent.add(lamp);

    const light = new THREE.PointLight(color, 0.5, 12);
    light.position.set(x, 3.5, z);
    parent.add(light);
}

function addTree(parent, x, z) {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 3, 6), trunkMat);
    trunk.position.set(x, 1.5, z);
    trunk.castShadow = true;
    parent.add(trunk);

    const leafMat = new THREE.MeshStandardMaterial({ color: 0x1a4a2a });
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(2.5, 5, 6), leafMat);
    leaves.position.set(x, 5.5, z);
    leaves.castShadow = true;
    parent.add(leaves);

    const leaves2 = new THREE.Mesh(new THREE.ConeGeometry(1.8, 3.5, 6), leafMat);
    leaves2.position.set(x, 7.5, z);
    leaves2.castShadow = true;
    parent.add(leaves2);
}
