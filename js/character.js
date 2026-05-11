import * as THREE from 'three';

// Build a low-poly character model from basic geometries
export function createCharacterModel(heroDef) {
    const group = new THREE.Group();
    const c = heroDef.colors;

    // Body
    const bodyMat = new THREE.MeshStandardMaterial({ color: c.body, roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 0.8), bodyMat);
    body.position.y = 2.2;
    body.castShadow = true;
    group.add(body);

    // Accent stripe on body
    const accentMat = new THREE.MeshStandardMaterial({ color: c.accent, roughness: 0.4 });
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.6, 0.82), accentMat);
    stripe.position.set(0.3, 2.2, 0);
    group.add(stripe);

    // Head
    const skinMat = new THREE.MeshStandardMaterial({ color: c.skin, roughness: 0.6 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), skinMat);
    head.position.y = 3.55;
    head.castShadow = true;
    group.add(head);

    // Hair
    const hairMat = new THREE.MeshStandardMaterial({ color: c.hair, roughness: 0.7 });
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.45, 0.95), hairMat);
    hair.position.y = 3.95;
    group.add(hair);

    // Special features per hero
    if (heroDef.id === 'gojo') {
        // Blindfold
        const blindMat = new THREE.MeshStandardMaterial({ color: c.blindfold, roughness: 0.3 });
        const blindfold = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.2, 0.92), blindMat);
        blindfold.position.y = 3.6;
        group.add(blindfold);
    } else if (heroDef.id === 'sukuna') {
        // Tattoo lines on face
        const tattooMat = new THREE.MeshStandardMaterial({ color: c.tattoo, roughness: 0.3 });
        const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.01), tattooMat);
        t1.position.set(-0.2, 3.5, 0.46);
        group.add(t1);
        const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.01), tattooMat);
        t2.position.set(0.2, 3.5, 0.46);
        group.add(t2);
        const t3 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.01), tattooMat);
        t3.position.set(0, 3.35, 0.46);
        group.add(t3);
        // Extra arms (small)
        const arm3 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.0, 0.35), bodyMat);
        arm3.position.set(-0.55, 2.6, -0.3);
        group.add(arm3);
        const arm4 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.0, 0.35), bodyMat);
        arm4.position.set(0.55, 2.6, -0.3);
        group.add(arm4);
    } else if (heroDef.id === 'yuji') {
        // Hood/collar
        const collarMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.5 });
        const collar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.3, 0.9), collarMat);
        collar.position.y = 3.05;
        group.add(collar);
    }

    // Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: heroDef.id === 'gojo' ? 0x4488ff : 0x111111 });
    [-0.18, 0.18].forEach(ex => {
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.02), eyeMat);
        eye.position.set(ex, 3.58, 0.46);
        group.add(eye);
        const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), pupilMat);
        pupil.position.set(ex, 3.58, 0.47);
        group.add(pupil);
    });

    // Arms
    const armMat = new THREE.MeshStandardMaterial({ color: c.body, roughness: 0.5 });
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, 0.4), armMat);
    leftArm.position.set(-0.8, 2.0, 0);
    leftArm.castShadow = true;
    leftArm.name = 'leftArm';
    group.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, 0.4), armMat);
    rightArm.position.set(0.8, 2.0, 0);
    rightArm.castShadow = true;
    rightArm.name = 'rightArm';
    group.add(rightArm);

    // Hands
    const handMat = new THREE.MeshStandardMaterial({ color: c.skin, roughness: 0.6 });
    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), handMat);
    leftHand.position.set(-0.8, 1.25, 0);
    group.add(leftHand);
    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), handMat);
    rightHand.position.set(0.8, 1.25, 0);
    group.add(rightHand);

    // Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.6 });
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.2, 0.5), legMat);
    leftLeg.position.set(-0.3, 0.6, 0);
    leftLeg.castShadow = true;
    leftLeg.name = 'leftLeg';
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.2, 0.5), legMat);
    rightLeg.position.set(0.3, 0.6, 0);
    rightLeg.castShadow = true;
    rightLeg.name = 'rightLeg';
    group.add(rightLeg);

    // Feet
    const footMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
    const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.2, 0.6), footMat);
    leftFoot.position.set(-0.3, 0.1, 0.05);
    group.add(leftFoot);
    const rightFoot = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.2, 0.6), footMat);
    rightFoot.position.set(0.3, 0.1, 0.05);
    group.add(rightFoot);

    group.castShadow = true;
    return group;
}

// Simple walk animation
export function animateCharacter(model, isMoving, dt, attackAnim) {
    const leftArm = model.getObjectByName('leftArm');
    const rightArm = model.getObjectByName('rightArm');
    const leftLeg = model.getObjectByName('leftLeg');
    const rightLeg = model.getObjectByName('rightLeg');

    if (!leftArm) return;

    if (attackAnim && attackAnim.active) {
        const t = attackAnim.progress;
        const swing = Math.sin(t * Math.PI) * 1.2;
        rightArm.rotation.x = -swing;
        leftArm.rotation.x = swing * 0.3;
        return;
    }

    if (isMoving) {
        const t = performance.now() * 0.008;
        const swing = Math.sin(t) * 0.6;
        leftArm.rotation.x = swing;
        rightArm.rotation.x = -swing;
        leftLeg.rotation.x = -swing * 0.5;
        rightLeg.rotation.x = swing * 0.5;
    } else {
        leftArm.rotation.x *= 0.9;
        rightArm.rotation.x *= 0.9;
        leftLeg.rotation.x *= 0.9;
        rightLeg.rotation.x *= 0.9;
    }
}
