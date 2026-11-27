// Barbell Strict Curl (GymVisual #14792, "Barbell Srtict Curl"; page not readable here, movement from the name and the
// library's Dumbbell Strict Curl): standing with the glutes, upper back and head against a wall, heels a few centimetres
// forward, underhand grip (palms forward/up) about shoulder width (42 cm between the handle points). The backs of the
// elbows stay on the wall, so the upper arms sit a little behind the trunk and the bar starts on the thighs with the elbows
// somewhat bent (the wall removes the bottom of the range, as in a real wall curl). Both arms curl, short squeeze, slow
// lower. Wall face and elbow targets as in author-dumbbell-strict-curl.js (rig v2 matches the mesh). Bilateral.
const L = require('./lib');
const { r1 } = L;
const C = require('./families/b3-curls');
const A = require('./families/b5-bbarms');
const meta = require('./meta/barbell-strict-curl.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const WALL = ENV('WALL', -8.5);                             // wall face x (rig cm): backs of the thighs -8.6, traps -8.1, buttocks -7.8
const EX = ENV('EX', -4.5), EZ = ENV('EZ', 22.5), A1 = ENV('A1', 125); // elbow on the wall (upper-arm capsule r 4.0 at the elbow)
const { contacts, base } = C.standing({}, { sc: { protract: -6, elevate: 0 } });
base.ch.neck_c7 = { rot: 0, flex: ENV('NECK', -20) }; base.ch.head_c1 = { rot: 0, flex: ENV('HEAD', 19) };
const S = L.fk(base, contacts).shoulder_r.p, UA = L.V.len(L.rig.byId.elbow_r.offset);
const E = [EX, 0, EZ]; E[1] = S[1] - Math.sqrt(UA * UA - (E[0] - S[0]) ** 2 - (E[2] - S[2]) ** 2);
const wall = { id: 'wall', kind: 'wall', center: [r1(WALL - 5), 0, 0], size: [10, 200, 160] };
let gap = [1e9, -1e9];
A.buildCurl(meta, {
  base, contacts, E, a1: A1, under: true, drift: [0, 0, 0], props: [wall], name: 'Barbell Strict Curl',
  tempo: ['Bar on the thighs 0.6 s', '1.2 s up, 0.3 s squeeze, 2.4 s down, 0.9 s at the bottom'],
  rows: (set, { Wb, poses }) => {
    for (const p of Object.values(poses)) { const g = A.armWallGap(L.fk(p, contacts), WALL); gap = [Math.min(gap[0], g), Math.max(gap[1], g)]; }
    set('Back on the wall', 'setup', `Wall face ${r1(-WALL)} cm behind the pelvis centre; heels ≈${r1(Wb.ankle_r.p[0] - 6 - WALL)} cm from the wall`);
    set('Back on the wall', 'peak', `Unchanged: trunk and elbows stay on the wall (arm-to-wall gap ${r1(gap[0])} to ${r1(gap[1])} cm)`);
  },
  checks: () => [[gap[0] > -0.6, `arm into the wall (${r1(gap[0])} cm)`], [gap[0] < 1.0, `elbows off the wall (${r1(gap[0])} cm)`]],
});
