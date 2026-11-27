// Bodyweight Single Leg Squat (GymVisual #756012): balance on the right foot with the left foot held just off the floor
// in front and the arms reaching forward; sit the hips back and down to about 80 degrees of knee flexion while the free
// leg reaches further forward, pause, and stand tall. The centre of mass stays over the middle of the right foot.
// Authored on the right leg (the player mirrors for the left).
const L = require('./lib');
const { r1, clone } = L;
const { makeSingle, com, dorsiOf } = require('./families/single');
const meta = require('./meta/bodyweight-single-leg-squat.json');

const F = makeSingle({ toe: 6, half: 9 });
const FOOT = { c: 'flat', x: 0, z: 9 };
const CX = 4, CZ = 9;             // centre of mass over the middle of the right foot (ankle at x 0)
const KNEE_TOP = 4, KNEE_BOTTOM = 80;
// depth g (0 = standing tall, 1 = bottom): trunk hinges forward, the free foot travels forward and stays off the floor
const spec = (g) => ({ root: [r1(-19 * g), 85, 9], pitch: r1(-4 - 34 * g), spine: { l5: r1(-3 * g), t12: r1(-2 * g), t6: r1(1 * g) },
  feet: { r: FOOT, l: { c: 'flat', x: r1(22 + 24 * g), z: 1, lift: r1(18 - 2 * g), w: 0, pitch: r1(-5 + 10 * g) } }, arms: F.armsForward });
const at = (g) => {
  const knee = KNEE_TOP + (KNEE_BOTTOM - KNEE_TOP) * g;
  return F.pose(knee < 20 ? F.balanceTall(spec(g), { knee, cx: CX, cz: CZ }) : F.balance(spec(g), { knee, cx: CX, cz: CZ }));
};
// knee over the 2nd-3rd toe at the bottom: tune the right knee pole (by bisection) so the knee sits about 1.5 cm outside the foot axis
const TOE = 6, nFoot = [-Math.sin(TOE * Math.PI / 180), 0, Math.cos(TOE * Math.PI / 180)];
const kneeLine = (W) => L.V.dot(L.V.sub(W.knee_r.p, W.ankle_r.p), nFoot);
const legR = F.contacts.find((c) => c.id === 'leg_r');
{ let a = -1.5, b = 0.6; for (let i = 0; i < 24; i++) { const m = (a + b) / 2; legR.pole = [1, 0, +m.toFixed(4)]; if (kneeLine(F.fk(at(1))) > 1.5) b = m; else a = m; } legR.pole = [1, 0, +((a + b) / 2).toFixed(4)]; }
const poses = { stand: at(0), d25: at(0.3), d50: at(0.55), d75: at(0.8), bottom: at(1), r50: at(0.55), r85: at(0.15) };
poses.settle = F.pose(F.balance(spec(1), { knee: KNEE_BOTTOM + 1.2, cx: CX, cz: CZ })); // tiny settle at the bottom
const keyframes = [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.35, pose: 'd25' }, { t: 1.85, pose: 'd50' }, { t: 2.35, pose: 'd75' }, { t: 2.8, pose: 'bottom' },
  { t: 2.95, pose: 'settle' }, { t: 3.1, pose: 'bottom' }, { t: 3.65, pose: 'r50' }, { t: 4.05, pose: 'r85' }, { t: 4.3, pose: 'stand' }, { t: 5.5, pose: 'stand' }];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
const rep = F.report(ex), Wt = F.fk(poses.stand), Wb = F.fk(poses.bottom);
const kin = ex.exercise.kinematics, set = (p, f, v) => { const k = kin.find((x) => x.measure.startsWith(p)); if (k) k[f] = v; };
set('Stance knee', 'setup', `≈${Math.round(F.kneeOf(Wt, 'r'))}°`); set('Stance knee', 'peak', `≈${Math.round(F.kneeOf(Wb, 'r'))}°`);
set('Stance hip', 'setup', `≈${Math.round(poses.stand.ch.hip_r.flex)}°`); set('Stance hip', 'peak', `≈${Math.round(poses.bottom.ch.hip_r.flex)}° (joint channel, as in the HUD)`);
set('Trunk inclination', 'setup', `≈${Math.round(F.trunkLean(Wt))}°`); set('Trunk inclination', 'peak', `≈${Math.round(F.trunkLean(Wb))}° forward`);
set('Free leg', 'setup', `Foot ${r1(Wt.ankle_l.p[0])} cm ahead of the stance ankle, knee ≈${Math.round(F.kneeOf(Wt, 'l'))}°`);
set('Free leg', 'peak', `Foot ${r1(Wb.ankle_l.p[0])} cm ahead, knee ≈${Math.round(F.kneeOf(Wb, 'l'))}°, hip ≈${Math.round(poses.bottom.ch.hip_l.flex)}°`);
set('Knee alignment', 'setup', 'Knee over the foot'); set('Knee alignment', 'peak', `Knee ${r1(kneeLine(Wb))} cm outside the foot axis (over the 2nd-3rd toe)`);
set('Tempo', 'setup', 'Balance 0.8 s'); set('Tempo', 'peak', '2.0 s down, 0.3 s pause, 1.2 s up, 1.2 s reset');
ex.exercise.reference.note = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
const c0 = com(Wt), c1 = com(Wb);
console.log(`Bodyweight Single Leg Squat: top ${JSON.stringify(poses.stand.root.pos)} bottom ${JSON.stringify(poses.bottom.root.pos)} com top ${c0.map(r1)} bottom ${c1.map(r1)} dorsi ${r1(dorsiOf(Wb, 'r'))} pole ${JSON.stringify(legR.pole)} hipR ${JSON.stringify(poses.bottom.ch.hip_r)} wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
