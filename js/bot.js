import * as THREE from 'three';

export class BotAI {
    constructor(entity, difficulty = 1) {
        this.entity = entity;
        this.difficulty = difficulty; // 0=easy, 1=medium, 2=hard
        this.actionTimer = 0;
        this.abilityTimer = 0;
        this.strafeDir = 1;
        this.strafeTimer = 0;
        this.retreatTimer = 0;
        this.target = null;

        // Difficulty multipliers
        this.reactionTime = [1.5, 0.8, 0.3][difficulty];
        this.accuracy = [0.3, 0.6, 0.9][difficulty];
        this.abilityUseChance = [0.2, 0.5, 0.8][difficulty];
        this.dodgeChance = [0.1, 0.3, 0.6][difficulty];
        this.blockChance = [0.1, 0.25, 0.5][difficulty];
    }

    update(dt, targets, abilitySystem, arenaData) {
        const e = this.entity;
        if (e.isDead || e.isStunned) return;

        this.actionTimer -= dt;
        this.abilityTimer -= dt;
        this.strafeTimer -= dt;

        // Find target
        this.target = this._findTarget(targets);
        if (!this.target) {
            this._wander(dt, arenaData);
            return;
        }

        const dist = e.distanceTo(this.target);
        const toTarget = this.target.getPosition().clone().sub(e.getPosition()).normalize();

        // Face target
        const angle = Math.atan2(toTarget.x, toTarget.z);
        e.model.rotation.y = angle;

        // Decision making
        if (this.actionTimer <= 0) {
            this.actionTimer = this.reactionTime * (0.8 + Math.random() * 0.4);
            this._makeDecision(dist, toTarget, abilitySystem, targets);
        }

        // Movement
        this._move(dt, dist, toTarget, arenaData);
    }

    _findTarget(targets) {
        let closest = null;
        let closestDist = Infinity;
        for (const t of targets) {
            if (t.isDead || t === this.entity) continue;
            const d = this.entity.distanceTo(t);
            if (d < closestDist) {
                closestDist = d;
                closest = t;
            }
        }
        return closest;
    }

    _makeDecision(dist, toTarget, abilitySystem, targets) {
        const e = this.entity;

        // Block if low hp and being attacked
        if (e.hp < e.maxHp * 0.3 && dist < 6 && Math.random() < this.blockChance) {
            e.isBlocking = true;
            setTimeout(() => { e.isBlocking = false; }, 1000 + Math.random() * 1000);
        } else {
            e.isBlocking = false;
        }

        // Try to use abilities
        if (this.abilityTimer <= 0 && Math.random() < this.abilityUseChance) {
            const idealRange = e.heroDef.attackRange;

            // Use ult if available and enemy is close enough
            if (e.canUseAbility('F') && dist < (e.heroDef.abilities.F.range || 10)) {
                abilitySystem.execute(e, 'F', targets.filter(t => t !== e), toTarget);
                this.abilityTimer = 3;
                return;
            }

            // Use abilities based on range
            const keys = ['Q', 'E', 'R'];
            const shuffled = keys.sort(() => Math.random() - 0.5);
            for (const key of shuffled) {
                if (e.canUseAbility(key)) {
                    const ab = e.heroDef.abilities[key];
                    if (ab.type === 'buff' || ab.type === 'reset_on_kill' || ab.type === 'teleport') {
                        abilitySystem.execute(e, key, targets.filter(t => t !== e), toTarget);
                        this.abilityTimer = 2;
                        return;
                    } else if (dist < (ab.range || idealRange)) {
                        abilitySystem.execute(e, key, targets.filter(t => t !== e), toTarget);
                        this.abilityTimer = 2;
                        return;
                    }
                }
            }
        }

        // Basic attack
        if (dist < e.heroDef.attackRange && e.basicAttack()) {
            const { damage, isCrit } = e.getAttackDamage();
            if (this.target && !this.target.isDead) {
                const dir = this.target.getPosition().clone().sub(e.getPosition()).normalize();
                if (Math.random() < this.accuracy) {
                    this.target.takeDamage(damage, e, null);
                }
            }
        }

        // Dodge
        if (dist < 5 && Math.random() < this.dodgeChance && e.dashCooldown <= 0) {
            const perpDir = new THREE.Vector3(-toTarget.z, 0, toTarget.x).multiplyScalar(this.strafeDir);
            e.dash(perpDir);
        }
    }

    _move(dt, dist, toTarget, arenaData) {
        const e = this.entity;
        const idealRange = e.heroDef.attackRange * 0.7;
        const moveSpeed = e.speed;

        let moveDir = new THREE.Vector3();

        if (dist > idealRange + 2) {
            // Move toward target
            moveDir.copy(toTarget);
        } else if (dist < idealRange * 0.5) {
            // Too close, back off
            moveDir.copy(toTarget).negate();
        } else {
            // Strafe
            if (this.strafeTimer <= 0) {
                this.strafeDir *= -1;
                this.strafeTimer = 1 + Math.random() * 2;
            }
            moveDir.set(-toTarget.z, 0, toTarget.x).multiplyScalar(this.strafeDir);
        }

        // Low HP retreat
        if (e.hp < e.maxHp * 0.2) {
            moveDir.copy(toTarget).negate();
        }

        moveDir.y = 0;
        moveDir.normalize();

        e.model.position.add(moveDir.multiplyScalar(moveSpeed * dt));
        e.isMoving = moveDir.lengthSq() > 0.01;
    }

    _wander(dt, arenaData) {
        const e = this.entity;
        // Move toward center
        const toCenter = new THREE.Vector3(-e.model.position.x, 0, -e.model.position.z).normalize();
        e.model.position.add(toCenter.multiplyScalar(e.speed * 0.5 * dt));
        e.isMoving = true;

        const angle = Math.atan2(toCenter.x, toCenter.z);
        e.model.rotation.y = angle;
    }
}
