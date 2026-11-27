// Band Incline Fly (GymVisual, Band Incline Fly; movement reference only): back pad at 30 degrees, seat flat, glutes in
// the crease, upper back and head on the pad, feet planted (leg contacts). A rack stands behind the top of the pad with a
// band looped low around each upright, a handle in each hand with a neutral grip. The arms open in a wide arc with a soft
// fixed elbow bend from over the upper chest until the upper arms are about level with the pad, then hug back up against
// the band; each strand runs from its upright, out to the side and behind, to the hand. Bilateral. Arc from the incline
// dumbbell fly builder (b3-chest flyPath).
const L = require('./lib');
const { r1 } = L;
const H = require('./families/hips');
const B5 = require('./families/b5-bandpush');
const fly = require('./author-dumbbell-fly');
const meta = require('./meta/band-incline-fly.json');
const ex = fly(meta, { angle: 30, label: 'Band Incline Fly (arc)' });
const { rack, anchor } = B5.rackBehindBench({ y: 40 });
B5.swapDumbbells(ex, [rack, ...B5.bandProps({ anchor, color: B5.COLOR.light })]);
const rep = B5.scanBands(ex, { planted: ['leg_r', 'leg_l'] });
B5.gateBands('band-incline-fly', rep);
const set = H.setKin(ex);
set('Band', 'setup', `Looped around the rack uprights ${anchor[1]} cm up, ${-anchor[0]} cm behind the hinge, ${2 * anchor[2]} cm apart`); set('Band', 'peak', `Strands ${rep.bandLen[0]}-${rep.bandLen[1]} cm (longest with the hands together), at least ${r1(rep.band.d)} cm from the body`);
{ const EQ = require('./families/equip'), Wb = L.fk(ex.poses.bottom, ex.contacts), Wt = L.fk(ex.poses.top, ex.contacts);
  set('Grip', 'setup', `Neutral; hands ${r1(2 * EQ.gripPoint(Wt, 'r').p[2])} cm apart at the top`); set('Grip', 'peak', `Palms up at the bottom; hands ${r1(2 * EQ.gripPoint(Wb, 'r').p[2])} cm apart`); }
console.log(`Band Incline Fly: wrote ${L.write(ex)}\n  band ${JSON.stringify(rep.band)} len ${rep.bandLen}`);
