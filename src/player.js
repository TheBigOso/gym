// RepRig 3D player: drives a skinned Three.js mesh from the shared engine and exercise modules; exports glTF.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

const R = RepRig, V = R.V, Q = R.Q;
const RIG = RR_DATA.rig, EXS = RR_DATA.exercises, SCHEMA = RR_DATA.schema;
const U = 0.01; // cm -> m
const rig = R.buildRig(RIG);
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PARTNER = (id) => (id.endsWith('_r') ? id.slice(0, -2) + '_l' : id.endsWith('_l') ? id.slice(0, -2) + '_r' : id);
const ROLE = { target: 0xe53e3a, synergist: 0xf2a91e, stabilizer: 0x3b8fe0, lengthened: 0x9a63e8 };
const ROLE_LABEL = { target: 'Target', synergist: 'Synergists', stabilizer: 'Stabilizers', lengthened: 'Lengthened' };
const BG = { dark: { clear: 0x15181d, floor: 0x252a31, mat: 0x2f4d55, ink: '#e8ecf1', guide: 0x2fd1c0 }, light: { clear: 0xecebe6, floor: 0xd9d6cf, mat: 0x5d8488, ink: '#1d2127', guide: 0x0e8f83 } };

/* ---------------- state ---------------- */
const S = { ex: 0, t: 3.4, clock: 0, playing: true, speed: 1, side: 'R', cam: 'threeQuarter', bg: 'dark', hover: null, show: { target: true, synergist: true, stabilizer: false, lengthened: false, paths: true, angles: true } };
try { const v = JSON.parse(localStorage.getItem('reprig3d') || '{}'); if (v.bg) S.bg = v.bg; if (v.show) Object.assign(S.show, v.show); if (Number.isInteger(v.ex) && EXS[v.ex]) S.ex = v.ex; } catch (e) {}
const remember = () => { try { localStorage.setItem('reprig3d', JSON.stringify({ bg: S.bg, show: S.show, ex: S.ex })); } catch (e) {} };
let EX, META, tl, D, roleOf;

/* ---------------- figure: the Studio clay athlete (src/athlete.js), driven by RepRig world poses ---------------- */
const CHAR = RRAthlete.loadCharacter(RR_DATA.character);
const makeAthlete = (k) => { const v = CHAR.variant(k); const a = RRAthlete.buildAthlete(CHAR.sh, v.ch, v.pos, rig, v.look); a.mesh.name = 'Body'; a.key = k; return a; };
// RepRig cm -> this body: the athlete is RepRig scaled by its leg length, so the props, mat and guides share that scale
const ikWeights = (pose, ex) => { const w = {}; for (const c of ex.contacts || []) { const k = pose.ik && pose.ik[c.id]; if (k) w[c.id] = k.weight ?? 1; } return w; };

/* ---------------- scene ---------------- */
const stage = $('stage'), canvas = $('cv');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 60);
const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.dampingFactor = 0.12; controls.maxPolarAngle = Math.PI * 0.495; controls.minDistance = 1; controls.maxDistance = 9;
scene.add(new THREE.HemisphereLight(0xf3f6ff, 0x5a5048, 1.15));
const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(1.6, 3.4, 2.4); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: 0.5, far: 9 }); key.shadow.bias = -0.0004; key.shadow.radius = 4;
scene.add(key);
const rim = new THREE.DirectionalLight(0xbfd8ff, 0.8); rim.position.set(-2.5, 1.8, -2); scene.add(rim);
const floor = new THREE.Mesh(new THREE.CircleGeometry(4.5, 64), new THREE.MeshStandardMaterial({ roughness: 0.95 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
let A = makeAthlete(RR_DATA.character.default || 'm'); scene.add(A.mesh);
const world = new THREE.Group(); world.name = 'World'; world.scale.setScalar(A.sLeg); scene.add(world);
const matMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.85 })); matMesh.receiveShadow = true; world.add(matMesh);
const propGroup = new THREE.Group(); propGroup.name = 'Props'; world.add(propGroup);
// Male is the default; the female variant ships in the data for a later switch (__rr.setAthlete('f')).
function setAthlete(k) { if (!RR_DATA.character.variants[k] || k === A.key) return; scene.remove(A.mesh); A.mesh.geometry.dispose(); A = makeAthlete(k); scene.add(A.mesh); world.scale.setScalar(A.sLeg); loadExercise(S.ex); }
const PROP_COLOR = { box: 0x8a6f52, cone: 0xff7a1a, stick: 0xe8c547, ladder: 0xf2d230, hurdle: 0xe0483e, bench: 0x3a3f48, dumbbell: 0x2b2f36, kettlebell: 0x2b2f36, barbell: 0x2b2f36, wall: 0x6e7680, rack: 0x262a31, pullup_bar: 0x262a31, cable: 0x2a2e35 };
// Equipment from the module's props list (the mat is drawn separately). Units: cm in, metres out.
function buildProps(props, group) {
  for (const pr of props || []) {
    if (pr.kind === 'mat' || (pr.attach && pr.attach.joint)) continue; // held props ride on the athlete's hand (see placeHeld)
    const [cx, cy, cz] = (pr.center || [0, 0, 0]).map((v) => v * U), [sx, sy, sz] = (pr.size || [30, 30, 30]).map((v) => v * U);
    const mat = new THREE.MeshStandardMaterial({ color: pr.color ? new THREE.Color(pr.color) : PROP_COLOR[pr.kind] || 0x888888, roughness: 0.7 });
    let m;
    if (pr.kind === 'cone') { m = new THREE.Mesh(new THREE.ConeGeometry(sx / 2, sy, 24), mat); m.position.set(cx, cy + sy / 2, cz); }
    else if (pr.kind === 'stick') { m = new THREE.Mesh(new THREE.CylinderGeometry(sy / 2, sy / 2, sx, 12), mat); m.rotation.z = Math.PI / 2; m.position.set(cx, cy + sy / 2, cz); }
    else if (pr.kind === 'hurdle') { m = new THREE.Group(); const bar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, sz), mat); bar.position.y = sy; m.add(bar); for (const z of [-sz / 2, sz / 2]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.02, sy, 0.02), mat); leg.position.set(0, sy / 2, z); m.add(leg); } m.position.set(cx, cy, cz); }
    else if (pr.kind === 'ladder') { m = new THREE.Group(); const n = Math.max(2, Math.round(sx / 0.45)); for (const z of [-sz / 2, sz / 2]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.006, 0.025), mat); rail.position.set(0, 0.003, z); m.add(rail); } for (let i = 0; i <= n; i++) { const rung = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.006, sz), mat); rung.position.set(-sx / 2 + (i * sx) / n, 0.003, 0); m.add(rung); } m.position.set(cx, cy, cz); }
    else if (pr.kind === 'bench' && pr.backAngle != null) { // adjustable bench: seat pad + back pad hinged at one end of the seat
      m = new THREE.Group(); const pad = 0.06, legM = new THREE.MeshStandardMaterial({ color: 0x9aa1aa, roughness: 0.5, metalness: 0.6 });
      const seat = new THREE.Mesh(new THREE.BoxGeometry(sx, pad, sz), mat); seat.position.set(0, sy - pad / 2, 0); m.add(seat);
      for (const fx of [-0.35, 0.35]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, sy - pad, sz * 0.8), legM); leg.position.set(fx * sx, (sy - pad) / 2, 0); m.add(leg); }
      const dir = pr.backSide ?? -1, bl = (pr.backLength ?? 80) * U, a = pr.backAngle * R.DEG;
      const hinge = new THREE.Group(); hinge.position.set(dir * sx / 2, sy, 0); hinge.rotation.z = dir * a; m.add(hinge); // the pad rises away from the seat
      const back = new THREE.Mesh(new THREE.BoxGeometry(bl, pad, sz), mat); back.position.set(dir * bl / 2, -pad / 2, 0); hinge.add(back);
      const sY = sy - pad + Math.sin(a) * bl * 0.7, sX = dir * (sx / 2 + Math.cos(a) * bl * 0.7); // support under 70% of the pad
      if (a > 0.05) { const strut = new THREE.Mesh(new THREE.BoxGeometry(0.05, sY, 0.05), legM); strut.position.set(sX, sY / 2, 0); m.add(strut); }
      else { const foot = new THREE.Mesh(new THREE.BoxGeometry(0.05, sy - pad, 0.05), legM); foot.position.set(dir * (sx / 2 + bl * 0.9), (sy - pad) / 2, 0); m.add(foot); }
      m.position.set(cx, cy, cz);
    }
    else if (pr.kind === 'rack') { // squat rack / power rack: two uprights (z = +-size[2]/2) with J-hooks at hookY, optional safeties at safetyY
      m = new THREE.Group(); const post = 0.06, hook = (pr.hookY ?? 140) * U, st = steelMat();
      for (const z of [-sz / 2, sz / 2]) {
        for (const x of sx > 0.2 ? [-sx / 2, sx / 2] : [0]) { const up = new THREE.Mesh(new THREE.BoxGeometry(post, sy, post), mat); up.position.set(x, sy / 2, z); m.add(up); }
        const foot = new THREE.Mesh(new THREE.BoxGeometry(Math.max(sx, 0.5) + post, 0.04, post * 1.4), mat); foot.position.set(0, 0.02, z); m.add(foot);
        const j = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.05), st); j.position.set((sx > 0.2 ? sx / 2 : 0) + 0.05, hook - 0.015, z); m.add(j);
        const lip = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.05, 0.05), st); lip.position.set((sx > 0.2 ? sx / 2 : 0) + 0.095, hook + 0.01, z); m.add(lip);
        if (pr.safetyY != null) { const sf = new THREE.Mesh(new THREE.BoxGeometry(Math.max(sx, 0.5) + 0.3, 0.04, 0.05), st); sf.position.set(0.15, pr.safetyY * U, z); m.add(sf); }
      }
      if (sx > 0.2) for (const x of [-sx / 2, sx / 2]) { const top = new THREE.Mesh(new THREE.BoxGeometry(post, post, sz + post), mat); top.position.set(x, sy - post / 2, 0); m.add(top); }
      m.position.set(cx, cy, cz);
    }
    else if (pr.kind === 'pullup_bar') { // free-standing pull-up bar: posts at z = +-size[2]/2, a 3.2 cm bar along Z at height size[1]
      m = new THREE.Group(); const st = steelMat();
      for (const z of [-sz / 2, sz / 2]) { const up = new THREE.Mesh(new THREE.BoxGeometry(0.06, sy + 0.04, 0.06), mat); up.position.set(0, (sy + 0.04) / 2, z); m.add(up); const foot = new THREE.Mesh(new THREE.BoxGeometry(Math.max(sx, 0.9), 0.04, 0.08), mat); foot.position.set(0, 0.02, z); m.add(foot); }
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, sz, 16), st); bar.rotation.x = Math.PI / 2; bar.position.set(0, sy, 0); m.add(bar);
      m.position.set(cx, cy, cz);
    }
    else if (pr.kind === 'cable') { // cable tower: column at center, pulley at anchor (prop space)
      m = new THREE.Group(); const col = new THREE.Mesh(new THREE.BoxGeometry(Math.max(sx, 0.14), sy || 2.1, Math.max(sz, 0.14)), mat); col.position.set(0, (sy || 2.1) / 2, 0); m.add(col);
      if (pr.anchor) { // pulley wheel at the anchor, on an arm from the column (any horizontal direction)
        const a = pr.anchor.map((v) => v * U), dx = a[0] - cx, dz = a[2] - cz, len = Math.hypot(dx, dz);
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.025, 20), steelMat()); wheel.rotation.x = Math.PI / 2; wheel.position.set(dx, a[1] - cy, dz); m.add(wheel);
        if (len > 0.03) { const arm = new THREE.Mesh(new THREE.BoxGeometry(len + 0.04, 0.04, 0.04), mat); arm.position.set(dx / 2, a[1] - cy, dz / 2); arm.rotation.y = -Math.atan2(dz, dx); m.add(arm); }
      }
      m.position.set(cx, cy, cz);
    }
    else { m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat); m.position.set(cx, cy + sy / 2, cz); }
    if (pr.rotY) m.rotation.y = pr.rotY * R.DEG;
    m.name = pr.id; m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    group.add(m);
  }
}

// ---------------- Held and attached equipment ----------------
// One-hand items (attach.joint only) ride on that hand's bone: dumbbell, kettlebell (grip 'handle'), cable D-handle,
// band handle. Two-hand items (attach.joint + attach.with) are placed each frame between both hands: barbell, kettlebell
// held by the handle in both hands, cable bar or rope, a band held in both hands. Cables and bands are drawn from their anchor (prop
// space, or a rig joint via anchorJoint) to the hand(s). All meshes are built along +X with the grip at the origin.
const steelMat = () => new THREE.MeshStandardMaterial({ color: 0xb9bec6, roughness: 0.3, metalness: 0.9 });
const ironMat = (pr, c) => new THREE.MeshStandardMaterial({ color: pr.color ? new THREE.Color(pr.color) : c, roughness: 0.55, metalness: 0.35 });
const shade = (g) => { g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; };
const cylX = (r, len, mat, seg = 16) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat); m.rotation.z = Math.PI / 2; return m; };
function dumbbellMesh(pr) {
  const L = ((pr.size && pr.size[0]) || 32) * U, D = ((pr.size && pr.size[1]) || 12) * U, hl = Math.min(0.14, L * 0.45), plate = (L - hl) / 2;
  const iron = ironMat(pr, PROP_COLOR.dumbbell), g = new THREE.Group(); g.name = pr.id;
  g.add(cylX(0.016, hl + 0.02, steelMat()));
  for (const sgn of [-1, 1]) { const h = cylX(D / 2, plate, iron, 6); h.position.x = sgn * (hl / 2 + plate / 2); g.add(h); }
  return shade(g);
}
// Olympic barbell: 220 cm, 2.8 cm shaft, sleeves from 65.5 cm out, plates (size[1] diameter, default 45) from 70 cm out.
function barbellMesh(pr) {
  const L = ((pr.size && pr.size[0]) || 220) * U, D = ((pr.size && pr.size[1]) || 45) * U, n = pr.plates ?? 1, st = steelMat();
  const g = new THREE.Group(); g.name = pr.id; g.add(cylX(0.014, 1.31, st));
  const iron = ironMat(pr, PROP_COLOR.barbell);
  for (const sgn of [-1, 1]) {
    const sl = cylX(0.025, L / 2 - 0.655, st); sl.position.x = sgn * (0.655 + (L / 2 - 0.655) / 2); g.add(sl);
    const col = cylX(0.04, 0.03, st); col.position.x = sgn * 0.67; g.add(col);
    for (let i = 0; i < n; i++) { const pl = cylX(D / 2, 0.055, iron, 32); pl.position.x = sgn * (0.715 + i * 0.06); g.add(pl); }
    if (n) { const clamp = cylX(0.035, 0.03, st); clamp.position.x = sgn * (0.7 + n * 0.06); g.add(clamp); }
  }
  return shade(g);
}
// Kettlebell: handle along X at the origin (the grip), bell hanging below along -Y (16 kg: 21 cm bell, 15 cm wide handle)
function kettlebellMesh(pr) {
  const D = ((pr.size && pr.size[1]) || 21) * U, W = ((pr.size && pr.size[0]) || 15) * U, iron = ironMat(pr, PROP_COLOR.kettlebell);
  const g = new THREE.Group(); g.name = pr.id;
  g.add(cylX(0.018, W - 0.02, iron));
  for (const sgn of [-1, 1]) { const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.07, 12), iron); horn.position.set(sgn * (W / 2 - 0.01), -0.035, 0); horn.rotation.z = sgn * 0.25; g.add(horn); }
  const bell = new THREE.Mesh(new THREE.SphereGeometry(D / 2, 28, 20), iron); bell.scale.y = 0.92; bell.position.y = -0.06 - D * 0.42; g.add(bell);
  return shade(g);
}
// Cable attachments: D-handle (one hand), straight bar (two hands, size[0] long, default 50); a rope is drawn as strands
function cableHandleMesh(pr) {
  const st = steelMat(), rub = new THREE.MeshStandardMaterial({ color: 0x23262c, roughness: 0.8 }), g = new THREE.Group(); g.name = pr.id;
  if ((pr.attachment || 'handle') === 'bar') { g.add(cylX(0.015, ((pr.size && pr.size[0]) || 50) * U, st)); return shade(g); }
  if (pr.attachment === 'rope') return g; // strands are lines
  g.add(cylX(0.017, 0.13, rub));
  const tri = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.006, 8, 3, Math.PI * 2), st); tri.rotation.z = Math.PI / 2; tri.position.y = 0.045; g.add(tri);
  return shade(g);
}
function heldMesh(pr) {
  if (pr.kind === 'barbell') return barbellMesh(pr);
  if (pr.kind === 'kettlebell') return kettlebellMesh(pr);
  if (pr.kind === 'cable') return cableHandleMesh(pr);
  if (pr.kind === 'band') { const g = new THREE.Group(); g.name = pr.id; return g; }
  return dumbbellMesh(pr);
}
const isHeld = (pr) => !!(pr.attach && pr.attach.joint);
const HELD_KINDS = new Set(['dumbbell', 'barbell', 'kettlebell', 'cable', 'band']);
const LINE_COLOR = { cable: 0xc9ced6, band: 0x3faa5a, rope: 0x2b2f36 }; // steel cable stands out against the tower and the backdrop
// a unit cylinder (Y up, 1 long) that `setLine` stretches between two points
function lineMesh(pr, r) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 10), new THREE.MeshStandardMaterial({ color: pr.kind === 'band' && pr.color ? new THREE.Color(pr.color) : LINE_COLOR[pr.kind] || 0x30343a, roughness: pr.kind === 'cable' ? 0.35 : 0.7, metalness: pr.kind === 'cable' ? 0.7 : 0 }));
  m.castShadow = true; return m;
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _u = new THREE.Vector3(0, 1, 0);
function stretchTo(m, a, b) { _a.subVectors(b, a); const len = Math.max(1e-4, _a.length()); m.position.copy(a).addScaledVector(_a, 0.5); m.quaternion.setFromUnitVectors(_u, _a.multiplyScalar(1 / len)); m.scale.set(1, len, 1); }
function makeHeldItem(pr) {
  const side = pr.attach.joint.endsWith('_l') ? 'l' : 'r', two = !!pr.attach.with, it = { pr, side, two, mesh: heldMesh(pr), lines: [] };
  const anchored = pr.anchor || pr.anchorJoint, rope = pr.kind === 'cable' && pr.attachment === 'rope';
  if (pr.kind === 'cable' && anchored) it.lines.push(lineMesh(pr, 0.0035));
  if (rope) it.lines.push(lineMesh({ kind: 'rope' }, 0.012), lineMesh({ kind: 'rope' }, 0.012));
  if (pr.kind === 'band') { const r = 0.006; if (anchored) { it.lines.push(lineMesh(pr, r)); if (two) it.lines.push(lineMesh(pr, r)); } else if (two) it.lines.push(lineMesh(pr, r)); }
  return it;
}
let held = [];
const freeGroup = new THREE.Group(); freeGroup.name = 'HeldFree'; scene.add(freeGroup); // two-hand items and lines, metres, scene space
function buildHeld(props) {
  for (const h of held) { h.mesh.removeFromParent(); h.lines.forEach((l) => l.removeFromParent()); }
  held = (props || []).filter((pr) => isHeld(pr) && HELD_KINDS.has(pr.kind)).map(makeHeldItem);
  for (const h of held) { if (h.two) freeGroup.add(h.mesh); h.lines.forEach((l) => freeGroup.add(l)); }
}
// grip amounts per displayed hand
let staticGrip = false; // hands closed on a static bar (pull-up bar)
function gripsFor(mirror, list = held, closeAll = staticGrip) { const g = closeAll ? { r: 1, l: 1 } : {}; for (const h of list) { const sw = (s) => (mirror ? (s === 'r' ? 'l' : 'r') : s); g[sw(h.side)] = 1; if (h.two) g[sw(h.side === 'r' ? 'l' : 'r')] = 1; } return g; }
const GRIP_DEFAULT = { barbell: 'bar', kettlebell: 'handle', cable: 'handle', band: 'handle', dumbbell: 'handle' };
// world position and orientation of the grip point of displayed hand ds
function gripWorld(a, ds, grip, off) {
  const gf = a.gripFrame(ds, grip, off); gf.bone.updateWorldMatrix(true, false);
  const p = gf.bone.localToWorld(gf.pos.clone()), q = gf.bone.getWorldQuaternion(new THREE.Quaternion()).multiply(gf.quatFull);
  return { p, q, gf };
}
// anchor point in scene space (metres): a fixed point in rig space (prop coordinates) or the current position of a rig
// joint, mirrored with the displayed side. rigSpace is the group whose local units are rig cm * U (viewer: world group)
function anchorWorld(pr, W, mirror, rigSpace) {
  const p = pr.anchorJoint && W && W[pr.anchorJoint] ? toV3(W[pr.anchorJoint].p, mirror) : toV3(pr.anchor || [0, 0, 0], mirror);
  rigSpace.updateWorldMatrix(true, false); return rigSpace.localToWorld(p);
}
const _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
// place every held item for this frame. one-hand items are parented to the hand bone; two-hand items and lines are set in
// scene space (or, for the export, in `space` local coordinates)
function placeHeld(a, list, mirror, W, rigSpace = world, space = null, moveOneHand = true) {
  const toSpace = (v) => (space ? space.worldToLocal(v.clone()) : v);
  const spaceQ = space ? space.getWorldQuaternion(new THREE.Quaternion()).invert() : null;
  for (const h of list) {
    const pr = h.pr, grip = pr.attach.grip || GRIP_DEFAULT[pr.kind] || 'handle', ds = mirror ? (h.side === 'r' ? 'l' : 'r') : h.side;
    let attachPts = [];
    if (!h.two && !moveOneHand) { attachPts = [gripWorld(a, ds, grip, pr.attach.offset).p]; }
    else if (!h.two) {
      const gf = a.gripFrame(ds, grip, pr.attach.offset);
      if (h.mesh.parent !== gf.bone) gf.bone.add(h.mesh);
      h.mesh.position.copy(gf.pos); h.mesh.quaternion.copy(pr.kind === 'dumbbell' ? gf.quat : gf.quatFull);
      if (h.lines.length) { h.mesh.updateWorldMatrix(true, false); attachPts = [h.mesh.getWorldPosition(new THREE.Vector3())]; }
    } else {
      const os = ds === 'r' ? 'l' : 'r', g1 = gripWorld(a, ds, grip, pr.attach.offset), g2 = gripWorld(a, os, grip, pr.attach.offset);
      const pR = ds === 'r' ? g1.p : g2.p, pL = ds === 'r' ? g2.p : g1.p, c = pR.clone().add(pL).multiplyScalar(0.5);
      _x.subVectors(pR, pL).normalize();
      if (pr.kind === 'kettlebell') { // the bell hangs past the knuckles of both hands (in line with the arms in a swing)
        const y1 = new THREE.Vector3(0, 1, 0).applyQuaternion(g1.q), y2 = new THREE.Vector3(0, 1, 0).applyQuaternion(g2.q);
        _y.copy(y1).add(y2); _y.addScaledVector(_x, -_y.dot(_x)); if (_y.lengthSq() < 1e-6) _y.set(0, 1, 0); _y.normalize();
      } else _y.set(0, 1, 0).addScaledVector(_x, -_x.y).normalize();
      _z.crossVectors(_x, _y);
      _q.setFromRotationMatrix(_m.makeBasis(_x, _y, _z));
      let pos = c;
      h.mesh.position.copy(toSpace(pos)); h.mesh.quaternion.copy(spaceQ ? spaceQ.clone().multiply(_q) : _q);
      attachPts = [pR, pL]; h._c = c;
    }
    if (!h.lines.length) continue;
    const anc = pr.anchor || pr.anchorJoint ? anchorWorld(pr, W, mirror, rigSpace) : null;
    const rope = pr.kind === 'cable' && pr.attachment === 'rope';
    if (pr.kind === 'cable') {
      const end = h.two ? (rope ? h._c.clone().addScaledVector(anc ? anc.clone().sub(h._c).normalize() : _y, 0.16) : h._c) : attachPts[0];
      let i = 0; if (anc) stretchTo(h.lines[i++], toSpace(anc), toSpace(end));
      if (rope) { stretchTo(h.lines[i++], toSpace(end), toSpace(attachPts[0])); stretchTo(h.lines[i++], toSpace(end), toSpace(attachPts[1])); }
    } else if (pr.kind === 'band') {
      if (anc) { stretchTo(h.lines[0], toSpace(anc), toSpace(attachPts[0])); if (h.two) stretchTo(h.lines[1], toSpace(anc), toSpace(attachPts[1])); }
      else if (h.two) stretchTo(h.lines[0], toSpace(attachPts[0]), toSpace(attachPts[1]));
    }
  }
}

// guides
const guideGroup = new THREE.Group(); world.add(guideGroup);
const pathMat = new THREE.LineDashedMaterial({ dashSize: 0.035, gapSize: 0.03, transparent: true, opacity: 0.9 });
let pathLine = null, pathTop = null;
const dot = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 12), new THREE.MeshBasicMaterial()); guideGroup.add(dot);
const arcLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ transparent: true })); guideGroup.add(arcLine);
const bandMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })); guideGroup.add(bandMesh);
const refLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ dashSize: 0.02, gapSize: 0.02, transparent: true, opacity: 0.6 })); guideGroup.add(refLine);
const gazeLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ dashSize: 0.012, gapSize: 0.02, transparent: true, opacity: 0.6 })); guideGroup.add(gazeLine);
const labels = { path: mkLabel(), arc: mkLabel() };
function mkLabel() { const d = document.createElement('div'); d.className = 'lbl'; $('labels').appendChild(d); return d; }
const toV3 = (p, mirror) => new THREE.Vector3(p[0] * U, p[1] * U, (mirror ? -p[2] : p[2]) * U);
function setLine(line, pts) { line.geometry.dispose(); line.geometry = new THREE.BufferGeometry().setFromPoints(pts); if (line.material.isLineDashedMaterial) line.computeLineDistances(); }

/* ---------------- exercise loading ---------------- */
let pathWorld = [], center = new THREE.Vector3(), radius = 1, halfH = 1;
function loadExercise(i) {
  S.ex = i; EX = EXS[i]; META = EX.exercise; tl = R.buildTimeline(EX); D = tl.duration;
  roleOf = {}; for (const role in META.muscles) for (const id of META.muscles[role]) roleOf[id] = role;
  const g = EX.guides.find((x) => x.kind === 'path');
  pathWorld = [];
  if (g) for (let k = 0; k <= 160; k++) { const t = g.from + ((g.to - g.from) * k) / 160; pathWorld.push(R.evalPose(rig, tl.pose(t), EX.contacts)[g.joint].p); }
  // framing from samples
  const box = new THREE.Box3();
  for (let k = 0; k < 24; k++) { const W = R.evalPose(rig, tl.pose((k / 24) * D), EX.contacts); for (const id in W) box.expandByPoint(toV3(W[id].p, false)); box.expandByPoint(toV3(V.add(W.head_c1.p, [0, 17, 0]), false)); } // joints stop at the skull base: include the top of the head (#74)
  for (const pr of EX.props || []) { if (pr.kind === 'mat' || isHeld(pr)) continue; const c = pr.center || [0, 0, 0], sz = pr.size || [0, 0, 0]; box.expandByPoint(toV3([c[0] - sz[0] / 2, c[1], c[2] - sz[2] / 2], false)); box.expandByPoint(toV3([c[0] + sz[0] / 2, c[1] + sz[1], c[2] + sz[2] / 2], false)); }
  box.getCenter(center).multiplyScalar(A.sLeg); const bs = box.getSize(new THREE.Vector3()); radius = (bs.length() / 2) * A.sLeg; halfH = (bs.y / 2) * A.sLeg;
  const mat = EX.props.find((p) => p.kind === 'mat');
  matMesh.visible = !!mat; if (mat) { matMesh.scale.set(mat.size[0] * U, Math.max(0.004, mat.size[1] * U), mat.size[2] * U); matMesh.position.set(mat.center[0] * U, matMesh.scale.y / 2, mat.center[2] * U); }
  propGroup.clear(); buildProps(EX.props, propGroup); buildHeld(EX.props); staticGrip = (EX.props || []).some((p) => p.kind === 'pullup_bar'); propGroup.scale.z = S.side === 'L' ? -1 : 1;
  S.t = Math.min(S.t, D - 0.01);
  buildPanel(); rebuildGuides(); setCamera(EX.camera.default);
}
function rebuildGuides() {
  const m = S.side === 'L';
  if (pathLine) { guideGroup.remove(pathLine); pathLine.geometry.dispose(); }
  pathLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pathWorld.map((p) => toV3(p, m))), pathMat); pathLine.computeLineDistances(); guideGroup.add(pathLine);
  pathTop = pathWorld.length ? pathWorld.reduce((a, b) => (b[1] > a[1] ? b : a)) : null;
  center.z = 0;
}
function setCamera(preset) {
  S.cam = preset; const p = EX.camera.presets[preset]; if (!p) return;
  const yaw = p.yaw * R.DEG, pitch = p.pitch * R.DEG, m = S.side === 'L' ? -1 : 1;
  // fit the whole movement: the old radius-only fit cropped heads and feet on tall, narrow standing poses, so the
  // vertical extent (feet to head top, foreshortened by the pitch) must also fit the vertical field of view
  const tanV = Math.tan((camera.fov * R.DEG) / 2);
  const distR = (radius * 0.82) / Math.sin((camera.fov * R.DEG) / 2) / Math.min(1, Math.max(0.55, camera.aspect));
  const distH = (halfH * Math.cos(pitch) * 1.18) / tanV + radius * 0.35;
  const dist = Math.max(distR, distH);
  const tgt = center.clone(); tgt.y = Math.max(0.25, center.y - 0.03);
  camera.position.set(tgt.x + dist * Math.sin(yaw) * Math.cos(pitch), tgt.y + dist * Math.sin(pitch), tgt.z + m * dist * Math.cos(yaw) * Math.cos(pitch));
  controls.target.copy(tgt); controls.update();
  document.querySelectorAll('#camSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === preset)));
}

// Prescription keys are free-form strings (schema: additionalProperties string). Show whatever an
// exercise provides, in its own order, with friendly labels; join sets and reps when both exist.
const FACT_LABELS = { sets: 'Sets', reps: 'Reps', endRangeHold: 'End-range hold', staticOption: 'Static option', tempo: 'Tempo', rest: 'Rest', work: 'Work', frequency: 'Frequency', volume: 'Volume', boxHeight: 'Box height', holds: 'Holds', dogHold: 'Down dog hold', flow: 'Flow', stopRule: 'Stop when', sessionCap: 'Session cap', timeUnderTension: 'Time under tension', programLength: 'Program length', intensity: 'Intensity', progression: 'Progression', practice: 'Practice', timing: 'Timing' };
function prescriptionFacts(pr = {}) {
  const label = (k) => FACT_LABELS[k] || k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).toLowerCase().replace(/^./, (c) => c.toUpperCase());
  const out = [];
  if (pr.sets != null && pr.reps != null) out.push(['Sets × reps', `${pr.sets} × ${pr.reps}`]);
  for (const [k, v] of Object.entries(pr)) { if ((k === 'sets' || k === 'reps') && pr.sets != null && pr.reps != null) continue; out.push([label(k), v]); }
  return out;
}

/* ---------------- per frame ---------------- */
let lastW = null, lastPose = null;
function update() {
  const pose = tl.pose(S.t), W = R.evalPose(rig, pose, EX.contacts), mirror = S.side === 'L';
  lastW = W; lastPose = pose;
  A.pose(W, mirror, ikWeights(pose, EX), gripsFor(mirror)); placeHeld(A, held, mirror, W);
  // muscles: each shown group glows in its role colour, brighter as it works harder
  const glow = {};
  for (const id in roleOf) { const role = roleOf[id]; if (!(S.show[role] || S.hover === id)) continue; glow[id] = { a: S.hover === id ? 1 : 0.3 + 0.7 * tl.activation(id, S.t), role }; }
  A.setGlow(glow);
  // guides
  guideGroup.visible = S.show.paths;
  const pal = BG[S.bg], col = new THREE.Color(pal.guide);
  pathMat.color.copy(col); dot.material.color.copy(col); arcLine.material.color.copy(col); bandMesh.material.color.copy(col); refLine.material.color.copy(col); gazeLine.material.color.set(pal.ink);
  const g = EX.guides.find((x) => x.kind === 'path');
  dot.visible = !!g && S.t >= g.from && S.t <= g.to; if (g) dot.position.copy(toV3(W[g.joint].p, mirror));
  const meas = R.measures(W), arcG = EX.guides.find((x) => x.kind === 'rotationArc');
  arcLine.visible = bandMesh.visible = refLine.visible = !!arcG;
  if (!arcG) labels.arc.style.display = 'none';
  if (arcG) {
    const ctr = V.scale(V.add(W.shoulder_r.p, W.shoulder_l.p), 0.5), rr = arcG.radius;
    const at = (deg, r) => { const a = deg * R.DEG; return toV3(V.add(ctr, V.add(V.scale(meas.hz, Math.cos(a) * r), V.scale(meas.up, Math.sin(a) * r))), mirror); };
    const cur = meas.shoulderLineIncl, n = Math.max(2, Math.ceil(Math.abs(cur) / 2)), pts = [];
    for (let k = 0; k <= n; k++) pts.push(at((cur * k) / n, rr));
    setLine(arcLine, pts); setLine(refLine, [toV3(ctr, mirror), at(0, rr + 8)]);
    const band = [toV3(ctr, mirror)]; for (let d = arcG.normBand[0]; d <= arcG.normBand[1]; d += 2) band.push(at(d, rr + 6));
    const bg = new THREE.BufferGeometry().setFromPoints(band); const idx = []; for (let k = 1; k < band.length - 1; k++) idx.push(0, k, k + 1); bg.setIndex(idx); bandMesh.geometry.dispose(); bandMesh.geometry = bg;
    placeLabel(labels.arc, at(cur, rr + 14), `${Math.round(Math.abs(cur))}° rotation`);
  }
  const gz = EX.guides.find((x) => x.kind === 'gaze'), ph = tl.phaseAt(S.t);
  gazeLine.visible = !!gz && (ph.id === 'rotate' || ph.id === 'hold');
  if (gazeLine.visible) { const H = W.head_c1, eye = V.add(H.p, Q.rot(H.q, [11, 9, 0])); setLine(gazeLine, [toV3(eye, mirror), toV3(V.add(eye, V.scale(Q.rot(H.q, [1, 0, 0]), 40)), mirror)]); }
  if (pathTop && g) placeLabel(labels.path, toV3(pathTop, mirror), g.label); else labels.path.style.display = 'none';
}
function placeLabel(el, v3, text) {
  if (!S.show.paths) { el.style.display = 'none'; return; }
  const p = world.localToWorld(v3.clone()).project(camera);
  if (p.z > 1) { el.style.display = 'none'; return; }
  el.style.display = 'block'; el.textContent = text;
  const x = (p.x * 0.5 + 0.5) * stage.clientWidth, y = (-p.y * 0.5 + 0.5) * stage.clientHeight;
  el.classList.toggle('r', x > stage.clientWidth * 0.8);
  el.style.left = `${x}px`; el.style.top = `${y}px`;
}
function applyBackdrop() {
  const pal = BG[S.bg]; renderer.setClearColor(pal.clear, 1); floor.material.color.setHex(pal.floor); matMesh.material.color.setHex(pal.mat);
  scene.fog = new THREE.Fog(pal.clear, 6, 11); stage.classList.toggle('light', S.bg === 'light');
}

/* ---------------- glTF export ---------------- */
function bakeClip(ex, a, mirror, fps, grips, extra, onFrame) {
  const tlx = R.buildTimeline(ex), Dx = tlx.duration, n = Math.round(Dx * fps) + 1, times = new Float32Array(n);
  const q = a.bones.map(() => new Float32Array(n * 4)), rootP = new Float32Array(n * 3), iRoot = a.B.indexOf('pelvis');
  for (let k = 0; k < n; k++) {
    const t = Math.min(Dx, k / fps); times[k] = t; const pz = tlx.pose(t);
    const Wz = R.evalPose(rig, pz, ex.contacts);
    a.pose(Wz, mirror, ikWeights(pz, ex), grips ? grips(mirror) : null);
    a.bones.forEach((b, i) => q[i].set([b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w], k * 4));
    if (onFrame) onFrame(k, n, mirror, Wz);
    const p = a.bones[iRoot].position; rootP.set([p.x, p.y, p.z], k * 3);
  }
  const tracks = a.bones.map((b, i) => new THREE.QuaternionKeyframeTrack(`${b.name}.quaternion`, times, q[i]));
  tracks.push(new THREE.VectorKeyframeTrack('pelvis.position', times, rootP));
  if (extra) tracks.push(...extra(mirror));
  return new THREE.AnimationClip(`${ex.exercise.id}_${mirror ? 'left' : 'right'}`, Dx, tracks);
}
async function exportGLB(i) {
  const ex = EXS[i], a = makeAthlete(A.key);
  a.mesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(a.exportColors(), 3));
  for (const k of ['aCloth', 'aMisc', 'aRest', 'aGlow']) a.mesh.geometry.deleteAttribute(k); // shader-only data
  a.mesh.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0, name: 'reprig_body' });
  const armature = new THREE.Group(); armature.name = 'Armature';
  armature.rotation.y = -Math.PI / 2; // figure faces +X in rig space; glTF convention faces +Z
  armature.add(a.mesh); armature.userData = { rig: RIG.rigId, character: RR_DATA.character.id, exercise: ex.exercise.id, units: 'meters', note: 'Clips: <id>_right, <id>_left. Generated by RepRig.' };
  const p0 = R.buildTimeline(ex).pose(0); a.pose(R.evalPose(rig, p0, ex.contacts), false, ikWeights(p0, ex));
  const props = new THREE.Group(); props.name = 'Props'; props.scale.setScalar(a.sLeg); armature.add(props);
  const oneSided = ex.exercise.authoredSide !== 'bilateral';
  // static props; on one-sided exercises a prop off the midline gets a mirrored twin and each clip shows only its own copy
  const lopsided = (pr) => !isHeld(pr) && pr.kind !== 'mat' && ((pr.center && Math.abs(pr.center[2]) > 0.01) || (pr.anchor && Math.abs(pr.anchor[2]) > 0.01) || pr.rotY);
  const statics = (ex.props || []).filter((pr) => !isHeld(pr));
  buildProps(statics, props);
  const twins = oneSided ? statics.filter(lopsided) : [];
  if (twins.length) {
    const mz = (v) => (v ? [v[0], v[1], -v[2]] : v);
    buildProps(twins.map((pr) => ({ ...pr, id: `${pr.id}_left`, center: mz(pr.center), anchor: mz(pr.anchor), rotY: pr.rotY ? -pr.rotY : pr.rotY })), props);
    for (const pr of twins) { const o = props.getObjectByName(pr.id); if (o) o.name = `${pr.id}_right`; }
  }
  // held items: one-hand items ride on the hand bones (static parenting; the clips move them); one-sided exercises get a
  // mirrored copy in the other hand. Two-hand items and cable / band lines are separate nodes with baked tracks per clip.
  const items = (ex.props || []).filter((pr) => isHeld(pr) && HELD_KINDS.has(pr.kind)).map(makeHeldItem);
  const oneHand = items.filter((h) => !h.two), freeItems = items.filter((h) => h.two || h.lines.length);
  placeHeld(a, oneHand.map((h) => ({ ...h, lines: [] })), false, null, props);
  const heldM = oneSided ? oneHand.map((h) => ({ ...h, mesh: heldMesh(h.pr), lines: [] })) : [];
  if (oneSided) { oneHand.forEach((h) => { h.mesh.name = `${h.pr.id}_right`; }); heldM.forEach((h) => { h.mesh.name = `${h.pr.id}_left`; }); }
  placeHeld(a, heldM, true, null, props);
  const freeNodes = [];
  for (const h of freeItems) { if (h.two) { armature.add(h.mesh); freeNodes.push(h.mesh); } h.lines.forEach((l, i) => { l.name = `${h.pr.id}_line${i}`; armature.add(l); freeNodes.push(l); }); }
  const visTracks = (mirror) => {
    const pairs = [];
    if (heldM.length) pairs.push(...oneHand.map((h) => [h.mesh.name, mirror ? 0 : 1]), ...heldM.map((h) => [h.mesh.name, mirror ? 1 : 0]));
    for (const pr of twins) pairs.push([`${pr.id}_right`, mirror ? 0 : 1], [`${pr.id}_left`, mirror ? 1 : 0]);
    return pairs.map(([nm, v]) => new THREE.VectorKeyframeTrack(`${nm}.scale`, [0], [v, v, v]));
  };
  const gripsX = (mirror) => gripsFor(mirror, items, (ex.props || []).some((p) => p.kind === 'pullup_bar'));
  armature.updateMatrixWorld(true);
  // per-frame placement of the free nodes, recorded per clip
  const rec = {};
  const onFrame = freeNodes.length ? (k, n, mirror, Wz) => {
    const key = mirror ? 'L' : 'R';
    if (k === 0) rec[key] = { times: new Float32Array(n), data: freeNodes.map(() => ({ p: new Float32Array(n * 3), q: new Float32Array(n * 4), s: new Float32Array(n * 3) })) };
    armature.updateMatrixWorld(true);
    placeHeld(a, freeItems, mirror, Wz, props, armature, false);
    freeNodes.forEach((nd, i) => { const d = rec[key].data[i]; d.p.set([nd.position.x, nd.position.y, nd.position.z], k * 3); d.q.set([nd.quaternion.x, nd.quaternion.y, nd.quaternion.z, nd.quaternion.w], k * 4); d.s.set([nd.scale.x, nd.scale.y, nd.scale.z], k * 3); });
  } : null;
  const extra = (mirror) => {
    const out = visTracks(mirror), r = rec[mirror ? 'L' : 'R'];
    if (r) { const fpsT = (k) => k / 30; const n = r.data.length ? r.data[0].p.length / 3 : 0, times = new Float32Array(n); const D0 = R.buildTimeline(ex).duration; for (let k = 0; k < n; k++) times[k] = Math.min(D0, fpsT(k));
      freeNodes.forEach((nd, i) => { const d = r.data[i]; out.push(new THREE.VectorKeyframeTrack(`${nd.name}.position`, times, d.p), new THREE.QuaternionKeyframeTrack(`${nd.name}.quaternion`, times, d.q), new THREE.VectorKeyframeTrack(`${nd.name}.scale`, times, d.s)); }); }
    return out;
  };
  const clips = !oneSided ? [bakeClip(ex, a, false, 30, gripsX, extra, onFrame)] : [bakeClip(ex, a, false, 30, gripsX, extra, onFrame), bakeClip(ex, a, true, 30, gripsX, extra, onFrame)];
  if (clips.length === 1) clips[0].name = ex.exercise.id;
  const buf = await new GLTFExporter().parseAsync(armature, { binary: true, animations: clips });
  a.mesh.geometry.dispose();
  return buf;
}

/* ---------------- UI ---------------- */
const fmt = (v) => `${v >= 0 ? '' : '−'}${Math.abs(v).toFixed(0)}°`;
const sideWord = (id) => { const s = id.endsWith('_r') ? 'right' : id.endsWith('_l') ? 'left' : ''; return !s ? '' : S.side === 'L' ? (s === 'right' ? 'left' : 'right') : s; };
const muscleName = (id) => { const m = rig.muscles.find((x) => x.id === id); const w = sideWord(id); return m ? m.name + (w ? ` (${w})` : '') : id; };
function seg(el, items, cur, onPick) {
  el.innerHTML = items.map(([v, l]) => `<button type="button" data-v="${esc(v)}" aria-pressed="${String(v) === String(cur)}">${esc(l)}</button>`).join('');
  el.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; el.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); onPick(b.dataset.v); };
}
function buildStatic() {
  seg($('exSeg'), EXS.map((e, i) => [i, `${String.fromCharCode(65 + i)} · ${e.exercise.name}`]), S.ex, (v) => { loadExercise(+v); remember(); });
  seg($('speed'), [['0.5', '0.5×'], ['1', '1.0×'], ['1.5', '1.5×']], S.speed, (v) => { S.speed = +v; });
  seg($('sideSeg'), [['L', 'Left'], ['R', 'Right']], S.side, (v) => { S.side = v; propGroup.scale.z = v === 'L' ? -1 : 1; rebuildGuides(); setCamera(S.cam); $('sideTag').textContent = sideLabel(); renderAnatomy(); });
  seg($('bgSeg'), [['dark', 'Dark'], ['light', 'Light']], S.bg, (v) => { S.bg = v; applyBackdrop(); remember(); });
  const tg = [['target', ROLE_LABEL.target, '#e53e3a'], ['synergist', ROLE_LABEL.synergist, '#f2a91e'], ['stabilizer', ROLE_LABEL.stabilizer, '#3b8fe0'], ['lengthened', ROLE_LABEL.lengthened, '#9a63e8'], ['paths', 'Path guides', '#16b3a3'], ['angles', 'Angles', '#78808c']];
  $('toggles').innerHTML = tg.map(([k, l, c]) => `<button type="button" class="chip" data-k="${k}" style="--c:${c}" aria-pressed="${S.show[k]}"><i></i>${esc(l)}</button>`).join('');
  $('toggles').onclick = (e) => { const b = e.target.closest('.chip'); if (!b) return; const k = b.dataset.k; S.show[k] = !S.show[k]; b.setAttribute('aria-pressed', String(S.show[k])); $('hud').classList.toggle('off', !S.show.angles); remember(); };
  $('hud').classList.toggle('off', !S.show.angles);
  const tabs = [['form', 'Form'], ['anatomy', 'Anatomy'], ['kin', 'Kinematics'], ['json', 'Rig JSON'], ['src', 'Sources']];
  $('tabs').innerHTML = tabs.map(([k, l], i) => `<button role="tab" type="button" id="tab-${k}" aria-controls="p-${k}" aria-selected="${i === 0}">${esc(l)}</button>`).join('');
  const pick = (k) => tabs.forEach(([x]) => { $(`tab-${x}`).setAttribute('aria-selected', String(x === k)); $(`p-${x}`).classList.toggle('on', x === k); });
  $('tabs').onclick = (e) => { const b = e.target.closest('button'); if (b) pick(b.id.slice(4)); };
  pick('form');
  seg($('jsonSeg'), [['module', 'Exercise module'], ['rig', 'Shared rig'], ['schema', 'JSON Schema']], 'module', (v) => renderJSON(v));
}
const sideLabel = () => (META.authoredSide === 'bilateral' ? `Both sides · ${S.side === 'R' ? 'right' : 'left'} view` : `${S.side === 'R' ? 'Right' : 'Left'} side`);
function buildPanel() {
  $('title').textContent = META.name;
  $('sideTag').textContent = sideLabel();
  $('meta').innerHTML = [META.type, META.bodyPart, META.equipment[0], META.difficulty, `${META.plane} plane`].map((x) => `<span class="tag">${esc(x)}</span>`).join('');
  const ref = META.reference;
  $('ref').innerHTML = `Movement reference: <a href="${esc(ref.url)}" target="_blank" rel="noopener">${esc(ref.source)}${ref.productRef ? ` #${esc(ref.productRef)}` : ''}</a>. Rig, model and motion here are original.`;
  const pr = META.prescription;
  $('facts').innerHTML = prescriptionFacts(pr).concat([['Equipment', META.equipment.join(', ')], ['Laterality', META.laterality]]).filter(([, v]) => v != null && v !== '').map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
  $('breathing').innerHTML = `<b>Breathing.</b> ${esc(META.breathing.pattern)}`;
  $('phasebar').innerHTML = EX.timeline.phases.map((p) => `<div data-ph="${esc(p.id)}" style="width:calc(${((p.end - p.start) / D) * 100}% - 2px)" title="${esc(p.label)}">${esc(p.label)}</div>`).join('');
  $('cues').innerHTML = META.cues.map((c, i) => { const ph = EX.timeline.phases.find((p) => p.id === c.phase); return `<li data-ph="${esc(c.phase)}"><b>${i + 1}. ${esc(ph ? ph.label : c.phase)}</b><span>${esc(c.text)}</span>${ph ? `<small>${esc(ph.breath === 'natural' ? 'Breathe normally' : ph.breath[0].toUpperCase() + ph.breath.slice(1))} · ${(ph.end - ph.start).toFixed(1)} s at 1.0×</small>` : ''}</li>`; }).join('');
  $('cues').onclick = (e) => { const li = e.target.closest('li'); const ph = li && EX.timeline.phases.find((p) => p.id === li.dataset.ph); if (ph) { S.t = ph.start + 0.01; syncUI(true); } };
  $('mist').innerHTML = META.mistakes.map((m) => `<li><b>${esc(m.mistake)}</b><span>${esc(m.fix)}</span></li>`).join('');
  const sf = META.safety || {}, sfRows = [['Cautions', sf.cautions], ['Modify if', sf.modify], ['Easier', sf.regressions], ['Harder', sf.progressions]].filter(([, v]) => v && v.length);
  $('safety').innerHTML = sfRows.length ? `<h3>Safety and options</h3><ul class="mist">${sfRows.map(([k, v]) => `<li><b>${esc(k)}</b><span>${v.map(esc).join(' ')}</span></li>`).join('')}</ul>` : '';
  renderAnatomy();
  $('kin').innerHTML = `<thead><tr><th>Measure</th><th>Setup</th><th>Peak</th><th>Live</th><th>Reference range</th></tr></thead><tbody>${META.kinematics.map((k) => `<tr><td>${esc(k.measure)}</td><td>${esc(k.setup)}</td><td>${esc(k.peak)}</td><td class="live" data-m="${esc(k.measure)}">–</td><td>${esc(k.norm || '')}</td></tr>`).join('')}</tbody>`;
  $('kinNote').textContent = 'Live values come from the rig at the current frame. Rotation is positive toward the working side.';
  $('src').innerHTML = META.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join('');
  renderJSON(jsonCur); curPhase = null;
}
function renderAnatomy() {
  $('anat').innerHTML = Object.keys(ROLE_LABEL).map((role) => `<h3>${ROLE_LABEL[role]}</h3><ul class="mus">${(META.muscles[role] || []).map((id) => `<li tabindex="0" data-id="${esc(id)}" style="--c:#${ROLE[role].toString(16).padStart(6, '0')}"><i></i><span>${esc(muscleName(id))}</span>${META.muscleNotes && META.muscleNotes[id] ? `<small>${esc(META.muscleNotes[id])}</small>` : ''}</li>`).join('')}</ul>`).join('');
  $('anat').onmouseover = (e) => { const li = e.target.closest('li'); if (li) S.hover = li.dataset.id; };
  $('anat').onmouseleave = () => { S.hover = null; };
  $('anat').onfocusin = (e) => { const li = e.target.closest('li'); if (li) S.hover = li.dataset.id; };
  $('anat').onfocusout = () => { S.hover = null; };
}
let jsonCur = 'module';
const JSON_FILE = { module: () => JSON.stringify(EX, null, 2), rig: () => JSON.stringify(RIG, null, 2), schema: () => JSON.stringify(SCHEMA, null, 2) };
const JSON_NAME = { module: () => `${META.id}.json`, rig: () => `${RIG.rigId}.json`, schema: () => 'exercise-module.schema.json' };
const JSON_NOTE = { module: 'One file per exercise: metadata, phases, named poses (anatomical joint angles), keyframes, IK contacts, muscle activation and guides. Validates against the schema tab.', rig: 'Shared by every exercise: joint hierarchy, segment lengths, body shapes, palette and muscle regions. Bilateral items are authored once and mirrored.', schema: 'JSON Schema (draft 2020-12) for exercise modules. Hand it to the batch prompt so each new exercise comes back in this shape.' };
function renderJSON(k) { jsonCur = k; $('jsonPre').textContent = JSON_FILE[k](); $('jsonNote').textContent = JSON_NOTE[k]; }

let dl = null;
try { const u = window.claude && window.claude.use && window.claude.use('downloads'); if (u && u.then) u.then((d) => { dl = d; }).catch(() => {}); } catch (e) {}
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2600); }
async function copy(text, what) { try { await navigator.clipboard.writeText(text); toast(`Copied ${what}`); } catch (e) { toast('Copy was blocked by the browser'); } }
async function save(name, data) { if (!dl) return false; try { await dl.save({ filename: name, data }); toast(`Saved ${name}`); } catch (e) { toast('Download cancelled'); } return true; }
$('copyJson').onclick = () => copy(JSON_FILE[jsonCur](), JSON_NAME[jsonCur]());
$('dlJson').onclick = async () => { if (!(await save(JSON_NAME[jsonCur](), JSON_FILE[jsonCur]()))) copy(JSON_FILE[jsonCur](), `${JSON_NAME[jsonCur]()} (downloads unavailable here)`); };
$('exPng').onclick = () => { renderer.render(scene, camera); canvas.toBlob(async (b) => { const name = `${META.id}-${S.side}-${S.t.toFixed(2)}s.png`; if (!(await save(name, b))) { $('modalImg').src = URL.createObjectURL(b); $('modal').classList.add('on'); } }, 'image/png'); };
$('exGlb').onclick = async () => { toast('Building GLB…'); const buf = await exportGLB(S.ex); const ok = await save(`${META.id}.glb`, new Blob([buf], { type: 'model/gltf-binary' })); if (!ok) toast('Downloads are not available in this view. The repo has the GLB in exports/.'); };
$('modalClose').onclick = () => $('modal').classList.remove('on');
const ICON = { play: '<path d="M6 3.5v13l11-6.5z" fill="currentColor"/>', pause: '<rect x="4.5" y="3.5" width="4" height="13" rx="1" fill="currentColor"/><rect x="11.5" y="3.5" width="4" height="13" rx="1" fill="currentColor"/>' };
function setPlaying(p) { S.playing = p; $('playIcon').innerHTML = p ? ICON.pause : ICON.play; $('play').setAttribute('aria-label', p ? 'Pause' : 'Play'); }
$('play').onclick = () => setPlaying(!S.playing);
let wasPlaying = false;
$('scrub').addEventListener('pointerdown', () => { wasPlaying = S.playing; setPlaying(false); });
$('scrub').addEventListener('input', (e) => { S.t = (e.target.value / 1000) * D; syncUI(true); });
$('scrub').addEventListener('change', () => { if (wasPlaying) setPlaying(true); });
stage.addEventListener('dblclick', () => setCamera(S.cam));
controls.addEventListener('start', () => document.querySelectorAll('#camSeg button').forEach((b) => b.setAttribute('aria-pressed', 'false')));
window.addEventListener('keydown', (e) => {
  if (e.target.closest('input,textarea,[contenteditable]') && e.target.id !== 'scrub') return;
  if (e.code === 'Space') { e.preventDefault(); setPlaying(!S.playing); }
  else if (e.key === 'ArrowRight' && e.target.id !== 'scrub') { setPlaying(false); S.t = (S.t + 1 / 60) % D; syncUI(true); }
  else if (e.key === 'ArrowLeft' && e.target.id !== 'scrub') { setPlaying(false); S.t = (S.t - 1 / 60 + D) % D; syncUI(true); }
});

let curPhase = null, hudT = 0;
function syncUI(force) {
  const sc = $('scrub'); sc.value = Math.round((S.t / D) * 1000); sc.style.setProperty('--p', `${(S.t / D) * 100}%`);
  $('time').textContent = `${S.t.toFixed(1)} / ${D.toFixed(1)} s`;
  const ph = tl.phaseAt(S.t);
  if (ph !== curPhase) {
    curPhase = ph; $('phLabel').textContent = ph.label;
    $('breathTxt').textContent = ph.breath === 'natural' ? 'Breathe' : ph.breath[0].toUpperCase() + ph.breath.slice(1);
    document.querySelectorAll('#phasebar div').forEach((d) => d.classList.toggle('on', d.dataset.ph === ph.id));
    document.querySelectorAll('#cues li').forEach((li) => li.classList.toggle('on', li.dataset.ph === ph.id));
  }
  const k = (S.t - ph.start) / (ph.end - ph.start);
  $('breath').style.setProperty('--bs', (ph.breath === 'inhale' ? 0.75 + 0.5 * k : ph.breath === 'exhale' ? 1.25 - 0.5 * k : 1).toFixed(3));
  const now = performance.now();
  if ((force || now - hudT > 90) && lastW) { hudT = now; updateHUD(); }
}
function updateHUD() {
  const ch = lastPose.ch, m = R.measures(lastW), sideL = S.side === 'R' ? 'L' : 'R', g = (j, c) => (ch[j] && ch[j][c]) || 0;
  const kneeL = 180 - V.angle(V.sub(lastW.hip_l.p, lastW.knee_l.p), V.sub(lastW.ankle_l.p, lastW.knee_l.p));
  const trunk = V.angle(V.sub(lastW.neck_c7.p, lastW.pelvis.p), [0, 1, 0]);
  const travel = V.len(V.sub(lastW.pelvis.p, R.evalPose(rig, tl.pose(0), EX.contacts).pelvis.p));
  const rotation = EX.guides.some((x) => x.kind === 'rotationArc');
  const rows = rotation
    ? [['Thoracic rotation', g('spine_t12', 'rot') + g('spine_t6', 'rot')], ['Lumbar rotation', g('spine_l5', 'rot')], ['Shoulder-line tilt', m.shoulderLineIncl], ['Neck rotation', g('neck_c7', 'rot') + g('head_c1', 'rot')], [`Support elbow (${sideL})`, m.elbowL], ['Hips / knees', `${Math.round(g('hip_r', 'flex'))}° / ${Math.round(m.knee)}°`]]
    : [['Knee flexion R / L', `${Math.round(S.side === 'L' ? kneeL : m.knee)}° / ${Math.round(S.side === 'L' ? m.knee : kneeL)}°`], ['Hip flexion R / L', `${Math.round(g(S.side === 'L' ? 'hip_l' : 'hip_r', 'flex'))}° / ${Math.round(g(S.side === 'L' ? 'hip_r' : 'hip_l', 'flex'))}°`], ['Trunk from vertical', trunk], ['Spine flexion', g('spine_l5', 'flex') + g('spine_t12', 'flex') + g('spine_t6', 'flex')], ['Travel', `${Math.round(travel)} cm`]];
  $('hud').innerHTML = rows.map(([l, v]) => `<span>${esc(l)}</span><em>${typeof v === 'string' ? esc(v) : fmt(v)}</em>`).join('');
  const live = { 'Thoracic rotation (T12–T1)': ch.spine_t12.rot + ch.spine_t6.rot, 'Lumbar rotation (L5–S1 to T12)': ch.spine_l5.rot, 'Total trunk rotation': ch.spine_l5.rot + ch.spine_t12.rot + ch.spine_t6.rot, 'Cervical rotation toward reaching hand': ch.neck_c7.rot + ch.head_c1.rot, Hips: ch.hip_r.flex, Knees: m.knee, 'Support elbow': m.elbowL };
  document.querySelectorAll('#kin td.live').forEach((td) => { const v = live[td.dataset.m]; td.textContent = v == null ? '–' : fmt(v); });
}
function resize() { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
const roStage = new ResizeObserver(() => { resize(); setCamera(S.cam); });

let last = performance.now(), fpsE = 60, fpsT = 0;
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000); last = now; if (dt > 0) fpsE = fpsE * 0.92 + (1 / dt) * 0.08;
  S.clock += dt;
  if (S.playing) S.t = (S.t + dt * S.speed) % D;
  update(); controls.update(); renderer.render(scene, camera); syncUI(false);
  if (now - fpsT > 500) { fpsT = now; $('fps').textContent = `${Math.round(fpsE)} fps`; }
  requestAnimationFrame(frame);
}
if (stage.clientWidth < 600) S.show.angles = false;
buildStatic(); applyBackdrop(); resize(); loadExercise(S.ex); roStage.observe(stage);
setPlaying(!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
$('loading').remove(); syncUI(true); requestAnimationFrame(frame);
window.__rr = { S, R, rig, exportGLB, setAthlete, get athlete() { return A; },
  // test/review hook: aim the camera at a world point (metres) from a position and render
  lookAt: (pos, tgt) => { camera.position.set(...pos); controls.target.set(...tgt); controls.update(); camera.lookAt(...tgt); renderer.render(scene, camera); },
  handPos: (s) => { const b = A.bones[A.B.indexOf('hand_' + s)], v = new THREE.Vector3(); b.getWorldPosition(v); return v.toArray(); }, load: loadExercise, setT: (t) => { S.t = t; update(); renderer.render(scene, camera); syncUI(true); }, setCam: setCamera, measures: (t) => R.measures(R.evalPose(rig, tl.pose(t), EX.contacts)), get tl() { return tl; }, get EX() { return EX; } };
