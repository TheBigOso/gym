// Deep Push-Up (GymVisual #9292, page not readable; movement from the name): a deficit push-up with each hand on a low
// block (15 cm), a little wider than the shoulders, feet on the balls on the floor, body in one line. The chest sinks
// between the blocks below hand level (a longer stretch across the chest than a floor push-up), then presses up.
// Bilateral. Palms planted on the block tops (arm contacts, constant targets), feet planted (leg contacts).
const L = require('./lib');
const B = require('./families/b4-floorpush');
const X = require('./families/b6-14');
const meta = require('./meta/deep-push-up.json');

const BLOCK_H = 15, BLOCK = [22, 16];   // block height; size along x and z (cm)
const HAND_X = 46, HAND_Z = 33;         // wrists under the shoulders at the top, 66 cm apart (shoulder joints 38 cm): wide, so the chest fits between
const BOT_CHEST = -3;                   // bottom: chest 3 cm below the block tops (12 cm above the floor)
const F = B.makePushG({ handY: BLOCK_H, handZ: HAND_Z, ankleZ: 8, footTilt: -6, flarePole: [-1, 0.4, 0.55] });
const blocks = ['r', 'l'].map((s) => ({ id: `block_${s}`, kind: 'box', center: [HAND_X + 3, 0, s === 'r' ? HAND_Z : -HAND_Z], size: [BLOCK[0], BLOCK_H, BLOCK[1]] }));
const T = X.T5(meta);
X.pushAuthor(meta, F, { handX: HAND_X, botChest: BOT_CHEST, T, props: blocks, sweepProps: blocks.map((prop) => ({ prop, skip: /^(hand|thumb)_/ })),
  kin: (set, top, bot) => {
    X.pushKin(set, top, bot, { T, botNote: `chest ${-BOT_CHEST} cm below the block tops`, handNote: (s) => `Wrists ${2 * HAND_Z} cm apart on ${BLOCK_H} cm blocks (shoulder joints ${Math.round(s.shW)} cm): about ${Math.round((100 * 2 * HAND_Z) / s.shW)}% of shoulder width` });
    set('Depth below the hands', 'setup', `Chest ${Math.round(top.chestY - BLOCK_H)} cm above the block tops`); set('Depth below the hands', 'peak', `Chest ${-BOT_CHEST} cm below the block tops (${Math.round(BLOCK_H + BOT_CHEST)} cm above the floor)`);
  } });
