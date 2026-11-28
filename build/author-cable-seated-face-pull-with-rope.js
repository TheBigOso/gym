// Cable Seated Face Pull (with rope) (GymVisual 15719; movement reference only, page not readable): seated tall on a box
// facing a cable pulley set at about eye level, feet flat on the floor (planted leg contacts). A rope (cable attachment
// 'rope', two hands, 44 cm between the grip points throughout) is pulled from the arms reaching toward the pulley to
// beside the face: the elbows travel out and back at about shoulder height, the shoulder blades draw together and the
// shoulders turn out so the palms face forward-in at the finish. The trunk stays still on the seat. Slow return.
// Bilateral (right arm solved, left mirrored). Built with build/families/b6-09.js facePull (on b5-cablepull.js).
// Tempo: 1.2 s pull, 0.5 s hold, 2 s back, 0.5 s pause.
const L = require('./lib');
const { r1, clone } = L;
const B = require('./families/b5-cablepull');
const X = require('./families/b6-09');
const meta = require('./meta/cable-seated-face-pull-with-rope.json');

const ID = 'cable-seated-face-pull-with-rope';
const base = B.seatedBox({ feet: 'floor', stance: 16, seatH: 46 });
const seated = B.leanTo(base, -2);
const trunkAt = (f, k) => {
  const p = clone(seated);
  p.ch.sc_r = { protract: r1(10 - 24 * k), elevate: r1(2 + 2 * k) }; p.ch.sc_l = clone(p.ch.sc_r);
  p.ch.neck_c7 = { rot: 0, flex: 1 }; p.ch.head_c1 = { rot: 0, flex: 0 };
  return p;
};
const r = X.facePull({ base: { pose: seated, contacts: base.contacts }, trunkAt, meta, id: ID, anchorDX: 115, extraProps: [base.seat] });
let seatLow = 1e9;
require('./families/hips').loopReport(r.ex, { probe: (W) => { seatLow = Math.min(seatLow, B.thighOnSeat(W, base.seat)); } });
if (seatLow < -1.5) { console.error(`FAIL ${ID}: thighs into the seat ${seatLow.toFixed(2)}`); process.exitCode = 1; }
X.facePullKin(r.ex, r, base.contacts);
console.log(`Cable Seated Face Pull: wrote ${L.write(r.ex)}\n  keys ${JSON.stringify(r.err)}\n  anchor ${r.ANCHOR} G0 ${r.G0.map(L.r1)} G1 ${r.G1}\n  ${JSON.stringify(r.rep)}\n  rope ${JSON.stringify(r.ropeClr)} hands ${JSON.stringify(r.handClr)} seat ${seatLow.toFixed(2)}`);
