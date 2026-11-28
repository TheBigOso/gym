// Band Bent over Hip Extension (GymVisual 9344; movement reference only, page not readable): standing on the left leg
// (planted contact, knee soft), hinged forward about 50 degrees from the hips with a flat back, both hands braced on a
// box in front (planted hand contacts, palms down) holding the two ends of a band that is looped round the right foot
// (band anchored to the moving foot, two strands up to the hands). The nearly straight right leg pushes back from the
// hip, from hanging under the hip to about in line with the trunk, short squeeze, controlled return with the toes just
// off the floor. The pelvis and trunk stay still. Authored on the right leg. Built like author-standing-hip-extension.js.
// Tempo: 1.2 s back, 0.6 s hold, 1.4 s return, 0.8 s pause.
const L = require('./lib');
const { R, V, r1, clone } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const meta = require('./meta/band-bent-over-hip-extension.json');

const ID = 'band-bent-over-hip-extension';
const TOE = 6, HALF = 9, LEAN = 50, PALM = 2.6;
const contacts = [H.legC('l', { rot: H.footQ(0, TOE) }), H.handC('r'), H.handC('l')];
const legOnly = [contacts[0]];
const st = L.POSES.standing({ stance: HALF, toeOut: TOE }).pose;
const FOOT_L = [0, L.ANKLE_H, -HALF];
const HIP_END = -8;
// f: 0 = leg under the hip, 1 = leg back in line with the trunk
function poseAt(f, HAND) {
  const p = clone(st);
  p.root.pos = [0, 80, -2]; p.root.rot = { pitch: -LEAN };
  Object.assign(p.ch, { spine_l5: { rot: 0, flex: 2, latFlex: 0 }, spine_t12: { rot: 0, flex: 2, latFlex: 0 }, spine_t6: { rot: 0, flex: 2, latFlex: 0 } });
  p.ch.neck_c7 = { rot: 0, flex: -18 }; p.ch.head_c1 = { rot: 0, flex: -8 };
  p.ik = { leg_l: { target: FOOT_L.slice(), weight: 1 } };
  // stance knee about 15 degrees: root height by bisection
  let a = 60, b = 100;
  for (let i = 0; i < 50; i++) { const y = (a + b) / 2; p.root.pos[1] = y; if (H.kneeOf(L.fk(p, legOnly), 'l') > 15) a = y; else b = y; }
  p.root.pos[1] = r1((a + b) / 2);
  let q = H.fitLeg(p, 'l', contacts[0], FOOT_L, { rot: -TOE });
  const h0 = q.ch.hip_l.flex - (+(process.env.H0 ?? 20)), k = f * f * (3 - 2 * f);
  q.ch.hip_r = { flex: r1(h0 + (HIP_END - h0) * k), abd: 2, rot: 0 }; q.ch.knee_r = { flex: r1(+(process.env.K0 ?? 35) * (1 - k) + 5 * k) }; q.ch.ankle_r = { dorsi: r1(-10 - 15 * k) };
  q.ch.sc_r = { protract: 8, elevate: 0 }; q.ch.sc_l = clone(q.ch.sc_r);
  if (HAND) for (const s of ['r', 'l']) { q = H.fitArm(q, s, contacts.find((c) => c.id === `arm_${s}`), HAND[s], [{ [`shoulder_${s}`]: { plane: 90, elev: 70, axial: 0 }, [`elbow_${s}`]: { flex: 10 }, [`wrist_${s}`]: { pron: 0, flex: -70, dev: 0 } }]); delete q.__cost; q.ik[`arm_${s}`] = { target: HAND[s].slice(), weight: 1 }; }
  return q;
}
// hands: below and in front of the shoulders (arms nearly straight, reaching down and forward) on the box top
const W0 = L.fk(poseAt(0), legOnly), S = W0.shoulder_r.p, dir = V.norm([0.35, -1, 0]), R0 = L.reach(25);
const HY = r1(S[1] + dir[1] * R0), HX = r1(S[0] + dir[0] * R0);
const HAND = { r: [HX, HY, r1(S[2] - 2)], l: [HX, HY, r1(-S[2] + 2)] };
const box = { id: 'box', kind: 'box', center: [r1(HX + 8), 0, 0], size: [36, r1(HY - PALM), 60] };
const keys = { stand: 0, e25: 0.25, e50: 0.5, e75: 0.75, back: 1 };
const poses = Object.fromEntries(Object.entries(keys).map(([n, f]) => [n, poseAt(f, HAND)]));
poses.hold = clone(poses.back); poses.hold.ch.hip_r.flex = r1(poses.back.ch.hip_r.flex - 1);
const keyframes = [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.1, pose: 'e25' }, { t: 1.4, pose: 'e50' }, { t: 1.7, pose: 'e75' }, { t: 2.0, pose: 'back' }, { t: 2.3, pose: 'hold' }, { t: 2.6, pose: 'back' },
  { t: 2.95, pose: 'e75' }, { t: 3.3, pose: 'e50' }, { t: 3.65, pose: 'e25' }, { t: 4.0, pose: 'stand' }, { t: 5.0, pose: 'stand' }];
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [box, { id: 'band', kind: 'band', anchorJoint: 'toe_r', attach: { joint: 'wrist_r', with: 'wrist_l' } }];

// loop checks: planted foot and hands, floor (moving foot at least 1 cm up), band strands clear of the body, hands on the
// box, joint limits
let footMin = 1e9, strand = { d: 1e9 }, len = [1e9, -1e9];
const rep = H.loopReport(ex, { planted: ['leg_l', 'arm_r', 'arm_l'], probe: (W, pz, t) => {
  footMin = Math.min(footMin, H.bottomOf(W, 'foot_r'));
  for (const s of ['r', 'l']) {
    const a = W.toe_r.p, b = EQ.gripPoint(W, s).p, c = EQ.segmentClear(W, a, b, 0.6, { skip: /^(hand|thumb|forearm)_|^foot_r$/ });
    if (c.d < strand.d) strand = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) };
    const l = V.len(V.sub(a, b)); len = [Math.min(len[0], l), Math.max(len[1], l)];
  }
} });
const fail = (m) => { console.error(`FAIL ${ID}: ${m}`); process.exitCode = 1; };
if (rep.slide > 0.05) fail(`planted contact slides ${rep.slide}`);
if (footMin < 1) fail(`moving foot scuffs the floor (${footMin.toFixed(2)} cm)`);
if (strand.d < 0) fail(`band into the body ${JSON.stringify(strand)}`);
const viol = [];
for (const [n, p] of Object.entries(poses)) for (const j in p.ch) { const lim = L.rig.byId[j] && L.rig.byId[j].limits; if (lim) for (const c in p.ch[j]) if (lim[c] && (p.ch[j][c] < lim[c][0] - 0.5 || p.ch[j][c] > lim[c][1] + 0.5)) viol.push(`${n}.${j}.${c}=${p.ch[j][c]}`); }
if (viol.length) fail(`joint limits ${viol.join(', ')}`);

const Ws = L.fk(poses.stand, contacts), Wb = L.fk(poses.back, contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const thighTrunk = (W) => V.angle(V.sub(W.knee_r.p, W.hip_r.p), V.sub(W.pelvis.p, W.neck_c7.p));
const trunk = V.angle(V.sub(Ws.neck_c7.p, Ws.pelvis.p), [0, 1, 0]);
set('Hip extension', 'setup', `Hip flexion ${poses.stand.ch.hip_r.flex}° (leg under the hip)`); set('Hip extension', 'peak', `Hip ${poses.back.ch.hip_r.flex}° (${Math.abs(poses.back.ch.hip_r.flex)}° of extension; rig limit 20°)`);
set('Thigh to trunk', 'setup', `${d(thighTrunk(Ws))} from the trunk line`); set('Thigh to trunk', 'peak', `${d(thighTrunk(Wb))} (about in line)`);
set('Trunk inclination', 'setup', `${d(trunk)} forward, hands on a ${box.size[1]} cm box`); set('Trunk inclination', 'peak', 'Unchanged');
set('Knee', 'setup', `Moving knee ${d(H.kneeOf(Ws, 'r'))}, stance ${d(H.kneeOf(Ws, 'l'))}`); set('Knee', 'peak', `Moving knee ${d(H.kneeOf(Wb, 'r'))}`);
set('Tempo', 'setup', 'Pause 0.8 s'); set('Tempo', 'peak', '1.2 s back, 0.6 s hold, 1.4 s return');
set('Band', 'setup', `Looped round the right foot, ${Math.round(len[0])} cm from foot to hands`); set('Band', 'peak', `Stretched to ${Math.round(len[1])} cm; strands clear of the body by ${strand.d} cm or more`);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(trunk - 5), max: Math.ceil(trunk + 5) };
console.log(`Band Bent over Hip Extension: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  foot min ${footMin.toFixed(2)} strand ${JSON.stringify(strand)} len ${len.map(r1)} box ${JSON.stringify(box)} hand ${JSON.stringify(HAND)}`);
