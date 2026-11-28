// Gear (group g3-attach): balls that move with the body. Shares the player's module scope (THREE, U, GEAR). Authoring
// helpers: build/families/gear-g3attach.js. Units: cm in the module, metres in the scene.
//
// 1. Rolling stability ball (held item, body-mounted): { kind:'stability_ball', size:[d, d, d], attach:{ joint, with?,
//    offset } }. With attach.joint + attach.with (two rig joints, neither a wrist) the ball centre sits at their midpoint
//    plus attach.offset in rig space (src/player.js placeHeld); with one joint it rides that joint's frame. Use it when
//    the ball rolls with the body (shins on the ball in a body saw, a heel curling the ball in, forearms rolling it up a
//    wall). The static floor ball stays the prop of src/gear/attach.js (no attach).
//    params: { squash: 0.03 (flattening along the joint frame's Y, cosmetic) }. Default colour blue; pr.color overrides.
// 2. Medicine ball (held item, two hands): { kind:'plate', params:{ shape:'ball' }, size:[d, d, d], attach:{ joint:
//    'wrist_r', with:'wrist_l' } }: a rubber ball between the hands (centre at the grip midpoint). Any plate without
//    params.shape 'ball' is passed on unchanged to the plate held item registered before this file (src/gear/bars.js).
//    One hand ({ joint:'wrist_r' } only): the ball sits in the palm, its centre size[0]/2 past the grip along the palm.
//    params: { shape:'ball', seams: true }. Default colour dark grey with a red band; pr.color overrides the shell.

const G3_U = 0.01;
const g3Mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0, ...o });

/* ---------------- rolling stability ball ---------------- */
{
  const prev = GEAR.held.stability_ball;
  GEAR.heldItem('stability_ball', {
    mesh(pr, ctx) {
      if (prev && !(pr.attach && pr.attach.joint)) return prev.mesh(pr, ctx);
      const D = ((pr.size && pr.size[0]) || 65) * G3_U, sq = (pr.params && pr.params.squash) ?? 0.03, g = new THREE.Group(); g.name = pr.id;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(D / 2, 48, 32), g3Mat(pr.color ? new THREE.Color(pr.color) : 0x3d7fd6, { roughness: 0.45 }));
      ball.scale.set(1 + sq / 2, 1 - sq, 1 + sq / 2); g.add(ball);
      for (const ry of [0, Math.PI / 2]) { const s = new THREE.Mesh(new THREE.TorusGeometry(D / 2 + 0.001, 0.0015, 6, 64), g3Mat(0x2c5fa8)); s.rotation.y = ry; s.scale.copy(ball.scale); g.add(s); }
      return g;
    },
  });
}

/* ---------------- medicine ball ---------------- */
{
  const prev = GEAR.held.plate;
  const isBall = (pr) => !!(pr && pr.params && pr.params.shape === 'ball');
  function medBall(pr) {
    const D = ((pr.size && pr.size[0]) || 24) * G3_U, g = new THREE.Group(); g.name = pr.id;
    const two = !!(pr.attach && pr.attach.with);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(D / 2, 40, 28), g3Mat(pr.color ? new THREE.Color(pr.color) : 0x2a2d33, { roughness: 0.85 }));
    if (!two) shell.position.y = -D / 2; // one hand: the ball sits in the palm
    g.add(shell);
    if (!pr.params || pr.params.seams !== false) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(D / 2 + 0.0008, 0.006, 8, 56), g3Mat(0xc0392b, { roughness: 0.7 })); band.position.copy(shell.position); g.add(band);
      const seam = new THREE.Mesh(new THREE.TorusGeometry(D / 2 + 0.0006, 0.0015, 6, 56), g3Mat(0x15171a)); seam.rotation.y = Math.PI / 2; seam.position.copy(shell.position); g.add(seam);
    }
    return g;
  }
  GEAR.heldItem('plate', {
    mesh: (pr, ctx) => (isBall(pr) || !prev ? medBall(pr) : prev.mesh(pr, ctx)),
    orient: (o) => (isBall(o.pr) ? null : prev && prev.orient ? prev.orient(o) : null),
    ...(prev && prev.lineR ? { lineR: prev.lineR, lineColor: prev.lineColor } : {}),
  });
}
