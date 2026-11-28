// Band High Pulley Overhead Triceps Extension (GymVisual, Band High Pulley Overhead Triceps Extension; movement reference
// only, page not readable): standing in a staggered stance facing away from a rack (right foot forward, knees soft, planted
// leg contacts), leaning forward about 15 degrees. The band is looped round the rack upright behind the lifter, above head
// height (the band's "high pulley"), and both hands hold it behind the head (two strands from the anchor), palms facing.
// The upper arms point forward and up beside the head (about 35 degrees forward of vertical, sagittal, so the hands stay
// one width apart) and stay still while the elbows straighten, pushing the hands forward and up, then bend again under
// control. Upper-arm and wrist solve as cable-kneeling-triceps-extension (b3-triceps upperArm / wristTo). Bilateral.
const L = require('./lib');
const { R, V, r1, clone } = L;
const H = require('./families/hips');
const T = require('./families/b3-triceps');
const F = require('./families/b3-shoulders');
const B5 = require('./families/b5-bandpush');
const BP = require('./families/b5-bandpull');
const G = require('./families/b6-10');
const meta = require('./meta/band-high-pulley-overhead-triceps-extension.json');
const ENV = (k, d) => +(process.env[k] ?? d);
const LEAN = ENV('LEAN', 15), UA = ENV('UA', 35) * R.DEG, TOP_FLEX = 10, BOT_FLEX = ENV('BOT', 115);

const st = B5.staggered({ front: 26, back: 24, stance: 13, knee: 12 }), contacts = st.contacts;
let p = clone(st.pose);
p.root.rot = { pitch: -LEAN };
p = F.plantLegs(p, contacts);
p.ch.neck_c7 = { rot: 0, flex: -4 }; p.ch.head_c1 = { rot: 0, flex: -4 };
p.ch.sc_r = { protract: 4, elevate: 10 }; p.ch.sc_l = clone(p.ch.sc_r);
const uaDir = [Math.sin(UA), Math.cos(UA), 0], faDir = [-Math.cos(UA), Math.sin(UA), 0];
const ua = T.upperArm(p, 'r', uaDir, faDir, [[90, 150, 0], [90, 150, 90], [90, 150, -90], [60, 160, 0]]);
p.ch.shoulder_r = ua.ch; p.ch.elbow_r = { flex: TOP_FLEX };
{ const W = L.fk(p, contacts), fa = V.norm(V.sub(W.wrist_r.p, W.elbow_r.p)); const w = T.wristTo(p, 'r', fa, [0, 0, -1]); p.ch.wrist_r = { pron: w.pron, flex: 0, dev: 0 }; }
const armAt = (flex) => { const q = clone(p); q.ch.elbow_r = { flex: r1(flex) }; return T.mirrorArm(q); };
const FS = [0, 0.25, 0.5, 0.75, 1];
const keys = FS.map((f) => armAt(BOT_FLEX + (TOP_FLEX - BOT_FLEX) * f)); // k0 = hands behind the head (start), k4 = arms straight
const { poses, keyframes } = G.repKeys(meta, keys, FS);
const ex = H.module_(meta, contacts, poses, keyframes);
const Wt = L.fk(poses.k4, contacts), Wb = L.fk(poses.k0, contacts);
const RK = BP.rackAnchor({ x: r1(Wt.pelvis.p[0] - ENV('BEHIND', 60)), y: ENV('AY', 205), behind: true });
ex.props = [RK.rack, RK.band];
const HEAD = /^(head|hair|ear_[rl]|jaw|nose|neck|brow_[rl]|eye_[rl])$/;
let headClear = 1e9;
const EQ = require('./families/equip');
const rep = G.bandCheck('band-high-pulley-overhead-triceps-extension', ex, { minLine: 1, probe: (W) => { for (const s of ['r', 'l']) { const c = EQ.segmentClear(W, EQ.gripPoint(W, s).p, EQ.gripPoint(W, s).p, 4, { skip: /^(?!head|neck|hair|jaw|nose|ear|brow|eye)/ }); headClear = Math.min(headClear, c.d); } } });
if (headClear < 0) { console.error(`FAIL: hands into the head ${headClear}`); process.exitCode = 1; }
const set = H.setKin(ex), d = G.d0;
set('Elbow flexion', 'setup', `${d(T.elbowOf(Wb, 'r'))} with the hands behind the head`); set('Elbow flexion', 'peak', `${d(T.elbowOf(Wt, 'r'))} (arms long, not locked)`);
set('Upper arm', 'setup', `${d(V.angle(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p), [0, 1, 0]))} forward of vertical, ${d(G.humElev(Wt))} from the trunk line; elbows ${r1(2 * Wt.elbow_r.p[2])} cm apart`); set('Upper arm', 'peak', 'Unchanged (only the elbows move)');
set('Band', 'setup', `Looped round the rack upright behind, ${RK.anchor[1]} cm up, ${r1(Wt.pelvis.p[0] - RK.anchor[0])} cm behind the hips; strands ${rep.strand[0]} cm`); set('Band', 'peak', `Strands ${rep.strand[1]} cm with the arms straight; at least ${r1(rep.line.d)} cm from the body and head`);
set('Trunk', 'setup', `Staggered stance, right foot forward, trunk ${d(G.trunkFromVertical(Wt))} forward of vertical`); set('Trunk', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Pause 0.6 s in the stretch'); set('Tempo', 'peak', '1.1 s out, 0.4 s squeeze, 1.8 s back, 0.4 s pause');
console.log(`Band High Pulley Overhead Triceps Extension: wrote ${L.write(ex)}\n  shoulder ${JSON.stringify(ua.ch)} anchor ${RK.anchor} headClear ${r1(headClear)}\n  ${JSON.stringify(rep)}`);
