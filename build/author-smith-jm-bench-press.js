// Smith JM Bench Press (GymVisual; movement reference only, the page could not be read): JM press on a flat bench in a Smith
// machine. Overhand grip a little inside shoulder width (34 cm between the bar grips). The rails run straight up and down
// over the top of the chest (7 cm toward the head from the shoulder joints), so the bar can only travel on that line: as the
// elbows bend, the elbows travel toward the feet (upper arms tilting to about 45-55 degrees from vertical, elbow target
// above the back plane) and the bar comes straight down to stop a few centimetres above the upper chest, then the elbows
// extend back to straight arms. Built with b5-bbpress.js lyingPress (vertical path, elbow target fading toward the top).
// Safety stops 2 cm under the bottom (well above the chest and neck). Bilateral.
const G = require('./families/gear-g3lower');
const F = require('./families/b5-bbpress');
G.smithPressAuthor('smith-jm-bench-press', { GW: 34, bottomDX: +(process.env.BDX ?? -7), flare: 10, dip: -45, touch: +(process.env.TOUCH ?? 7), settleDY: 0, foreW: 0.2, wristBot: -10, wristTop: -6, safetyDrop: 2, fix: 0.05, baseId: 'barbell-jm-bench-press', where: 'a few cm above the upper chest',
  edit: (ex, { Wb, set }) => { const h = F.clearHead(Wb); set('Bar path', 'peak', ex.exercise.kinematics.find((k) => k.measure === 'Bar path').peak + `; ${h.d.toFixed(1)} cm from the head / neck at the bottom`); } });
