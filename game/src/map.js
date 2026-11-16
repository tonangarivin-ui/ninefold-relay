import * as THREE from 'three';

// Metres; boxes are shared by rendering, movement and bullet tests. Decoration never
// silently adds collision. North is -Z; routes have a player-radius clearance.
export function createMap() {
  const boxes = [], colliders = [], pipes = [], signs = [], lights = [];
  function box(x, y, z, w, h, d, mat = 'concrete', solid = true) {
    const data = { x, y, z, w, h, d, mat };
    boxes.push(data);
    if (solid) {
      const bounds = new THREE.Box3(
        new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2),
        new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2));
      colliders.push(bounds);
      data.collider = bounds;
    }
    return data;
  }
  const pipe = (a, b, r = .18, mat = 'rust') => pipes.push({ a, b, r, mat });
  const sign = (x, y, z, text, sub, w = 4, h = 1.3, yaw = 0, style = 'dark') =>
    signs.push({ x, y, z, text, sub, w, h, yaw, style });
  function rail(x, z, length, alongX = true, y = 3.2) {
    for (let n = 0; n <= Math.floor(length / 1.5); n++) {
      const t = n * length / Math.floor(length / 1.5) - length / 2;
      box(x + (alongX ? t : 0), y + .55, z + (alongX ? 0 : t), .055, 1.1, .055, 'rust', false);
    }
    for (const h of [.46, 1.06])
      box(x, y + h, z, alongX ? length : .055, .055, alongX ? .055 : length, 'rust', false);
    // One continuous, knee-high collision barrier avoids catching on every post.
    box(x, y + .48, z, alongX ? length : .1, .96, alongX ? .1 : length, 'rust', true).hidden = true;
  }
  function crate(x, z, w = 1.8, h = 1.35, d = 1.5) {
    box(x, h / 2, z, w, h, d, 'crate');
    for (const dx of [-w / 2 + .09, w / 2 - .09]) {
      box(x + dx, h / 2, z, .12, h + .04, d + .04, 'steel', false);
    }
    for (const y of [.12, h - .12]) box(x, y, z, w + .03, .1, d + .03, 'steel', false);
    sign(x, h * .54, z + d / 2 + .025, '09 / NR', 'WATER AUTHORITY', w * .68, h * .39);
  }

  box(0, -.25, 0, 60.8, .5, 40.8, 'floor');
  box(-30.3, 4, 0, .6, 8, 40.8);
  box(30.3, 4, 0, .6, 8, 40.8);
  box(0, 4, -20.3, 60, 8, .6);
  box(0, 3, 20.3, 60, 6, .6);
  // Lower dark plinths and regular buttresses establish the scale of the works.
  for (const x of [-29.93, 29.93]) {
    box(x, .4, 0, .1, .8, 40, 'dark', false);
    for (let z = -17; z <= 18; z += 7) box(x, 3.5, z, .5, 7, .65, 'concrete');
    pipe([x * .97, 5.1, -19], [x * .97, 5.1, 19], .23);
    pipe([x * .97, 5.85, -19], [x * .97, 5.85, 19], .13, 'steel');
  }
  for (const x of [-25, -15, -5, 5, 15, 25]) {
    box(x, 6.9, -19.9, .18, .38, 39.8, 'steel', false);
    box(x, 7.15, -10, .2, .2, 18, 'rust', false);
  }
  for (const z of [-15, -5, 5, 15]) box(0, 7.35, z, 60, .32, .24, 'dark', false);

  // Pump Hall: broad south entrance and an eastern crosscut, with a rear rotate.
  box(-25, 2.8, 1, 6, 5.6, .55);
  box(-12.5, 2.8, 1, 3, 5.6, .55);
  box(-18, 5.25, 1, 8, .7, .6, 'rust');
  box(-11, 2.8, -8.5, .5, 5.6, 9);
  box(-11, 2.8, 7.8, .5, 5.6, 7.6);
  box(-18, 5.7, -7, 20, .25, 16, 'roof', false);
  box(-18, 2.8, -15, 7, 5.6, .5);
  // Filtration Gallery has a staggered west door and a clear outer service lane.
  box(11, 2.8, -11, .5, 5.6, 9);
  box(11, 2.8, 5.5, .5, 5.6, 11);
  box(14, 2.8, 0, 6, 5.6, .55);
  box(26.5, 2.8, 0, 3, 5.6, .55);
  box(21, 5.25, 0, 8, .7, .6, 'rust');
  box(20, 5.7, -7.5, 18, .25, 15, 'roof', false);
  box(18, 2.8, -15, 7, 5.6, .5);
  // Non-solid high clerestories leave the entrances readable in silhouette.
  for (const x of [-26, -23, -14, 14, 23, 26]) {
    box(x, 4, -19.94, 2.35, 2.3, .06, 'window', false);
    box(x, 4, -19.87, .08, 2.3, .08, 'steel', false);
  }

  // Cylindrical surge vessel; a conservative box hull keeps collision predictable.
  box(0, 2.85, -2.2, 7.1, 5.7, 7.1, 'tank').hidden = true;
  for (const x of [-3.1, 3.1]) {
    pipe([x, 1, -5.8], [x, 1, -10.6], .28);
    pipe([x, 1, -10.6], [x, 4.8, -10.6], .28);
    box(x, 1.8, -10.6, .9, 3.6, .9, 'dark');
  }
  pipe([-28, 3.9, -13.6], [-12.2, 3.9, -13.6], .3);
  pipe([12.2, 3.8, -13.5], [28, 3.8, -13.5], .23);
  for (const x of [-25.5, 25.8]) {
    pipe([x, .65, -12], [x, .65, -4], .38, 'steel');
    for (const z of [-11, -8, -5]) box(x, .5, z, 1.15, 1, .9, 'dark');
  }

  // A real 3.2m bridge with two 1:2.5 stair flights: each riser is .20m.
  box(0, 3.1, 3, 20, .2, 2.4, 'steel');
  rail(0, 1.82, 20);
  rail(0, 4.18, 13);
  for (const x of [-8, 8]) {
    for (let i = 0; i < 16; i++) {
      const h = (i + 1) * .2;
      box(x, h / 2, 11.75 - i * .5, 2.35, h, .5, 'steel');
      box(x, h + .008, 11.96 - i * .5, 2.2, .018, .06, 'paint', false);
    }
    // Rail on the outside only, so the approach and landing remain open.
    for (let i = 0; i < 9; i++) {
      const z = 12 - i, h = i * .4;
      box(x + Math.sign(x) * 1.19, h + .53, z, .055, 1.06, .055, 'rust', false);
    }
    pipe([x + Math.sign(x) * 1.19, 1.06, 12], [x + Math.sign(x) * 1.19, 4.26, 4], .035);
    box(x, 1.5, 2.2, .22, 3, .22, 'rust');
  }

  crate(-23, 7, 2.5, 1.45, 1.8);
  crate(-14, -6, 1.6, 1.25, 2);
  crate(-23.5, -11.5, 1.8, 1.8, 1.8);
  crate(21.7, 7, 2.1, 1.4, 2.4);
  crate(14, -9, 1.7, 1.35, 2.3);
  crate(24, -12.7, 1.7, 1.85, 1.7);
  crate(-3, 12.5, 2, .95, 1.4);
  crate(3.7, -14.3, 2.4, 1.35, 1.5);
  box(-26.5, .65, -4.5, 2.4, 1.3, 1.4, 'concrete');
  box(27.4, .65, -7, 1.4, 1.3, 3.6, 'concrete');

  // Drain channels, slab joints and wayfinding paint are visual only.
  for (const x of [-9.9, 9.9]) box(x, .009, 0, .32, .018, 37, 'grate', false);
  for (let z = -18; z < 20; z += 4) box(0, .003, z, 59.8, .006, .018, 'joint', false);
  for (let x = -28; x < 30; x += 4) box(x, .004, 0, .018, .008, 40, 'joint', false);
  for (const x of [-18, 18]) {
    for (const z of [-14.4, -5.6]) box(x, .016, z, 8.8, .02, .1, 'paint', false);
    for (const dx of [-4.4, 4.4]) box(x + dx, .016, -10, .1, .02, 8.8, 'paint', false);
  }
  sign(-18, 4.25, 1.32, 'A / PUMP HALL', '01 — INTAKE & TRANSFER', 7, 1.05, 0, 'orange');
  sign(21, 4.25, .32, 'B / FILTRATION', '02 — MEMBRANE GALLERY', 7, 1.05, 0, 'orange');
  sign(-18, 3.9, -14.71, 'A', 'PUMP HALL  /  RELAY NODE', 5.7, 2.3, 0, 'orange');
  sign(18, 3.9, -14.71, 'B', 'FILTRATION GALLERY  /  RELAY NODE', 5.7, 2.3, 0, 'orange');
  sign(0, 5.4, -19.94, 'NINEFOLD', 'MUNICIPAL WATERWORKS  /  SECTOR 09', 12, 2.4);
  sign(-25, 2.4, 1.31, 'HIGH PRESSURE', 'AUTHORIZED OPERATORS ONLY', 4.5, .85);
  sign(12.6, 2.2, .31, '02', 'FILTER ACCESS', 2, 1.2);
  sign(0, 3.68, 4.24, 'TRANSFER / 09', 'OVERHEAD SERVICE WALK', 5.4, .65);
  sign(-29.94, 2.7, 8, 'A  /  INTAKE', 'KEEP THE CHANNEL CLEAR', 4, 1, Math.PI / 2, 'orange');
  sign(29.94, 2.7, 8, 'B  /  SERVICE', 'FILTRATION ACCESS', 4, 1, -Math.PI / 2, 'orange');
  sign(0, 2.5, 19.94, 'SOUTH / 09', 'TRANSFER CREW ASSEMBLY', 7, 1.3, Math.PI);

  for (const [x, z] of [[-18,-8],[18,-8],[-26,5],[26,5],[0,14],[0,-16]]) {
    lights.push({ x, y: 4.7, z, power: x === 0 ? 28 : 42 });
    box(x, 4.9, z, 1.6, .14, .6, 'dark', false);
    box(x, 4.81, z, 1.35, .035, .4, 'lamp', false);
    pipe([x, 4.9, z], [x, 7.2, z], .025, 'steel');
  }

  // Rendered shutter and its optional collision disappear together after buy.
  const gateData = box(0, 1.8, 15.5, 11, 3.6, .18, 'gate');
  const gate = gateData.collider;
  gate.userData = { gate: true };
  gateData.gate = true;

  return {
    colliders, boxes, pipes, signs, lights, gate,
    sites: [
      { id: 'A', name: 'PUMP HALL', x: -18, z: -10, r: 4.5 },
      { id: 'B', name: 'FILTRATION GALLERY', x: 18, z: -10, r: 4.5 }
    ],
    spawns: [[0,17],[-2,18],[2,18],[-4,17.6],[4,17.6], [0,-17],[-3,-18],[3,-18],[-7,-17],[7,-17]],
    routes: {
      'siteA-long': [[0,17],[-8,14],[-18,10],[-18,-10]],
      'siteA-short': [[0,17],[-5.8,13],[-5.8,0],[-18,0],[-18,-10]],
      'siteB-mid': [[0,17],[5.8,13],[5.8,-4],[18,-4],[18,-10]],
      'siteB-tunnel': [[0,17],[12,14],[25,12],[25,-3],[21,-7],[18,-10]],
      rotate: [[-18,-10],[-24,-10],[-24,-17],[0,-17],[24,-17],[22,-10],[18,-10]]
    }
  };
}
