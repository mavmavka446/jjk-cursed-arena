import * as THREE from 'three';
import { createScene } from './scene.js';
import { buildArena } from './arena.js';
import { HEROES } from './heroes.js';
import { Entity } from './entity.js';
import { AbilitySystem } from './abilities.js';
import { EffectsManager } from './effects.js';
import { BotAI } from './bot.js';
import { UIManager } from './ui.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        const { renderer, scene, camera } = createScene(this.canvas);
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;

        this.effects = new EffectsManager(scene);
        this.abilities = new AbilitySystem(this.effects);
        this.ui = new UIManager();
        this.arenaData = null;

        this.player = null;
        this.entities = [];
        this.bots = [];

        this.clock = new THREE.Clock();
        this.gameActive = false;
        this.matchTimer = 300; // 5 minutes
        this.isPaused = false;

        // Input state
        this.keys = {};
        this.mouse = { x: 0, y: 0, dx: 0, dy: 0, lmb: false, rmb: false };
        this.cameraYaw = 0;
        this.cameraPitch = 0.3;
        this.cameraDistance = 10;
        this.pointerLocked = false;

        // Gojo passive - highlight range
        this.highlightRange = 20;

        this._setupInput();
        this._setupCallbacks();

        // Build arena in background for hero select screen bg
        this.arenaData = buildArena(this.scene);

        // Preview camera rotation
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
                if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                    this._dash();
                }
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
                if (this.gameActive && !this.pointerLocked) {
                    this.canvas.requestPointerLock();
                }
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

        document.addEventListener('pointerlockchange', () => {
            this.pointerLocked = !!document.pointerLockElement;
        });

        document.addEventListener('wheel', e => {
            this.cameraDistance = Math.max(4, Math.min(20, this.cameraDistance + e.deltaY * 0.01));
        });
    }

    _setupCallbacks() {
        this.ui.onStart = (heroId, mode) => this.startGame(heroId, mode);
        this.ui.onBack = () => this.resetGame();
    }

    startGame(heroId, mode) {
        this.previewMode = false;

        // Clear any existing entities
        this.entities.forEach(e => this.scene.remove(e.model));
        this.entities = [];
        this.bots = [];
        this.effects.clear();

        const heroDef = HEROES[heroId];

        // Create player
        this.player = new Entity(heroDef, new THREE.Vector3(0, 0, 15), true);
        this.scene.add(this.player.model);
        this.entities.push(this.player);

        // Create bots based on mode
        if (mode === 'training') {
            this._spawnTrainingBots();
        } else if (mode === 'deathmatch') {
            this._spawnDeathmatchBot(heroId);
        } else if (mode === 'boss') {
            this._spawnBoss();
        }

        this.matchTimer = 300;
        this.gameActive = true;
        this.ui.showHUD(heroDef);

        // Lock pointer
        this.canvas.requestPointerLock();
    }

    _spawnTrainingBots() {
        const heroKeys = Object.keys(HEROES);
        const positions = [
            new THREE.Vector3(-10, 0, -10),
            new THREE.Vector3(10, 0, -10),
            new THREE.Vector3(0, 0, -20),
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
        const bot = new Entity(heroDef, new THREE.Vector3(0, 0, -15));
        this.scene.add(bot.model);
        this.entities.push(bot);
        this.bots.push(new BotAI(bot, 2));
    }

    _spawnBoss() {
        // Boss Sukuna with 3x HP
        const bossDef = { ...HEROES.sukuna, hp: 300, name: 'БОСС: Сукуна', speed: 5 };
        const boss = new Entity(bossDef, new THREE.Vector3(0, 0, -20));
        boss.model.scale.setScalar(1.8);
        this.scene.add(boss.model);
        this.entities.push(boss);
        this.bots.push(new BotAI(boss, 2));

        // Helper bots
        const helpers = [
            new Entity(HEROES.yuji, new THREE.Vector3(-8, 0, 10)),
            new Entity(HEROES.gojo, new THREE.Vector3(8, 0, 10)),
        ];
        helpers.forEach(h => {
            this.scene.add(h.model);
            this.entities.push(h);
            const ai = new BotAI(h, 1);
            this.bots.push(ai);
        });
    }

    resetGame() {
        this.gameActive = false;
        this.previewMode = true;
        this.entities.forEach(e => this.scene.remove(e.model));
        this.entities = [];
        this.bots = [];
        this.player = null;
        this.effects.clear();
        this.ui.clearEntityBars();
        document.exitPointerLock();
    }

    _useAbility(key) {
        if (!this.player || this.player.isDead) return;
        const targets = this.entities.filter(e => e !== this.player);
        const lookDir = this._getLookDirection();
        this.abilities.execute(this.player, key, targets, lookDir);
    }

    _dash() {
        if (!this.player) return;
        const dir = this._getMoveDirection();
        if (dir.lengthSq() > 0) {
            this.player.dash(dir);
            this.effects.spawnTrail(this.player.getPosition().clone().add(new THREE.Vector3(0, 1, 0)), 0xffaa33);
        }
    }

    _getLookDirection() {
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.cameraYaw);
        dir.y = -Math.sin(this.cameraPitch);
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
            this.player.model.position.add(moveDir.multiplyScalar(this.player.speed * dt));
            // Rotate model to face movement direction
            const angle = Math.atan2(moveDir.x, moveDir.z);
            this.player.model.rotation.y = angle;
        }
        this.player.isMoving = isMoving;

        // Basic attack on LMB
        if (this.mouse.lmb && this.pointerLocked) {
            if (this.player.basicAttack()) {
                const { damage, isCrit } = this.player.getAttackDamage();
                const lookDir = this._getLookDirection();
                const pos = this.player.getPosition();

                // Find target in attack range
                for (const target of this.entities) {
                    if (target === this.player || target.isDead) continue;
                    const dist = pos.distanceTo(target.getPosition());
                    if (dist > this.player.heroDef.attackRange) continue;
                    const toTarget = target.getPosition().clone().sub(pos).normalize();
                    if (toTarget.dot(lookDir) < 0.4) continue;

                    const actualDmg = target.takeDamage(damage, this.player, this.effects);

                    if (isCrit) {
                        this.effects.spawnBlackFlash(target.getPosition().clone().add(new THREE.Vector3(0, 2, 0)));
                    }

                    // Damage number
                    const screenPos = this.ui.worldToScreen(
                        target.getPosition().clone().add(new THREE.Vector3(0, 3, 0)),
                        this.camera
                    );
                    if (screenPos.visible) {
                        this.ui.showDamageNumber(screenPos, actualDmg, isCrit ? 'crit' : 'normal');
                    }
                    break;
                }

                // Ranged attack for Gojo
                if (this.player.heroDef.id === 'gojo') {
                    this.effects.spawnProjectile(
                        pos.clone().add(new THREE.Vector3(0, 2, 0)).add(lookDir.clone().multiplyScalar(1)),
                        lookDir, 0x4488ff, 30, 0.2, 1
                    );
                }
            }
        }
    }

    _updateCamera() {
        if (this.previewMode) {
            const t = performance.now() * 0.0002;
            this.camera.position.set(Math.sin(t) * 30, 15, Math.cos(t) * 30);
            this.camera.lookAt(0, 3, 0);
            return;
        }

        if (!this.player) return;

        // Mouse look
        const sensitivity = 0.003;
        this.cameraYaw += this.mouse.dx * sensitivity;
        this.cameraPitch = Math.max(-0.5, Math.min(1.2, this.cameraPitch + this.mouse.dy * sensitivity));
        this.mouse.dx = 0;
        this.mouse.dy = 0;

        // Third person camera
        const playerPos = this.player.getPosition();
        const offset = new THREE.Vector3(
            Math.sin(this.cameraYaw) * this.cameraDistance,
            this.cameraDistance * 0.5 + this.cameraPitch * 3,
            Math.cos(this.cameraYaw) * this.cameraDistance
        );

        const targetCamPos = playerPos.clone().add(offset);
        this.camera.position.lerp(targetCamPos, 0.1);
        this.camera.lookAt(playerPos.clone().add(new THREE.Vector3(0, 2.5, 0)));

        // Rotate player to camera forward when attacking
        if (this.mouse.lmb) {
            const lookDir = this._getLookDirection();
            const angle = Math.atan2(lookDir.x, lookDir.z);
            this.player.model.rotation.y = angle;
        }
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

            // Respawn
            if (entity.isDead) {
                entity.respawnTimer -= dt;
                entity.model.visible = false;

                if (entity === this.player) {
                    this.ui.showDeath();
                    this.ui.updateRespawnCount(Math.ceil(entity.respawnTimer));
                }

                if (entity.respawnTimer <= 0) {
                    const spawnPos = new THREE.Vector3(
                        (Math.random() - 0.5) * 20,
                        0,
                        (Math.random() - 0.5) * 20
                    );
                    entity.respawn(spawnPos);
                    if (entity === this.player) {
                        this.ui.hideDeath();
                    }
                }
            }
        }

        // Check kills for kill feed
        for (const entity of this.entities) {
            if (entity.isDead && entity.respawnTimer >= 2.9) {
                // Find killer
                const killer = this.entities.find(e => e.kills > 0 && e !== entity);
                if (killer) {
                    this.ui.addKillFeed(killer.heroDef.name, entity.heroDef.name);
                }
            }
        }

        // Gojo passive: highlight nearby enemies
        if (this.player && this.player.heroDef.id === 'gojo') {
            for (const entity of this.entities) {
                if (entity === this.player || entity.isDead) continue;
                const dist = this.player.distanceTo(entity);
                if (dist < this.highlightRange) {
                    // Add glow effect
                    entity.model.traverse(child => {
                        if (child.isMesh && child.material) {
                            child.material.emissive = new THREE.Color(0x4488ff);
                            child.material.emissiveIntensity = 0.15 * (1 - dist / this.highlightRange);
                        }
                    });
                } else {
                    entity.model.traverse(child => {
                        if (child.isMesh && child.material && child.material.emissive) {
                            child.material.emissiveIntensity = 0;
                        }
                    });
                }
            }
        }

        // Track damage dealt for player hit indicator
        if (this.player && !this.player.isDead) {
            const prevHp = this.player._prevHp || this.player.hp;
            if (this.player.hp < prevHp) {
                this.ui.showHitIndicator();
            }
            this.player._prevHp = this.player.hp;
        }
    }

    _updateMatch(dt) {
        if (!this.gameActive) return;

        this.matchTimer -= dt;
        this.ui.updateTimer(Math.max(0, this.matchTimer));

        // Enemy total kills
        const enemyKills = this.entities
            .filter(e => e !== this.player)
            .reduce((sum, e) => sum + e.kills, 0);
        this.ui.updateEnemyScore(enemyKills);

        // Match end
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

        this._updateCamera();

        if (this.gameActive) {
            this._updatePlayerMovement(dt);
            this._updateBots(dt);
            this._updateEntities(dt);
            this.effects.update(dt);
            this.abilities.update(dt, this.entities);
            this._updateMatch(dt);

            if (this.player) {
                this.ui.updateHUD(this.player);
                // Update entity overhead bars
                for (const entity of this.entities) {
                    if (entity !== this.player) {
                        this.ui.updateEntityBar(entity, this.camera);
                    }
                }
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Start
const game = new Game();
