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
    score: 0,
    kills: 0,
    weaponIndex: 0,
    reloadTimer: 0,
    pickupCooldown: 0,
    lookMode: 'first' // first | third
  },
  wave: 1,
  enemies: [],
  projectiles: [],
  pickups: [],
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
  upgrades: {
    damage: 0,
    health: 0,
    fireRate: 0
  }
};

const weapons = [
  { name: 'Pistol', damage: 22, fireRate: 0.28, ammo: 12, magSize: 12, reloadTime: 1.0, bulletSpeed: 36, pelletCount: 1, cost: 0, color: 0x7cf0ff },
  { name: 'Rifle', damage: 18, fireRate: 0.12, ammo: 30, magSize: 30, reloadTime: 1.2, bulletSpeed: 38, pelletCount: 1, cost: 90, color: 0x7ce19d },
  { name: 'Shotgun', damage: 12, fireRate: 0.7, ammo: 8, magSize: 8, reloadTime: 1.45, bulletSpeed: 28, pelletCount: 6, cost: 150, color: 0xfbbf24 },
  { name: 'Sniper', damage: 52, fireRate: 1.1, ammo: 5, magSize: 5, reloadTime: 1.7, bulletSpeed: 48, pelletCount: 1, cost: 220, color: 0xa78bfa },
  { name: 'Plasma', damage: 24, fireRate: 0.18, ammo: 20, magSize: 20, reloadTime: 1.1, bulletSpeed: 42, pelletCount: 1, cost: 260, color: 0xf472b6 },
  { name: 'Grenade', damage: 36, fireRate: 1.3, ammo: 4, magSize: 4, reloadTime: 1.8, bulletSpeed: 18, pelletCount: 1, cost: 300, color: 0xfb7185 }
];

const shopItems = [...weapons.map((w) => ({ ...w }))];

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

const STORAGE_KEY = 'growl_sars_save_v1';

const saveState = () => {
  const payload = {
    coins: state.player.coins,
    score: state.player.score,
    xp: state.player.xp,
    level: state.player.level,
    weaponIndex: state.player.weaponIndex,
    upgrades: state.upgrades,
    dailyLastClaim: state.dailyLastClaim,
    monthlyLastClaim: state.monthlyLastClaim,
    unlockedWeapons: weapons.map((weapon) => weapon.name),
    wave: state.wave
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

const loadState = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const saved = JSON.parse(raw);
    state.player.coins = saved.coins || 0;
    state.player.score = saved.score || 0;
    state.player.xp = saved.xp || 0;
    state.player.level = saved.level || 1;
    state.player.weaponIndex = saved.weaponIndex || 0;
    state.upgrades = saved.upgrades || { damage: 0, health: 0, fireRate: 0 };
    state.dailyLastClaim = saved.dailyLastClaim || 0;
    state.monthlyLastClaim = saved.monthlyLastClaim || 0;
    state.wave = saved.wave || 1;

    for (let i = 0; i < weapons.length; i++) {
      if (saved.unlockedWeapons && saved.unlockedWeapons.includes(weapons[i].name)) {
        weapons[i].unlocked = true;
      }
    }

    weapons[0].unlocked = true;
  } catch {
    console.warn('Failed to parse save state');
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
  ui.weaponName.textContent = weapon.name;
  ui.hudAmmo.textContent = `${ammo} / ${weapon.magSize}`;
  ui.healthBar.style.width = `${Math.max(0, (state.player.health / state.player.maxHealth) * 100)}%`;
}

function claimDailyReward() {
  const now = Date.now();
  const waitMs = 24 * 60 * 60 * 1000;

  if (now - state.dailyLastClaim < waitMs && state.dailyLastClaim !== 0) {
    showMessage('Daily gift is not ready yet');
    return;
  }

  const rewardCoins = 80 + state.player.level * 10;
  state.player.coins += rewardCoins;
  state.dailyLastClaim = now;
  ui.dailyStatus.textContent = `Reward claimed: +${rewardCoins} coins`;
  showMessage(`Daily gift: +${rewardCoins} coins`);
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
  state.player.coins += rewardCoins;
  state.player.health = state.player.maxHealth;
  state.monthlyLastClaim = now;
  ui.monthlyStatus.textContent = `Monthly drop received: +${rewardCoins} coins and health refill`;
  showMessage(`Monthly rewards: +${rewardCoins} coins`);
  saveState();
  updateMenuStats();
}

function refreshGiftStatus() {
  const now = Date.now();
  const dailyReady = state.dailyLastClaim === 0 || now - state.dailyLastClaim >= 24 * 60 * 60 * 1000;
  const monthlyReady = state.monthlyLastClaim === 0 || now - state.monthlyLastClaim >= 30 * 24 * 60 * 60 * 1000;

  ui.dailyStatus.textContent = dailyReady ? 'Ready to claim' : 'Next daily in ' + formatRemaining(state.dailyLastClaim, 24*60*60*1000);
  ui.monthlyStatus.textContent = monthlyReady ? 'Ready for a premium drop' : 'Next monthly in ' + formatRemaining(state.monthlyLastClaim, 30*24*60*60*1000);
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
    <button data-index="${index}">${weapon.unlocked ? 'Equip' : `Buy ${weapon.cost}`}</button>
  `;

  const button = card.querySelector('button');
  button.addEventListener('click', () => {
    if (!weapon.unlocked) {
      if (state.player.coins >= weapon.cost) {
        state.player.coins -= weapon.cost;
        weapon.unlocked = true;
        showMessage(`${weapon.name} unlocked!`);
        saveState();
        renderShop();
        updateMenuStats();
      } else {
        showMessage('Not enough coins');
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
    new THREE.MeshStandardMaterial({ color: 0x6aa9ff, metalness: 0.3, roughness: 0.4 })
  );
  body.position.y = 0.8;
  base.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x9ed3ff, emissive: 0x15273d })
  );
  head.position.y = 1.9;
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

  showMessage(`Wave ${state.wave} started`);
}

function spawnEnemy(isBoss = false) {
  const type = isBoss ? 'boss' : pickEnemyType();
  const size = type === 'boss' ? 1.5 : type === 'heavy' ? 1.15 : type === 'fast' ? 0.7 : 0.9;

  const material = new THREE.MeshStandardMaterial({
    color: type === 'boss' ? 0xff4f5d : type === 'heavy' ? 0xfea800 : type === 'fast' ? 0x42d392 : type === 'ranged' ? 0x5aa9ff : 0x8aa1ff,
    emissive: type === 'boss' ? 0x3b0d13 : 0x0d1220,
    metalness: 0.2,
    roughness: 0.5
  });

  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), material);
  const angle = Math.random() * Math.PI * 2;
  const dist = 10 + Math.random() * 18;
  mesh.position.set(Math.cos(angle) * dist, 0.8, Math.sin(angle) * dist);
  mesh.scale.y = type === 'boss' ? 2.3 : 1;

  const enemy = {
    id: state.nextEnemyId++,
    type,
    mesh,
    speed: type === 'fast' ? 2.6 : type === 'heavy' ? 1.6 : type === 'boss' ? 1.4 : 2.2,
    health: type === 'boss' ? 150 + state.wave * 20 : type === 'heavy' ? 60 + state.wave * 6 : type === 'ranged' ? 40 + state.wave * 4 : 30 + state.wave * 3,
    maxHealth: type === 'boss' ? 150 + state.wave * 20 : type === 'heavy' ? 60 + state.wave * 6 : type === 'ranged' ? 40 + state.wave * 4 : 30 + state.wave * 3,
    damage: type === 'boss' ? 18 : type === 'heavy' ? 10 : 8,
    reward: type === 'boss' ? 55 : type === 'heavy' ? 18 : 10,
    rewardXp: type === 'boss' ? 85 : 25,
    shootCooldown: 0,
    hitCooldown: 0
  };

  scene.add(mesh);
  state.enemies.push(enemy);
}

function pickEnemyType() {
  const roll = Math.random();
  if (roll < 0.22) return 'fast';
  if (roll < 0.42) return 'heavy';
  if (roll < 0.62) return 'ranged';
  return 'walker';
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
    scene.add(projectileMesh);

    state.projectiles.push({
      mesh: projectileMesh,
      velocity: direction.multiplyScalar(weapon.bulletSpeed),
      damage: weapon.damage + state.upgrades.damage * 4,
      life: weapon.name === 'Grenade' ? 1.5 : 1.2
    });
  }

  if (weapon.ammo <= 0) {
    reloadWeapon();
  }

  updateHud();
}

function reloadWeapon() {
  const weapon = weapons[state.player.weaponIndex];
  if (weapon.ammo >= weapon.magSize || state.player.reloadTimer > 0) return;

  state.player.reloadTimer = weapon.reloadTime;
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
    state.player.position.addScaledVector(adjusted, state.player.speed * dt);
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

  state.player.position.x = THREE.MathUtils.clamp(state.player.position.x, -30, 30);
  state.player.position.z = THREE.MathUtils.clamp(state.player.position.z, -30, 30);

  state.player.energy = 0;
  if (state.player.health <= 0) {
    endRun();
  }
}

function updateCamera() {
  const playerPos = state.player.position.clone();
  const desiredPos = new THREE.Vector3(Math.sin(state.player.yaw) * 1.8, 1.7, Math.cos(state.player.yaw) * 1.8);

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
      state.player.health -= enemy.damage;
      enemy.hitCooldown = 0.6;
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
      scene.remove(bullet.mesh);
      state.projectiles.splice(i, 1);
      continue;
    }

    for (let j = state.enemies.length - 1; j >= 0; j--) {
      const enemy = state.enemies[j];
      if (bullet.mesh.position.distanceTo(enemy.mesh.position) < (enemy.type === 'boss' ? 1.5 : 0.9)) {
        enemy.health -= bullet.damage;
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
      state.player.health -= 8;
      updateHud();
    }
  }
}

function enemyDefeated(enemy, index) {
  const rewardCoins = enemy.reward;
  state.player.coins += rewardCoins;
  state.player.score += rewardCoins * 10;
  state.player.xp += enemy.rewardXp;
  state.player.kills += 1;
  state.totalKills += 1;

  scene.remove(enemy.mesh);
  state.enemies.splice(index, 1);

  if (state.player.xp >= state.player.level * 100) {
    state.player.xp -= state.player.level * 100;
    state.player.level += 1;
    state.player.maxHealth += 15;
    state.player.health = state.player.maxHealth;
    showMessage(`Level up! Level ${state.player.level}`);
  }

  if (Math.random() < 0.35) {
    spawnPickup(enemy.mesh.position.clone());
  }

  if (state.enemies.length === 0) {
    state.wave += 1;
    setTimeout(() => spawnWave(), 600);
  }

  updateMenuStats();
  updateHud();
}

function spawnPickup(position) {
  const types = ['coin', 'health', 'ammo'];
  const type = types[Math.floor(Math.random() * types.length)];
  const mesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(type === 'health' ? 0.32 : 0.26, 0),
    new THREE.MeshStandardMaterial({
      color: type === 'coin' ? 0xfacc15 : type === 'health' ? 0x34d399 : 0xa78bfa,
      emissive: type === 'coin' ? 0x4a3a00 : type === 'health' ? 0x0e3b2c : 0x1f1538,
      metalness: 0.2
    })
  );
  mesh.position.copy(position);
  mesh.position.y = 0.7;
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
      scene.remove(item.mesh);
      state.pickups.splice(i, 1);
      updateHud();
      updateMenuStats();
      showMessage(`Pickup collected: ${item.type}`);
    }
  }
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
  state.wave = Math.max(1, state.wave);
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
      showMessage('Damage upgraded');
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
      showMessage('Health upgraded');
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
        weapon.fireRate = Math.max(0.07, weapon.fireRate * 0.96);
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
  scene.add(dirLight);

  const glow = new THREE.PointLight(0x2dd4bf, 25, 80, 2.0);
  glow.position.set(0, 5, 0);
  scene.add(glow);
}

function resetWeapons() {
  weapons.forEach((weapon, index) => {
    weapon.ammo = weapon.magSize;
    if (index === 0) weapon.unlocked = true;
    else weapon.unlocked = !!weapon.unlocked;
  });
}

function init() {
  loadState();
  resetWeapons();
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
