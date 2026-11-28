// Barbell Standing Leg Calf Raise (GymVisual #10379 "Barbell Standing Leg Calf Raise"; page not readable here, movement
// from the name and standard coaching): standing on both feet on the floor (feet hip width, ankle centres 22 cm apart, toes
// nearly straight) with a barbell on the upper back (high-bar position: bar on the upper traps just below C7, 80 cm overhand
// grip, elbows down and a little back, shoulder blades squeezed). Both heels rise together onto the balls of the feet
// (about 1 s), pause (0.8 s) and lower slowly (1.8 s), knees straight but soft. Each foot pivots about a fixed point under
// its ball (b4-calvesglutes ballPivot, as in the single-leg barbell calf raise); per key the root is moved so the centre of
// mass of body + bar (a 40 kg bar vs an 80 kg body) sits over mid-foot with the heels down and over the balls of the feet at
// the top. The rack stands behind. Bilateral. Family b6-01 (barbell arms from b5-bbsquat backBar).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const CG = require('./families/b4-calvesglutes');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const B3 = require('./families/b3-back');
const S5 = require('./families/b5-bbsquat');
const meta = require('./meta/barbell-standing-leg-calf-raise.json');

const TOE = 5, HALF = 11, PITCH_TOP = 30, BAR_KG = 40;
const st = L.POSES.standing({ stance: HALF, toeOut: TOE }).pose;
const contacts = [H.legC('r', { rot: H.footQ(0, -TOE) }), H.legC('l', { rot: H.footQ(0, TOE) })];
const ball = { r: CG.ballPivot([0, L.ANKLE_H, HALF], -TOE), l: CG.ballPivot([0, L.ANKLE_H, -HALF], TOE) };
const bar = S5.backBar(S5.HIGH_BAR);
const com = (W) => B3.comX(W, [{ c: EQ.barAt(W, BB.GRIP).c, kg: BAR_KG }], 80);
function poseAt(pitch) {
  const f = pitch / PITCH_TOP, tr = ball.r.ankleFor(pitch), tl = ball.l.ankleFor(pitch), footMid = V.add(tr, [5, 0, 0]);
  const wantX = footMid[0] + (ball.r.B[0] - 1.5 - footMid[0]) * f;
  const p = clone(st); delete p.ik;
  p.root.pos = [tr[0], 90, 0]; p.root.rot = { pitch: 0 };
  Object.assign(p.ch, { spine_l5: { rot: 0, flex: 2, latFlex: 0 }, spine_t12: { rot: 0, flex: 0, latFlex: 0 }, spine_t6: { rot: 0, flex: 0, latFlex: 0 }, neck_c7: { rot: 0, flex: 2 }, head_c1: { rot: 0, flex: 2 } });
  let q = p;
  for (let it = 0; it < 4; it++) {
    q = clone(p); q.ik = { leg_r: { target: tr, weight: 1, handRot: ball.r.rotFor(pitch) }, leg_l: { target: tl, weight: 1, handRot: ball.l.rotFor(pitch) } };
    let a = 70, b = 110; // knees straight but soft (4 degrees)
    for (let i = 0; i < 40; i++) { const y = (a + b) / 2; q.root.pos[1] = y; if (H.kneeOf(L.fk(q, contacts), 'r') > 4) a = y; else b = y; }
    q.root.pos[1] = +((a + b) / 2).toFixed(2);
    q = H.fitLeg(q, 'r', contacts[0], tr, { handRot: q.ik.leg_r.handRot, rot: -TOE });
    q = H.fitLeg(q, 'l', contacts[1], tl, { handRot: q.ik.leg_l.handRot, rot: -TOE });
    q = bar.armsFn(q);
    const c = com(L.fk(q, contacts));
    p.root.pos[0] = +(p.root.pos[0] + (wantX - c[0])).toFixed(2);
  }
  q.__com = com(L.fk(q, contacts)); q.__want = wantX;
  return q;
}
const N = 10, poses = {}, info = [];
for (let i = 0; i <= N; i++) { const q = poseAt(r1(PITCH_TOP * i / N)); info.push({ com: q.__com.map(r1), want: r1(q.__want) }); delete q.__com; delete q.__want; poses[`p${i}`] = q; }
{ const q = poseAt(PITCH_TOP + 0.6); delete q.__com; delete q.__want; poses.top2 = q; }
const keyframes = CG.raiseKeys(N, { hold: 2.2 });
CG.wrapAll(poses);
const ex = H.module_(meta, contacts, poses, keyframes);
const Wb0 = L.fk(poses.p0, contacts), bt = EQ.barAt(Wb0, BB.GRIP);
ex.props = [BB.barbellProp(), EQ.rack({ x: Math.round(bt.c[0] - 45), hookY: Math.round(bt.c[1] - 6), height: 200, width: 120 }).prop];
let ballDrift = 0, heelMax = 0;
const heel0 = ball.r.heelY(Wb0, 'r');
const SKIP = /^(hand|thumb|forearm)_|^traps_|^chest$|^neck$/;
const sw = BB.sweep(ex, { planted: [], skip: SKIP, probe: (W) => { ballDrift = Math.max(ballDrift, ball.r.drift(W, 'r'), ball.l.drift(W, 'l')); heelMax = Math.max(heelMax, ball.r.heelY(W, 'r') - heel0); } });
const rest = BB.sweep(ex, { planted: [] }, 120).barBody;
const Wt = L.fk(poses[`p${N}`], contacts);
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Ankle plantarflexion', 'setup', `${d(-H.dorsiOf(Wb0, 'r'))} (feet flat)`); set('Ankle plantarflexion', 'peak', `${d(-H.dorsiOf(Wt, 'r'))} (feet ${PITCH_TOP}° heel-up)`);
set('Heel height', 'setup', '0 cm (heels down)'); set('Heel height', 'peak', `≈${r1(heelMax)} cm`);
set('Knee', 'setup', `${d(H.kneeOf(Wb0, 'r'))} (straight but soft)`); set('Knee', 'peak', `${d(H.kneeOf(Wt, 'r'))}`);
set('Stance', 'setup', `Feet hip width (${2 * HALF} cm between the ankle centres), toes out ${TOE}°`); set('Stance', 'peak', 'Unchanged; the balls of the feet stay put');
set('Bar position', 'setup', `High bar on the upper traps, 80 cm grip; body + bar centre of mass ${r1(info[0].com[0] - ball.r.ankleFor(0)[0])} cm ahead of the ankles`); set('Bar position', 'peak', `Centre of mass ${r1(ball.r.B[0] - info[N].com[0])} cm behind the balls of the feet at the top`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '1.0 s up, 0.8 s pause, 1.8 s down, 0.6 s reset');
const travel = V.len(V.sub(Wt.pelvis.p, Wb0.pelvis.p));
ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel - 2), max: Math.ceil(travel + 2) };
console.log(`Barbell Standing Leg Calf Raise: wrote ${L.write(ex)}\n  sweep ${JSON.stringify(sw)} trapsRest ${rest}\n  ballDrift ${ballDrift.toFixed(3)} heelRise ${r1(heelMax)} travel ${r1(travel)} grip ${bar.st.worst.toFixed(2)} com ${JSON.stringify([info[0], info[N]])}`);
if (ballDrift > 0.05) { console.error('FAIL: ball of the foot slides'); process.exitCode = 1; }
if (sw.widthRange > 1.0 || bar.st.worst > 0.5) { console.error('FAIL: hands do not stay on the bar'); process.exitCode = 1; }
if (sw.barFloor < 0 || sw.barBody < 0 || rest < -1.5 || sw.floor < -0.5) { console.error('FAIL: collision'); process.exitCode = 1; }
const lim = S5.limits(ex); if (Object.keys(lim).length) { console.error(`FAIL: joint limits ${JSON.stringify(lim)}`); process.exitCode = 1; }
