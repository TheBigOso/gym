// Band Standing Single Arm Row (GymVisual, Band Standing Single Arm Row; movement reference only, page not readable):
// staggered stance facing a rack, left foot forward, right foot back, knees soft (planted leg contacts, b5-bandpush
// staggered with the feet swapped). The band is looped round the rack upright in line with the right shoulder, at about
// lower-chest height; the right hand holds it, arm reaching straight toward the upright, palm facing in; the left hand
// rests on the hip. The elbow drives straight back close to the side until the hand reaches the lower ribs, the shoulder
// blade retracting, then the arm reaches forward again under control. The forearm stays in line with the band
// (b5-bandpull armFrom). authoredSide 'right'.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const S2 = require('./families/b4-shoulders2');
const BP = require('./families/b5-bandpull');
const B5 = require('./families/b5-bandpush');
const G = require('./families/b6-10');
const meta = require('./meta/band-standing-single-arm-row.json');
const ENV = (k, d) => +(process.env[k] ?? d);

const st = B5.staggered({ front: -22, back: -24, stance: 13, knee: 10 }), contacts = st.contacts;
let base = clone(st.pose);
base.ch.neck_c7 = { rot: 0, flex: 0 }; base.ch.head_c1 = { rot: 0, flex: 2 };
base = S2.leftOnHip(base);
const S0 = L.fk(base, contacts).shoulder_r.p;
const RK = G.rackAt({ x: r1(S0[0] + ENV('AX', 104)), z: r1(S0[2]), y: r1(S0[1] - ENV('AD', 18)) }), ANCHOR = RK.anchor;
const U0 = V.norm(V.add(V.norm(V.sub(ANCHOR, S0)), [0, -0.12, 0])), U1 = V.norm([ENV('UX', -0.42), -0.86, ENV('UZ', 0.3)]);
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1], keys = [], err = [];
let g = { plane: 80, elev: 80, axial: 0, flex: 10, pron: 90 };
for (const f of FS) {
  const e = G.ease(f);
  const q = BP.armFrom(base, contacts, { u: BP.slerp(U0, U1, e), fTo: ANCHOR, palm: [0, 0, -1], guess: g });
  q.ch.sc_r = { protract: r1(8 - 22 * e), elevate: 0 };
  // re-solve with the girdle change in place (armFrom sets sc on both sides; keep the left girdle as in the base)
  const p = clone(base); p.ch.sc_r = q.ch.sc_r;
  const r = BP.armFrom(p, contacts, { u: BP.slerp(U0, U1, e), fTo: ANCHOR, palm: [0, 0, -1], guess: F.armGuess(q) });
  r.ch.sc_l = clone(base.ch.sc_l); r.ch.sc_r = clone(p.ch.sc_r);
  err.push(r.__err); g = F.armGuess(r); delete r.__err; keys.push(r);
}
const { poses, keyframes } = G.repKeys(meta, keys, FS);
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [RK.rack, ...B5.bandProps({ anchor: ANCHOR, sides: ['r'], color: B5.COLOR.medium })];
const rep = G.bandCheck('band-standing-single-arm-row', ex, { minLine: 1 });
const N = FS.length - 1, Wb = L.fk(poses.k0, contacts), Wt = L.fk(poses[`k${N}`], contacts), set = H.setKin(ex), d = G.d0;
const behind = (W) => r1(W.shoulder_r.p[0] - W.elbow_r.p[0]);
set('Elbow path', 'setup', `Arm reaching toward the upright (${d(G.humElev(Wb))} from the trunk)`); set('Elbow path', 'peak', `Elbow ${behind(Wt)} cm behind the shoulder, ${r1(Wt.elbow_r.p[2] - Wt.spine_t12.p[2])} cm out from the spine line`);
set('Elbow flexion', 'setup', d(G.elbowAng(Wb))); set('Elbow flexion', 'peak', d(G.elbowAng(Wt)));
set('Shoulder blade', 'setup', 'Protracted (clavicle 8°)'); set('Shoulder blade', 'peak', `Retracted (clavicle ${keys[N].ch.sc_r.protract}°)`);
set('Stance', 'setup', `Staggered: left foot 24 cm forward, right foot 22 cm back, knees soft, trunk ${d(G.trunkFromVertical(Wb))} from vertical, left hand on the hip`); set('Stance', 'peak', 'Unchanged (hips and shoulders square)');
set('Band', 'setup', `Looped round the rack upright in line with the right shoulder, ${ANCHOR[1]} cm up, ${r1(ANCHOR[0] - S0[0])} cm in front of the shoulder; strand ${rep.strand[0]} cm`); set('Band', 'peak', `Strand ${rep.strand[1]} cm at the ribs`);
set('Tempo', 'setup', 'Pause 0.6 s with the arm long'); set('Tempo', 'peak', '1.1 s row, 0.4 s squeeze, 1.8 s back, 0.4 s pause');
console.log(`Band Standing Single Arm Row: wrote ${L.write(ex)}\n  anchor ${ANCHOR} err ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}`);
