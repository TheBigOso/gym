// Cable Seated Curl (GymVisual, Cable Seated Curl; movement reference only): sitting tall on the end of a flat bench
// facing a low pulley, feet flat a little wider than the hips (planted leg contacts), thighs on the seat. A straight bar
// (cable attachment 'bar', two hands, underhand grip about shoulder width) runs from the pulley in front of the feet.
// The upper arms are held still a little forward of the trunk (the shoulder's plane and elevation are held, so the
// elbows do not move) and the elbows bend from the lowest angle at which the bar clears the thighs (bar just over the
// knees) to about 135 degrees, then lower under control. Bilateral (right arm solved, left mirrored). 1.2 s up, 0.3 s
// squeeze, 2.4 s down, 0.5 s at the bottom.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const S3 = require('./families/b4-shoulders3');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const B = require('./families/b5-cablearms');
const meta = require('./meta/cable-seated-curl.json');

const UA_FWD = 20, GZ = 19, BAR_HALF = 25, MARGIN = 1.5, TOP = 134;
const s = S3.seatedFlat({ seatH: 45, stance: 16 });
const base = clone(s.pose), contacts = s.contacts;
base.ch.sc_r = { protract: 2, elevate: -2 }; base.ch.sc_l = clone(base.ch.sc_r);
base.ch.neck_c7 = { rot: 0, flex: 2 }; base.ch.head_c1 = { rot: 0, flex: 6 };
const solve = (flexes) => { const r = B.curlKeys(base, contacts, { uaFwd: UA_FWD, gz: GZ, flexes, mid: 80 }); for (const k in r.poses) C.mirrorArm(r.poses[k]); return r; };
let lo = 20, hi = 70;
for (let i = 0; i < 9; i++) { const m = (lo + hi) / 2, r = solve({ b: m }); if (B.barClear(L.fk(r.poses.b, contacts), { half: BAR_HALF }).d > MARGIN) hi = m; else lo = m; }
const BOTTOM = Math.ceil(hi), at = (f) => r1(BOTTOM + (TOP - BOTTOM) * f);
const FLEX = { bottom: BOTTOM, c1: at(0.12), c2: at(0.3), c3: at(0.5), c4: at(0.7), c5: at(0.87), top: TOP };
const { poses, err, elbow } = solve(FLEX);
for (const k in poses) delete poses[k].__err;
poses.squeeze = clone(poses.top); for (const sd of ['r', 'l']) poses.squeeze.ch[`wrist_${sd}`].flex = r1(poses.squeeze.ch[`wrist_${sd}`].flex + 4);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const up = ['c1', 'c2', 'c3', 'c4', 'c5'], ft = [0.12, 0.3, 0.5, 0.7, 0.87];
const tu = (f) => r1(100 * (ph.curl.start + (ph.curl.end - ph.curl.start) * f)) / 100, td = (f) => r1(100 * (ph.lower.start + (ph.lower.end - ph.lower.start) * f)) / 100;
const keyframes = [{ t: 0, pose: 'bottom' }, { t: ph.curl.start, pose: 'bottom' }, ...up.map((n, i) => ({ t: tu(ft[i]), pose: n })), { t: ph.top.start, pose: 'top' }, { t: ph.top.end, pose: 'squeeze' },
  ...up.slice().reverse().map((n, i) => ({ t: td(ft[i]), pose: n })), { t: ph.reset.start, pose: 'bottom' }, { t: D, pose: 'bottom' }];

const ex = H.module_(meta, contacts, poses, keyframes);
const Wb = L.fk(poses.bottom, contacts), Wt = L.fk(poses.top, contacts), bb = EQ.barAt(Wb), bt = EQ.barAt(Wt);
const footX = base.ik.leg_r.target[0], ANCHOR = [r1(footX + 45), 14, 0];
ex.props = [s.bench.prop, EQ.cableTower(ANCHOR), { id: 'bar', kind: 'cable', attachment: 'bar', size: [2 * BAR_HALF, 3, 3], anchor: ANCHOR, attach: { joint: 'wrist_r', with: 'wrist_l' } }];

// loop checks: feet, floor, channel jumps, cable line clear of the body, bar clear of the body, grip width, elbows still,
// buttocks on the seat
const rep = C.scan(ex, { line: (W) => [ANCHOR, EQ.attachPoint(W, { two: true })] });
let barClr = { d: 1e9 }, drift = 0;
H.loopReport(ex, { probe: (W, pz, t) => {
  const c = B.barClear(W, { half: BAR_HALF }); if (c.d < barClr.d) barClr = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) };
  drift = Math.max(drift, V.len(V.sub(W.elbow_r.p, Wb.elbow_r.p)), V.len(V.sub(W.elbow_l.p, Wb.elbow_l.p)));
} });
const seat = r1(Math.min(H.bottomOf(Wb, 'buttock_r'), H.bottomOf(Wb, 'thigh_r')) - s.bench.top);
C.gate('cable-seated-curl', rep, { minLine: 1 });
C.limits(poses);
if (barClr.d < 0) { console.error(`FAIL cable-seated-curl: bar into the body ${JSON.stringify(barClr)}`); process.exitCode = 1; }
if (drift > 0.04) { console.error(`FAIL cable-seated-curl: elbows move ${drift.toFixed(3)} cm`); process.exitCode = 1; }
if (Math.abs(seat) > 1.2) { console.error(`FAIL cable-seated-curl: seat gap ${seat} cm`); process.exitCode = 1; }

const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const uaAng = V.angle(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p), [0, -1, 0]);
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wb))} (bar just over the knees, clear of the thighs)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wt))} at the top (range ${d(C.elbowAng(Wt) - C.elbowAng(Wb))})`);
set('Upper arm', 'setup', `${d(uaAng)} forward of vertical, elbows near the sides`); set('Upper arm', 'peak', `Unchanged (elbows move ${drift.toFixed(2)} cm over the loop)`);
set('Grip', 'setup', `Underhand, ${Math.round(bb.width)} cm between the hands on a ${2 * BAR_HALF} cm bar`); set('Grip', 'peak', `Unchanged (${rep.gripWidth.join('-')} cm)`);
set('Seat', 'setup', `Sitting tall on a ${s.bench.top} cm flat bench, feet flat, knees about 90 degrees`); set('Seat', 'peak', 'Unchanged (trunk still)');
set('Tempo', 'setup', 'Bar over the knees 0.5 s'); set('Tempo', 'peak', '1.2 s up, 0.3 s squeeze, 2.4 s down');
console.log(`Cable Seated Curl: wrote ${L.write(ex)}\n  bottom flex ${BOTTOM} keys ${JSON.stringify(err)}\n  elbow ${elbow.map(r1)} shoulder ${JSON.stringify(poses.top.ch.shoulder_r)} seat ${seat}\n  bar bottom ${bb.c.map(r1)} top ${bt.c.map(r1)} anchor ${ANCHOR}\n  ${JSON.stringify(rep)}\n  barClear ${JSON.stringify(barClr)} drift ${drift.toFixed(3)}`);
