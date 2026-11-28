// Cable Alternate Triceps Extension (GymVisual 13756; movement reference only, page not readable; taken as alternating
// one-arm pushdowns): standing facing a high pulley, feet about hip width (planted leg contacts), knees soft, a slight
// forward lean. A D-handle (cable attachment 'handle') in each hand, both on the same pulley, palms down. Both upper arms
// stay pinned at the sides (shoulder plane and elevation held, so the elbows do not move). The right elbow straightens
// from 90 degrees to about 8 degrees and returns while the left holds at 90 degrees; then the left arm does the same.
// Bilateral, alternating (right arm solved, the left arm uses the mirrored keys). Tempo per arm: 1 s down, 0.4 s at the
// bottom, 1.8 s up. Keys from build/families/b6-09.js pushdownKeys (the method of author-cable-one-arm-triceps-pushdown.js).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const P = require('./families/b5-cablepush');
const X = require('./families/b6-09');
const meta = require('./meta/cable-alternate-triceps-extension.json');

const ID = 'cable-alternate-triceps-extension';
const st = F.standing({ stance: 14, knee: 8, lean: 6 });
const base = clone(st.pose);
base.ch.sc_r = { protract: 2, elevate: -2 }; base.ch.sc_l = clone(base.ch.sc_r);
base.ch.neck_c7 = { rot: 0, flex: 0 }; base.ch.head_c1 = { rot: 0, flex: 2 };
const FLEX = { top: 90, d1: 70, d2: 45, d3: 25, d4: 14, bottom: 8 };
const { arms, err } = X.pushdownKeys(base, st.contacts, { uaFwd: 12, flexes: FLEX });
const poses = {};
for (const n of Object.keys(FLEX)) { poses[`R_${n}`] = X.twoArms(base, arms, n, 'top'); if (n !== 'top') poses[`L_${n}`] = X.twoArms(base, arms, 'top', n); }
poses.top = poses.R_top; delete poses.R_top;
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const DN = ['d1', 'd2', 'd3', 'd4'], fDn = [0.25, 0.48, 0.7, 0.86], fUp = [0.2, 0.42, 0.66, 0.85];
const keyframes = [{ t: 0, pose: 'top' }];
for (const s of ['R', 'L']) {
  const push = ph[`push${s}`], hold = ph[`hold${s}`], ret = ph[`return${s}`];
  keyframes.push({ t: push.start, pose: 'top' });
  DN.forEach((n, i) => keyframes.push({ t: r1(100 * (push.start + (push.end - push.start) * fDn[i])) / 100, pose: `${s}_${n}` }));
  keyframes.push({ t: push.end, pose: `${s}_bottom` }, { t: hold.end, pose: `${s}_bottom` });
  [...DN].reverse().forEach((n, i) => keyframes.push({ t: r1(100 * (ret.start + (ret.end - ret.start) * fUp[i])) / 100, pose: `${s}_${n}` }));
}
keyframes.push({ t: ph.returnL.end, pose: 'top' }, { t: D, pose: 'top' });
// the hold keys reuse the bottom pose: monotone cubic interpolation keeps it still between two equal keys

const ex = H.module_(meta, st.contacts, poses, keyframes);
const Wt = L.fk(poses.top, st.contacts), Wb = L.fk(poses.R_bottom, st.contacts), gt = EQ.gripPoint(Wt, 'r').p;
const ANCHOR = [r1(gt[0] + 4), 205, 0];
ex.props = [EQ.cableTower(ANCHOR, { offset: [22, 0] }),
  { id: 'handle_r', kind: 'cable', attachment: 'handle', anchor: ANCHOR, attach: { joint: 'wrist_r' } },
  { id: 'handle_l', kind: 'cable', attachment: 'handle', anchor: ANCHOR, attach: { joint: 'wrist_l' } }];

const rep = C.scan(ex, { line: (W) => [ANCHOR, EQ.gripPoint(W, 'r').p], lineSkip: /^(hand|thumb|forearm)_r$/ });
let lineL = { d: 1e9 }, hc = { d: 1e9 }, drift = 0;
H.loopReport(ex, { probe: (W, pz, t) => {
  const c = EQ.lineClear(W, ANCHOR, EQ.gripPoint(W, 'l').p, 0.5, { skip: /^(hand|thumb|forearm)_l$/ }); if (c.d < lineL.d) lineL = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) };
  for (const s of ['r', 'l']) { const k = P.pointClear(W, EQ.gripPoint(W, s).p, new RegExp(`^(hand|thumb|forearm)_${s}$`)); if (k.d - 3 < hc.d) hc = { d: +(k.d - 3).toFixed(2), id: k.id, t: +t.toFixed(2) }; }
  drift = Math.max(drift, V.len(V.sub(W.elbow_r.p, Wt.elbow_r.p)), V.len(V.sub(W.elbow_l.p, Wt.elbow_l.p)));
} });
C.gate(ID, rep, { minLine: 1, checkWidth: false });
C.limits(poses);
const fail = (m) => { console.error(`FAIL ${ID}: ${m}`); process.exitCode = 1; };
if (lineL.d < 1) fail(`left cable into the body ${JSON.stringify(lineL)}`);
if (hc.d < 0) fail(`handle into the body ${JSON.stringify(hc)}`);
if (drift > 0.04) fail(`elbows move ${drift.toFixed(3)} cm`);

const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const uaAng = V.angle(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p), [0, -1, 0]);
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wt))} both arms (forearms about level)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wb))} on the working arm, the other held at ${d(C.elbowAng(Wb, 'l'))}`);
set('Upper arm', 'setup', `${d(uaAng)} forward of vertical, elbows at the sides`); set('Upper arm', 'peak', `Unchanged (elbows move ${drift.toFixed(2)} cm over the loop)`);
set('Grip', 'setup', `Palms down, handles ${r1(gt[2])} cm either side of the midline`); set('Grip', 'peak', 'Working palm turns back beside the thigh');
set('Trunk', 'setup', P.leanText(Wt)); set('Trunk', 'peak', 'Unchanged, square to the tower');
set('Tempo', 'setup', 'Pause 0.4 s with both elbows at 90 degrees'); set('Tempo', 'peak', 'Each arm: 1 s down, 0.4 s at the bottom, 1.8 s up');
console.log(`Cable Alternate Triceps Extension: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  anchor ${ANCHOR}\n  ${JSON.stringify(rep)}\n  lineL ${JSON.stringify(lineL)} handle ${JSON.stringify(hc)} drift ${drift.toFixed(3)}`);
