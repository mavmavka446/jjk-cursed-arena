import * as THREE from 'three';
import { createCharacterModel, animateCharacter } from './character.js';
import { HEROES } from './heroes.js';

export class Entity {
    constructor(heroDef, position, isPlayer = false) {
        this.heroDef = heroDef;
        this.isPlayer = isPlayer;
        this.model = createCharacterModel(heroDef);
        this.model.position.copy(position);

        this.hp = heroDef.hp;
        this.maxHp = heroDef.hp;
        this.energy = 100;
        this.maxEnergy = 100;
        this.speed = heroDef.speed;
        this.baseSpeed = heroDef.speed;

        this.velocity = new THREE.Vector3();
        this.isMoving = false;
        this.isBlocking = false;
        this.isDead = false;
        this.isStunned = false;
        this.stunTimer = 0;

        this.attackAnim = { active: false, progress: 0 };
        this.attackTimer = 0;
        this.hitCount = 0; // for Yuji passive

        this.cooldowns = { Q: 0, E: 0, R: 0, F: 0 };
        this.activeBuffs = [];

        // Dash
        this.dashCooldown = 0;
        this.dashMaxCooldown = 2;
        this.isDashing = false;
        this.dashTimer = 0;
        this.dashDirection = new THREE.Vector3();

        // Jump
        this.isGrounded = true;
        this.jumpVelocity = 0;
        this.jumpsLeft = 2;

        // Stats
        this.kills = 0;
        this.deaths = 0;
        this.damageDealt = 0;

        // Active ability effects
        this.bloodlustActive = false;
        this.fightingActive = false;
        this.fightingTimer = 0;
        this.cageZone = null;

        // Respawn
        this.respawnTimer = 0;
    }

    update(dt, arenaData) {
        if (this.isDead) return;

        // Stun
        if (this.isStunned) {
            this.stunTimer -= dt;
            if (this.stunTimer <= 0) {
                this.isStunned = false;
            }
            return;
        }

        // Cooldowns
        for (const key of ['Q', 'E', 'R', 'F']) {
            if (this.cooldowns[key] > 0) this.cooldowns[key] = Math.max(0, this.cooldowns[key] - dt);
        }

        // Energy regen
        this.energy = Math.min(this.maxEnergy, this.energy + 5 * dt);

        // Dash cooldown
        if (this.dashCooldown > 0) this.dashCooldown = Math.max(0, this.dashCooldown - dt);

        // Dash movement
        if (this.isDashing) {
            this.dashTimer -= dt;
            if (this.dashTimer <= 0) {
                this.isDashing = false;
            } else {
                this.model.position.add(this.dashDirection.clone().multiplyScalar(25 * dt));
            }
        }

        // Jump / gravity
        if (!this.isGrounded) {
            this.jumpVelocity -= 25 * dt;
            this.model.position.y += this.jumpVelocity * dt;
            if (this.model.position.y <= 0) {
                this.model.position.y = 0;
                this.isGrounded = true;
                this.jumpsLeft = 2;
                this.jumpVelocity = 0;
            }
        }

        // Buff timers
        if (this.fightingActive) {
            this.fightingTimer -= dt;
            this.hp = Math.min(this.maxHp, this.hp + 4 * dt);
            if (this.fightingTimer <= 0) {
                this.fightingActive = false;
                this.speed = this.baseSpeed;
            }
        }

        // Attack animation
        if (this.attackAnim.active) {
            this.attackAnim.progress += dt * 4;
            if (this.attackAnim.progress >= 1) {
                this.attackAnim.active = false;
                this.attackAnim.progress = 0;
            }
        }
        if (this.attackTimer > 0) this.attackTimer -= dt;

        // Clamp to arena bounds
        const bounds = arenaData.bounds;
        this.model.position.x = Math.max(bounds.min + 1, Math.min(bounds.max - 1, this.model.position.x));
        this.model.position.z = Math.max(bounds.min + 1, Math.min(bounds.max - 1, this.model.position.z));

        // Collision with arena objects
        for (const col of arenaData.colliders) {
            const pos = this.model.position;
            const r = 0.6;
            if (pos.x + r > col.min.x && pos.x - r < col.max.x &&
                pos.z + r > col.min.z && pos.z - r < col.max.z) {
                // Push out
                const overlapX1 = (pos.x + r) - col.min.x;
                const overlapX2 = col.max.x - (pos.x - r);
                const overlapZ1 = (pos.z + r) - col.min.z;
                const overlapZ2 = col.max.z - (pos.z - r);
                const minOverlap = Math.min(overlapX1, overlapX2, overlapZ1, overlapZ2);
                if (minOverlap === overlapX1) pos.x = col.min.x - r;
                else if (minOverlap === overlapX2) pos.x = col.max.x + r;
                else if (minOverlap === overlapZ1) pos.z = col.min.z - r;
                else pos.z = col.max.z + r;
            }
        }

        animateCharacter(this.model, this.isMoving, dt, this.attackAnim);
    }

    takeDamage(amount, attacker, effects) {
        if (this.isDead) return 0;

        let actualDmg = amount;
        if (this.isBlocking) {
            actualDmg = Math.floor(amount * 0.5);
            this.energy = Math.max(0, this.energy - 10);
        }

        this.hp -= actualDmg;

        if (effects) {
            effects.spawnParticles(
                this.model.position.clone().add(new THREE.Vector3(0, 2, 0)),
                this.isBlocking ? 0x4488ff : 0xff2244, 8, 1, 5, 0.8, 0.6
            );
        }

        // Sukuna passive: lifesteal
        if (attacker && attacker.heroDef.id === 'sukuna') {
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + actualDmg * 0.15);
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.die(attacker);
        }

        return actualDmg;
    }

    die(killer) {
        this.isDead = true;
        this.deaths++;
        if (killer) {
            killer.kills++;
            // Sukuna R: reset cooldowns on kill
            if (killer.bloodlustActive) {
                for (const key of ['Q', 'E', 'R']) {
                    const maxCd = killer.heroDef.abilities[key].cooldown;
                    killer.cooldowns[key] = Math.max(0, killer.cooldowns[key] - maxCd * 0.3);
                }
            }
        }
        this.respawnTimer = 3;
    }

    respawn(position) {
        this.isDead = false;
        this.hp = this.maxHp;
        this.energy = this.maxEnergy;
        this.isStunned = false;
        this.model.position.copy(position);
        this.model.position.y = 0;
        this.cooldowns = { Q: 0, E: 0, R: 0, F: 0 };
        this.model.visible = true;
    }

    dash(direction) {
        if (this.dashCooldown > 0 || this.isDashing || this.isStunned) return;
        this.isDashing = true;
        this.dashTimer = 0.15;
        this.dashDirection.copy(direction).normalize();
        this.dashCooldown = this.dashMaxCooldown;
    }

    jump() {
        if (this.jumpsLeft <= 0 || this.isStunned) return;
        this.jumpVelocity = 10;
        this.isGrounded = false;
        this.jumpsLeft--;
    }

    canUseAbility(key) {
        const ability = this.heroDef.abilities[key];
        if (!ability) return false;
        return this.cooldowns[key] <= 0 && this.energy >= ability.cost && !this.isDead && !this.isStunned;
    }

    useAbilityResource(key) {
        const ability = this.heroDef.abilities[key];
        this.cooldowns[key] = ability.cooldown;
        this.energy -= ability.cost;
    }

    basicAttack() {
        if (this.attackTimer > 0 || this.isDead || this.isStunned || this.isBlocking) return false;
        this.attackTimer = this.heroDef.attackSpeed;
        this.attackAnim = { active: true, progress: 0 };
        this.hitCount++;
        this.energy = Math.min(this.maxEnergy, this.energy + 3);
        return true;
    }

    getAttackDamage() {
        let dmg = this.heroDef.attackDamage;
        // Yuji passive: every 3rd hit crits
        if (this.heroDef.id === 'yuji' && this.hitCount % 3 === 0) {
            dmg = Math.floor(dmg * 1.5);
            return { damage: dmg, isCrit: true };
        }
        return { damage: dmg, isCrit: false };
    }

    getPosition() {
        return this.model.position;
    }

    getForward() {
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyQuaternion(this.model.quaternion);
        return dir;
    }

    distanceTo(other) {
        return this.model.position.distanceTo(other.model.position);
    }
}
