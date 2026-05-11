import * as THREE from 'three';
import { createScene } from './scene.js';
import { buildArena } from './arena.js';
import { HEROES } from './heroes.js';
import { Entity } from './entity.js';
import { AbilitySystem } from './abilities.js';
import { EffectsManager } from './effects.js';
import { BotAI } from './bot.js';
import { UIManager } from './ui.js';
import { setupPostProcessing } from './postprocessing.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        const { renderer, scene, camera } = createScene(this.canvas);
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;

        // Post-processing
        const pp = setupPostProcessing(renderer, scene, camera);
        this.composer = pp.composer;
        this.bloomPass = pp.bloomPass;
        this.cursedPass = pp.cursedPass;

        this.effects = new EffectsManager(scene);
        this.abilities = new AbilitySystem(this.effects);
        this.ui = new UIManager();
        this.arenaData = null;

        this.player = null;
        this.entities = [];
        this.bots = [];

        this.clock = new THREE.Clock();
        this.gameActive = false;
        this.matchTimer = 300;
        this.isPaused = false;

        // FPS Input state
        this.keys = {};
        this.mouse = { dx: 0, dy: 0, lmb: false, rmb: false };
        this.cameraYaw = 0;
        this.cameraPitch = 0;
        this.pointerLocked = false;

        // Camera bob
        this.bobTimer = 0;
        this.bobIntensity = 0;

        // Hit effect timer
        this.hitFlashTimer = 0;

        // FPS arms model
        this.fpsArms = null;

        this.highlightRange = 25;

        this._setupInput();
        this._setupCallbacks();

        this.arenaData = buildArena(this.scene);
        this.previewMode = true;

        this._loop();
    }

    _setupInput() {
        document.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            if (this.gameActive && !this.isPaused) {
                if (e.code === 'KeyQ') this._useAbility('Q');
                if (e.code === 'KeyE') this._useAbility('E');
                if (e.code === 'KeyR') this._useAbility('R');
                if (e.code === 'KeyF') this._useAbility('F');
                if (e.code === 'Space') {
                    e.preventDefault();
                    if (this.player) this.player.jump();
                }
                if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this._dash();
            }
        });
        document.addEventListener('keyup', e => { this.keys[e.code] = false; });

        document.addEventListener('mousemove', e => {
            if (this.pointerLocked) {
                this.mouse.dx += e.movementX;
                this.mouse.dy += e.movementY;
            }
        });

        document.addEventListener('mousedown', e => {
            if (e.button === 0) {
                this.mouse.lmb = true;
                if (this.gameActive && !this.pointerLocked) this.canvas.requestPointerLock();
            }
            if (e.button === 2) {
                this.mouse.rmb = true;
                if (this.player) this.player.isBlocking = true;
            }
        });
        document.addEventListener('mouseup', e => {
            if (e.button === 0) this.mouse.lmb = false;
            if (e.button === 2) {
                this.mouse.rmb = false;
                if (this.player) this.player.isBlocking = false;
            }
        });
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('pointerlockchange', () => { this.pointerLocked = !!document.pointerLockElement; });
    }

    _setupCallbacks() {
        this.ui.onStart = (heroId, mode) => this.startGame(heroId, mode);
        this.ui.onBack = () => this.resetGame();
    }

    _createFPSArms(heroDef) {
        if (this.fpsArms) this.camera.remove(this.fpsArms);
        const arms = new THREE.Group();
        const c = heroDef.colors;

        const armMat = new THREE.MeshStandardMaterial({ color: c.body, roughness: 0.5, emissive: c.accent, emissiveIntensity: 0.1 });
        const skinMat = new THREE.MeshStandardMaterial({ color: c.skin, roughness: 0.6 });
        const glowMat = new THREE.MeshBasicMaterial({ color: c.accent, transparent: true, opacity: 0.3 });

        // Left arm
        const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 0.18), armMat);
        leftArm.position.set(-0.35, -0.35, -0.5);
        leftArm.rotation.x = -0.3;
        arms.add(leftArm);
        const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), skinMat);
        leftHand.position.set(-0.35, -0.55, -0.6);
        arms.add(leftHand);
        // Energy glow on left hand
        const leftGlow = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), glowMat);
        leftGlow.position.copy(leftHand.position);
        leftGlow.name = 'leftGlow';
        arms.add(leftGlow);

        // Right arm
        const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 0.18), armMat);
        rightArm.position.set(0.35, -0.35, -0.5);
        rightArm.rotation.x = -0.3;
        rightArm.name = 'rightArm';
        arms.add(rightArm);
        const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), skinMat);
        rightHand.position.set(0.35, -0.55, -0.6);
        rightHand.name = 'rightHand';
        arms.add(rightHand);
        // Energy on right
        const rightGlow = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), glowMat);
        rightGlow.position.copy(rightHand.position);
        rightGlow.name = 'rightGlow';
        arms.add(rightGlow);

        this.camera.add(arms);
        this.fpsArms = arms;
    }

    startGame(heroId, mode) {
        this.previewMode = false;
        this.entities.forEach(e => this.scene.remove(e.model));
        this.entities = [];
        this.bots = [];
        this.effects.clear();

        const heroDef = HEROES[heroId];

        // Player
        this.player = new Entity(heroDef, new THREE.Vector3(0, 0, 30), true);
        this.player.model.visible = false; // FPS: hide own model
        this.scene.add(this.player.model);
        this.entities.push(this.player);

        // FPS arms
        this._createFPSArms(heroDef);
        this.scene.add(this.camera);

        // Bots
        if (mode === 'training') this._spawnTrainingBots();
        else if (mode === 'deathmatch') this._spawnDeathmatchBot(heroId);
        else if (mode === 'boss') this._spawnBoss();

        this.matchTimer = 300;
        this.gameActive = true;
        this.cameraYaw = 0;
        this.cameraPitch = 0;
        this.ui.showHUD(heroDef);
        this.canvas.requestPointerLock();
    }

    _spawnTrainingBots() {
        const heroKeys = Object.keys(HEROES);
        const positions = [
            new THREE.Vector3(-20, 0, -20),
            new THREE.Vector3(20, 0, -20),
            new THREE.Vector3(0, 0, -40),
            new THREE.Vector3(-40, 0, 0),
            new THREE.Vector3(40, 0, 0),
        ];
        positions.forEach((pos, i) => {
            const heroDef = HEROES[heroKeys[i % heroKeys.length]];
            const bot = new Entity(heroDef, pos);
            this.scene.add(bot.model);
            this.entities.push(bot);
            this.bots.push(new BotAI(bot, 1));
        });
    }

    _spawnDeathmatchBot(playerHeroId) {
        const heroKeys = Object.keys(HEROES).filter(k => k !== playerHeroId);
        const heroDef = HEROES[heroKeys[Math.floor(Math.random() * heroKeys.length)]];
        const bot = new Entity(heroDef, new THREE.Vector3(0, 0, -30));
        this.scene.add(bot.model);
        this.entities.push(bot);
        this.bots.push(new BotAI(bot, 2));
    }

    _spawnBoss() {
        const bossDef = { ...HEROES.sukuna, hp: 400, name: 'BOSS: Ryomen Sukuna', speed: 5 };
        const boss = new Entity(bossDef, new THREE.Vector3(0, 0, -40));
        boss.model.scale.setScalar(2);
        this.scene.add(boss.model);
        this.entities.push(boss);
        this.bots.push(new BotAI(boss, 2));

        [HEROES.yuji, HEROES.gojo].forEach((h, i) => {
            const helper = new Entity(h, new THREE.Vector3(-12 + i * 24, 0, 20));
            this.scene.add(helper.model);
            this.entities.push(helper);
            this.bots.push(new BotAI(helper, 1));
        });
    }

    resetGame() {
        this.gameActive = false;
        this.previewMode = true;
        this.entities.forEach(e => this.scene.remove(e.model));
        this.entities = [];
        this.bots = [];
        this.player = null;
        if (this.fpsArms) { this.camera.remove(this.fpsArms); this.fpsArms = null; }
        this.effects.clear();
        this.ui.clearEntityBars();
        document.exitPointerLock();
    }

    _useAbility(key) {
        if (!this.player || this.player.isDead) return;
        const targets = this.entities.filter(e => e !== this.player);
        const lookDir = this._getLookDirection();
        const used = this.abilities.execute(this.player, key, targets, lookDir);
        if (used) {
            this.cursedPass.uniforms.pulseIntensity.value = 0.3;
        }
    }

    _dash() {
        if (!this.player) return;
        const dir = this._getMoveDirection();
        if (dir.lengthSq() > 0) {
            this.player.dash(dir);
            this.effects.spawnTrail(this.player.getPosition().clone().add(new THREE.Vector3(0, 1, 0)), this.player.heroDef.colors.accent);
            this.cursedPass.uniforms.aberrationAmount.value = 0.004;
            setTimeout(() => { this.cursedPass.uniforms.aberrationAmount.value = 0.001; }, 200);
        }
    }

    _getLookDirection() {
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), -this.cameraPitch);
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.cameraYaw);
        dir.normalize();
        return dir;
    }

    _getMoveDirection() {
        const dir = new THREE.Vector3();
        if (this.keys['KeyW']) dir.z -= 1;
        if (this.keys['KeyS']) dir.z += 1;
        if (this.keys['KeyA']) dir.x -= 1;
        if (this.keys['KeyD']) dir.x += 1;
        if (dir.lengthSq() === 0) return dir;
        dir.normalize();
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.cameraYaw);
        return dir;
    }

    _updatePlayerMovement(dt) {
        if (!this.player || this.player.isDead || this.player.isStunned) return;

        const moveDir = this._getMoveDirection();
        const isMoving = moveDir.lengthSq() > 0;

        if (isMoving && !this.player.isDashing) {
            this.player.model.position.add(moveDir.clone().multiplyScalar(this.player.speed * dt));
        }
        this.player.isMoving = isMoving;

        // Player always faces camera direction
        this.player.model.rotation.y = -this.cameraYaw;

        // Camera bob
        if (isMoving && this.player.isGrounded) {
            this.bobTimer += dt * 12;
            this.bobIntensity = THREE.MathUtils.lerp(this.bobIntensity, 0.04, dt * 5);
        } else {
            this.bobIntensity = THREE.MathUtils.lerp(this.bobIntensity, 0, dt * 8);
        }

        // Attack
        if (this.mouse.lmb && this.pointerLocked) {
            if (this.player.basicAttack()) {
                const { damage, isCrit } = this.player.getAttackDamage();
                const lookDir = this._getLookDirection();
                const pos = this.player.getPosition();

                // Animate FPS arm punch
                this._animatePunch();

                for (const target of this.entities) {
                    if (target === this.player || target.isDead) continue;
                    const dist = pos.distanceTo(target.getPosition());
                    if (dist > this.player.heroDef.attackRange) continue;
                    const toTarget = target.getPosition().clone().sub(pos).normalize();
                    if (toTarget.dot(lookDir) < 0.4) continue;

                    const actualDmg = target.takeDamage(damage, this.player, this.effects);
                    if (isCrit) this.effects.spawnBlackFlash(target.getPosition().clone().add(new THREE.Vector3(0, 2, 0)));

                    const screenPos = this.ui.worldToScreen(target.getPosition().clone().add(new THREE.Vector3(0, 3, 0)), this.camera);
                    if (screenPos.visible) this.ui.showDamageNumber(screenPos, actualDmg, isCrit ? 'crit' : 'normal');

                    this.cursedPass.uniforms.pulseIntensity.value = isCrit ? 0.2 : 0.08;
                    break;
                }

                if (this.player.heroDef.id === 'gojo') {
                    this.effects.spawnProjectile(pos.clone().add(new THREE.Vector3(0, 2.5, 0)).add(lookDir.clone()), lookDir, 0x4488ff, 40, 0.3, 1.5);
                }
            }
        }
    }

    _animatePunch() {
        if (!this.fpsArms) return;
        const rightArm = this.fpsArms.getObjectByName('rightArm');
        const rightHand = this.fpsArms.getObjectByName('rightHand');
        const rightGlow = this.fpsArms.getObjectByName('rightGlow');
        if (!rightArm) return;

        // Quick forward punch animation
        const origX = rightArm.rotation.x;
        rightArm.rotation.x = -1.2;
        if (rightGlow) rightGlow.scale.setScalar(3);

        setTimeout(() => {
            rightArm.rotation.x = origX;
            if (rightGlow) rightGlow.scale.setScalar(1);
        }, 150);
    }

    _updateCamera(dt) {
        if (this.previewMode) {
            const t = performance.now() * 0.00015;
            this.camera.position.set(Math.sin(t) * 60, 20, Math.cos(t) * 60);
            this.camera.lookAt(0, 5, 0);
            return;
        }
        if (!this.player) return;

        // Mouse look — lower sensitivity, clamped pitch
        const sensitivity = 0.0015;
        this.cameraYaw += this.mouse.dx * sensitivity;
        this.cameraPitch = Math.max(-1.0, Math.min(1.0, this.cameraPitch + this.mouse.dy * sensitivity));
        this.mouse.dx = 0;
        this.mouse.dy = 0;

        // FPS camera at player's head
        const playerPos = this.player.getPosition();
        const eyeHeight = 2.8;

        // Minimal camera bob (subtle)
        const bobX = Math.sin(this.bobTimer) * this.bobIntensity * 0.3;
        const bobY = Math.abs(Math.cos(this.bobTimer)) * this.bobIntensity * 0.5;

        const targetX = playerPos.x + bobX;
        const targetY = playerPos.y + eyeHeight + bobY;
        const targetZ = playerPos.z;

        // Smooth camera follow
        this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetX, 0.3);
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetY, 0.3);
        this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetZ, 0.3);

        // Camera rotation
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = -this.cameraYaw;
        this.camera.rotation.x = -this.cameraPitch;
    }

    _updateBots(dt) {
        for (const bot of this.bots) {
            const targets = this.entities.filter(e => e !== bot.entity);
            bot.update(dt, targets, this.abilities, this.arenaData);
        }
    }

    _updateEntities(dt) {
        for (const entity of this.entities) {
            entity.update(dt, this.arenaData);

            if (entity.isDead) {
                entity.respawnTimer -= dt;
                if (entity !== this.player) entity.model.visible = false;

                if (entity === this.player) {
                    this.ui.showDeath();
                    this.ui.updateRespawnCount(Math.ceil(entity.respawnTimer));
                }

                if (entity.respawnTimer <= 0) {
                    const spawnPos = new THREE.Vector3((Math.random() - 0.5) * 40, 0, (Math.random() - 0.5) * 40);
                    entity.respawn(spawnPos);
                    if (entity !== this.player) entity.model.visible = true;
                    if (entity === this.player) this.ui.hideDeath();
                }
            }
        }

        // Kill feed
        for (const entity of this.entities) {
            if (entity.isDead && entity.respawnTimer >= 2.9) {
                const killer = this.entities.find(e => e.kills > 0 && e !== entity);
                if (killer) this.ui.addKillFeed(killer.heroDef.name, entity.heroDef.name);
            }
        }

        // Gojo passive
        if (this.player && this.player.heroDef.id === 'gojo') {
            for (const entity of this.entities) {
                if (entity === this.player || entity.isDead) continue;
                const dist = this.player.distanceTo(entity);
                entity.model.traverse(child => {
                    if (child.isMesh && child.material) {
                        if (dist < this.highlightRange) {
                            child.material.emissive = new THREE.Color(0x4488ff);
                            child.material.emissiveIntensity = 0.2 * (1 - dist / this.highlightRange);
                        } else if (child.material.emissive) {
                            child.material.emissiveIntensity = 0;
                        }
                    }
                });
            }
        }

        // Hit indicator
        if (this.player && !this.player.isDead) {
            const prevHp = this.player._prevHp || this.player.hp;
            if (this.player.hp < prevHp) {
                this.ui.showHitIndicator();
                this.hitFlashTimer = 0.3;
                this.cursedPass.uniforms.aberrationAmount.value = 0.003;
            }
            this.player._prevHp = this.player.hp;
        }
    }

    _updatePostProcessing(dt) {
        const time = performance.now() * 0.001;
        this.cursedPass.uniforms.time.value = time;

        // Decay pulse
        this.cursedPass.uniforms.pulseIntensity.value *= 0.9;
        if (this.cursedPass.uniforms.aberrationAmount.value > 0.001) {
            this.cursedPass.uniforms.aberrationAmount.value = THREE.MathUtils.lerp(this.cursedPass.uniforms.aberrationAmount.value, 0.001, dt * 5);
        }

        // Hit flash
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= dt;
            this.cursedPass.uniforms.hitFlash.value = this.hitFlashTimer / 0.3;
        } else {
            this.cursedPass.uniforms.hitFlash.value = 0;
        }

        // Energy tint based on hero
        if (this.player) {
            const c = this.player.heroDef.colors.accent;
            const r = ((c >> 16) & 0xff) / 255;
            const g = ((c >> 8) & 0xff) / 255;
            const b = (c & 0xff) / 255;
            this.cursedPass.uniforms.tintColor.value.set(r * 0.2, g * 0.2, b * 0.2);

            // Low HP: tighten vignette slightly
            if (this.player.hp < this.player.maxHp * 0.25) {
                this.cursedPass.uniforms.vignetteAmount.value = 0.7;
            } else {
                this.cursedPass.uniforms.vignetteAmount.value = 0.5;
            }

            // Blocking visual
            if (this.player.isBlocking) {
                this.cursedPass.uniforms.tintColor.value.set(0.05, 0.1, 0.25);
            }
        }
    }

    _updateMatch(dt) {
        if (!this.gameActive) return;
        this.matchTimer -= dt;
        this.ui.updateTimer(Math.max(0, this.matchTimer));

        const enemyKills = this.entities.filter(e => e !== this.player).reduce((sum, e) => sum + e.kills, 0);
        this.ui.updateEnemyScore(enemyKills);

        if (this.matchTimer <= 0) {
            const playerKills = this.player ? this.player.kills : 0;
            const won = playerKills > enemyKills;
            this.ui.showResult(won, {
                kills: playerKills,
                deaths: this.player ? this.player.deaths : 0,
                damage: this.player ? Math.floor(this.player.damageDealt) : 0
            });
            this.gameActive = false;
            document.exitPointerLock();
        }
    }

    _loop() {
        requestAnimationFrame(() => this._loop());
        const dt = Math.min(this.clock.getDelta(), 0.05);

        this._updateCamera(dt);

        if (this.gameActive) {
            this._updatePlayerMovement(dt);
            this._updateBots(dt);
            this._updateEntities(dt);
            this.effects.update(dt);
            this.abilities.update(dt, this.entities);
            this._updateMatch(dt);
            this._updatePostProcessing(dt);

            if (this.player) {
                this.ui.updateHUD(this.player);
                for (const entity of this.entities) {
                    if (entity !== this.player) this.ui.updateEntityBar(entity, this.camera);
                }
            }
        }

        // Render with post-processing
        this.composer.render();
    }
}

const game = new Game();
