// Dumbbell Spider Curl (GymVisual #993112): back pad set low (30 degrees). Lie chest-down high on the pad so the shoulders sit
// at the top edge and the upper arms hang straight down in front of it, balls of the feet planted behind the bench. Palms
// forward; both forearms curl about the elbow hinge to the top, where the load is highest with the upper arms vertical; short
// squeeze, slow lower. Bilateral. Built with the chest-on-pad curl builder (author-dumbbell-prone-incline-curl.js).
const build = require('./author-dumbbell-prone-incline-curl');
const ENV = (k, d) => +(process.env[k] ?? d);
build(require('./meta/dumbbell-spider-curl.json'), { label: 'Dumbbell Spider Curl', ang: 30, along: ENV('SA', 34), foot: [ENV('FX', -28), 24], hangOut: ENV('HO', 2), tgt: [ENV('TGX', 7), 0, 2], neck: ENV('NK', -18), head: ENV('HD', -18) });
