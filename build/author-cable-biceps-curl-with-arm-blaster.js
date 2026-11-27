// Cable Biceps Curl (with arm blaster) (GymVisual, Cable Biceps Curl with arm blaster; movement reference only): standing
// tall facing a low pulley, feet about hip width (planted leg contacts), knees soft. A straight bar (cable attachment
// 'bar', two hands, underhand grip about shoulder width) hangs from the pulley. An arm blaster is a rigid strap-on plate
// across the front of the trunk that locks the elbows at the sides; the library has no arm-blaster prop, so it is not
// drawn: the curl is a normal standing bar curl with the upper arms pinned exactly vertical (the shoulder's plane and
// elevation are held, so the elbows do not move at all). The elbows bend from the lowest angle at which the bar still
// clears the thighs to about 135 degrees and return. Bilateral (right arm solved, left mirrored). 1.2 s up, 0.3 s
// squeeze, 2.4 s down, 0.5 s at the bottom.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const B = require('./families/b5-cablearms');
const meta = require('./meta/cable-biceps-curl-with-arm-blaster.json');

const UA_FWD = 0, GZ = 19, BAR_HALF = 25, MARGIN = 1.0;
const st = F.standing({ stance: 12, knee: 5 });
const base = clone(st.pose);
base.ch.sc_r = { protract: 0, elevate: -2 }; base.ch.sc_l = clone(base.ch.sc_r);
base.ch.neck_c7 = { rot: 0, flex: 0 }; base.ch.head_c1 = { rot: 0, flex: 4 };
// bottom: the lowest elbow angle at which the bar (mirrored arms) still clears the body by MARGIN
const solve = (flexes) => { const r = B.curlKeys(base, st.contacts, { uaFwd: UA_FWD, gz: GZ, flexes }); for (const k in r.poses) C.mirrorArm(r.poses[k]); return r; };
let lo = 0, hi = 50;
for (let i = 0; i < 9; i++) { const m = (lo + hi) / 2, r = solve({ b: m }); if (B.barClear(L.fk(r.poses.b, st.contacts), { half: BAR_HALF }).d > MARGIN) hi = m; else lo = m; }
const BOTTOM = Math.ceil(hi);
const FLEX = { bottom: BOTTOM, c1: BOTTOM + (134 - BOTTOM) * 0.12, c2: BOTTOM + (134 - BOTTOM) * 0.3, c3: BOTTOM + (134 - BOTTOM) * 0.5, c4: BOTTOM + (134 - BOTTOM) * 0.7, c5: BOTTOM + (134 - BOTTOM) * 0.87, top: 134 };
const { poses, err, elbow } = solve(FLEX);
for (const k in poses) delete poses[k].__err;
poses.squeeze = clone(poses.top); for (const s of ['r', 'l']) poses.squeeze.ch[`wrist_${s}`].flex = r1(poses.squeeze.ch[`wrist_${s}`].flex + 4);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const up = ['c1', 'c2', 'c3', 'c4', 'c5'], ft = [0.12, 0.3, 0.5, 0.7, 0.87];
const tu = (f) => r1(100 * (ph.curl.start + (ph.curl.end - ph.curl.start) * f)) / 100, td = (f) => r1(100 * (ph.lower.start + (ph.lower.end - ph.lower.start) * f)) / 100;
const keyframes = [{ t: 0, pose: 'bottom' }, { t: ph.curl.start, pose: 'bottom' }, ...up.map((n, i) => ({ t: tu(ft[i]), pose: n })), { t: ph.top.start, pose: 'top' }, { t: ph.top.end, pose: 'squeeze' },
  ...up.slice().reverse().map((n, i) => ({ t: td(ft[i]), pose: n })), { t: ph.reset.start, pose: 'bottom' }, { t: D, pose: 'bottom' }];

const ex = H.module_(meta, st.contacts, poses, keyframes);
const Wb = L.fk(poses.bottom, st.contacts), Wt = L.fk(poses.top, st.contacts), bb = EQ.barAt(Wb), bt = EQ.barAt(Wt);
const ANCHOR = [r1(bb.c[0] + 55), 14, 0];
ex.props = [EQ.cableTower(ANCHOR), { id: 'bar', kind: 'cable', attachment: 'bar', size: [2 * BAR_HALF, 3, 3], anchor: ANCHOR, attach: { joint: 'wrist_r', with: 'wrist_l' } }];

// loop checks: feet, floor, channel jumps, cable line clear of the body, bar clear of the body, grip width, elbows still
const rep = C.scan(ex, { line: (W) => [ANCHOR, EQ.attachPoint(W, { two: true })] });
let barClr = { d: 1e9 }, drift = 0;
H.loopReport(ex, { probe: (W, pz, t) => {
  const c = B.barClear(W, { half: BAR_HALF }); if (c.d < barClr.d) barClr = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) };
  drift = Math.max(drift, V.len(V.sub(W.elbow_r.p, Wb.elbow_r.p)), V.len(V.sub(W.elbow_l.p, Wb.elbow_l.p)));
} });
C.gate('cable-biceps-curl-with-arm-blaster', rep, { minLine: 1 });
C.limits(poses);
if (barClr.d < 0) { console.error(`FAIL arm-blaster curl: bar into the body ${JSON.stringify(barClr)}`); process.exitCode = 1; }
if (drift > 0.04) { console.error(`FAIL arm-blaster curl: elbows move ${drift.toFixed(3)} cm`); process.exitCode = 1; }

const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const uaAng = V.angle(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p), [0, -1, 0]);
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wb))} (bar resting just in front of the thighs)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wt))} at the top (range ${d(C.elbowAng(Wt) - C.elbowAng(Wb))})`);
set('Upper arm', 'setup', `${d(uaAng)} from vertical, elbows locked at the sides (arm blaster, not drawn)`); set('Upper arm', 'peak', `Unchanged (elbows move ${drift.toFixed(2)} cm over the loop)`);
set('Grip', 'setup', `Underhand, ${Math.round(bb.width)} cm between the hands on a ${2 * BAR_HALF} cm bar`); set('Grip', 'peak', `Unchanged (${rep.gripWidth.join('-')} cm)`);
set('Cable', 'setup', `Low pulley ${Math.round(ANCHOR[0] - bb.c[0])} cm in front of the bar, ${ANCHOR[1]} cm high`); set('Cable', 'peak', `Clear of the body by at least ${rep.line.d} cm; bar clear by ${barClr.d} cm`);
set('Tempo', 'setup', 'Arms down 0.5 s'); set('Tempo', 'peak', '1.2 s up, 0.3 s squeeze, 2.4 s down');
console.log(`Cable arm-blaster curl: wrote ${L.write(ex)}\n  bottom flex ${BOTTOM} keys ${JSON.stringify(err)}\n  elbow ${elbow.map(r1)} shoulder ${JSON.stringify(poses.top.ch.shoulder_r)}\n  bar bottom ${bb.c.map(r1)} top ${bt.c.map(r1)} anchor ${ANCHOR}\n  ${JSON.stringify(rep)}\n  barClear ${JSON.stringify(barClr)} drift ${drift.toFixed(3)}`);
