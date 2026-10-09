import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';

const canvas = document.getElementById('gameCanvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07111d);
scene.fog = new THREE.Fog(0x07111d, 16, 60);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
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
    velocity: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    speed: 7,
    radius: 1,
    health: 100,
    maxHealth: 100,
    level: 1,
    xp: 0,
    coins: 0,
    crystals: 0,
    score: 0,
    kills: 0,
    weaponIndex: 0,
    reloadTimer: 0,
    pickupCooldown: 0,
    lookMode: 'first',
    combo: 0,
    comboTimer: 0,
    shield: 0,
    maxShield: 50
  },
  wave: 1,
  season: 'Desert',
  enemies: [],
  projectiles: [],
  pickups: [],
  particles: [],
  vfx: [],
  lastFire: 0,
  nextEnemyId: 1,
  nextPickupId: 1,
  pointerLocked: false,
  showingMenu: true,
  dailyRewardReady: true,
  monthlyRewardReady: true,
  dailyLastClaim: 0,
  monthlyLastClaim: 0,
  shotFlash: 0,
  totalKills: 0,
  achievementUnlocks: 0,
  upgrades: {
    damage: 0,
    health: 0,
    fireRate: 0,
    shield: 0,
    speed: 0
  },
  skins: {
    playerSkins: ['Default', 'Neon', 'Ghost', 'Void'],
    playerSkin: 'Default',
    weaponSkins: {}
  },
  battlePass: {
    level: 1,
    progress: 0,
    premium: false
  },
  achievements: [
    { id: 'first_kill', name: 'First Blood', desc: 'Get your first kill', unlocked: false, reward: 50 },
    { id: 'wave_10', name: 'Wave Survivor', desc: 'Reach wave 10', unlocked: false, reward: 200 },
    { id: 'boss_slayer', name: 'Boss Slayer', desc: 'Defeat 5 bosses', unlocked: false, reward: 300 },
    { id: 'combo_10', name: 'Combo Master', desc: 'Reach 10 kill combo', unlocked: false, reward: 150 },
    { id: 'headshots', name: 'Precision', desc: 'Land 50 headshots', unlocked: false, reward: 250 }
  ]
};

const weapons = [
  { name: 'Pistol', damage: 22, fireRate: 0.28, ammo: 12, magSize: 12, reloadTime: 1.0, bulletSpeed: 36, pelletCount: 1, cost: 0, crystalCost: 0, color: 0x7cf0ff, unlocked: true, type: 'hitscan', recoil: 0.08 },
  { name: 'Rifle', damage: 18, fireRate: 0.12, ammo: 30, magSize: 30, reloadTime: 1.2, bulletSpeed: 38, pelletCount: 1, cost: 90, crystalCost: 0, color: 0x7ce19d, unlocked: false, type: 'hitscan', recoil: 0.15 },
  { name: 'Shotgun', damage: 12, fireRate: 0.7, ammo: 8, magSize: 8, reloadTime: 1.45, bulletSpeed: 28, pelletCount: 8, cost: 150, crystalCost: 0, color: 0xfbbf24, unlocked: false, type: 'scatter', recoil: 0.35 },
  { name: 'Sniper', damage: 52, fireRate: 1.1, ammo: 5, magSize: 5, reloadTime: 1.7, bulletSpeed: 48, pelletCount: 1, cost: 220, crystalCost: 0, color: 0xa78bfa, unlocked: false, type: 'hitscan', recoil: 0.02 },
  { name: 'Plasma', damage: 24, fireRate: 0.18, ammo: 20, magSize: 20, reloadTime: 1.1, bulletSpeed: 42, pelletCount: 1, cost: 260, crystalCost: 50, color: 0xf472b6, unlocked: false, type: 'energy', recoil: 0.12 },
  { name: 'Grenade Launcher', damage: 36, fireRate: 1.3, ammo: 4, magSize: 4, reloadTime: 1.8, bulletSpeed: 18, pelletCount: 1, cost: 300, crystalCost: 75, color: 0xfb7185, unlocked: false, type: 'explosive', recoil: 0.4 },
  { name: 'Laser', damage: 28, fireRate: 0.08, ammo: 40, magSize: 40, reloadTime: 0.9, bulletSpeed: 50, pelletCount: 1, cost: 200, crystalCost: 100, color: 0x00ff00, unlocked: false, type: 'beam', recoil: 0.05 },
  { name: 'Minigun', damage: 14, fireRate: 0.05, ammo: 50, magSize: 50, reloadTime: 1.5, bulletSpeed: 35, pelletCount: 1, cost: 280, crystalCost: 120, color: 0xff6b35, unlocked: false, type: 'hitscan', recoil: 0.25 }
];

const enemyTypes = {
  walker: { health: 30, speed: 2.2, damage: 8, size: 0.9, color: 0x8aa1ff, reward: 10, rewardXp: 25 },
  fast: { health: 25, speed: 2.6, damage: 6, size: 0.7, color: 0x42d392, reward: 15, rewardXp: 30 },
  heavy: { health: 60, speed: 1.6, damage: 10, size: 1.15, color: 0xfea800, reward: 18, rewardXp: 40 },
  ranged: { health: 40, speed: 2.0, damage: 7, size: 0.85, color: 0x5aa9ff, reward: 16, rewardXp: 35 },
  boss: { health: 150, speed: 1.4, damage: 18, size: 1.5, color: 0xff4f5d, reward: 55, rewardXp: 85 }
};

const seasons = [
  { name: 'Desert', bgColor: 0x8b7500, fogColor: 0xd4a574, enemies: ['walker', 'fast', 'heavy'] },
  { name: 'Neon City', bgColor: 0x0d1520, fogColor: 0x1a3a52, enemies: ['ranged', 'fast', 'walker'] },
  { name: 'Arctic', bgColor: 0x1a3a52, fogColor: 0xb0e0e6, enemies: ['heavy', 'walker', 'fast'] },
  { name: 'Volcanic', bgColor: 0x3d2817, fogColor: 0xff6b35, enemies: ['heavy', 'ranged', 'fast'] }
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
  dailyStatus: document.getElementById('dailyStatus'),
  monthlyStatus: document.getElementById('monthlyStatus'),
  dailyGiftBtn: document.getElementById('dailyGiftBtn'),
  monthlyGiftBtn: document.getElementById('monthlyGiftBtn'),
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
  healthBar: document.getElementById('healthBar')
};

const STORAGE_KEY = 'growl_sars_save_v2';

const saveState = () => {
  const payload = {
    coins: state.player.coins,
    crystals: state.player.crystals,
    score: state.player.score,
    xp: state.player.xp,
    level: state.player.level,
    weaponIndex: state.player.weaponIndex,
    upgrades: state.upgrades,
    dailyLastClaim: state.dailyLastClaim,
    monthlyLastClaim: state.monthlyLastClaim,
    unlockedWeapons: weapons.map((w) => w.name),
    wave: state.wave,
    season: state.season,
    achievements: state.achievements,
    battlePass: state.battlePass,
    skins: state.skins
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

const loadState = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const saved = JSON.parse(raw);
    state.player.coins = saved.coins || 0;
    state.player.crystals = saved.crystals || 0;
    state.player.score = saved.score || 0;
    state.player.xp = saved.xp || 0;
    state.player.level = saved.level || 1;
    state.player.weaponIndex = saved.weaponIndex || 0;
    state.upgrades = saved.upgrades || { damage: 0, health: 0, fireRate: 0, shield: 0, speed: 0 };
    state.dailyLastClaim = saved.dailyLastClaim || 0;
    state.monthlyLastClaim = saved.monthlyLastClaim || 0;
    state.wave = saved.wave || 1;
    state.season = saved.season || 'Desert';
    state.achievements = saved.achievements || state.achievements;
    state.battlePass = saved.battlePass || state.battlePass;
    state.skins = saved.skins || state.skins;

    weapons.forEach((w, i) => {
      if (saved.unlockedWeapons && saved.unlockedWeapons.includes(w.name)) {
        w.unlocked = true;
      }
    });

    weapons[0].unlocked = true;
  } catch (e) {
    console.warn('Failed to parse save state', e);
  }
};

function showMessage(text, duration = 1.5) {
  ui.message.textContent = text;
  ui.message.classList.add('visible');
  clearTimeout(showMessage.timeoutId);
  showMessage.timeoutId = setTimeout(() => {
    ui.message.classList.remove('visible');
  }, duration * 1000);
}

function updateMenuStats() {
  ui.menuLevel.textContent = String(state.player.level);
  ui.menuCoins.textContent = String(state.player.coins);
  ui.menuScore.textContent = String(state.player.score);
  ui.menuWave.textContent = String(state.wave);
}

function updateHud() {
  const weapon = weapons[state.player.weaponIndex];
  const ammo = typeof weapon.ammo === 'number' ? weapon.ammo : 0;
  ui.hudLevel.textContent = String(state.player.level);
  ui.hudWave.textContent = String(state.wave);
  ui.hudScore.textContent = String(state.player.score);
  ui.hudCoins.textContent = String(state.player.coins);
  ui.weaponName.textContent = `${weapon.name} (${state.player.combo}x Combo)`;
  ui.hudAmmo.textContent = `${ammo} / ${weapon.magSize}`;
  ui.healthBar.style.width = `${Math.max(0, (state.player.health / state.player.maxHealth) * 100)}%`;
}

function createParticle(position, velocity, color, lifetime) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 4, 4),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9 })
  );
  mesh.position.copy(position);
  scene.add(mesh);

  state.particles.push({
    mesh,
    velocity,
    lifetime,
    maxLifetime: lifetime,
    color
  });
}

function claimDailyReward() {
  const now = Date.now();
  const waitMs = 24 * 60 * 60 * 1000;

  if (now - state.dailyLastClaim < waitMs && state.dailyLastClaim !== 0) {
    showMessage('Daily gift is not ready yet');
    return;
  }

  const rewardCoins = 80 + state.player.level * 10;
  const rewardCrystals = 5 + Math.floor(state.player.level / 5);
  state.player.coins += rewardCoins;
  state.player.crystals += rewardCrystals;
  state.dailyLastClaim = now;
  ui.dailyStatus.textContent = `Reward claimed: +${rewardCoins} coins, +${rewardCrystals} crystals`;
  showMessage(`Daily: +${rewardCoins} coins, +${rewardCrystals} crystals`);
  saveState();
  updateMenuStats();
}

function claimMonthlyReward() {
  const now = Date.now();
  const waitMs = 30 * 24 * 60 * 60 * 1000;

  if (now - state.monthlyLastClaim < waitMs && state.monthlyLastClaim !== 0) {
    showMessage('Monthly gift is still cooling down');
    return;
  }

  const rewardCoins = 500 + state.player.level * 60;
  const rewardCrystals = 50 + state.player.level * 5;
  state.player.coins += rewardCoins;
  state.player.crystals += rewardCrystals;
  state.player.health = state.player.maxHealth;
  state.player.shield = state.player.maxShield;
  state.monthlyLastClaim = now;
  ui.monthlyStatus.textContent = `Monthly: +${rewardCoins} coins, +${rewardCrystals} crystals`;
  showMessage(`Monthly rewards: +${rewardCoins} coins, +${rewardCrystals} crystals`);
  saveState();
  updateMenuStats();
}

function refreshGiftStatus() {
  const now = Date.now();
  const dailyReady = state.dailyLastClaim === 0 || now - state.dailyLastClaim >= 24 * 60 * 60 * 1000;
  const monthlyReady = state.monthlyLastClaim === 0 || now - state.monthlyLastClaim >= 30 * 24 * 60 * 60 * 1000;

  ui.dailyStatus.textContent = dailyReady ? 'Ready to claim' : 'Next daily in ' + formatRemaining(state.dailyLastClaim, 24 * 60 * 60 * 1000);
  ui.monthlyStatus.textContent = monthlyReady ? 'Ready for a premium drop' : 'Next monthly in ' + formatRemaining(state.monthlyLastClaim, 30 * 24 * 60 * 60 * 1000);
}

function formatRemaining(last, gap) {
  const remaining = gap - (Date.now() - last);
  const hours = Math.max(0, Math.ceil(remaining / (60 * 60 * 1000)));
  return `${hours}h`;
}

function makeWeaponCard(weapon, index) {
  const card = document.createElement('div');
  card.className = 'shop-item';
  card.innerHTML = `
    <h3>${weapon.name}</h3>
    <p>Damage: ${weapon.damage}</p>
    <p>Rate: ${weapon.fireRate}s</p>
    <p>Ammo: ${weapon.magSize}</p>
    <p style="color: #fbbf24;">Cost: ${weapon.cost ? weapon.cost + ' coins' : 'FREE'} ${weapon.crystalCost ? '+ ' + weapon.crystalCost + ' crystals' : ''}</p>
    <button data-index="${index}">${weapon.unlocked ? 'Equip' : `Buy`}</button>
  `;

  const button = card.querySelector('button');
  button.addEventListener('click', () => {
    if (!weapon.unlocked) {
      const hasCoins = state.player.coins >= weapon.cost;
      const hasCrystals = state.player.crystals >= weapon.crystalCost;

      if (hasCoins && hasCrystals) {
        state.player.coins -= weapon.cost;
        state.player.crystals -= weapon.crystalCost;
        weapon.unlocked = true;
        showMessage(`${weapon.name} unlocked!`);
        saveState();
        renderShop();
        updateMenuStats();
      } else {
        showMessage('Not enough resources');
      }
      return;
    }

    state.player.weaponIndex = index;
    showMessage(`${weapon.name} equipped`);
    renderShop();
    updateHud();
  });

  return card;
}

function renderShop() {
  ui.shopList.innerHTML = '';
  weapons.forEach((weapon, index) => {
    ui.shopList.appendChild(makeWeaponCard(weapon, index));
  });
}

function createPlayer() {
  const base = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.6, 1.6, 12),
    new THREE.MeshStandardMaterial({
      color: state.skins.playerSkin === 'Neon' ? 0xff00ff : state.skins.playerSkin === 'Ghost' ? 0x888888 : state.skins.playerSkin === 'Void' ? 0x0a0a0a : 0x6aa9ff,
      metalness: state.skins.playerSkin === 'Neon' ? 0.8 : 0.3,
      roughness: 0.4
    })
  );
  body.position.y = 0.8;
  body.castShadow = true;
  base.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 16, 16),
    new THREE.MeshStandardMaterial({
      color: state.skins.playerSkin === 'Neon' ? 0x00ffff : state.skins.playerSkin === 'Ghost' ? 0xaaaaaa : state.skins.playerSkin === 'Void' ? 0x1a1a1a : 0x9ed3ff,
      emissive: 0x15273d
    })
  );
  head.position.y = 1.9;
  head.castShadow = true;
  base.add(head);

  base.position.copy(state.player.position);
  scene.add(base);
  state.player.mesh = base;
}

function spawnWave() {
  for (const enemy of state.enemies) {
    scene.remove(enemy.mesh);
  }
  state.enemies = [];

  const count = 4 + state.wave * 2;
  const isBossWave = state.wave % 5 === 0;

  for (let i = 0; i < count; i++) {
    spawnEnemy(isBossWave && i === count - 1);
  }

  state.player.combo = 0;
  showMessage(`Wave ${state.wave} started - ${state.season}`);
}

function pickEnemyType() {
  const season = seasons.find((s) => s.name === state.season);
  const types = season.enemies;
  return types[Math.floor(Math.random() * types.length)];
}

function spawnEnemy(isBoss = false) {
  const type = isBoss ? 'boss' : pickEnemyType();
  const stats = enemyTypes[type];

  const material = new THREE.MeshStandardMaterial({
    color: stats.color,
    emissive: type === 'boss' ? 0x3b0d13 : 0x0d1220,
    metalness: 0.2,
    roughness: 0.5
  });

  const mesh = new THREE.Mesh(new THREE.BoxGeometry(stats.size, stats.size, stats.size), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const angle = Math.random() * Math.PI * 2;
  const dist = 10 + Math.random() * 18;
  mesh.position.set(Math.cos(angle) * dist, 0.8, Math.sin(angle) * dist);
  mesh.scale.y = type === 'boss' ? 2.3 : 1;

  const enemy = {
    id: state.nextEnemyId++,
    type,
    mesh,
    speed: stats.speed,
    health: stats.health + state.wave * (type === 'boss' ? 20 : 3),
    maxHealth: stats.health + state.wave * (type === 'boss' ? 20 : 3),
    damage: stats.damage,
    reward: stats.reward + state.wave * 2,
    rewardXp: stats.rewardXp,
    shootCooldown: 0,
    hitCooldown: 0,
    phase: 1
  };

  scene.add(mesh);
  state.enemies.push(enemy);
}

function fireWeapon() {
  const weapon = weapons[state.player.weaponIndex];
  if (!weapon || weapon.ammo <= 0) {
    showMessage('Reload needed');
    return;
  }

  const now = performance.now();
  if (now - state.lastFire < weapon.fireRate * 1000) return;

  state.lastFire = now;
  weapon.ammo -= 1;
  state.shotFlash = 0.08;

  // Recoil effect
  state.player.pitch -= weapon.recoil * 0.02;
  state.player.yaw += (Math.random() - 0.5) * weapon.recoil;

  for (let pellet = 0; pellet < weapon.pelletCount; pellet++) {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const spread = weapon.pelletCount > 1 ? 0.12 : 0.04;
    direction.x += (Math.random() - 0.5) * spread;
    direction.y += (Math.random() - 0.5) * spread;
    direction.z += (Math.random() - 0.5) * spread;
    direction.normalize();

    const projectileMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({ color: weapon.color, emissive: weapon.color, emissiveIntensity: 0.8 })
    );

    const origin = state.player.position.clone();
    origin.y += 1.4;
    projectileMesh.position.copy(origin);
    projectileMesh.castShadow = true;
    scene.add(projectileMesh);

    state.projectiles.push({
      mesh: projectileMesh,
      velocity: direction.multiplyScalar(weapon.bulletSpeed),
      damage: weapon.damage + state.upgrades.damage * 4,
      life: weapon.name === 'Grenade Launcher' ? 1.5 : 1.2,
      type: weapon.type
    });

    // Muzzle flash
    createParticle(origin.clone(), direction.clone().multiplyScalar(20), weapon.color, 0.1);
  }

  if (weapon.ammo <= 0) {
    reloadWeapon();
  }

  updateHud();
}

function reloadWeapon() {
  const weapon = weapons[state.player.weaponIndex];
  if (weapon.ammo >= weapon.magSize || state.player.reloadTimer > 0) return;

  state.player.reloadTimer = weapon.reloadTime * (1 - state.upgrades.fireRate * 0.05);
  showMessage(`Reloading ${weapon.name}`);
}

function updatePlayer(dt) {
  const moveDir = new THREE.Vector3();
  if (keys.KeyW) moveDir.z -= 1;
  if (keys.KeyS) moveDir.z += 1;
  if (keys.KeyA) moveDir.x -= 1;
  if (keys.KeyD) moveDir.x += 1;

  if (moveDir.lengthSq() > 0) {
    moveDir.normalize();
    const yaw = state.player.yaw;
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const adjusted = new THREE.Vector3();
    adjusted.addScaledVector(forward, moveDir.z);
    adjusted.addScaledVector(right, moveDir.x);
    adjusted.normalize();
    const speed = state.player.speed + state.upgrades.speed * 0.5;
    state.player.position.addScaledVector(adjusted, speed * dt);
  }

  if (state.player.reloadTimer > 0) {
    state.player.reloadTimer -= dt;
    if (state.player.reloadTimer <= 0) {
      const weapon = weapons[state.player.weaponIndex];
      weapon.ammo = weapon.magSize;
      showMessage(`${weapon.name} reloaded`);
      updateHud();
    }
  }

  state.player.comboTimer -= dt;
  if (state.player.comboTimer <= 0) {
    state.player.combo = 0;
  }

  if (state.player.shield > 0) {
    state.player.shield += dt * 3;
    state.player.shield = Math.min(state.player.maxShield, state.player.shield);
  }

  state.player.position.x = THREE.MathUtils.clamp(state.player.position.x, -30, 30);
  state.player.position.z = THREE.MathUtils.clamp(state.player.position.z, -30, 30);

  if (state.player.health <= 0) {
    endRun();
  }
}

function updateCamera() {
  const playerPos = state.player.position.clone();

  if (state.player.lookMode === 'first') {
    camera.position.copy(playerPos).add(new THREE.Vector3(0, 1.5, 0));
    camera.rotation.order = 'YXZ';
    camera.rotation.y = state.player.yaw;
    camera.rotation.x = state.player.pitch;
  } else {
    const targetPos = playerPos.clone().add(new THREE.Vector3(0, 1.2, 0));
    const back = new THREE.Vector3(Math.sin(state.player.yaw), 0, Math.cos(state.player.yaw));
    camera.position.copy(targetPos).add(back.multiplyScalar(-4.5));
    camera.position.y += 2.2;
    camera.lookAt(targetPos);
  }
}

function updateEnemies(dt) {
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    enemy.hitCooldown = Math.max(0, enemy.hitCooldown - dt);
    const dir = state.player.position.clone().sub(enemy.mesh.position);
    const length = dir.length();

    if (length > 0.001) {
      dir.normalize();
      enemy.mesh.position.addScaledVector(dir, enemy.speed * dt);
    }

    if (enemy.type === 'ranged' && length < 15 && enemy.shootCooldown <= 0) {
      enemy.shootCooldown = 1.5;
      const projectile = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xff7e6b, emissive: 0xff7e6b })
      );
      projectile.position.copy(enemy.mesh.position);
      projectile.castShadow = true;
      scene.add(projectile);
      const dirVec = state.player.position.clone().sub(enemy.mesh.position).normalize();
      state.projectiles.push({
        mesh: projectile,
        velocity: dirVec.multiplyScalar(18),
        damage: enemy.damage,
        life: 2,
        enemyShot: true
      });
    } else {
      enemy.shootCooldown = Math.max(0, enemy.shootCooldown - dt);
    }

    if (length < 1.2 && enemy.hitCooldown <= 0) {
      const actualDamage = Math.max(1, enemy.damage - state.player.shield);
      if (state.player.shield > 0) {
        state.player.shield -= enemy.damage;
      } else {
        state.player.health -= actualDamage;
      }
      enemy.hitCooldown = 0.6;
      createParticle(enemy.mesh.position.clone(), new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 5, (Math.random() - 0.5) * 5), 0xff4444, 0.3);

      if (state.player.health <= 0) {
        endRun();
      }
    }
  }
}

function updateProjectiles(dt) {
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const bullet = state.projectiles[i];
    bullet.mesh.position.addScaledVector(bullet.velocity, dt);
    bullet.life -= dt;

    if (bullet.life <= 0) {
      if (bullet.type === 'explosive') {
        // Explosion VFX
        for (let j = 0; j < 8; j++) {
          const dir = new THREE.Vector3(Math.random() - 0.5, Math.random(), Math.random() - 0.5).normalize();
          createParticle(bullet.mesh.position.clone(), dir.multiplyScalar(15), 0xff6b35, 0.4);
        }
      }
      scene.remove(bullet.mesh);
      state.projectiles.splice(i, 1);
      continue;
    }

    for (let j = state.enemies.length - 1; j >= 0; j--) {
      const enemy = state.enemies[j];
      if (bullet.mesh.position.distanceTo(enemy.mesh.position) < (enemy.type === 'boss' ? 1.5 : 0.9)) {
        enemy.health -= bullet.damage;

        // Hit particles
        const hitDir = bullet.mesh.position.clone().sub(enemy.mesh.position).normalize();
        for (let k = 0; k < 3; k++) {
          createParticle(enemy.mesh.position.clone(), hitDir.clone().multiplyScalar(Math.random() * 10 + 5), 0xff9900, 0.2);
        }

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
      state.player.health = Math.max(0, state.player.health - 8);
      updateHud();
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
  state.battlePass.progress += 5;

  scene.remove(enemy.mesh);
  state.enemies.splice(index, 1);

  if (state.player.xp >= state.player.level * 100) {
    state.player.xp -= state.player.level * 100;
    state.player.level += 1;
    state.player.maxHealth += 15;
    state.player.health = state.player.maxHealth;
    state.player.maxShield += 10;
    showMessage(`Level up! Level ${state.player.level}`);
  }

  checkAchievements();

  if (Math.random() < 0.40) {
    spawnPickup(enemy.mesh.position.clone());
  }

  if (state.enemies.length === 0) {
    state.wave += 1;
    if (state.wave % 4 === 0) {
      state.season = seasons[Math.floor(Math.random() * seasons.length)].name;
      updateSeason();
    }
    setTimeout(() => spawnWave(), 600);
  }

  updateMenuStats();
  updateHud();
}

function checkAchievements() {
  state.achievements.forEach((ach) => {
    if (ach.unlocked) return;

    if (ach.id === 'first_kill' && state.player.kills >= 1) {
      unlockAchievement(ach);
    } else if (ach.id === 'wave_10' && state.wave >= 10) {
      unlockAchievement(ach);
    } else if (ach.id === 'boss_slayer' && state.totalKills >= 5) {
      unlockAchievement(ach);
    } else if (ach.id === 'combo_10' && state.player.combo >= 10) {
      unlockAchievement(ach);
    }
  });
}

function unlockAchievement(ach) {
  ach.unlocked = true;
  state.player.crystals += ach.reward;
  state.achievementUnlocks += 1;
  showMessage(`Achievement: ${ach.name} +${ach.reward} crystals`);
}

function spawnPickup(position) {
  const types = ['coin', 'health', 'ammo', 'crystal', 'shield'];
  const weights = [0.35, 0.25, 0.25, 0.1, 0.05];
  let rand = Math.random();
  let type = 'coin';
  let cumWeight = 0;

  for (let i = 0; i < types.length; i++) {
    cumWeight += weights[i];
    if (rand < cumWeight) {
      type = types[i];
      break;
    }
  }

  const colors = { coin: 0xfacc15, health: 0x34d399, ammo: 0xa78bfa, crystal: 0xff00ff, shield: 0x00ddff };

  const mesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(type === 'health' ? 0.32 : 0.26, 0),
    new THREE.MeshStandardMaterial({
      color: colors[type],
      emissive: colors[type],
      emissiveIntensity: 0.6,
      metalness: 0.3
    })
  );
  mesh.position.copy(position);
  mesh.position.y = 0.7;
  mesh.castShadow = true;
  scene.add(mesh);
  state.pickups.push({ id: state.nextPickupId++, mesh, type, bob: Math.random() * Math.PI * 2 });
}

function updatePickups(dt) {
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const item = state.pickups[i];
    item.mesh.position.y = 0.7 + Math.sin((performance.now() * 0.004) + item.bob) * 0.25;

    if (item.mesh.position.distanceTo(state.player.position) < 1.5) {
      if (item.type === 'coin') state.player.coins += 20;
      if (item.type === 'health') state.player.health = Math.min(state.player.maxHealth, state.player.health + 25);
      if (item.type === 'ammo') {
        weapons.forEach((weapon) => {
          weapon.ammo = Math.min(weapon.magSize, weapon.ammo + 5);
        });
      }
      if (item.type === 'crystal') state.player.crystals += 3;
      if (item.type === 'shield') state.player.shield = state.player.maxShield;

      scene.remove(item.mesh);
      state.pickups.splice(i, 1);
      updateHud();
      updateMenuStats();
      showMessage(`Pickup: ${item.type}`);
    }
  }
}

function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.mesh.position.addScaledVector(p.velocity, dt);
    p.velocity.multiplyScalar(0.95);
    p.lifetime -= dt;

    const alpha = p.lifetime / p.maxLifetime;
    p.mesh.material.opacity = alpha;

    if (p.lifetime <= 0) {
      scene.remove(p.mesh);
      state.particles.splice(i, 1);
    }
  }
}

function updateSeason() {
  const season = seasons.find((s) => s.name === state.season);
  scene.background = new THREE.Color(season.bgColor);
  scene.fog.color = new THREE.Color(season.fogColor);
  showMessage(`Season: ${state.season}`);
}

function endRun() {
  state.running = false;
  ui.menu.classList.remove('hidden');
  ui.hud.classList.add('hidden');
  showMessage('Run ended. Press start to continue');
  saveState();
}

function startRun() {
  state.running = true;
  ui.menu.classList.add('hidden');
  ui.hud.classList.remove('hidden');

  if (!state.player.mesh) createPlayer();

  state.player.position.set(0, 1.2, 0);
  state.player.yaw = 0;
  state.player.pitch = 0;
  state.player.health = state.player.maxHealth;
  state.player.shield = state.player.maxShield;
  state.wave = Math.max(1, state.wave);

  updateSeason();
  spawnWave();
  updateHud();
  updateMenuStats();
}

function toggleCameraMode() {
  state.player.lookMode = state.player.lookMode === 'first' ? 'third' : 'first';
  showMessage(`${state.player.lookMode === 'first' ? 'First Person' : 'Third Person'} camera`);
}

function bindEvents() {
  document.addEventListener('keydown', (event) => {
    keys[event.code] = true;
    if (event.code === 'KeyR') reloadWeapon();
    if (event.code === 'KeyV') toggleCameraMode();
    if (event.code === 'Space') fireWeapon();
    if (event.code === 'KeyE') {
      if (state.player.combo >= 5) {
        state.player.health = Math.min(state.player.maxHealth, state.player.health + 30);
        showMessage('Combo heal used');
      }
    }
  });

  document.addEventListener('keyup', (event) => {
    keys[event.code] = false;
  });

  window.addEventListener('pointerdown', () => {
    if (state.running) {
      renderer.domElement.requestPointerLock();
    }
  });

  document.addEventListener('mousemove', (event) => {
    if (!state.running || !state.pointerLocked) return;
    state.player.yaw -= event.movementX * 0.0022;
    state.player.pitch -= event.movementY * 0.0018;
    state.player.pitch = THREE.MathUtils.clamp(state.player.pitch, -1.2, 1.2);
  });

  document.addEventListener('pointerlockchange', () => {
    state.pointerLocked = document.pointerLockElement === renderer.domElement;
  });

  ui.startBtn.addEventListener('click', startRun);
  ui.shopBtn.addEventListener('click', () => {
    ui.shopPanel.classList.toggle('hidden');
  });
  ui.giftBtn.addEventListener('click', () => {
    refreshGiftStatus();
    ui.giftPanel.classList.toggle('hidden');
  });

  document.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', () => {
      document.getElementById(button.dataset.close).classList.add('hidden');
    });
  });

  ui.dailyGiftBtn.addEventListener('click', claimDailyReward);
  ui.monthlyGiftBtn.addEventListener('click', claimMonthlyReward);

  document.getElementById('upgradeDamage').addEventListener('click', () => {
    if (state.player.coins >= 60) {
      state.player.coins -= 60;
      state.upgrades.damage += 1;
      showMessage('Damage +1');
      updateMenuStats();
      saveState();
    } else {
      showMessage('Need 60 coins');
    }
  });

  document.getElementById('upgradeHealth').addEventListener('click', () => {
    if (state.player.coins >= 70) {
      state.player.coins -= 70;
      state.player.maxHealth += 20;
      state.player.health = state.player.maxHealth;
      state.upgrades.health += 1;
      showMessage('Health +20');
      updateMenuStats();
      saveState();
    } else {
      showMessage('Need 70 coins');
    }
  });

  document.getElementById('upgradeFireRate').addEventListener('click', () => {
    if (state.player.coins >= 80) {
      state.player.coins -= 80;
      state.upgrades.fireRate += 1;
      weapons.forEach((weapon) => {
        weapon.fireRate = Math.max(0.05, weapon.fireRate * 0.95);
      });
      showMessage('Fire rate increased');
      updateMenuStats();
      saveState();
    } else {
      showMessage('Need 80 coins');
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  window.addEventListener('click', () => {
    if (state.running && !state.pointerLocked) {
      fireWeapon();
    }
  });
}

function buildArena() {
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(30, 30, 1, 40),
    new THREE.MeshStandardMaterial({ color: 0x0f2740, roughness: 0.7, metalness: 0.2 })
  );
  floor.position.y = -0.5;
  floor.receiveShadow = true;
  scene.add(floor);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(20, 0.4, 16, 80),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0b2a41, emissiveIntensity: 0.6 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.15;
  scene.add(ring);

  const hemi = new THREE.HemisphereLight(0x8ec5ff, 0x0b1020, 1.3);
  scene.add(hemi);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(5, 14, 8);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.far = 50;
  dirLight.shadow.camera.left = -30;
  dirLight.shadow.camera.right = 30;
  dirLight.shadow.camera.top = 30;
  dirLight.shadow.camera.bottom = -30;
  scene.add(dirLight);

  const glow = new THREE.PointLight(0x2dd4bf, 25, 80, 2.0);
  glow.position.set(0, 5, 0);
  scene.add(glow);
}

function init() {
  loadState();
  buildArena();
  renderShop();
  refreshGiftStatus();
  updateMenuStats();
  updateHud();
  bindEvents();
  state.player.lookMode = 'first';
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);

  if (state.running) {
    updatePlayer(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updatePickups(dt);
    updateParticles(dt);

    if (state.shotFlash > 0) {
      state.shotFlash = Math.max(0, state.shotFlash - dt);
    }
  }

  updateCamera();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

init();
animate();
