import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';

const canvas = document.getElementById('gameCanvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x081521);
scene.fog = new THREE.Fog(0x081521, 18, 65);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 250);
camera.position.set(0, 2, 8);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const clock = new THREE.Clock();
const keys = {};
const state = {
  running: false,
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
    coins: 250,
    crystals: 20,
    score: 0,
    kills: 0,
    combo: 0,
    comboTimer: 0,
    weaponIndex: 0,
    reloadTimer: 0,
    lookMode: 'first',
    mesh: null
  },
  wave: 1,
  season: 'Neon City',
  enemies: [],
  projectiles: [],
  pickups: [],
  particles: [],
  lastFire: 0,
  nextEnemyId: 1,
  nextPickupId: 1,
  pointerLocked: false,
  upgrades: { damage: 0, health: 0, fireRate: 0, speed: 0, shield: 0 },
  achievements: [
    { id: 'first_kill', name: 'First Blood', unlocked: false, reward: 50 },
    { id: 'wave_5', name: 'Wave Runner', unlocked: false, reward: 150 },
    { id: 'boss_killer', name: 'Boss Slayer', unlocked: false, reward: 200 },
    { id: 'combo_10', name: 'Combo Master', unlocked: false, reward: 150 }
  ],
  dailyLastClaim: 0,
  monthlyLastClaim: 0,
  bossDefeated: 0,
  shotFlash: 0,
  totalKills: 0,
  seasonIndex: 1,
  premium: false,
  equippedSkin: 'Default'
};

const weapons = [
  { name: 'Pistol', damage: 22, fireRate: 0.28, ammo: 12, magSize: 12, reloadTime: 1.0, bulletSpeed: 36, pelletCount: 1, cost: 0, crystalCost: 0, color: 0x7cf0ff, unlocked: true, type: 'hitscan', recoil: 0.08 },
  { name: 'Rifle', damage: 18, fireRate: 0.12, ammo: 30, magSize: 30, reloadTime: 1.15, bulletSpeed: 38, pelletCount: 1, cost: 90, crystalCost: 0, color: 0x7ce19d, unlocked: false, type: 'hitscan', recoil: 0.12 },
  { name: 'Shotgun', damage: 12, fireRate: 0.7, ammo: 8, magSize: 8, reloadTime: 1.4, bulletSpeed: 28, pelletCount: 8, cost: 150, crystalCost: 0, color: 0xfbbf24, unlocked: false, type: 'scatter', recoil: 0.3 },
  { name: 'Sniper', damage: 52, fireRate: 1.15, ammo: 5, magSize: 5, reloadTime: 1.7, bulletSpeed: 48, pelletCount: 1, cost: 220, crystalCost: 0, color: 0xa78bfa, unlocked: false, type: 'hitscan', recoil: 0.02 },
  { name: 'Plasma', damage: 28, fireRate: 0.18, ammo: 20, magSize: 20, reloadTime: 1.15, bulletSpeed: 42, pelletCount: 1, cost: 260, crystalCost: 40, color: 0xf472b6, unlocked: false, type: 'energy', recoil: 0.12 },
  { name: 'Grenade Launcher', damage: 36, fireRate: 1.35, ammo: 4, magSize: 4, reloadTime: 1.8, bulletSpeed: 18, pelletCount: 1, cost: 310, crystalCost: 50, color: 0xfb7185, unlocked: false, type: 'explosive', recoil: 0.4 },
  { name: 'Laser', damage: 30, fireRate: 0.09, ammo: 40, magSize: 40, reloadTime: 1.0, bulletSpeed: 50, pelletCount: 1, cost: 350, crystalCost: 65, color: 0x00ff88, unlocked: false, type: 'beam', recoil: 0.04 },
  { name: 'Minigun', damage: 15, fireRate: 0.05, ammo: 50, magSize: 50, reloadTime: 1.5, bulletSpeed: 35, pelletCount: 1, cost: 420, crystalCost: 70, color: 0xff6b35, unlocked: false, type: 'hitscan', recoil: 0.18 }
];

const enemyTypes = {
  walker: { health: 30, speed: 2.2, damage: 8, size: 0.9, color: 0x8aa1ff, reward: 10, rewardXp: 25 },
  fast: { health: 25, speed: 2.8, damage: 6, size: 0.7, color: 0x42d392, reward: 15, rewardXp: 30 },
  heavy: { health: 65, speed: 1.7, damage: 10, size: 1.15, color: 0xfea800, reward: 18, rewardXp: 40 },
  ranged: { health: 38, speed: 2.0, damage: 8, size: 0.85, color: 0x5aa9ff, reward: 15, rewardXp: 35 },
  boss: { health: 170, speed: 1.4, damage: 18, size: 1.5, color: 0xff4f5d, reward: 60, rewardXp: 90 }
};

const seasons = [
  { name: 'Neon City', bg: 0x081521, fog: 0x173b5c },
  { name: 'Desert', bg: 0x8b6a2b, fog: 0xd9ae73 },
  { name: 'Gloom', bg: 0x111827, fog: 0x334155 },
  { name: 'Arctic', bg: 0x1a3045, fog: 0xb6d8f6 }
];

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
  monthlyGiftBtn: document.getElementById('monthlyGiftBtn')
};

const STORAGE_KEY = 'growl_sars_v2';

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
      equippedSkin: state.equippedSkin
    },
    upgrades: state.upgrades,
    wave: state.wave,
    seasonIndex: state.seasonIndex,
    dailyLastClaim: state.dailyLastClaim,
    monthlyLastClaim: state.monthlyLastClaim,
    weapons: weapons.map(w => ({ name: w.name, unlocked: w.unlocked })),
    achievements: state.achievements
  }));
}

function loadGame() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const saved = JSON.parse(raw);
    if (!saved) return;
    const p = saved.player || {};
    state.player.coins = p.coins || 250;
    state.player.crystals = p.crystals || 20;
    state.player.level = p.level || 1;
    state.player.xp = p.xp || 0;
    state.player.score = p.score || 0;
    state.player.weaponIndex = p.weaponIndex || 0;
    state.player.maxHealth = p.maxHealth || 100;
    state.player.maxShield = p.maxShield || 50;
    state.equippedSkin = p.equippedSkin || 'Default';
    state.upgrades = saved.upgrades || state.upgrades;
    state.wave = saved.wave || 1;
    state.seasonIndex = saved.seasonIndex || 1;
    state.dailyLastClaim = saved.dailyLastClaim || 0;
    state.monthlyLastClaim = saved.monthlyLastClaim || 0;
    if (saved.weapons) {
      weapons.forEach((weapon) => {
        const found = saved.weapons.find(w => w.name === weapon.name);
        weapon.unlocked = found ? found.unlocked : weapon.unlocked;
      });
    }
    state.achievements = saved.achievements || state.achievements;
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
}

function updateHud() {
  const weapon = weapons[state.player.weaponIndex];
  ui.hudLevel.textContent = String(state.player.level);
  ui.hudWave.textContent = String(state.wave);
  ui.hudScore.textContent = String(state.player.score);
  ui.hudCoins.textContent = String(state.player.coins);
  ui.weaponName.textContent = `${weapon.name} (${state.player.combo}x)`;
  ui.hudAmmo.textContent = `${weapon.ammo} / ${weapon.magSize}`;
  ui.healthBar.style.width = `${Math.max(0, (state.player.health / state.player.maxHealth) * 100)}%`;
}

function renderShop() {
  ui.shopList.innerHTML = '';
  weapons.forEach((weapon, index) => {
    const card = document.createElement('div');
    card.className = 'shop-item';
    card.innerHTML = `
      <h3>${weapon.name}</h3>
      <p>DMG: ${weapon.damage}</p>
      <p>Rate: ${weapon.fireRate}s</p>
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

function refreshGiftStatus() {
  const now = Date.now();
  const dailyReady = !state.dailyLastClaim || (now - state.dailyLastClaim >= 86400000);
  const monthlyReady = !state.monthlyLastClaim || (now - state.monthlyLastClaim >= 2592000000);
  ui.dailyStatus.textContent = dailyReady ? 'Ready to claim' : 'Next daily in ' + formatDelay(state.dailyLastClaim, 86400000);
  ui.monthlyStatus.textContent = monthlyReady ? 'Ready for premium drop' : 'Next monthly in ' + formatDelay(state.monthlyLastClaim, 2592000000);
}

function formatDelay(lastTime, ms) {
  const diff = Math.max(0, ms - (Date.now() - lastTime));
  const hours = Math.ceil(diff / 3600000);
  return `${hours}h`;
}

function claimDailyReward() {
  const now = Date.now();
  const ready = !state.dailyLastClaim || (now - state.dailyLastClaim >= 86400000);
  if (!ready) {
    showMessage('Daily gift not ready');
    return;
  }
  const coins = 100 + state.player.level * 15;
  const crystals = 5 + Math.floor(state.player.level / 4);
  state.player.coins += coins;
  state.player.crystals += crystals;
  state.dailyLastClaim = now;
  ui.dailyStatus.textContent = `+${coins} coins, +${crystals} crystals`;
  showMessage(`Daily gift: +${coins} coins, +${crystals} crystals`);
  saveGame();
  updateMenuStats();
}

function claimMonthlyReward() {
  const now = Date.now();
  const ready = !state.monthlyLastClaim || (now - state.monthlyLastClaim >= 2592000000);
  if (!ready) {
    showMessage('Monthly gift not ready');
    return;
  }
  const coins = 500 + state.player.level * 80;
  const crystals = 35 + state.player.level * 6;
  state.player.coins += coins;
  state.player.crystals += crystals;
  state.player.health = state.player.maxHealth;
  state.player.shield = state.player.maxShield;
  state.monthlyLastClaim = now;
  ui.monthlyStatus.textContent = `+${coins} coins, +${crystals} crystals`;
  showMessage(`Monthly gift: +${coins} coins, +${crystals} crystals`);
  saveGame();
  updateMenuStats();
}

function setSeason(index) {
  const s = seasons[index % seasons.length];
  state.season = s.name;
  state.seasonIndex = index % seasons.length;
  scene.background = new THREE.Color(s.bg);
  scene.fog.color = new THREE.Color(s.fog);
  showMessage(`Season changed: ${s.name}`);
}

function createPlayerMesh() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.7, 1.7, 12),
    new THREE.MeshStandardMaterial({
      color: state.equippedSkin === 'Neon' ? 0xff00ff : state.equippedSkin === 'Ghost' ? 0x7dd3fc : state.equippedSkin === 'Void' ? 0x131720 : 0x6aa9ff,
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

function spawnEnemy(isBoss = false) {
  const type = isBoss ? 'boss' : pickEnemyType();
  const base = enemyTypes[type];
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(base.size, base.size, base.size),
    new THREE.MeshStandardMaterial({ color: base.color, emissive: base.color, emissiveIntensity: 0.2 })
  );
  mesh.castShadow = true;

  const angle = Math.random() * Math.PI * 2;
  const dist = 12 + Math.random() * 16;
  mesh.position.set(Math.cos(angle) * dist, 0.8, Math.sin(angle) * dist);
  mesh.scale.y = type === 'boss' ? 2.3 : 1;

  const enemy = {
    id: state.nextEnemyId++,
    type,
    mesh,
    speed: base.speed + state.wave * 0.08,
    health: base.health + state.wave * (type === 'boss' ? 28 : 5),
    maxHealth: base.health + state.wave * (type === 'boss' ? 28 : 5),
    damage: base.damage,
    reward: base.reward + state.wave * 2,
    rewardXp: base.rewardXp,
    shootCooldown: 0,
    hitCooldown: 0
  };

  scene.add(mesh);
  state.enemies.push(enemy);
}

function pickEnemyType() {
  const options = ['walker', 'fast', 'heavy', 'ranged'];
  return options[Math.floor(Math.random() * options.length)];
}

function spawnWave() {
  state.enemies.forEach(enemy => scene.remove(enemy.mesh));
  state.enemies = [];

  const count = 4 + state.wave * 2;
  const bossWave = state.wave % 5 === 0;

  for (let i = 0; i < count; i++) {
    spawnEnemy(bossWave && i === count - 1);
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

    const damage = weapon.damage + state.upgrades.damage * 5;
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
    const speed = state.player.speed + state.upgrades.speed * 0.6;
    state.player.position.addScaledVector(move, speed * dt);
  }

  state.player.position.x = THREE.MathUtils.clamp(state.player.position.x, -30, 30);
  state.player.position.z = THREE.MathUtils.clamp(state.player.position.z, -30, 30);

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
    camera.position.copy(target).add(back.multiplyScalar(-4.8));
    camera.position.y += 2.3;
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

    if (enemy.type === 'ranged' && distance < 18 && enemy.shootCooldown <= 0) {
      enemy.shootCooldown = 1.4;
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xff7e6b, emissive: 0xff7e6b })
      );
      p.position.copy(enemy.mesh.position);
      scene.add(p);
      const v = state.player.position.clone().sub(enemy.mesh.position).normalize().multiplyScalar(18);
      state.projectiles.push({ mesh: p, velocity: v, damage: enemy.damage, life: 2, enemyShot: true });
    } else {
      enemy.shootCooldown = Math.max(0, enemy.shootCooldown - dt);
    }

    if (distance < 1.25 && enemy.hitCooldown <= 0) {
      let damage = enemy.damage;
      if (state.player.shield > 0) {
        state.player.shield = Math.max(0, state.player.shield - damage);
        damage = 0;
      }
      if (damage > 0) state.player.health -= damage;
      enemy.hitCooldown = 0.5;
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
      if (bullet.mesh.position.distanceTo(enemy.mesh.position) < (enemy.type === 'boss' ? 1.7 : 0.9)) {
        enemy.health -= bullet.damage;
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
    state.particles.push({ mesh: p, velocity: new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 6, (Math.random() - 0.5) * 8), lifetime, maxLifetime: lifetime });
  }
}

function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.mesh.position.addScaledVector(p.velocity, dt);
    p.velocity.multiplyScalar(0.96);
    p.lifetime -= dt;
    const a = Math.max(0, p.lifetime / p.maxLifetime);
    p.mesh.material.opacity = a;
    if (p.lifetime <= 0) {
      scene.remove(p.mesh);
      state.particles.splice(i, 1);
    }
  }
}

function enemyDefeated(enemy, index) {
  const rewardCoins = enemy.reward + state.player.combo * 2;
  state.player.coins += rewardCoins;
  state.player.score += rewardCoins * 10;
  state.player.xp += enemy.rewardXp;
  state.player.kills += 1;
  state.totalKills += 1;
  state.player.combo += 1;
  state.player.comboTimer = 5;

  scene.remove(enemy.mesh);
  state.enemies.splice(index, 1);

  if (state.player.xp >= state.player.level * 100) {
    state.player.xp -= state.player.level * 100;
    state.player.level += 1;
    state.player.maxHealth += 12;
    state.player.maxShield += 8;
    state.player.health = state.player.maxHealth;
    state.player.shield = state.player.maxShield;
    showMessage(`Level up! ${state.player.level}`);
  }

  if (enemy.type === 'boss') {
    state.bossDefeated += 1;
    state.player.crystals += 25;
    showMessage('Boss defeated! +25 crystals');
  }

  if (Math.random() < 0.43) spawnPickup(enemy.mesh.position.clone());

  checkAchievements();

  if (state.enemies.length === 0) {
    state.wave += 1;
    if (state.wave % 4 === 0) {
      setSeason((state.seasonIndex + 1) % seasons.length);
    }
    setTimeout(() => spawnWave(), 750);
  }

  updateMenuStats();
  updateHud();
}

function checkAchievements() {
  const rules = [
    ['first_kill', state.player.kills >= 1],
    ['wave_5', state.wave >= 5],
    ['boss_killer', state.bossDefeated >= 1],
    ['combo_10', state.player.combo >= 10]
  ];

  for (const [id, condition] of rules) {
    const item = state.achievements.find(a => a.id === id);
    if (!item || item.unlocked) continue;
    if (condition) {
      item.unlocked = true;
      state.player.crystals += item.reward;
      showMessage(`Achievement: ${item.name} +${item.reward} crystals`);
    }
  }
}

function spawnPickup(position) {
  const types = ['coin', 'health', 'ammo', 'crystal', 'shield'];
  const type = types[Math.floor(Math.random() * types.length)];
  const colors = { coin: 0xfacc15, health: 0x34d399, ammo: 0xa78bfa, crystal: 0xff00ff, shield: 0x00ddff };
  const mesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(type === 'health' ? 0.32 : 0.26, 0),
    new THREE.MeshStandardMaterial({ color: colors[type], emissive: colors[type], emissiveIntensity: 0.7 })
  );
  mesh.position.copy(position);
  mesh.position.y = 0.7;
  scene.add(mesh);
  state.pickups.push({ type, mesh, bob: Math.random() * Math.PI * 2 });
}

function updatePickups() {
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const item = state.pickups[i];
    item.mesh.position.y = 0.7 + Math.sin(performance.now() * 0.006 + item.bob) * 0.25;
    if (item.mesh.position.distanceTo(state.player.position) < 1.4) {
      if (item.type === 'coin') state.player.coins += 20;
      if (item.type === 'health') state.player.health = Math.min(state.player.maxHealth, state.player.health + 25);
      if (item.type === 'ammo') weapons.forEach(w => { w.ammo = Math.min(w.magSize, w.ammo + 6); });
      if (item.type === 'crystal') state.player.crystals += 4;
      if (item.type === 'shield') state.player.shield = state.player.maxShield;

      scene.remove(item.mesh);
      state.pickups.splice(i, 1);
      showMessage(`Pickup: ${item.type}`);
      updateHud();
      updateMenuStats();
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
  state.wave = Math.max(1, state.wave);
  spawnWave();
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
        state.player.health = Math.min(state.player.maxHealth, state.player.health + 30);
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
    state.player.yaw -= event.movementX * 0.0024;
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
  ui.shopBtn.addEventListener('click', () => ui.shopPanel.classList.toggle('hidden'));
  ui.giftBtn.addEventListener('click', () => {
    refreshGiftStatus();
    ui.giftPanel.classList.toggle('hidden');
  });

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => document.getElementById(btn.dataset.close).classList.add('hidden'));
  });

  ui.dailyGiftBtn.addEventListener('click', claimDailyReward);
  ui.monthlyGiftBtn.addEventListener('click', claimMonthlyReward);

  document.getElementById('upgradeDamage').addEventListener('click', () => {
    if (state.player.coins >= 60) {
      state.player.coins -= 60;
      state.upgrades.damage += 1;
      showMessage('Damage upgraded');
      saveGame();
      updateMenuStats();
    }
  });

  document.getElementById('upgradeHealth').addEventListener('click', () => {
    if (state.player.coins >= 70) {
      state.player.coins -= 70;
      state.player.maxHealth += 20;
      state.player.health = state.player.maxHealth;
      state.upgrades.health += 1;
      showMessage('Health upgraded');
      saveGame();
      updateMenuStats();
    }
  });

  document.getElementById('upgradeFireRate').addEventListener('click', () => {
    if (state.player.coins >= 80) {
      state.player.coins -= 80;
      state.upgrades.fireRate += 1;
      weapons.forEach((weapon) => weapon.fireRate = Math.max(0.05, weapon.fireRate * 0.95));
      showMessage('Fire rate upgraded');
      saveGame();
      updateMenuStats();
    }
  });
}

function buildArena() {
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(30, 30, 1, 40),
    new THREE.MeshStandardMaterial({ color: 0x112233, roughness: 0.75, metalness: 0.15 })
  );
  floor.position.y = -0.5;
  floor.receiveShadow = true;
  scene.add(floor);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(18, 0.4, 16, 100),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0b2a41, emissiveIntensity: 0.5 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.15;
  scene.add(ring);

  const hemi = new THREE.HemisphereLight(0x8ec5ff, 0x0b1020, 1.3);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(6, 14, 8);
  dir.castShadow = true;
  dir.shadow.mapSize.width = 2048;
  dir.shadow.mapSize.height = 2048;
  scene.add(dir);

  const glow = new THREE.PointLight(0x2dd4bf, 20, 80, 2.0);
  glow.position.set(0, 5, 0);
  scene.add(glow);
}

function init() {
  loadGame();
  buildArena();
  renderShop();
  refreshGiftStatus();
  updateMenuStats();
  updateHud();
  handleInputs();
  setSeason(state.seasonIndex);
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);

  if (state.running) {
    updatePlayer(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updatePickups();
    updateParticles(dt);
  }

  updateCamera();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

init();
animate();
