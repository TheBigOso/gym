// Smith machine (gear plug-in, kind 'smith'). A frame with two guide rails; the bar rides on carriages that slide along
// the rails. The bar is a moving part: every frame it follows the midpoint of the hands' 'bar' grip points, projected onto
// the rail line and clamped to the travel limits, so it can only move along the rails.
//
// Prop: { id, kind: 'smith', center: [x, 0, z], size: [depth, height, width], params, rotY? }
//  - center: where the rail line meets the floor (cm). With incline 0 the rails are vertical over this point.
//  - size: frame depth (front-back posts, default 110), height (default 220), width = distance between the rails (default 124).
// params (all optional):
//  - incline: rail tilt in degrees from vertical; > 0 leans the top of the rails toward +X (default 0, typical 0-7)
//  - plates: plates per side (default 1); plateD: plate diameter in cm (default 45); plateColor (default iron grey)
//  (pr.color, if given, colours the frame)
//  - restY: bar centre height (cm) when no hands drive it (default hookY, else 120)
//  - follow: false = the bar stays at restY (hands planted on a fixed bar); default true
//  - hookY: height (cm) of the hook pegs where the bar is racked (drawn as the lowest highlighted peg pair; default none)
//  - safetyY: bar centre height (cm) of the safety stops; the bar never goes below it (default none)
//  - barMin / barMax: bar centre travel limits in cm (default plateD / 2 + 2 ... height - 22)
// A second prop { kind: 'smith', attach: { joint: 'wrist_r', with: 'wrist_l', grip: 'bar' } } is an invisible grip marker:
// it closes both hands (the player closes hands only on held items) and lets verify check the grip width. The
// authoring helpers (build/families/gear-smith.js) add it for you.
const SMITH = { railR: 0.016, post: 0.06, shaftR: 0.014, sleeveR: 0.025, sleeve: 0.34, plateW: 0.055, carriage: [0.08, 0.16, 0.08] };
const cylZ = (THREE, r, len, mat, seg = 16) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat); m.rotation.x = Math.PI / 2; return m; };
function smithDims(pr, U) {
  const s = pr.size || [], p = pr.params || {};
  const depth = (s[0] || 110) * U, height = (s[1] || 220) * U, rz = ((s[2] || 124) * U) / 2;
  const inc = (p.incline || 0) * Math.PI / 180, plateD = (p.plateD || 45) * U;
  const barMin = (p.barMin ?? Math.max((p.plateD || 45) / 2 + 2, p.safetyY ?? 0)) * U, barMax = (p.barMax ?? (s[1] || 220) - 22) * U;
  return { depth, height, rz, inc, dir: [Math.sin(inc), Math.cos(inc), 0], plateD, plates: p.plates ?? 1, barMin, barMax, rest: (p.restY ?? p.hookY ?? 120) * U, follow: p.follow !== false, p };
}
GEAR.prop('smith', {
  build(pr, ctx) {
    const { THREE, U, steel, iron, mat } = ctx, d = smithDims(pr, U), st = steel(), g = new THREE.Group();
    const frame = pr.color && mat ? mat : iron(0x262a31), dark = iron(0x1d2026), red = new THREE.MeshStandardMaterial({ color: 0xc23b2e, roughness: 0.6 });
    const box = (sx, sy, sz, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); g.add(b); return b; };
    const railAt = (y) => [d.dir[0] * (y / d.dir[1]), y]; // rail line x at height y
    const P = SMITH.post, pz = d.rz + 0.07, H = d.height, x0 = -d.depth / 2, x1 = d.depth / 2, top0 = railAt(H - 0.06)[0];
    for (const s of [-1, 1]) {
      const z = s * pz;
      for (const x of [x0 + top0 / 2, x1 + top0 / 2]) box(P, H, P, frame, x, H / 2, z);                        // posts
      box(d.depth + P, 0.05, P * 1.3, frame, top0 / 2, 0.025, z);                                                 // floor rail
      box(d.depth + P, P, P, frame, top0 / 2, H - P / 2, z);                                                      // top rail
      // guide rail (steel rod) along the rail line, held by brackets at the bottom and top
      const yA = 0.05, yB = H - 0.06, a = railAt(yA), b = railAt(yB), len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(SMITH.railR, SMITH.railR, len, 14), st);
      rod.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, s * d.rz); rod.rotation.z = -d.inc; g.add(rod);
      for (const [x, y] of [a, b]) box(0.05, 0.04, pz - d.rz + 0.03, dark, x, y, s * (d.rz + (pz - d.rz) / 2));
      // hook pegs every 10 cm on a strip just behind the rail (the bar's hooks rack on them); hookY pair in red
      const strip = box(0.012, yB - 0.35, 0.03, dark, 0, (yB + 0.35) / 2, s * (d.rz + 0.035)); strip.position.x = railAt((yB + 0.35) / 2)[0] - 0.05; strip.rotation.z = -d.inc;
      for (let y = 0.4; y < yB - 0.05; y += 0.1) { const pg = cylZ(THREE, 0.007, 0.03, st, 8); pg.position.set(railAt(y)[0] - 0.035, y, s * (d.rz + 0.035)); pg.rotation.z = Math.PI / 2; g.add(pg); }
      if (d.p.hookY != null) { const y = d.p.hookY * U - SMITH.carriage[1] / 2 + 0.02; const pg = box(0.04, 0.02, 0.03, red, railAt(y)[0] - 0.035, y, s * (d.rz + 0.035)); pg.rotation.z = -d.inc; }
      // safety stops: a clamp block on each rail, its top just under the carriage when the bar is at safetyY
      if (d.p.safetyY != null) { const y = d.p.safetyY * U - SMITH.carriage[1] / 2 - 0.02; const sb = box(0.1, 0.04, 0.07, red, railAt(y)[0] + 0.01, y, s * d.rz); sb.rotation.z = -d.inc; }
    }
    box(P, P, 2 * pz + P, frame, x0 + top0 / 2, H - P / 2, 0);  // top cross beams
    box(P, P, 2 * pz + P, frame, x1 + top0 / 2, H - P / 2, 0);
    box(P, 0.05, 2 * pz + P, frame, x0, 0.025, 0);              // back floor beam (the front stays open for a bench)
    // the moving bar: shaft between the carriages, carriages around the rails, sleeves and plates outside them
    const bar = new THREE.Group(); bar.name = 'bar';
    bar.add(cylZ(THREE, SMITH.shaftR, 2 * d.rz, st));
    const plateM = iron(d.p.plateColor ? new THREE.Color(d.p.plateColor).getHex() : 0x2b2f36);
    for (const s of [-1, 1]) {
      const car = new THREE.Mesh(new THREE.BoxGeometry(...SMITH.carriage), dark); car.position.set(0, 0, s * d.rz); car.rotation.z = -d.inc; bar.add(car);
      const hook = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.02), st); hook.position.set(-0.05, -0.04, s * (d.rz + 0.035)); bar.add(hook);
      const sl = cylZ(THREE, SMITH.sleeveR, SMITH.sleeve, st); sl.position.z = s * (d.rz + 0.04 + SMITH.sleeve / 2); bar.add(sl);
      const col = cylZ(THREE, 0.04, 0.03, st); col.position.z = s * (d.rz + 0.06); bar.add(col);
      for (let i = 0; i < d.plates; i++) { const pl = cylZ(THREE, d.plateD / 2, SMITH.plateW, plateM, 32); pl.position.z = s * (d.rz + 0.105 + i * 0.06); bar.add(pl); }
    }
    const s0 = d.rest / d.dir[1]; bar.position.set(d.dir[0] * s0, d.dir[1] * s0, 0);
    g.add(bar);
    g.userData.moving = [bar]; g.userData.smith = d;
    return g;
  },
  update(obj, live) {
    const d = obj.userData.smith, bar = obj.userData.moving[0];
    if (!d.follow) return;
    const r = live.grip('r', 'bar'), l = live.grip('l', 'bar'), m = [(r[0] + l[0]) / 2, (r[1] + l[1]) / 2, (r[2] + l[2]) / 2];
    const p = live.toLocal(m, obj); // metres, obj space (rail line through the origin along d.dir)
    let s = p.x * d.dir[0] + p.y * d.dir[1];
    s = Math.max(d.barMin / d.dir[1], Math.min(d.barMax / d.dir[1], s));
    bar.position.set(d.dir[0] * s, d.dir[1] * s, 0);
  },
});
// invisible grip marker (closes both hands on the Smith bar; see the header)
GEAR.heldItem('smith', { mesh(pr, ctx) { const g = new ctx.THREE.Group(); g.name = pr.id; return g; } });
