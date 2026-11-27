// Band Incline Triceps Extension (GymVisual, Band Incline Triceps Extension; movement reference only): back pad at 30
// degrees, seat flat, glutes in the crease, upper back and head on the pad, feet planted (leg contacts). A rack stands
// behind the top of the pad with a band looped around each upright at about head height; a handle in each hand, palms
// facing each other. The upper arms stay still, pointing up a little forward of vertical, while only the elbows bend,
// letting the band draw the hands back beside the head, then straighten against it. Bilateral. Same arm keys as the
// incline dumbbell triceps extension (b3-chest lying base, b4-benchpress extArm); band props from b5-bandpush.js.
const L = require('./lib');
const { V, R, r1 } = L;
const C = require('./families/b3-chest');
const H = require('./families/hips');
const P = require('./families/b4-benchpress');
const B5 = require('./families/b5-bandpush');
const meta = require('./meta/band-incline-triceps-extension.json');

const ANGLE = 30, BACK = +(process.env.BACK ?? -15), FLEX_TOP = 6, FLEX_BOT = +(process.env.FLEXB ?? 98), N = 4;
const T = C.phaseT(meta), { B, base, contacts, foot } = C.benchBase(ANGLE);
const W0 = L.fk(base, contacts), F = C.trunkFrame(W0);
// upper arm: vertical, tilted BACK degrees toward the head; forearm folds toward the head in the sagittal plane
const b = BACK * R.DEG, ua = [-Math.sin(b), Math.cos(b), 0], fa = [-Math.cos(b), -Math.sin(b), 0];
const keyAt = (f) => C.mirrorArm(P.extArm(base, ua, fa, FLEX_TOP + (FLEX_BOT - FLEX_TOP) * f, [0, 0, -1]));
const path = []; for (let i = 0; i <= N; i++) { const q = keyAt(i / N); path.push({ f: 1 - i / N, pose: C.strip(q), cost: q.__cost }); }
path.reverse();
const settle = C.strip(keyAt(0.985));
const { poses, keyframes } = C.repKeys(path, T, settle);
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props.find((p) => p.id === 'bench').center = B.prop.center;
const { rack, anchor } = B5.rackBehindBench({ y: 100, width: 80, hookY: 150 });
B5.swapDumbbells(ex, [rack, ...B5.bandProps({ anchor, color: B5.COLOR.light })]);
const rep = B5.scanBands(ex, { planted: ['leg_r', 'leg_l'] });
B5.gateBands('band-incline-triceps-extension', rep);
let uaDev = 0;
const sw = C.sweep(ex, B, { grips: [{ side: 'r', grip: 'handle' }, { side: 'l', grip: 'handle' }], probe: (W) => { uaDev = Math.max(uaDev, V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), ua)); } });
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), set = H.setKin(ex), d = P.d0;
const shFlex = V.angle(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p), V.scale(C.trunkFrame(Wt).u, -1));
set('Bench angle', 'setup', `${ANGLE}° back pad, flat seat`); set('Bench angle', 'peak', 'Glutes in the crease and upper back on the pad (rig shapes), back of the head just off it with a neutral neck');
set('Elbow flexion', 'setup', `${d(C.elbowFlexOf(Wt))} (straight, not locked)`); set('Elbow flexion', 'peak', `${d(C.elbowFlexOf(Wb))} at the bottom`);
set('Upper arm angle', 'setup', `${BACK ? `${Math.abs(BACK)}° ${BACK < 0 ? 'forward of' : 'behind'} vertical (hands clear the pad)` : 'Vertical'}: ${d(shFlex)} of shoulder flexion relative to the trunk`); set('Upper arm angle', 'peak', `Unchanged: shoulder channels constant (max ${uaDev.toFixed(1)}° drift)`);
set('Band', 'setup', `Looped around the rack uprights ${anchor[1]} cm up, ${-anchor[0]} cm behind the hinge, ${2 * anchor[2]} cm apart`); set('Band', 'peak', `Strands ${rep.bandLen[0]}-${rep.bandLen[1]} cm (longest with the arms straight), at least ${r1(rep.band.d)} cm from the body; hands at least ${r1(-sw.dbBody)} cm from the head`);
set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s pause, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
P.finish(ex, 'Band Incline Triceps Extension', { W0, sw, fit: C.benchFit(B, W0) }, `shFlex ${r1(shFlex)} elbow ${r1(C.elbowFlexOf(Wt))}/${r1(C.elbowFlexOf(Wb))} costs ${path.map((k) => k.cost.toFixed(4)).join(',')} band ${JSON.stringify(rep.band)} len ${rep.bandLen}`);
