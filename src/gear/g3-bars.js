// Gear (phase 3, group g3-bars): small additions on top of src/gear/bars.js and src/gear/attach.js. Each entry wraps the
// existing held-item plug-in and only takes over when its own params key is set, so every other use is unchanged.
// Authoring helpers: build/families/gear-g3-bars.js. Units: pr.size and pr.params in cm, meshes in metres.
//
// 1. Foot cradle (kind 'rings', body-mounted): { kind:'rings', anchor, attach:{ joint:'ankle_r', offset }, params:{
//    style:'cradle' } }. A padded loop around the instep (axis along the foot, joint-frame +X); the strap is the gear line
//    from the anchor to the cradle centre. params.cradleR (cm, default 5.8).
// 2. Cambered bar (kind 'ez_bar', two hands): params { shape:'cambered', width: 56 (cm between the grip points),
//    drop: 16 (cm the middle hangs below the grips), length: 200, plates: 1, plateD: 45 }. The grip sections are
//    straight and level; the middle drops in a U so the hands can row past a bench. The drop stays vertical.
// 3. Weight vest (kind 'plate', body-mounted on spine_t6): params { shape:'vest' }. Front and back load panels around the
//    chest, shoulder straps over the top; origin = the chest ellipsoid centre (attach.offset [7.4, 7.2, 0]).
// 4. Single rope (cable attachment, one hand): { kind:'cable', attachment:'handle', params:{ attachment:'rope1' } }: a
//    short tricep rope gripped in one fist (the cable is drawn to the hand, the rope's tail hangs past the little finger).
// 5. Parallel (neutral) grip handles hooked on a pull-up bar (kind 'cable', attachment 'vbar', two hands, no anchor):
//    params { style:'parallel', barDX: 20 (cm, bar centre in front of the grip line, world +X), barDY: 0 (cm, bar
//    centre above the grips) }. Two handles run front-to-back at the grip points; side plates run forward to a hook over
//    the bar. Static in use (the hands are planted).
const G3B = { p: (pr) => (pr && pr.params) || {}, U: 0.01 };
const g3Mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0, ...o });
function g3Seg(a, b, r, mat, seg = 12) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length(), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, Math.max(1e-4, len), seg), mat);
  m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
}
const g3V = (x, y, z) => new THREE.Vector3(x * G3B.U, y * G3B.U, z * G3B.U);

/* ---------------- 1. foot cradle ---------------- */
{
  const base = GEAR.held.rings;
  GEAR.heldItem('rings', Object.assign({}, base, {
    mesh(pr, ctx) {
      if (G3B.p(pr).style !== 'cradle') return base.mesh(pr, ctx);
      const g = new THREE.Group(), R0 = (G3B.p(pr).cradleR ?? 5.8) * G3B.U, pad = g3Mat(0x1d2025), web = g3Mat(0xd7b23a);
      const loop = new THREE.Mesh(new THREE.TorusGeometry(R0, 0.011, 10, 32), pad); loop.rotation.y = Math.PI / 2; g.add(loop); // axis along +X
      const loop2 = loop.clone(); loop2.position.x = -0.03; g.add(loop2);
      g.add(g3Seg(new THREE.Vector3(-0.03, R0, 0), new THREE.Vector3(0, R0, 0), 0.012, web, 8));
      return g;
    },
  }));
}

/* ---------------- 2. cambered bar ---------------- */
{
  const base = GEAR.held.ez_bar;
  GEAR.heldItem('ez_bar', Object.assign({}, base, {
    mesh(pr, ctx) {
      const p = G3B.p(pr); if (p.shape !== 'cambered') return base.mesh(pr, ctx);
      const st = steelMat(), g = new THREE.Group(), w = (p.width ?? 56) / 2, dr = p.drop ?? 16, half = (p.length ?? 200) / 2, s0 = half - 42;
      const D = (p.plateD ?? 45), n = p.plates ?? 1, iron = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.55, metalness: 0.35 });
      for (const sg of [1, -1]) {
        const pts = [[0, -dr], [w - 16, -dr], [w - 8, 0], [s0, 0]].map(([x, y]) => g3V(sg * x, y, 0));
        for (let i = 0; i + 1 < pts.length; i++) g.add(g3Seg(pts[i], pts[i + 1], 0.0135, st));
        for (let i = 1; i + 1 < pts.length; i++) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.0135, 10, 8), st); k.position.copy(pts[i]); g.add(k); }
        g.add(g3Seg(g3V(sg * s0, 0, 0), g3V(sg * half, 0, 0), 0.025, st));
        const col = cylX(0.04, 0.03, st); col.position.x = sg * (s0 + 1.5) * G3B.U; g.add(col);
        for (let i = 0; i < n; i++) { const d = cylX(D / 2 * G3B.U, 0.05, iron, 36); d.position.x = sg * (s0 + 6 + i * 5.5) * G3B.U; g.add(d); }
      }
      return g;
    },
    orient(o) { return G3B.p(o.pr).shape === 'cambered' ? null : base.orient ? base.orient(o) : null; },
  }));
}

/* ---------------- 3. weight vest ---------------- */
{
  const base = GEAR.held.plate;
  GEAR.heldItem('plate', Object.assign({}, base, {
    mesh(pr, ctx) {
      if (G3B.p(pr).shape !== 'vest') return base.mesh(pr, ctx);
      const g = new THREE.Group(), shell = g3Mat(0x2a2e35), trim = g3Mat(0x454b55);
      const box = (sx, sy, sz, x, y, z, m = shell) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx * G3B.U, sy * G3B.U, sz * G3B.U), m); b.position.set(x * G3B.U, y * G3B.U, z * G3B.U); g.add(b); return b; };
      box(3.2, 24, 30, 11.6, -1, 0); box(3.2, 26, 32, -12, 0, 0);                         // front and back load panels
      for (const s of [1, -1]) { box(24, 9, 2.4, 0, -6, s * 19.5, trim); box(26, 2.4, 6, -0.5, 12.5, s * 9.5, trim); } // side straps, shoulder straps
      for (let i = 0; i < 3; i++) box(1, 5, 26, 13.6, -9 + i * 7, 0, trim);              // pocket seams on the front
      return g;
    },
    orient(o) { return base.orient ? base.orient(o) : null; },
  }));
}

/* ---------------- 4. single rope (one hand) ---------------- */
{
  const base = GEAR.held['cable:handle'];
  GEAR.heldItem('cable:handle', Object.assign({}, base, {
    mesh(pr, ctx) {
      if (G3B.p(pr).attachment !== 'rope1') return base ? base.mesh(pr, ctx) : cableHandleMesh(pr);
      const g = new THREE.Group(), rope = g3Mat(0x1f2228), st = steelMat();
      g.add(cylX(0.0125, 0.16, rope));                                                   // through the fist along the grip axis
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 14), g3Mat(0x15171b)); knob.rotation.z = Math.PI / 2; knob.position.x = 0.09; g.add(knob);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 8, 16), st); ring.position.x = -0.1; g.add(ring);
      return g;
    },
  }));
}

/* ---------------- 5. parallel grip handles on a pull-up bar ---------------- */
{
  const base = GEAR.held['cable:vbar'];
  GEAR.heldItem('cable:vbar', Object.assign({}, base || {}, {
    mesh(pr, ctx) {
      const p = G3B.p(pr); if (p.style !== 'parallel') return base && base.mesh ? base.mesh(pr, ctx) : cableHandleMesh(pr);
      // local frame (two-hand default): x = left -> right grip, y = up, z = x cross y = backward (world -X)
      const g = new THREE.Group(), st = steelMat(), rub = g3Mat(0x23262c), frame = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.55, metalness: 0.35 });
      const w = (p.width ?? 14) / 2, bx = p.barDX ?? 20, by = p.barDY ?? 0, hl = 7;
      for (const s of [1, -1]) {
        g.add(g3Seg(g3V(s * w, 0, -hl), g3V(s * w, 0, hl), 0.016, rub));                    // handle, front to back
        g.add(g3Seg(g3V(s * w, 0, hl), g3V(s * (w + 3), 0, hl + 2), 0.012, frame, 8));
        g.add(g3Seg(g3V(s * (w + 3), 0, hl + 2), g3V(s * (w + 3), by + 3.2, -bx), 0.014, frame, 8)); // side rail forward to the bar
        g.add(g3Seg(g3V(s * w, 0, -hl), g3V(s * (w + 3), by + 3.2, -bx), 0.012, frame, 8));
        g.add(g3Seg(g3V(s * (w + 3), by + 3.2, -bx), g3V(s * (w + 3), by - 2, -bx - 4.5), 0.012, frame, 8)); // hook over the bar
      }
      g.add(g3Seg(g3V(-(w + 3), by + 3.2, -bx), g3V(w + 3, by + 3.2, -bx), 0.015, st));        // cross tube resting on the bar
      return g;
    },
  }));
}

/* ---------------- 6. swivelling rings ---------------- */
// A ring turns freely about its gripped bar, so it always hangs along its strap. Rings with params.swivel: true are
// turned each frame by a helper prop { kind:'rings', params:{ role:'swivel' } } (no attach, draws nothing): its update
// turns each such ring's holder about the grip axis toward the ring's anchor. The GLB export keeps the static
// params.tilt (the fitted mean), since held items are not baked per frame. Any such helper prop (role 'swivel' or
// 'grip') also closes both hands, like a pull-up bar.
GEAR.prop('rings', {
  closeHands: true, // the helper prop also closes both hands (e.g. hands gripping chair backrests: params.role 'grip')
  build() { const g = new THREE.Group(); g.userData.moving = []; return g; },
  update() {
    if (typeof held === 'undefined') return;
    for (const h of held) {
      const p = G3B.p(h.pr); if (h.pr.kind !== 'rings' || !p.swivel || !h.pr.anchor || !h.mesh.children[0]) continue;
      const anc = anchorWorld(h.pr, null, S.side === 'L', world);
      h.mesh.updateWorldMatrix(true, false);
      const loc = h.mesh.worldToLocal(anc.clone());
      h.mesh.children[0].rotation.x = -Math.atan2(loc.z, -loc.y);
    }
  },
});
