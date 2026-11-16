import * as THREE from 'three';

export function createRender(map, s, effects) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-label', 'Ninefold Relay tactical first-person shooter');
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#73858c');
  scene.fog = new THREE.FogExp2('#75858b', .012);
  const camera = new THREE.PerspectiveCamera(76, 16 / 9, .045, 130);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 16);
  const sphere = new THREE.SphereGeometry(1, 12, 8);
  const dummy = new THREE.Object3D(), direction = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  // Deterministic canvas patina; neither simulation state nor RNG is touched.
  function texture(kind) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = kind === 'rust' ? '#a25331' : '#899394';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3800; i++) {
      const n = Math.sin(i * 127.1 + 31.7) * 43758.5453;
      const f = n - Math.floor(n), x = (i * 73) % 256, y = (i * 113 + Math.floor(i / 256) * 31) % 256;
      g.fillStyle = f > .5 ? `rgba(240,236,219,${f * .13})` : `rgba(20,29,29,${.2 + f * .2})`;
      g.fillRect(x, y, 1 + f * 3, 1 + f * 5);
    }
    for (let i = 0; i < 22; i++) {
      g.fillStyle = kind === 'rust' ? 'rgba(43,26,18,.16)' : 'rgba(35,48,49,.09)';
      g.fillRect((i * 47) % 256, (i * 31) % 180, 1 + i % 4, 22 + i % 70);
    }
    if (kind !== 'rust') {
      g.strokeStyle = '#626e6c'; g.globalAlpha = .3;
      g.beginPath(); g.moveTo(13, 0); g.lineTo(24, 57); g.lineTo(19, 69); g.lineTo(39, 104); g.stroke();
      for (const x of [10,246]) for (const y of [10,246]) {
        g.fillStyle = '#3f4b4e'; g.fillRect(x, y, 2, 2);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return t;
  }
  const concrete = texture('concrete'), rust = texture('rust');
  function material(color, roughness = .8, metalness = .1, tex = null) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness, map: tex });
  }
  const m = {
    concrete: material('#8b9c9f', .96, .02, concrete),
    floor: material('#697b80', .94, .02, concrete),
    rust: material('#d17d48', .79, .45, rust),
    steel: material('#455962', .58, .65),
    dark: material('#25353d', .7, .45),
    roof: material('#516770', .87, .25, concrete),
    tank: material('#677c7e', .56, .55, concrete),
    crate: material('#9a7351', .85, .12, rust),
    paint: material('#dfb663', .78),
    joint: material('#35464b'),
    grate: material('#293b41', .65, .65),
    window: new THREE.MeshStandardMaterial({ color: '#a4bac3', emissive: '#9ab7c5', emissiveIntensity: .65, roughness: .4 }),
    lamp: new THREE.MeshStandardMaterial({ color: '#ffe1a0', emissive: '#ffb94c', emissiveIntensity: 3 }),
    gate: new THREE.MeshStandardMaterial({ color: '#dfb169', transparent: true, opacity: .2, wireframe: true }),
    relay: new THREE.MeshStandardMaterial({ color: '#76e3e1', emissive: '#29c8ce', emissiveIntensity: 2, roughness: .3, metalness: .4 }),
    gun: material('#202a30', .48, .65),
    gunEdge: material('#65757c', .43, .75),
    grip: material('#333937', .95),
    glove: material('#343831', .92),
    sleeve: material('#85765c', .97),
    skin: material('#9d806b', .96),
    boot: material('#202a2a', .93),
    visor: material('#101e25', .21, .7),
    ally: new THREE.MeshBasicMaterial({ color: '#ece0ad', depthTest: true })
  };
  function mesh(geo, mat, parent, x, y, z, sx, sy, sz, shadow = true) {
    const o = new THREE.Mesh(geo, mat);
    o.position.set(x, y, z); o.scale.set(sx, sy, sz);
    o.castShadow = shadow; o.receiveShadow = true; parent.add(o); return o;
  }
  const box = (parent, mat, x,y,z,w,h,d, shadow = true) => mesh(cube, mat, parent,x,y,z,w,h,d,shadow);
  function tube(parent, mat, a, b, r) {
    const o = mesh(cylinder, mat, parent, (a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,1,r);
    direction.set(b[0]-a[0], b[1]-a[1], b[2]-a[2]);
    o.scale.y = direction.length(); o.quaternion.setFromUnitVectors(up, direction.normalize()); return o;
  }
  // Map boxes share a unit geometry and one instance batch per material.
  for (const name of Object.keys(m)) {
    if (name === 'gate') continue;
    const data = map.boxes.filter(b => !b.hidden && !b.gate && b.mat === name);
    if (!data.length) continue;
    const batch = new THREE.InstancedMesh(cube, m[name], data.length);
    data.forEach((b, i) => {
      dummy.position.set(b.x,b.y,b.z); dummy.rotation.set(0,0,0); dummy.scale.set(b.w,b.h,b.d);
      dummy.updateMatrix(); batch.setMatrixAt(i,dummy.matrix);
    });
    batch.castShadow = !['joint','paint','lamp','window','gate','grate'].includes(name);
    batch.receiveShadow = true; scene.add(batch);
  }
  // Pipes use instance batches too, including short flange collars at each end.
  const pipeData = [...map.pipes];
  for (const p of map.pipes) {
    const dx = p.b[0]-p.a[0], dy = p.b[1]-p.a[1], dz = p.b[2]-p.a[2];
    const length = Math.hypot(dx,dy,dz);
    for (const f of [.05,.95]) {
      const a = [p.a[0]+dx*f,p.a[1]+dy*f,p.a[2]+dz*f];
      pipeData.push({ a, b: [a[0]+dx/length*.065,a[1]+dy/length*.065,a[2]+dz/length*.065], r:p.r*1.35,mat:'steel' });
    }
  }
  for (const name of ['rust','steel']) {
    const data = pipeData.filter(p=>p.mat===name);
    const batch = new THREE.InstancedMesh(cylinder,m[name],data.length);
    data.forEach((p,i)=>{
      direction.set(p.b[0]-p.a[0],p.b[1]-p.a[1],p.b[2]-p.a[2]);
      dummy.position.set((p.a[0]+p.b[0])/2,(p.a[1]+p.b[1])/2,(p.a[2]+p.b[2])/2);
      dummy.quaternion.setFromUnitVectors(up,direction.clone().normalize());
      dummy.scale.set(p.r,direction.length(),p.r);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);
    });
    batch.castShadow = true; batch.receiveShadow = true; scene.add(batch);
  }
  function signTexture(text, sub, style) {
    const c=document.createElement('canvas');c.width=1024;c.height=384;
    const g=c.getContext('2d'), orange=style==='orange';
    g.fillStyle=orange?'#b96438':'#24343c';g.fillRect(0,0,1024,384);
    g.strokeStyle=orange?'#e0a06c':'#6b7c7d';g.lineWidth=4;g.strokeRect(14,14,996,356);
    g.fillStyle='#e9dfc5';g.fillRect(38,42,11,208);
    g.font=`800 ${text.length<3?228:76}px sans-serif`;
    g.textBaseline='middle';g.fillText(text,76,155,900);
    g.font='500 29px monospace';g.fillText(sub,76,303,875);
    g.fillStyle='#e7be75';
    for(let i=0;i<9;i++)g.fillRect(770+i*22,345,12,8);
    for(let i=0;i<180;i++) {
      g.fillStyle='rgba(14,25,28,.16)';g.fillRect((i*137)%1024,(i*79)%384,1+i%13,1+i%2);
    }
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
  }
  const plane = new THREE.PlaneGeometry(1,1);
  for(const p of map.signs) {
    const mat = new THREE.MeshStandardMaterial({ map:signTexture(p.text,p.sub,p.style),roughness:.84 });
    const o=mesh(plane,mat,scene,p.x,p.y,p.z,p.w,p.h,1,false);o.rotation.y=p.yaw;
  }
  // Hero surge vessel: ribbed shell, inspection hatch, ladder and pressure gauge.
  mesh(cylinder,m.tank,scene,0,2.8,-2.2,3.48,5.6,3.48);
  for(const y of [.3,1.35,4.5,5.5])mesh(cylinder,m.steel,scene,0,y,-2.2,3.58,.13,3.58);
  mesh(cylinder,m.dark,scene,0,5.68,-2.2,3.6,.18,3.6);
  mesh(cylinder,m.steel,scene,0,5.83,-2.2,1.1,.15,1.1);
  const hatch=tube(scene,m.rust,[0,2.2,1.18],[0,2.2,1.45],.75);
  tube(scene,m.dark,[0,2.2,1.44],[0,2.2,1.49],.57);
  for(let i=0;i<8;i++) {
    const a=i*Math.PI/4;
    tube(scene,m.gunEdge,[Math.sin(a)*.64,2.2+Math.cos(a)*.64,1.45],[Math.sin(a)*.64,2.2+Math.cos(a)*.64,1.51],.045);
  }
  for(const x of [-2.15,-1.6])tube(scene,m.steel,[x,.2,.55],[x,5.9,.55],.045);
  for(let y=.35;y<5.9;y+=.34)tube(scene,m.steel,[-2.15,y,.55],[-1.6,y,.55],.028);
  const tankLabel=mesh(plane,new THREE.MeshStandardMaterial({ map:signTexture('09','SURGE RESERVOIR / 4.8 BAR','dark'),roughness:.8 }),scene,0,4.15,1.305,2.2,1.1,1,false);
  // Pump skids and filter vessels sit behind the site lines rather than in routes.
  for(const x of [-26.6,26.8]) for(const z of [-5,-9]) {
    box(scene,m.dark,x,.12,z,1.6,.24,2.2);
    tube(scene,m.rust,[x,.7,z-.7],[x,.7,z+.6],.43);
    tube(scene,m.steel,[x,.7,z+.65],[x,.7,z+1],.31);
    for(const dx of [-.46,.46])box(scene,m.steel,x+dx,.35,z,.1,.5,1.6);
    tube(scene,m.rust,[x,.9,z-.65],[x,2.1,z-.65],.12);
    const wheel=mesh(new THREE.TorusGeometry(.25,.035,6,16),m.rust,scene,x,1.9,z-.65,1,1,1);
    wheel.rotation.x=Math.PI/2;
    for(const dx of [-.21,.21])tube(scene,m.rust,[x+dx,1.9,z-.65],[x-dx,1.9,z-.65],.018);
  }
  for(const x of [15.5,18,20.5]) {
    mesh(cylinder,m.tank,scene,x,1.35,-13.4,.63,2.7,.63);
    mesh(sphere,m.steel,scene,x,2.7,-13.4,.63,.22,.63);
    for(const y of [.3,2.4])mesh(cylinder,m.rust,scene,x,y,-13.4,.68,.09,.68);
  }
  // Localized runoff and damp patches break up the floor without transparency layers.
  const stainMat=material('#566b70',.35,.15,concrete);
  for(let i=0;i<18;i++) {
    const x=Math.sin(i*8.17)*27,z=Math.cos(i*5.81)*17;
    const o=mesh(new THREE.CircleGeometry(1,18),stainMat,scene,x,.011,z,1.2+i%3,.4+i%2,1,false);
    o.rotation.x=-Math.PI/2;o.rotation.z=i;
  }
  const gateGroup=new THREE.Group();scene.add(gateGroup);
  for(const b of map.boxes.filter(b=>b.gate)) {
    box(gateGroup,m.gate,b.x,b.y,b.z,b.w,b.h,b.d,false);
    for(const x of [-b.w/2,b.w/2])box(scene,m.rust,x,b.h/2,b.z,.14,b.h,.22);
    box(scene,m.rust,0,b.h+.12,b.z,b.w+.4,.24,.3);
  }
  const sky=new THREE.HemisphereLight('#c4d8e4','#505a55',2.1);scene.add(sky);
  const sun=new THREE.DirectionalLight('#ffdeaa',3.3);
  sun.position.set(-18,28,9);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-36;sun.shadow.camera.right=36;
  sun.shadow.camera.top=30;sun.shadow.camera.bottom=-30;sun.shadow.camera.near=1;sun.shadow.camera.far=90;
  sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;sun.shadow.radius=3;scene.add(sun);
  const fill=new THREE.DirectionalLight('#aac9de',1.1);fill.position.set(12,12,-22);scene.add(fill);
  for(const p of map.lights) {
    const l=new THREE.PointLight('#ffc070',p.power,16,1.6);l.position.set(p.x,p.y,p.z);scene.add(l);
  }

  function weapon(kind, parent, view = false) {
    const g=new THREE.Group();parent.add(g);
    const pistol=kind==='kestrel',shotgun=kind==='harrow';
    const len=pistol?.25:shotgun?.71:.58;
    box(g,m.gun,0,0,-.08,.095,.12,pistol?.26:.34);
    box(g,m.gunEdge,0,.055,-.12,.087,.035,pistol?.28:.36);
    box(g,m.grip,0,-.14,.015,.08,.21,.1).rotation.x=-.2;
    if(!pistol) {
      box(g,m.gun,0,-.005,.22,.07,.065,.28);
      box(g,m.grip,0,-.035,.38,.11,.18,.09);
      box(g,m.gun,0,.005,-.31,.105,.105,.23);
      tube(g,m.gunEdge,[0,.015,-.38],[0,.015,-len-.15],.022);
      tube(g,m.gun,[0,.015,-len-.12],[0,.015,-len-.21],.031);
      if(shotgun) {
        tube(g,m.gun,[0,-.045,-.33],[0,-.045,-.7],.025);
        box(g,m.grip,0,-.02,-.43,.13,.12,.2);
        for(let i=0;i<5;i++)box(g,m.gunEdge,0,.015,-.36-i*.035,.135,.012,.009);
      } else {
        const mag=box(g,m.gun,0,-.19,-.15,.075,.28,.125);mag.rotation.x=.16;
        for(let i=0;i<3;i++)box(g,m.gunEdge,.04,-.14-i*.055,-.15,.007,.012,.09);
        for(let i=0;i<8;i++) {
          box(g,m.gunEdge,0,.072,-.2-i*.036,.114,.012,.018);
          box(g,m.dark,.055,0,-.25-i*.022,.008,.035,.011);
        }
      }
      box(g,m.gun,0,.12,-.17,.065,.075,.045);
      box(g,m.visor,0,.135,-.17,.045,.03,.049);
      box(g,m.gunEdge,0,.09,-len+.04,.022,.11,.022);
      for(const dx of [-.027,.027])box(g,m.gun,dx,.14,-len+.04,.012,.06,.035);
      box(g,m.rust,.051,.018,-.06,.008,.02,.08);
    } else {
      tube(g,m.gun,[0,.01,-.2],[0,.01,-.3],.02);
      box(g,m.gunEdge,0,.084,-.22,.018,.025,.018);
      box(g,m.gunEdge,0,.084,.005,.06,.02,.015);
    }
    const flash=new THREE.Group();g.add(flash);flash.position.set(0,.015,-len-(pistol? .065:.24));
    const flareMat=new THREE.MeshBasicMaterial({ color:'#fff1bb',transparent:true,opacity:.95,depthWrite:false });
    const flare=mesh(new THREE.ConeGeometry(.075,.27,5),flareMat,flash,0,0,-.09,1,1,1,false);flare.rotation.x=-Math.PI/2;
    const flare2=mesh(new THREE.ConeGeometry(.13,.12,5),new THREE.MeshBasicMaterial({color:'#ffb24b',transparent:true,opacity:.7,depthWrite:false}),flash,0,0,-.04,1,1,1,false);flare2.rotation.x=-Math.PI/2;
    flash.visible=false;
    if(view) {
      box(g,m.sleeve,.105,-.19,.18,.145,.16,.35).rotation.x=-.25;
      mesh(sphere,m.glove,g,.06,-.115,.025,.075,.09,.1);
      const fore=box(g,m.sleeve,-.14,-.21,-.08,.14,.14,.36);fore.rotation.y=-.45;fore.rotation.x=-.3;
      mesh(sphere,m.glove,g,-.055,-.08,pistol?-.04:-.32,.075,.07,.11);
      for(let i=0;i<3;i++)box(g,m.grip,.12,-.11+i*.019,.02,.02,.012,.07);
    }
    return {g,flash};
  }
  const clothes=[material('#8f5840',.94,.05,rust),material('#384d60',.96,.03,concrete)];
  const vests=[material('#534b3b',.94),material('#273b45',.95)];
  function actorModel(team) {
    const root=new THREE.Group(),body=new THREE.Group();root.add(body);scene.add(root);
    const cloth=clothes[team],vest=vests[team];
    box(body,cloth,0,1.12,0,.39,.48,.25);
    box(body,vest,0,1.15,-.035,.44,.37,.31);
    box(body,vest,0,1.19,.17,.3,.34,.13);
    box(body,m.grip,0,.88,0,.43,.065,.28);
    for(const x of [-.14,0,.14]) {
      box(body,vest,x,1.08,-.22,.112,.15,.08);
      box(body,m.gunEdge,x,1.16,-.265,.08,.018,.008);
    }
    for(const x of [-.17,.17])box(body,vest,x,1.35,-.1,.065,.16,.3);
    const head=new THREE.Group();head.position.y=1.49;body.add(head);
    mesh(sphere,m.skin,head,0,.02,0,.105,.135,.105);
    mesh(sphere,cloth,head,0,.105,.012,.145,.12,.15);
    box(head,m.visor,0,.04,-.105,.22,.062,.055);
    box(head,vest,0,-.055,-.06,.18,.09,.13);
    box(head,m.dark,-.15,.06,.02,.045,.09,.08);
    tube(head,m.dark,[-.16,.04,0],[-.15,-.02,-.15],.012);
    const legs=[];
    for(const x of [-.12,.12]) {
      const leg=new THREE.Group();leg.position.set(x,.88,0);body.add(leg);
      box(leg,cloth,0,-.2,0,.17,.4,.19);
      box(leg,vest,0,-.4,-.045,.17,.13,.15);
      box(leg,cloth,0,-.59,.01,.15,.32,.16);
      box(leg,m.boot,0,-.8,-.045,.18,.16,.29);
      box(leg,m.grip,0,-.46,0,.175,.035,.2);legs.push(leg);
    }
    const arms=new THREE.Group();arms.position.set(0,1.34,-.03);body.add(arms);
    for(const x of [-.25,.25]) {
      const upper=box(arms,cloth,x,-.12,-.08,.15,.29,.17);upper.rotation.x=-.55;
      const fore=box(arms,cloth,x*.75,-.2,-.25,.14,.15,.32);fore.rotation.y=x>0?.45:-.45;
      mesh(sphere,m.glove,arms,x*.35,-.19,-.37,.075,.075,.09);
    }
    const guns={};
    for(const kind of ['patern','kestrel','harrow']) {
      guns[kind]=weapon(kind,arms);guns[kind].g.position.set(.1,-.15,-.34);guns[kind].g.scale.setScalar(.82);
    }
    const marker=mesh(new THREE.OctahedronGeometry(.055),m.ally,root,0,1.98,0,1,.6,1,false);
    return {root,body,head,arms,legs,guns,marker};
  }
  const actors=Array.from({length:10},(_,i)=>actorModel(s.actors?.[i]?.team ?? (i<5?0:1)));
  const view=new THREE.Group();camera.add(view);
  const viewGuns={};
  for(const k of ['patern','kestrel','harrow'])viewGuns[k]=weapon(k,view,true);
  const muzzleLight=new THREE.PointLight('#ffd395',0,5,2);muzzleLight.position.set(.22,-.1,-.8);camera.add(muzzleLight);

  const bomb=new THREE.Group();scene.add(bomb);
  box(bomb,m.dark,0,.13,0,.45,.26,.36);
  box(bomb,m.gunEdge,0,.28,0,.4,.04,.3);
  for(const x of [-.17,.17])box(bomb,m.grip,x,.16,0,.055,.31,.39);
  box(bomb,m.relay,0,.304,-.02,.21,.012,.12,false);
  for(const x of [-.08,0,.08])box(bomb,m.relay,x,.16,-.187,.032,.1,.012,false);
  const relayRing=mesh(new THREE.TorusGeometry(.45,.013,6,48),m.relay,bomb,0,.035,0,1,1,1,false);
  relayRing.rotation.x=Math.PI/2;
  const relayLight=new THREE.PointLight('#53dfe2',0,5,2);relayLight.position.y=.6;bomb.add(relayLight);
  const tracerMat=[new THREE.MeshBasicMaterial({color:'#ffe0a0',transparent:true,depthWrite:false}),new THREE.MeshBasicMaterial({color:'#fff1d3',transparent:true,depthWrite:false})];
  const tracerMeshes=effects.tracers.map(()=>{
    const o=mesh(cylinder,tracerMat[0],scene,0,0,0,.012,1,.012,false);o.visible=false;return o;
  });
  const sparkMat=new THREE.MeshBasicMaterial({color:'#ffc783',transparent:true,depthWrite:false});
  const sparks=new THREE.InstancedMesh(cube,sparkMat,effects.sparks.length);sparks.frustumCulled=false;scene.add(sparks);
  const sparkColor=new THREE.Color();
  const flashOverlay=new THREE.Mesh(plane,new THREE.MeshBasicMaterial({color:'#fff1cf',transparent:true,opacity:0,depthTest:false,depthWrite:false}));
  flashOverlay.position.z=-.06;flashOverlay.renderOrder=1000;camera.add(flashOverlay);

  function draw() {
    const player=s.player || s.actors[0],time=s.time || 0;
    const override=s.cameraOverride;
    if(override) {
      camera.position.set(override.x,override.y,override.z);
      camera.lookAt(override.lookX,override.lookY,override.lookZ);
    } else {
      const shake=s.view?.shake || 0;
      camera.position.set(player.position.x+Math.sin(time*79)*shake*.025,player.position.y+(player.eye??1.6)+Math.cos(time*67)*shake*.018,player.position.z);
      camera.rotation.set((player.pitch||0)+(s.view?.kick||0)*.025,player.yaw||0,Math.sin(time*41)*shake*.009,'YXZ');
    }
    gateGroup.visible=s.phase==='buy'||s.phase==='title';
    for(let i=0;i<actors.length;i++) {
      const a=s.actors[i],o=actors[i];
      o.root.visible=!!a && (override || a!==player);
      if(!a)continue;
      o.root.position.copy(a.position);o.root.rotation.y=a.yaw||0;
      o.body.position.set(0,a.crouching?-.36:0,0);
      o.body.rotation.set(a.alive===false?Math.PI/2:0,0,a.alive===false?.15:0);
      if(a.alive===false) {o.body.position.y=.25;o.body.position.z=.6;}
      const speed=a.velocity?Math.hypot(a.velocity.x,a.velocity.z):0;
      const gait=Math.sin(time*10+i*1.7)*Math.min(speed/5,1)*.6;
      o.legs[0].rotation.x=a.alive===false?-.15:gait;
      o.legs[1].rotation.x=a.alive===false?.25:-gait;
      o.head.rotation.x=-(a.pitch||0)*.45;
      o.arms.rotation.x=-(a.pitch||0)*.7-(a.recoil||0)*.04;
      o.marker.visible=a.alive!==false&&a.team===player.team;
      o.marker.position.y=(a.crouching?1.62:1.98)+Math.sin(time*2)*.018;
      for(const k of Object.keys(o.guns)) {
        o.guns[k].g.visible=k===(a.weapon||'patern');
        o.guns[k].flash.visible=(a.flash||0)>0&&a.alive!==false;
        o.guns[k].flash.rotation.z=time*71;
      }
    }
    view.visible=!override&&player.alive!==false&&s.phase!=='title'&&s.phase!=='end';
    const speed=player.velocity?Math.hypot(player.velocity.x,player.velocity.z):0;
    const bob=Math.min(speed/5,1),recoil=Math.min(player.recoil||0,3);
    const reload=player.reloadLeft>0?Math.sin(Math.min(1,player.reloadLeft/2.5)*Math.PI):0;
    view.position.set(.24+Math.sin(time*7)*bob*.009,-.23+Math.cos(time*14)*bob*.008-reload*.17,-.4+recoil*.038);
    view.rotation.set(recoil*.045-reload*.35,-reload*.2,-.025+reload*.48);
    for(const k of Object.keys(viewGuns)) {
      viewGuns[k].g.visible=k===(player.weapon||'patern');
      viewGuns[k].flash.visible=(player.flash||0)>0;
      viewGuns[k].flash.rotation.z=time*91;
    }
    muzzleLight.intensity=view.visible&&(player.flash||0)>0?9:0;
    const carrier=typeof s.bomb?.carrier==='object'?s.bomb.carrier:s.actors.find(a=>a.id===s.bomb?.carrier);
    bomb.visible=!!s.bomb&&(s.bomb.planted||!!carrier);
    if(s.bomb?.planted) {
      bomb.position.set(s.bomb.x,.025,s.bomb.z);bomb.rotation.set(0,time*.08,0);
      relayRing.visible=true;relayRing.scale.setScalar(1+Math.sin(time*5)*.08);relayLight.intensity=2+Math.sin(time*8);
    } else if(carrier) {
      bomb.visible=carrier!==player||!!override;
      bomb.position.copy(carrier.position);bomb.position.y+=carrier.crouching?.72:1.1;
      bomb.position.x+=Math.sin(carrier.yaw||0)*.25;bomb.position.z+=Math.cos(carrier.yaw||0)*.25;
      bomb.rotation.set(Math.PI/2,carrier.yaw||0,0);relayRing.visible=false;relayLight.intensity=0;
    }
    for(let i=0;i<effects.tracers.length;i++) {
      const t=effects.tracers[i],o=tracerMeshes[i];o.visible=t.active;
      if(!t.active)continue;
      o.position.set((t.x+t.ex)/2,(t.y+t.ey)/2,(t.z+t.ez)/2);
      direction.set(t.ex-t.x,t.ey-t.y,t.ez-t.z);const length=direction.length();
      o.scale.set(.009,length,.009);if(length)o.quaternion.setFromUnitVectors(up,direction.normalize());
      o.material=tracerMat[t.team===1?1:0];
    }
    let count=0;
    for(const p of effects.sparks) if(p.active) {
      dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(time*12,time*9,0);
      dummy.scale.setScalar(.025*(p.life/p.maxLife));dummy.updateMatrix();sparks.setMatrixAt(count,dummy.matrix);
      sparkColor.set(p.head?'#e9d4b4':'#ffb25e');sparks.setColorAt(count,sparkColor);count++;
    }
    sparks.count=count;sparks.instanceMatrix.needsUpdate=true;if(sparks.instanceColor)sparks.instanceColor.needsUpdate=true;
    flashOverlay.material.opacity=Math.min(.9,Math.max(0,s.view?.flash||0));
    flashOverlay.scale.set(1,1,1);
    renderer.render(scene,camera);
  }
  function resize() {
    const w=canvas.clientWidth||window.innerWidth||1280,h=canvas.clientHeight||window.innerHeight||720;
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  }
  resize();
  return {canvas,camera,scene,draw,resize};
}
