# 1 2 Stick Drill: research

Researched 2026-11-26 for issue #3 (Batch 1, exercise 1 of 10). Movement as drawn in GymVisual #596513: see `reference.md` in this folder.

**How to read the tags.** [trial evidence] means a controlled trial, systematic review or meta-analysis supports the claim. [clinical opinion] means it comes from coaching texts, professional articles or exercise libraries, not from a trial. Where a claim is our own design choice for the animation, it says so.

**Bottom line on evidence.** No study tests the "1 2 Stick Drill" by name. The closest studied category is agility ladder / speed-agility-quickness (SAQ) footwork training. That evidence is mixed and generally low certainty: the one systematic review of agility ladders calls claims of agility benefit premature, while broader SAQ meta-analyses (where ladders are one ingredient among sprints, cone drills and plyometrics) find moderate gains with wide uncertainty. No study found measures joint angles, ground contact times or muscle activity for this drill or a lateral ladder pattern, so every posture norm, muscle list and coaching cue below is [clinical opinion].

**Naming caution.** One exercise library (Fitwill) describes a different movement under the same name: a boxing-stance step to a marker followed by a held landing (the "stick"). Our animation follows the GymVisual reference instead: continuous lateral quick feet, two contacts per gap. The Human Kinetics "Lateral Shuffle and Stick" drill is also different (a shuffle between two cones 5-10 yards apart that ends in a held finish position). Video agents should confirm the GymVisual pattern.

## Exercise card

| Field | Value |
|---|---|
| Type | Agility / quick-feet footwork (GymVisual data sheet: "Plyometrics", exercise type "Aerobic") |
| Body part | Lower body (calves, quadriceps); secondary hips and core |
| Equipment | 5-6 low sticks, flat markers, cones or an agility ladder laid flat; body weight |
| Difficulty | Beginner to intermediate (beginner at slow tempo; intermediate at full speed) |
| Mechanics | Compound, low-amplitude, rapid ground contacts |
| Plane | Frontal (lateral travel) |
| Laterality | Bilateral, alternating feet; lead with the right going one way, the left coming back |

### Muscles

All [clinical opinion]: no EMG study of this drill or of lateral ladder footwork was found. GymVisual highlights quadriceps and calves; Fitwill lists calves, quads, glutes, hips and core.

- **Target:** calves (gastrocnemius and soleus: quick, springy push-offs from the balls of the feet); quadriceps (hold the quarter-squat stance and absorb each landing).
- **Synergists:** gluteus medius and minimus (push the body sideways and keep the pelvis level on each single-leg contact); hip adductors (pull the trail foot in); gluteus maximus and hamstrings (support the hip-hinged athletic stance).
- **Stabilizers:** core (trunk stays square and still while the feet move); foot and ankle stabilizers (peroneals, tibialis anterior and posterior) for side-to-side ankle control; shoulders and upper back lightly, to hold the hands at the chest.

Note for the integrate agent: `src/rig.json` currently defines only trunk, shoulder and gluteus medius muscle regions; quadriceps, calves, adductors, hamstrings and gluteus maximus would need new regions to highlight this drill.

### Posture and joint-angle norms

| Measure | Norm | Evidence |
|---|---|---|
| Stance | Athletic stance: feet about hip-width, knees and hips softly bent, trunk slightly forward, chest up | [clinical opinion] GymVisual reference; Fitwill ("knees slightly bent, chest tall") |
| Hips | "Keep the hips low"; hips, shoulders and torso stay parallel to the line of markers | [clinical opinion] Dawes, Human Kinetics |
| Knees | Knees track over the toes; do not let the lead knee cave inward | [clinical opinion] Fitwill |
| Knee and hip flexion angles | No published norm found for this drill. Animation target (our design estimate, unsourced): quarter squat, roughly 30-45 degrees knee flexion and a similar hip hinge, held nearly constant | none |
| Feet | Light, quick contacts on the balls of the feet; feet never cross | [clinical opinion] GymVisual reference; Fitwill |
| Ground contact time | Not measured in any study found. Coaching intent is "as short as possible while staying controlled" | none; evidence gap |
| Head and trunk | Head level (no bobbing), eyes forward, shoulders not leaning toward the direction of travel | [clinical opinion] Fitwill |
| Arms | Reference holds hands clasped at the chest; other agility sources cue arm pumping instead | [clinical opinion] GymVisual reference; NFL Flag |
| Marker spacing | Reference shows about 30-40 cm between markers (our estimate from the GIF). Spacing should allow the same stance width on every contact | [clinical opinion] reference.md; Fitwill |

### Breathing

Breathe rhythmically and do not hold the breath; each bout is short (a few seconds), so steady, relaxed breathing is enough. Fitwill cues breathing out as you step. [clinical opinion]

### Prescription

- **Bout length:** 2-5 s of work per rep (one pass down the row), 4-8 reps, with enough rest to keep quality high. [clinical opinion] Dawes, Human Kinetics (agility work-to-rest guidance).
- **Rest:** full recovery between reps; quality and speed drop when fatigued. As an app default (our design estimate), use about 30-60 s between passes. [clinical opinion]
- **Sets:** 2-4 sets of 4-6 passes (alternating lead direction) as a warm-up or speed block. Our design estimate, consistent with the 4-8 rep guidance above. [clinical opinion]
- **Frequency and duration:** ladder-based programs in trials ran 2-3 sessions per week for 6-10 weeks, often as 10 minutes of the warm-up. [trial evidence] (Padrón-Cabo 2020; González-Fernández 2021). For agility training in general, a 2026 meta-analysis found effects clustered around 7-8 weeks, more than 3 sessions per week and 20-25 minutes per session. [trial evidence] (Zhao 2026), but these figures are not ladder-specific.

### Step-by-step cues

1. **Set up:** stand at one end of the row, side-on to it, in an athletic stance: feet hip-width, quarter squat, chest up, hands at the chest.
2. **Lead foot in:** step the lead foot quickly over the first marker into the first gap, landing on the ball of the foot.
3. **Trail foot follows:** bring the trail foot in right behind it: "1-2", two quick contacts per gap.
4. **Repeat down the row:** keep the same rhythm through every gap without crossing the feet.
5. **Stay low and square:** hips stay at the same height and face forward; head stays level.
6. **Light and quiet:** quick, quiet contacts; pick the feet up just enough to clear the sticks.
7. **Reverse:** at the end, stop under control, then come back leading with the other foot.

### Common mistakes and fixes

| Mistake | Fix |
|---|---|
| Crossing the feet or reaching with long steps | Short, quick steps; the trail foot meets the lead foot, never passes it. [clinical opinion] Fitwill |
| Standing up tall or bobbing the head | Hold the quarter squat; the head moves sideways only, not up and down. [clinical opinion] Fitwill; Dawes |
| Heavy, flat-footed, loud landings | Land softly on the balls of the feet; aim for quiet contacts. [clinical opinion] Fitwill |
| Knee caving inward on contact | Knee tracks over the toes; slow down until it does. [clinical opinion] Fitwill |
| Leaning the shoulders toward the direction of travel | Keep hips, shoulders and torso parallel to the row; move the feet, not the trunk. [clinical opinion] Dawes; Fitwill |
| Looking down at the sticks | Glance at the row first, then eyes forward and use peripheral vision. [clinical opinion] |
| Going faster than control allows (kicking sticks, missed contacts) | Master the pattern slowly first, then add speed. [clinical opinion] Fitwill |

### Safety and who should modify

- Low-load drill, but it involves rapid ankle and knee loading in a sideways direction. [clinical opinion]
- **Modify or check with a clinician:** recent ankle sprain or chronic ankle instability, knee pain or recent knee ligament injury, Achilles or calf pain, balance problems, late pregnancy. Start with slow walking-tempo steps, wider spacing or flat markers instead of sticks. [clinical opinion]
- **Surface:** use flat, non-slip ground and flat markers or sticks that will not roll underfoot. [clinical opinion]
- **Fatigue:** stop a set when contacts get heavy or the pattern breaks down; quality matters more than volume. [clinical opinion] Dawes
- No study found reports injuries from agility ladder or quick-feet drills; injury risk has simply not been studied. [evidence gap]

## 1. Scientific studies

Ladder and footwork-specific:

- [The Effects of Agility Ladders on Performance: A Systematic Review (Int J Sports Med, 2020;41(11):720-728)](https://www.thieme-connect.de/products/ejournals/html/10.1055/a-1157-9078). Only 5 randomized trials (4-8 weeks); protocols poorly described. Concludes that claims ladders improve agility are "premature". [trial evidence]
- [Same review, record with abstract (BVS / MEDLINE, PMID 32396965)](https://pesquisa.bvsalud.org/saudepublica/resource/pt/mdl-32396965)
- [Padrón-Cabo et al. 2020, Effects of Training with an Agility Ladder on Sprint, Agility, and Dribbling Performance in Youth Soccer Players (J Hum Kinet)](https://johk.pl/?p=5609). 18 boys about 12 years old, 3 sessions per week for 6 weeks. Ladder group did no better than controls on any test. [trial evidence]
- [Same study (PMC full text, PMC7386157)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7386157). Full text, including drills table; the page was behind a browser check during this research, so details were read from the journal page above.
- [Padrón-Cabo et al. 2021, Effects of Plyometric Training with Agility Ladder on Physical Fitness in Youth Soccer Players (Int J Sports Med 42(10):896-904)](https://portalcientifico.uvigo.gal/documentos/60e6a3544edb8e25f92cf20b?lang=eu). Bibliographic record only; the abstract could not be retrieved, so no results are reported here.
- [González-Fernández et al. 2021, 10-week combined coordination and agility program in young male soccer players (IJERPH 18:10125, open PDF)](https://core.ac.uk/download/479173474.pdf). 40 U16 players; 10-minute warm-up circuit including lateral ladder drills. Improved jump and Illinois agility time but not 30 m sprint. Ladder was mixed with jumps and soccer drills, so its own effect is unknown. [trial evidence]
- [Effects of Agility Training on Skill-Related Physical Capabilities in Young Volleyball Players (Applied Sciences, 2022; DOAJ record)](https://doaj.org/article/c9412646ca4440c2b69b9ad50fb4ee63). 27 young female players, 6 weeks; agility-ladder and shuttle-run groups both improved on sprint and agility tests, and both beat controls on 10 m sprint. Small groups (n = 9). [trial evidence]
- [Ilham et al. 2024, ladder drill (snake jump) plus core stability vs cone drill in futsal players (Retos 58)](https://dialnet.unirioja.es/descarga/articulo/9634913.pdf). 20 players, 6 weeks; both groups improved Illinois agility. Very small groups (n = 5) and internal inconsistencies in the paper. [trial evidence, weak]

Broader SAQ and agility training (ladders are one component):

- [Li et al. 2026, Performance adaptations to speed, agility, and quickness training in team-sport athletes: meta-analysis (Front Physiol)](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2026.1947365/full). 16 RCTs: agility g = 0.77, sprint g = 0.53. Prediction intervals include zero; certainty low to very low. [trial evidence]
- [Niu et al. 2025, Effects of SAQ, HIIT, and SSG Training on Sprint and COD Performance in Soccer Players: network meta-analysis (Kinesiology 57(2))](https://hrcak.srce.hr/file/493620). 23 trials; SAQ ranked best for sprint and improved change of direction vs control. Describes ladder footwork as a way to raise step frequency. [trial evidence]
- [Lee, Lee and Ahn 2024, SAQ training in U-20 female football players (PLOS ONE 19(3):e0299204)](https://eprints.bournemouth.ac.uk/39612/3/journal.pone.0299204.pdf). 19 players, 8 weeks with speed and agility ladders among other drills; improved 20-30 m sprint and change of direction more than regular training. Nonequivalent control group. [trial evidence]
- [Zhao, Liu and Xu 2026, Optimizing agility training in team sport players: perception-action coupling meta-analysis (J Sports Sci Med 25(1):84-111)](https://www.jssm.org/jssm-25-84.xml-abst). 28 studies; agility training improved pre-planned (g = 0.55) and reactive agility (g = 0.65). Dose clustered around 7-8 weeks and more than 3 sessions per week. Not ladder-specific. [trial evidence]
- [Lennemann et al. 2013, The influence of agility training on physiological and cognitive performance (J Strength Cond Res 27(12):3300-9)](https://pubmed.ncbi.nlm.nih.gov/23442271/). RCT, 41 military trainees, 6 weeks; agility training matched or beat standard PT, improving VO2max and Illinois agility. [trial evidence]

Gaps: no study measures joint angles, ground contact time, foot contacts per gap or muscle activity for lateral stick or ladder footwork, and none reports injury outcomes. The pre-planned nature of the drill also matters: reviews separate pre-planned change of direction from reactive agility, and a closed footwork drill trains only the former. [trial evidence, indirect]

## 2. Clinical and professional articles

- [Human Kinetics Blog, Agility drills for football (adapted from Dawes, Developing Agility and Quickness, 2nd ed.)](https://humankinetics.me/2019/03/19/agility-drills-for-football/amp/). Source of the "hips low, square to the line" stance cues and the 2-5 s work, 4-8 rep guidance. Describes the related "Lateral Shuffle and Stick" drill. [clinical opinion]
- [NSCA, Kinetic Select excerpt on lacrosse agility (from Developing Agility and Quickness)](https://www.nsca.com/education/articles/kinetic-select/lacrosse/). Suggests adding an auditory or visual cue to make closed drills reactive, and simplifying when technique breaks down. [clinical opinion]
- [Physiopedia, Agility](https://www.physio-pedia.com/Agility). Defines agility vs change-of-direction speed vs quickness; a stick drill trains quickness and footwork, not reactive agility. [clinical opinion]
- [Fitwill, 1 2 Stick Drill](https://fitwill.app/exercise/5965/1-2-stick-drill/). Same name, different (boxing, step-and-hold) interpretation; useful for its posture cues and mistakes list (knee over toes, no bouncing, feet never cross). [clinical opinion]
- [NFL Flag, Football agility drills](https://nflflag.com/football-drills/football-agility-drills). Related quick-feet drills (foot fire, lateral box); cues to stay low with bent knees. [clinical opinion]
