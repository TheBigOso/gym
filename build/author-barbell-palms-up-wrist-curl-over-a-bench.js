// Barbell Palms Up Wrist Curl over a bench (GymVisual #18533; page not readable here, movement from the name and standard
// coaching): kneeling on both knees behind a flat bench (toes tucked, thighs about vertical, both leg contacts planted),
// trunk leaning forward so both forearms lie across the pad, palms up, the wrists a few cm past the far edge; a light
// barbell in an underhand grip about shoulder width. The forearms stay still (one constant pose); only the wrists move:
// from extension (bar lowered past the edge) to flexion (hands curled up), short squeeze, slow lower. The bench height
// and position follow the forearms (b6-02.js kneelOnBench); the bar and the hands are checked against the bench box over
// the loop. Bilateral.
const L = require('./lib');
const { r1 } = L;
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const A = require('./families/b5-bbarms');
const FA = require('./families/b4-forearms');
const W6 = require('./families/b6-02');
const meta = require('./meta/barbell-palms-up-wrist-curl-over-a-bench.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const LOW = ENV('LOW', -50), HIGH = ENV('HIGH', 55), MID = Math.round((LOW + HIGH) / 2), PAST = ENV('PAST', 4);
const k = W6.kneelOnBench({ benchH: ENV('BH', 42), past: PAST, palm: 'up' });
const keys = [[0, LOW], [0.5, LOW], [1.0, MID], [1.5, HIGH], [1.9, HIGH + 3], [2.75, MID], [3.6, LOW], [4.0, LOW]];
const poses = {}, keyframes = [], seen = {};
for (const [t, fl] of keys) { const n = `w${fl < 0 ? 'm' : 'p'}${Math.abs(fl)}`; if (!seen[n]) { seen[n] = 1; poses[n] = FA.withWrist(k.pose, fl); } keyframes.push({ t, pose: n }); }
const ex = H.module_(meta, k.contacts, poses, keyframes);
ex.props = [k.bench, BB.barbellProp({ plateD: 32 })];
let box = { bar: 1e9, hand: 1e9 };
const sw = BB.sweep(ex, { skip: /^(hand|thumb|forearm)_/, fixed: ['elbow_r', 'elbow_l', 'wrist_r', 'wrist_l', 'pelvis'], probe: (W) => { const c = W6.barBoxClear(W, k.bench); box = { bar: Math.min(box.bar, c.bar), hand: Math.min(box.hand, c.hand) }; } });
const W0 = L.fk(k.pose, k.contacts), trunk = L.V.angle(L.V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
const set = H.setKin(ex);
set('Wrist flexion/extension', 'setup', `${-LOW}° extension (bar lowered past the edge)`); set('Wrist flexion/extension', 'peak', `${HIGH}° flexion (arc ≈${HIGH - LOW}°)`);
set('Forearms on the bench', 'setup', `Kneeling, trunk ≈${Math.round(trunk)}° forward of vertical; forearms across a ${k.padY} cm bench, wrists ${PAST} cm past the edge; grip ${r1(EQ.barAt(W0, BB.GRIP).width)} cm between the handle points`);
set('Forearms on the bench', 'peak', `Forearms still (move ${sw.drift} cm); bar at least ${r1(box.bar)} cm and the hands ${r1(box.hand)} cm from the bench`);
set('Tempo', 'setup', 'Bottom 0.5 s'); set('Tempo', 'peak', '1 s up, 0.4 s squeeze, 1.7 s down, 0.4 s at the bottom');
const fails = A.failures(sw, [[sw.drift < 0.05, 'forearms move'], [box.bar > 0.3, `bar into the bench (${r1(box.bar)})`], [box.hand > -0.5, `hands into the bench (${r1(box.hand)})`], [Math.max(...k.res.slice(0, 7).map(Math.abs)) < 0.6, `pose residual ${k.res}`]]);
A.report('Barbell Palms Up Wrist Curl over a bench', L.write(ex), sw, { res: k.res, x: k.x, bench: k.bench, trunk: r1(trunk), box }, fails);
