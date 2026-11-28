// Band Standing Reverse Curl (GymVisual #15511, Band Standing Reverse Curl; movement reference only, the page could not be
// read here, so the movement follows the name): standing tall on the middle of the band, feet about hip width (planted leg
// contacts), one band end under the ball of each foot (anchorJoint toe_r / toe_l). Overhand grip: palms facing back
// beside the thighs at the start, knuckles up at the top. Both arms curl together about elbows kept by the sides,
// knuckles leading and wrists straight; short squeeze at the top where the band is most stretched, slow 2.4 s lower.
// Bilateral. Built with the standing band curl builder in build/families/b6-11.js.
const F = require('./families/b6-11');
const meta = require('./meta/band-standing-reverse-curl.json');

F.standingCurl(meta, {
  label: 'Band Standing Reverse Curl',
  BOT: { plane: 20, elev: 11, flex: 9, pron: 165 },
  TOP: { plane: 85, elev: 16, flex: 124, pron: 174 },
  tempo: ['Arms straight 0.6 s', '1.2 s up, 0.3 s squeeze, 2.4 s down, 0.9 s at the bottom'],
});
