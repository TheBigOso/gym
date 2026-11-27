// Cable Lateral Raise (GymVisual, Cable Lateral Raise; movement reference only): one-arm lateral raise from a low pulley
// on the opposite (left) side. Standing tall side-on to the stack, feet about hip width (planted leg contacts), knees
// soft, left hand on the hip. The right hand holds a D-handle (cable attachment 'handle') in front of the hips, so the
// cable crosses in front of the body; the arm rises out to the side to about shoulder height, finishing in the scapular
// plane (30 degrees in front of the frontal plane) with a soft elbow and the thumb forward, then lowers back across.
// Authored right (the player mirrors the tower for the left clip). 1.8 s up, 0.4 s pause, 2 s down, 0.6 s pause.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const S = require('./families/b4-shoulders2');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const meta = require('./meta/cable-lateral-raise.json');

const P0 = 115, E0 = 24, P1 = 30, E1 = 86, AXIAL = -20;
const ANCHOR = [22, 15, -50]; // low pulley, in front of and left of the athlete
const st = F.standing({ stance: 12, knee: 6 });
const base = S.leftOnHip(st.pose);
// raise path: elevation linear, plane swings out early (sqrt) so the hand leaves the front of the hips
const key = (name, f) => { const elev = E0 + (E1 - E0) * f, plane = P0 + (P1 - P0) * Math.sqrt(f); return { name, plane, elev, axial: AXIAL, flex: 14 + 4 * f, pron: 90, palm: S.palmDown(elev, plane), sc: { protract: r1(2 + 2 * f), elevate: r1(6 * f * f) } }; };
const { poses: raw, err } = F.armKeys(base, [key('bottom', 0), key('r10', 0.1), key('r25', 0.25), key('r50', 0.5), key('r75', 0.75), key('top', 1)], st.contacts);
const keepLeft = (p) => { const q = clone(p); for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) q.ch[`${j}_l`] = clone(base.ch[`${j}_l`]); delete q.__err; return q; };
const poses = Object.fromEntries(Object.entries(raw).map(([k, p]) => [k, keepLeft(p)]));
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const keyframes = [{ t: 0, pose: 'bottom' }, { t: ph.raise.start, pose: 'bottom' }, { t: 0.85, pose: 'r10' }, { t: 1.1, pose: 'r25' }, { t: 1.55, pose: 'r50' }, { t: 1.98, pose: 'r75' }, { t: ph.top.start, pose: 'top' },
  { t: ph.top.end, pose: 'top' }, { t: 3.3, pose: 'r75' }, { t: 3.8, pose: 'r50' }, { t: 4.3, pose: 'r25' }, { t: 4.55, pose: 'r10' }, { t: ph.reset.start, pose: 'bottom' }, { t: D, pose: 'bottom' }];

const ex = H.module_(meta, st.contacts, poses, keyframes);
ex.props = [EQ.cableTower(ANCHOR), { id: 'handle', kind: 'cable', attachment: 'handle', anchor: ANCHOR, attach: { joint: 'wrist_r' } }];

// loop checks: feet, floor, channel jumps, the cable clear of the body (only the right hand and forearm that hold the
// handle are skipped: the left hand rests on the hip next to the cable's path), the handle clear of the hips and thighs
const SKIP_R = /^(hand|thumb|forearm)_r$/;
const rep = C.scan(ex, { line: (W) => [ANCHOR, EQ.attachPoint(W, { side: 'r' })], lineSkip: SKIP_R });
let hc = { d: 1e9 };
H.loopReport(ex, { probe: (W, pz, t) => { const g = EQ.gripPoint(W, 'r').p; for (const id of ['pelvis', 'abdomen', 'thigh_r', 'thigh_l', 'quad_r', 'quad_l', 'buttock_r']) { const d = EQ.pointShape(W, g, id) - 3; if (d < hc.d) hc = { d: +d.toFixed(2), id, t: +t.toFixed(2) }; } } });
C.gate('cable-lateral-raise', rep, { minLine: 1, checkWidth: false });
C.limits(poses);
if (hc.d < 0) { console.error(`FAIL cable-lateral-raise: handle into the body ${JSON.stringify(hc)}`); process.exitCode = 1; }

const Wb = L.fk(poses.bottom, st.contacts), Wt = L.fk(poses.top, st.contacts), set = H.setKin(ex), gb = EQ.gripPoint(Wb, 'r').p;
set('Shoulder abduction', 'setup', `≈${Math.round(S.humElev(Wb))}° (handle in front of the hips, ${Math.round(gb[2])} cm from the midline)`); set('Shoulder abduction', 'peak', `≈${Math.round(S.humElev(Wt))}° (elbow at shoulder height, ${Math.round(Wt.elbow_r.p[1] - Wt.shoulder_r.p[1])} cm)`);
set('Plane of elevation', 'setup', `≈${Math.round(S.planeDeg(Wb))}° in front of the frontal plane (across the body)`); set('Plane of elevation', 'peak', `≈${Math.round(S.planeDeg(Wt))}°`);
set('Elbow flexion', 'setup', `≈${Math.round(S.elbowAng(Wb))}°`); set('Elbow flexion', 'peak', `≈${Math.round(S.elbowAng(Wt))}°`);
set('Cable', 'setup', `Low pulley ${-ANCHOR[2]} cm to the left, ${ANCHOR[0]} cm in front, ${ANCHOR[1]} cm high; cable in front of the hips`); set('Cable', 'peak', `Cable clear of the body by at least ${rep.line.d} cm over the loop`);
set('Trunk', 'setup', 'Upright, left hand on the hip'); set('Trunk', 'peak', 'Unchanged (no lean away)');
set('Tempo', 'setup', 'Pause 0.6 s in front of the hips'); set('Tempo', 'peak', '1.8 s up, 0.4 s at the top, 2.0 s down');
console.log(`Cable Lateral Raise: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}\n  handleClear ${JSON.stringify(hc)}`);
