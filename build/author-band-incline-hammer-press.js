// Band Incline Hammer Press (GymVisual, Band Incline Hammer Press; movement reference only): back pad at 30 degrees, seat
// flat, glutes in the crease, upper back and head on the pad, feet planted (leg contacts). A rack stands behind the top
// of the pad with a band looped low around each upright; a handle in each hand with a neutral grip (palms facing each
// other), elbows tucked about 30 degrees from the trunk with the forearms vertical. The hands lower beside the upper
// chest and press straight up over the shoulders; the strands run from the uprights past the outside of the elbows to the
// hands. Bilateral; the left arm mirrors the right. Press path from family b4-benchpress.js (pressModule).
const L = require('./lib');
const { r1 } = L;
const P = require('./families/b4-benchpress');
const H = require('./families/hips');
const B5 = require('./families/b5-bandpush');
const meta = require('./meta/band-incline-hammer-press.json');
let M = null;
const ex = P.pressModule(meta, { angle: 30, flare: 30, dip: 14, topTilt: [0.03, 1, 0.06], grip: 'neutral', label: 'Band Incline Hammer Press (press path)', kin: (set, m) => { M = m; } });
const { rack, anchor } = B5.rackBehindBench({ y: 40 });
B5.swapDumbbells(ex, [rack, ...B5.bandProps({ anchor, color: B5.COLOR.medium })]);
const rep = B5.scanBands(ex, { planted: ['leg_r', 'leg_l'] });
B5.gateBands('band-incline-hammer-press', rep);
const { W0, Wt, Wb, T } = M, d = B5.d0, set = H.setKin(ex);
const gripT = require('./families/equip').gripPoint(Wt, 'r').p, gripB = require('./families/equip').gripPoint(Wb, 'r').p;
set('Bench angle', 'setup', '30° back pad, flat seat'); set('Bench angle', 'peak', 'Glutes in the crease, upper back on the pad, head just off it (rig shapes)');
set('Grip', 'setup', `Neutral (palms facing each other), hands ${r1(2 * gripT[2])} cm apart at the top`); set('Grip', 'peak', `Neutral beside the chest, hands ${r1(2 * gripB[2])} cm apart`);
set('Elbow flexion', 'setup', `${d(M.elbowTop)} (arms straight, not locked)`); set('Elbow flexion', 'peak', `${d(M.elbowBot)} at the bottom`);
set('Elbow tuck', 'setup', 'Arms vertical over the shoulders'); set('Elbow tuck', 'peak', `${d(M.flare)} from the trunk at the bottom; upper arm ${d(M.dip)} below the back plane`);
set('Band', 'setup', `Looped around the rack uprights ${anchor[1]} cm up, ${-anchor[0]} cm behind the hinge, ${2 * anchor[2]} cm apart`); set('Band', 'peak', `Strands ${rep.bandLen[0]}-${rep.bandLen[1]} cm (longest at the top), at least ${r1(rep.band.d)} cm from the body`);
set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s pause, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
console.log(`Band Incline Hammer Press: wrote ${L.write(ex)}\n  band ${JSON.stringify(rep.band)} len ${rep.bandLen}`);
