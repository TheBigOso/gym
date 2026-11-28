// Band Kneeling One Arm Pulldown (GymVisual, Band kneeling one arm pulldown; movement reference only, page not readable):
// tall kneeling facing a rack, both knees on the floor about hip width, toes tucked, hips over the knees (planted leg
// contacts, b5-cablepush tallKneel). The band is looped round the rack upright in line with the right shoulder, well above
// head height and a little in front; the right hand holds it, arm reaching up toward the upright, palm facing in, shoulder
// blade raised; the left hand rests on the hip. The elbow pulls down to the side of the ribs, the hand finishing in front
// of the shoulder with the forearm in line with the band (b5-bandpull armFrom), the shoulder blade drawing down; then the
// arm reaches back up under control. authoredSide 'right'.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const S2 = require('./families/b4-shoulders2');
const P = require('./families/b5-cablepush');
const BP = require('./families/b5-bandpull');
const B5 = require('./families/b5-bandpush');
const G = require('./families/b6-10');
const meta = require('./meta/band-kneeling-one-arm-pulldown.json');
const ENV = (k, d) => +(process.env[k] ?? d);

const kn = P.tallKneel({ toePitch: 78 }), contacts = kn.contacts;
let base = clone(kn.pose);
base.ch.neck_c7 = { rot: 0, flex: 0 }; base.ch.head_c1 = { rot: 0, flex: -4 };
base = S2.leftOnHip(base);
const S0 = L.fk(base, contacts).shoulder_r.p;
const RK = G.rackAt({ x: r1(S0[0] + ENV('AX', 70)), z: r1(S0[2] + ENV('AZ', 6)), y: r1(S0[1] + ENV('AY', 75)) }), ANCHOR = RK.anchor;
const U0 = V.norm(V.sub(ANCHOR, S0)), U1 = V.norm([ENV('UX', -0.12), -0.95, ENV('UZ', 0.4)]);
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1], keys = [], err = [];
let g = { plane: 60, elev: 150, axial: 0, flex: 10, pron: 90 };
for (const f of FS) {
  const e = G.ease(f), p = clone(base);
  p.ch.sc_r = { protract: r1(4 - 10 * e), elevate: r1(16 - 20 * e) };
  const q = BP.armFrom(p, contacts, { u: BP.slerp(U0, U1, e), fTo: ANCHOR, palm: [0, 0, -1], guess: g });
  err.push(q.__err); g = F.armGuess(q); delete q.__err; keys.push(q);
}
const { poses, keyframes } = G.repKeys(meta, keys, FS);
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [RK.rack, ...B5.bandProps({ anchor: ANCHOR, sides: ['r'], color: B5.COLOR.medium })];
const rep = G.bandCheck('band-kneeling-one-arm-pulldown', ex, { minLine: 1 });
const N = FS.length - 1, Wb = L.fk(poses.k0, contacts), Wt = L.fk(poses[`k${N}`], contacts), set = H.setKin(ex), d = G.d0;
set('Arm path', 'setup', `Reaching up toward the upright, ${d(G.humElev(Wb))} of elevation`); set('Arm path', 'peak', `Elbow beside the ribs (${d(G.humElev(Wt))}), hand in front of the shoulder`);
set('Elbow flexion', 'setup', d(G.elbowAng(Wb))); set('Elbow flexion', 'peak', d(G.elbowAng(Wt)));
set('Shoulder blade', 'setup', 'Raised (clavicle elevation 16°)'); set('Shoulder blade', 'peak', `Drawn down (clavicle elevation ${keys[N].ch.sc_r.elevate}°)`);
set('Kneeling', 'setup', `Tall kneeling, knees ${d(rep.kneeR[0])}, trunk ${d(G.trunkFromVertical(Wb))} from vertical, left hand on the hip`); set('Kneeling', 'peak', 'Unchanged (no lean or side bend)');
set('Band', 'setup', `Looped round the rack upright ${ANCHOR[1]} cm up, ${r1(ANCHOR[0] - S0[0])} cm in front of the right shoulder; strand ${rep.strand[0]} cm`); set('Band', 'peak', `Strand ${rep.strand[1]} cm at the bottom`);
set('Tempo', 'setup', 'Pause 0.6 s in the stretch'); set('Tempo', 'peak', '1.1 s down, 0.4 s squeeze, 1.8 s up, 0.4 s pause');
console.log(`Band Kneeling One Arm Pulldown: wrote ${L.write(ex)}\n  anchor ${ANCHOR} err ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}`);
