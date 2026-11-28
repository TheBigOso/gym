// Band Standing Hammer Curl (GymVisual #10728, Band Standing Hammer Curl; movement reference only, the page could not be
// read here, so the movement follows the name): standing tall on the middle of the band, feet about hip width (planted leg
// contacts), one band end under the ball of each foot (anchorJoint toe_r / toe_l), an end in each hand. Neutral grip
// (palms facing in, thumbs up) the whole way; both arms curl together with the elbows by the sides, short squeeze at the
// top where the band is most stretched, slow 2.4 s lower against the band. Arm path as the dumbbell hammer curl.
// Bilateral. Built with the standing band curl builder in build/families/b6-11.js.
const F = require('./families/b6-11');
const meta = require('./meta/band-standing-hammer-curl.json');

F.standingCurl(meta, {
  label: 'Band Standing Hammer Curl',
  BOT: { plane: 20, elev: 11, flex: 8, pron: 88 },
  TOP: { plane: 85, elev: 16, flex: 130, pron: 88 },
  tempo: ['Arms straight 0.6 s', '1.2 s up, 0.3 s squeeze, 2.4 s down, 0.9 s at the bottom'],
});
