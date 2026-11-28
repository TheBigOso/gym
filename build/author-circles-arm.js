// Circles Arm (GymVisual 9277, movement reference only; page not readable at authoring time). Standing tall, feet hip
// width (planted). The straight arms rise out to the sides to shoulder height, palms down, and draw small circles with
// the hands (about a hand span across): four forward circles, then four backward, then the arms lower. The trunk stays
// upright and still. Bilateral, symmetric. Each circle is keyed every 45 degrees so the interpolation stays round.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const meta = require('./meta/circles-arm.json');

const ST = L.POSES.standing();
const contacts = ST.contacts;
const base = (() => { let p = clone(ST.pose); for (const s of ['r', 'l']) p = H.fitLeg(p, s, contacts.find((c) => c.id === `leg_${s}`), p.ik[`leg_${s}`].target); return p; })();
const P0 = 8, E0 = 88, AMP = 8, CIRCLE = 0.8; // arms 8 degrees in front of the frontal plane at shoulder height; circle radius 8 degrees
function arms(plane, elev, sc = { protract: 2, elevate: 6 }) {
  const p = clone(base);
  p.ch.shoulder_r = { plane: r1(plane), elev: r1(elev), axial: 0 }; p.ch.elbow_r = { flex: 4 }; p.ch.wrist_r = { pron: 0, flex: 0, dev: 0 }; p.ch.sc_r = clone(sc);
  for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) p.ch[`${j}_l`] = clone(p.ch[`${j}_r`]);
  return p;
}
// th = 0 top of the circle; forward circles go top -> front -> bottom -> back (plane rises first)
const onCircle = (th) => arms(P0 + AMP * Math.sin(th * Math.PI / 180), E0 + AMP * Math.cos(th * Math.PI / 180));
const poses = { down: arms(0, 6, { protract: 0, elevate: 0 }), half: arms(4, 50, { protract: 1, elevate: 3 }) };
for (let k = 0; k < 8; k++) poses[`c${k * 45}`] = onCircle(k * 45);
const keyframes = [{ t: 0, pose: 'down' }, { t: 0.4, pose: 'half' }, { t: 0.8, pose: 'c0' }];
const step = CIRCLE / 8;
for (let i = 1; i <= 32; i++) keyframes.push({ t: +(0.8 + step * i).toFixed(3), pose: `c${(i % 8) * 45}` });         // forward
for (let i = 1; i <= 32; i++) keyframes.push({ t: +(4.0 + step * i).toFixed(3), pose: `c${((8 - (i % 8)) % 8) * 45}` }); // backward
keyframes.push({ t: 7.6, pose: 'half' }, { t: 8.0, pose: 'down' });
const ex = H.module_(meta, contacts, poses, keyframes);
for (const p of Object.values(ex.poses)) p.ik = clone(base.ik);
const Wd = L.fk(poses.down, contacts), trunk = V.angle(V.sub(Wd.neck_c7.p, Wd.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.max(0, Math.floor(trunk - 3)), max: Math.ceil(trunk + 3) };
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'] });
let hand = [1e9, -1e9], span = 0; const tl = L.R.buildTimeline(ex), S0 = L.fk(poses.c0, contacts).shoulder_r.p;
const pts = [];
for (let t = 0.8; t <= 4.0; t += 0.01) { const W = L.R.evalPose(L.rig, tl.pose(t), contacts); pts.push(W.wrist_r.p); hand = [Math.min(hand[0], W.wrist_r.p[1]), Math.max(hand[1], W.wrist_r.p[1])]; }
for (const a of pts) for (const b of pts) span = Math.max(span, V.len(V.sub(a, b)));
const set = H.setKin(ex), Wc = L.fk(poses.c90, contacts);
set('Shoulder abduction', 'setup', 'Arms by the sides'); set('Shoulder abduction', 'peak', `Elevation ${E0 - AMP}-${E0 + AMP}° (shoulder height), plane ${P0 - AMP} to ${P0 + AMP}°`);
set('Circle size', 'setup', '–'); set('Circle size', 'peak', `Wrist circle about ${Math.round(span)} cm across (wrist ${r1(hand[0] - S0[1])} to +${r1(hand[1] - S0[1])} cm about shoulder height)`);
set('Elbows', 'setup', '≈4°'); set('Elbows', 'peak', '≈4°');
set('Trunk', 'setup', `≈${Math.round(trunk)}° from vertical`); set('Trunk', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Arms up 0.8 s'); set('Tempo', 'peak', `4 forward and 4 backward circles, ${CIRCLE} s each; arms down 0.8 s`);
console.log(`Circles Arm: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} circle ${span.toFixed(1)} cm trunk ${trunk.toFixed(1)} handFront ${r1(Wc.wrist_r.p[0])}`);
if (rep.slide > 0.05 || rep.floor < -0.5) { console.error('FAIL'); process.exitCode = 1; }
