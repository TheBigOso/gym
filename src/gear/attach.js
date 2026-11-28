// Gear: body-mounted attachments and balls (ankle-strap cuff, band loop around both legs, dumbbell resting on the body,
// stability ball, bosu). Shares the player's module scope (THREE, U, cableHandleMesh, dumbbellMesh). Authoring helpers:
// build/families/gear-attach.js. Units: cm in the module, metres in the scene.
//
// 1. Ankle strap (cable attachment, body-mounted): a padded cuff around the lower shank with a D-ring; the cable runs
//    from the pulley to the D-ring. Use { kind:'cable', attachment:'ankle_strap', anchor, attach:{ joint:'ankle_r',
//    offset } }. Until the schema's `attachment` enum lists 'ankle_strap', write attachment:'handle' with
//    params.attachment:'ankle_strap' (same mesh). The mesh origin is the D-ring (= the cable end), so attach.offset
//    is the D-ring in the ankle's frame (GA.ankleStrap computes it).
//    params: { attachment:'ankle_strap', ring:[x,y,z] D-ring direction from the cuff axis in the ankle frame
//              (default [0,0,-1], the inner side of a right ankle), cuffR (cm, default 5), cuffH (cm, default 7) }
// 2. Band loop around both legs (moving prop, no attach): { kind:'band', params:{ loop:['knee_r','knee_l'],
//    toward:['hip_r','hip_l'], at:0.15, r:[6.2,6.2], width:4 } }. Each leg gets a cuff at `at` of the way from the loop
//    joint toward the `toward` joint (r = leg radius there, cm); two strands run between the legs, front and back.
//    Moving parts (baked in the GLB): cuffA, cuffB, strandF, strandB. A band with attach {joint:'knee_r',
//    with:'knee_l'} also works (the player draws one strand joint to joint), but the loop prop reads better.
// 3. Dumbbell resting on the body (lap, between the feet): { kind:'dumbbell', attach:{ joint:'hip_r', offset },
//    params:{ axis:[x,y,z] } }: the handle runs along `axis` in that joint's frame (default +X). Hands-free.
// 4. stability_ball (static prop): size[0] = diameter (cm, default 65), params: { squash: 0.04 (flattening under
//    load, the bottom stays on the floor) }. Default colour blue; pr.color overrides.
// 5. bosu (static prop): size[0] = platform diameter (default 63), size[1] = total height (default 25), params:
//    { flip: false (dome up) | true (platform up, dome on the floor) }.

const GA_DARK = 0x23262c;
const gaMat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0, ...o });
const gaParams = (pr) => (pr && pr.params) || {};

/* ---------------- ankle strap ---------------- */
function ankleStrapMesh(pr) {
  const P = gaParams(pr), cr = (P.cuffR ?? 5) * U, ch = (P.cuffH ?? 7) * U;
  const ring = new THREE.Vector3(...(P.ring || [0, 0, -1])); ring.y = 0; if (ring.lengthSq() < 1e-6) ring.set(0, 0, -1); ring.normalize();
  const g = new THREE.Group(); g.name = pr.id;
  const cuffC = ring.clone().multiplyScalar(-(cr + 0.022)); // cuff axis (joint-frame Y) behind the D-ring
  const nylon = gaMat(pr.color ? new THREE.Color(pr.color) : GA_DARK, { side: THREE.DoubleSide });
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(cr, cr, ch, 28, 1, true), nylon); cuff.position.copy(cuffC); g.add(cuff);
  for (const s of [-1, 1]) { const hem = new THREE.Mesh(new THREE.TorusGeometry(cr, 0.004, 6, 28), gaMat(0x3a3f48)); hem.rotation.x = Math.PI / 2; hem.position.copy(cuffC).add(new THREE.Vector3(0, (s * ch) / 2, 0)); g.add(hem); }
  // webbing tab from the cuff to the D-ring
  const tab = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.02, 0.02), nylon); tab.position.copy(ring).multiplyScalar(-0.013); tab.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), ring); g.add(tab);
  // D-ring in the plane of the cuff axis and the ring direction
  const d = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0028, 8, 18), steelMat()); d.lookAt(new THREE.Vector3(0, 1, 0).cross(ring)); d.position.copy(ring).multiplyScalar(0.004); g.add(d);
  return g;
}
GEAR.heldItem('cable:ankle_strap', { mesh: ankleStrapMesh });
// stop-gap until the schema allows attachment 'ankle_strap': a handle with params.attachment 'ankle_strap' is the strap
GEAR.heldItem('cable:handle', { mesh: (pr) => (gaParams(pr).attachment === 'ankle_strap' ? ankleStrapMesh(pr) : cableHandleMesh(pr)) });

/* ---------------- dumbbell resting on the body ---------------- */
// one-hand dumbbells are unchanged; a body-mounted one is turned so its handle runs along params.axis (joint frame)
GEAR.heldItem('dumbbell', {
  mesh: (pr) => {
    const inner = dumbbellMesh(pr);
    if (!pr.attach || /^wrist_/.test(pr.attach.joint || '') || !gaParams(pr).axis) return inner;
    const g = new THREE.Group(); g.name = pr.id; inner.name = `${pr.id}_db`;
    inner.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(...gaParams(pr).axis).normalize()); g.add(inner);
    return g;
  },
});

/* ---------------- band loop around both legs ---------------- */
GEAR.prop('band', {
  build(pr, ctx) {
    const P = gaParams(pr), w = (P.width ?? 4) * ctx.U, col = pr.color ? new THREE.Color(pr.color) : 0x3faa5a;
    const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.65, side: THREE.DoubleSide });
    const g = new THREE.Group(); g.name = pr.id;
    const mk = (name, geo) => { const m = new THREE.Mesh(geo, mat); m.name = name; g.add(m); return m; };
    // cuffs: unit-radius open cylinders scaled to the leg radius; strands: unit-length flat boxes stretched between legs
    const cuffA = mk('cuffA', new THREE.CylinderGeometry(1, 1, w, 28, 1, true)), cuffB = mk('cuffB', new THREE.CylinderGeometry(1, 1, w, 28, 1, true));
    const strandF = mk('strandF', new THREE.BoxGeometry(w, 1, 0.003)), strandB = mk('strandB', new THREE.BoxGeometry(w, 1, 0.003));
    g.userData.moving = [cuffA, cuffB, strandF, strandB];
    return g;
  },
  update(obj, live) {
    const P = gaParams(live.pr), J = P.loop || ['knee_r', 'knee_l'], T = P.toward || J.map((j) => (j.startsWith('ankle') ? 'knee' : 'hip') + j.slice(-2));
    const at = P.at ?? 0.15, rr = Array.isArray(P.r) ? P.r : [P.r ?? 6, P.r ?? 6], pad = 0.35;
    const [cuffA, cuffB, strandF, strandB] = obj.userData.moving;
    const leg = (i) => { const a = live.pt(J[i]), b = live.pt(T[i]), p = a.map((v, k) => v + (b[k] - v) * at), d = a.map((v, k) => b[k] - v);
      const pl = live.toLocal(p, obj), dl = live.toLocal(p.map((v, k) => v + d[k] * 0.1), obj).sub(pl).normalize(); return { p: pl, d: dl }; };
    const A = leg(0), B = leg(1), unit = live.U;
    const ra = (rr[0] + pad) * unit, rb = (rr[1] + pad) * unit;
    const Y = new THREE.Vector3(0, 1, 0);
    [[cuffA, A, ra], [cuffB, B, rb]].forEach(([m, L, r]) => { m.position.copy(L.p); m.quaternion.setFromUnitVectors(Y, L.d); m.scale.set(r, 1, r); });
    const dAvg = A.d.clone().add(B.d).normalize(), across = B.p.clone().sub(A.p), n = new THREE.Vector3().crossVectors(dAvg, across).normalize();
    const set = (m, s) => {
      const a = A.p.clone().addScaledVector(n, s * ra), b = B.p.clone().addScaledVector(n, s * rb), y = b.clone().sub(a), len = Math.max(1e-4, y.length()); y.multiplyScalar(1 / len);
      const x = dAvg.clone().addScaledVector(y, -dAvg.dot(y)).normalize(), z = new THREE.Vector3().crossVectors(x, y);
      m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); m.scale.set(1, len, 1);
    };
    set(strandF, 1); set(strandB, -1);
  },
});

/* ---------------- stability ball ---------------- */
GEAR.prop('stability_ball', {
  build(pr, ctx) {
    const D = ((pr.size && pr.size[0]) || 65) * ctx.U, sq = gaParams(pr).squash ?? 0.04;
    const g = new THREE.Group(); g.name = pr.id;
    const mat = new THREE.MeshStandardMaterial({ color: pr.color ? new THREE.Color(pr.color) : 0x3d7fd6, roughness: 0.45, metalness: 0 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(D / 2, 48, 32), mat); ball.scale.set(1 + sq / 2, 1 - sq, 1 + sq / 2); ball.position.y = (D / 2) * (1 - sq); g.add(ball);
    // two moulding seams
    for (const rx of [0, Math.PI / 2]) { const s = new THREE.Mesh(new THREE.TorusGeometry(D / 2 + 0.001, 0.0015, 6, 64), gaMat(0x2c5fa8)); s.rotation.y = rx; s.scale.copy(ball.scale); s.position.copy(ball.position); g.add(s); }
    return g;
  },
});

/* ---------------- bosu ---------------- */
GEAR.prop('bosu', {
  build(pr, ctx) {
    const D = ((pr.size && pr.size[0]) || 63) * ctx.U, H = ((pr.size && pr.size[1]) || 25) * ctx.U, base = 0.04, flip = !!gaParams(pr).flip;
    const a = D / 2 - 0.01, h = H - base, Rs = (a * a + h * h) / (2 * h), th = Math.acos((Rs - h) / Rs);
    const g = new THREE.Group(); g.name = pr.id;
    const domeM = new THREE.MeshStandardMaterial({ color: pr.color ? new THREE.Color(pr.color) : 0x2f6fd0, roughness: 0.5 });
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(D / 2, D / 2, base, 48), gaMat(0x1d2025));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(Rs, 48, 20, 0, Math.PI * 2, 0, th), domeM);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(D / 2, 0.008, 8, 48), gaMat(0x111316)); rim.rotation.x = Math.PI / 2;
    if (!flip) { plat.position.y = base / 2; dome.position.y = base + h - Rs; rim.position.y = base; }
    else { dome.rotation.x = Math.PI; dome.position.y = Rs; plat.position.y = h + base / 2; rim.position.y = h; } // apex on the floor, rim at h
    g.add(plat, dome, rim);
    return g;
  },
});
