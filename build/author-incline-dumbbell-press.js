// Incline Dumbbell Press (GymVisual #031412): back pad at 30 degrees (the angle that gave the highest upper-pectoralis
// activity in Rodríguez-Ridao 2020), seat flat, glutes in the crease, upper back and head on the pad, feet planted (leg
// contacts). Same press as the flat version over the upper chest: elbows about 55 degrees from the trunk with the forearms
// vertical at the bottom, arms vertical over the shoulders at the top. Bilateral. Shared press builder in the flat author.
const press = require('./author-dumbbell-bench-press');
press(require('./meta/incline-dumbbell-press.json'), { angle: 30, dip: 12, label: 'Incline Dumbbell Press' });
