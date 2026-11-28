// Incline Leg Hip Raise, legs straight (GymVisual #005063; page not readable here, movement from the name and standard
// coaching): lying head-up on a 25-degree incline (gear pack decline_bench), hands gripping the roller behind the head
// (planted), legs straight and just off the board. Raise the straight legs to vertical, then curl the hips off the board
// pushing the feet toward the ceiling; lower the hips, then the legs. Built by g3-benches.declineHeadUp. Bilateral.
const G = require('./families/g3-benches');
const meta = require('./meta/incline-leg-hip-raise-leg-straight.json');
const keys = [
  { name: 'low', thigh: 14, knee: 4, curl: 0, ankle: -15 },
  { name: 'l1', thigh: 40, knee: 4, curl: 0, ankle: -15 },
  { name: 'l2', thigh: 70, knee: 4, curl: 2, ankle: -15 },
  { name: 'vert', thigh: 98, knee: 4, curl: 8, ankle: -15 },
  { name: 'top', thigh: 115, knee: 4, curl: 26, ankle: -15 },
  { name: 'topHold', thigh: 116, knee: 4, curl: 27, ankle: -15 },
];
const kf = [['low', 0], ['low', 0.8], ['l1', 1.2], ['l2', 1.6], ['vert', 1.95], ['top', 2.4], ['topHold', 2.8], ['vert', 3.4], ['l2', 3.9], ['l1', 4.35], ['low', 4.8], ['low', 5.4]];
const rows = (set, poses, W, pr) => {
  set('Hip flexion', 'setup', G.dg(poses.low.ch.hip_r.flex) + ' (legs just off the board)'); set('Hip flexion', 'peak', G.dg(poses.topHold.ch.hip_r.flex) + ' with the hips lifted');
  set('Knee', 'setup', G.dg(poses.low.ch.knee_r.flex) + ' (straight)'); set('Knee', 'peak', G.dg(poses.topHold.ch.knee_r.flex));
  set('Pelvic curl', 'setup', 'Pelvis on the board'); set('Pelvic curl', 'peak', `Lumbar flexion +27°; buttocks up to ${Math.round(pr.lift[1])} cm off the board`);
};
module.exports = { ex: G.declineHeadUp(meta, { keys, kf, rows, reachX: 46 }) };
