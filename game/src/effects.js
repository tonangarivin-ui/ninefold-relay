// Fixed-capacity effects: no allocation or random state in the frame loop.
export function createEffects() {
  const tracers = Array.from({ length: 40 }, () => ({
    active: false, life: 0, x: 0, y: 0, z: 0, ex: 0, ey: 0, ez: 0, team: 0
  }));
  const sparks = Array.from({ length: 128 }, () => ({
    active: false, life: 0, maxLife: 0, x: 0, y: 0, z: 0,
    vx: 0, vy: 0, vz: 0, head: false
  }));
  let tracerIndex = 0, sparkIndex = 0, sequence = 0;
  function trace(x, y, z, ex, ey, ez, team = 0) {
    if (!Number.isFinite(x + y + z + ex + ey + ez)) return;
    const t = tracers[tracerIndex];
    tracerIndex = (tracerIndex + 1) % tracers.length;
    t.active = true; t.life = .085;
    t.x = x; t.y = y; t.z = z;
    t.ex = ex; t.ey = ey; t.ez = ez; t.team = team;
  }
  function impact(x, y, z, head = false) {
    if (!Number.isFinite(x + y + z)) return;
    for (let i = 0; i < (head ? 12 : 7); i++) {
      const p = sparks[sparkIndex];
      sparkIndex = (sparkIndex + 1) % sparks.length;
      const angle = (++sequence * 2.399963229728653);
      const speed = 1.2 + (sequence % 7) * .39;
      p.active = true; p.head = head;
      p.life = p.maxLife = .16 + (sequence % 5) * .045;
      p.x = x; p.y = y; p.z = z;
      p.vx = Math.cos(angle) * speed;
      p.vz = Math.sin(angle) * speed;
      p.vy = 1 + (sequence % 4) * .65;
    }
  }
  function step(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (const t of tracers) if (t.active) {
      t.life = Math.max(0, t.life - dt); t.active = t.life > 0;
    }
    for (const p of sparks) if (p.active) {
      p.life = Math.max(0, p.life - dt); p.active = p.life > 0;
      p.vy -= dt * 8;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < .015) { p.y = .015; p.vy = Math.abs(p.vy) * .25; }
    }
  }
  return { tracers, sparks, trace, impact, step };
}
