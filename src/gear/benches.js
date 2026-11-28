// Gear pack: special benches and stations (static props). Kinds:
//   preacher_bench        seat + arm pad sloping down away from the athlete
//   decline_bench         declined board (head end low, toward -X) with ankle rollers at the high end (+X)
//   hyperextension_bench  back extension / roman chair: foot plate + heel roller low at -X, hip pad toward +X;
//                         angle 45 (legs inclined 45 degrees) or 90 (legs horizontal), variant 'ghd' (glute-ham developer)
//   dip_station           parallel bars along X; variant 'captain' adds a back pad, forearm rests and handles
// The athlete faces +X in each prop's own frame (turn the prop with rotY). All parts are static: no update hook.
//
// One source of truth: benchGeo(kind, params) returns the parts (boxes, cylinders) and the named surfaces and points in
// prop-local cm. The player builds meshes from it here; build/families/gear-benches.js requires this same file in node
// (module.exports at the bottom) to place the body on the pads and to check clearances, so the helpers always match
// what is drawn.
//
// pr.params keys (all cm or degrees; every key optional):
//  preacher_bench (origin: seat centre on the floor)
//    seatH 50 (seat top), seatD 30, seatW 32, padAngle 45 (pad surface below horizontal, sloping down toward +X),
//    padTop [28, 98] (x, y of the pad's top/back edge on its surface, centre line), padLen 38 (along the slope),
//    padW 56, padT 7
//  decline_bench (origin: floor point below the high end of the board surface)
//    angle 25 (decline), topH 88 (board surface height at the high end), padLen 172, padW 30, padT 6,
//    rollerAt 9 (ankle roller axis, cm down the board from the high end), rollerUp 13 (roller axis above the surface),
//    rollerR 5.5, rollerGap 6 (gap between the two roller halves at z = 0, where the post is)
//  hyperextension_bench (origin: floor point below F, the foot plate point the soles press on, on the leg line)
//    angle 45 (45 = legs at 45 degrees, 90 = legs horizontal; legs rise at 90 - angle toward +X), variant 'ghd',
//    footH (height of F; default 35 for 45, 95 for 90 / ghd), padDist (F to the pad top edge along the leg line;
//    84, ghd 56), padLen 30, padW 46, padT 8, padDrop 8 (pad surface below the leg line through F), rollerS 9,
//    rollerUp 9 (heel roller axis: along the leg line, and above it), rollerR 4.5,
//    ghd: padR 13 (round thigh pad radius), frontRoller true (second roller in front of the ankles)
//  dip_station (origin: floor midway between the bars)
//    barH 125 (bar axis height), gap 52 (bar centre to centre), barLen 60, barR 2.2, variant 'captain':
//    armH 120 (forearm rest top), armLen 44, armW 9, backX -16 (back pad surface x), backY [78, 128], backW 32,
//    handleX 18 (handle x), handleH 12
const benchGeo = (() => {
  const D2R = Math.PI / 180;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sc = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const lin = (o, ...terms) => terms.reduce((acc, [v, s]) => add(acc, sc(v, s)), o.slice());
  // parts: box { c, s, rz (deg about Z), m }, cyl { a, b (axis end points), r, m }; m: 'pad' | 'frame' | 'steel'
  const box = (c, s, rz = 0, m = 'frame') => ({ t: 'box', c, s, rz, m });
  const cyl = (a, b, r, m = 'steel') => ({ t: 'cyl', a, b, r, m });
  const post = (x, y0, y1, z, w = 6, m = 'frame') => box([x, (y0 + y1) / 2, z], [w, Math.max(0.5, y1 - y0), w], 0, m);

  function preacher(P) {
    const seatH = P.seatH ?? 50, seatD = P.seatD ?? 30, seatW = P.seatW ?? 32, a = (P.padAngle ?? 45) * D2R;
    const [tx, ty] = P.padTop || [28, 98], len = P.padLen ?? 38, w = P.padW ?? 56, th = P.padT ?? 7;
    const T = [tx, ty, 0], u = [Math.cos(a), -Math.sin(a), 0], n = [Math.sin(a), Math.cos(a), 0];
    const low = lin(T, [u, len]), col = low[0] + 12;
    const parts = [
      box([0, seatH - 4, 0], [seatD, 8, seatW], 0, 'pad'),
      post(0, 4, seatH - 8, 0),
      box([(col - 16) / 2, 2, 0], [col + 16, 4, 7]),                          // base rail between the feet
      box([-8, 2, 0], [8, 4, 44]), box([col, 2, 0], [10, 4, 50]),              // floor feet
      box(lin(T, [u, len / 2], [n, -th / 2]), [len, th, w], -a / D2R, 'pad'),   // arm pad
      box(lin(T, [u, -1.5], [n, -th / 2]), [5, th + 1, w], -a / D2R, 'pad'),     // rolled top edge under the armpits
      post(col, 4, low[1] - th * Math.cos(a), 0, 7),
      box([(low[0] + col) / 2 - 2, low[1] - th * Math.cos(a) - 1, 0], [col - low[0] + 10, 4, 10]),   // bracket under the pad's low end
    ];
    return { parts, surfaces: { seat: { o: [0, seatH, 0], n: [0, 1, 0], size: [seatD, seatW] }, pad: { o: T, u, n, len, width: w, thick: th } }, points: { padTop: T, padLow: low } };
  }

  function decline(P) {
    const a = (P.angle ?? 25) * D2R, topH = P.topH ?? 88, len = P.padLen ?? 172, w = P.padW ?? 30, th = P.padT ?? 6;
    const rAt = P.rollerAt ?? 9, rUp = P.rollerUp ?? 13, rR = P.rollerR ?? 5.5, gap = P.rollerGap ?? 6;
    const H = [0, topH, 0], u = [-Math.cos(a), -Math.sin(a), 0], n = [-Math.sin(a), Math.cos(a), 0]; // u: down the board
    const low = lin(H, [u, len]), rc = lin(H, [u, rAt], [n, rUp]), half = w / 2 + 2;
    const under = (s) => lin(H, [u, s], [n, -th]);
    const parts = [
      box(lin(H, [u, len / 2], [n, -th / 2]), [len, th, w], a / D2R, 'pad'),
      box(lin(H, [u, len / 2], [n, -th - 2]), [len - 6, 4, 8], a / D2R),          // spine under the board
      post(under(14)[0], 0, under(14)[1], 0, 7), box([under(14)[0], 2, 0], [12, 4, 56]),
      post(under(len - 14)[0], 0, under(len - 14)[1], 0, 6), box([under(len - 14)[0], 2, 0], [12, 4, 50]),
      post(rc[0], under(rAt)[1], rc[1], 0, 4.5),                                 // roller post between the feet
      cyl([rc[0], rc[1], gap / 2], [rc[0], rc[1], half], rR, 'pad'), cyl([rc[0], rc[1], -gap / 2], [rc[0], rc[1], -half], rR, 'pad'),
      cyl([rc[0], rc[1], -half - 1], [rc[0], rc[1], half + 1], 1.2, 'steel'),
    ];
    return { parts, surfaces: { pad: { o: H, u, n, len, width: w, thick: th } }, points: { high: H, low, roller: rc, rollerR: rR, rollerHalf: [gap / 2, half] } };
  }

  function hyper(P) {
    const ghd = P.variant === 'ghd', ang = ghd ? 90 : P.angle ?? 45, e = (90 - ang) * D2R;
    const fH = P.footH ?? (e < 0.2 ? 95 : 35), dist = P.padDist ?? (ghd ? 56 : 84), len = P.padLen ?? 30, w = P.padW ?? 46, th = P.padT ?? 8;
    const drop = P.padDrop ?? 8, rS = P.rollerS ?? 9, rUp = P.rollerUp ?? 9, rR = P.rollerR ?? 4.5, padR = P.padR ?? 13;
    const F = [0, fH, 0], d = [Math.cos(e), Math.sin(e), 0], n = [-Math.sin(e), Math.cos(e), 0], rz = e / D2R;
    const T = lin(F, [d, dist], [n, -drop]), heel = lin(F, [d, rS], [n, rUp]);
    const parts = [
      box(lin(F, [d, -1.5], [n, -8]), [3, 30, 36], rz, 'frame'),                          // foot plate (soles on its +d face)
      cyl(lin(heel, [[0, 0, 1], -16]), lin(heel, [[0, 0, 1], 16]), rR, 'pad'),            // heel roller over the Achilles
    ];
    const pads = {};
    if (ghd) {
      const pc = lin(F, [d, dist - padR], [n, -drop - padR]);                               // round thigh pad, top at T
      parts.push(cyl(lin(pc, [[0, 0, 1], -w / 2]), lin(pc, [[0, 0, 1], w / 2]), padR, 'pad'));
      pads.pad = { kind: 'cyl', c: pc, r: padR, axis: [0, 0, 1], width: w };
      if (P.frontRoller !== false) { const fr = lin(F, [d, rS], [n, -rUp]); parts.push(cyl(lin(fr, [[0, 0, 1], -16]), lin(fr, [[0, 0, 1], 16]), rR, 'pad')); pads.frontRoller = fr; }
    } else {
      parts.push(box(lin(T, [d, -len / 2], [n, -th / 2]), [len, th, w], rz, 'pad'));
      parts.push(cyl(lin(T, [n, -th / 2], [[0, 0, 1], -w / 2]), lin(T, [n, -th / 2], [[0, 0, 1], w / 2]), th / 2, 'pad')); // rounded top edge
      pads.pad = { kind: 'plane', o: T, u: sc(d, -1), n, len, width: w, thick: th };
    }
    // frame: a beam below the leg line from the foot plate to the pad, posts to the floor, floor rails
    const b0 = lin(F, [n, -24]), b1 = lin(F, [d, dist - (ghd ? padR : len / 2)], [n, -drop - (ghd ? 2 * padR : th) - 3]);
    const bl = Math.hypot(b1[0] - b0[0], b1[1] - b0[1]), bang = Math.atan2(b1[1] - b0[1], b1[0] - b0[0]) / D2R;
    parts.push(box(sc(add(b0, b1), 0.5), [bl, 6, 8], bang));
    for (const p of [b0, b1]) if (p[1] > 3) { parts.push(post(p[0], 0, p[1], 0, 6)); parts.push(box([p[0], 2, 0], [10, 4, 60])); }
    parts.push(box([(b0[0] + b1[0]) / 2, 2, 0], [Math.abs(b1[0] - b0[0]) + 10, 4, 7]));
    return { parts, surfaces: Object.assign({ footPlate: { o: F, n: d, up: n } }, pads), points: { F, heelRoller: heel, rollerR: rR, padTop: T, legDir: d, legNormal: n, elevation: e / D2R } };
  }

  function dip(P) {
    const cap = P.variant === 'captain', H = P.barH ?? 125, g = P.gap ?? 52, L = P.barLen ?? 60, r = P.barR ?? 2.2;
    const parts = [], bars = {}, surfaces = {}, points = {};
    if (!cap) {
      for (const s of [1, -1]) {
        const z = (s * g) / 2;
        parts.push(cyl([-L / 2 - 3, H, z], [L / 2 + 3, H, z], r, 'steel'));
        for (const x of [-L / 2, L / 2]) parts.push(post(x, 0, H - r, z, 5));
        parts.push(box([0, 2, z], [L + 30, 4, 7]));
        bars[s > 0 ? 'r' : 'l'] = { a: [-L / 2, H, z], b: [L / 2, H, z], r };
      }
      parts.push(box([-L / 2, 30, 0], [5, 5, g]), box([L / 2, 30, 0], [5, 5, g]));
    } else {
      const aH = P.armH ?? 120, aL = P.armLen ?? 44, aW = P.armW ?? 9, bx = P.backX ?? -16, [by0, by1] = P.backY || [78, 128], bw = P.backW ?? 32, hx = P.handleX ?? 18, hh = P.handleH ?? 12;
      const x0 = bx - 4, x1 = x0 + aL;
      parts.push(box([bx - 3, (by0 + by1) / 2, 0], [6, by1 - by0, bw], 0, 'pad'));          // back pad (surface at x = bx)
      for (const s of [1, -1]) {
        const z = (s * g) / 2;
        parts.push(box([(x0 + x1) / 2, aH - 2.5, z], [aL, 5, aW], 0, 'pad'));                 // forearm rest
        parts.push(box([(x0 + x1) / 2, aH - 7, z], [aL, 4, 5]));
        parts.push(cyl([hx, aH, z], [hx, aH + hh, z], 1.6, 'steel'));                          // vertical handle
        parts.push(post(bx - 10, 0, by1 + 4, z, 6), box([bx - 10 + 30, 2, z], [70, 4, 7]));   // rear upright and floor rail
        parts.push(box([(bx - 10 + x0) / 2 + 2, aH - 7, z], [x0 - bx + 14, 4, 5]));
        parts.push(box([bx + 8, 42, z + s * 2], [22, 3, 10], 0, 'steel'));                     // step
        surfaces[`arm_${s > 0 ? 'r' : 'l'}`] = { o: [x0, aH, z], u: [1, 0, 0], n: [0, 1, 0], len: aL, width: aW };
        points[`handle_${s > 0 ? 'r' : 'l'}`] = { a: [hx, aH, z], b: [hx, aH + hh, z], r: 1.6 };
      }
      parts.push(box([bx - 10, by1 + 4, 0], [6, 6, g + 6]), box([bx - 10, by0 - 4, 0], [6, 6, g + 6]));
      surfaces.back = { o: [bx, (by0 + by1) / 2, 0], n: [1, 0, 0], y: [by0, by1], width: bw };
    }
    return { parts, surfaces, points: Object.assign(points, { bars, barH: H, gap: g }) };
  }

  const KINDS = { preacher_bench: preacher, decline_bench: decline, hyperextension_bench: hyper, dip_station: dip };
  const geo = (kind, params = {}) => KINDS[kind](params || {});
  geo.kinds = Object.keys(KINDS);
  return geo;
})();

if (typeof GEAR !== 'undefined') {
  const benchMesh = (pr, ctx) => {
    const { THREE, U } = ctx, g = new THREE.Group(), G = benchGeo(pr.kind, pr.params || {});
    const mats = { pad: new THREE.MeshStandardMaterial({ color: pr.color ? new THREE.Color(pr.color) : 0x3a3f48, roughness: 0.75 }), frame: ctx.iron(0x262a31), steel: ctx.steel() };
    const Y = new THREE.Vector3(0, 1, 0);
    for (const p of G.parts) {
      let m;
      if (p.t === 'box') { m = new THREE.Mesh(new THREE.BoxGeometry(p.s[0] * U, p.s[1] * U, p.s[2] * U), mats[p.m]); m.position.set(p.c[0] * U, p.c[1] * U, p.c[2] * U); m.rotation.z = (p.rz * Math.PI) / 180; }
      else { const a = new THREE.Vector3(...p.a), b = new THREE.Vector3(...p.b), d = b.clone().sub(a), l = d.length(); m = new THREE.Mesh(new THREE.CylinderGeometry(p.r * U, p.r * U, l * U, 20), mats[p.m]); m.position.copy(a.add(b).multiplyScalar(0.5 * U)); m.quaternion.setFromUnitVectors(Y, d.normalize()); }
      g.add(m);
    }
    g.name = pr.kind;
    return ctx.shade(g);
  };
  for (const kind of benchGeo.kinds) GEAR.prop(kind, { build: benchMesh });
}
if (typeof module !== 'undefined' && module.exports) module.exports = { benchGeo };
