// g3-lower gear: sled machines (prop kind 'sled') and lower-body body-mounted items (held kind 'sled'), plus a medicine
// ball on the 'plate' held item (params.shape: 'ball').
//
// 1. Prop { kind: 'sled', center: [x, 0, z], params } : a machine with a carriage that slides along a straight line. Every
//    frame the carriage origin goes to the followed body point projected onto the line (clamped to the travel range), so
//    it can only move along the line. Units cm, prop-local (origin at center on the floor, +X forward, +Y up, +Z right).
//    params:
//      type     'leg_press' (45-degree sled leg press: fixed seat and back pad, footplate on the carriage)
//               'hack_squat' (fixed angled foot platform, back pad and shoulder pads on the carriage)
//               'power_sled' (a push / drag sled on the floor; the whole sled is the carriage)
//      dirDeg   direction of travel in the XY plane, degrees counter-clockwise from +X (leg press 45: up and forward;
//               hack squat 135: up and back; power sled 0 or 180)
//      o        [x, y] the carriage origin at s = 0 (cm). Leg press: centre of the footplate face. Hack squat: the
//               followed point (top of the shoulders). Power sled: the followed point (the hands).
//      range    [lo, hi] travel limits of s (cm along dir)
//      ref      [x, y] where the followed point is at s = 0 (default o); the carriage moves by the followed point's travel
//      follow   { joints: [a, b?], t, along, off, shift: [dx, dy, dz], side: 'both' | 'r' | 'l', grip } the followed point:
//               a + t (b - a) (joint names for the right side, mirrored for the left), moved `along` cm along dir, `off`
//               cm perpendicular to a->b in the XY plane (90 deg counter-clockwise seen from +Z; negative = under a foot
//               that points forward) and by `shift`; side 'both' (default) takes the midpoint of the two sides; grip: 'bar' | 'handle' follows the
//               hands' grip points instead of joints
//      plate    leg press: { w, h, t } footplate size (cm, default 70 x 48 x 4); its face is perpendicular to dir, turned
//               by plateTilt degrees (clockwise seen from +Z: the top of the plate away from the athlete)
//      seat     leg press: { x, y, d, w, t, hx } seat pad (top at y), side handles centred at x = hx (default x + 3); back: { x, y, h, w, t, angle } back pad, front face
//               bottom edge at (x, y), leaning back `angle` degrees from vertical (the lever machine convention)
//      pad      hack squat: { len, w, t, back } back pad along the rails (len cm, from `back` cm below the followed point
//               toward the platform), shoulder pads above the shoulders, handle: [x, z] vertical handles in front of the pads (default [10, 26]); platform { x, y, w, d, angle } fixed, top
//               surface centre at (x, y), tilted `angle` deg (toes up)
//      sled     power sled: { style: 'push' | 'drag', poleH, poleX, len, w } push: two upright poles with handles at the
//               followed point; drag: a strap from the followed point (the hands) to the sled's front ring
//      pivot    [x, y] lever mode (leg_press only): the carriage (plate on an arm) swings about this left-right axis;
//               travel is then an angle (deg, counter-clockwise seen from +Z, 0 = plate at o) and range is in degrees;
//               dir gives the plate's push direction at rest (its face normal points along -dir); armZ arm offset (34)
//      railZ    half distance between the rails (default 32); plates (per horn, default 2), plateD (default 45)
//    Moving part: 'carriage' (listed in obj.userData.moving).
// 2. Held item { kind: 'sled', attach: { joint: 'hip_r', with: 'hip_l', offset }, params: { item } } body-mounted between
//    the hip joints (kept upright by the player's two-joint mount), or { attach: { joint: 'pelvis' }, params: { mount:
//    'pelvis' } } riding on the pelvis (tips with it):
//      item 'belt'     a hip belt with a front ring params.ring cm (default 21) ahead of the hip joints' midpoint and
//                      params.ringY cm up (default 0) (belt-squat machines; the lever arm's end sits at the ring)
//      item 'dip_belt' a dip belt with chains to a plate hanging between the legs, disc in the sagittal plane (params.plateD
//                      default 35, params.drop: cm from the hip line to the plate centre, default 45)
// 3. 'plate' held item with params.shape 'ball': a medicine ball of diameter size[1] (default 30) held between the hands
//    (two hands) or in one hand; any other plate is drawn by the earlier 'plate' plug-in (bars.js), which this wraps.
// The same geometry runs in node for authoring (build/families/gear-g3lower.js requires this file).

const G3S = {
  leg_press: { dirDeg: 45, o: [60, 60], range: [-70, 10], plate: { w: 70, h: 48, t: 4 }, seat: { x: -30, y: 40, d: 40, w: 46, t: 8 }, back: { x: -48, y: 42, h: 70, w: 46, t: 9, angle: 50 }, follow: { joints: ['ankle_r', 'toe_r'], t: 0.35, along: 6 }, railZ: 32, plates: 2, plateD: 45 },
  hack_squat: { dirDeg: 135, o: [-20, 140], range: [-80, 10], pad: { len: 80, w: 40, t: 9, back: 70 }, platform: { x: 30, y: 12, w: 70, d: 50, angle: 15 }, follow: { joints: ['shoulder_r'], t: 0, shift: [0, 0, 0] }, railZ: 34, plates: 2, plateD: 45 },
  power_sled: { dirDeg: 0, o: [60, 100], range: [-400, 400], sled: { style: 'push', poleH: 110, poleX: 0, len: 90, w: 56 }, follow: { grip: 'handle' }, plates: 2, plateD: 45 },
};
function g3sParams(pr) {
  const u = (pr && pr.params) || {}, base = G3S[u.type] || G3S.leg_press, P = {};
  for (const k of new Set([...Object.keys(base), ...Object.keys(u)])) {
    const b = base[k], v = u[k];
    P[k] = v === undefined ? b : v && b && typeof v === 'object' && typeof b === 'object' && !Array.isArray(v) && !Array.isArray(b) ? { ...b, ...v } : v;
  }
  P.type = u.type || 'leg_press';
  const a = (P.dirDeg * Math.PI) / 180; P.dir = [Math.cos(a), Math.sin(a), 0];
  return P;
}
// the followed point (prop-local cm) from get(joint) and grip(side, grip), both prop-local cm
function g3sTarget(P, get, grip) {
  const f = P.follow || {}, sides = f.side && f.side !== 'both' ? [f.side] : ['r', 'l'];
  const one = (sd) => {
    if (f.grip) return grip(sd, f.grip);
    const j = (n) => get(sd === 'l' ? n.replace(/_r$/, '_l') : n), a = j(f.joints[0]), b = f.joints[1] ? j(f.joints[1]) : a, t = f.t ?? 0;
    let p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    if (f.along) p = [p[0] + P.dir[0] * f.along, p[1] + P.dir[1] * f.along, p[2]];
    if (f.off) { const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1; p = [p[0] - (dy / n) * f.off, p[1] + (dx / n) * f.off, p[2]]; }
    if (f.shift) p = [p[0] + f.shift[0], p[1] + f.shift[1], p[2] + (sd === 'l' ? -1 : 1) * f.shift[2]];
    return p;
  };
  const ps = sides.map(one);
  return ps.length === 1 ? ps[0] : [(ps[0][0] + ps[1][0]) / 2, (ps[0][1] + ps[1][1]) / 2, (ps[0][2] + ps[1][2]) / 2];
}
// carriage travel for a target: s (cm along dir, clamped to range) or, with params.pivot (lever mode: the carriage swings
// about the pivot, a left-right axis), the angle in degrees (counter-clockwise seen from +Z, 0 = rest at o)
function g3sTravel(P, target) {
  const r0 = P.ref || P.o;
  if (P.pivot) { const q = P.pivot, a = Math.atan2(target[1] - q[1], target[0] - q[0]) - Math.atan2(r0[1] - q[1], r0[0] - q[0]); let d = (a * 180) / Math.PI; d = ((d + 540) % 360) - 180; return Math.max(P.range[0], Math.min(P.range[1], d)); }
  const s = (target[0] - r0[0]) * P.dir[0] + (target[1] - r0[1]) * P.dir[1]; return Math.max(P.range[0], Math.min(P.range[1], s));
}
function g3sRot(P, p, deg) { const q = P.pivot, a = (deg * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a), dx = p[0] - q[0], dy = p[1] - q[1]; return [q[0] + dx * c - dy * sn, q[1] + dx * sn + dy * c, p[2] || 0]; }
function g3sOrigin(P, s) { return P.pivot ? g3sRot(P, P.o, s) : [P.o[0] + P.dir[0] * s, P.o[1] + P.dir[1] * s, 0]; }
// carriage frame at a travel value: origin, unit vectors of the carriage's x / y axes (rotated in lever mode)
function g3sFrame(P, s) { const a = P.pivot ? (s * Math.PI) / 180 : 0; return { o: g3sOrigin(P, s), x: [Math.cos(a), Math.sin(a), 0], y: [-Math.sin(a), Math.cos(a), 0], deg: P.pivot ? s : 0 }; }
// distance of the target from the travel line or arc (the carriage cannot follow that part)
function g3sOffLine(P, target) { const s = g3sTravel(P, target), r0 = P.ref || P.o, c = P.pivot ? g3sRot(P, r0, s) : [r0[0] + P.dir[0] * s, r0[1] + P.dir[1] * s]; return P.pivot ? Math.hypot(target[0] - c[0], target[1] - c[1]) : Math.abs((target[0] - c[0]) * -P.dir[1] + (target[1] - c[1]) * P.dir[0]); }

// Parts: { t: 'box', c, s, rz (deg about Z), m } and { t: 'cyl', a, b, r, m }; m: frame | pad | steel | plate | accent.
// fixed parts in prop-local cm; carriage parts relative to the carriage origin.
function g3sParts(P) {
  const fixed = [], car = [], d = P.dir, n = [-d[1], d[0], 0], deg = P.dirDeg, rz = P.railZ || 32;
  const add = (L, p) => { L.push(p); return p; };
  const along = (p, s, k = 0) => [p[0] + d[0] * s + n[0] * k, p[1] + d[1] * s + n[1] * k, p[2] || 0];
  const plates = (L, c, axisZ, nPl, D) => { for (let i = 0; i < nPl; i++) { const z = axisZ + Math.sign(axisZ) * (4 + i * 6); add(L, { t: 'cyl', a: [c[0], c[1], z - 2.5], b: [c[0], c[1], z + 2.5], r: D / 2, m: 'plate' }); } };
  if (P.type === 'leg_press' && P.pivot) { // lever leg press: plate on a swinging arm, pivot on a post (or two)
    const pl = P.plate, q = [P.pivot[0], P.pivot[1]], az = P.armZ ?? 34, ol = [P.o[0] - q[0], P.o[1] - q[1]];
    for (const s of [-1, 1]) {
      add(fixed, { t: 'box', c: [q[0], q[1] / 2, s * (az + 8)], s: [8, q[1], 8], rz: 0, m: 'frame' });
      add(fixed, { t: 'box', c: [q[0], 2, s * (az + 8)], s: [60, 4, 9], rz: 0, m: 'frame' });
      // arm: pivot hub -> behind the plate (carriage-local: origin at the plate face centre)
      add(car, { t: 'cyl', a: [-ol[0], -ol[1], s * az], b: [d[0] * 10, d[1] * 10, s * az], r: 2.8, m: 'accent' });
      add(car, { t: 'cyl', a: [d[0] * 10, d[1] * 10, s * az], b: [d[0] * 10, d[1] * 10, s * pl.w / 2.4], r: 2.4, m: 'accent' });
      add(car, { t: 'cyl', a: [-ol[0], -ol[1], s * az - 5], b: [-ol[0], -ol[1], s * az + 5], r: 4.5, m: 'frame' });
      const h = [-ol[0] * 0.6 + d[0] * 6, -ol[1] * 0.6 + d[1] * 6]; add(car, { t: 'cyl', a: [h[0], h[1], s * (az + 4)], b: [h[0], h[1], s * (az + 30)], r: 2.4, m: 'steel' }); plates(car, h, s * (az + 8), P.plates, P.plateD);
    }
    add(fixed, { t: 'cyl', a: [q[0], q[1], -(az + 12)], b: [q[0], q[1], az + 12], r: 3, m: 'steel' });
    const tl = deg - (P.plateTilt || 0), dt = [Math.cos(tl * Math.PI / 180), Math.sin(tl * Math.PI / 180)];
    add(car, { t: 'box', c: [dt[0] * pl.t / 2, dt[1] * pl.t / 2, 0], s: [pl.t, pl.h, pl.w], rz: tl, m: 'accent' });
    add(car, { t: 'box', c: [dt[0] * (pl.t + 3), dt[1] * (pl.t + 3), 0], s: [3, pl.h * 0.8, pl.w * 0.9], rz: tl, m: 'frame' });
    const st = P.seat; add(fixed, { t: 'box', c: [st.x, st.y - st.t / 2, 0], s: [st.d, st.t, st.w], rz: 0, m: 'pad' });
    add(fixed, { t: 'box', c: [st.x, (st.y - st.t) / 2, 0], s: [10, st.y - st.t, 10], rz: 0, m: 'frame' });
    add(fixed, { t: 'box', c: [(st.x + q[0]) / 2, 2, 0], s: [Math.abs(q[0] - st.x) + 40, 4, 10], rz: 0, m: 'frame' });
    const bk = P.back; if (bk) { const ba = (bk.angle * Math.PI) / 180, up = [-Math.sin(ba), Math.cos(ba)], nb = [-Math.cos(ba), -Math.sin(ba)], bc = [bk.x + up[0] * bk.h / 2 + nb[0] * bk.t / 2, bk.y + up[1] * bk.h / 2 + nb[1] * bk.t / 2, 0]; add(fixed, { t: 'box', c: bc, s: [bk.t, bk.h, bk.w], rz: bk.angle, m: 'pad' }); add(fixed, { t: 'box', c: [bc[0] + nb[0] * 8, bc[1] / 2, 0], s: [8, bc[1], 8], rz: 0, m: 'frame' }); }
    const hx = st.hx ?? st.x + 3, hz = st.hz ?? st.w / 2 + 6; for (const s of [-1, 1]) { add(fixed, { t: 'cyl', a: [hx - 13, st.y + 4, s * hz], b: [hx + 13, st.y + 4, s * hz], r: 1.6, m: 'steel' }); add(fixed, { t: 'cyl', a: [hx, st.y - st.t, s * hz], b: [hx, st.y + 4, s * hz], r: 1.4, m: 'steel' }); }
  } else if (P.type === 'leg_press') {
    const pl = P.plate, k = -(pl.h / 2 + 8), hi = P.range[1] + 70, lo = Math.max(P.range[0] - 20, (8 - P.o[1] - n[1] * k) / d[1]);
    // rails under the carriage (perpendicular offset k below the plate centre line), floor legs, a base beam
    for (const s of [-1, 1]) {
      const a = along([P.o[0], P.o[1], s * rz], lo, k), b = along([P.o[0], P.o[1], s * rz], hi, k);
      add(fixed, { t: 'cyl', a, b, r: 3, m: 'steel' });
      add(fixed, { t: 'box', c: [a[0], a[1] / 2, s * rz], s: [7, Math.max(2, a[1]), 7], rz: 0, m: 'frame' });
      add(fixed, { t: 'box', c: [b[0], b[1] / 2, s * rz], s: [7, Math.max(2, b[1]), 7], rz: 0, m: 'frame' });
      add(fixed, { t: 'box', c: [(a[0] + b[0]) / 2, 2, s * rz], s: [Math.abs(b[0] - a[0]) + 10, 4, 9], rz: 0, m: 'frame' });
    }
    add(fixed, { t: 'box', c: [along(P.o, lo, k)[0], 2, 0], s: [9, 4, 2 * rz + 9], rz: 0, m: 'frame' });
    // seat, back pad, side handles
    const st = P.seat; add(fixed, { t: 'box', c: [st.x, st.y - st.t / 2, 0], s: [st.d, st.t, st.w], rz: 0, m: 'pad' });
    add(fixed, { t: 'box', c: [st.x, (st.y - st.t) / 2, 0], s: [10, st.y - st.t, 10], rz: 0, m: 'frame' });
    const bk = P.back, ba = (bk.angle * Math.PI) / 180, up = [-Math.sin(ba), Math.cos(ba)], nb = [-Math.cos(ba), -Math.sin(ba)];
    const bc = [bk.x + up[0] * bk.h / 2 + nb[0] * bk.t / 2, bk.y + up[1] * bk.h / 2 + nb[1] * bk.t / 2, 0];
    add(fixed, { t: 'box', c: bc, s: [bk.t, bk.h, bk.w], rz: bk.angle, m: 'pad' });
    add(fixed, { t: 'box', c: [bc[0] + nb[0] * 8, bc[1] / 2, 0], s: [8, bc[1], 8], rz: 0, m: 'frame' });
    const hx = st.hx ?? st.x + 3, hz = st.hz ?? st.w / 2 + 6; for (const s of [-1, 1]) { add(fixed, { t: 'cyl', a: [hx - 13, st.y + 4, s * hz], b: [hx + 13, st.y + 4, s * hz], r: 1.6, m: 'steel' }); add(fixed, { t: 'cyl', a: [hx, st.y - st.t, s * hz], b: [hx, st.y + 4, s * hz], r: 1.4, m: 'steel' }); }
    // carriage: footplate (face at the origin, perpendicular to dir), sled frame on the rails, plate horns
    add(car, { t: 'box', c: along([0, 0, 0], pl.t / 2), s: [pl.t, pl.h, pl.w], rz: deg - (P.plateTilt || 0), m: 'accent' });
    add(car, { t: 'box', c: along([0, 0, 0], 22, k + 4), s: [40, 8, 2 * rz + 6], rz: deg, m: 'frame' });
    add(car, { t: 'box', c: along([0, 0, 0], 8, k / 2 + 2), s: [6, Math.abs(k) + 4, 2 * rz - 6], rz: deg, m: 'frame' });
    for (const s of [-1, 1]) { const h = along([0, 0, 0], 30, k + 12); add(car, { t: 'cyl', a: [h[0], h[1], s * (rz + 4)], b: [h[0], h[1], s * (rz + 34)], r: 2.4, m: 'steel' }); plates(car, h, s * (rz + 8), P.plates, P.plateD); }
  } else if (P.type === 'hack_squat') {
    const pd = P.pad, pf = P.platform, k = pd.t + 15, hi = P.range[1] + 50, lo = Math.max(P.range[0] - 30 - pd.back, (8 - P.o[1] - n[1] * k) / d[1]); // rails behind the pad
    for (const s of [-1, 1]) {
      const a = along([P.o[0], P.o[1], s * rz], lo, k), b = along([P.o[0], P.o[1], s * rz], hi, k);
      add(fixed, { t: 'cyl', a, b, r: 3, m: 'steel' });
      add(fixed, { t: 'box', c: [b[0], b[1] / 2, s * rz], s: [7, b[1], 7], rz: 0, m: 'frame' });
      add(fixed, { t: 'box', c: [a[0], Math.max(2, a[1]) / 2, s * rz], s: [7, Math.max(2, a[1]), 7], rz: 0, m: 'frame' });
      add(fixed, { t: 'box', c: [(a[0] + b[0]) / 2, 2, s * rz], s: [Math.abs(b[0] - a[0]) + 10, 4, 9], rz: 0, m: 'frame' });
    }
    // foot platform (top surface centre at (x, y), toes up by `angle`), on a block to the floor
    const pa = (pf.angle * Math.PI) / 180, pn = [-Math.sin(pa), Math.cos(pa)];
    add(fixed, { t: 'box', c: [pf.x - pn[0] * 2, pf.y - pn[1] * 2, 0], s: [pf.d, 4, pf.w], rz: pf.angle, m: 'accent' });
    add(fixed, { t: 'box', c: [pf.x, (pf.y - 4) / 2, 0], s: [pf.d * 0.8, Math.max(2, pf.y - 4), pf.w * 0.8], rz: 0, m: 'frame' });
    // carriage: back pad along the rails (behind the followed point), shoulder pads over the shoulders, handles, horns
    add(car, { t: 'box', c: along([0, 0, 0], -pd.back + pd.len / 2, pd.t / 2 + (pd.gap ?? 9)), s: [pd.len, pd.t, pd.w], rz: deg, m: 'pad' });
    for (const s of [-1, 1]) {
      add(car, { t: 'box', c: [0, 5, s * 13], s: [16, 8, 9], rz: 0, m: 'pad' });
      add(car, { t: 'cyl', a: along([0, 7, s * 13], 0, 18), b: [0, 7, s * 13], r: 2.2, m: 'frame' });
      const hd = pd.handle || [10, 26]; add(car, { t: 'cyl', a: [hd[0], 4, s * hd[1]], b: [hd[0], -16, s * hd[1]], r: 1.6, m: 'steel' }); add(car, { t: 'cyl', a: [0, 7, s * 17], b: [hd[0], 4, s * hd[1]], r: 1.6, m: 'steel' });
      const h = along([0, 0, 0], -12, pd.t + 20); add(car, { t: 'cyl', a: [h[0], h[1], s * (rz + 4)], b: [h[0], h[1], s * (rz + 34)], r: 2.4, m: 'steel' }); plates(car, h, s * (rz + 8), P.plates, P.plateD);
    }
    add(car, { t: 'box', c: along([0, 0, 0], -pd.back + pd.len / 2, pd.t + 13), s: [pd.len, 6, 2 * rz + 6], rz: deg, m: 'frame' });
  } else { // power sled: the whole sled moves; carriage origin at the followed point (hands)
    const sl = P.sled, oy = P.o[1], back = sl.style === 'push' ? 0 : 1; // drag: the sled sits in front of the hands
    const x0 = back ? 120 : 10, L2 = sl.len, w = sl.w; // sled body x (relative to the hands) and size
    for (const s of [-1, 1]) add(car, { t: 'box', c: [x0 + L2 / 2, -oy + 3, s * w / 2], s: [L2 + 10, 6, 6], rz: 0, m: 'steel' }); // skids
    add(car, { t: 'box', c: [x0 + L2 / 2, -oy + 9, 0], s: [L2 * 0.7, 4, w], rz: 0, m: 'frame' });
    add(car, { t: 'cyl', a: [x0 + L2 / 2, -oy + 9, 0], b: [x0 + L2 / 2, -oy + 45, 0], r: 2.5, m: 'steel' }); // plate post
    for (let i = 0; i < P.plates; i++) add(car, { t: 'cyl', a: [x0 + L2 / 2, -oy + 12 + i * 6, 0], b: [x0 + L2 / 2, -oy + 17 + i * 6, 0], r: P.plateD / 2, m: 'plate', vertical: true });
    if (!back) { // push poles: from the sled's front corners up to the handles at the hands
      for (const s of [-1, 1]) { add(car, { t: 'cyl', a: [x0 + 4, -oy + 8, s * (w / 2 - 4)], b: [0, 0, s * 22], r: 2.2, m: 'steel' }); add(car, { t: 'cyl', a: [0, 0, s * 16], b: [0, 0, s * 28], r: 1.9, m: 'pad' }); }
    } else { // drag: handle bar at the hands, two straps to the sled's ring
      add(car, { t: 'cyl', a: [0, 0, -14], b: [0, 0, 14], r: 1.8, m: 'pad' });
      for (const s of [-1, 1]) add(car, { t: 'cyl', a: [0, 0, s * 12], b: [x0, -oy + 14, s * 4], r: 0.8, m: 'strap' });
      add(car, { t: 'box', c: [x0, -oy + 14, 0], s: [4, 6, 12], rz: 0, m: 'steel' });
    }
  }
  return { fixed, car };
}

if (typeof GEAR !== 'undefined') {
  GEAR.prop('sled', {
    build(pr, ctx) {
      const { THREE, U } = ctx, P = g3sParams(pr), parts = g3sParts(P), g = new THREE.Group();
      const M = { frame: ctx.iron(0x2b2f36), steel: ctx.steel(), plate: ctx.iron(0x22252b), pad: new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.75 }),
        accent: new THREE.MeshStandardMaterial({ color: pr.color ? new THREE.Color(pr.color) : 0xb8342e, roughness: 0.5, metalness: 0.3 }), strap: new THREE.MeshStandardMaterial({ color: 0x30343c, roughness: 0.9 }) };
      const mk = (p) => {
        if (p.t === 'box') { const b = new THREE.Mesh(new THREE.BoxGeometry(p.s[0] * U, p.s[1] * U, p.s[2] * U), M[p.m]); b.position.set(p.c[0] * U, p.c[1] * U, p.c[2] * U); b.rotation.z = ((p.rz || 0) * Math.PI) / 180; return b; }
        const A = new THREE.Vector3(...p.a).multiplyScalar(U), B = new THREE.Vector3(...p.b).multiplyScalar(U), dv = B.clone().sub(A), L = Math.max(1e-4, dv.length());
        const c = new THREE.Mesh(new THREE.CylinderGeometry(p.r * U, p.r * U, L, p.m === 'plate' ? 32 : 14), M[p.m]); c.position.copy(A).addScaledVector(dv, 0.5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dv.multiplyScalar(1 / L)); return c;
      };
      for (const p of parts.fixed) g.add(mk(p));
      const car = new THREE.Group(); car.name = 'carriage';
      for (const p of parts.car) { const m = mk(p); m.castShadow = true; car.add(m); }
      const o = g3sOrigin(P, 0); car.position.set(o[0] * U, o[1] * U, 0); g.add(car); // lever mode: rotated about z at the plate (= a swing about the pivot)
      g.userData.moving = [car]; g.userData.g3s = P;
      return g;
    },
    update(obj, live) {
      const P = obj.userData.g3s, U = live.U, car = obj.userData.moving[0];
      const loc = (p) => { const v = live.toLocal(p, obj); return [v.x / U, v.y / U, v.z / U]; };
      const s = g3sTravel(P, g3sTarget(P, (j) => loc(live.pt(j)), (sd, gr) => loc(live.grip(sd, gr)))), o = g3sOrigin(P, s);
      car.position.set(o[0] * U, o[1] * U, 0); if (P.pivot) car.rotation.z = (s * Math.PI) / 180;
    },
  });
  // body-mounted belts (between the hip joints; the two-joint mount keeps the item upright)
  GEAR.heldItem('sled', {
    mesh(pr, ctx) {
      const THREE = ctx.THREE, U_ = 0.01, p = pr.params || {}, g = new THREE.Group(); g.name = pr.id;
      const strap = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.85 }), st = ctx.steel ? ctx.steel() : new THREE.MeshStandardMaterial({ color: 0xaab0b8, metalness: 0.8, roughness: 0.3 });
      const belt = new THREE.Mesh(new THREE.TorusGeometry(17 * U_, 2.2 * U_, 8, 36), strap); belt.rotation.x = Math.PI / 2; belt.scale.set(1, 1.25, 1); g.add(belt); // ellipse around the hips (x: front-back)
      const ring = new THREE.Mesh(new THREE.TorusGeometry(3 * U_, 0.7 * U_, 8, 20), st); ring.position.set(0, (p.ringY ?? 0) * U_, -(p.ring ?? 21) * U_); ring.rotation.y = Math.PI / 2; g.add(ring); // the two-joint mount: local x = toward the right hip, local -z = forward
      if (p.item === 'dip_belt') {
        const drop = (p.drop ?? 45) * U_, D = (p.plateD ?? 35) * U_;
        for (const s of [-1, 1]) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * U_, 0.5 * U_, 1, 6), st); const a = new THREE.Vector3(s * 8 * U_, 0, -16 * U_), b = new THREE.Vector3(0, -drop + D / 2, 0), dv = b.clone().sub(a); ch.scale.y = dv.length(); ch.position.copy(a).addScaledVector(dv, 0.5); ch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dv.normalize()); g.add(ch); }
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(D / 2, D / 2, 4 * U_, 32), new THREE.MeshStandardMaterial({ color: 0x22252b, roughness: 0.55, metalness: 0.35 })); plate.rotation.z = Math.PI / 2; plate.position.set(0, -drop, 0); g.add(plate); // disc in the sagittal plane, between the legs
      }
      if (p.mount === 'pelvis') { const w = new THREE.Group(); w.name = pr.id; g.name = ''; g.rotation.y = -Math.PI / 2; w.add(g); return w; } // pelvis frame: forward = +x
      return g;
    },
  });
  // medicine ball on the 'plate' held item (params.shape 'ball'); other plates go to the earlier plug-in
  const g3PrevPlate = GEAR.held.plate;
  GEAR.heldItem('plate', {
    mesh(pr, ctx) {
      if (!(pr.params && pr.params.shape === 'ball')) return g3PrevPlate.mesh(pr, ctx);
      const THREE = ctx.THREE, D = ((pr.size && pr.size[1]) || 30) * 0.01, g = new THREE.Group(); g.name = pr.id;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(D / 2, 32, 20), new THREE.MeshStandardMaterial({ color: pr.color ? new THREE.Color(pr.color) : 0x3a4150, roughness: 0.8 }));
      g.add(ball);
      const seam = new THREE.Mesh(new THREE.TorusGeometry(D / 2 + 0.001, 0.003, 6, 40), new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.6 })); g.add(seam);
      const two = pr.attach && pr.attach.with; if (!two) ball.position.x = D / 2; // one hand: the ball rests past the grip
      return g;
    },
    orient: g3PrevPlate && g3PrevPlate.orient ? (o) => g3PrevPlate.orient(o) : undefined,
    lineR: g3PrevPlate && g3PrevPlate.lineR, lineColor: g3PrevPlate && g3PrevPlate.lineColor,
  });
}
if (typeof module !== 'undefined' && module.exports) module.exports = { G3S, g3sParams, g3sTarget, g3sTravel, g3sOrigin, g3sFrame, g3sRot, g3sOffLine, g3sParts };
