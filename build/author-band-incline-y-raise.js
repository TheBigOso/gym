// Band Incline Y Raise (GymVisual #16987, Band Incline Y Raise; movement reference only, the page could not be read here,
// so the movement follows the name): adjustable bench with the back pad at 45 degrees. Straddle the seat and lie chest-down
// on the pad, chin just over the top, balls of the feet planted behind (the chest-supported row set-up). A band is looped
// low round the upright of a power rack standing in front of the bench; the hands hold the two strands, thumbs forward,
// arms hanging straight down beside the pad. The straight arms (soft elbows) rise forward and up into a Y, about 45
// degrees out from the line of the trunk, until they are in line with the back, thumbs up; short hold, slow lower. The
// chest stays on the pad; only the arms and shoulder blades move. Bilateral: right arm solved from world directions, left
// mirrored.
const L = require('./lib');
const { V, r1, clone } = L;
const B3 = require('./families/b3-back');
const F3 = require('./families/b3-shoulders');
const K = require('./families/b4-curls2');
const BP = require('./families/b5-bandpull');
const CB = require('./families/eq-cable');
const H = require('./families/hips');
const F = require('./families/b6-11');
const meta = require('./meta/band-incline-y-raise.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const ANG = 45;
const P = K.chestOnPad({ ang: ANG, along: ENV('SA', 22), foot: [ENV('FX', -50), 26], neck: -14, head: -16 });
const { bench, contacts, body, dir: padDir } = P;
const W0 = L.fk(body, contacts), S = W0.shoulder_r.p;
const t = V.norm(V.sub(W0.neck_c7.p, W0.pelvis.p)), nb = V.norm([-t[1], t[0], 0]); // trunk axis (up the pad), back normal
const OUTB = ENV('OUTB', 0.12), YA = ENV('YA', 45) * Math.PI / 180, LIFT = ENV('LIFT', 0.08);
const down = V.norm([0, -1, OUTB]), yDir = V.norm(V.add(V.add(V.scale(t, Math.cos(YA)), [0, 0, Math.sin(YA)]), V.scale(nb, LIFT)));
// long arm along `d` from the shoulder (after the girdle change), thumb toward `th` (made perpendicular to the arm)
function arm(d, th, sc, guess) {
  const p = clone(body); p.ch.sc_r = clone(sc); p.ch.sc_l = clone(sc);
  // wrist a little short of full reach so the elbows stay soft (about 10 degrees); the thumb sets the swivel
  const Sh = L.fk(p, contacts).shoulder_r.p, Wt = V.add(Sh, V.scale(d, (L.UA + L.FA) * ENV('REACH', 0.995)));
  const thp = V.norm(V.sub(th, V.scale(d, V.dot(th, d))));
  return F3.solveArm(p, { wrist: Wt, thumb: thp, wThumb: 4, guess });
}
const FS = { bottom: 0, r25: 0.25, r50: 0.5, r75: 0.75, top: 1 }, poses = {}, err = {};
let guess = { plane: 90, elev: 50, axial: 0, flex: 6, pron: 90 };
for (const [name, f] of Object.entries(FS)) {
  const d = BP.slerp(down, yDir, f), th = BP.slerp([1, 0, 0], nb, f);
  const q = arm(d, th, { protract: r1(6 - 10 * f), elevate: r1(10 * f * f) }, guess);
  err[name] = q.__err; guess = F3.armGuess(q); poses[name] = F3.mirrorArm(q); B3.wrapPose(poses[name]);
}
const keyframes = F.raiseFrames(meta);
const RKX = r1(Math.max(L.fk(poses.bottom, contacts).wrist_r.p[0] + ENV('AXD', 45), L.fk(poses.top, contacts).wrist_r.p[0] + ENV('AXT', 25)));
const RK = BP.rackAnchor({ x: RKX, y: ENV('AY', 10) }), ANCHOR = RK.anchor;
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [bench.prop, RK.rack, RK.band];
const rep = B3.sweep(ex, { fixed: ['pelvis', 'ankle_r', 'ankle_l'], boxes: P.boxes, bodySkip: ['chest', 'pecs_r', 'pecs_l', 'ribcage', 'abdomen'] }, 600);
let strandBox = { d: 1e9 };
const sc = BP.scan(ex, { strands: BP.rackStrands(ANCHOR), probe: (W, pz, tt) => { for (const [a, b] of BP.rackStrands(ANCHOR)(W)) for (let k = 0; k <= 40; k++) { const p = V.lerp(a, b, k / 40); for (const bx of P.boxes) { const dd = B3.boxDist(p, bx) - 0.6; if (dd < strandBox.d) strandBox = { d: +dd.toFixed(2), box: bx.id, t: +tt.toFixed(2) }; } } } });
BP.gate('band-incline-y-raise', sc, { minLine: 0.3 });
CB.limits(poses);
if (strandBox.d < 0.5) { console.error(`FAIL: band through the bench ${JSON.stringify(strandBox)}`); process.exitCode = 1; }
if (rep.drift > 0.05) { console.error('FAIL: pelvis or feet drift'); process.exitCode = 1; }
if (rep.bodyBox < -0.5) { console.error(`FAIL: body through the bench ${JSON.stringify(rep.bodyBoxAt)}`); process.exitCode = 1; }
const Wb = L.fk(poses.bottom, contacts), Wt = L.fk(poses.top, contacts), set = H.setKin(ex);
const uaT = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(W.pelvis.p, W.neck_c7.p));
const outOfLine = (W) => { const u = V.norm(V.sub(W.wrist_r.p, W.shoulder_r.p)), tt = V.norm(V.sub(W.neck_c7.p, W.pelvis.p)); return Math.round(Math.acos(Math.max(-1, Math.min(1, V.dot(u, tt)))) / (Math.PI / 180)); };
set('Bench angle', 'setup', `${ANG}° back pad (80 cm), seat 45 cm`); set('Bench angle', 'peak', `Trunk ≈${Math.round(90 - B3.trunkLean(Wb))}° above horizontal, along the pad`);
set('Shoulder elevation', 'setup', `≈${Math.round(uaT(Wb))}° from the trunk line (arms hanging)`); set('Shoulder elevation', 'peak', `≈${Math.round(uaT(Wt))}° (arms ≈${outOfLine(Wt)}° out from the line of the trunk, in a Y)`);
set('Chest on the pad', 'setup', `Chest on the pad; head ${r1(P.along(Wb, 'head_c1') - P.PAD)} cm past the top edge`); set('Chest on the pad', 'peak', 'Unchanged (the trunk does not move)');
F.bandRow(ex, `Looped round the rack upright ${ANCHOR[1]} cm off the floor, ${Math.round(ANCHOR[0] - Wb.wrist_r.p[0])} cm in front of the hanging hands; strands ${sc.strand[0]} cm`, `Strands ${sc.strand[1]} cm with the arms in the Y`);
set('Tempo', 'setup', 'Arms hanging 0.6 s'); set('Tempo', 'peak', '2.0 s up, 0.4 s hold, 2.2 s down');
const tf = B3.trunkLean(Wb);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
console.log(`Band Incline Y Raise: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}\n  ${JSON.stringify(sc)} strandBox ${JSON.stringify(strandBox)} anchor ${ANCHOR}`);
