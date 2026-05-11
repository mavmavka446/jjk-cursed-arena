import * as THREE from 'three';

export class AbilitySystem {
    constructor(effects) {
        this.effects = effects;
        this.activeAbilities = []; // ongoing ability effects
    }

    update(dt, entities) {
        for (let i = this.activeAbilities.length - 1; i >= 0; i--) {
            const ab = this.activeAbilities[i];
            ab.timer -= dt;

            if (ab.type === 'pull_zone') {
                // Pull enemies toward center
                entities.forEach(e => {
                    if (e === ab.caster || e.isDead) return;
                    const dist = e.getPosition().distanceTo(ab.position);
                    if (dist < ab.radius && dist > 0.5) {
                        const dir = ab.position.clone().sub(e.getPosition()).normalize();
                        e.model.position.add(dir.multiplyScalar(6 * dt));
                    }
                });
            } else if (ab.type === 'ult_paralyze') {
                entities.forEach(e => {
                    if (e === ab.caster || e.isDead) return;
                    const dist = e.getPosition().distanceTo(ab.position);
                    if (dist < ab.radius) {
                        e.isStunned = true;
                        e.stunTimer = Math.max(e.stunTimer, 0.5);
                    }
                });
            } else if (ab.type === 'ult_cage') {
                entities.forEach(e => {
                    if (e === ab.caster || e.isDead) return;
                    const dist = e.getPosition().distanceTo(ab.position);
                    if (dist < ab.radius) {
                        // Keep inside
                        if (ab.timer <= 0) {
                            // Kill
                            e.takeDamage(9999, ab.caster, this.effects);
                        }
                    }
                });
            }

            if (ab.timer <= 0) {
                this.activeAbilities.splice(i, 1);
            }
        }
    }

    execute(caster, key, targets, lookDir) {
        if (!caster.canUseAbility(key)) return false;

        const ability = caster.heroDef.abilities[key];
        caster.useAbilityResource(key);
        caster.attackAnim = { active: true, progress: 0 };

        const pos = caster.getPosition().clone();
        const forward = lookDir || caster.getForward();

        switch (ability.type) {
            case 'melee_knockback':
                this._meleeKnockback(caster, ability, targets, forward);
                break;
            case 'double_strike':
                this._doubleStrike(caster, ability, targets, forward);
                break;
            case 'buff':
                this._applyBuff(caster, ability);
                break;
            case 'ult_stun':
                this._ultStun(caster, ability, targets, forward);
                break;
            case 'pull_zone':
                this._pullZone(caster, ability, pos, forward);
                break;
            case 'ranged_aoe':
                this._rangedAoe(caster, ability, pos, forward, targets);
                break;
            case 'teleport':
                this._teleport(caster, ability, forward);
                break;
            case 'ult_paralyze':
                this._ultParalyze(caster, ability, pos, forward);
                break;
            case 'piercing_slash':
                this._piercingSlash(caster, ability, targets, forward);
                break;
            case 'heavy_slash':
                this._heavySlash(caster, ability, targets, forward);
                break;
            case 'reset_on_kill':
                this._resetOnKill(caster, ability);
                break;
            case 'ult_cage':
                this._ultCage(caster, ability, targets, forward);
                break;
        }

        return true;
    }

    _meleeKnockback(caster, ability, targets, forward) {
        const pos = caster.getPosition();
        this.effects.spawnParticles(pos.clone().add(forward.clone().multiplyScalar(2)).add(new THREE.Vector3(0, 2, 0)), ability.color, 15, 2, 6, 1, 0.8);

        targets.forEach(t => {
            if (t.isDead) return;
            const dist = pos.distanceTo(t.getPosition());
            if (dist < ability.range) {
                const dir = t.getPosition().clone().sub(pos).normalize();
                const dot = dir.dot(forward);
                if (dot > 0.3) {
                    t.takeDamage(ability.damage, caster, this.effects);
                    // Knockback
                    t.model.position.add(dir.multiplyScalar(5));
                }
            }
        });
    }

    _doubleStrike(caster, ability, targets, forward) {
        const pos = caster.getPosition();
        this.effects.spawnSlash(pos.clone().add(forward.clone().multiplyScalar(2)), forward, ability.color, 3, 0.5);

        // First hit
        targets.forEach(t => {
            if (t.isDead) return;
            const dist = pos.distanceTo(t.getPosition());
            if (dist < ability.range) {
                const dir = t.getPosition().clone().sub(pos).normalize();
                if (dir.dot(forward) > 0.3) {
                    t.takeDamage(Math.floor(ability.damage * 0.4), caster, this.effects);
                }
            }
        });

        // Delayed second hit
        setTimeout(() => {
            this.effects.spawnSlash(pos.clone().add(forward.clone().multiplyScalar(2.5)), forward, ability.color, 4, 0.6);
            targets.forEach(t => {
                if (t.isDead) return;
                const dist = caster.getPosition().distanceTo(t.getPosition());
                if (dist < ability.range + 1) {
                    const dir = t.getPosition().clone().sub(caster.getPosition()).normalize();
                    if (dir.dot(forward) > 0.2) {
                        t.takeDamage(Math.floor(ability.damage * 0.6), caster, this.effects);
                    }
                }
            });
        }, 300);
    }

    _applyBuff(caster, ability) {
        caster.fightingActive = true;
        caster.fightingTimer = ability.duration;
        caster.speed = caster.baseSpeed * 1.4;
        this.effects.spawnParticles(caster.getPosition().clone().add(new THREE.Vector3(0, 2, 0)), ability.color, 20, 2, 4, 1.2, 1);
    }

    _ultStun(caster, ability, targets, forward) {
        const pos = caster.getPosition();
        this.effects.spawnBlackFlash(pos.clone().add(forward.clone().multiplyScalar(3)).add(new THREE.Vector3(0, 2, 0)));

        targets.forEach(t => {
            if (t.isDead) return;
            const dist = pos.distanceTo(t.getPosition());
            if (dist < ability.range) {
                const dir = t.getPosition().clone().sub(pos).normalize();
                if (dir.dot(forward) > 0.2) {
                    const dmg = Math.floor(t.maxHp * 0.4);
                    t.takeDamage(dmg, caster, this.effects);
                    t.isStunned = true;
                    t.stunTimer = 2;
                }
            }
        });
    }

    _pullZone(caster, ability, pos, forward) {
        const target = pos.clone().add(forward.clone().multiplyScalar(ability.range * 0.5));
        target.y = 0;
        this.effects.spawnZone(target, ability.radius, ability.color, ability.duration, true);
        this.activeAbilities.push({
            type: 'pull_zone',
            caster,
            position: target,
            radius: ability.radius,
            timer: ability.duration
        });
    }

    _rangedAoe(caster, ability, pos, forward, targets) {
        const target = pos.clone().add(forward.clone().multiplyScalar(12));
        target.y = 0;
        this.effects.spawnExplosion(target.clone().add(new THREE.Vector3(0, 1, 0)), ability.color, ability.radius);
        this.effects.spawnProjectile(pos.clone().add(new THREE.Vector3(0, 2, 0)), forward, ability.color, 40, 0.6, 0.5);

        setTimeout(() => {
            targets.forEach(t => {
                if (t.isDead) return;
                const dist = t.getPosition().distanceTo(target);
                if (dist < ability.radius) {
                    t.takeDamage(ability.damage, caster, this.effects);
                }
            });
        }, 300);
    }

    _teleport(caster, ability, forward) {
        const startPos = caster.getPosition().clone();
        this.effects.spawnParticles(startPos.clone().add(new THREE.Vector3(0, 2, 0)), ability.color, 15, 1.5, 5, 0.8, 0.6);

        caster.model.position.add(forward.clone().multiplyScalar(ability.range));
        caster.model.position.y = 0;

        this.effects.spawnParticles(caster.getPosition().clone().add(new THREE.Vector3(0, 2, 0)), ability.color, 15, 1.5, 5, 0.8, 0.6);
    }

    _ultParalyze(caster, ability, pos, forward) {
        const target = pos.clone().add(forward.clone().multiplyScalar(10));
        target.y = 0;
        this.effects.spawnSphere(target.clone().add(new THREE.Vector3(0, 4, 0)), ability.radius, ability.color, ability.duration);
        this.activeAbilities.push({
            type: 'ult_paralyze',
            caster,
            position: target,
            radius: ability.radius,
            timer: ability.duration
        });
    }

    _piercingSlash(caster, ability, targets, forward) {
        const pos = caster.getPosition();
        this.effects.spawnSlash(pos.clone().add(forward.clone().multiplyScalar(4)), forward, ability.color, 8, 0.2);
        this.effects.spawnProjectile(pos.clone().add(new THREE.Vector3(0, 2, 0).add(forward)), forward, ability.color, 35, 0.3, 0.6);

        targets.forEach(t => {
            if (t.isDead) return;
            const toTarget = t.getPosition().clone().sub(pos);
            const dist = toTarget.length();
            if (dist < ability.range) {
                toTarget.normalize();
                if (toTarget.dot(forward) > 0.5) {
                    t.takeDamage(ability.damage, caster, this.effects);
                }
            }
        });
    }

    _heavySlash(caster, ability, targets, forward) {
        const pos = caster.getPosition();
        this.effects.spawnSlash(pos.clone().add(forward.clone().multiplyScalar(3)), forward, ability.color, 5, 8);

        targets.forEach(t => {
            if (t.isDead) return;
            const dist = pos.distanceTo(t.getPosition());
            if (dist < ability.range) {
                const dir = t.getPosition().clone().sub(pos).normalize();
                if (dir.dot(forward) > 0.4) {
                    t.takeDamage(ability.damage, caster, this.effects);
                }
            }
        });
    }

    _resetOnKill(caster, ability) {
        caster.bloodlustActive = true;
        this.effects.spawnParticles(caster.getPosition().clone().add(new THREE.Vector3(0, 2, 0)), ability.color, 25, 2, 5, 1, 1);

        setTimeout(() => {
            caster.bloodlustActive = false;
        }, ability.duration * 1000);
    }

    _ultCage(caster, ability, targets, forward) {
        // Find closest target in front
        const pos = caster.getPosition();
        let closestTarget = null;
        let closestDist = ability.range;

        targets.forEach(t => {
            if (t.isDead) return;
            const dist = pos.distanceTo(t.getPosition());
            const dir = t.getPosition().clone().sub(pos).normalize();
            if (dist < closestDist && dir.dot(forward) > 0.3) {
                closestTarget = t;
                closestDist = dist;
            }
        });

        const targetPos = closestTarget ? closestTarget.getPosition().clone() : pos.clone().add(forward.clone().multiplyScalar(5));
        targetPos.y = 0;

        this.effects.spawnCage(targetPos, ability.radius, ability.color, ability.duration);
        this.activeAbilities.push({
            type: 'ult_cage',
            caster,
            position: targetPos,
            radius: ability.radius,
            timer: ability.duration
        });
    }
}
