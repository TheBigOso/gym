// Dumbbell Drag Curl (GymVisual #368712): standing, dumbbells in front of the thighs, palms forward. Both dumbbells slide
// straight up the front of the body (handles a little off the skin) while the elbows travel back behind the trunk line,
// to the lower chest; short squeeze, slow slide back down. Bilateral.
const L = require('./lib');
const { V, r1, clone } = L;
const C = require('./families/b3-curls');
const K = require('./families/b4-curls2');
const meta = require('./meta/dumbbell-drag-curl.json');

const ENV = (k, d) => +(process.env[k] ?? d);
// rig clearance (cm) between the dumbbell and the trunk/thighs along the drag path: the skinned mesh is slimmer than the rig
// shapes (measured in the player: rig 1.2 cm gave mesh gaps of about 3.4 cm at the thighs and 6-8 cm at the lower chest, and rig -1.2 / -4.4 cm gave 2-3.4 / 4 cm), so
// the rig gap goes negative to leave about 1 cm on the mesh
const GAP0 = ENV('GAP0', -2.2), GAP1 = ENV('GAP1', -6), GAP = (f) => GAP0 + (GAP1 - GAP0) * f;
const HZ = ENV('HZ', 17.5);           // handle centre out from the midline (cm)
const Y0 = ENV('Y0', 79.5), Y1 = ENV('Y1', 117);  // handle height at the bottom and the top of the drag
const { contacts, base } = C.standing({});
const thumb = [0, 0, 1];
// handle x for a given height: slide forward from inside the body until the dumbbell clears the trunk and thighs by GAP
function solveAt(f, guess) {
  const y = Y0 + (Y1 - Y0) * f;
  const elbowBack = [6 - ENV('EB', 18) * f, 111 + 5 * f, 23 - 1 * f];
  let lo = 0, hi = 30, p = null;
  const at = (x) => K.handleArm(base, [x, y, HZ], { axis: thumb, elbow: elbowBack, elbowW: 0.25, guesses: [guess], contacts, extra: [L.obj.reg('ch.shoulder_r.plane', guess[0], 0.03)] });
  for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2, q = at(m), c = C.bodyClearance(L.fk(q, contacts), 'r'); if (c.d > GAP(f)) { hi = m; p = q; } else lo = m; }
  if (!p) p = at(hi);
  p.__err = V.len(V.sub(require('./families/dumbbell').dumbbellAt(L.fk(p, contacts), 'r').c, [hi, y, HZ]));
  p.__x = hi; return p;
}
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1];
const poses = {}, names = [];
// solve from the top down so every key stays on one shoulder branch (plane/axial are ill-defined near elev 0)
let g = [-59, 26, 73, 118, -6];
const sol = {};
for (const f of FS.slice().reverse()) { const p = solveAt(f, g); g = [p.ch.shoulder_r.plane, p.ch.shoulder_r.elev, p.ch.shoulder_r.axial, p.ch.elbow_r.flex, p.ch.wrist_r.pron]; sol[f] = p; }
FS.forEach((f, i) => {
  const p = sol[f];
  if (process.env.DEBUG) console.log(f, p.__x.toFixed(1), p.__err.toFixed(2), p.__cost.toFixed(3), JSON.stringify([p.ch.shoulder_r, p.ch.elbow_r, p.ch.wrist_r]));
  delete p.__cost; delete p.__x; delete p.__err;
  K.mirrorArmTo(p);
  if (i) K.unwrapTo(p, poses[names[i - 1]]);
  poses[`d${i}`] = p; names.push(`d${i}`);
});
// shoulders draw back a little at the top (scapular retraction)
for (let i = 0; i < FS.length; i++) for (const s of ['r', 'l']) poses[names[i]].ch[`sc_${s}`] = { protract: r1(-2 - 6 * FS[i]), elevate: 0 };
const ph = (id) => C.phase(meta, id);
const keyframes = K.keys(names, FS, { t0: ph('lift').start, t1: ph('lift').end, t2: ph('top').end, t3: ph('lower').end, D: meta.timeline.duration });
const ex = K.assemble(meta, { contacts, poses, keyframes });
const rep = K.report(ex);
const Wb = L.fk(poses.d0, contacts), Wt = L.fk(poses[names[names.length - 1]], contacts);
C.fillCurlKin(ex, Wb, Wt, poses.d0, poses[names[names.length - 1]], 'r', ['Arms straight 0.6 s', '1.2 s up, 0.3 s squeeze, 2.4 s down, 0.9 s at the bottom']);
const L1 = require('./families/dumbbell');
const hb = L1.dumbbellAt(Wb, 'r', 'handle').c, ht = L1.dumbbellAt(Wt, 'r', 'handle').c;
C.setKin(ex, 'Dumbbell path', 'setup', `Handle at ${r1(hb[1])} cm high, ${r1(hb[0])} cm in front of the pelvis centre`);
C.setKin(ex, 'Dumbbell path', 'peak', `Handle at ${r1(ht[1])} cm high (lower chest), ${r1(ht[0])} cm forward: rises ${r1(ht[1] - hb[1])} cm, moves ${r1(ht[0] - hb[0])} cm fore-aft`);
console.log(`Dumbbell Drag Curl: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}`);
K.fail(rep, 'drag curl', [], { bodyTol: GAP1 - 0.5 });
