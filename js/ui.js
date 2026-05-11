import * as THREE from 'three';
import { HEROES } from './heroes.js';

export class UIManager {
    constructor() {
        this.heroCards = document.getElementById('hero-cards');
        this.heroInfo = document.getElementById('hero-info');
        this.startBtn = document.getElementById('start-btn');
        this.hud = document.getElementById('hud');
        this.selectScreen = document.getElementById('hero-select-screen');
        this.deathScreen = document.getElementById('death-screen');
        this.resultScreen = document.getElementById('result-screen');

        this.selectedHero = null;
        this.selectedMode = 'training';
        this.onStart = null;
        this.onBack = null;

        this.entityBars = new Map();

        this._setupHeroSelect();
        this._setupModeSelect();
    }

    _setupHeroSelect() {
        for (const [id, hero] of Object.entries(HEROES)) {
            const card = document.createElement('div');
            card.className = 'hero-card';
            card.dataset.hero = id;

            const preview = document.createElement('canvas');
            preview.className = 'hero-card-preview';
            preview.width = 120;
            preview.height = 160;
            this._drawHeroPreview(preview, hero);

            const name = document.createElement('div');
            name.className = 'hero-card-name';
            name.textContent = hero.name;

            const role = document.createElement('div');
            role.className = 'hero-card-role';
            role.textContent = hero.role;

            const team = document.createElement('div');
            team.className = `hero-card-team team-${hero.team}`;
            team.textContent = hero.team === 'mage' ? 'МАГ' : 'ПРОКЛЯТИЕ';

            card.append(preview, name, role, team);
            card.addEventListener('click', () => this._selectHero(id));
            this.heroCards.appendChild(card);
        }

        this.startBtn.addEventListener('click', () => {
            if (this.selectedHero && this.onStart) {
                this.onStart(this.selectedHero, this.selectedMode);
            }
        });

        document.getElementById('back-btn').addEventListener('click', () => {
            this.showSelect();
            if (this.onBack) this.onBack();
        });
    }

    _drawHeroPreview(canvas, hero) {
        const ctx = canvas.getContext('2d');
        const c = hero.colors;

        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, 120, 160);

        // Body
        ctx.fillStyle = '#' + c.body.toString(16).padStart(6, '0');
        ctx.fillRect(35, 55, 50, 65);

        // Accent
        ctx.fillStyle = '#' + c.accent.toString(16).padStart(6, '0');
        ctx.fillRect(60, 55, 8, 65);

        // Head
        ctx.fillStyle = '#' + c.skin.toString(16).padStart(6, '0');
        ctx.fillRect(38, 15, 44, 38);

        // Hair
        ctx.fillStyle = '#' + c.hair.toString(16).padStart(6, '0');
        ctx.fillRect(36, 10, 48, 18);

        // Eyes
        ctx.fillStyle = '#fff';
        ctx.fillRect(45, 30, 10, 6);
        ctx.fillRect(65, 30, 10, 6);
        ctx.fillStyle = hero.id === 'gojo' ? '#4488ff' : '#111';
        ctx.fillRect(48, 31, 5, 4);
        ctx.fillRect(68, 31, 5, 4);

        // Special features
        if (hero.id === 'gojo') {
            ctx.fillStyle = '#' + c.blindfold.toString(16).padStart(6, '0');
            ctx.fillRect(36, 28, 48, 10);
        } else if (hero.id === 'sukuna') {
            ctx.fillStyle = '#' + c.tattoo.toString(16).padStart(6, '0');
            ctx.fillRect(47, 22, 3, 20);
            ctx.fillRect(70, 22, 3, 20);
            ctx.fillRect(45, 38, 30, 3);
        }

        // Arms
        ctx.fillStyle = '#' + c.body.toString(16).padStart(6, '0');
        ctx.fillRect(18, 58, 16, 50);
        ctx.fillRect(86, 58, 16, 50);

        // Legs
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(38, 120, 22, 36);
        ctx.fillRect(62, 120, 22, 36);

        // Aura glow
        ctx.shadowColor = '#' + c.accent.toString(16).padStart(6, '0');
        ctx.shadowBlur = 20;
        ctx.strokeStyle = '#' + c.accent.toString(16).padStart(6, '0');
        ctx.strokeRect(30, 10, 60, 146);
        ctx.shadowBlur = 0;
    }

    _selectHero(id) {
        this.selectedHero = id;
        const hero = HEROES[id];

        document.querySelectorAll('.hero-card').forEach(c => c.classList.remove('selected'));
        document.querySelector(`[data-hero="${id}"]`).classList.add('selected');

        this.heroInfo.classList.add('visible');
        document.getElementById('hero-info-name').textContent = hero.name;
        document.getElementById('hero-info-role').textContent = hero.role;
        document.getElementById('hero-info-passive').textContent = `Пассивка: ${hero.passive.name} — ${hero.passive.desc}`;

        const abDiv = document.getElementById('hero-info-abilities');
        abDiv.innerHTML = '';
        for (const [key, ab] of Object.entries(hero.abilities)) {
            const card = document.createElement('div');
            card.className = 'ability-info-card' + (ab.isUlt ? ' ult-card' : '');
            card.innerHTML = `<div class="key">${key}</div><div class="name">${ab.name}</div><div class="desc">${ab.desc}<br>КД: ${ab.cooldown}с | Энергия: ${ab.cost}</div>`;
            abDiv.appendChild(card);
        }

        this.startBtn.disabled = false;
    }

    _setupModeSelect() {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedMode = btn.dataset.mode;
            });
        });
    }

    showSelect() {
        this.selectScreen.style.display = 'flex';
        this.hud.style.display = 'none';
        this.deathScreen.style.display = 'none';
        this.resultScreen.style.display = 'none';
    }

    showHUD(hero) {
        this.selectScreen.style.display = 'none';
        this.hud.style.display = 'block';
        this.deathScreen.style.display = 'none';
        this.resultScreen.style.display = 'none';

        document.getElementById('hero-name-hud').textContent = hero.name;

        const portrait = document.getElementById('hero-portrait');
        const c = hero.colors;
        portrait.style.background = `linear-gradient(135deg, #${c.body.toString(16).padStart(6,'0')}, #${c.accent.toString(16).padStart(6,'0')})`;

        // Set ability colors
        for (const key of ['Q', 'E', 'R', 'F']) {
            const el = document.getElementById(`ability-${key.toLowerCase()}`);
            const ab = hero.abilities[key];
            el.style.background = `#${ab.color.toString(16).padStart(6, '0')}`;
        }
    }

    showDeath() {
        this.deathScreen.style.display = 'flex';
    }

    hideDeath() {
        this.deathScreen.style.display = 'none';
    }

    showResult(won, stats) {
        this.resultScreen.style.display = 'flex';
        const text = document.getElementById('result-text');
        text.textContent = won ? 'VICTORY' : 'DEFEAT';
        text.className = won ? 'victory' : 'defeat';

        document.getElementById('result-stats').innerHTML =
            `Убийств: ${stats.kills}<br>Смертей: ${stats.deaths}<br>Урон: ${stats.damage}`;
    }

    updateHUD(player) {
        if (!player) return;

        // HP
        const hpPct = (player.hp / player.maxHp) * 100;
        document.getElementById('hp-bar').style.width = hpPct + '%';
        document.getElementById('hp-text').textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;

        if (hpPct > 50) {
            document.getElementById('hp-bar').style.background = 'linear-gradient(90deg, #22cc44, #44ff66)';
        } else if (hpPct > 25) {
            document.getElementById('hp-bar').style.background = 'linear-gradient(90deg, #ccaa22, #ffcc44)';
        } else {
            document.getElementById('hp-bar').style.background = 'linear-gradient(90deg, #cc2222, #ff4444)';
        }

        // Energy
        const ePct = (player.energy / player.maxEnergy) * 100;
        document.getElementById('energy-bar').style.width = ePct + '%';
        document.getElementById('energy-text').textContent = `${Math.ceil(player.energy)} / ${player.maxEnergy}`;

        // Cooldowns
        for (const key of ['Q', 'E', 'R', 'F']) {
            const cd = player.cooldowns[key];
            const maxCd = player.heroDef.abilities[key].cooldown;
            const cdEl = document.getElementById(`cd-${key.toLowerCase()}`);
            const slot = cdEl.parentElement;

            if (cd > 0) {
                const pct = (cd / maxCd) * 100;
                cdEl.style.height = pct + '%';
                cdEl.textContent = Math.ceil(cd);
                slot.classList.add('on-cooldown');
                slot.classList.remove('active-ability');
            } else if (player.energy < player.heroDef.abilities[key].cost) {
                cdEl.style.height = '100%';
                cdEl.textContent = '';
                slot.classList.add('on-cooldown');
                slot.classList.remove('active-ability');
            } else {
                cdEl.style.height = '0%';
                cdEl.textContent = '';
                slot.classList.remove('on-cooldown');
            }
        }

        // Dash indicator
        const dashPct = Math.max(0, 1 - player.dashCooldown / player.dashMaxCooldown) * 100;
        document.getElementById('dash-fill').style.width = dashPct + '%';

        // Block indicator
        document.getElementById('block-indicator').style.display = player.isBlocking ? 'block' : 'none';

        // Scores
        document.getElementById('score-player').textContent = player.kills;
    }

    updateEnemyScore(kills) {
        document.getElementById('score-enemy').textContent = kills;
    }

    updateTimer(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        document.getElementById('timer').textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }

    addKillFeed(killerName, victimName) {
        const feed = document.getElementById('kill-feed');
        const msg = document.createElement('div');
        msg.className = 'kill-msg';
        msg.innerHTML = `<span style="color:#44aaff">${killerName}</span> <span style="color:#666">&#9876;</span> <span style="color:#ff4444">${victimName}</span>`;
        feed.appendChild(msg);
        setTimeout(() => msg.remove(), 3500);
    }

    showDamageNumber(screenPos, amount, type) {
        const container = document.getElementById('damage-numbers');
        const el = document.createElement('div');
        el.className = `dmg-num ${type}`;
        el.textContent = type === 'heal' ? `+${amount}` : `-${amount}`;
        el.style.left = screenPos.x + 'px';
        el.style.top = screenPos.y + 'px';
        container.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }

    showHitIndicator() {
        const el = document.getElementById('hit-indicator');
        el.style.display = 'block';
        el.style.animation = 'none';
        el.offsetHeight; // reflow
        el.style.animation = 'hitFlash 0.3s forwards';
        setTimeout(() => { el.style.display = 'none'; }, 300);
    }

    updateRespawnCount(count) {
        document.getElementById('respawn-count').textContent = count;
    }

    // 3D world -> screen position for HP bars etc
    worldToScreen(pos, camera) {
        const v = pos.clone().project(camera);
        return {
            x: (v.x * 0.5 + 0.5) * window.innerWidth,
            y: (-v.y * 0.5 + 0.5) * window.innerHeight,
            visible: v.z < 1
        };
    }

    updateEntityBar(entity, camera) {
        if (entity.isDead) {
            if (this.entityBars.has(entity)) {
                const bars = this.entityBars.get(entity);
                bars.container.remove();
                this.entityBars.delete(entity);
            }
            return;
        }

        let bars = this.entityBars.get(entity);
        if (!bars) {
            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.pointerEvents = 'none';
            container.style.zIndex = '15';

            const nameTag = document.createElement('div');
            nameTag.className = 'entity-name-tag';
            nameTag.textContent = entity.heroDef.name;
            nameTag.style.color = entity.isPlayer ? '#44aaff' : '#ff4444';

            const hpContainer = document.createElement('div');
            hpContainer.className = 'entity-hp-bar';
            const hpFill = document.createElement('div');
            hpFill.className = 'entity-hp-fill';
            hpFill.style.background = entity.isPlayer ? '#44ff66' : '#ff4444';
            hpContainer.appendChild(hpFill);

            container.append(nameTag, hpContainer);
            document.body.appendChild(container);

            bars = { container, nameTag, hpFill };
            this.entityBars.set(entity, bars);
        }

        const headPos = entity.getPosition().clone().add(new THREE.Vector3(0, 4.5, 0));
        const screen = this.worldToScreen(headPos, camera);

        if (screen.visible) {
            bars.container.style.display = 'block';
            bars.container.style.left = (screen.x - 30) + 'px';
            bars.container.style.top = (screen.y - 20) + 'px';
            bars.hpFill.style.width = (entity.hp / entity.maxHp * 100) + '%';
        } else {
            bars.container.style.display = 'none';
        }
    }

    clearEntityBars() {
        this.entityBars.forEach(bars => bars.container.remove());
        this.entityBars.clear();
    }
}
