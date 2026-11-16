import { moveActor } from './player.js';
import { WEAPONS } from './config.js';

const ROUTES = ['siteA-long', 'siteA-short', 'siteB-mid', 'siteB-tunnel', 'rotate'];
const graphs = new WeakMap();
const angle = n => Math.atan2(Math.sin(n), Math.cos(n));

// Capsule-width segment checks keep graph entry and short final approaches clear.
function clear(map, x, z, tx, tz, y = 0) {
  const dx = tx - x, dz = tz - z;
  for (let i = 0; i < map.colliders.length; i++) {
    const b = map.colliders[i];
    if (b.gateOpen || b.max.y <= y + .36 || b.min.y >= y + 1.75) continue;
    let lo = 0, hi = 1;
    if (Math.abs(dx) < .00001) {
      if (x < b.min.x - .36 || x > b.max.x + .36) continue;
    } else {
      const p = (b.min.x - .36 - x) / dx, q = (b.max.x + .36 - x) / dx;
      lo = Math.max(lo, Math.min(p, q)); hi = Math.min(hi, Math.max(p, q));
    }
    if (Math.abs(dz) < .00001) {
      if (z < b.min.z - .36 || z > b.max.z + .36) continue;
    } else {
      const p = (b.min.z - .36 - z) / dz, q = (b.max.z + .36 - z) / dz;
      lo = Math.max(lo, Math.min(p, q)); hi = Math.min(hi, Math.max(p, q));
    }
    if (lo <= hi) return false;
  }
  return true;
}

function graph(map) {
  let g = graphs.get(map);
  if (g) return g;
  const points = [], edges = [];
  for (let r = 0; r < ROUTES.length; r++) {
    const route = map.routes[ROUTES[r]];
    if (!route) continue;
    let previous = -1;
    for (let j = 0; j < route.length; j++) {
      const p = route[j];
      let index = -1;
      for (let k = 0; k < points.length; k++) {
        if (points[k][0] === p[0] && points[k][1] === p[1]) { index = k; break; }
      }
      if (index < 0) { index = points.length; points.push(p); }
      if (previous >= 0) edges.push([previous, index]);
      previous = index;
    }
  }
  const n = points.length, weights = new Float64Array(n * n);
  weights.fill(Infinity);
  for (let i = 0; i < edges.length; i++) {
    const u = edges[i][0], v = edges[i][1];
    const d = Math.hypot(points[u][0] - points[v][0], points[u][1] - points[v][1]);
    weights[u * n + v] = weights[v * n + u] = d;
  }
  g = { points, weights, n };
  graphs.set(map, g);
  return g;
}

function nearest(g, map, x, z, y) {
  let best = -1, distance = Infinity;
  for (let i = 0; i < g.n; i++) {
    const p = g.points[i], d = Math.hypot(p[0] - x, p[1] - z);
    if (d < distance && clear(map, x, z, p[0], p[1], y)) { best = i; distance = d; }
  }
  return best;
}

function plan(a, g, map, x, z) {
  const start = nearest(g, map, a.position.x, a.position.z, a.position.y);
  const end = nearest(g, map, x, z, 0);
  a.navX = x; a.navZ = z; a.navCount = 0; a.navIndex = 0;
  if (start < 0 || end < 0) return;
  a.dist.fill(Infinity); a.visited.fill(0); a.prev.fill(-1); a.dist[start] = 0;
  for (let step = 0; step < g.n; step++) {
    let u = -1, best = Infinity;
    for (let j = 0; j < g.n; j++) {
      if (!a.visited[j] && a.dist[j] < best) { u = j; best = a.dist[j]; }
    }
    if (u < 0 || u === end) break;
    a.visited[u] = 1;
    for (let v = 0; v < g.n; v++) {
      const d = best + g.weights[u * g.n + v];
      if (d < a.dist[v]) { a.dist[v] = d; a.prev[v] = u; }
    }
  }
  if (!Number.isFinite(a.dist[end])) return;
  for (let v = end; v >= 0; v = a.prev[v]) a.path[a.navCount++] = v;
  for (let l = 0, r = a.navCount - 1; l < r; l++, r--) {
    const v = a.path[l]; a.path[l] = a.path[r]; a.path[r] = v;
  }
}

function initialize(a, s, g, mates) {
  if (!a.path || a.path.length !== g.n) {
    a.path = new Int16Array(g.n); a.prev = new Int16Array(g.n);
    a.dist = new Float64Array(g.n); a.visited = new Uint8Array(g.n);
  }
  if (!a.route) a.route = ROUTES[(a.id - 1 + 4) % 4];
  a.waypoint = a.team === 1 ? -1 : 0;
  a.think = (a.id % 6) * .02; a.target = -1; a.seen = false;
  a.reaction = 0; a.memory = 0; a.hold = 0; a.retreat = 0;
  a.navX = Infinity; a.navZ = Infinity; a.navCount = 0; a.navIndex = 0;
  a.stuck = 0; a.mates = mates; a.serial = s.deathSerial;
  a.rotation = false; a.readyBots = true;
}

export function stepBots(s, map, dt, combat) {
  if (s.phase !== 'playing') {
    for (let i = 1; i < s.actors.length; i++) { s.actors[i].readyBots = false; s.actors[i].trigger = false; }
    return;
  }
  const g = graph(map), actors = s.actors, bomb = s.bomb;
  let alive = 0;
  for (let i = 0; i < actors.length; i++) if (actors[i].alive) alive |= 1 << i;
  for (let i = 1; i < actors.length; i++) {
    const a = actors[i];
    if (!a.alive) { a.readyBots = false; a.trigger = false; continue; }
    const mates = alive & (a.team === 0 ? 31 : 992);
    if (!a.readyBots || !a.route) initialize(a, s, g, mates);
    const skill = Math.min(1, ((s.score[0] + s.score[1]) * .065) + (i % 5) * .035);
    a.memory = Math.max(0, a.memory - dt);
    a.heard = Math.max(0, a.heard - dt);
    a.reaction = Math.max(0, a.reaction - dt);
    a.hold = Math.max(0, a.hold - dt);
    a.retreat = Math.max(0, a.retreat - dt);
    a.trigger = false;
    a.think -= dt;
    if (a.think <= 0) {
      a.think += .12;
      let target = -1, distance = 34;
      const fx = -Math.sin(a.yaw), fz = -Math.cos(a.yaw);
      for (let j = 0; j < actors.length; j++) {
        const enemy = actors[j];
        if (!enemy.alive || enemy.team === a.team) continue;
        const dx = enemy.position.x - a.position.x, dz = enemy.position.z - a.position.z;
        const d = Math.hypot(dx, dz);
        if (d > distance || (d > .01 && (dx * fx + dz * fz) / d < .5)) continue;
        if (combat.visible(a, enemy)) { target = j; distance = d; }
      }
      if (target >= 0) {
        const enemy = actors[target];
        if (a.target !== target || !a.seen) a.reaction = .28 + (1 - skill) * .16 + s.rng() * .06;
        a.lastX = a.aimX = enemy.position.x; a.lastZ = a.aimZ = enemy.position.z;
        a.aimY = enemy.position.y + enemy.eye * .82;
        a.memory = 3 + s.rng() * 1.5;
        a.errorYaw = (s.rng() - .5) * .07 * (1 - skill * .75);
        a.errorPitch = (s.rng() - .5) * .045 * (1 - skill * .75);
        if (a.hold <= 0) { a.hold = .6 + s.rng(); a.peek = s.rng() < .4 ? 0 : (s.rng() < .5 ? -1 : 1); }
        if (a.health < 30 || a.reloadLeft > 0) a.retreat = 1.1;
      }
      a.seen = target >= 0; a.target = target;
      if (a.serial !== s.deathSerial) {
        if ((a.mates & ~mates) && !bomb.planted && s.rng() < .65) {
          a.route = a.route.startsWith('siteA') ? 'siteB-mid' : 'siteA-short';
          a.rotation = true; a.navX = Infinity;
        }
        a.serial = s.deathSerial;
      }
      a.mates = mates;
    }
    if (a.seen && !actors[a.target]?.alive) { a.seen = false; a.target = -1; }
    let weapon = WEAPONS[a.weapon];
    if (a.mag === 0 && a.reserve === 0 && a.weapon !== 'patern') {
      combat.switchWeapon(a, 'patern'); weapon = WEAPONS[a.weapon];
    }
    if (a.reserve > 0 && !a.reloadLeft && (a.mag === 0 || (!a.seen && a.memory <= 0 && a.mag < weapon.mag * .35))) combat.reload(a);

    const route = map.routes[a.route];
    if (!route?.length) continue;
    let x, z, navigating = false, stop = false;
    const site = map.sites[a.route.startsWith('siteA') ? 0 : 1];
    if (bomb.planted) {
      x = bomb.x; z = bomb.z; navigating = true;
      stop = Math.hypot(x - a.position.x, z - a.position.z) <= (a.team === 1 ? 1.75 : 4);
    } else if (a.team === 0 && bomb.dropped) {
      x = bomb.x; z = bomb.z; navigating = true;
      stop = Math.hypot(x - a.position.x, z - a.position.z) < .65;
    } else if (a.team === 0 && bomb.carrier === i) {
      let closest = site, distance = Infinity;
      for (let j = 0; j < map.sites.length; j++) {
        const b = map.sites[j], d = Math.hypot(b.x - a.position.x, b.z - a.position.z);
        if (d < distance) { closest = b; distance = d; }
      }
      if (distance < 12) {
        x = closest.x; z = closest.z; navigating = true;
        stop = distance < closest.r * .65 && a.memory <= 0;
      }
    }
    if (x === undefined && a.memory > 0 && !a.seen) {
      x = a.lastX; z = a.lastZ; navigating = true;
      stop = Math.hypot(x - a.position.x, z - a.position.z) < 1.2;
    }
    if (x === undefined && (a.rotation || (a.team === 1 && a.waypoint < 0))) {
      x = site.x; z = site.z; navigating = true;
      if (Math.hypot(x - a.position.x, z - a.position.z) < 1) {
        a.rotation = false; a.waypoint = route.length - (a.team === 1 ? 2 : 1);
      }
    }
    if (x === undefined) {
      a.waypoint = Math.max(0, Math.min(route.length - 1, a.waypoint));
      const p = route[a.waypoint]; x = p[0]; z = p[1];
      if (a.team === 1) {
        const end = route[route.length - 1], prev = route[route.length - 2];
        const length = Math.hypot(prev[0] - end[0], prev[1] - end[1]);
        const t = Math.min(1, 6 / length);
        x = end[0] + (prev[0] - end[0]) * t; z = end[1] + (prev[1] - end[1]) * t;
        stop = Math.hypot(x - a.position.x, z - a.position.z) < .65;
      } else if (Math.hypot(x - a.position.x, z - a.position.z) < .8) {
        if (a.waypoint < route.length - 1) a.waypoint++;
        else stop = true;
      }
    }
    if (navigating && !stop) {
      if (Math.hypot(x - a.navX, z - a.navZ) > 1) plan(a, g, map, x, z);
      if (!(Math.hypot(x - a.position.x, z - a.position.z) < 6 && clear(map, a.position.x, a.position.z, x, z, a.position.y))) {
        while (a.navIndex < a.navCount) {
          const p = g.points[a.path[a.navIndex]];
          if (Math.hypot(p[0] - a.position.x, p[1] - a.position.z) >= .8) { x = p[0]; z = p[1]; break; }
          a.navIndex++;
        }
        if (a.navIndex >= a.navCount) stop = true;
      }
    }
    let dx = x - a.position.x, dz = z - a.position.z;
    const distance = Math.hypot(dx, dz) || 1;
    dx /= distance; dz /= distance;
    let wx = stop ? 0 : dx, wz = stop ? 0 : dz;
    if (a.seen) {
      const tx = a.aimX - a.position.x, tz = a.aimZ - a.position.z, d = Math.hypot(tx, tz) || 1;
      if (!stop) {
        wx = -tz / d * a.peek * .45; wz = tx / d * a.peek * .45;
        if (a.retreat > 0) { wx -= tx / d; wz -= tz / d; }
      }
      const yaw = Math.atan2(-tx, -tz) + a.errorYaw;
      const pitch = Math.atan2(a.aimY - a.position.y - a.eye, d) + a.errorPitch;
      a.yaw += Math.max(-dt * 4.5, Math.min(dt * 4.5, angle(yaw - a.yaw)));
      a.pitch += Math.max(-dt * 3, Math.min(dt * 3, pitch - a.pitch));
      if (a.reaction <= 0 && Math.abs(angle(yaw - a.yaw)) < .08 && Math.abs(pitch - a.pitch) < .08 && !a.reloadLeft) {
        a.trigger = true; combat.fire(a, a.yaw, a.pitch);
      }
      a.mode = a.retreat > 0 ? 'RETREAT' : a.peek ? 'PEEK' : 'HOLD';
    } else {
      const yaw = stop ? a.yaw + Math.sin(s.time * .7 + i) * dt * .7 : Math.atan2(-dx, -dz);
      a.yaw += Math.max(-dt * 3, Math.min(dt * 3, angle(yaw - a.yaw)));
      a.pitch *= Math.max(0, 1 - dt * 5);
      a.mode = navigating ? 'ROTATE' : stop ? 'HOLD' : 'SEARCH';
    }
    const ox = a.position.x, oz = a.position.z;
    if (wx || wz) {
      if (!clear(map, ox, oz, ox + wx * .65, oz + wz * .65, a.position.y)) {
        const side = (i % 2 ? 1 : -1) * (a.stuck > .75 ? -1 : 1);
        const nx = -wz * side, nz = wx * side;
        if (clear(map, ox, oz, ox + nx * .8, oz + nz * .8, a.position.y)) { wx = nx; wz = nz; }
      }
    }
    moveActor(a, map, dt, wx, wz, a.seen ? 2.5 : 3.9);
    if ((wx || wz) && Math.hypot(a.position.x - ox, a.position.z - oz) < dt * .3) a.stuck += dt;
    else a.stuck = Math.max(0, a.stuck - dt * .5);
    if (a.stuck > 1.5) {
      if (navigating) a.navIndex = Math.min(a.navCount, a.navIndex + 1);
      else if (a.team === 0) a.waypoint = Math.min(route.length - 1, a.waypoint + 1);
      a.stuck = 0;
    }
    a.yaw = angle(a.yaw);
  }
}
