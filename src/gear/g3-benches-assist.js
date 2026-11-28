// g3-benches gear: assisted dip machine (kneeling). Wraps the gear-pack dip_station (src/gear/benches.js draws the bars);
// with pr.params.assist set, a counterweighted knee pad on a carriage rides up and down a column behind the athlete and
// follows the knees (moving parts, baked per clip in the GLB). Without params.assist the station is unchanged.
// pr.params.assist keys (cm, prop space):
//   padOff [x, y, z]: pad top-surface centre relative to the midpoint of the two knee joints (default [-12, -10, 0])
//   padSize [d, t, w]: pad depth (x), thickness, width (default [36, 4, 40])
//   columnX: x of the column (default -55), columnH: column height (default 150)
(() => {
  const base = GEAR.props.dip_station;
  if (!base) return;
  GEAR.prop('dip_station', {
    build(pr, ctx) {
      const g = base.build(pr, ctx), A = pr.params && pr.params.assist;
      if (!A) return g;
      const { THREE, U } = ctx, [pd, pt, pw] = A.padSize || [36, 4, 40], cx = (A.columnX ?? -55) * U, ch = (A.columnH ?? 150) * U;
      const frame = ctx.iron ? ctx.iron(0x3a3f48) : new THREE.MeshStandardMaterial({ color: 0x3a3f48, roughness: 0.6, metalness: 0.3 });
      const pad = new THREE.MeshStandardMaterial({ color: 0x23262c, roughness: 0.85 });
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.08, ch, 0.12), frame); col.position.set(cx, ch / 2, 0); g.add(col);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.5), frame); foot.position.set(cx + 0.1, 0.02, 0); g.add(foot);
      const stack = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.2), frame); stack.position.set(cx - 0.14, 0.3, 0); g.add(stack);
      // carriage (slides on the column) + arm to the pad + the pad itself: one moving group
      const car = new THREE.Group(); car.name = 'assistPad';
      const sl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.16), frame); car.add(sl);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1, 0.04, 0.06), frame); arm.name = 'assistArm'; car.add(arm);
      const top = new THREE.Mesh(new THREE.BoxGeometry(pd * U, pt * U, pw * U), pad); top.name = 'assistTop'; car.add(top);
      g.add(car);
      g.userData.moving = (g.userData.moving || []).concat([car]);
      g.userData.assist = { car, arm, top, cx, pd: pd * U, pt: pt * U };
      return g;
    },
    update(obj, live) {
      const a = obj.userData.assist; if (!a) return;
      const A = live.pr.params.assist, off = A.padOff || [-12, -10, 0];
      const kr = live.pt('knee_r'), kl = live.pt('knee_l'), m = [(kr[0] + kl[0]) / 2 + off[0], (kr[1] + kl[1]) / 2 + off[1], (kr[2] + kl[2]) / 2 + off[2]];
      const p = live.toLocal(m, obj); // pad top centre, metres in the prop frame
      a.car.position.set(a.cx, p.y - a.pt - 0.05, 0);
      const px = p.x - a.cx; // pad centre relative to the column
      a.top.position.set(px, a.pt / 2 + 0.05, p.z);
      const len = Math.max(0.05, px - a.pd / 2 + 0.04); a.arm.scale.set(len, 1, 1); a.arm.position.set(len / 2, 0.02, 0);
    },
  });
})();
