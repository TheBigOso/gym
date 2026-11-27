// Dumbbell Split Jerk (GymVisual #1170512): dumbbells racked on the shoulders (neutral grip), feet hip width. Dip (a short
// knee bend with an upright trunk), drive up hard onto the balls of the feet, then split the feet (right foot forward
// flat, left foot back on its ball) while punching the dumbbells overhead to straight arms. Hold the split with the
// dumbbells locked out, recover (front foot steps back, back foot steps up) to stand with the dumbbells overhead, then
// lower them to the shoulders. The feet leave the floor briefly in the drive (no planted contact while airborne).
// Authored with the right foot forward; the dumbbells move together (bilateral arms).
const L = require('./lib');
const { V, r1, clone } = L;
const P = require('./families/b4-power');
const H = require('./families/hips');
const meta = require('./meta/dumbbell-split-jerk.json');

const F = P.makeFamily({ toe: 6, half: 11 });
const FX = +(process.env.FX ?? 34), BX = +(process.env.BX ?? -50);
const SP = +(process.env.SP ?? -8);   // slight forward pelvis tilt in the split keeps the back hip inside its extension range
const flat = (x = 0, o = {}) => Object.assign({ c: 'flat', x }, o);
const ball = (x, o = {}) => Object.assign({ c: 'ball', x }, o);
const roll = (pitch) => ({ c: 'roll', pitch, ballX: F.BALL_X });
const sc = (e, p = 4) => ({ protract: p, elevate: e });
const Bd = {
  rack: { feet: { r: flat(), l: flat() }, knee: 5, pitch: 0, sc: sc(6) },
  dip: { feet: { r: flat(), l: flat() }, knee: 24, pitch: 1, sc: sc(6) },
  drive: { feet: { r: roll(22), l: roll(22) }, knee: 3, pitch: 1, sc: sc(12, 2) },
  split: { feet: { r: flat(FX), l: ball(BX) }, knee: +(process.env.KS ?? 58), pitch: SP, x: (FX + BX) / 2, sc: sc(20, 0) },
  settle: { feet: { r: flat(FX), l: ball(BX) }, knee: +(process.env.KS ?? 58) + 4, pitch: SP, x: (FX + BX) / 2, sc: sc(20, 0) },
  rec1a: { feet: { r: flat(FX * 0.5, { lift: 5, w: 0 }), l: ball(BX) }, knee: 22, side: 'l', pitch: 0, x: BX * 0.45, sc: sc(20, 0) },
  rec1: { feet: { r: flat(0), l: ball(BX) }, knee: 28, pitch: 0, x: BX * 0.3, sc: sc(20, 0) },
  rec2u: { feet: { r: flat(0), l: ball(BX + 3, { lift: 3, w: 0 }) }, knee: 18, pitch: 0, x: BX * 0.2, sc: sc(20, 0) },
  rec2a: { feet: { r: flat(0), l: flat(BX * 0.5, { lift: 6, w: 0 }) }, knee: 8, pitch: 0, x: -2, sc: sc(20, 0) },
  top: { feet: { r: flat(), l: flat() }, knee: 4, pitch: 0, sc: sc(20, 0) },
  p50: { feet: { r: flat(), l: flat() }, knee: 4, pitch: 0, sc: sc(10, 2) },
};
// split: root X and height so the front knee bends KS and the back knee KB (back foot on its ball)
const KB = +(process.env.KB ?? 45);
for (const [n, kf] of [['split', 0], ['settle', 4]]) {
  const c = Bd[n], cost = (x, y) => { const W = L.fk(F.build({ root: [x, y, 0], pitch: c.pitch, spine: { l5: 0, t12: 0, t6: 0 }, feet: c.feet }), F.contacts); return (P.kneeOf(W, 'r') - c.knee) ** 2 + (P.kneeOf(W, 'l') - KB - kf * 0.6) ** 2; };
  let best = { c: 1e9 };
  for (let x = -25; x <= 15; x += 1) for (let y = 60; y <= 95; y += 0.5) { const v = cost(x, y); if (v < best.c) best = { c: v, x, y }; }
  Object.assign(c, { x: best.x, rootY: best.y });
}
// airborne: root a little below the drive height, feet travelling (weight 0)
const pDrive = P.body(F, clone(Bd.drive));
Bd.rec2u.x = r1(Bd.rec1.x * 0.6);
Bd.fly = { feet: { r: flat(FX * 0.5, { lift: 5, w: 0 }), l: flat(BX * 0.5, { lift: 9, w: 0 }) }, rootY: r1(pDrive.root.pos[1] - 7), x: r1(Bd.split.x * 0.5), pitch: 0, sc: sc(16, 1) };
Bd.land = { feet: { r: flat(FX, { lift: 1.5, w: 0 }), l: ball(BX, { lift: 2, w: 0 }) }, rootY: r1(Bd.split.rootY + 3), x: Bd.split.x, pitch: SP, sc: sc(19, 0) };
const A = { rack: P.RACK, dip: P.RACK, drive: P.NEUTRAL_UP([14, 6, 8], [22, -12, 12]), fly: P.PRESS_MID, land: P.NEUTRAL_UP([3, 50, 1], [3, 28, 10]), split: P.OVERHEAD, settle: P.OVERHEAD, rec1a: P.OVERHEAD, rec1: P.OVERHEAD, rec2u: P.OVERHEAD, rec2a: P.OVERHEAD, top: P.OVERHEAD, p50: P.PRESS_MID };
const K = (name, t, n) => ({ name, t, cfg: Bd[name], arm: A[name], n });
const keys = [K('rack', 0), { same: 'rack', t: 0.6 }, K('dip', 0.95), { same: 'dip', t: 1.03 }, K('drive', 1.19), K('fly', 1.29), K('land', 1.37), K('split', 1.43), K('settle', 1.6), { same: 'settle', t: 2.2 },
  K('rec1a', 2.45), K('rec1', 2.7), K('rec2u', 2.8), K('rec2a', 2.97), K('top', 3.2), { same: 'top', t: 3.5 }, K('p50', 4.15, 1), { ref: 'rack', t: 4.8, n: 1 }, { same: 'rack', t: 6.0 }];
const { poses, keyframes, err } = P.chain(F, keys);
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [P.B.heldProp('r'), P.B.heldProp('l')];
const held = ['r', 'l'].map((side) => ({ side, grip: 'handle' }));
const rep = P.B.sweep(ex, { held });
const lr = F.report(ex);
const jump = P.jumps(ex);
const W = (n) => L.fk(poses[n], F.contacts), set = H.setKin(ex);
const Wd = W('dip'), Ws = W('settle'), Wt = W('top');
set('Dip', 'setup', `Knees ≈${Math.round(P.kneeOf(W('rack'), 'r'))}° standing`); set('Dip', 'peak', `≈${Math.round(P.kneeOf(Wd, 'r'))}° at the bottom of the dip, trunk upright (≈${Math.round(P.trunkLean(Wd))}°)`);
set('Split', 'setup', `Front foot ${FX} cm forward, back foot ${-BX} cm back (ankle positions), back heel up`);
set('Split', 'peak', `Front knee ≈${Math.round(P.kneeOf(Ws, 'r'))}° flexion (≈${180 - Math.round(P.kneeOf(Ws, 'r'))}° included), back knee ≈${Math.round(P.kneeOf(Ws, 'l'))}° (≈${180 - Math.round(P.kneeOf(Ws, 'l'))}° included)`);
set('Lockout', 'setup', 'Dumbbells on the shoulders'); set('Lockout', 'peak', `Elbows ≈${Math.round(P.B.elbowOf(Wt, 'r'))}° overhead, dumbbells over the shoulders`);
set('Tempo', 'setup', '0.35 s dip, short pause'); set('Tempo', 'peak', '0.4 s drive and split, 0.8 s hold, 1.0 s recovery, 1.3 s back to the shoulders');
console.log(`Dumbbell Split Jerk: wrote ${L.write(ex)}\n  err ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}\n  legs ${JSON.stringify(lr)} jump ${JSON.stringify(jump)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (rep.dbFloor < 0 || rep.dbBody < -3) { console.error('FAIL: dumbbell through the floor or the body'); process.exitCode = 1; }
