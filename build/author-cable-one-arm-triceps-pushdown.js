// Cable One Arm Triceps Pushdown (GymVisual, Cable One Arm Triceps Pushdown; movement reference only, the page could not
// be read): standing facing a high pulley, feet about hip width (planted leg contacts), knees soft, a slight forward lean,
// left hand on the hip. The right hand holds a D-handle (cable attachment 'handle') with the palm down, in front of the
// right shoulder line. The right upper arm stays pinned at the side (shoulder plane and elevation held, so the elbow does
// not move); the elbow straightens from 90 degrees to about 8 degrees and returns. Authored right (the player mirrors the
// clip and the tower for the left arm). Tempo: 1 s down, 0.4 s at the bottom, 2 s up, 0.5 s pause. Built like
// author-cable-pushdown.js; family b5-cablepush.js.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const S2 = require('./families/b4-shoulders2');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const P = require('./families/b5-cablepush');
const meta = require('./meta/cable-one-arm-triceps-pushdown.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const UA_FWD = ENV('UAF', 12), AXIAL = -60, TOP = 90, BOTTOM = ENV('BOT', 8);
const st = F.standing({ stance: 14, knee: 8, lean: ENV('LEAN', 9) });
const base = S2.leftOnHip(clone(st.pose));
base.ch.sc_r = { protract: 2, elevate: -2 };
base.ch.neck_c7 = { rot: 0, flex: 0 }; base.ch.head_c1 = { rot: 0, flex: 2 };
const W0 = L.fk(base, st.contacts), S = W0.shoulder_r.p, GZ = r1(S[2] - 1);
// elbow at the side: upper arm UA_FWD degrees forward of vertical in the trunk's sagittal plane
const tr = V.norm(V.sub(W0.neck_c7.p, W0.pelvis.p)), lean = Math.atan2(tr[0], tr[1]);
const a = UA_FWD * Math.PI / 180 - lean, E = V.add(S, V.scale([Math.sin(a), -Math.cos(a), 0], L.UA));
const palmAt = (flex) => { const b = a + flex * Math.PI / 180; return [-Math.cos(b), -Math.sin(b), 0]; };
const mid = C.armR(base, st.contacts, { flex: 45, elbow: E, gripZ: GZ, axis: [0, 0, 1], palm: palmAt(45), guess: { plane: 60, elev: 6, axial: AXIAL, pron: 165, flex: 45 }, axialRef: AXIAL, wAxial: 0.3, wDev: 0.03 });
const FLEX = { top: TOP, d1: 70, d2: 45, d3: 25, d4: 14, bottom: BOTTOM };
const poses = {}, err = {};
let g = C.guessOf(mid);
for (const [name, flex] of Object.entries(FLEX)) {
  const p = C.armR(base, st.contacts, { flex, lockUA: true, gripZ: GZ, axis: [0, 0, 1], palm: palmAt(flex), guess: { ...g, flex }, axialRef: AXIAL, wAxial: 0.05, wDev: 0.03 });
  err[name] = p.__err; g = C.guessOf(p); poses[name] = P.strip(p);
}
poses.bottomHold = clone(poses.bottom);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const keyframes = [{ t: 0, pose: 'top' }, { t: ph.push.start, pose: 'top' }, { t: 0.75, pose: 'd1' }, { t: 0.98, pose: 'd2' }, { t: 1.2, pose: 'd3' }, { t: 1.36, pose: 'd4' }, { t: ph.lockout.start, pose: 'bottom' },
  { t: ph.lockout.end, pose: 'bottomHold' }, { t: 2.25, pose: 'd4' }, { t: 2.6, pose: 'd3' }, { t: 3.05, pose: 'd2' }, { t: 3.5, pose: 'd1' }, { t: ph.reset.start, pose: 'top' }, { t: D, pose: 'top' }];
const ex = H.module_(meta, st.contacts, poses, keyframes);
// pulley above and slightly in front of the handle's top position, in line with it
const Wt = L.fk(poses.top, st.contacts), Wb = L.fk(poses.bottom, st.contacts), gt = EQ.gripPoint(Wt, 'r').p, gb = EQ.gripPoint(Wb, 'r').p;
const anchor = [r1(gt[0] + 3), 205, r1(gt[2])];
ex.props = [EQ.cableTower(anchor, { offset: [22, 0] }), { id: 'handle', kind: 'cable', attachment: 'handle', anchor, attach: { joint: 'wrist_r' } }];

const rep = C.scan(ex, { line: (W) => [anchor, EQ.gripPoint(W, 'r').p], lineSkip: /^(hand|thumb|forearm)_r$/ });
let hc = { d: 1e9 }, elbowDrift = 0;
H.loopReport(ex, { probe: (W, pz, t) => {
  const c = P.pointClear(W, EQ.gripPoint(W, 'r').p, /^(hand|thumb|forearm)_r$/); if (c.d - 3 < hc.d) hc = { d: +(c.d - 3).toFixed(2), id: c.id, t: +t.toFixed(2) };
  elbowDrift = Math.max(elbowDrift, V.len(V.sub(W.elbow_r.p, Wt.elbow_r.p)));
} });
C.gate('cable-one-arm-triceps-pushdown', rep, { minLine: 1, checkWidth: false });
C.limits(poses);
if (hc.d < 0) { console.error(`FAIL cable-one-arm-triceps-pushdown: handle into the body ${JSON.stringify(hc)}`); process.exitCode = 1; }
if (elbowDrift > 0.04) { console.error(`FAIL cable-one-arm-triceps-pushdown: elbow moves ${elbowDrift.toFixed(3)} cm`); process.exitCode = 1; }

const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const uaAng = V.angle(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p), [0, -1, 0]);
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wt))} (forearm about level)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wb))} (arm straight, not locked hard)`);
set('Upper arm', 'setup', `${d(uaAng)} forward of vertical, elbow at the side`); set('Upper arm', 'peak', `Unchanged (elbow moves ${elbowDrift.toFixed(2)} cm over the loop)`);
set('Grip', 'setup', `Palm down, handle ${r1(gt[2])} cm from the midline (in line with the shoulder)`); set('Grip', 'peak', 'Palm back beside the thigh');
set('Trunk', 'setup', `${P.leanText(Wt)}, left hand on the hip`); set('Trunk', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Pause 0.5 s with the elbow at 90 degrees'); set('Tempo', 'peak', '1 s down, 0.4 s at the bottom, 2 s up');
console.log(`Cable One Arm Triceps Pushdown: wrote ${L.write(ex)}\n  mid ${JSON.stringify(mid.__err)} keys ${JSON.stringify(err)}\n  grip top ${gt.map(r1)} bottom ${gb.map(r1)} anchor ${anchor}\n  ${JSON.stringify(rep)}\n  handle ${JSON.stringify(hc)} elbowDrift ${elbowDrift.toFixed(3)}`);
