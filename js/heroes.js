// Hero definitions
export const HEROES = {
    yuji: {
        id: 'yuji',
        name: 'Юдзи Итадори',
        nameEn: 'Yuji Itadori',
        role: 'Ближний бой',
        team: 'mage',
        hp: 100,
        speed: 8,
        attackRange: 3,
        attackDamage: 8,
        attackSpeed: 0.4,
        colors: { body: 0x1a1a3a, accent: 0xff6633, hair: 0xff6633, skin: 0xffcc99 },
        passive: {
            name: 'Чёрная вспышка',
            desc: 'Каждый 3-й удар — крит (x1.5 урона)',
        },
        abilities: {
            Q: { name: 'Снос', desc: 'Сильный пинок, отбрасывает врага', cooldown: 5, cost: 25, damage: 18, range: 4, type: 'melee_knockback', color: 0xffaa33 },
            E: { name: 'Divergent Fist', desc: 'Две быстрые атаки, вторая с задержкой', cooldown: 7, cost: 30, damage: 24, range: 3.5, type: 'double_strike', color: 0xff6633 },
            R: { name: 'Бой без правил', desc: 'Увеличение скорости + реген HP', cooldown: 15, cost: 40, duration: 5, type: 'buff', color: 0x44ff44 },
            F: { name: 'Чёрная вспышка: Совершенство', desc: 'Оглушает цель и наносит 40% HP', cooldown: 45, cost: 50, damage: 40, range: 5, type: 'ult_stun', color: 0x000000, isUlt: true }
        }
    },
    gojo: {
        id: 'gojo',
        name: 'Сатору Годзо',
        nameEn: 'Satoru Gojo',
        role: 'Дальний контроль',
        team: 'mage',
        hp: 90,
        speed: 7,
        attackRange: 15,
        attackDamage: 6,
        attackSpeed: 0.5,
        colors: { body: 0xffffff, accent: 0x4488ff, hair: 0xeeeeff, skin: 0xffddcc, blindfold: 0x2244aa },
        passive: {
            name: 'Шесть глаз',
            desc: 'Враги рядом подсвечиваются',
        },
        abilities: {
            Q: { name: 'Голубая', desc: 'Зона притяжения — затягивает врагов', cooldown: 8, cost: 30, damage: 10, range: 20, radius: 6, duration: 2.5, type: 'pull_zone', color: 0x4488ff },
            E: { name: 'Красная', desc: 'Взрыв на дальности (АоЕ урон)', cooldown: 6, cost: 25, damage: 22, range: 25, radius: 5, type: 'ranged_aoe', color: 0xff2244 },
            R: { name: 'Телепорт', desc: 'Телепорт на 15м (2 заряда)', cooldown: 10, cost: 20, range: 15, type: 'teleport', charges: 2, color: 0x8844ff },
            F: { name: 'Бесконечная пустота', desc: 'Сфера — враги парализованы на 3 сек', cooldown: 50, cost: 50, damage: 15, range: 20, radius: 8, duration: 3, type: 'ult_paralyze', color: 0x8800ff, isUlt: true }
        }
    },
    sukuna: {
        id: 'sukuna',
        name: 'Сукуна',
        nameEn: 'Sukuna',
        role: 'Ассасин',
        team: 'curse',
        hp: 85,
        speed: 9,
        attackRange: 4,
        attackDamage: 10,
        attackSpeed: 0.35,
        colors: { body: 0x2a0a1a, accent: 0xff2244, hair: 0xffccdd, skin: 0xddaa88, tattoo: 0x440022 },
        passive: {
            name: 'Жажда крови',
            desc: 'Урон по врагам восстанавливает HP',
        },
        abilities: {
            Q: { name: 'Чистый рассекающий', desc: 'Горизонтальный клинок (пробивает)', cooldown: 5, cost: 25, damage: 20, range: 12, type: 'piercing_slash', color: 0xff2244 },
            E: { name: 'Рассекающий', desc: 'Вертикальный клинок (большой урон)', cooldown: 8, cost: 35, damage: 32, range: 8, type: 'heavy_slash', color: 0xff0044 },
            R: { name: 'Кровожадность', desc: 'Убийство сбрасывает 30% кулдаунов', cooldown: 20, cost: 30, duration: 8, type: 'reset_on_kill', color: 0xaa0033 },
            F: { name: 'Коробка', desc: 'Сфера — враг внутри 3 сек = смерть', cooldown: 55, cost: 50, range: 10, radius: 4, duration: 3, type: 'ult_cage', color: 0x440022, isUlt: true }
        }
    }
};
