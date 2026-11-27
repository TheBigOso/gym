// Walking Lunge (GymVisual #381112): hands on hips; step forward with the right foot into a lunge (back heel rolls up
// onto the ball), rise and bring the back foot through to stand beside the front foot, then lunge with the left leg and
// step through again. Two steps forward per loop (the loop restarts at the start mark). Bilateral (one clip).
const L = require('./lib');
const { r1, clone } = L;
const { makeFamily, BALL_SHIFT } = require('./families/lunge');
const meta = require('./meta/walking-lunge.json');

const F = makeFamily({ toe: 6, half: 9 });
const STEP = 80;
const P = (s) => F.pose(Object.assign(clone(s), { arms: F.handsOnHips }));
const other = (s) => (s === 'r' ? 'l' : 'r');
const mixRoot = (a, b, f, feet) => ({ root: a.root.map((v, i) => r1(v + (b.root[i] - v) * f)), pitch: r1(a.pitch + (b.pitch - a.pitch) * f), spine: a.spine, feet });
const zSign = (s) => (s === 'r' ? 1 : -1);
const poses = {}, keyframes = [];
const key = (t, name, pose) => { poses[name] = pose; keyframes.push({ t: r1(t * 100) / 100, pose: name }); };

// One lunge stepping with fs from feet-together at x0, then the back leg steps through to x0 + STEP. Starts at t0.
function lunge(fs, x0, t0, tag) {
  const bs = other(fs), BACK = r1(x0 + BALL_SHIFT), X1 = x0 + STEP;
  const S = F.split(fs, X1, BACK);
  const on = (planted, pf, swing, x, knee, pitch = -4) => F.rootY({ root: [x, 85, -1.5 * zSign(fs) * (planted === bs ? 1 : -1)], pitch, spine: { l5: -1, t12: 0, t6: 0 }, feet: { [planted]: pf, [planted === fs ? bs : fs]: swing } }, knee, planted);
  const flat = (x, extra = {}) => Object.assign({ c: 'flat', x }, extra);
  const reach = on(bs, flat(x0), flat(x0 + 52, { lift: 5, w: 0 }), x0 + 16, 14, -6);
  const heel = Object.assign(clone(S.top), { root: [r1(S.top.root[0] - 3), S.top.root[1], S.top.root[2]], feet: { [fs]: flat(X1, { lift: 0.6, w: 0 }), [bs]: { c: 'ball', x: BACK } } });
  const roll = (f, pitch, rx, rl) => P(mixRoot(reach, heel, f, { [bs]: { c: 'roll', pitch, ballX: x0 + F.BALL_X }, [fs]: flat(rx, { lift: rl, w: 0 }) }));
  key(t0 + 0.2, `${tag}lift`, P(on(bs, flat(x0), flat(x0 + 10, { lift: 6, w: 0 }), x0 + 2, 8)));
  key(t0 + 0.4, `${tag}reach`, P(reach));
  key(t0 + 0.465, `${tag}up16`, roll(0.25, 16, x0 + 59, 3.8)); key(t0 + 0.53, `${tag}up32`, roll(0.5, 32, x0 + 66, 2.7)); key(t0 + 0.595, `${tag}up48`, roll(0.75, 48, x0 + 73, 1.6));
  key(t0 + 0.66, `${tag}heel`, P(heel));
  key(t0 + 0.8, `${tag}top`, P(S.top)); key(t0 + 1.05, `${tag}d33`, P(S.at(0.33))); key(t0 + 1.3, `${tag}d66`, P(S.at(0.66))); key(t0 + 1.5, `${tag}bottom`, P(S.bottom));
  key(t0 + 1.6, `${tag}settle`, P(S.at(0.99))); key(t0 + 1.7, `${tag}bottom2`, P(S.bottom)); key(t0 + 1.95, `${tag}r50`, P(S.at(0.5))); key(t0 + 2.2, `${tag}top2`, P(S.top));
  // step through: the back foot leaves from its ball and swings forward beside the front foot
  key(t0 + 2.35, `${tag}unload`, P(Object.assign(clone(S.top), { root: [r1(S.top.root[0] + 4), S.top.root[1], S.top.root[2]], feet: { [fs]: flat(X1), [bs]: { c: 'ball', x: BACK + 2, lift: 2, w: 0 } } })));
  key(t0 + 2.7, `${tag}through`, P(on(fs, flat(X1), flat(x0 + 45, { lift: 8, w: 0 }), X1 - 6, 12, -6)));
  key(t0 + 3.0, `${tag}preLand`, P(on(fs, flat(X1), flat(X1, { lift: 0.8, w: 0 }), X1 - 1, 6)));
  key(t0 + 3.15, `${tag}land`, P(F.stand({ r: flat(X1), l: flat(X1) }, { knee: 4, x: X1 })));
}
key(0, 'stand0', P(F.stand({ r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } }, { knee: 4 })));
key(0.8, 'stand0b', poses.stand0);
lunge('r', 0, 0.8, 'R');
key(4.4, 'stand1', P(F.stand({ r: { c: 'flat', x: STEP }, l: { c: 'flat', x: STEP } }, { knee: 4, x: STEP })));
lunge('l', STEP, 4.4, 'L');
key(8.0, 'stand2', P(F.stand({ r: { c: 'flat', x: 2 * STEP }, l: { c: 'flat', x: 2 * STEP } }, { knee: 4, x: 2 * STEP })));
// remove exact duplicate keys at the same time (land at t0 + 3.15 vs stand at t0 + 3.6 are distinct)
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
const rep = F.report(ex), Wb = F.fk(poses.Rbottom);
const kin = ex.exercise.kinematics, set = (p, f, v) => { const k = kin.find((x) => x.measure.startsWith(p)); if (k) k[f] = v; };
set('Step length', 'setup', 'Feet together (hip width)'); set('Step length', 'peak', `${STEP} cm per step`);
set('Front knee', 'peak', `≈${Math.round(F.kneeOf(Wb, 'r'))}°`); set('Back knee', 'peak', `≈${Math.round(F.kneeOf(Wb, 'l'))}°, ${r1(Wb.knee_l.p[1])} cm above the floor (knee joint centre)`);
set('Trunk inclination', 'peak', `≈${Math.round(F.trunkLean(Wb))}°`); set('Tempo', 'peak', 'Each step: 0.8 s step, 0.7 s down, 0.2 s pause, 0.5 s up, about 1 s step through');
set('Travel', 'peak', `${2 * STEP} cm forward per loop`);
ex.exercise.reference.note = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
console.log(`Walking Lunge: ${keyframes.length} keys, wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
