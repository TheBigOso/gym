// Decline Bent Leg Reverse Crunch (GymVisual #005140; page not readable here, movement from the name and standard
// coaching): lying head-up on a 25-degree decline bench (gear pack decline_bench), hands gripping the ankle roller behind
// the head (planted), hips and knees bent about 90 degrees. Curl the pelvis off the board, knees toward the chest, upper
// back on the board; roll back down. Built by g3-benches.declineHeadUp. Bilateral.
const G = require('./families/g3-benches');
const meta = require('./meta/decline-bent-leg-reverse-crunch.json');
const keys = [
  { name: 'start', thigh: 88, knee: 92, curl: 0 },
  { name: 'u1', thigh: 100, knee: 95, curl: 8 },
  { name: 'u2', thigh: 112, knee: 98, curl: 18 },
  { name: 'top', thigh: 122, knee: 100, curl: 28 },
  { name: 'topHold', thigh: 123, knee: 100, curl: 29 },
];
const kf = [['start', 0], ['start', 0.8], ['u1', 1.3], ['u2', 1.75], ['top', 2.2], ['topHold', 2.6], ['u2', 3.3], ['u1', 3.9], ['start', 4.4], ['start', 5.0]];
const rows = (set, poses, W, pr) => {
  set('Hip flexion', 'setup', G.dg(poses.start.ch.hip_r.flex) + ' (thighs about vertical)'); set('Hip flexion', 'peak', G.dg(poses.topHold.ch.hip_r.flex) + ' (knees toward the chest)');
  set('Knee', 'setup', G.dg(poses.start.ch.knee_r.flex)); set('Knee', 'peak', G.dg(poses.topHold.ch.knee_r.flex));
  set('Pelvic curl', 'setup', 'Pelvis on the board'); set('Pelvic curl', 'peak', `Lumbar flexion +29°; buttocks up to ${Math.round(pr.lift[1])} cm off the board`);
};
module.exports = { ex: G.declineHeadUp(meta, { keys, kf, rows, reachX: 46 }) };
