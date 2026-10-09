import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';

const canvas = document.getElementById('gameCanvas');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 250);
camera.position.set(0, 2, 8);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const clock = new THREE.Clock();
const keys = {};

const ARENAS = {
  'Neon City': {
    bg: 0x081521,
    fog: 0x173b5c,
    enemies: ['walker', 'fast', 'ranged'],
    bosses: ['neon_assassin', 'cyber_tank'],
    envColor: 0x38bdf8,
    difficulty: 1.0
  },
  'Desert': {
    bg: 0x8b6a2b,
    fog: 0xd9ae73,
    enemies: ['heavy', 'walker', 'ranged'],
    bosses: ['sand_colossus', 'desert_hunter'],
    envColor: 0xfbbf24,
    difficulty: 1.2
  },
  'Arctic': {
    bg: 0x1a3045,
    fog: 0xb6d8f6,
    enemies: ['fast', 'heavy', 'walker'],
    bosses: ['frost_guardian', 'ice_reaper'],
    envColor: 0x06b6d4,
    difficulty: 1.15
  },
  'Volcanic': {
    bg: 0x3d2817,
    fog: 0xff6b35,
    enemies: ['ranged', 'heavy', 'fast'],
    bosses: ['lava_giant', 'magma_lord'],
    envColor: 0xff6b35,
    difficulty: 1.3
  }
};

const MISSIONS = [
  { id: 'survive_10', name: 'Wave Survivor', desc: 'Survive 10 waves', reward: 200, xpReward: 50, requirement: { wave: 10 } },
  { id: 'kill_50', name: 'Exterminator', desc: 'Kill 50 enemies', reward: 150, xpReward: 40, requirement: { kills: 50 } },
  { id: 'boss_hunt', name: 'Boss Hunter', desc: 'Defeat 3 bosses', reward: 250, xpReward: 60, requirement: { bosses: 3 } },
  { id: 'combo_15', name: 'Combo Fury', desc: 'Reach 15 kill combo', reward: 180, xpReward: 45, requirement: { combo: 15 } },
  { id: 'damage_1000', name: 'Power Shot', desc: 'Deal 1000 damage', reward: 200, xpReward: 50, requirement: { damage: 1000 } }
];

const LOOT_TIERS = {
  common: { color: 0xcccccc, dropChance: 0.5, stats: { damage: 1, fireRate: 0.05 } },
  rare: { color: 0x3b82f6, dropChance: 0.3, stats: { damage: 3, fireRate: 0.1 } },
  epic: { color: 0x8b5cf6, dropChance: 0.15, stats: { damage: 5, fireRate: 0.15 } },
  legendary: { color: 0xfbbf24, dropChance: 0.05, stats: { damage: 8, fireRate: 0.2 } }
};

const BOSS_TYPES = {
  neon_assassin: { health: 200, speed: 2.8, damage: 22, name: 'Neon Assassin', color: 0x00ff88 },
  cyber_tank: { health: 280, speed: 1.5, damage: 28, name: 'Cyber Tank', color: 0xff00ff },
  sand_colossus: { health: 320, speed: 1.2, damage: 32, name: 'Sand Colossus', color: 0xfbbf24 },
  desert_hunter: { health: 240, speed: 2.4, damage: 26, name: 'Desert Hunter', color: 0xff7e5f },
  frost_guardian: { health: 260, speed: 2.0, damage: 24, name: 'Frost Guardian', color: 0x06b6d4 },
  ice_reaper: { health: 290, speed: 2.6, damage: 30, name: 'Ice Reaper', color: 0x38bdf8 },
  lava_giant: { health: 340, speed: 1.4, damage: 35, name: 'Lava Giant', color: 0xff6b35 },
  magma_lord: { health: 300, speed: 2.2, damage: 28, name: 'Magma Lord', color: 0xfb7185 }
};

const state = {
  running: false,
  gameMode: 'survival',
  selectedArena: 'Neon City',
  player: {
    position: new THREE.Vector3(0, 1.2, 0),
    yaw: 0,
    pitch: 0,
    speed: 7,
    health: 100,
    maxHealth: 100,
    shield: 50,
    maxShield: 50,
    level: 1,
    xp: 0,
    coins: 500,
    crystals: 50,
    score: 0,
    kills: 0,
    combo: 0,
    comboTimer: 0,
    weaponIndex: 0,
    reloadTimer: 0,
    lookMode: 'first',
    mesh: null,
    totalDamage: 0,
    totalCoinsEarned: 0
  },
  wave: 1,
  enemies: [],
  projectiles: [],
  pickups: [],
  particles: [],
  loot: [],
  lastFire: 0,
  nextEnemyId: 1,
  nextPickupId: 1,
  pointerLocked: false,
  upgrades: { damage: 0, health: 0, fireRate: 0, speed: 0, shield: 0, crit: 0 },
  battlePass: { level: 1, progress: 0, maxProgress: 100, rewards: [] },
  missions: MISSIONS.map(m => ({ ...m, completed: false, progress: 0 })),
  achievements: [
    { id: 'first_kill', name: 'First Blood', unlocked: false, reward: 50 },
    { id: 'wave_5', name: 'Wave Runner', unlocked: false, reward: 150 },
    { id: 'boss_killer', name: 'Boss Slayer', unlocked: false, reward: 200 },
    { id: 'combo_10', name: 'Combo Master', unlocked: false, reward: 150 },
    { id: 'arena_master', name: 'Arena Master', unlocked: false, reward: 300 },
    { id: 'legendary_hunter', name: 'Legendary Hunter', unlocked: false, reward: 500 }
  ],
  equipmentSet: [],
  bossDefeated: 0,
  shotFlash: 0,
  totalKills: 0,
  seasonIndex: 0,
  premium: false,
  equippedSkin: 'Default',
  critChance: 0.15,
  dailyLastClaim: 0,
  monthlyLastClaim: 0
};

const weapons = [
  { name: 'Pistol', damage: 22, fireRate: 0.28, ammo: 12, magSize: 12, reloadTime: 1.0, bulletSpeed: 36, pelletCount: 1, cost: 0, crystalCost: 0, color: 0x7cf0ff, unlocked: true, type: 'hitscan', recoil: 0.08 },
  { name: 'Rifle', damage: 28, fireRate: 0.12, ammo: 30, magSize: 30, reloadTime: 1.15, bulletSpeed: 38, pelletCount: 1, cost: 150, crystalCost: 0, color: 0x7ce19d, unlocked: false, type: 'hitscan', recoil: 0.12 },
  { name: 'Shotgun', damage: 16, fireRate: 0.7, ammo: 8, magSize: 8, reloadTime: 1.4, bulletSpeed: 28, pelletCount: 10, cost: 200, crystalCost: 0, color: 0xfbbf24, unlocked: false, type: 'scatter', recoil: 0.3 },
  { name: 'Sniper', damage: 65, fireRate: 1.15, ammo: 5, magSize: 5, reloadTime: 1.7, bulletSpeed: 48, pelletCount: 1, cost: 300, crystalCost: 50, color: 0xa78bfa, unlocked: false, type: 'hitscan', recoil: 0.02 },
  { name: 'Plasma', damage: 32, fireRate: 0.18, ammo: 20, magSize: 20, reloadTime: 1.15, bulletSpeed: 42, pelletCount: 1, cost: 320, crystalCost: 60, color: 0xf472b6, unlocked: false, type: 'energy', recoil: 0.12 },
  { name: 'Grenade Launcher', damage: 42, fireRate: 1.35, ammo: 4, magSize: 4, reloadTime: 1.8, bulletSpeed: 18, pelletCount: 1, cost: 380, crystalCost: 75, color: 0xfb7185, unlocked: false, type: 'explosive', recoil: 0.4 },
  { name: 'Laser', damage: 35, fireRate: 0.09, ammo: 40, magSize: 40, reloadTime: 1.0, bulletSpeed: 50, pelletCount: 1, cost: 420, crystalCost: 90, color: 0x00ff88, unlocked: false, type: 'beam', recoil: 0.04 },
  { name: 'Minigun', damage: 18, fireRate: 0.05, ammo: 50, magSize: 50, reloadTime: 1.5, bulletSpeed: 35, pelletCount: 1, cost: 500, crystalCost: 100, color: 0xff6b35, unlocked: false, type: 'hitscan', recoil: 0.18 },
  { name: 'Void Rifle', damage: 55, fireRate: 0.14, ammo: 25, magSize: 25, reloadTime: 1.2, bulletSpeed: 44, pelletCount: 1, cost: 600, crystalCost: 150, color: 0x7c3aed, unlocked: false, type: 'hitscan', recoil: 0.08 },
  { name: 'Inferno', damage: 45, fireRate: 0.22, ammo: 15, magSize: 15, reloadTime: 1.35, bulletSpeed: 40, pelletCount: 1, cost: 550, crystalCost: 120, color: 0xff4500, unlocked: false, type: 'energy', recoil: 0.15 }
];

const enemyTypes = {
  walker: { health: 35, speed: 2.2, damage: 9, size: 0.9, color: 0x8aa1ff, reward: 12, rewardXp: 28, ai: 'chase' },
  fast: { health: 28, speed: 3.0, damage: 7, size: 0.7, color: 0x42d392, reward: 18, rewardXp: 35, ai: 'circle' },
  heavy: { health: 75, speed: 1.7, damage: 12, size: 1.15, color: 0xfea800, reward: 22, rewardXp: 45, ai: 'charge' },
  ranged: { health: 45, speed: 2.3, damage: 10, size: 0.85, color: 0x5aa9ff, reward: 20, rewardXp: 40, ai: 'shoot' }
};

const ui = {
  menu: document.getElementById('menu'),
  shopPanel: document.getElementById('shopPanel'),
  giftPanel: document.getElementById('giftPanel'),
  hud: document.getElementById('hud'),
  message: document.getElementById('message'),
  startBtn: document.getElementById('startBtn'),
  shopBtn: document.getElementById('shopBtn'),
  giftBtn: document.getElementById('giftBtn'),
  shopList: document.getElementById('shopList'),
  menuLevel: document.getElementById('menuLevel'),
  menuCoins: document.getElementById('menuCoins'),
  menuScore: document.getElementById('menuScore'),
  menuWave: document.getElementById('menuWave'),
  hudLevel: document.getElementById('hudLevel'),
  hudWave: document.getElementById('hudWave'),
  hudScore: document.getElementById('hudScore'),
  hudCoins: document.getElementById('hudCoins'),
  hudAmmo: document.getElementById('hudAmmo'),
  weaponName: document.getElementById('weaponName'),
  healthBar: document.getElementById('healthBar'),
  dailyStatus: document.getElementById('dailyStatus'),
  monthlyStatus: document.getElementById('monthlyStatus'),
  dailyGiftBtn: document.getElementById('dailyGiftBtn'),
  monthlyGiftBtn: document.getElementById('monthlyGiftBtn'),
  battlePassText: document.getElementById('battlePassText'),
  objectiveText: document.getElementById('objectiveText'),
  hudMode: document.getElementById('hudMode'),
  objectiveHud: document.getElementById('objectiveHud')
};

const STORAGE_KEY = 'growl_sars_v5';

function saveGame() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    player: {
      coins: state.player.coins,
      crystals: state.player.crystals,
      level: state.player.level,
      xp: state.player.xp,
      score: state.player.score,
      weaponIndex: state.player.weaponIndex,
      maxHealth: state.player.maxHealth,
      maxShield: state.player.maxShield,
      equippedSkin: state.equippedSkin,
      totalKills: state.totalKills,
      totalDamage: state.player.totalDamage
    },
    upgrades: state.upgrades,
    weapons: weapons.map(w => ({ name: w.name, unlocked: w.unlocked })),
    achievements: state.achievements,
    missions: state.missions,
    battlePass: state.battlePass,
    selectedArena: state.selectedArena,
    gameMode: state.gameMode,
    dailyLastClaim: state.dailyLastClaim,
    monthlyLastClaim: state.monthlyLastClaim
  }));
}

function loadGame() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const saved = JSON.parse(raw);
    if (!saved) return;
    const p = saved.player || {};
    state.player.coins = p.coins || 500;
    state.player.crystals = p.crystals || 50;
    state.player.level = p.level || 1;
    state.player.xp = p.xp || 0;
    state.player.score = p.score || 0;
    state.player.weaponIndex = p.weaponIndex || 0;
    state.player.maxHealth = p.maxHealth || 100;
    state.player.maxShield = p.maxShield || 50;
    state.equippedSkin = p.equippedSkin || 'Default';
    state.totalKills = p.totalKills || 0;
    state.player.totalDamage = p.totalDamage || 0;
    state.upgrades = saved.upgrades || state.upgrades;
    state.selectedArena = saved.selectedArena || 'Neon City';
    state.gameMode = saved.gameMode || 'survival';
    state.dailyLastClaim = saved.dailyLastClaim || 0;
    state.monthlyLastClaim = saved.monthlyLastClaim || 0;
    if (saved.weapons) {
      weapons.forEach((weapon) => {
        const found = saved.weapons.find(w => w.name === weapon.name);
        weapon.unlocked = found ? found.unlocked : weapon.unlocked;
      });
    }
    if (saved.achievements) state.achievements = saved.achievements;
    if (saved.missions) state.missions = saved.missions;
    if (saved.battlePass) state.battlePass = saved.battlePass;
  } catch (e) {
    console.warn('Save load error', e);
  }
}

function showMessage(text, duration = 1.6) {
  ui.message.textContent = text;
  ui.message.classList.add('visible');
  clearTimeout(showMessage.timeoutId);
  showMessage.timeoutId = setTimeout(() => ui.message.classList.remove('visible'), duration * 1000);
}

function updateMenuStats() {
  ui.menuLevel.textContent = String(state.player.level);
  ui.menuCoins.textContent = String(state.player.coins);
  ui.menuScore.textContent = String(state.player.score);
  ui.menuWave.textContent = String(state.wave);
  ui.battlePassText.textContent = `${state.battlePass.level} / ${state.battlePass.maxProgress}`;
  ui.objectiveText.textContent = getObjectiveText();
}

function getObjectiveText() {
  switch (state.gameMode) {
    case 'boss': return 'Defeat the boss';
    case 'missions': return 'Complete missions';
    default: return 'Survive the arena';
  }
}

function updateHud() {
  const weapon = weapons[state.player.weaponIndex];
  ui.hudLevel.textContent = String(state.player.level);
  ui.hudWave.textContent = String(state.wave);
  ui.hudScore.textContent = String(state.player.score);
  ui.hudCoins.textContent = String(state.player.coins);
  ui.hudMode.textContent = state.gameMode.toUpperCase();
  ui.weaponName.textContent = `${weapon.name} (${state.player.combo}x)`;
  ui.hudAmmo.textContent = `${weapon.ammo} / ${weapon.magSize}`;
  ui.healthBar.style.width = `${Math.max(0, (state.player.health / state.player.maxHealth) * 100)}%`;
  ui.objectiveHud.textContent = `Objective: ${getObjectiveText()}`;
}

function renderShop() {
  ui.shopList.innerHTML = '';
  weapons.forEach((weapon, index) => {
    const card = document.createElement('div');
    card.className = 'shop-item';
    card.innerHTML = `
      <h3>${weapon.name}</h3>
      <p>DMG: ${weapon.damage} | FR: ${weapon.fireRate.toFixed(2)}s</p>
      <p>Ammo: ${weapon.magSize}</p>
      <p>Cost: ${weapon.cost} coins / ${weapon.crystalCost} crystals</p>
      <button>${weapon.unlocked ? 'Equip' : 'Buy'}</button>
    `;
    card.querySelector('button').addEventListener('click', () => {
      if (!weapon.unlocked) {
        if (state.player.coins >= weapon.cost && state.player.crystals >= weapon.crystalCost) {
          state.player.coins -= weapon.cost;
          state.player.crystals -= weapon.crystalCost;
          weapon.unlocked = true;
          showMessage(`${weapon.name} unlocked!`);
          saveGame();
          renderShop();
          updateMenuStats();
        } else {
          showMessage('Not enough resources');
        }
      } else {
        state.player.weaponIndex = index;
        showMessage(`${weapon.name} equipped`);
        updateHud();
      }
    });
    ui.shopList.appendChild(card);
  });
}

function createPlayerMesh() {
  const group = new THREE.Group();
  const colors = {
    'Default': 0x6aa9ff,
    'Neon': 0xff00ff,
    'Ghost': 0x7dd3fc,
    'Void': 0x131720
  };
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.7, 1.7, 12),
    new THREE.MeshStandardMaterial({
      color: colors[state.equippedSkin] || colors['Default'],
      metalness: 0.3,
      roughness: 0.4
    })
  );
  body.position.y = 0.85;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xf8f9ff, emissive: 0x1d3557 })
  );
  head.position.y = 1.9;
  head.castShadow = true;
  group.add(head);

  scene.add(group);
  state.player.mesh = group;
}

function spawnEnemy(isBoss = false, bossType = null) {
  let type, base;
  
  if (isBoss && bossType) {
    base = BOSS_TYPES[bossType];
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.2, 1.2),
      new THREE.MeshStandardMaterial({ color: base.color, emissive: base.color, emissiveIntensity: 0.3 })
    );
    mesh.castShadow = true;
    mesh.scale.set(1.8, 2.2, 1.8);

    const angle = Math.random() * Math.PI * 2;
    const dist = 14 + Math.random() * 14;
    mesh.position.set(Math.cos(angle) * dist, 0.9, Math.sin(angle) * dist);

    const enemy = {
      id: state.nextEnemyId++,
      type: 'boss',
      bossType,
      mesh,
      speed: base.speed + state.wave * 0.06,
      health: base.health + state.wave * 35,
      maxHealth: base.health + state.wave * 35,
      damage: base.damage,
      reward: 120 + state.wave * 5,
      rewardXp: 150,
      shootCooldown: 0,
      hitCooldown: 0,
      aiTimer: 0
    };

    scene.add(mesh);
    state.enemies.push(enemy);
  } else {
    const arena = ARENAS[state.selectedArena];
    type = arena.enemies[Math.floor(Math.random() * arena.enemies.length)];
    base = enemyTypes[type];

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(base.size, base.size, base.size),
      new THREE.MeshStandardMaterial({ color: base.color, emissive: base.color, emissiveIntensity: 0.2 })
    );
    mesh.castShadow = true;

    const angle = Math.random() * Math.PI * 2;
    const dist = 12 + Math.random() * 16;
    mesh.position.set(Math.cos(angle) * dist, 0.8, Math.sin(angle) * dist);

    const enemy = {
      id: state.nextEnemyId++,
      type,
      mesh,
      speed: base.speed + state.wave * 0.08,
      health: base.health + state.wave * 5,
      maxHealth: base.health + state.wave * 5,
      damage: base.damage,
      reward: base.reward + state.wave * 2,
      rewardXp: base.rewardXp,
      shootCooldown: 0,
      hitCooldown: 0,
      ai: base.ai,
      aiTimer: 0
    };

    scene.add(mesh);
    state.enemies.push(enemy);
  }
}

function spawnWave() {
  state.enemies.forEach(enemy => scene.remove(enemy.mesh));
  state.enemies = [];

  const arena = ARENAS[state.selectedArena];
  const count = Math.floor((4 + state.wave * 2) * arena.difficulty);
  const bossWave = state.wave % 5 === 0 && state.gameMode !== 'boss';

  for (let i = 0; i < count; i++) {
    if (bossWave && i === count - 1) {
      const bosses = arena.bosses;
      const bossType = bosses[Math.floor(Math.random() * bosses.length)];
      spawnEnemy(true, bossType);
    } else {
      spawnEnemy(false);
    }
  }

  showMessage(`Wave ${state.wave} started`);
  updateHud();
}

function fireWeapon() {
  const weapon = weapons[state.player.weaponIndex];
  if (!weapon || weapon.ammo <= 0) {
    showMessage('Reload');
    return;
  }

  const now = performance.now();
  if (now - state.lastFire < weapon.fireRate * 1000) return;
  state.lastFire = now;
  weapon.ammo -= 1;
  state.shotFlash = 0.1;

  for (let i = 0; i < weapon.pelletCount; i++) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const spread = weapon.pelletCount > 1 ? 0.12 : 0.04;
    dir.x += (Math.random() - 0.5) * spread;
    dir.y += (Math.random() - 0.5) * spread;
    dir.z += (Math.random() - 0.5) * spread;
    dir.normalize();

    const projectile = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({ color: weapon.color, emissive: weapon.color, emissiveIntensity: 0.9 })
    );
    const origin = state.player.position.clone();
    origin.y += 1.4;
    projectile.position.copy(origin);
    scene.add(projectile);

    let damage = weapon.damage + state.upgrades.damage * 6;
    if (Math.random() < state.critChance) {
      damage *= 2;
      createBurst(origin.clone(), 0xff0000, 0.2);
    }

    state.projectiles.push({
      mesh: projectile,
      velocity: dir.multiplyScalar(weapon.bulletSpeed),
      damage,
      life: weapon.type === 'explosive' ? 1.5 : 1.2,
      enemyShot: false,
      type: weapon.type
    });
  }

  if (weapon.ammo <= 0) reloadWeapon();
  updateHud();
}

function reloadWeapon() {
  const weapon = weapons[state.player.weaponIndex];
  if (!weapon || weapon.ammo >= weapon.magSize || state.player.reloadTimer > 0) return;
  state.player.reloadTimer = weapon.reloadTime;
  showMessage(`Reloading ${weapon.name}`);
}

function updatePlayer(dt) {
  const dir = new THREE.Vector3();
  if (keys.KeyW) dir.z -= 1;
  if (keys.KeyS) dir.z += 1;
  if (keys.KeyA) dir.x -= 1;
  if (keys.KeyD) dir.x += 1;

  if (dir.lengthSq() > 0) {
    dir.normalize();
    const forward = new THREE.Vector3(Math.sin(state.player.yaw), 0, Math.cos(state.player.yaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const move = new THREE.Vector3();
    move.addScaledVector(forward, dir.z);
    move.addScaledVector(right, dir.x);
    move.normalize();
    const speed = state.player.speed + state.upgrades.speed * 0.7;
    state.player.position.addScaledVector(move, speed * dt);
  }

  state.player.position.x = THREE.MathUtils.clamp(state.player.position.x, -32, 32);
  state.player.position.z = THREE.MathUtils.clamp(state.player.position.z, -32, 32);

  if (state.player.reloadTimer > 0) {
    state.player.reloadTimer -= dt;
    if (state.player.reloadTimer <= 0) {
      const weapon = weapons[state.player.weaponIndex];
      weapon.ammo = weapon.magSize;
      showMessage(`${weapon.name} reloaded`);
    }
  }

  if (state.player.comboTimer > 0) {
    state.player.comboTimer -= dt;
    if (state.player.comboTimer <= 0) {
      state.player.combo = 0;
    }
  }

  if (state.player.health <= 0) endRun();
}

function updateCamera() {
  const pos = state.player.position.clone();
  if (state.player.lookMode === 'first') {
    camera.position.copy(pos).add(new THREE.Vector3(0, 1.5, 0));
    camera.rotation.order = 'YXZ';
    camera.rotation.y = state.player.yaw;
    camera.rotation.x = state.player.pitch;
  } else {
    const target = pos.clone().add(new THREE.Vector3(0, 1.2, 0));
    const back = new THREE.Vector3(Math.sin(state.player.yaw), 0, Math.cos(state.player.yaw));
    camera.position.copy(target).add(back.multiplyScalar(-5));
    camera.position.y += 2.5;
    camera.lookAt(target);
  }
}

function updateEnemies(dt) {
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    const dir = state.player.position.clone().sub(enemy.mesh.position);
    const distance = dir.length();

    if (distance > 0.001) {
      dir.normalize();
      enemy.mesh.position.addScaledVector(dir, enemy.speed * dt);
    }

    if ((enemy.type === 'ranged' || (enemy.type === 'boss' && enemy.bossType.includes('hunter'))) && distance < 20 && enemy.shootCooldown <= 0) {
      enemy.shootCooldown = enemy.type === 'boss' ? 0.8 : 1.4;
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xff7e6b, emissive: 0xff7e6b })
      );
      p.position.copy(enemy.mesh.position);
      scene.add(p);
      const v = state.player.position.clone().sub(enemy.mesh.position).normalize().multiplyScalar(20);
      state.projectiles.push({ mesh: p, velocity: v, damage: enemy.damage, life: 2.5, enemyShot: true });
    } else {
      enemy.shootCooldown = Math.max(0, enemy.shootCooldown - dt);
    }

    if (distance < 1.35 && enemy.hitCooldown <= 0) {
      let damage = enemy.damage;
      if (state.player.shield > 0) {
        state.player.shield = Math.max(0, state.player.shield - damage);
        damage = 0;
      }
      if (damage > 0) state.player.health -= damage;
      enemy.hitCooldown = 0.4;
      if (state.player.health <= 0) endRun();
    } else {
      enemy.hitCooldown = Math.max(0, enemy.hitCooldown - dt);
    }
  }
}

function updateProjectiles(dt) {
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const bullet = state.projectiles[i];
    bullet.mesh.position.addScaledVector(bullet.velocity, dt);
    bullet.life -= dt;

    for (let j = state.enemies.length - 1; j >= 0; j--) {
      const enemy = state.enemies[j];
      const hitDist = enemy.type === 'boss' ? 1.8 : 0.95;
      if (bullet.mesh.position.distanceTo(enemy.mesh.position) < hitDist) {
        enemy.health -= bullet.damage;
        state.player.totalDamage += bullet.damage;
        createBurst(enemy.mesh.position.clone(), 0xffcc66, 0.25);
        scene.remove(bullet.mesh);
        state.projectiles.splice(i, 1);
        if (enemy.health <= 0) {
          enemyDefeated(enemy, j);
        }
        break;
      }
    }

    if (bullet.enemyShot && bullet.mesh.position.distanceTo(state.player.position) < 1.1) {
      scene.remove(bullet.mesh);
      state.projectiles.splice(i, 1);
      state.player.health = Math.max(0, state.player.health - bullet.damage);
    }

    if (bullet.life <= 0) {
      scene.remove(bullet.mesh);
      state.projectiles.splice(i, 1);
    }
  }
}

function createBurst(position, color, lifetime = 0.25) {
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 4, 4),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, transparent: true, opacity: 1 })
    );
    p.position.copy(position);
    scene.add(p);
    state.particles.push({ mesh: p, velocity: new THREE.Vector3((Math.random() - 0.5) * 10, Math.random() * 8, (Math.random() - 0.5) * 10), lifetime, maxLifetime: lifetime });
  }
}

function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.mesh.position.addScaledVector(p.velocity, dt);
    p.velocity.multiplyScalar(0.94);
    p.lifetime -= dt;
    const a = Math.max(0, p.lifetime / p.maxLifetime);
    p.mesh.material.opacity = a;
    if (p.lifetime <= 0) {
      scene.remove(p.mesh);
      state.particles.splice(i, 1);
    }
  }
}

function updateMissions() {
  state.missions.forEach(mission => {
    if (mission.completed) return;
    const req = mission.requirement;
    if (req.wave && state.wave >= req.wave) completeMission(mission);
    if (req.kills && state.player.kills >= req.kills) completeMission(mission);
    if (req.bosses && state.bossDefeated >= req.bosses) completeMission(mission);
    if (req.combo && state.player.combo >= req.combo) completeMission(mission);
    if (req.damage && state.player.totalDamage >= req.damage) completeMission(mission);
  });
}

function completeMission(mission) {
  if (mission.completed) return;
  mission.completed = true;
  state.player.coins += mission.reward;
  state.player.xp += mission.xpReward;
  state.battlePass.progress += 20;
  showMessage(`Mission complete: ${mission.name} +${mission.reward} coins`);
  saveGame();
}

function enemyDefeated(enemy, index) {
  const rewardCoins = enemy.reward + state.player.combo * 3;
  state.player.coins += rewardCoins;
  state.player.totalCoinsEarned += rewardCoins;
  state.player.score += rewardCoins * 12;
  state.player.xp += enemy.rewardXp;
  state.player.kills += 1;
  state.totalKills += 1;
  state.player.combo += 1;
  state.player.comboTimer = 5;

  scene.remove(enemy.mesh);
  state.enemies.splice(index, 1);

  if (state.player.xp >= state.player.level * 120) {
    state.player.xp -= state.player.level * 120;
    state.player.level += 1;
    state.player.maxHealth += 15;
    state.player.maxShield += 10;
    state.player.health = state.player.maxHealth;
    state.player.shield = state.player.maxShield;
    showMessage(`Level up! ${state.player.level}`);
  }

  if (enemy.type === 'boss') {
    state.bossDefeated += 1;
    state.player.crystals += 40;
    showMessage(`Boss defeated! +40 crystals`);
  }

  if (Math.random() < 0.48) spawnLoot(enemy.mesh.position.clone());
  updateMissions();
  checkAchievements();

  if (state.enemies.length === 0 && state.gameMode === 'survival') {
    state.wave += 1;
    setTimeout(() => spawnWave(), 800);
  }

  if (state.enemies.length === 0 && state.gameMode === 'boss') {
    showMessage('Boss defeated! Run complete!');
    endRun();
  }

  updateMenuStats();
  updateHud();
}

function spawnLoot(position) {
  const tiers = Object.keys(LOOT_TIERS);
  let tier = 'common';
  const rand = Math.random();
  let cumulative = 0;
  for (const t of tiers) {
    cumulative += LOOT_TIERS[t].dropChance;
    if (rand < cumulative) {
      tier = t;
      break;
    }
  }

  const lootTier = LOOT_TIERS[tier];
  const mesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.3, 0),
    new THREE.MeshStandardMaterial({ color: lootTier.color, emissive: lootTier.color, emissiveIntensity: 0.8 })
  );
  mesh.position.copy(position);
  mesh.position.y = 0.8;
  scene.add(mesh);

  state.loot.push({ type: tier, mesh, bob: Math.random() * Math.PI * 2, stats: lootTier.stats });
}

function updateLoot() {
  for (let i = state.loot.length - 1; i >= 0; i--) {
    const item = state.loot[i];
    item.mesh.position.y = 0.8 + Math.sin(performance.now() * 0.006 + item.bob) * 0.3;
    if (item.mesh.position.distanceTo(state.player.position) < 1.5) {
      state.player.coins += 25 + (LOOT_TIERS[item.type].dropChance < 0.3 ? 50 : 0);
      if (item.type === 'rare') state.player.crystals += 5;
      if (item.type === 'epic') state.player.crystals += 10;
      if (item.type === 'legendary') state.player.crystals += 25;

      scene.remove(item.mesh);
      state.loot.splice(i, 1);
      showMessage(`Loot: ${item.type}`);
      updateHud();
      updateMenuStats();
    }
  }
}

function checkAchievements() {
  const rules = [
    ['first_kill', state.player.kills >= 1],
    ['wave_5', state.wave >= 5],
    ['boss_killer', state.bossDefeated >= 1],
    ['combo_10', state.player.combo >= 10],
    ['arena_master', state.wave >= 20],
    ['legendary_hunter', state.totalKills >= 500]
  ];

  for (const [id, condition] of rules) {
    const item = state.achievements.find(a => a.id === id);
    if (!item || item.unlocked) continue;
    if (condition) {
      item.unlocked = true;
      state.player.crystals += item.reward;
      showMessage(`Achievement: ${item.name}`);
    }
  }
}

function startRun() {
  state.running = true;
  ui.menu.classList.add('hidden');
  ui.hud.classList.remove('hidden');

  if (!state.player.mesh) createPlayerMesh();

  state.player.position.set(0, 1.2, 0);
  state.player.health = state.player.maxHealth;
  state.player.shield = state.player.maxShield;
  state.player.yaw = 0;
  state.player.pitch = 0;
  state.wave = 1;

  if (state.gameMode === 'boss') {
    const arena = ARENAS[state.selectedArena];
    const bossType = arena.bosses[Math.floor(Math.random() * arena.bosses.length)];
    spawnEnemy(true, bossType);
  } else {
    spawnWave();
  }

  updateMenuStats();
  updateHud();
}

function endRun() {
  state.running = false;
  ui.menu.classList.remove('hidden');
  ui.hud.classList.add('hidden');
  showMessage('Run ended');
  saveGame();
}

function toggleCamera() {
  state.player.lookMode = state.player.lookMode === 'first' ? 'third' : 'first';
  showMessage(state.player.lookMode === 'first' ? 'First Person' : 'Third Person');
}

function handleInputs() {
  document.addEventListener('keydown', (event) => {
    keys[event.code] = true;
    if (event.code === 'KeyR') reloadWeapon();
    if (event.code === 'KeyV') toggleCamera();
    if (event.code === 'Space') fireWeapon();
    if (event.code === 'KeyE') {
      if (state.player.combo >= 5) {
        state.player.health = Math.min(state.player.maxHealth, state.player.health + 35);
        state.player.combo = 0;
        showMessage('Heal burst');
      }
    }
  });

  document.addEventListener('keyup', (event) => {
    keys[event.code] = false;
  });

  document.addEventListener('mousemove', (event) => {
    if (!state.running || !state.pointerLocked) return;
    state.player.yaw -= event.movementX * 0.0025;
    state.player.pitch -= event.movementY * 0.0018;
    state.player.pitch = THREE.MathUtils.clamp(state.player.pitch, -1.2, 1.2);
  });

  document.addEventListener('pointerlockchange', () => {
    state.pointerLocked = document.pointerLockElement === renderer.domElement;
  });

  window.addEventListener('pointerdown', () => {
    if (state.running) renderer.domElement.requestPointerLock();
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  window.addEventListener('click', () => {
    if (state.running && !state.pointerLocked) fireWeapon();
  });

  ui.startBtn.addEventListener('click', startRun);
  ui.shopBtn.addEventListener('click', () => {
    renderShop();
    ui.shopPanel.classList.toggle('hidden');
  });
  ui.giftBtn.addEventListener('click', () => ui.giftPanel.classList.toggle('hidden'));

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => document.getElementById(btn.dataset.close).classList.add('hidden'));
  });

  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.gameMode = btn.dataset.mode;
      saveGame();
    });
  });

  document.querySelectorAll('.map-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.map-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedArena = btn.dataset.map;
      const arena = ARENAS[state.selectedArena];
      scene.background = new THREE.Color(arena.bg);
      scene.fog = new THREE.Fog(arena.bg, 18, 70);
      saveGame();
    });
  });

  if (ui.dailyGiftBtn) ui.dailyGiftBtn.addEventListener('click', claimDailyReward);
  if (ui.monthlyGiftBtn) ui.monthlyGiftBtn.addEventListener('click', claimMonthlyReward);

  if (document.getElementById('upgradeDamage')) {
    document.getElementById('upgradeDamage').addEventListener('click', () => {
      if (state.player.coins >= 70) {
        state.player.coins -= 70;
        state.upgrades.damage += 1;
        showMessage('Damage upgraded');
        saveGame();
        updateMenuStats();
      }
    });
  }

  if (document.getElementById('upgradeHealth')) {
    document.getElementById('upgradeHealth').addEventListener('click', () => {
      if (state.player.coins >= 90) {
        state.player.coins -= 90;
        state.player.maxHealth += 25;
        state.player.health = state.player.maxHealth;
        state.upgrades.health += 1;
        showMessage('Health upgraded');
        saveGame();
        updateMenuStats();
      }
    });
  }

  if (document.getElementById('upgradeFireRate')) {
    document.getElementById('upgradeFireRate').addEventListener('click', () => {
      if (state.player.coins >= 100) {
        state.player.coins -= 100;
        state.upgrades.fireRate += 1;
        state.upgrades.crit += 0.02;
        state.critChance = 0.15 + state.upgrades.crit;
        weapons.forEach((weapon) => weapon.fireRate = Math.max(0.05, weapon.fireRate * 0.93));
        showMessage('Fire rate upgraded');
        saveGame();
        updateMenuStats();
      }
    });
  }
}

function claimDailyReward() {
  const now = Date.now();
  if (state.dailyLastClaim && now - state.dailyLastClaim < 86400000) {
    showMessage('Daily gift not ready');
    return;
  }
  const coins = 150 + state.player.level * 20;
  const crystals = 8 + Math.floor(state.player.level / 3);
  state.player.coins += coins;
  state.player.crystals += crystals;
  state.dailyLastClaim = now;
  showMessage(`Daily: +${coins} coins, +${crystals} crystals`);
  saveGame();
  updateMenuStats();
}

function claimMonthlyReward() {
  const now = Date.now();
  if (state.monthlyLastClaim && now - state.monthlyLastClaim < 2592000000) {
    showMessage('Monthly gift not ready');
    return;
  }
  const coins = 800 + state.player.level * 100;
  const crystals = 60 + state.player.level * 10;
  state.player.coins += coins;
  state.player.crystals += crystals;
  state.player.health = state.player.maxHealth;
  state.player.shield = state.player.maxShield;
  state.monthlyLastClaim = now;
  showMessage(`Monthly: +${coins} coins, +${crystals} crystals`);
  saveGame();
  updateMenuStats();
}

function buildArena() {
  const arena = ARENAS[state.selectedArena];
  scene.background = new THREE.Color(arena.bg);
  scene.fog = new THREE.Fog(arena.bg, 18, 70);

  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(35, 35, 1, 48),
    new THREE.MeshStandardMaterial({ color: 0x112233, roughness: 0.8, metalness: 0.1 })
  );
  floor.position.y = -0.5;
  floor.receiveShadow = true;
  scene.add(floor);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(20, 0.5, 16, 120),
    new THREE.MeshStandardMaterial({ color: arena.envColor, emissive: arena.envColor, emissiveIntensity: 0.6 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.2;
  scene.add(ring);

  const hemi = new THREE.HemisphereLight(0x8ec5ff, 0x0b1020, 1.4);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.3);
  dir.position.set(8, 16, 10);
  dir.castShadow = true;
  dir.shadow.mapSize.width = 2048;
  dir.shadow.mapSize.height = 2048;
  scene.add(dir);

  const glow = new THREE.PointLight(arena.envColor, 25, 90, 2.0);
  glow.position.set(0, 6, 0);
  scene.add(glow);
}

function init() {
  loadGame();
  buildArena();
  renderShop();
  updateMenuStats();
  updateHud();
  handleInputs();
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);

  if (state.running) {
    updatePlayer(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updateLoot();
    updateParticles(dt);
  }

  if (state.player.mesh) {
    state.player.mesh.position.copy(state.player.position);
  }

  updateCamera();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

init();
animate();
