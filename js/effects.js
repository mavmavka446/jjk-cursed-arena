import * as THREE from 'three';

export class EffectsManager {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.projectiles = [];
        this.zones = [];
        this.trails = [];
    }

    update(dt) {
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                this.particles.splice(i, 1);
                continue;
            }
            p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
            p.velocity.y -= p.gravity * dt;
            const alpha = p.life / p.maxLife;
            p.mesh.material.opacity = alpha;
            p.mesh.scale.setScalar(p.size * alpha);
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.life -= dt;
            if (proj.life <= 0) {
                this.scene.remove(proj.mesh);
                this.projectiles.splice(i, 1);
                continue;
            }
            proj.mesh.position.add(proj.velocity.clone().multiplyScalar(dt));
            proj.mesh.rotation.x += dt * 3;
            proj.mesh.rotation.z += dt * 2;
        }

        // Update zones
        for (let i = this.zones.length - 1; i >= 0; i--) {
            const z = this.zones[i];
            z.life -= dt;
            if (z.life <= 0) {
                this.scene.remove(z.mesh);
                this.zones.splice(i, 1);
                continue;
            }
            const alpha = Math.min(1, z.life / z.maxLife * 2);
            z.mesh.material.opacity = alpha * 0.3;
            z.mesh.rotation.y += dt * 2;
            if (z.pulseScale) {
                const pulse = 1 + Math.sin(performance.now() * 0.005) * 0.1;
                z.mesh.scale.setScalar(pulse);
            }
        }

        // Update trails
        for (let i = this.trails.length - 1; i >= 0; i--) {
            const t = this.trails[i];
            t.life -= dt;
            if (t.life <= 0) {
                this.scene.remove(t.mesh);
                this.trails.splice(i, 1);
                continue;
            }
            t.mesh.material.opacity = t.life / t.maxLife * 0.6;
        }
    }

    spawnParticles(position, color, count, spread, speed, size, lifetime) {
        for (let i = 0; i < count; i++) {
            const geo = new THREE.SphereGeometry(0.1, 4, 4);
            const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(position).add(new THREE.Vector3(
                (Math.random() - 0.5) * spread,
                (Math.random() - 0.5) * spread,
                (Math.random() - 0.5) * spread
            ));
            this.scene.add(mesh);
            this.particles.push({
                mesh,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * speed,
                    Math.random() * speed * 0.8 + speed * 0.2,
                    (Math.random() - 0.5) * speed
                ),
                gravity: 6,
                life: lifetime || 1,
                maxLife: lifetime || 1,
                size: size || 1
            });
        }
    }

    spawnProjectile(position, direction, color, speed, size, lifetime) {
        const geo = new THREE.SphereGeometry(size || 0.5, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        this.scene.add(mesh);

        // Glow
        const glowGeo = new THREE.SphereGeometry((size || 0.5) * 2, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2 });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        mesh.add(glow);

        this.projectiles.push({
            mesh,
            velocity: direction.clone().normalize().multiplyScalar(speed || 30),
            life: lifetime || 2,
            maxLife: lifetime || 2,
            color
        });
        return this.projectiles[this.projectiles.length - 1];
    }

    spawnZone(position, radius, color, duration, pulseScale) {
        const geo = new THREE.CylinderGeometry(radius, radius, 0.3, 32);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        mesh.position.y = 0.2;
        this.scene.add(mesh);

        // Ring
        const ringGeo = new THREE.TorusGeometry(radius, 0.15, 8, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.1;
        mesh.add(ring);

        // Vertical beams
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const beamGeo = new THREE.BoxGeometry(0.1, 4, 0.1);
            const beamMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15 });
            const beam = new THREE.Mesh(beamGeo, beamMat);
            beam.position.set(Math.cos(angle) * radius * 0.9, 2, Math.sin(angle) * radius * 0.9);
            mesh.add(beam);
        }

        this.zones.push({ mesh, life: duration, maxLife: duration, radius, color, position: position.clone(), pulseScale });
        return this.zones[this.zones.length - 1];
    }

    spawnSlash(position, direction, color, width, height) {
        const geo = new THREE.PlaneGeometry(width || 4, height || 0.3);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        mesh.position.y = 2;
        mesh.lookAt(position.clone().add(direction));
        this.scene.add(mesh);
        this.trails.push({ mesh, life: 0.4, maxLife: 0.4 });

        this.spawnParticles(position, color, 8, 2, 4, 0.8, 0.5);
    }

    spawnExplosion(position, color, radius) {
        this.spawnParticles(position, color, 30, radius, 8, 1.2, 1.5);

        const geo = new THREE.SphereGeometry(radius * 0.3, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        this.scene.add(mesh);
        this.zones.push({ mesh, life: 0.5, maxLife: 0.5, radius: 0, color, position: position.clone() });
    }

    spawnTrail(position, color) {
        const geo = new THREE.SphereGeometry(0.15, 4, 4);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        this.scene.add(mesh);
        this.trails.push({ mesh, life: 0.3, maxLife: 0.3 });
    }

    spawnBlackFlash(position) {
        this.spawnParticles(position, 0x000000, 15, 1.5, 6, 1.5, 0.8);
        this.spawnParticles(position, 0xffaa00, 10, 1, 8, 1, 0.6);
        this.spawnParticles(position, 0xffffff, 5, 0.5, 10, 0.5, 0.4);

        const flashGeo = new THREE.SphereGeometry(2, 16, 16);
        const flashMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 });
        const flash = new THREE.Mesh(flashGeo, flashMat);
        flash.position.copy(position);
        this.scene.add(flash);
        this.zones.push({ mesh: flash, life: 0.3, maxLife: 0.3 });
    }

    spawnSphere(position, radius, color, duration) {
        const geo = new THREE.SphereGeometry(radius, 32, 32);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, side: THREE.DoubleSide, wireframe: true });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        this.scene.add(mesh);

        const innerGeo = new THREE.SphereGeometry(radius * 0.95, 32, 32);
        const innerMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.1, side: THREE.DoubleSide });
        const inner = new THREE.Mesh(innerGeo, innerMat);
        mesh.add(inner);

        this.zones.push({ mesh, life: duration, maxLife: duration, radius, color, position: position.clone(), pulseScale: true });
        return this.zones[this.zones.length - 1];
    }

    spawnCage(position, radius, color, duration) {
        const group = new THREE.Group();
        group.position.copy(position);

        // Bars
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const barGeo = new THREE.BoxGeometry(0.1, 8, 0.1);
            const barMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });
            const bar = new THREE.Mesh(barGeo, barMat);
            bar.position.set(Math.cos(angle) * radius, 4, Math.sin(angle) * radius);
            group.add(bar);
        }

        // Top and bottom rings
        [0.1, 8].forEach(y => {
            const ringGeo = new THREE.TorusGeometry(radius, 0.12, 8, 32);
            const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.y = y;
            group.add(ring);
        });

        this.scene.add(group);
        this.zones.push({ mesh: group, life: duration, maxLife: duration, radius, color, position: position.clone(), pulseScale: true });
        return this.zones[this.zones.length - 1];
    }

    clear() {
        [...this.particles, ...this.projectiles, ...this.zones, ...this.trails].forEach(p => {
            this.scene.remove(p.mesh);
        });
        this.particles = [];
        this.projectiles = [];
        this.zones = [];
        this.trails = [];
    }
}
