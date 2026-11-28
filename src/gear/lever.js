// Lever / plate-loaded / selectorized machines: GEAR.prop('lever_machine').
// One generic, parametric machine: a static frame (base, posts, pivot shaft, weight stack), a seat, a back pad and any
// number of extra static pads, plus one moving lever arm (or a pair, one per side) that swings about a pivot and carries
// the handles, a roller pad, or a flat pad. Each frame update() points the arm at what it follows (the hands' grip
// points, or a point on a limb such as the front of the shin), so the moving parts rotate and never stretch.
//
// Units: cm in params (prop-local: origin at the prop's center on the floor, +X forward, +Y up, +Z the athlete's right).
// params (all optional; params.type picks a preset from LEVER_TYPES, other keys override it, objects merge one level):
//   type     chest_press | shoulder_press | seated_row | pulldown | leg_press | leg_extension | leg_curl_lying |
//            leg_curl_seated | hip_abduction | hip_adduction | pec_deck | calf_raise
//   axis     'z' = lever swings in the sagittal plane about a left-right shaft; 'y' = arms swing about vertical axles
//   arms     'single' = one arm (follows the midpoint of the right and left targets); 'split' = one arm per side
//            (iso-lateral levers; the left arm is the right one mirrored across z = 0, each follows its own side)
//   pivot    [x, y, z]: axis 'z': the shaft passes through (x, y), z unused; axis 'y': the right axle at (x, z), y is the
//            height of the frame the axle hangs from (above the arm) or 0 for a floor-mounted axle
//   end      [x, y, z] the handle / pad centre at lever angle 0 (right side)
//   armZ     axis 'z': z of the arm tube (right side); default end z
//   armY     axis 'y': height of the horizontal arm tube (default end y; a riser joins it to the end)
//   endKind  'handles' (a grip bar per arm; a cross bar joins both for arms 'single'), 'roller' (cylinder along Z),
//            'pad' (box)
//   endSize  roller: [length, radius]; pad: [sx, sy, sz]; handles: [length, radius]
//   endRot   pad / handle rest rotation [rx, ry, rz] deg (handles are drawn along +Z before rotation)
//   handleZ  arms 'single' + handles: the grips sit at z = +-handleZ
//   follow   { grip: 'handle' | 'bar' } follow the hands' grip points, or { joints: [a, b?], t, off, shift } a point on
//            a limb: a + t (b - a), moved `off` cm perpendicular to the limb (axis 'z': in the sagittal plane, + = in
//            front of a downward shank, i.e. 90 deg counter-clockwise from the limb direction a->b seen from +Z;
//            axis 'y': horizontal, perpendicular to the limb, + = outward, away from the midline), then by `shift`
//            [dx, dy, dz] (z mirrored for the left side). Joint names are given for the
//            right side; the left arm uses the _l joints; a 'single' arm follows the midpoint of both sides.
//   range    [lo, hi] lever angle limits in degrees (counter-clockwise seen from +Z for axis 'z'; about +Y for axis 'y',
//            right arm; the left arm's angle is mirrored so the same angle means the same motion on both sides)
//   seat     { x, y, d, w, t } seat pad: centre x, top height y, depth d, width w, thickness t (null = no seat)
//   back     { x, y, h, w, t, angle } back pad: front face bottom edge at (x, y), height h, leaning back `angle` deg
//   pads     [{ c: [x, y, z], size: [sx, sy, sz], rot: [rx, ry, rz], kind: 'box' | 'roller' | 'bar', post }] static pads,
//            rollers (size [len, r] along Z) and bars (size [len, r], along Z before rot); post: true adds a floor post
//   columns  [[x, z], ...] frame posts (floor to the pivot height, then a beam to the pivot); default: outside the
//            arm(s), at the pivot x, or behind the back pad for a high pivot over the seat
//   armPads  [{ c, size, rot }] extra pads carried by each arm (right side, at lever angle 0; e.g. a footrest)
//   stack    { x, z, h } selectorized weight stack (null = none); load 'plates' hangs plates on the arm(s) instead
//   plateAt  fraction along the arm (pivot -> end) where the plate horn sits (load 'plates')
// Moving parts: 'arm' (arms 'single') or 'arm_r' / 'arm_l' (arms 'split'), listed in obj.userData.moving.
// Held item: GEAR.heldItem('lever_machine') draws nothing. Exercise authors add { kind: 'lever_machine', attach:
// { joint: 'wrist_r' } } (and wrist_l) so the player closes the hands on the machine's handles.
// The same math runs in node for authoring (build/families/gear-lever.js requires this file).

const LEVER_SEAT = { x: -8, y: 46, d: 40, w: 38, t: 8 };
const LEVER_BACK = { x: -26, y: 50, h: 62, w: 34, t: 9, angle: 10 };
const LEVER_TYPES = {
  chest_press: { axis: 'z', arms: 'split', pivot: [-32, 190, 0], end: [32, 106, 22], endKind: 'handles', endSize: [14, 1.8], endRot: [0, 0, 0], follow: { grip: 'handle' }, range: [-40, 40], seat: LEVER_SEAT, back: LEVER_BACK, load: 'stack', stack: { x: -70, z: 0, h: 120 } },
  shoulder_press: { axis: 'z', arms: 'split', pivot: [-70, 95, 0], end: [-12, 138, 24], endKind: 'handles', endSize: [14, 1.8], endRot: [0, 0, 0], follow: { grip: 'handle' }, range: [-30, 45], seat: LEVER_SEAT, back: { ...LEVER_BACK, angle: 8, h: 70 }, load: 'plates' },
  seated_row: { axis: 'z', arms: 'split', pivot: [95, 25, 0], end: [62, 100, 20], endKind: 'handles', endSize: [14, 1.8], endRot: [90, 0, 0], follow: { grip: 'handle' }, range: [-15, 45], seat: { ...LEVER_SEAT, x: 0 }, back: null, pads: [{ c: [38, 105, 0], size: [8, 38, 30], rot: [0, 0, 8], kind: 'box', post: true }], load: 'plates' },
  pulldown: { axis: 'z', arms: 'split', pivot: [-45, 215, 0], end: [22, 195, 32], endKind: 'handles', endSize: [14, 1.8], endRot: [0, 0, 0], follow: { grip: 'handle' }, range: [-60, 15], seat: LEVER_SEAT, back: null, pads: [{ c: [22, 68, 0], size: [10, 10, 40], kind: 'roller', post: true }], load: 'plates' },
  leg_press: { axis: 'z', arms: 'single', pivot: [65, 135, 0], end: [78, 55, 0], armZ: 34, endKind: 'pad', endSize: [4, 48, 62], endRot: [0, 0, 0], follow: { joints: ['ankle_r', 'toe_r'], t: 0.5, off: 4 }, range: [-35, 25], seat: { ...LEVER_SEAT, y: 42 }, back: { ...LEVER_BACK, angle: 25, h: 70 }, load: 'plates' },
  leg_extension: { axis: 'z', arms: 'single', pivot: [14, 52, 0], end: [16, 14, 0], armZ: 26, endKind: 'roller', endSize: [36, 5], follow: { joints: ['knee_r', 'ankle_r'], t: 0.86, off: 9 }, range: [-10, 95], seat: LEVER_SEAT, back: LEVER_BACK, pads: [{ c: [-6, 50, 26], size: [20, 2, 2], kind: 'bar' }, { c: [-6, 50, -26], size: [20, 2, 2], kind: 'bar' }], load: 'stack', stack: { x: -60, z: 30, h: 110 } },
  leg_curl_lying: { axis: 'z', arms: 'single', pivot: [-40, 70, 0], end: [-80, 82, 0], armZ: 26, endKind: 'roller', endSize: [36, 5], follow: { joints: ['knee_r', 'ankle_r'], t: 0.86, off: -9 }, range: [-10, 120], seat: { x: 20, y: 70, d: 120, w: 34, t: 9 }, back: null, load: 'stack', stack: { x: 90, z: 0, h: 110 } },
  leg_curl_seated: { axis: 'z', arms: 'single', pivot: [14, 52, 0], end: [56, 44, 0], armZ: 26, endKind: 'roller', endSize: [36, 5], follow: { joints: ['knee_r', 'ankle_r'], t: 0.86, off: -9 }, range: [-100, 10], seat: LEVER_SEAT, back: LEVER_BACK, pads: [{ c: [4, 70, 0], size: [12, 12, 36], kind: 'roller', post: false }], load: 'stack', stack: { x: -60, z: 30, h: 110 } },
  hip_abduction: { axis: 'y', arms: 'split', pivot: [-18, 0, 10], armY: 30, end: [34, 52, 22], endKind: 'pad', endSize: [24, 22, 5], endRot: [0, 0, 0], follow: { joints: ['hip_r', 'knee_r'], t: 1, off: 9 }, range: [-50, 10], seat: LEVER_SEAT, back: LEVER_BACK, load: 'stack', stack: { x: -60, z: 0, h: 110 } },
  hip_adduction: { axis: 'y', arms: 'split', pivot: [-18, 0, 10], armY: 30, end: [34, 52, 30], endKind: 'pad', endSize: [24, 22, 5], endRot: [0, 0, 0], follow: { joints: ['hip_r', 'knee_r'], t: 1, off: -9 }, range: [-50, 10], seat: LEVER_SEAT, back: LEVER_BACK, load: 'stack', stack: { x: -60, z: 0, h: 110 } },
  pec_deck: { axis: 'y', arms: 'split', pivot: [-14, 200, 26], end: [20, 120, 30], endKind: 'pad', endSize: [6, 32, 8], endRot: [0, 0, 0], follow: { joints: ['elbow_r', 'wrist_r'], t: 0.35, off: -5 }, range: [-10, 90], seat: LEVER_SEAT, back: { ...LEVER_BACK, angle: 4, h: 70 }, load: 'stack', stack: { x: -70, z: 0, h: 120 } },
  calf_raise: { axis: 'z', arms: 'single', pivot: [-70, 120, 0], end: [0, 150, 0], armZ: 34, endKind: 'pad', endSize: [16, 8, 50], endRot: [0, 0, 0], follow: { joints: ['shoulder_r'], t: 0, off: 0, shift: [0, 6, 0] }, range: [-20, 20], seat: null, back: null, pads: [{ c: [10, 4, 0], size: [20, 8, 50], kind: 'box' }], load: 'plates' },
};

function leverParams(pr) {
  const u = (pr && pr.params) || {}, base = LEVER_TYPES[u.type] || LEVER_TYPES.chest_press, P = {};
  for (const k of new Set([...Object.keys(base), ...Object.keys(u)])) {
    const b = base[k], v = u[k];
    P[k] = v === undefined ? b : v && b && typeof v === 'object' && typeof b === 'object' && !Array.isArray(v) && !Array.isArray(b) ? { ...b, ...v } : v;
  }
  P.type = u.type || 'chest_press'; P.pads = P.pads || []; P.armPads = P.armPads || []; P.range = P.range || [-180, 180];
  if (P.armZ == null) P.armZ = P.end[2];
  return P;
}
const lvSub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const lvAdd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
// the arms of a machine: one per side for 'split', else one following both sides
function leverArms(P) { return P.arms === 'split' ? [{ id: 'arm_r', side: 'r', s: 1 }, { id: 'arm_l', side: 'l', s: -1 }] : [{ id: 'arm', side: null, s: 1 }]; }
// pivot point of an arm (prop-local cm): the origin of its moving group
function leverPivot(P, arm) { return P.axis === 'y' ? [P.pivot[0], 0, P.pivot[2] * arm.s] : [P.pivot[0], P.pivot[1], 0]; }
// rest (angle 0) end point of an arm
function leverEnd0(P, arm) { return [P.end[0], P.end[1], P.end[2] * arm.s]; }
// rotate a prop-local point about the arm's pivot by `deg`
function leverRotate(P, arm, p, deg) {
  const o = leverPivot(P, arm), d = lvSub(p, o), a = ((P.axis === 'y' ? deg * arm.s : deg) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return P.axis === 'y' ? lvAdd(o, [d[0] * c + d[2] * s, d[1], -d[0] * s + d[2] * c]) : lvAdd(o, [d[0] * c - d[1] * s, d[0] * s + d[1] * c, d[2]]);
}
// end point for a lever angle
function leverEndAt(P, arm, deg) { return leverRotate(P, arm, leverEnd0(P, arm), deg); }
// The point an arm follows, in prop-local cm. get(joint) -> prop-local cm; grip(side, grip) -> prop-local cm.
function leverTarget(P, arm, get, grip) {
  const sides = arm.side ? [arm.side] : ['r', 'l'], f = P.follow || { grip: 'handle' };
  const one = (sd) => {
    if (f.grip) return grip(sd, f.grip);
    const j = (n) => get(sd === 'l' ? n.replace(/_r$/, '_l') : n), a = j(f.joints[0]), b = f.joints[1] ? j(f.joints[1]) : a, t = f.t ?? 0;
    let p = lvAdd(a, [(b[0] - a[0]) * t, (b[1] - a[1]) * t, (b[2] - a[2]) * t]);
    if (f.off) {
      if (P.axis === 'y') { // horizontal, perpendicular to the limb, away from the midline (outward z if a single joint)
        const ss = sd === 'l' ? -1 : 1, dx = b[0] - a[0], dz = b[2] - a[2], n = Math.hypot(dx, dz);
        let nx = n > 1e-6 ? -dz / n : 0, nz = n > 1e-6 ? dx / n : 1; if (nz * ss < 0) { nx = -nx; nz = -nz; }
        p = lvAdd(p, [nx * f.off, 0, nz * f.off]);
      }
      else { const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1; p = lvAdd(p, [(-dy / n) * f.off, (dx / n) * f.off, 0]); }
    }
    if (f.shift) p = lvAdd(p, [f.shift[0], f.shift[1], (sd === 'l' ? -1 : 1) * f.shift[2]]);
    return p;
  };
  const ps = sides.map(one);
  return ps.length === 1 ? ps[0] : [(ps[0][0] + ps[1][0]) / 2, (ps[0][1] + ps[1][1]) / 2, (ps[0][2] + ps[1][2]) / 2];
}
// Lever angle (deg, clamped to range) that points the arm's end at a target point: the arm keeps its length and only
// rotates; the end lands on the target when the target is on the arm's arc.
function leverAngle(P, arm, target) {
  const o = leverPivot(P, arm), e = lvSub(leverEnd0(P, arm), o), t = lvSub(target, o);
  const ang = P.axis === 'y' ? Math.atan2(-t[2], t[0]) - Math.atan2(-e[2], e[0]) : Math.atan2(t[1], t[0]) - Math.atan2(e[1], e[0]);
  let d = (ang * 180) / Math.PI; d = ((d + 540) % 360) - 180; if (P.axis === 'y') d *= arm.s; // mirrored arm: same sign = same motion
  return Math.max(P.range[0], Math.min(P.range[1], d));
}
// convenience: angle of each arm from the pose
function leverAngles(P, get, grip) { const out = {}; for (const arm of leverArms(P)) out[arm.id] = leverAngle(P, arm, leverTarget(P, arm, get, grip)); return out; }

if (typeof GEAR !== 'undefined') {
  GEAR.prop('lever_machine', {
    build(pr, ctx) {
      const { THREE, U } = ctx, P = leverParams(pr), g = new THREE.Group();
      const frame = ctx.iron(0x2b2f36), uph = new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.75 }), st = ctx.steel();
      const accent = new THREE.MeshStandardMaterial({ color: pr.color ? new THREE.Color(pr.color) : 0xb8342e, roughness: 0.5, metalness: 0.3 });
      const v3 = (p) => new THREE.Vector3(p[0] * U, p[1] * U, p[2] * U);
      const box = (c, s, m, rot) => { const b = new THREE.Mesh(new THREE.BoxGeometry(s[0] * U, s[1] * U, s[2] * U), m); b.position.copy(v3(c)); if (rot) b.rotation.set(rot[0] * Math.PI / 180, rot[1] * Math.PI / 180, rot[2] * Math.PI / 180); return b; };
      const tube = (a, b, r, m) => { const A = v3(a), B = v3(b), d = B.clone().sub(A), L = Math.max(1e-4, d.length()); const t = new THREE.Mesh(new THREE.CylinderGeometry(r * U, r * U, L, 14), m); t.position.copy(A).addScaledVector(d, 0.5); t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.multiplyScalar(1 / L)); return t; };
      const zRoll = (c, len, r, m) => tube([c[0], c[1], c[2] - len / 2], [c[0], c[1], c[2] + len / 2], r, m);
      // seat, back pad, static pads
      if (P.seat) { const s = P.seat; g.add(box([s.x, s.y - s.t / 2, 0], [s.d, s.t, s.w], uph)); g.add(tube([s.x, 0, 0], [s.x, s.y - s.t, 0], 3, frame)); g.add(box([s.x, 1.5, 0], [Math.max(40, s.d), 3, 8], frame)); }
      if (P.back) {
        const b = P.back, a = (b.angle * Math.PI) / 180, up = [-Math.sin(a), Math.cos(a)], nb = [-Math.cos(a), -Math.sin(a)];
        const c = [b.x + up[0] * b.h / 2 + nb[0] * b.t / 2, b.y + up[1] * b.h / 2 + nb[1] * b.t / 2, 0];
        g.add(box(c, [b.t, b.h, b.w], uph, [0, 0, b.angle]));
        const sx = c[0] + nb[0] * (b.t / 2 + 3); g.add(tube([sx, 0, 0], [sx, c[1], 0], 3, frame));
      }
      for (const pd of P.pads) {
        if (pd.kind === 'roller') g.add(zRoll(pd.c, pd.size[0], pd.size[1] / 2 || 5, uph));
        else if (pd.kind === 'bar') { const m = zRoll([0, 0, 0], pd.size[0], pd.size[1] || 1.6, st); const h = new THREE.Group(); h.add(m); h.position.copy(v3(pd.c)); h.rotation.set(...(pd.rot || [0, 90, 0]).map((d) => d * Math.PI / 180)); g.add(h); }
        else g.add(box(pd.c, pd.size, uph, pd.rot));
        if (pd.post) g.add(tube([pd.c[0], 0, 0], [pd.c[0], pd.c[1], 0], 3, frame));
      }
      // frame: posts to the pivot, the pivot shaft, a floor rail, the weight stack
      const arms = leverArms(P), outer = Math.max(Math.abs(P.armZ), Math.abs(P.end[2])) + 10;
      if (P.axis === 'z') {
        const cx = P.back && P.pivot[1] > 120 && P.pivot[0] > P.back.x - 20 ? P.back.x - 30 : P.pivot[0]; // a high pivot over the seat hangs from posts behind the back pad
        const cols = P.columns || (P.arms === 'split' ? [[cx, outer], [cx, -outer]] : [[cx, outer]]);
        for (const [x, z] of cols) { g.add(box([x, P.pivot[1] / 2, z], [7, P.pivot[1], 7], frame)); g.add(tube([x, P.pivot[1], z], [P.pivot[0], P.pivot[1], z], 3, frame)); g.add(box([x, 1.5, z], [70, 3, 9], frame)); }
        const zs = cols.map((c) => c[1]).concat(arms.map((a) => P.armZ * a.s));
        g.add(tube([P.pivot[0], P.pivot[1], Math.min(...zs)], [P.pivot[0], P.pivot[1], Math.max(...zs)], 3.2, st));
      } else {
        for (const arm of arms) {
          const o = leverPivot(P, arm), top = P.pivot[1];
          if (top > (P.armY ?? P.end[1])) { // axle hangs from an overhead frame: beam back to a column behind the seat
            const cx = P.columns ? P.columns[0][0] : (P.back ? P.back.x - 22 : o[0] - 30);
            g.add(tube([o[0], (P.armY ?? P.end[1]) + 12, o[2]], [o[0], top, o[2]], 3, frame)); g.add(tube([o[0], top, o[2]], [cx, top, o[2]], 3.5, frame));
            g.add(box([cx, top / 2, o[2]], [7, top, 7], frame)); g.add(box([cx, 1.5, o[2]], [60, 3, 9], frame));
          } else { g.add(tube([o[0], 0, o[2]], [o[0], (P.armY ?? P.end[1]) - 12, o[2]], 3.5, frame)); g.add(box([o[0], 1.5, o[2]], [40, 3, 9], frame)); }
        }
        g.add(box([P.pivot[0], 1.5, 0], [9, 3, 2 * Math.abs(P.pivot[2]) + 9], frame));
      }
      if (P.stack) { const s = P.stack; g.add(box([s.x, s.h / 2, s.z], [16, s.h, 34], frame)); for (let i = 0; i < 9; i++) g.add(box([s.x + 9, 8 + i * 4.2, s.z], [6, 3.6, 26], i === 8 ? accent : frame)); for (const dz of [-9, 9]) g.add(tube([s.x + 9, 4, s.z + dz], [s.x + 9, s.h - 6, s.z + dz], 0.8, st)); }
      // moving arms: a group at the pivot rotated each frame; children are built in pivot-relative coordinates
      const moving = [];
      for (const arm of arms) {
        const o = leverPivot(P, arm), A = new THREE.Group(); A.name = arm.id; A.userData.arm = arm.id; A.position.copy(v3(o)); g.add(A); moving.push(A);
        const rel = (p) => lvSub(p, o), e = leverEnd0(P, arm), ez = P.armZ * arm.s;
        const add = (m) => { m.castShadow = true; A.add(m); return m; };
        if (P.axis === 'z') {
          const hub = [o[0], o[1], ez], elbowPt = [e[0], e[1], ez];
          add(tube(rel(hub), rel(elbowPt), 2.6, accent)); add(zRoll(rel(hub), 9, 4.2, frame));
          if (P.load === 'plates') { const f = P.plateAt ?? 0.3, h = lvAdd(hub, [(e[0] - hub[0]) * f, (e[1] - hub[1]) * f, 0]); const hz = ez + arm.s * 8; add(tube(rel([h[0], h[1], ez]), rel([h[0], h[1], hz + arm.s * 12]), 2.4, st)); for (let i = 0; i < 2; i++) add(zRoll(rel([h[0], h[1], hz + arm.s * (2 + i * 4)]), 3.5, 22, frame)); }
          if (Math.abs(e[2] - ez) > 0.5 && P.endKind !== 'roller') add(tube(rel(elbowPt), rel(e), 2.2, accent));
        } else {
          const ay = P.armY ?? e[1], hub = [o[0], ay, o[2]], knee = [e[0], ay, e[2]];
          add(tube(rel([o[0], ay - 12, o[2]]), rel([o[0], ay + 12, o[2]]), 4, frame)); add(tube(rel(hub), rel(knee), 2.6, accent));
          if (Math.abs(ay - e[1]) > 0.5) add(tube(rel(knee), rel(e), 2.4, accent));
        }
        for (const ap of P.armPads || []) add(box(rel([ap.c[0], ap.c[1], ap.c[2] * arm.s]), ap.size, uph, ap.rot));
        if (P.endKind === 'roller') { const [len, r] = P.endSize, c = rel(e), side = Math.sign(ez - e[2]) || 1; add(zRoll(c, len, r, uph)); add(tube(rel([e[0], e[1], ez]), [c[0], c[1], c[2] + side * len / 2], 2, st)); }
        else if (P.endKind === 'pad') { add(box(rel(e), P.endSize, uph, P.endRot)); }
        else { // handles
          const [len, r] = P.endSize, rot = (P.endRot || [0, 0, 0]).map((d) => d * Math.PI / 180);
          const grips = arm.side ? [e] : [[e[0], e[1], P.handleZ ?? Math.abs(e[2]) ], [e[0], e[1], -(P.handleZ ?? Math.abs(e[2]))]];
          for (const gp of grips) { const h = new THREE.Group(); h.position.copy(v3(rel(gp))); h.rotation.set(...rot); const rub = new THREE.MeshStandardMaterial({ color: 0x23262c, roughness: 0.85 }); h.add(zRoll([0, 0, 0], len, r * 1.25, rub)); A.add(h); }
          if (!arm.side) add(tube(rel(grips[0]), rel(grips[1]), 1.6, st));
        }
      }
      g.userData.moving = moving; g.userData.lever = P;
      return g;
    },
    update(obj, live) {
      const P = obj.userData.lever, U = live.U;
      const loc = (p) => { const v = live.toLocal(p, obj); return [v.x / U, v.y / U, v.z / U]; };
      const get = (j) => loc(live.pt(j)), grip = (s, gr) => loc(live.grip(s, gr));
      for (const A of obj.userData.moving) {
        const arm = leverArms(P).find((a) => a.id === A.userData.arm);
        if (!arm) continue;
        const deg = leverAngle(P, arm, leverTarget(P, arm, get, grip)), r = (deg * Math.PI) / 180;
        if (P.axis === 'y') A.rotation.set(0, r * arm.s, 0); else A.rotation.set(0, 0, r);
      }
    },
  });
  // "hands on the machine": draws nothing, but a held item makes the player close the hand (see the header)
  GEAR.heldItem('lever_machine', { mesh(pr, ctx) { const g = new ctx.THREE.Group(); g.name = pr.id; return g; } });
}
if (typeof module !== 'undefined' && module.exports) module.exports = { LEVER_TYPES, leverParams, leverArms, leverPivot, leverEnd0, leverRotate, leverEndAt, leverTarget, leverAngle, leverAngles };
