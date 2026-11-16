// Staged frames for the screenshot script. Nothing here decides a game rule: it poses
// the existing state, draws one frame and lets main.js set window.__shotReady.

function pose(a, x, z, yaw, extra) {
  a.position.set(x, 0, z);
  a.velocity.set(0, 0, 0);
  a.yaw = yaw;
  a.pitch = 0;
  a.alive = true;
  a.crouching = false;
  a.health = 100;
  if (extra) Object.assign(a, extra);
}

function arm(a, key, mag, reserve) {
  a.weapon = key;
  a.primary = key === 'patern' ? a.primary : key;
  a.mag = mag;
  a.reserve = reserve;
  a.reloadLeft = 0;
  a.cooldown = 0;
  a.recoil = 0;
}

// Attackers push the mid catwalk, defenders hold the gallery behind it.
function firefight(s) {
  const p = s.player;
  pose(p, 0, 5.5, 0, { pitch: -0.04 });
  arm(p, 'kestrel', 21, 90);
  pose(s.actors[1], -2.4, 2.2, 0.18, { pitch: -0.05 });
  arm(s.actors[1], 'kestrel', 12, 90);
  pose(s.actors[2], 2.6, 1.4, -0.22, { pitch: -0.03 });
  arm(s.actors[2], 'patern', 11, 60);
  pose(s.actors[3], -4.6, -0.6, 0.3, { pitch: -0.08 });
  pose(s.actors[4], -6.2, 7.4, 0.1);
  pose(s.actors[5], -2.6, -6.4, 0.02, { pitch: -0.02 });
  arm(s.actors[5], 'kestrel', 30, 90);
  pose(s.actors[6], 3.4, -5.2, -0.05);
  arm(s.actors[6], 'harrow', 7, 28);
  pose(s.actors[7], 0.6, -11.5, 0);
  pose(s.actors[8], -9.4, -7.8, 0.5, { pitch: -0.1 });
  pose(s.actors[9], 9.6, -6.6, -0.5);
  s.actors[4].alive = false;
  s.actors[4].health = 0;
  s.mode = 'AUTO';
  s.spread = 0.0031;
  s.feed = [
    { killer: 'ROOK', victim: 'BRINE', weapon: 'kestrel', head: false, time: 0 },
    { killer: 'MICA', victim: 'CINDER', weapon: 'patern', head: true, time: 0 },
  ];
}

export function stageShot(s, map, combat, rounds) {
  const kind = s.shot;
  s.paused = false;
  s.buyOpen = false;
  s.scoreboard = false;
  s.cameraOverride = null;
  s.view.flash = 0;
  s.view.shake = 0;
  s.time = 12.4;
  s.hit = 0;
  if (kind === 'title') {
    s.phase = 'title';
    return;
  }

  s.phase = 'playing';
  s.buyLeft = 0;
  s.bomb.planted = false;
  s.bomb.dropped = false;
  s.bomb.carrier = -1;
  s.bomb.progress = 0;
  s.bomb.defuse = 0;

  if (kind === 'plant') {
    // The Relay is down at A and the fuse is running.
    s.round = 7;
    s.timer = 38;
    s.score = [4, 2];
    s.history = [
      { winner: 0, reason: 'RELAY DETONATED' },
      { winner: 1, reason: 'RELAY DEFUSED' },
      { winner: 0, reason: 'DEFENDERS ELIMINATED' },
      { winner: 1, reason: 'TIME EXPIRED' },
      { winner: 0, reason: 'RELAY DETONATED' },
      { winner: 0, reason: 'DEFENDERS ELIMINATED' },
    ];
    firefight(s);
    const p = s.player;
    pose(p, -16.4, -7.6, 2.35, { pitch: -0.22 });
    arm(p, 'kestrel', 18, 90);
    pose(s.actors[1], -19.6, -8.4, 1.9, { pitch: -0.15 });
    pose(s.actors[2], -14.2, -10.8, 2.8, { pitch: -0.05 });
    pose(s.actors[5], -18.2, -12.6, 0.4, { pitch: -0.1, alive: false, health: 0 });
    s.bomb.planted = true;
    s.bomb.site = 'A';
    s.bomb.x = -18.6;
    s.bomb.z = -10.4;
    s.bomb.fuse = 18.7;
    s.bomb.progress = 1;
    s.bomb.planter = 0;
    s.feed = [{ killer: 'CINDER', victim: 'FEN', weapon: 'kestrel', head: false, time: 0 }];
    return;
  }

  if (kind === 'end') {
    s.phase = 'end';
    s.winner = 0;
    s.reason = 'RELAY DETONATED';
    s.score = [5, 3];
    s.history = [
      { winner: 0, reason: 'RELAY DETONATED' },
      { winner: 1, reason: 'RELAY DEFUSED' },
      { winner: 0, reason: 'DEFENDERS ELIMINATED' },
      { winner: 1, reason: 'TIME EXPIRED' },
      { winner: 0, reason: 'RELAY DETONATED' },
      { winner: 0, reason: 'DEFENDERS ELIMINATED' },
      { winner: 1, reason: 'ATTACKERS ELIMINATED' },
      { winner: 0, reason: 'RELAY DETONATED' },
    ];
    firefight(s);
    s.actors[0].kills = 19;
    s.actors[0].deaths = 6;
    s.actors[1].kills = 14;
    s.actors[1].deaths = 9;
    s.actors[5].kills = 12;
    s.actors[5].deaths = 11;
    return;
  }

  // 'play' and anything else: a live mid-round exchange.
  s.round = 3;
  s.timer = 61;
  s.score = [2, 1];
  s.history = [
    { winner: 0, reason: 'RELAY DETONATED' },
    { winner: 1, reason: 'TIME EXPIRED' },
    { winner: 0, reason: 'DEFENDERS ELIMINATED' },
  ];
  firefight(s);
}
