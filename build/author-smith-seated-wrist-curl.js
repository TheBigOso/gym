// Smith Seated Wrist Curl (GymVisual; movement reference only, the page could not be read): the authored seated dumbbell
// wrist curl (sitting on the bench end, forearms along the thighs, palms up, wrists just past the knees, curling only at the
// wrists) done with the Smith bar in both hands (gear-g3lower.js smithify, mode 'arms'). The rail line is fitted to the
// hands' path (clamped to 8 degrees from vertical) and every dense key re-solves the arms so the hands' midpoint sits on the
// rails at a constant grip width; the forearms slide a little along the thighs (their axes stay 3-4.5 cm off the thigh
// surface, i.e. resting on it). Pegs under the top, safety stops under the bottom. Bilateral.
const G = require('./families/gear-g3lower');
const L = require('./lib');
const EQ = require('./families/equip');
G.smithAuthor('smith-seated-wrist-curl', 'dumbbell-wrist-curl', { mode: 'arms', hookDrop: 3, safetyDrop: 3,
  edit: (ex) => { let w = [1e9, -1e9]; for (const k of ex.keyframes) { const W = L.fk(ex.poses[k.pose], ex.contacts); for (let t = 0.2; t <= 0.81; t += 0.2) { const p = L.V.add(W.elbow_r.p, L.V.scale(L.V.sub(W.wrist_r.p, W.elbow_r.p), t)); const d = Math.min(EQ.pointShape(W, p, 'thigh_r'), EQ.pointShape(W, p, 'quad_r')); w = [Math.min(w[0], d), Math.max(w[1], d)]; } }
    const k = ex.exercise.kinematics.find((x) => x.measure.startsWith('Forearm on the thigh')); if (k) k.peak = `Forearm axis ${w[0].toFixed(1)}-${w[1].toFixed(1)} cm off the thigh surface over the loop (resting; slides a little with the rails)`; } });
