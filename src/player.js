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
const S = { ex: 0, t: 3.4, playing: true, speed: 1, side: 'R', cam: 'threeQuarter', bg: 'dark', hover: null, show: { target: true, synergist: true, stabilizer: false, lengthened: false, paths: true, angles: true } };
try { const v = JSON.parse(localStorage.getItem('reprig3d') || '{}'); if (v.bg) S.bg = v.bg; if (v.show) Object.assign(S.show, v.show); if (Number.isInteger(v.ex) && EXS[v.ex]) S.ex = v.ex; } catch (e) {}
const remember = () => { try { localStorage.setItem('reprig3d', JSON.stringify({ bg: S.bg, show: S.show, ex: S.ex })); } catch (e) {} };
let EX, META, tl, D, roleOf;

/* ---------------- figure: skinned mesh built from the rig's shapes ---------------- */
function smooth(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function buildFigure(withMuscles) {
  const bones = {}, list = [];
  for (const j of rig.joints) {
    const b = new THREE.Bone(); b.name = j.id;
    if (j.parent) { b.position.set(j.offset[0] * U, j.offset[1] * U, j.offset[2] * U); bones[j.parent].add(b); }
    bones[j.id] = b; list.push(b);
  }
  const rest = R.evalPose(rig, { root: { pos: [0, 0, 0] }, ch: {} });
  const bi = Object.fromEntries(list.map((b, i) => [b.name, i]));
  const pal = Object.fromEntries(Object.entries(RIG.palette).map(([k, v]) => [k, new THREE.Color(v)]));
  pal.body = pal.skin;
  const P = [], N = [], C = [], SI = [], SW = [], I = [];
  const push = (p, n, col, idx, w) => { P.push(p[0] * U, p[1] * U, p[2] * U); N.push(...n); C.push(col.r, col.g, col.b); SI.push(idx[0], idx[1] ?? 0, idx[2] ?? 0, 0); SW.push(w[0], w[1] ?? 0, w[2] ?? 0, 0); };
  const sphere = new THREE.SphereGeometry(1, 28, 18);
  for (const s of rig.shapes) {
    const base = P.length / 3;
    if (s.kind === 'ellipsoid') {
      const o = rest[s.joint].p, pa = sphere.attributes.position, col = pal[s.tone] || pal.skin;
      for (let i = 0; i < pa.count; i++) {
        const u = [pa.getX(i), pa.getY(i), pa.getZ(i)];
        const p = [o[0] + s.c[0] + u[0] * s.r[0], o[1] + s.c[1] + u[1] * s.r[1], o[2] + s.c[2] + u[2] * s.r[2]];
        push(p, V.norm([u[0] / s.r[0], u[1] / s.r[1], u[2] / s.r[2]]), col, [bi[s.joint]], [1]);
      }
      const ix = sphere.index.array; for (let i = 0; i < ix.length; i++) I.push(base + ix[i]);
    } else {
      const F = rest[s.from].p, T = rest[s.to].p, ax = V.sub(T, F), Lc = V.len(ax), [r0, r1] = s.r;
      const prof = [];
      for (let k = 0; k <= 6; k++) { const a = -Math.PI / 2 + (k / 6) * (Math.PI / 2); prof.push(new THREE.Vector2(Math.max(1e-3, r0 * Math.cos(a)), r0 * Math.sin(a))); }
      for (let k = 1; k < 8; k++) { const t = k / 8; prof.push(new THREE.Vector2(r0 + (r1 - r0) * t, Lc * t)); }
      for (let k = 0; k <= 6; k++) { const a = (k / 6) * (Math.PI / 2); prof.push(new THREE.Vector2(Math.max(1e-3, r1 * Math.cos(a)), Lc + r1 * Math.sin(a))); }
      const g = new THREE.LatheGeometry(prof, 24); g.computeVertexNormals();
      const qa = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...V.norm(ax)));
      const pa = g.attributes.position, na = g.attributes.normal, v = new THREE.Vector3(), nv = new THREE.Vector3();
      const parent = rig.byId[s.from].parent, fi = bi[s.from], ti = bi[s.to], pi = parent ? bi[parent] : fi;
      for (let i = 0; i < pa.count; i++) {
        v.set(pa.getX(i), pa.getY(i), pa.getZ(i)); const t = v.y / Lc; v.applyQuaternion(qa);
        nv.set(na.getX(i), na.getY(i), na.getZ(i)).applyQuaternion(qa);
        const wT = smooth(0.6, 1.05, t) * 0.5, wP = (1 - smooth(-0.05, 0.28, t)) * 0.3;
        const col = s.split && t < s.split.until ? pal[s.split.tone] : pal[s.tone] || pal.skin;
        push([F[0] + v.x, F[1] + v.y, F[2] + v.z], [nv.x, nv.y, nv.z], col, [fi, ti, pi], [1 - wT - wP, wT, wP]);
      }
      const ix = g.index.array; for (let i = 0; i < ix.length; i++) I.push(base + ix[i]);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4));
  geo.setIndex(I);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0 });
  mat.name = 'reprig_body';
  const mesh = new THREE.SkinnedMesh(geo, mat); mesh.name = 'Body'; mesh.castShadow = true; mesh.receiveShadow = true;
  const skeleton = new THREE.Skeleton(list);
  mesh.add(bones.pelvis); mesh.bind(skeleton);
  const muscles = [];
  if (withMuscles) {
    for (const m of rig.muscles) for (const part of m.parts) {
      const mm = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6, transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, roughness: 0.5 }));
      mm.position.set(part.c[0] * U, part.c[1] * U, part.c[2] * U); mm.scale.set(part.r[0] * U * 1.03, part.r[1] * U * 1.03, part.r[2] * U * 1.03);
      mm.renderOrder = 2; mm.visible = false; mm.userData.muscle = m.id;
      bones[part.joint].add(mm); muscles.push(mm);
    }
  }
  return { mesh, bones, list, skeleton, muscles };
}
function localQuats(W, mirror) {
  const out = {};
  for (const j of rig.joints) {
    const src = mirror ? PARTNER(j.id) : j.id;
    let lq = j.parent ? Q.mul(Q.conj(W[mirror ? PARTNER(j.parent) : j.parent].q), W[src].q) : W[src].q;
    if (mirror) lq = Q.mirrorZ(lq);
    out[j.id] = lq;
  }
  const p = W.pelvis.p; out.__root = [p[0] * U, p[1] * U, (mirror ? -p[2] : p[2]) * U];
  return out;
}
function applyLocal(fig, L) {
  for (const j of rig.joints) { const q = L[j.id]; fig.bones[j.id].quaternion.set(q[1], q[2], q[3], q[0]); }
  fig.bones.pelvis.position.set(...L.__root);
}

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
const matMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.85 })); matMesh.receiveShadow = true; scene.add(matMesh);
const fig = buildFigure(true); scene.add(fig.mesh);
const propGroup = new THREE.Group(); propGroup.name = 'Props'; scene.add(propGroup);
const PROP_COLOR = { box: 0x8a6f52, cone: 0xff7a1a, stick: 0xe8c547, ladder: 0xf2d230, hurdle: 0xe0483e, bench: 0x3a3f48, dumbbell: 0x2b2f36, kettlebell: 0x2b2f36 };
// Equipment from the module's props list (the mat is drawn separately). Units: cm in, metres out.
function buildProps(props, group) {
  for (const pr of props || []) {
    if (pr.kind === 'mat') continue;
    const [cx, cy, cz] = (pr.center || [0, 0, 0]).map((v) => v * U), [sx, sy, sz] = (pr.size || [30, 30, 30]).map((v) => v * U);
    const mat = new THREE.MeshStandardMaterial({ color: pr.color ? new THREE.Color(pr.color) : PROP_COLOR[pr.kind] || 0x888888, roughness: 0.7 });
    let m;
    if (pr.kind === 'cone') { m = new THREE.Mesh(new THREE.ConeGeometry(sx / 2, sy, 24), mat); m.position.set(cx, cy + sy / 2, cz); }
    else if (pr.kind === 'stick') { m = new THREE.Mesh(new THREE.CylinderGeometry(sy / 2, sy / 2, sx, 12), mat); m.rotation.z = Math.PI / 2; m.position.set(cx, cy + sy / 2, cz); }
    else if (pr.kind === 'hurdle') { m = new THREE.Group(); const bar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, sz), mat); bar.position.y = sy; m.add(bar); for (const z of [-sz / 2, sz / 2]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.02, sy, 0.02), mat); leg.position.set(0, sy / 2, z); m.add(leg); } m.position.set(cx, cy, cz); }
    else if (pr.kind === 'ladder') { m = new THREE.Group(); const n = Math.max(2, Math.round(sx / 0.45)); for (const z of [-sz / 2, sz / 2]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.006, 0.025), mat); rail.position.set(0, 0.003, z); m.add(rail); } for (let i = 0; i <= n; i++) { const rung = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.006, sz), mat); rung.position.set(-sx / 2 + (i * sx) / n, 0.003, 0); m.add(rung); } m.position.set(cx, cy, cz); }
    else { m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat); m.position.set(cx, cy + sy / 2, cz); }
    if (pr.rotY) m.rotation.y = pr.rotY * R.DEG;
    m.name = pr.id; m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    group.add(m);
  }
}

// guides
const guideGroup = new THREE.Group(); scene.add(guideGroup);
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
let pathWorld = [], center = new THREE.Vector3(), radius = 1;
function loadExercise(i) {
  S.ex = i; EX = EXS[i]; META = EX.exercise; tl = R.buildTimeline(EX); D = tl.duration;
  roleOf = {}; for (const role in META.muscles) for (const id of META.muscles[role]) roleOf[id] = role;
  const g = EX.guides.find((x) => x.kind === 'path');
  pathWorld = [];
  if (g) for (let k = 0; k <= 160; k++) { const t = g.from + ((g.to - g.from) * k) / 160; pathWorld.push(R.evalPose(rig, tl.pose(t), EX.contacts)[g.joint].p); }
  // framing from samples
  const box = new THREE.Box3();
  for (let k = 0; k < 24; k++) { const W = R.evalPose(rig, tl.pose((k / 24) * D), EX.contacts); for (const id in W) box.expandByPoint(toV3(W[id].p, false)); }
  box.getCenter(center); radius = box.getSize(new THREE.Vector3()).length() / 2;
  const mat = EX.props.find((p) => p.kind === 'mat');
  matMesh.visible = !!mat; if (mat) { matMesh.scale.set(mat.size[0] * U, Math.max(0.004, mat.size[1] * U), mat.size[2] * U); matMesh.position.set(mat.center[0] * U, matMesh.scale.y / 2, mat.center[2] * U); }
  propGroup.clear(); buildProps(EX.props, propGroup); propGroup.scale.z = S.side === 'L' ? -1 : 1;
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
  const dist = (radius * 0.82) / Math.sin((camera.fov * R.DEG) / 2) / Math.min(1, Math.max(0.55, camera.aspect));
  const tgt = center.clone(); tgt.y = Math.max(0.25, center.y - 0.03);
  camera.position.set(tgt.x + dist * Math.sin(yaw) * Math.cos(pitch), tgt.y + dist * Math.sin(pitch), tgt.z + m * dist * Math.cos(yaw) * Math.cos(pitch));
  controls.target.copy(tgt); controls.update();
  document.querySelectorAll('#camSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === preset)));
}

/* ---------------- per frame ---------------- */
let lastW = null, lastPose = null;
function update() {
  const pose = tl.pose(S.t), W = R.evalPose(rig, pose, EX.contacts), mirror = S.side === 'L';
  lastW = W; lastPose = pose;
  applyLocal(fig, localQuats(W, mirror));
  // muscles
  for (const mm of fig.muscles) {
    const id = mm.userData.muscle, role = roleOf[id], on = role && (S.show[role] || S.hover === id);
    mm.visible = !!on;
    if (on) { const a = Math.max(tl.activation(id, S.t), S.hover === id ? 1 : 0); mm.material.color.setHex(ROLE[role]); mm.material.emissive.setHex(ROLE[role]); mm.material.emissiveIntensity = 0.15 + 0.55 * a; mm.material.opacity = 0.22 + 0.58 * a; }
  }
  // guides
  guideGroup.visible = S.show.paths;
  const pal = BG[S.bg], col = new THREE.Color(pal.guide);
  pathMat.color.copy(col); dot.material.color.copy(col); arcLine.material.color.copy(col); bandMesh.material.color.copy(col); refLine.material.color.copy(col); gazeLine.material.color.set(pal.ink);
  const g = EX.guides.find((x) => x.kind === 'path');
  dot.visible = !!g && S.t >= g.from && S.t <= g.to; if (g) dot.position.copy(toV3(W[g.joint].p, mirror));
  const meas = R.measures(W), arcG = EX.guides.find((x) => x.kind === 'rotationArc');
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
  const p = v3.clone().project(camera);
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
function bakeClip(ex, mirror, fps) {
  const tlx = R.buildTimeline(ex), Dx = tlx.duration, n = Math.round(Dx * fps) + 1, times = new Float32Array(n);
  const q = {}, rootP = new Float32Array(n * 3);
  for (const j of rig.joints) q[j.id] = new Float32Array(n * 4);
  for (let k = 0; k < n; k++) {
    const t = Math.min(Dx, k / fps); times[k] = t;
    const L = localQuats(R.evalPose(rig, tlx.pose(t), ex.contacts), mirror);
    for (const j of rig.joints) { const v = L[j.id]; q[j.id].set([v[1], v[2], v[3], v[0]], k * 4); }
    rootP.set(L.__root, k * 3);
  }
  const tracks = rig.joints.map((j) => new THREE.QuaternionKeyframeTrack(`${j.id}.quaternion`, times, q[j.id]));
  tracks.push(new THREE.VectorKeyframeTrack('pelvis.position', times, rootP));
  return new THREE.AnimationClip(`${ex.exercise.id}_${mirror ? 'left' : 'right'}`, Dx, tracks);
}
async function exportGLB(i) {
  const ex = EXS[i], f = buildFigure(false);
  const armature = new THREE.Group(); armature.name = 'Armature';
  armature.rotation.y = -Math.PI / 2; // figure faces +X in rig space; glTF convention faces +Z
  armature.add(f.mesh); armature.userData = { rig: RIG.rigId, exercise: ex.exercise.id, units: 'meters', note: 'Clips: <id>_right, <id>_left. Generated by RepRig.' };
  applyLocal(f, localQuats(R.evalPose(rig, R.buildTimeline(ex).pose(0), ex.contacts), false));
  armature.updateMatrixWorld(true);
  const props = new THREE.Group(); props.name = 'Props'; buildProps(ex.props, props); armature.add(props);
  const clips = ex.exercise.authoredSide === 'bilateral' ? [bakeClip(ex, false, 30)] : [bakeClip(ex, false, 30), bakeClip(ex, true, 30)];
  if (clips.length === 1) clips[0].name = ex.exercise.id;
  const buf = await new GLTFExporter().parseAsync(armature, { binary: true, animations: clips });
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
  $('facts').innerHTML = [['Sets × reps', `${pr.sets} × ${pr.reps}`], ['End-range hold', pr.endRangeHold], ['Static option', pr.staticOption], ['Tempo', pr.tempo], ['Equipment', META.equipment.join(', ')], ['Laterality', META.laterality]].map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
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
  const ch = lastPose.ch, m = R.measures(lastW), sideL = S.side === 'R' ? 'L' : 'R';
  const rows = [['Thoracic rotation', ch.spine_t12.rot + ch.spine_t6.rot], ['Lumbar rotation', ch.spine_l5.rot], ['Shoulder-line tilt', m.shoulderLineIncl], ['Neck rotation', ch.neck_c7.rot + ch.head_c1.rot], [`Support elbow (${sideL})`, m.elbowL], ['Hips / knees', null]];
  $('hud').innerHTML = rows.map(([l, v]) => `<span>${esc(l)}</span><em>${v == null ? `${Math.round(ch.hip_r.flex)}° / ${Math.round(m.knee)}°` : fmt(v)}</em>`).join('');
  const live = { 'Thoracic rotation (T12–T1)': ch.spine_t12.rot + ch.spine_t6.rot, 'Lumbar rotation (L5–S1 to T12)': ch.spine_l5.rot, 'Total trunk rotation': ch.spine_l5.rot + ch.spine_t12.rot + ch.spine_t6.rot, 'Cervical rotation toward reaching hand': ch.neck_c7.rot + ch.head_c1.rot, Hips: ch.hip_r.flex, Knees: m.knee, 'Support elbow': m.elbowL };
  document.querySelectorAll('#kin td.live').forEach((td) => { const v = live[td.dataset.m]; td.textContent = v == null ? '–' : fmt(v); });
}
function resize() { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
const roStage = new ResizeObserver(() => { resize(); setCamera(S.cam); });

let last = performance.now(), fpsE = 60, fpsT = 0;
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000); last = now; if (dt > 0) fpsE = fpsE * 0.92 + (1 / dt) * 0.08;
  if (S.playing) S.t = (S.t + dt * S.speed) % D;
  update(); controls.update(); renderer.render(scene, camera); syncUI(false);
  if (now - fpsT > 500) { fpsT = now; $('fps').textContent = `${Math.round(fpsE)} fps`; }
  requestAnimationFrame(frame);
}
if (stage.clientWidth < 600) S.show.angles = false;
buildStatic(); applyBackdrop(); resize(); loadExercise(S.ex); roStage.observe(stage);
setPlaying(!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
$('loading').remove(); syncUI(true); requestAnimationFrame(frame);
window.__rr = { S, R, rig, exportGLB, load: loadExercise, setT: (t) => { S.t = t; update(); renderer.render(scene, camera); syncUI(true); }, setCam: setCamera, measures: (t) => R.measures(R.evalPose(rig, tl.pose(t), EX.contacts)), get tl() { return tl; }, get EX() { return EX; } };
