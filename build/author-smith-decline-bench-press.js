// Smith Decline Bench Press (GymVisual; movement reference only, the page could not be read): bench press on a 20-degree
// decline bench (gear pack decline_bench) in a Smith machine. Lying with the head at the low end, knees bent about 90
// degrees with the feet hooked under the ankle roller near the high end (planted contacts), shoulder blades drawn back.
// The lying base is authored flat (b4-core2.js lie, core-a.js plantFeet) and moved onto the board with
// gear-benches.boardFrame; the roller is fitted over the insteps. The vertical Smith rails run through the touch point on
// the lower chest (10 cm toward the feet from the shoulder joints along the board): the bar comes straight down to rest on
// the chest and goes straight back up to nearly straight arms. Grip 78 cm between the bar grips, elbows about 55 degrees
// from the trunk at the bottom (soft target fading toward the top). Keys from bottom to top (b5-bbpress.js refine),
// densified onto the rail line (gear-g3lower.js railFix). Pegs under the top, safety stops under the chest. Bilateral.
const L = require('./lib');
const { R, V, r1, clone } = L;
const CA = require('./families/core-a');
const M = require('./families/b4-core2');
const GB = require('./families/gear-benches');
const C = require('./families/b3-chest');
const BB = require('./families/barbell');
const SG = require('./families/gear-smith');
const H = require('./families/hips');
const F = require('./families/b5-bbpress');
const G = require('./families/gear-g3lower');
const meta = require('./meta/smith-decline-bench-press.json');

const ANGLE = 20, ANK_X = -26, KNEE = 88, GW = 78, DX = 10, FLARE = 55, DIP = 30;
const lie0 = M.lie({ kneeFlex: 90, headRest: 'none' });
lie0.ch.sc_r = { protract: -6, elevate: -2 }; lie0.ch.sc_l = clone(lie0.ch.sc_r);
const FP = CA.plantFeet(lie0, KNEE);
const dx = ANK_X - FP.targets.r[0];
const flat = clone(FP.pose); flat.root.pos[0] = r1(flat.root.pos[0] + dx); for (const k in flat.ik) flat.ik[k].target[0] = r1(flat.ik[k].target[0] + dx);
const benchAt = (rollerAt, rollerUp) => GB.declineBench({ x: 0, params: { angle: ANGLE, rollerAt, rollerUp } });
const frame = GB.boardFrame(benchAt(10, 13)), contacts = frame.contacts(FP.contacts), base = frame.pose(flat);
const W0 = L.fk(base, contacts);
const rollerAt = r1(-(ANK_X + 7));
const footGap = (db) => GB.bodyClear(W0, db, { skip: /^(?!foot_|toe|shank_|calf_)/, parts: /^pad[5-7]$/ }).d;
let lo = 6, hi = 24; for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; if (footGap(benchAt(rollerAt, m)) >= 0.3) hi = m; else lo = m; }
const db = benchAt(rollerAt, r1(hi + 0.05));
// rail through the lower chest: DX cm toward the feet from the shoulder joints along the board
const S = W0.shoulder_r.p, Fr = C.trunkFrame(W0), along = V.norm(V.sub(W0.pelvis.p, W0.neck_c7.p));
const RAIL_X = r1(S[0] + along[0] * DX), sm0 = SG.smith({ x: RAIL_X });
const yb = r1(BB.chestTop(W0, RAIL_X) + 0.3);
const PALM = V.norm([1, 0.6, 0]), THUMB = [0, 0, -1], SEEDS = F.SEEDS;
let gripWorst = 0;
const arm = (y, f, seed) => {
  const E = V.add(S, V.scale(C.upperArmDir(Fr, FLARE, DIP), L.UA));
  const q = SG.armsOnSmith(base, sm0, y, GW, { palm: PALM, thumb: THUMB, dirW: 0.4, wristW: 0.01, guesses: seed ? [seed] : SEEDS, elbow: f < 1 ? E : null, elbowW: 0.5 * (1 - f) });
  gripWorst = Math.max(gripWorst, BB.gripErr(L.fk(q, contacts), SG.grips(sm0, y, GW))); delete q.__cost; return q;
};
let ta = yb + 20, tb = yb + 70; for (let i = 0; i < 24; i++) { const y = (ta + tb) / 2, q = SG.armsOnSmith(base, sm0, y, GW, { palm: PALM, thumb: THUMB, dirW: 0.4, wristW: 0.01, guesses: SEEDS }); if (BB.gripErr(L.fk(q, contacts), SG.grips(sm0, y, GW)) < 0.1 && q.ch.elbow_r.flex > 8) ta = y; else tb = y; }
const yt = r1(ta);
const path = F.refine((f, prev) => F.strip(arm(yb + (yt - yb) * f, f, prev && F.seedOf(prev))), 16, GW, contacts);
const settle = F.strip(arm(yb - 0.2, 0, F.seedOf(path[0].pose)));
const T = C.phaseT(meta), { poses, keyframes } = F.repKeysF(path, T, settle);
const ex = H.module_(meta, contacts, poses, keyframes);
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts);
G.railFix(ex, { x0: RAIL_X, slope: 0, z: 0, width: GW }, 'arms', 0.05);
const HOOK_Y = Math.round(yt - 5), SAFETY_Y = Math.floor(yb - 4);
const sm = SG.smith({ x: RAIL_X, hookY: HOOK_Y, safetyY: SAFETY_Y, restY: HOOK_Y });
ex.props = [db.prop, ...sm.props];
const sw = SG.sweep(ex, sm, { planted: ['leg_r', 'leg_l'] });
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Bench angle', 'setup', `${ANGLE}° decline, head at the low end`); set('Bench angle', 'peak', 'Upper back and head on the board (rig shapes)');
set('Grip width', 'setup', `${GW} cm between the bar grips (≈${(GW / (2 * S[2])).toFixed(1)}x the shoulder-joint width)`); set('Grip width', 'peak', `Constant (${sw.width[0]}-${sw.width[1]} cm over the loop)`);
set('Elbow flexion', 'setup', `${d(BB.elbowOf(Wt, 'r'))} at the top`); set('Elbow flexion', 'peak', `${d(BB.elbowOf(Wb, 'r'))} with the bar on the chest`);
set('Elbow flare', 'setup', 'Arms reaching up to the bar'); set('Elbow flare', 'peak', `${d(C.elbowFlare(Wb))} from the trunk at the bottom`);
set('Bar path', 'setup', `Vertical rails through the lower chest; top ${r1(yt)} cm high`); set('Bar path', 'peak', `Bar on the chest at ${r1(yb)} cm; ${r1(yt - yb)} cm of travel`);
set('Legs', 'setup', `Knees ${d(CA.kneeOf(W0, 'r'))}, feet under the roller`); set('Legs', 'peak', 'Unchanged (feet planted)');
set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s touch, ${r1(T.r - T.p)} s up`);
const tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]); ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
console.log(`Smith Decline Bench Press: wrote ${L.write(ex)}\n  rail x ${RAIL_X} bar ${yb} -> ${yt} gripErr ${gripWorst.toFixed(2)} keys ${Object.keys(ex.poses).length} roller up ${db.prop.params.rollerUp} bottom elbow ${BB.elbowOf(Wb, 'r').toFixed(0)} flare ${C.elbowFlare(Wb).toFixed(0)}\n  sweep ${JSON.stringify(sw)}`);
SG.fail(sw);
if (gripWorst > 0.5) { console.error('FAIL: hands off the bar'); process.exitCode = 1; }
