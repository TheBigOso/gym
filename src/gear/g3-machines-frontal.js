// Frontal-plane lever machines (g3-machines): prop kind 'lever_machine' with params.axis 'x'.
// src/gear/lever.js swings its arms about a left-right shaft (axis 'z') or vertical axles (axis 'y'); lateral raise and
// crossover pulldown machines swing each arm about a fore-aft axle beside / above its shoulder. This file adds that case
// without touching lever.js: it wraps the 'lever_machine' plug-in so props with params.axis === 'x' are built and updated
// here, and every other lever machine goes to lever.js as before. (Suggested framework change: fold axis 'x' into lever.js.)
//
// Units: cm, prop-local (origin at the prop's center on the floor, +X forward, +Y up, +Z the athlete's right).
// params (axis 'x'):
//   pivot    [x, y, z] the right arm's axle: runs fore-aft through (y, z); x is where the arm's hub sits. Left = z mirrored.
//   end      [x, y, z] the right handle / pad centre at lever angle 0 (the arm runs from the hub to (x_end, y, z) in the
//            hub's x plane, then a short riser forward to the end if x differs)
//   endKind  'pad' (box, endSize [sx, sy, sz]) | 'handles' (grip bar along endRot-rotated +Z, endSize [len, r])
//   endRot   [rx, ry, rz] deg rest rotation of the pad / handle (THREE Euler XYZ)
//   follow   { grip: 'handle' } or { joints: [a, b?], t, off, shift }: the point a + t (b - a), moved `off` cm
//            perpendicular to the limb in the frontal plane (+ = outward / upward for the right side: the limb direction
//            turned 90 degrees toward +Z when it points down), then by `shift` [dx, dy, dz]; computed for the right side,
//            mirrored for the left
//   range    [lo, hi] deg; + = the arm end moves from +Y toward +Z about the axle (right side; mirrored on the left)
//   seat     { x, y, d, w, t } (null = none); pads [{ c, size, rot, kind: 'box' | 'roller' | 'bar', post }] as lever.js
//   frame    { x } x of the upright column behind the axles (default pivot x - 25); the column rises to the axle height
//            and a beam carries both axles
// Moving parts: 'arm_r', 'arm_l' (obj.userData.moving).
// Also for any lever machine (axis 'z' / 'y', built by lever.js): params.only 'r' | 'l' keeps just that lever of a split
// pair (one-arm or one-leg machines), so a lever that nothing follows is not drawn.
function frParams(pr) {
  const u = (pr && pr.params) || {};
  return { pivot: [0, 200, 30], end: [0, 120, 30], endKind: 'pad', endSize: [8, 22, 8], endRot: [0, 0, 0], follow: { grip: 'handle' }, range: [-180, 180], seat: null, pads: [], frame: {}, ...u, axis: 'x' };
}
const frArms = [{ id: 'arm_r', side: 'r', s: 1 }, { id: 'arm_l', side: 'l', s: -1 }];
// all math in the right-side frame; left-side points are mirrored (z -> -z) in and out
const frM = (p, s) => [p[0], p[1], p[2] * s];
function frRotate(P, p, deg) { // right frame: rotate p about the right axle (fore-aft line through (pivot y, pivot z)) by deg
  const a = (deg * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a), dy = p[1] - P.pivot[1], dz = p[2] - P.pivot[2];
  return [p[0], P.pivot[1] + dy * c - dz * sn, P.pivot[2] + dy * sn + dz * c];
}
const frEndAt = (P, arm, deg) => frM(frRotate(P, P.end, deg), arm.s);
// target point (prop-local, real side) for an arm; get(joint) / grip(side, grip) give prop-local cm
function frTarget(P, arm, get, grip) {
  const f = P.follow || { grip: 'handle' }, s = arm.s;
  if (f.grip) return grip(arm.side, f.grip);
  const j = (n) => frM(get(arm.side === 'l' ? n.replace(/_r$/, '_l') : n), s); // into the right frame
  const a = j(f.joints[0]), b = f.joints[1] ? j(f.joints[1]) : a, t = f.t ?? 0;
  let p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  if (f.off) { const dy = b[1] - a[1], dz = b[2] - a[2], n = Math.hypot(dy, dz) || 1; p = [p[0], p[1] + (dz / n) * f.off, p[2] - (dy / n) * f.off]; }
  if (f.shift) p = [p[0] + f.shift[0], p[1] + f.shift[1], p[2] + f.shift[2]];
  return frM(p, s);
}
function frAngle(P, arm, target) {
  const t = frM(target, arm.s), o = P.pivot, e = P.end;
  let d = ((Math.atan2(t[2] - o[2], t[1] - o[1]) - Math.atan2(e[2] - o[2], e[1] - o[1])) * 180) / Math.PI;
  d = ((d + 540) % 360) - 180;
  return Math.max(P.range[0], Math.min(P.range[1], d));
}

if (typeof GEAR !== 'undefined') {
  const frBuild = (pr, ctx) => {
    const { THREE, U } = ctx, P = frParams(pr), g = new THREE.Group();
    const frame = ctx.iron(0x2b2f36), uph = new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.75 }), st = ctx.steel();
    const accent = new THREE.MeshStandardMaterial({ color: pr.color ? new THREE.Color(pr.color) : 0xb8342e, roughness: 0.5, metalness: 0.3 });
    const v3 = (p) => new THREE.Vector3(p[0] * U, p[1] * U, p[2] * U);
    const box = (c, s, m, rot) => { const b = new THREE.Mesh(new THREE.BoxGeometry(s[0] * U, s[1] * U, s[2] * U), m); b.position.copy(v3(c)); if (rot) b.rotation.set(...rot.map((d) => (d * Math.PI) / 180)); return b; };
    const tube = (a, b, r, m) => { const A = v3(a), B = v3(b), d = B.clone().sub(A), L = Math.max(1e-4, d.length()); const t = new THREE.Mesh(new THREE.CylinderGeometry(r * U, r * U, L, 14), m); t.position.copy(A).addScaledVector(d, 0.5); t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.multiplyScalar(1 / L)); return t; };
    if (P.seat) { const s = P.seat; g.add(box([s.x, s.y - s.t / 2, 0], [s.d, s.t, s.w], uph)); g.add(tube([s.x, 0, 0], [s.x, s.y - s.t, 0], 3, frame)); g.add(box([s.x, 1.5, 0], [Math.max(40, s.d), 3, 8], frame)); }
    for (const pd of P.pads) {
      if (pd.kind === 'roller') g.add(tube([pd.c[0], pd.c[1], pd.c[2] - pd.size[0] / 2], [pd.c[0], pd.c[1], pd.c[2] + pd.size[0] / 2], pd.size[1] / 2 || 5, uph));
      else if (pd.kind === 'bar') { const h = new THREE.Group(); h.add(tube([0, 0, -pd.size[0] / 2], [0, 0, pd.size[0] / 2], pd.size[1] || 1.6, st)); h.position.copy(v3(pd.c)); h.rotation.set(...(pd.rot || [0, 90, 0]).map((d) => (d * Math.PI) / 180)); g.add(h); }
      else g.add(box(pd.c, pd.size, uph, pd.rot));
      if (pd.post) g.add(tube([pd.c[0], 0, pd.c[2]], [pd.c[0], pd.c[1], pd.c[2]], 3, frame));
    }
    // frame: an upright behind the axles up to the axle height, a cross beam carrying both axles, a floor rail
    const fx = P.frame.x ?? P.pivot[0] - 25, py = P.pivot[1], pz = Math.abs(P.pivot[2]);
    g.add(box([fx, (py + 10) / 2, 0], [9, py + 10, 12], frame)); g.add(box([fx, 1.5, 0], [60, 3, 50], frame));
    g.add(box([fx, py + 6, 0], [8, 8, 2 * pz + 16], frame));
    for (const s of [1, -1]) { g.add(tube([fx, py + 6, s * pz], [P.pivot[0] + 6, py, s * pz], 3, frame)); }
    if (P.stack) { const s = P.stack; g.add(box([s.x, s.h / 2, s.z], [16, s.h, 34], frame)); for (let i = 0; i < 9; i++) g.add(box([s.x + 9, 8 + i * 4.2, s.z], [6, 3.6, 26], i === 8 ? accent : frame)); }
    const moving = [];
    for (const arm of frArms) {
      const o = frM(P.pivot, arm.s), A = new THREE.Group(); A.name = arm.id; A.userData.arm = arm.id; A.position.copy(v3(o)); g.add(A); moving.push(A);
      const rel = (p) => { const q = frM(p, arm.s); return [q[0] - o[0], q[1] - o[1], q[2] - o[2]]; }; // right-frame point -> arm-local
      const e = P.end, elbowPt = [P.pivot[0], e[1], e[2]];
      A.add(tube(rel([P.pivot[0] - 6, P.pivot[1], P.pivot[2]]), rel([P.pivot[0] + 6, P.pivot[1], P.pivot[2]]), 4.2, frame));
      A.add(tube(rel(P.pivot), rel(elbowPt), 2.6, accent));
      if (Math.abs(e[0] - P.pivot[0]) > 0.5) A.add(tube(rel(elbowPt), rel(e), 2.2, accent));
      const rot = (P.endRot || [0, 0, 0]).map((d) => (d * Math.PI) / 180);
      if (P.endKind === 'handles') { const h = new THREE.Group(); h.position.copy(v3(rel(e))); h.rotation.set(rot[0] * arm.s, rot[1] * arm.s, rot[2]); const rub = new THREE.MeshStandardMaterial({ color: 0x23262c, roughness: 0.85 }); h.add(tube([0, 0, -P.endSize[0] / 2], [0, 0, P.endSize[0] / 2], P.endSize[1] * 1.25, rub)); A.add(h); }
      else { const b = box(rel(e), P.endSize, uph); b.rotation.set(rot[0] * arm.s, rot[1] * arm.s, rot[2]); A.add(b); }
    }
    g.userData.moving = moving; g.userData.frontal = P; g.userData.lever = P;
    return g;
  };
  const frUpdate = (obj, live) => {
    const P = obj.userData.frontal, U = live.U;
    const loc = (p) => { const v = live.toLocal(p, obj); return [v.x / U, v.y / U, v.z / U]; };
    const get = (j) => loc(live.pt(j)), grip = (s, gr) => loc(live.grip(s, gr));
    for (const A of obj.userData.moving) { const arm = frArms.find((a) => a.id === A.userData.arm); const deg = frAngle(P, arm, frTarget(P, arm, get, grip)); A.rotation.set(((deg * Math.PI) / 180) * arm.s, 0, 0); }
  };
  const wrap = (def) => (def.__frontal ? def : { ...def, __frontal: true,
    build(pr, ctx) {
      if (pr.params && pr.params.axis === 'x') return frBuild(pr, ctx);
      const g = def.build(pr, ctx), only = pr.params && pr.params.only; // only: 'r' | 'l' keeps one lever of a split pair
      if (only && g.userData.moving) { for (const A of g.userData.moving.slice()) if (A.userData.arm && A.userData.arm !== `arm_${only}` && A.userData.arm !== 'arm') { g.remove(A); g.userData.moving.splice(g.userData.moving.indexOf(A), 1); } }
      return g;
    },
    update(obj, live) { if (obj.userData.frontal) return frUpdate(obj, live); if (def.update) return def.update(obj, live); } });
  if (GEAR.props.lever_machine) GEAR.props.lever_machine = wrap(GEAR.props.lever_machine);
  const reg = GEAR.prop;
  GEAR.prop = function (kind, def) { return reg.call(this, kind, kind === 'lever_machine' ? wrap(def) : def); };
}
if (typeof module !== 'undefined' && module.exports) module.exports = { frParams, frArms, frRotate, frEndAt, frTarget, frAngle };
