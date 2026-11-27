// Resistance Band Triceps Pushdown (GymVisual, Resistance Band Triceps Pushdown; movement reference only): standing
// facing a pull-up bar, feet about hip width (planted leg contacts), knees soft, a slight forward lean. A band is looped
// over the bar and held in both hands (two-hand band with one anchor: a strand to each hand), overhand grip about 36 cm
// between the hands. The upper arms stay pinned at the sides (the
// shoulder's plane and elevation are held, so the elbows do not move); the elbows straighten from 90 degrees to about
// 8 degrees and return. The grip points stay on a line across the body (constant grip width), the bar along Z with the
// palms down; the strands run from the bar in front of the face to the hands. Same arm keys as the cable pushdown.
// Bilateral (right arm solved, left mirrored). Tempo: 1 s down, 0.4 s at the bottom, 2 s up, 0.5 s pause.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const meta = require('./meta/resistance-band-triceps-pushdown.json');

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
// band looped over a pull-up bar in front of and above the hands' top position, so the strands run in front of the face
const B5 = require('./families/b5-bandpush');
const Wt = L.fk(poses.top, st.contacts), Wb = L.fk(poses.bottom, st.contacts), bt = EQ.barAt(Wt), bb = EQ.barAt(Wb);
const BAR_X = r1(bt.c[0] + 4), BAR_H = 215, pb = EQ.pullupBar({ x: BAR_X, height: BAR_H });
const anchor = [BAR_X, BAR_H - 1.6, 0]; // under the bar, where the loop hangs
ex.props = [pb.prop, B5.bandTwoHand({ anchor, color: B5.COLOR.medium })];

// loop checks: feet, floor, channel jumps, both band strands clear of the face and body
let elbowDrift = 0;
const rep = C.scan(ex, {}); // feet, floor, channel jumps, hand distance
const brep = B5.scanBands(ex, { planted: ['leg_r', 'leg_l'], probe: (W) => {
  elbowDrift = Math.max(elbowDrift, V.len(V.sub(W.elbow_r.p, Wt.elbow_r.p)), V.len(V.sub(W.elbow_l.p, Wt.elbow_l.p)));
} });
rep.line = { d: 1e9 }; C.gate('resistance-band-triceps-pushdown', rep, { checkWidth: false });
B5.gateBands('resistance-band-triceps-pushdown', brep, { minClear: 1 });
C.limits(poses);
if (elbowDrift > 0.04) { console.error(`FAIL resistance-band-triceps-pushdown: elbows move ${elbowDrift.toFixed(3)} cm`); process.exitCode = 1; }

const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const trunk = V.angle(V.sub(Wt.neck_c7.p, Wt.pelvis.p), [0, 1, 0]), uaAng = V.angle(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p), [0, -1, 0]);
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wt))} (forearms about level)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wb))} (arms straight, not locked hard)`);
set('Upper arm', 'setup', `${d(uaAng)} forward of vertical, elbows at the sides`); set('Upper arm', 'peak', `Unchanged (elbows move ${elbowDrift.toFixed(2)} cm over the loop)`);
set('Grip', 'setup', `Overhand on the band, ${Math.round(bt.width)} cm between the hands`); set('Grip', 'peak', `About the same (${rep.gripWidth.join('-')} cm)`);
set('Band', 'setup', `Looped over a pull-up bar ${BAR_H} cm high, ${r1(BAR_X - Wt.pelvis.p[0])} cm in front of the pelvis; strands ${brep.bandLen[0]} cm`); set('Band', 'peak', `Strands ${brep.bandLen[1]} cm with the arms straight; at least ${r1(brep.band.d)} cm from the face and body`);
set('Trunk', 'setup', `${d(trunk)} forward lean, knees soft`); set('Trunk', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Pause 0.5 s with the elbows at 90 degrees'); set('Tempo', 'peak', '1 s down, 0.4 s at the bottom, 2 s up');
console.log(`Resistance Band Triceps Pushdown: wrote ${L.write(ex)}\n  mid ${JSON.stringify(mid.__err)} ${JSON.stringify(mid.ch.shoulder_r)} keys ${JSON.stringify(err)}\n  hands top ${bt.c.map(r1)} bottom ${bb.c.map(r1)} anchor ${anchor}\n  ${JSON.stringify(rep)}\n  band ${JSON.stringify(brep.band)} len ${brep.bandLen} elbowDrift ${elbowDrift.toFixed(3)}`);
