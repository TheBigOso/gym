// Resistance Band Overhead Shoulder Press (GymVisual, Resistance Band Overhead Shoulder Press; movement reference only,
// page not readable): standing on the bands, feet a little wider than hip width, knees soft (planted leg contacts); one band per hand,
// each anchored under the ball of its own foot (anchorJoint toe_r / toe_l). The hands start at the front of the shoulders,
// palms forward, elbows under the hands and a little forward; both arms press straight up to nearly straight over the
// shoulders, the shoulder blades rotating up, then lower under control. The hands sit a little wider than the shoulders
// so the strands run outside the thighs. Bilateral (right arm solved, left mirrored).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const B5 = require('./families/b5-bandpush');
const G = require('./families/b6-10');
const meta = require('./meta/resistance-band-overhead-shoulder-press.json');
const ENV = (k, d) => +(process.env[k] ?? d);
const WZ = ENV('WZ', 15), WX = ENV('WX', 14), TOPZ = ENV('TOPZ', 9), TOPX = ENV('TOPX', 4), STANCE = ENV('STANCE', 17);
const st = F.standing({ stance: STANCE, knee: 6 });
const base = clone(st.pose);
base.ch.neck_c7 = { rot: 0, flex: 2 }; base.ch.head_c1 = { rot: 0, flex: 2 };
const spec = (f) => ({
  sc: { protract: r1(4 - 2 * f), elevate: r1(16 * G.ease(f)) },
  at: (S) => {
    const e = G.ease(f);
    const w0 = V.add(S, [WX, 1, WZ]), w1 = V.add(S, [TOPX, Math.sqrt(L.reach(9) ** 2 - TOPX ** 2 - TOPZ ** 2), TOPZ]);
    // the hands rise nearly straight up, drifting back over the shoulders at the end
    const wrist = [w0[0] + (w1[0] - w0[0]) * Math.pow(f, 2.2), w0[1] + (w1[1] - w0[1]) * e, w0[2] + (w1[2] - w0[2]) * Math.pow(f, 2)];
    const hint = V.norm(G.lerp([0.35, -1, 0.5], [0.05, -0.2, 1], f));
    return { wrist, elbow: F.elbowFor(S, wrist, hint), wElbow: 1, palm: [1, 0, 0], wPalm: 2, guess: { plane: 40, elev: 85, axial: 60, flex: 110, pron: 0 } };
  },
});
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1];
const { poses: keys, err } = G.armPath(base, st.contacts, spec, FS);
const { poses, keyframes } = G.repKeys(meta, keys, FS);
const ex = H.module_(meta, st.contacts, poses, keyframes);
ex.props = B5.bandProps({ anchorJoint: 'toe_r', color: B5.COLOR.medium });
const rep = G.bandCheck('resistance-band-overhead-shoulder-press', ex, { minLine: 0.5, skip: /^(hand|thumb|forearm|foot)_/ });
const N = FS.length - 1, Wb = L.fk(poses.k0, st.contacts), Wt = L.fk(poses[`k${N}`], st.contacts), set = H.setKin(ex), d = G.d0;
set('Shoulder elevation', 'setup', `${d(G.humElev(Wb))} with the hands at the shoulders`); set('Shoulder elevation', 'peak', `${d(G.humElev(Wt))} at lockout`);
set('Elbow flexion', 'setup', d(G.elbowAng(Wb))); set('Elbow flexion', 'peak', `${d(G.elbowAng(Wt))} (nearly straight)`);
set('Trunk', 'setup', `Standing tall (${d(G.trunkFromVertical(Wb))} from vertical), feet ${2 * STANCE} cm apart, knees soft`); set('Trunk', 'peak', 'Unchanged (no lean back)');
set('Band', 'setup', `One band per hand under the ball of each foot; strands ${rep.strand[0]} cm`); set('Band', 'peak', `Strands ${rep.strand[1]} cm at lockout; at least ${r1(rep.line.d)} cm from the body`);
set('Tempo', 'setup', 'Pause 0.6 s at the shoulders'); set('Tempo', 'peak', '1.1 s up, 0.4 s lockout, 1.8 s down, 0.4 s pause');
console.log(`Resistance Band Overhead Shoulder Press: wrote ${L.write(ex)}\n  err ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}`);
