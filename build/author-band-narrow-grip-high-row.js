// Band Narrow Grip High Row (GymVisual, Band Narrow Grip High Row; movement reference only, page not readable): standing
// tall facing a rack, feet about hip width, knees soft (planted leg contacts). The band is looped round the rack upright on
// the midline above head height; the hands hold the two strands close together with a neutral grip (palms facing), arms
// reaching up toward the upright. The elbows pull down and back close to the body until the hands reach the top of the
// chest, the shoulder blades drawing back and down; then the arms reach back up under control. The forearms stay in line
// with the band, the hands close together (grip points about 12-14 cm apart). Bilateral (right arm solved, left mirrored).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const BP = require('./families/b5-bandpull');
const G = require('./families/b6-10');
const meta = require('./meta/band-narrow-grip-high-row.json');
const ENV = (k, d) => +(process.env[k] ?? d);

const st = F.standing({ stance: 12, knee: 6 }), contacts = st.contacts;
const base = clone(st.pose);
base.ch.neck_c7 = { rot: 0, flex: 0 }; base.ch.head_c1 = { rot: 0, flex: -2 };
const S0 = L.fk(base, contacts).shoulder_r.p;
const RK = BP.rackAnchor({ x: r1(S0[0] + ENV('AX', 95)), y: r1(S0[1] + ENV('AY', 45)) }), ANCHOR = RK.anchor;
const HZ = ENV('HZ', 11); // grip point off the midline (hands close)
const spec = (f) => ({
  sc: { protract: r1(6 - 18 * G.ease(f)), elevate: r1(10 - 13 * G.ease(f)) },
  at: (S) => {
    const e = G.ease(f), u0 = V.norm(V.sub(ANCHOR, S)), w0 = V.add(S, V.scale(u0, L.reach(16)));
    w0[2] = HZ;
    const w1 = [S[0] + ENV('EX', 20), S[1] - ENV('EY', 6), HZ];
    const wrist = G.lerp(w0, w1, e), hint = V.norm(G.lerp([0.1, -1, 0.7], [-0.6, -0.8, 0.5], e));
    return { wrist, elbow: F.elbowFor(S, wrist, hint), wElbow: 1, palm: [0, 0, -1], wPalm: 2, guess: { plane: 85, elev: 120, axial: 0, flex: 10, pron: 90 } };
  },
});
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1];
const { poses: keys, err } = G.armPath(base, contacts, spec, FS);
const { poses, keyframes } = G.repKeys(meta, keys, FS);
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [RK.rack, RK.band];
const rep = G.bandCheck('band-narrow-grip-high-row', ex, { minLine: 1 });
const EQ = require('./families/equip');
const N = FS.length - 1, Wb = L.fk(poses.k0, contacts), Wt = L.fk(poses[`k${N}`], contacts), set = H.setKin(ex), d = G.d0;
const gap = (W) => r1(EQ.gripPoint(W, 'r').p[2] - EQ.gripPoint(W, 'l').p[2]);
set('Arm path', 'setup', `Reaching up toward the upright, ${d(G.humElev(Wb))} of elevation`); set('Arm path', 'peak', `Elbows beside the ribs (${d(G.humElev(Wt))}), hands ${r1(Wt.shoulder_r.p[1] - EQ.gripPoint(Wt, 'r').p[1])} cm below the shoulders`);
set('Elbow flexion', 'setup', d(G.elbowAng(Wb))); set('Elbow flexion', 'peak', d(G.elbowAng(Wt)));
set('Grip', 'setup', `Neutral, palms facing; grip points ${gap(Wb)} cm apart`); set('Grip', 'peak', `Grip points ${gap(Wt)} cm apart`);
set('Band', 'setup', `Looped round the rack upright on the midline ${ANCHOR[1]} cm up, ${r1(ANCHOR[0] - S0[0])} cm in front of the shoulders; strands ${rep.strand[0]} cm`); set('Band', 'peak', `Strands ${rep.strand[1]} cm at the chest`);
set('Tempo', 'setup', 'Pause 0.6 s with the arms long'); set('Tempo', 'peak', '1.1 s row, 0.4 s squeeze, 1.8 s back, 0.4 s pause');
console.log(`Band Narrow Grip High Row: wrote ${L.write(ex)}\n  anchor ${ANCHOR} err ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}`);
