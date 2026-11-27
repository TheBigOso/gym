// Band Incline Bench Press (GymVisual, Band Incline Bench Press; movement reference only): back pad at 30 degrees, seat
// flat, glutes in the crease, upper back and head on the pad, feet planted (leg contacts). A rack stands behind the top of
// the pad; a band is looped low around each upright and its handle held in each hand (one strand per hand, palms toward
// the feet). The same press path as the incline dumbbell press (b3-chest pressPath: elbows about 55 degrees from the
// trunk with the forearms vertical at the bottom, arms straight over the shoulders at the top); the strands run from
// the uprights past the outside of the elbows to the hands and stretch as the hands press up. Bilateral.
const L = require('./lib');
const { r1 } = L;
const B5 = require('./families/b5-bandpush');
const press = require('./author-dumbbell-bench-press');
const meta = require('./meta/band-incline-bench-press.json');

const ex = press(meta, { angle: 30, dip: 12, label: 'Band Incline Bench Press (press path)' });
const { rack, anchor } = B5.rackBehindBench({ y: 40 });
B5.swapDumbbells(ex, [rack, ...B5.bandProps({ anchor, color: B5.COLOR.medium })]);
const rep = B5.scanBands(ex, { planted: ['leg_r', 'leg_l'] });
B5.gateBands('band-incline-bench-press', rep);
const set = require('./families/hips').setKin(ex);
ex.exercise.kinematics.find((k) => k.measure === 'Dumbbell path').measure = 'Band path'; // the shared press builder fills the dumbbell row
set('Band path', 'setup', `Band looped around the rack uprights ${anchor[1]} cm up, ${-anchor[0]} cm behind the hinge, ${2 * anchor[2]} cm apart`);
set('Band path', 'peak', `Strands ${rep.bandLen[0]}-${rep.bandLen[1]} cm (stretched most at the top), at least ${r1(rep.band.d)} cm from the body`);
{ const EQ = require('./families/equip'), C3 = require('./families/b3-chest'), tl = ex.poses, Wb = L.fk(tl.bottom, ex.contacts), Wt = L.fk(tl.top, ex.contacts), gb = EQ.gripPoint(Wb, 'r').p, gt = EQ.gripPoint(Wt, 'r').p;
  set('Upper arm depth', 'peak', `${B5.d0(C3.armDip(Wb))} below the back plane; hands ${r1(gb[1] - Wb.shoulder_r.p[1])} cm above the shoulder joint, ${r1(2 * gb[2])} cm apart (${r1(2 * gt[2])} cm at the top)`); }
console.log(`Band Incline Bench Press: wrote ${L.write(ex)}\n  band ${JSON.stringify(rep.band)} len ${rep.bandLen}`);
