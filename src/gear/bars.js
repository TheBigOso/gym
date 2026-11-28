// Gear pack: specialty bars, landmine, rings and plates. Held items (GEAR.heldItem) plus the landmine floor pivot (GEAR.prop).
// Authoring helpers (grip points, sleeve angle, strap lengths, clearances): build/families/gear-bars.js.
// Units here: pr.size and pr.params in cm, meshes in metres. Held meshes follow the player's grip frame: +X along the
// handle (little-finger side), +Y back along the fingers (-Y past the knuckles), +Z = X x Y (palm side of the right hand).
//
// pr.params keys (all optional):
//   ez_bar   (two hands, attach.with; grip 'bar'): { width: 44 (cm between the grip points; must match the author's grip),
//            grip: 'outer' | 'inner' (which camber the hands hold), camber: 22 (deg, camber angle to the bar axis),
//            length: 120, plates: 1, plateD: 32 }. The gripped cambers run along the hands' grip axes (orient), so the bar
//            turns about its own axis with the hands.
//   trap_bar (two hands, attach.with; grip 'handle'): { width: 62 (cm between the handle centres), rise: 0 (cm the handles
//            sit above the frame: 0 flush, about 10 for high handles), plates: 1, plateD: 45 }. Handles run front-to-back
//            along the hands' grip axes; the hexagonal frame lies across them, sleeves out to the sides.
//   landmine held (one hand, grip 'handle', pr.anchor = the pivot point): { plateAt: -34 (cm along the sleeve from the grip:
//            negative toward the pivot, where plates are loaded; positive beyond the hand), plates: 1, plateD: 38 }. The
//            sleeve lies in the fist along the thumb side (grip frame -X) and points at the pivot when the author keeps it
//            aligned (gear-bars.js landmineObjective); the shaft is the gear line from the anchor to the grip.
//   landmine prop (no attach; center = the pivot on the floor): { pivotY: 8 (cm, the anchor height) }.
//   rings    (one hand per prop, grip 'handle', pr.anchor = the strap's top): { style: 'ring' | 'handle', ringD: 18 (inner
//            diameter), tilt: 0 (deg about the grip axis from the finger direction toward the grip frame +Z; the authoring
//            helper fits it so the ring points up its strap) }. The strap is the gear line from the anchor to the grip.
//   plate    (size[1] = plate diameter, default 45): one hand = pinched at the rim, the plate hanging past the knuckles;
//            two hands (attach.with) = held at the rim at 3 and 9 o'clock (grip width = diameter - 3 cm), plate in the
//            plane of the two grip axes. { thick: 4 (cm) }.
const BARS_RUB = () => new THREE.MeshStandardMaterial({ color: 0x23262c, roughness: 0.85 });
const barsIron = (pr, c = 0x2b2f36) => new THREE.MeshStandardMaterial({ color: pr.color ? new THREE.Color(pr.color) : c, roughness: 0.55, metalness: 0.35 });
const barsP = (pr) => pr.params || {};
// cylinder of radius r (m) between points a and b (m, Vector3)
function barsSeg(a, b, r, mat, seg = 14) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length(), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, Math.max(1e-4, len), seg), mat);
  m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
}
// weight plate disc with its axis along `axis` ('x' | 'z'), centred at (x, y, z) m, diameter D and thickness w (m)
function barsPlate(pr, D, w, axis, pos) {
  const g = new THREE.Group(), iron = barsIron(pr), st = steelMat();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(D / 2, D / 2, w, 36), iron);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, w + 0.004, 18), st);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(D / 2 - 0.008, 0.008, 6, 36), iron); lip.rotation.x = Math.PI / 2;
  g.add(disc, hub, lip);
  if (axis === 'x') g.rotation.z = Math.PI / 2; else g.rotation.x = Math.PI / 2;
  g.position.copy(pos); return g;
}
// the grip axes (+X of each hand's grip frame) of the two hands, matched to pR / pL
function barsAxes({ pR, g1, g2, THREE: T }) {
  const a1 = new T.Vector3(1, 0, 0).applyQuaternion(g1.q), a2 = new T.Vector3(1, 0, 0).applyQuaternion(g2.q);
  return g1.p.distanceToSquared(pR) < g2.p.distanceToSquared(pR) ? { aR: a1, aL: a2 } : { aR: a2, aL: a1 };
}

/* ---------------- EZ curl bar ---------------- */
// Zigzag (right half, cm, bar plane x-y; y = the camber offset) with the gripped camber centred on the grip point (g, 0)
// and rising outward (+y) at the camber angle. Mirrored for the left half.
function ezPoints(p) {
  const g = (p.width ?? 44) / 2, th = ((p.camber ?? 22) * Math.PI) / 180, h = 6, seg = 12, half = (p.length ?? 120) / 2, sleeve0 = half - 25;
  const c = Math.cos(th), s = Math.sin(th), P2 = [g - h * c, -h * s], P3 = [g + h * c, h * s];
  if ((p.grip || 'outer') === 'inner') { const P4 = [P3[0] + seg * c, P3[1] - seg * s]; return { pts: [[0, P2[1]], P2, P3, P4, [sleeve0, P4[1]]], sleeve0, half, ys: P4[1] }; }
  const P1 = [P2[0] - seg * c, P2[1] + seg * s];
  return { pts: [[0, P1[1]], P1, P2, P3, [sleeve0, P3[1]]], sleeve0, half, ys: P3[1] };
}
GEAR.heldItem('ez_bar', {
  mesh(pr) {
    const p = barsP(pr), U_ = 0.01, st = steelMat(), g = new THREE.Group(), z = ezPoints(p), n = p.plates ?? 1, D = (p.plateD ?? (pr.size && pr.size[1]) ?? 32) * U_;
    for (const sg of [1, -1]) {
      const v = z.pts.map(([x, y]) => new THREE.Vector3(sg * x * U_, y * U_, 0));
      for (let i = 0; i + 1 < v.length; i++) g.add(barsSeg(v[i], v[i + 1], 0.0125, st));
      for (let i = 1; i + 1 < v.length; i++) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 10, 8), st); k.position.copy(v[i]); g.add(k); }
      g.add(barsSeg(new THREE.Vector3(sg * z.sleeve0 * U_, z.ys * U_, 0), new THREE.Vector3(sg * z.half * U_, z.ys * U_, 0), 0.025, st));
      const col = cylX(0.038, 0.025, st); col.position.set(sg * (z.sleeve0 + 1.2) * U_, z.ys * U_, 0); g.add(col);
      for (let i = 0; i < n; i++) g.add(barsPlate(pr, D, 0.035, 'x', new THREE.Vector3(sg * (z.sleeve0 + 4.5 + i * 4) * U_, z.ys * U_, 0)));
    }
    return g;
  },
  // y = the camber offset direction: the part of each hand's grip axis across the bar (outward axes of both hands agree)
  orient(o) {
    const x = o.pR.clone().sub(o.pL).normalize(), { aR, aL } = barsAxes(o);
    const sR = aR.clone().multiplyScalar(Math.sign(aR.dot(x)) || 1), sL = aL.clone().multiplyScalar(-(Math.sign(aL.dot(x)) || 1));
    const w = sR.addScaledVector(x, -sR.dot(x)).add(sL.addScaledVector(x, -sL.dot(x)));
    return w.lengthSq() > 1e-4 ? { y: w.normalize() } : null;
  },
});

/* ---------------- trap (hex) bar ---------------- */
// frame in the bar's local space (cm): grip points at (+-hw, 0, 0), handles along z, hexagon around the lifter
function trapFrame(p) {
  const hw = (p.width ?? 62) / 2, side = hw + 9, fz = 22, tip = 46, rise = p.rise ?? 0;
  return { hw, side, fz, tip, rise, hex: [[side, fz], [0, tip], [-side, fz], [-side, -fz], [0, -tip], [side, -fz]], hl: 12, sleeveOut: side + 38 };
}
GEAR.heldItem('trap_bar', {
  mesh(pr) {
    const p = barsP(pr), U_ = 0.01, f = trapFrame(p), st = steelMat(), frame = barsIron({}, 0x2b2f36), g = new THREE.Group(), y0 = -f.rise * U_;
    const v = (x, y, z) => new THREE.Vector3(x * U_, y, z * U_);
    for (let i = 0; i < 6; i++) { const a = f.hex[i], b = f.hex[(i + 1) % 6]; g.add(barsSeg(v(a[0], y0, a[1]), v(b[0], y0, b[1]), 0.016, frame, 8)); }
    const n = p.plates ?? 1, D = (p.plateD ?? (pr.size && pr.size[1]) ?? 45) * U_;
    for (const s of [1, -1]) {
      g.add(barsSeg(v(s * f.hw, 0, -f.hl), v(s * f.hw, 0, f.hl), 0.016, st));                     // knurled handle
      for (const zz of [-f.hl, f.hl]) { g.add(barsSeg(v(s * f.hw, 0, zz), v(s * f.side, y0, zz), 0.014, frame, 8)); }
      g.add(barsSeg(v(s * f.side, y0, 0), v(s * f.sleeveOut, y0, 0), 0.025, st));                   // sleeve
      const col = cylX(0.04, 0.025, st); col.position.set(s * (f.side + 2) * U_, y0, 0); g.add(col);
      for (let i = 0; i < n; i++) g.add(barsPlate(pr, D, 0.055, 'x', v(s * (f.side + 6 + i * 6), y0, 0)));
    }
    return g;
  },
  // the handles (local z) follow the hands' grip axes; the frame is level across them
  orient(o) {
    const x = o.pR.clone().sub(o.pL).normalize(), { aR, aL } = barsAxes(o);
    const h = aR.clone().add(aL.clone().multiplyScalar(Math.sign(aR.dot(aL)) || 1)); h.addScaledVector(x, -h.dot(x));
    if (h.lengthSq() < 1e-4) return null;
    const y = h.normalize().cross(x); if (y.y < 0) y.negate(); return { y };
  },
});

/* ---------------- landmine ---------------- */
// Held end: sleeve in the fist along the thumb side (-X), plates on it toward the pivot; the shaft is the gear line
GEAR.heldItem('landmine', {
  lineR: 0.014, lineColor: 0xb9bec6,
  mesh(pr) {
    const p = barsP(pr), U_ = 0.01, st = steelMat(), g = new THREE.Group(), L0 = 41, out = 4;      // Olympic sleeve 41 cm, 4 cm past the hand
    const sl = cylX(0.025, (L0) * U_, st); sl.position.x = (out - L0 / 2) * U_; g.add(sl);
    const cap = cylX(0.027, 0.01, st); cap.position.x = out * U_; g.add(cap);
    const col = cylX(0.04, 0.03, st); col.position.x = -(L0 - out + 1.5) * U_; g.add(col);
    const n = p.plates ?? 1, D = (p.plateD ?? (pr.size && pr.size[1]) ?? 38) * U_, at = p.plateAt ?? -(L0 - out - 6);
    const dir = at < 0 ? 1 : -1; // stack plates from the inner collar toward the hand (or outward past the hand)
    for (let i = 0; i < n; i++) g.add(barsPlate(pr, D, 0.05, 'x', new THREE.Vector3((at + dir * i * 5.5) * U_, 0, 0)));
    return g;
  },
});
// Floor pivot: base plate and a pivot housing at the anchor height
GEAR.prop('landmine', {
  build(pr, ctx) {
    const p = barsP(pr), U_ = ctx.U, g = new THREE.Group(), base = ctx.iron(0x262a31), st = ctx.steel(), py = (p.pivotY ?? 8) * U_;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.34), base); plate.position.y = 0.006; g.add(plate);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, py, 16), base); post.position.y = py / 2; g.add(post);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.045, 18, 12), st); ball.position.y = py; g.add(ball);
    return g;
  },
});

/* ---------------- rings / suspension straps ---------------- */
GEAR.heldItem('rings', {
  lineR: 0.012, lineColor: 0x1d2025,
  mesh(pr) {
    const p = barsP(pr), U_ = 0.01, g = new THREE.Group(), tilt = ((p.tilt ?? 0) * Math.PI) / 180;
    const holder = new THREE.Group(); holder.rotation.x = -tilt; g.add(holder); // rotation about the grip axis: -Y toward +Z
    if ((p.style || 'ring') === 'handle') { // suspension-trainer handle: foam grip and a webbing loop up to the strap
      holder.add(cylX(0.018, 0.13, BARS_RUB()));
      const strap = new THREE.MeshStandardMaterial({ color: 0x1d2025, roughness: 0.8 });
      for (const s of [1, -1]) holder.add(barsSeg(new THREE.Vector3(s * 0.065, 0, 0), new THREE.Vector3(0, -0.11, 0), 0.006, strap, 6));
    } else { // wooden gymnastic ring, gripped at its bottom; the strap meets its top
      const R0 = ((p.ringD ?? 18) / 2 + 1.4) * U_, wood = new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 0.6 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R0, 0.014, 10, 40), wood); ring.position.y = -R0; holder.add(ring);
    }
    return g;
  },
});

/* ---------------- weight plate ---------------- */
GEAR.heldItem('plate', {
  mesh(pr) {
    const p = barsP(pr), U_ = 0.01, D = ((pr.size && pr.size[1]) || 45) * U_, w = (p.thick ?? 4) * U_, g = new THREE.Group();
    const two = !!(pr.attach && pr.attach.with);
    g.add(barsPlate(pr, D, w, 'z', new THREE.Vector3(0, two ? 0 : -(D / 2 - 0.03), 0)));
    return g;
  },
  // two hands at 3 and 9 o'clock: the rim runs along each grip axis, so the plate lies in the plane of x and the grip axes
  orient(o) {
    const x = o.pR.clone().sub(o.pL).normalize(), { aR, aL } = barsAxes(o);
    const h = aR.clone().add(aL.clone().multiplyScalar(Math.sign(aR.dot(aL)) || 1)); h.addScaledVector(x, -h.dot(x));
    return h.lengthSq() > 1e-4 ? { y: h.normalize() } : null;
  },
});
