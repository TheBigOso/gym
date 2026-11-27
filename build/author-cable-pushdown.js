// Cable Pushdown (GymVisual, Cable Pushdown; movement reference only): standing facing a high pulley, feet about hip
// width (planted leg contacts), knees soft, a slight forward lean. A straight bar (cable attachment 'bar', two hands,
// overhand grip 36 cm between the handle points) hangs from the pulley. The upper arms stay pinned at the sides (the
// shoulder's plane and elevation are held, so the elbows do not move); the elbows straighten from 90 degrees to about
// 8 degrees and return. The grip points stay on a line across the body (constant grip width), the bar along Z with the
// palms down. Bilateral (right arm solved, left mirrored). Tempo: 1 s down, 0.4 s at the bottom, 2 s up, 0.5 s pause.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const meta = require('./meta/cable-pushdown.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const LEAN = ENV('LEAN', -3), UA_FWD = ENV('UAF', 12), GZ = 18, AXIAL = -60, TOP = 90, BOTTOM = ENV('BOT', 8);
const st = F.standing({ stance: 14, knee: 8, lean: LEAN });
const base = clone(st.pose);
base.ch.sc_r = { protract: 2, elevate: -2 }; base.ch.sc_l = clone(base.ch.sc_r);
base.ch.neck_c7 = { rot: 0, flex: 0 }; base.ch.head_c1 = { rot: 0, flex: 2 };
const W0 = L.fk(base, st.contacts), S = W0.shoulder_r.p;
// elbow at the side: upper arm UA_FWD degrees forward of vertical, in line with the shoulder
const a = UA_FWD * Math.PI / 180, E = V.add(S, V.scale([Math.sin(a), -Math.cos(a), 0], L.UA));
// palm faces down when the forearm points forward, back when it hangs: perpendicular to the forearm in the sagittal plane
const palmAt = (flex) => { const b = a + flex * Math.PI / 180; return [-Math.cos(b), -Math.sin(b), 0]; };
// upper arm from a free solve at mid range, then held for every key
const mid = C.armR(base, st.contacts, { flex: 45, elbow: E, gripZ: GZ, axis: [0, 0, 1], palm: palmAt(45), guess: { plane: 60, elev: 6, axial: AXIAL, pron: 165, flex: 45 }, axialRef: AXIAL, wAxial: 0.3, wDev: 0.03 });
const FLEX = { top: TOP, d1: 70, d2: 45, d3: 25, d4: 14, bottom: BOTTOM };
const poses = {}, err = {};
let g = C.guessOf(mid);
for (const [name, flex] of Object.entries(FLEX)) {
  const p = C.armR(base, st.contacts, { flex, lockUA: true, gripZ: GZ, axis: [0, 0, 1], palm: palmAt(flex), guess: { ...g, flex }, axialRef: AXIAL, wAxial: 0.05, wDev: 0.03 });
  err[name] = p.__err; g = C.guessOf(p); poses[name] = C.mirrorArm(p);
}
poses.bottomHold = clone(poses.bottom);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const keyframes = [{ t: 0, pose: 'top' }, { t: ph.push.start, pose: 'top' }, { t: 0.75, pose: 'd1' }, { t: 0.98, pose: 'd2' }, { t: 1.2, pose: 'd3' }, { t: 1.36, pose: 'd4' }, { t: ph.lockout.start, pose: 'bottom' },
  { t: ph.lockout.end, pose: 'bottomHold' }, { t: 2.25, pose: 'd4' }, { t: 2.6, pose: 'd3' }, { t: 3.05, pose: 'd2' }, { t: 3.5, pose: 'd1' }, { t: ph.reset.start, pose: 'top' }, { t: D, pose: 'top' }];

const ex = H.module_(meta, st.contacts, poses, keyframes);
// pulley in front of and above the bar's top position, so the cable runs in front of the face
const Wt = L.fk(poses.top, st.contacts), Wb = L.fk(poses.bottom, st.contacts), bt = EQ.barAt(Wt), bb = EQ.barAt(Wb);
const anchor = [r1(bt.c[0] + 2), 205, 0];
ex.props = [EQ.cableTower(anchor), { id: 'bar', kind: 'cable', attachment: 'bar', size: [50, 3, 3], anchor, attach: { joint: 'wrist_r', with: 'wrist_l' } }];

// loop checks: feet, floor, channel jumps, cable line clear of the head, bar clear of the thighs, grip width
let barClr = { d: 1e9 }, elbowDrift = 0;
const BAR_HALF = 25, BAR_R = 1.5;
const rep = C.scan(ex, { line: (W) => [anchor, EQ.attachPoint(W, { two: true })] });
H.loopReport(ex, { probe: (W, pz, t) => {
  const b = EQ.barAt(W), c = EQ.segmentClear(W, V.add(b.c, V.scale(b.ax, BAR_HALF)), V.sub(b.c, V.scale(b.ax, BAR_HALF)), BAR_R, { skip: /^(hand|thumb|forearm)_/ });
  if (c.d < barClr.d) barClr = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) };
  elbowDrift = Math.max(elbowDrift, V.len(V.sub(W.elbow_r.p, Wt.elbow_r.p)), V.len(V.sub(W.elbow_l.p, Wt.elbow_l.p)));
} });
C.gate('cable-pushdown', rep, { minLine: 1 });
C.limits(poses);
if (barClr.d < 0) { console.error(`FAIL cable-pushdown: bar into the body ${JSON.stringify(barClr)}`); process.exitCode = 1; }
if (elbowDrift > 0.04) { console.error(`FAIL cable-pushdown: elbows move ${elbowDrift.toFixed(3)} cm`); process.exitCode = 1; }

const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const trunk = V.angle(V.sub(Wt.neck_c7.p, Wt.pelvis.p), [0, 1, 0]), uaAng = V.angle(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p), [0, -1, 0]);
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wt))} (forearms about level)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wb))} (arms straight, not locked hard)`);
set('Upper arm', 'setup', `${d(uaAng)} forward of vertical, elbows at the sides`); set('Upper arm', 'peak', `Unchanged (elbows move ${elbowDrift.toFixed(2)} cm over the loop)`);
set('Grip', 'setup', `Overhand, ${Math.round(bt.width)} cm between the hands on a 50 cm bar`); set('Grip', 'peak', `Unchanged (${rep.gripWidth.join('-')} cm)`);
set('Trunk', 'setup', `${d(trunk)} forward lean, knees soft`); set('Trunk', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Pause 0.5 s with the elbows at 90 degrees'); set('Tempo', 'peak', '1 s down, 0.4 s at the bottom, 2 s up');
console.log(`Cable Pushdown: wrote ${L.write(ex)}\n  mid ${JSON.stringify(mid.__err)} ${JSON.stringify(mid.ch.shoulder_r)} keys ${JSON.stringify(err)}\n  bar top ${bt.c.map(r1)} bottom ${bb.c.map(r1)} anchor ${anchor}\n  ${JSON.stringify(rep)}\n  barClear ${JSON.stringify(barClr)} elbowDrift ${elbowDrift.toFixed(3)}`);
