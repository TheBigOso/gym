// Band Single Leg Split Squat (GymVisual 14270, movement reference only; the page could not be read, so the movement
// follows the name and standard coaching). Long split stance, right foot forward and flat standing on the middle of the
// band, left heel up on the ball of the foot (both feet planted). The band ends are held in the hands at the sides on long
// arms, palms in (two-hand band anchored under the front foot: two strands up to the hands; with the hands at the
// shoulders the strands would cut through the front knee at the bottom). The pelvis drops straight down
// until the front knee is about 90 degrees and the back knee is just above the floor, then rises against the band.
// Body as in author-split-squat.js (lunge family); the hands stay at the sides (solved in the upper-trunk frame). Authored right leg forward (the player mirrors for the left).
const L = require('./lib');
const { V, Q, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const H = require('./families/hips');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const B5 = require('./families/b5-bandcore');
const meta = require('./meta/band-single-leg-split-squat.json');

const F = makeFamily({ toe: 6, half: 9 });
const FRONT = 38, BACK = -42;
const base = (pitch) => ({ root: [5, 80, 0], pitch, spine: { l5: -2, t12: 0, t6: 0 }, feet: { r: { c: 'flat', x: FRONT }, l: { c: 'ball', x: BACK } } });
const top = F.solveRoot(base(-12), { knee: 22, side: 'r', paths: ['root.0', 'root.1'], extra: [(W) => [(F.kneeOf(W, 'l') - 33) * 0.5]] });
const bot = F.solveRoot(base(-10), { knee: 92, side: 'r', paths: ['root.0', 'root.1'], extra: [(W) => [(W.knee_l.p[1] - 13) * 0.5]] });
// hands hanging at the sides on long arms (upper-trunk frame), palms in, handles fore-aft, as when holding dumbbells
const spec = (W) => {
  const fr = W.spine_t6.q, S = W.shoulder_r.p, at = (v) => V.add(S, Q.rot(fr, v));
  return { grip: at([1, -54, 5]), axis: Q.rot(fr, [1, 0, 0]), palm: Q.rot(fr, [0, 0, -1]), wPalm: 1.5,
    guess: { plane: 10, elev: 8, axial: 0, pron: 80, flex: 8 } };
};
const arms = (p) => { const q = B5.armSide(p, F.contacts, 'r', spec); delete q.__err; return C.mirrorArm(q); };
const at = (f) => { const s = clone(top); s.root = top.root.map((v, i) => r1(v + (bot.root[i] - v) * f)); s.pitch = r1(top.pitch + (bot.pitch - top.pitch) * f); s.arms = arms; const p = F.pose(s); p.ch.sc_r = { protract: 2, elevate: -2 }; p.ch.sc_l = { protract: 2, elevate: -2 }; return p; };
const poses = { top: at(0), d25: at(0.25), d50: at(0.5), d75: at(0.75), bottom: at(1), r50: at(0.5), settle: at(0.99) };
// arms re-solved after the shoulder-girdle setting (the girdle moves the shoulder)
for (const n in poses) poses[n] = arms(poses[n]);
const keyframes = [{ t: 0, pose: 'top' }, { t: 0.8, pose: 'top' }, { t: 1.25, pose: 'd25' }, { t: 1.7, pose: 'd50' }, { t: 2.15, pose: 'd75' }, { t: 2.6, pose: 'bottom' },
  { t: 2.75, pose: 'settle' }, { t: 2.9, pose: 'bottom' }, { t: 3.45, pose: 'r50' }, { t: 4.0, pose: 'top' }, { t: 5.0, pose: 'top' }];

// band under the middle of the front foot (fixed: the foot is planted); the strands run up under the front thigh to the hands
const ANCHOR = [r1(FRONT + 5), 0.8, F.half];
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [B5.band('band', { joint: 'wrist_r', with: 'wrist_l' }, ANCHOR)];
// the strands rise from under the front foot: the foot and shin they start against are skipped in the clearance check
const rep = B5.scan(ex, { skip: /^(hand|thumb|forearm)_|^(foot|shank|calf)_r$/, measure: B5.MEASURE.kneeFlexion });
B5.gate('band-single-leg-split-squat', rep, { minBand: 0.2, range: [meta.checks.measure.min, meta.checks.measure.max] });

const Wt = F.fk(poses.top), Wb = F.fk(poses.bottom), set = H.setKin(ex);
set('Step length', 'setup', `${FRONT - BACK} cm between ankle centres, feet ${2 * F.half} cm apart sideways`); set('Step length', 'peak', 'Unchanged');
set('Front knee', 'setup', B5.deg(F.kneeOf(Wt, 'r'))); set('Front knee', 'peak', B5.deg(F.kneeOf(Wb, 'r')));
set('Back knee', 'setup', B5.deg(F.kneeOf(Wt, 'l'))); set('Back knee', 'peak', `${B5.deg(F.kneeOf(Wb, 'l'))}, ${r1(Wb.knee_l.p[1])} cm above the floor (knee joint centre)`);
set('Trunk inclination', 'setup', B5.deg(F.trunkLean(Wt))); set('Trunk inclination', 'peak', B5.deg(F.trunkLean(Wb)));
set('Hands', 'setup', `At the sides on long arms, ${Math.round(EQ.gripPoint(Wt, 'r').p[1])} cm high; band under the middle of the front foot`); set('Hands', 'peak', `Still at the sides, ${Math.round(EQ.gripPoint(Wb, 'r').p[1])} cm high`);
set('Tempo', 'setup', 'Hold 0.8 s'); set('Tempo', 'peak', '1.8 s down, 0.3 s pause, 1.1 s up, 1.0 s reset');
console.log(`Band Single Leg Split Squat: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}`);
