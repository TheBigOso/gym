// Cable One Arm Biceps Curl (GymVisual, Cable One Arm Biceps Curl version 2; movement reference only): standing tall
// facing a low pulley, feet about hip width (planted leg contacts), knees soft, left hand on the hip. The right hand
// holds a D-handle (cable attachment 'handle') with the palm forward; the cable runs forward and down to the pulley at
// the hand's line. The upper arm stays pinned at the side (the shoulder's plane and elevation are held, so the elbow
// does not move) while the elbow bends from nearly straight to about 135 degrees, palm turning up, then lowers under
// control. Authored right (the player mirrors the tower for the left clip). 1.2 s up, 0.3 s squeeze, 2.4 s down, 0.5 s.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const S = require('./families/b4-shoulders2');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const B = require('./families/b5-cablearms');
const meta = require('./meta/cable-one-arm-biceps-curl.json');

const UA_FWD = 4, GZ = 22;
const st = F.standing({ stance: 12, knee: 6 });
const base = S.leftOnHip(st.pose);
base.ch.neck_c7 = { rot: 0, flex: 0 }; base.ch.head_c1 = { rot: 0, flex: 4 };
const FLEX = { bottom: 6, c1: 22, c2: 45, c3: 70, c4: 95, c5: 118, top: 134 };
const { poses: raw, err, elbow } = B.curlKeys(base, st.contacts, { uaFwd: UA_FWD, gz: GZ, flexes: FLEX });
const keepLeft = (p) => { const q = clone(p); for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) q.ch[`${j}_l`] = clone(base.ch[`${j}_l`]); delete q.__err; return q; };
const poses = Object.fromEntries(Object.entries(raw).map(([k, p]) => [k, keepLeft(p)]));
poses.squeeze = clone(poses.top); poses.squeeze.ch.wrist_r.flex = r1(poses.squeeze.ch.wrist_r.flex + 4);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const up = ['c1', 'c2', 'c3', 'c4', 'c5'], ft = [0.12, 0.3, 0.5, 0.7, 0.87];
const tu = (f) => r1(100 * (ph.curl.start + (ph.curl.end - ph.curl.start) * f)) / 100, td = (f) => r1(100 * (ph.lower.start + (ph.lower.end - ph.lower.start) * f)) / 100;
const keyframes = [{ t: 0, pose: 'bottom' }, { t: ph.curl.start, pose: 'bottom' }, ...up.map((n, i) => ({ t: tu(ft[i]), pose: n })), { t: ph.top.start, pose: 'top' }, { t: ph.top.end, pose: 'squeeze' },
  ...up.slice().reverse().map((n, i) => ({ t: td(ft[i]), pose: n })), { t: ph.reset.start, pose: 'bottom' }, { t: D, pose: 'bottom' }];

const ex = H.module_(meta, st.contacts, poses, keyframes);
const Wb = L.fk(poses.bottom, st.contacts), Wt = L.fk(poses.top, st.contacts), gb = EQ.gripPoint(Wb, 'r').p;
const ANCHOR = [r1(gb[0] + 52), 14, GZ];
ex.props = [EQ.cableTower(ANCHOR), { id: 'handle', kind: 'cable', attachment: 'handle', anchor: ANCHOR, attach: { joint: 'wrist_r' } }];

// loop checks: feet, floor, channel jumps, cable line clear of the body, handle clear of the body, elbow still
const rep = C.scan(ex, { line: (W) => [ANCHOR, EQ.attachPoint(W, { side: 'r' })], lineSkip: /^(hand|thumb|forearm)_r$/ });
let hc = { d: 1e9 }, drift = 0;
H.loopReport(ex, { probe: (W, pz, t) => { const c = B.handleClear(W); if (c.d < hc.d) hc = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) }; drift = Math.max(drift, V.len(V.sub(W.elbow_r.p, Wb.elbow_r.p))); } });
C.gate('cable-one-arm-biceps-curl', rep, { minLine: 1, checkWidth: false });
C.limits(poses);
if (hc.d < 0) { console.error(`FAIL cable-one-arm-biceps-curl: handle into the body ${JSON.stringify(hc)}`); process.exitCode = 1; }
if (drift > 0.04) { console.error(`FAIL cable-one-arm-biceps-curl: elbow moves ${drift.toFixed(3)} cm`); process.exitCode = 1; }

const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const uaAng = V.angle(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p), [0, -1, 0]);
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wb))} (arm nearly straight)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wt))} at the top (range ${d(C.elbowAng(Wt) - C.elbowAng(Wb))})`);
set('Upper arm', 'setup', `${d(uaAng)} forward of vertical, elbow at the side`); set('Upper arm', 'peak', `Unchanged (elbow moves ${drift.toFixed(2)} cm over the loop)`);
set('Forearm rotation', 'setup', `Palm forward (wrist pron ${poses.bottom.ch.wrist_r.pron}°)`); set('Forearm rotation', 'peak', `Palm up / toward the shoulder (pron ${poses.top.ch.wrist_r.pron}°)`);
set('Cable', 'setup', `Low pulley ${Math.round(ANCHOR[0] - gb[0])} cm in front of the hand, ${ANCHOR[1]} cm high, in line with the hand`); set('Cable', 'peak', `Clear of the body by at least ${rep.line.d} cm over the loop`);
set('Tempo', 'setup', 'Arm straight 0.5 s'); set('Tempo', 'peak', '1.2 s up, 0.3 s squeeze, 2.4 s down');
console.log(`Cable One Arm Biceps Curl: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  elbow ${elbow.map(r1)} shoulder ${JSON.stringify(poses.top.ch.shoulder_r)}\n  ${JSON.stringify(rep)}\n  handleClear ${JSON.stringify(hc)} drift ${drift.toFixed(3)} anchor ${ANCHOR}`);
