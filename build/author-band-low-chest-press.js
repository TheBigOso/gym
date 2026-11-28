// Band Low Chest Press (GymVisual, Band Low Chest Press; movement reference only, page not readable): standing in a
// staggered stance (right foot forward, knees soft, planted leg contacts) with the back to a rack. A band is looped round
// each rack upright behind the lifter, above shoulder height, one band end per hand. From the hands beside the chest
// (elbows back and out about 45 degrees, palms down) the arms press forward and down (the hands travel about 17 degrees below
// horizontal: a high-to-low, "decline" press for the lower chest) to nearly straight, then return. Read as the
// counterpart of band-incline-chest-press (low-to-high); see the report. Bilateral (right arm solved, left mirrored).
const L = require('./lib');
const { V, R, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const EQ = require('./families/equip');
const B5 = require('./families/b5-bandpush');
const G = require('./families/b6-10');
const meta = require('./meta/band-low-chest-press.json');
const ENV = (k, d) => +(process.env[k] ?? d);
const DECL = ENV('DECL', 25), RACK_X = ENV('RACK_X', -50), RACK_W = ENV('RACK_W', 150);
const st = B5.staggered({ front: 24, back: 22, stance: 13, knee: 10 });
const base = clone(st.pose);
base.ch.neck_c7 = { rot: 0, flex: 0 }; base.ch.head_c1 = { rot: 0, flex: 4 };
const dir = V.norm([Math.cos(DECL * R.DEG), -Math.sin(DECL * R.DEG), -0.12]);
const spec = (f) => ({
  sc: { protract: r1(-8 + 16 * f), elevate: r1(-2 * f) },
  at: (S) => {
    const w0 = V.add(S, [11, -13, 6]), w1 = V.add(S, V.scale(dir, L.reach(10)));
    const wrist = G.lerp(w0, w1, G.ease(f));
    const hint = V.norm(G.lerp([-0.75, -0.6, 0.45], [-0.1, -0.85, 0.5], f));
    return { wrist, elbow: F.elbowFor(S, wrist, hint), wElbow: 1, palm: V.norm([dir[0], dir[1], 0]), wPalm: 2, guess: { plane: -10, elev: 50, axial: 30, flex: 110, pron: 90 } };
  },
});
const FS = [0, 0.25, 0.5, 0.75, 1];
const { poses: keys, err } = G.armPath(base, st.contacts, spec, FS);
const { poses, keyframes } = G.repKeys(meta, keys, FS);
const ex = H.module_(meta, st.contacts, poses, keyframes);
const S0 = L.fk(poses.k0, st.contacts).shoulder_r.p;
const ANCHOR_Y = ENV('ANCHOR_Y', r1(S0[1] + 28));
const rk = EQ.rack({ x: RACK_X, width: RACK_W, hookY: 120, facing: 1 });
ex.props = [rk.prop, ...B5.bandProps({ anchor: [RACK_X + 3, ANCHOR_Y, RACK_W / 2], color: B5.COLOR.medium })];
const rep = G.bandCheck('band-low-chest-press', ex, { minLine: 1 });
const N = FS.length - 1, Wb = L.fk(poses.k0, st.contacts), Wt = L.fk(poses[`k${N}`], st.contacts), set = H.setKin(ex), d = G.d0;
const gT = EQ.gripPoint(Wt, 'r').p, gB = EQ.gripPoint(Wb, 'r').p, path = V.sub(gT, gB);
const pathAng = Math.atan2(path[1], path[0]) / R.DEG;
const flare = (W) => { const u = V.norm(V.sub(W.elbow_r.p, W.shoulder_r.p)); return Math.acos(Math.max(-1, Math.min(1, -u[1] / Math.hypot(u[1], u[2])))) / R.DEG; };
set('Press angle', 'setup', `Hands beside the chest, ${r1(S0[1] - gB[1])} cm below shoulder height`); set('Press angle', 'peak', `Hands travel ${d(-pathAng)} below horizontal to ${r1(Wt.shoulder_r.p[1] - gT[1])} cm below the shoulders, ${r1(gT[2] - EQ.gripPoint(Wt, 'l').p[2])} cm apart`);
set('Elbow flexion', 'setup', `${d(G.elbowAng(Wb))} at the chest`); set('Elbow flexion', 'peak', `${d(G.elbowAng(Wt))} (nearly straight)`);
set('Elbow flare', 'setup', `Upper arm ${d(flare(Wb))} out from the side (front view)`); set('Elbow flare', 'peak', 'Arms reach forward and down');
set('Band', 'setup', `Looped round the rack uprights ${-RACK_X} cm behind, ${ANCHOR_Y} cm up, ${RACK_W} cm apart; strands ${rep.strand[0]} cm`); set('Band', 'peak', `Strands ${rep.strand[1]} cm at the end of the press; at least ${r1(rep.line.d)} cm from the body`);
set('Stance', 'setup', 'Staggered: right foot 24 cm forward, left 22 cm back, knees soft'); set('Stance', 'peak', 'Unchanged (trunk still)');
set('Tempo', 'setup', 'Pause 0.6 s at the chest'); set('Tempo', 'peak', '1.1 s press, 0.4 s hold, 1.8 s return, 0.4 s pause');
console.log(`Band Low Chest Press: wrote ${L.write(ex)}\n  err ${JSON.stringify(err)}\n  path ${r1(pathAng)} ${JSON.stringify(rep)}`);
