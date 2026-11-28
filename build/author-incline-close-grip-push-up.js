// Incline Close Grip Push-up (GymVisual #11882, page not readable; movement from the name): hands close together on the
// near edge of a 45 cm bench, inside shoulder width, feet on the balls on the floor, body in one line; lower the chest to
// the edge with the elbows tucked back along the ribs, then press away. Bilateral. Palms planted on the bench top (arm
// contacts, constant targets at bench height + palm), feet planted (leg contacts). Family b4-floorpush makePushG via b6-14.
const L = require('./lib');
const B = require('./families/b4-floorpush');
const X = require('./families/b6-14');
const meta = require('./meta/incline-close-grip-push-up.json');

const BENCH_H = 45, BENCH_W = 30, BENCH_L = 110;
const HAND_X = 30;     // wrists about under the lower chest at the top
const HAND_Z = 11;     // wrist |z|: 22 cm apart, inside the shoulder joints (|z| 18.9)
const EDGE_IN = 4;     // the bench's near edge sits this far behind the wrist joint
const BOT_CHEST = 4;   // bottom: chest this many cm above the bench top
const F = B.makePushG({ handY: BENCH_H, handZ: HAND_Z, ankleZ: 8, footTilt: 0, flarePole: [-1, 0.3, 0.35] });
const bench = { id: 'bench', kind: 'bench', center: [HAND_X - EDGE_IN + BENCH_W / 2, 0, 0], size: [BENCH_W, BENCH_H, BENCH_L] };
const T = X.T5(meta);
X.pushAuthor(meta, F, { handX: HAND_X, botChest: BOT_CHEST, T, props: [bench], sweepProps: [{ prop: bench, skip: /^(hand|thumb)_/ }],
  kin: (set, top, bot) => {
    X.pushKin(set, top, bot, { T, botNote: `chest ${BOT_CHEST} cm above the bench edge`, handNote: (s) => `Wrists ${2 * HAND_Z} cm apart on a ${BENCH_H} cm bench (shoulder joints ${Math.round(s.shW)} cm): about ${Math.round((100 * 2 * HAND_Z) / s.shW)}% of shoulder width` });
    set('Load on the hands', 'setup', `Hands ${BENCH_H} cm up: the body is inclined ${Math.round(top.bodyAng)}° above horizontal`); set('Load on the hands', 'peak', `${Math.round(bot.bodyAng)}° at the bottom`);
  } });
