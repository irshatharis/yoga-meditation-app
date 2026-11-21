import {
  poseId,
  practiceId,
  type BreathPattern,
  type FlowStep,
  type PoseItem,
  type Practice,
  type PracticeItem,
  type RestItem,
  type TimedText
} from '../domain/types'
import type { BuiltinPoseId } from './pose-ids'

const hold = (pose: BuiltinPoseId, holdSec: number, cue?: string): PoseItem =>
  cue ? { type: 'pose', pose: poseId(pose), holdSec, cue } : { type: 'pose', pose: poseId(pose), holdSec }

const step = (pose: BuiltinPoseId, breaths: number, cue: string): FlowStep => ({ pose: poseId(pose), breaths, cue })

const rest = (title: string, durationSec: number, text: string, pose?: BuiltinPoseId): RestItem =>
  pose ? { type: 'rest', title, durationSec, text, pose: poseId(pose) } : { type: 'rest', title, durationSec, text }

// Scripts are written as "m:ss" marks so they read like a timed transcript.
const script = (...lines: [string, string][]): TimedText[] =>
  lines.map(([mark, text]) => {
    const [m = 0, s = 0] = mark.split(':').map(Number)
    return { at: m * 60 + s, text }
  })

const sit = (title: string, durationSec: number, intro: string, guidance: TimedText[], posture: BuiltinPoseId = 'easy-seat'): PracticeItem => ({
  type: 'sit',
  title,
  durationSec,
  intro,
  guidance,
  posture: poseId(posture)
})

const breath = (title: string, pattern: BreathPattern, cycles: number, intro: string, guidedCycles = 3): PracticeItem => ({
  type: 'breath',
  title,
  pattern,
  cycles,
  intro,
  guidedCycles,
  posture: poseId('easy-seat')
})

const catCow = (rounds: number, breathSec = 5): PracticeItem => ({
  type: 'flow',
  title: 'Cat and cow',
  rounds,
  breathSec,
  alternate: false,
  steps: [
    step('cow', 1, 'Breathe in, drop the belly and lift your gaze.'),
    step('cat', 1, 'Breathe out, round your back and tuck your chin.')
  ]
})

const SUN_A: FlowStep[] = [
  step('upward-salute', 1, 'Breathe in, sweep your arms up.'),
  step('standing-forward-fold', 1, 'Breathe out, fold forward.'),
  step('halfway-lift', 1, 'Breathe in, lengthen halfway up.'),
  step('plank', 1, 'Breathe out, step back to plank.'),
  step('chaturanga', 1, 'Lower slowly, knees down if you like.'),
  step('upward-dog', 1, 'Breathe in, lift into upward dog.'),
  step('downward-dog', 5, 'Breathe out, downward dog. Stay for five breaths.'),
  step('halfway-lift', 1, 'Step to your hands. Breathe in, halfway lift.'),
  step('standing-forward-fold', 1, 'Breathe out, fold.'),
  step('upward-salute', 1, 'Breathe in, rise all the way up.'),
  step('mountain', 1, 'Breathe out, hands to heart.')
]

// The timeline gives a round one lead side, so each round here is half of a
// traditional Surya Namaskar B: warrior one on the right, then the left next round.
const SUN_B: FlowStep[] = [
  step('chair', 1, 'Breathe in, bend your knees and reach up.'),
  step('standing-forward-fold', 1, 'Breathe out, fold forward.'),
  step('halfway-lift', 1, 'Breathe in, lengthen halfway up.'),
  step('plank', 1, 'Breathe out, step back to plank.'),
  step('chaturanga', 1, 'Lower slowly, knees down if you like.'),
  step('upward-dog', 1, 'Breathe in, upward dog.'),
  step('downward-dog', 1, 'Breathe out, downward dog.'),
  step('warrior-1', 2, 'Step one foot forward and rise into warrior one.'),
  step('plank', 1, 'Hands down, step back to plank.'),
  step('chaturanga', 1, 'Lower slowly.'),
  step('upward-dog', 1, 'Breathe in, upward dog.'),
  step('downward-dog', 3, 'Breathe out, downward dog. Stay for three breaths.'),
  step('halfway-lift', 1, 'Step to your hands. Breathe in, halfway lift.'),
  step('standing-forward-fold', 1, 'Breathe out, fold.'),
  step('chair', 1, 'Breathe in, sink into chair and reach up.'),
  step('mountain', 1, 'Breathe out, stand tall, hands to heart.')
]

const sunA = (rounds: number): PracticeItem => ({ type: 'flow', title: 'Sun salutation A', rounds, breathSec: 4, alternate: false, steps: SUN_A })
const sunB = (rounds: number): PracticeItem => ({ type: 'flow', title: 'Sun salutation B', rounds, breathSec: 4, alternate: true, steps: SUN_B })

const arriveStanding = rest('Arrive', 30, 'Stand with your feet hip-width apart and your arms by your sides. Take a few full breaths and feel the ground under you.', 'mountain')

const finalRest = (durationSec: number, text = 'Let your whole body be heavy. Let the breath be natural. There is nothing left to do.') =>
  rest('Final rest', durationSec, text, 'corpse')

const yoga: Practice[] = [
  {
    id: practiceId('morning-flow'),
    title: 'Morning flow',
    summary: 'Your own gentle full-body morning sequence.',
    description:
      'A slow, complete morning practice. It warms the spine, leaves three minutes for sun salutations done your own way, then opens the hips and wakes up the legs before a short rest. Every pose has a gentler option, so take it whenever you need it.',
    kind: 'yoga',
    level: 'gentle',
    focus: ['hips', 'spine', 'legs'],
    origin: 'builtin',
    items: [
      hold('child', 30, 'Rest your hips toward your heels. Let your forehead soften toward the mat. Breathe slowly and comfortably.'),
      catCow(6),
      rest(
        'Sun salutation',
        180,
        'Move through your own sun salutations, whichever kind you like, at your own pace. Tap next when you are done, or add time if you want more rounds.',
        'upward-salute'
      ),
      hold('warrior-2', 30, 'Bend your front knee gently and extend your arms. Keep the knee tracking toward your toes.'),
      hold('warrior-1', 30, 'Use a wall or chair for balance if you like. Keep the stance short, and your hips and lower back comfortable.'),
      hold('low-lunge', 30, 'Lower your back knee onto a cushion if that helps. Shift forward gently, without forcing the hip.'),
      hold('bound-angle', 45, 'Bring the soles of your feet together. Let your knees relax without pushing them down.'),
      hold('pigeon', 30, 'Set up gently and keep the front knee comfortable. If the knee feels pressure, lie back into a figure four instead.'),
      hold('garland', 30, 'Sit on a block or a sturdy support. Keep your heels supported if they do not reach the floor.'),
      hold('side-lying-leg-raise', 45, 'Lift the top leg with your toes pointing forward. Keep your pelvis steady. Quality matters more than height.'),
      hold('bridge', 60, 'Press through your feet and lift your hips. Avoid over-arching your lower back. Lift and lower with control, resting between.'),
      hold('knees-to-chest', 40, 'Draw your knees gently toward your chest and let your lower back relax.'),
      finalRest(120, 'Lie comfortably and let your body settle. Allow your breathing to return to normal.')
    ]
  },
  {
    id: practiceId('sun-salutation-a'),
    title: 'Sun salutation A',
    summary: 'Five rounds of the classic sequence, one movement per breath.',
    description:
      'The classic warm-up of many yoga styles, linking eleven movements to the rhythm of the breath. Five rounds build heat and wake up the whole body. Lower to the knees in any round, and let the breath set the pace rather than the voice.',
    kind: 'yoga',
    level: 'moderate',
    focus: ['spine', 'hamstrings', 'shoulders', 'core'],
    origin: 'builtin',
    credit: 'Traditional Surya Namaskar A',
    items: [arriveStanding, sunA(5), rest('Stand still', 30, 'Stand with your eyes closed. Feel your heartbeat and the warmth in your body.', 'mountain')]
  },
  {
    id: practiceId('sun-salutation-b'),
    title: 'Sun salutation B',
    summary: 'Chair and warrior one join the flow for more heat and strength.',
    description:
      'The stronger sibling of sun salutation A, adding chair pose and warrior one. Each round leads with one side, so the six rounds alternate right and left. Expect your legs and breath to work.',
    kind: 'yoga',
    level: 'strong',
    focus: ['legs', 'shoulders', 'core'],
    origin: 'builtin',
    credit: 'Traditional Surya Namaskar B',
    items: [arriveStanding, sunB(6), rest('Stand still', 30, 'Let your arms hang and your breath slow down. Notice the strength in your legs.', 'mountain')]
  },
  {
    id: practiceId('gentle-wake-up'),
    title: 'Gentle wake-up',
    summary: 'Ten easy minutes to go from lying down to standing tall.',
    description:
      'Start on your back and finish on your feet. Slow twists, a little cat and cow, and a few reaches loosen the stiffness of the night without asking too much. A kind way to begin any day.',
    kind: 'yoga',
    level: 'gentle',
    focus: ['spine', 'back', 'hamstrings'],
    origin: 'builtin',
    items: [
      hold('knees-to-chest', 40, 'Hug your knees in and rock gently from side to side.'),
      hold('supine-twist', 30),
      catCow(5),
      hold('thread-the-needle', 30),
      hold('child', 30),
      hold('downward-dog', 30, 'Pedal your feet slowly to wake up the backs of the legs.'),
      hold('low-lunge', 30),
      hold('standing-forward-fold', 30, 'Bend your knees generously and let your head hang heavy.'),
      {
        type: 'flow',
        title: 'Reach and fold',
        rounds: 3,
        breathSec: 5,
        alternate: false,
        steps: [step('upward-salute', 1, 'Breathe in, reach up.'), step('standing-forward-fold', 1, 'Breathe out, fold.')]
      },
      hold('standing-side-bend', 20),
      hold('mountain', 30, 'Stand tall and take three full breaths. Notice how awake you feel.')
    ]
  },
  {
    id: practiceId('beginner-foundations'),
    title: 'Beginner foundations',
    summary: 'The essential poses, taught slowly, for your first time on the mat.',
    description:
      'A first class at home. You will meet the poses that most yoga is built from, with time to find each one before moving on. Bend your knees, use a wall, and rest whenever you like. Nothing here needs to look a certain way.',
    kind: 'yoga',
    level: 'gentle',
    focus: ['legs', 'spine', 'balance'],
    origin: 'builtin',
    items: [
      rest('Arrive', 60, 'Sit comfortably and close your eyes. Take a few slow breaths and arrive on your mat.', 'easy-seat'),
      catCow(5),
      hold('child', 30),
      hold('downward-dog', 30, 'Bend your knees as much as you need. A long spine matters more than straight legs.'),
      hold('mountain', 30, 'Feet hip-width apart, weight even. This simple pose is the root of every standing pose.'),
      hold('upward-salute', 20),
      hold('standing-forward-fold', 30),
      hold('chair', 20),
      hold('warrior-2', 30),
      hold('triangle', 30, 'Rest your bottom hand on your shin or a block. Height is not the goal.'),
      hold('tree', 20, 'Rest your foot on your ankle or calf if that is steadier. Avoid pressing on the knee.'),
      hold('cobra', 20, 'Keep it low. Press the tops of your feet down and let your back do gentle work.'),
      hold('child', 30),
      hold('bridge', 30),
      hold('supine-twist', 30),
      finalRest(180)
    ]
  },
  {
    id: practiceId('hips-and-hamstrings'),
    title: 'Hips and hamstrings',
    summary: 'Twenty minutes to open the places that sitting tightens.',
    description:
      'Lunges, folds and pigeon work through the front of the hips, the backs of the legs and the outer hips in turn. Holds are long enough to soften but never forced. A good antidote to a day in a chair or a long run.',
    kind: 'yoga',
    level: 'moderate',
    focus: ['hips', 'hamstrings'],
    origin: 'builtin',
    items: [
      catCow(6),
      hold('downward-dog', 40),
      hold('low-lunge', 40),
      hold('half-splits', 40, 'Keep a small bend in the front knee if the hamstring feels sharp.'),
      hold('lizard', 30),
      hold('garland', 40),
      hold('pigeon', 50, 'Square your hips as best you can. Lie on a support or stay upright on your hands.'),
      hold('bound-angle', 60),
      hold('head-to-knee', 45),
      hold('seated-forward-fold', 60, 'Lead with your chest, not your head. Let the hamstrings release a little each breath out.'),
      hold('supine-figure-four', 45),
      hold('reclined-hamstring', 40, 'A strap or a towel around the foot lets you stay relaxed.'),
      hold('happy-baby', 40),
      finalRest(180)
    ]
  },
  {
    id: practiceId('lower-back-relief'),
    title: 'Lower back relief',
    summary: 'Gentle movement and support for a stiff or tired lower back.',
    description:
      'Small, kind movements that bring blood flow and ease to the lower back, plus a little core work to support it. Move slowly and stay well inside comfort. If any movement sends pain down a leg, skip it and rest.',
    kind: 'yoga',
    level: 'gentle',
    focus: ['back', 'hips', 'core'],
    origin: 'builtin',
    items: [
      hold('knees-to-chest', 45, 'Rock gently from side to side to massage your lower back.'),
      catCow(6),
      hold('child', 45, 'Widen your knees if your belly needs room. Breathe into your lower back.'),
      hold('sphinx', 45),
      hold('bird-dog', 30, 'Move slowly. Keep your back as steady as a tabletop.'),
      hold('thread-the-needle', 30),
      hold('bridge', 40, 'Lift only as high as feels good. Lower slowly, one part of the spine at a time.'),
      hold('supine-figure-four', 40),
      hold('supine-twist', 40),
      finalRest(120, 'Rest with your knees bent and your feet wide if your back prefers it. Let your lower back sink toward the floor.')
    ]
  },
  {
    id: practiceId('desk-break'),
    title: 'Desk break',
    summary: 'Five minutes at your chair to undo hours at the screen.',
    description:
      'No mat and no floor needed. Release the neck and sides on your chair, then stand up for a fold and a stretch. Do it between meetings and come back clearer.',
    kind: 'yoga',
    level: 'gentle',
    focus: ['neck', 'shoulders', 'spine'],
    origin: 'builtin',
    items: [
      hold('chair-seat', 30, 'Sit toward the front of your chair, feet flat, spine tall. Take three slow breaths.'),
      hold('neck-release', 20),
      hold('seated-side-bend', 20, 'Stay on your chair. Reach one arm up and over, holding the seat with the other hand.'),
      hold('seated-twist', 20, 'Stay on your chair. Turn gently from the ribs, holding the backrest or your knee.'),
      hold('standing-side-bend', 15, 'Stand up. Reach your arms overhead and lean gently to one side.'),
      hold('standing-forward-fold', 30, 'Bend your knees and let your upper body hang. Gently nod and shake your head.'),
      hold('mountain', 20, 'Roll up slowly. Stand tall, shoulders soft, and take one more full breath before you go back.')
    ]
  },
  {
    id: practiceId('standing-strength'),
    title: 'Standing strength',
    summary: 'Warriors, lunges and long holds that build strong, steady legs.',
    description:
      'Two sun salutations to warm up, then a run of standing poses held long enough to feel the work. You will build strength in the legs and stamina in the breath. Shorten any stance that strains the knees.',
    kind: 'yoga',
    level: 'moderate',
    focus: ['legs', 'core', 'hips'],
    origin: 'builtin',
    items: [
      arriveStanding,
      sunA(2),
      hold('chair', 40, 'Sit back as if into a chair. Weight in your heels, arms reaching.'),
      hold('warrior-1', 40),
      hold('warrior-2', 45, 'Sink a little lower on each breath out, as long as the front knee stays over the ankle.'),
      hold('reverse-warrior', 30),
      hold('extended-side-angle', 40),
      hold('triangle', 40),
      hold('goddess', 45, 'Press the knees back toward the little toes. Stay low and breathe.'),
      hold('high-lunge', 40),
      hold('pyramid', 40),
      hold('wide-leg-forward-fold', 45),
      hold('plank', 30, 'Lower your knees whenever you need to. Keep breathing.'),
      hold('child', 45),
      finalRest(150)
    ]
  },
  {
    id: practiceId('balance-and-focus'),
    title: 'Balance and focus',
    summary: 'Steady the body and the mind follows.',
    description:
      'Standing balances train the small muscles of the feet and ankles and ask for a calm, single focus. Wobbling is part of it, and so is falling out and coming back. A wall or chair nearby makes every pose here accessible.',
    kind: 'yoga',
    level: 'moderate',
    focus: ['balance', 'legs', 'core'],
    origin: 'builtin',
    items: [
      hold('mountain', 40, 'Close your eyes if you feel steady. Notice the small movements that keep you upright.'),
      hold('tree', 30, 'Fix your gaze on one point that does not move.'),
      hold('chair', 30),
      hold('eagle', 25),
      hold('warrior-3', 20, 'Hands on your hips or on a chair back is fine. Make one long line from head to heel.'),
      hold('half-moon', 25, 'A block or a chair under the bottom hand makes this much steadier.'),
      hold('dancer', 25),
      hold('standing-forward-fold', 30, 'Let everything hang and rest your legs.'),
      hold('bird-dog', 30),
      hold('boat', 20, 'Keep your chest lifted. Bend your knees as much as you need.'),
      hold('side-plank', 20, 'Lower the bottom knee for support if you like.'),
      hold('child', 45),
      rest('Still point', 60, 'Sit tall. Rest your gaze on one point, or close your eyes and follow your breath. Let the steadiness of the poses settle into the mind.', 'easy-seat'),
      finalRest(120)
    ]
  },
  {
    id: practiceId('evening-wind-down'),
    title: 'Evening wind-down',
    summary: 'Slow, supported poses to let go of the day before sleep.',
    description:
      'Everything here happens close to the floor, with long, easy holds and plenty of rest. It releases the back, hips and shoulders and lets the breath slow down on its own. Practice in soft light, then go straight to bed.',
    kind: 'yoga',
    level: 'gentle',
    focus: ['calm', 'back', 'hips'],
    origin: 'builtin',
    items: [
      hold('child', 60, 'Widen your knees and let your arms rest. Breathe into your back.'),
      catCow(5, 6),
      hold('thread-the-needle', 45),
      hold('puppy', 45),
      hold('seated-forward-fold', 60, 'Let your spine round. This is a pose for resting, not reaching.'),
      hold('reclined-bound-angle', 90, 'Slide pillows under your knees if your hips want support.'),
      hold('supine-twist', 45),
      hold('happy-baby', 45),
      hold('legs-up-the-wall', 120, 'Rest your legs up a wall or on a chair seat. Let your arms fall open.'),
      finalRest(180, 'Let your breath become quiet. You are done for the day.')
    ]
  },
  {
    id: practiceId('yin-long-holds'),
    title: 'Yin-style long holds',
    summary: 'A few floor poses, each held for minutes, to release deep and slow.',
    description:
      'Instead of strength, yin uses time. You settle into each pose at about two thirds of your range, then stay still for two to four minutes and let gravity do the rest. Use cushions freely, and come out slowly if anything tingles or pinches.',
    kind: 'yoga',
    level: 'gentle',
    focus: ['hips', 'hamstrings', 'spine', 'calm'],
    origin: 'builtin',
    items: [
      hold('bound-angle', 240, 'Let your spine round forward and your head hang. Find a gentle stretch, then stay still.'),
      hold('sphinx', 180, 'Let your belly soften toward the floor. If your lower back complains, slide your elbows forward.'),
      hold('child', 120, 'A pillow under your chest makes this a true rest.'),
      hold('pigeon', 180, 'Fold forward over the front leg and rest on your forearms or a cushion. Stay still and breathe.'),
      hold('seated-forward-fold', 240, 'Let your back round and your hands rest wherever they land. No reaching.'),
      hold('supine-twist', 150, 'Let the knees fall heavy. Let your shoulders melt toward the floor.'),
      hold('happy-baby', 120, 'Or simply hug the knees in. Rock a little if that feels good.'),
      finalRest(240)
    ]
  },
  {
    id: practiceId('full-practice'),
    title: 'Full practice',
    summary: 'A complete class, from warm-up to rest, in forty-five minutes.',
    description:
      'A full hatha class with every part in its place. Warm the spine, build heat with sun salutations, then move through standing poses, balances, backbends and seated folds, and finish with a long rest. Take child pose at any point.',
    kind: 'yoga',
    level: 'moderate',
    focus: ['legs', 'hips', 'spine', 'hamstrings', 'balance'],
    origin: 'builtin',
    items: [
      rest('Arrive', 60, 'Sit comfortably and close your eyes. Notice how you feel today, and let the breath slow down.', 'easy-seat'),
      hold('child', 45),
      catCow(8),
      hold('thread-the-needle', 30),
      hold('downward-dog', 45),
      hold('standing-forward-fold', 30),
      sunA(3),
      sunB(2),
      hold('warrior-2', 40),
      hold('reverse-warrior', 30),
      hold('extended-side-angle', 40),
      hold('triangle', 40),
      hold('goddess', 40),
      hold('pyramid', 40),
      hold('wide-leg-forward-fold', 45),
      hold('tree', 30),
      hold('eagle', 25),
      hold('warrior-3', 20),
      hold('half-moon', 25),
      hold('locust', 30),
      hold('bow', 25, 'Hold one foot at a time if both feels like too much.'),
      hold('child', 30),
      hold('staff', 30),
      hold('seated-forward-fold', 60),
      hold('head-to-knee', 45),
      hold('seated-twist', 40),
      hold('boat', 30),
      hold('bridge', 45),
      hold('fish', 30),
      hold('supine-twist', 45),
      hold('happy-baby', 45),
      finalRest(300)
    ]
  }
]

const meditation: Practice[] = [
  {
    id: practiceId('silent-meditation'),
    title: 'Silent meditation',
    summary: 'A bell to begin, a bell to end, and quiet in between.',
    description:
      'An unguided timer for your own practice. Choose any length from one minute to two hours. A single line of instruction starts you off, then nothing interrupts you until the closing bell.',
    kind: 'meditation',
    level: 'gentle',
    focus: ['calm'],
    origin: 'builtin',
    adjustable: { minSec: 60, maxSec: 120 * 60 },
    items: [sit('Silent sitting', 15 * 60, 'Sit comfortably. Let your attention rest naturally. When the mind wanders, gently return to the present.', [])]
  },
  {
    id: practiceId('guided-meditation'),
    title: 'Guided meditation',
    summary: 'A gentle introduction to mindfulness.',
    description:
      'Arrive in the body, feel the breath, and learn to meet wandering thoughts with patience. This is the classic shape of a mindfulness sit, and a good one to return to often.',
    kind: 'meditation',
    level: 'gentle',
    focus: ['calm'],
    origin: 'builtin',
    adjustable: { minSec: 10 * 60, maxSec: 30 * 60 },
    items: [
      sit(
        'Guided meditation',
        15 * 60,
        'Find a posture that feels both relaxed and alert. Let your hands rest.',
        script(
          ['0:15', 'Notice the contact between your body and the ground. There is nothing you need to achieve right now.'],
          ['1:15', 'Let the body be heavy where it is supported, and upright where it is not.'],
          ['2:00', 'Now bring attention to the sensations in your body. Notice areas of contact, warmth, coolness, or tension, without needing to change them.'],
          ['3:15', 'If you notice tension, allow it to be there.'],
          ['4:15', 'Feel the body as a whole, sitting here, breathing.'],
          ['5:00', 'Now notice the natural rhythm of breathing. Feel the breath where it is easiest to notice. Perhaps at the nostrils, the chest, or the abdomen.'],
          ['6:15', 'Do not control the breath. Simply know that you are breathing.'],
          ['7:45', 'If you have drifted away, that is fine. Come back to the next breath.'],
          ['9:00', 'Breathing in, knowing it. Breathing out, knowing it.'],
          ['10:00', 'When thoughts appear, notice that thinking is happening. You do not need to follow the thought or push it away. Gently return to the breath.'],
          ['11:30', 'Wandering is not failure. Returning is the practice.'],
          ['13:00', 'Let go of the focus on the breath. Notice your whole body and the sounds around you.'],
          ['14:00', 'When you are ready, slowly open your eyes. Take your time before getting up.']
        )
      )
    ]
  },
  {
    id: practiceId('breath-awareness'),
    title: 'Breath awareness',
    summary: 'Rest your attention on the breath, and come back each time it drifts.',
    description:
      'The simplest and most widely taught meditation. You feel the breath where it is clearest and return to it whenever the mind wanders. The returning, not the staying, is what trains attention.',
    kind: 'meditation',
    level: 'gentle',
    focus: ['calm'],
    origin: 'builtin',
    adjustable: { minSec: 5 * 60, maxSec: 30 * 60 },
    items: [
      sit(
        'Breath awareness',
        10 * 60,
        'Sit so your spine can be upright without effort. Rest your hands. Let your eyes close, or lower your gaze to the floor.',
        script(
          ['0:20', 'Take one slower breath in, and let it go with a sigh. Then let the breath find its own pace.'],
          ['1:00', 'Notice where you feel the breath most clearly. The cool air at the nostrils. The rise of the chest. The belly moving in and out.'],
          ['1:45', 'Choose one of those places and rest your attention there. Feel one breath from its very beginning to its very end.'],
          ['2:45', 'There is no right way to breathe here. Long or short, smooth or uneven, just feel it as it is.'],
          ['3:45', 'When you notice you have been thinking, that moment of noticing is the practice. Gently come back to the breath.'],
          ['5:00', 'You might count each breath out, from one up to ten, then start again at one. If you lose count, simply begin again.'],
          ['6:30', 'Notice the small pause at the end of each breath out, before the next breath arrives on its own.'],
          ['8:00', 'Let go of any counting now. Just breathing, and knowing that you are breathing.'],
          ['9:15', 'Let your attention widen to the whole body. Hear the sounds around you. When you are ready, open your eyes.']
        )
      )
    ]
  },
  {
    id: practiceId('body-scan'),
    title: 'Body scan',
    summary: 'Move your attention slowly from head to toe and let each part rest.',
    description:
      'Lying down, you travel through the body one region at a time, noticing whatever is there without trying to change it. It is deeply relaxing and a reliable way to get out of a busy head. Falling asleep is fine, though staying awake is the aim.',
    kind: 'meditation',
    level: 'gentle',
    focus: ['calm'],
    origin: 'builtin',
    adjustable: { minSec: 10 * 60, maxSec: 30 * 60 },
    items: [
      sit(
        'Body scan',
        15 * 60,
        'Lie on your back, or sit if you prefer. Let your arms rest by your sides and your feet fall open. Let your eyes close.',
        script(
          ['0:20', 'Feel the weight of your body resting on the floor. Let the ground hold all of it. You do not need to hold yourself up.'],
          ['1:05', 'Take a few easy breaths. With each breath out, let yourself settle a little more.'],
          ['1:50', 'Bring your attention to the top of your head. Notice any sensation there. Tingling, warmth, pressure, or nothing at all. Nothing is fine too.'],
          ['2:40', 'Move down to your forehead. Let it be smooth. Soften the small muscles around your eyes.'],
          ['3:25', 'Feel your cheeks and jaw. Let the teeth part slightly. Let the tongue rest.'],
          ['4:10', 'Notice your neck and throat. Then the tops of the shoulders, often holding more than they need to. See if they can sink a little.'],
          ['5:00', 'Travel down both arms. Upper arms, elbows, forearms, wrists. Feel your hands, the palms, each finger.'],
          ['5:55', 'Bring attention to your chest. Feel it rise and fall with the breath. Notice the heartbeat, if you can feel it.'],
          ['6:50', 'Move to the belly. Let it be soft. Feel it swell as you breathe in, and settle as you breathe out.'],
          ['7:45', 'Notice your upper back against the floor. Then the middle back. Then the lower back. Let each area be exactly as it is.'],
          ['8:40', 'Feel your hips and pelvis, heavy and supported. Let the muscles of the seat let go.'],
          ['9:35', 'Move down through the thighs, the knees, the lower legs. Notice where the legs touch the floor and where they do not.'],
          ['10:30', 'Feel your ankles and feet. The heels, the soles, the tops of the feet. Each toe.'],
          ['11:25', 'If your mind has wandered, that is natural. Pick up wherever you are, without hurry.'],
          ['12:15', 'Now feel the whole body at once, from the crown of the head to the soles of the feet. One field of sensation, breathing.'],
          ['13:15', 'Rest here. Nothing to do. Nowhere to go.'],
          ['14:15', 'Begin to deepen the breath. Move your fingers and toes. When you are ready, roll to one side and come up slowly.']
        ),
        'corpse'
      )
    ]
  },
  {
    id: practiceId('loving-kindness'),
    title: 'Loving-kindness',
    summary: 'Offer simple wishes of goodwill, from yourself outward to everyone.',
    description:
      'You repeat a few quiet phrases of goodwill, first for yourself, then for someone you love, someone neutral, someone difficult, and finally all beings. Feelings may or may not come, and either is fine. Over time the practice softens how you meet yourself and others.',
    kind: 'meditation',
    level: 'gentle',
    focus: ['calm'],
    origin: 'builtin',
    credit: 'Traditional metta meditation',
    adjustable: { minSec: 8 * 60, maxSec: 25 * 60 },
    items: [
      sit(
        'Loving-kindness',
        12 * 60,
        'Sit comfortably and let your body settle. Rest a hand on your heart if that feels natural.',
        script(
          ['0:20', 'Take a few slow breaths. Let the face soften. Let the breath move the chest gently.'],
          ['1:00', 'Begin with yourself. Picture yourself as you are right now, sitting here. Silently offer these words. May I be safe. May I be happy. May I be healthy. May I live with ease.'],
          ['2:00', 'Keep repeating the words at your own pace. If they feel hollow, that is fine. You are planting an intention, not forcing a feeling.'],
          ['3:00', 'Now bring to mind someone you love easily. A friend, a family member, a pet. See their face. May you be safe. May you be happy. May you be healthy. May you live with ease.'],
          ['4:15', 'Let the warmth you feel for them be there, however small. Keep offering the words.'],
          ['5:15', 'Now think of someone neutral. Someone you see but barely know. A neighbor, a cashier, a face on your commute. They want to be happy too. May you be safe. May you be happy. May you be healthy. May you live with ease.'],
          ['6:45', 'Now, if you are willing, bring to mind someone difficult. Start with someone mildly difficult, not the hardest person you know. May you be safe. May you be happy. May you be healthy. May you live with ease.'],
          ['7:45', 'If resistance comes up, notice it kindly. You can return to yourself, or to your loved one, at any time.'],
          ['8:45', 'Now let your goodwill widen. To everyone in this building, this town, this country. To people everywhere, and to all living beings. May all beings be safe. May all beings be happy. May all beings be healthy. May all beings live with ease.'],
          ['10:15', 'Rest in whatever feeling is here. Warmth, quiet, or nothing in particular. All of it is welcome.'],
          ['11:15', 'Let the phrases go. Take a full breath. When you are ready, open your eyes.']
        )
      )
    ]
  },
  {
    id: practiceId('noting'),
    title: 'Noting',
    summary: 'Name what takes your attention with a soft word, then let it go.',
    description:
      'A light mental label, such as thinking, hearing or feeling, helps you see experience clearly instead of getting lost in it. Noting is practical and grounding, especially on days when the mind is busy.',
    kind: 'meditation',
    level: 'moderate',
    focus: ['calm'],
    origin: 'builtin',
    credit: 'Mental noting, from the Mahasi vipassana tradition',
    adjustable: { minSec: 5 * 60, maxSec: 30 * 60 },
    items: [
      sit(
        'Noting',
        10 * 60,
        'Sit upright and relaxed. Close your eyes. Begin by feeling the breath for a few moments.',
        script(
          ['0:25', 'In this practice you will gently name what takes your attention. A soft word in the mind is enough.'],
          ['1:05', 'When the breath is clear, note it. In. Out. When a thought pulls you away, note thinking. Then return to the breath.'],
          ['2:00', 'If a sound grabs you, note hearing. If an ache or an itch, note feeling. Then come back.'],
          ['3:00', 'Keep the noting light, about once every few seconds. It is a quiet whisper, not a commentary.'],
          ['4:15', 'You might notice moods too. Note restless, or bored, or calm. Every experience can be named the same way.'],
          ['5:30', 'If you catch yourself planning, note planning. Remembering, note remembering. Then let it go.'],
          ['7:00', 'Notice that each thing you name arrives, and then passes. Nothing stays.'],
          ['8:15', 'Let the noting fall away now. Rest with whatever is here, without naming it.'],
          ['9:20', 'Take a deeper breath. Feel your hands and feet. Open your eyes when you are ready.']
        )
      )
    ]
  },
  {
    id: practiceId('open-awareness'),
    title: 'Open awareness',
    summary: 'Let go of a single focus and rest in everything that is here.',
    description:
      'After steadying on the breath, attention widens to include sounds, sensations and thoughts as they come and go. Nothing is a distraction, because everything is part of the practice. Best after some experience with breath awareness.',
    kind: 'meditation',
    level: 'moderate',
    focus: ['calm'],
    origin: 'builtin',
    adjustable: { minSec: 10 * 60, maxSec: 40 * 60 },
    items: [
      sit(
        'Open awareness',
        15 * 60,
        'Sit in a way that feels upright and at ease. Let your eyes close or rest softly open.',
        script(
          ['0:20', 'Start with the breath. Feel a few breaths come and go, to steady the mind.'],
          ['1:10', 'Now widen your attention to include sounds. Near sounds and far sounds. Let them come to you. No need to name them.'],
          ['2:10', 'Include the body. Sensations of touch and temperature, pressure and movement, arising on their own.'],
          ['3:15', 'Let thoughts be part of this too. Watch them appear and fade like sounds, without following them.'],
          ['4:30', 'There is no single object now. Just notice whatever is most vivid, and let it change.'],
          ['5:45', 'If you find yourself lost in a story, simply notice that, and open again.'],
          ['7:15', 'Notice the space in which all of this happens. Sounds, sensations and thoughts, all appearing and passing.'],
          ['8:45', 'Simply rest, aware of whatever is here. Not doing anything.'],
          ['10:30', 'If effort creeps in, let it go. Awareness is already here. It needs nothing from you.'],
          ['12:15', 'Stay with this open, easy attention for these last few minutes.'],
          ['13:45', 'Gently come back to the breath, and to the feeling of your body sitting.'],
          ['14:30', 'When you are ready, open your eyes and let this openness come with you.']
        )
      )
    ]
  },
  {
    id: practiceId('breathing-space'),
    title: 'Three-minute breathing space',
    summary: 'A short reset in three steps for any moment of the day.',
    description:
      'Notice what is here, gather your attention on the breath, then widen it to the whole body. Three minutes is enough to step out of autopilot, and you can do it anywhere, eyes open or closed.',
    kind: 'meditation',
    level: 'gentle',
    focus: ['calm'],
    origin: 'builtin',
    credit: 'Based on the three-minute breathing space from mindfulness-based cognitive therapy',
    items: [
      sit(
        'Breathing space',
        3 * 60,
        'Sit or stand tall, with a sense of dignity. Close your eyes if that feels right.',
        script(
          ['0:12', 'First, notice what is here. What thoughts are passing through? What feelings? What sensations in the body? Just acknowledge them.'],
          ['1:00', 'Now gather your attention onto the breath. Feel the belly rise as you breathe in and fall as you breathe out. Let the breath be an anchor.'],
          ['2:00', 'Now widen your attention to the whole body, breathing. Your posture, your face, your hands. Take this wider awareness into the rest of your day.'],
          ['2:45', 'Open your eyes when you are ready.']
        )
      )
    ]
  },
  {
    id: practiceId('morning-intention'),
    title: 'Morning intention',
    summary: 'Five quiet minutes to choose how you want to meet the day.',
    description:
      'Before the day takes over, check in with how you feel and pick one quality to carry with you. It is short enough for the edge of the bed and changes the tone of the hours that follow.',
    kind: 'meditation',
    level: 'gentle',
    focus: ['calm'],
    origin: 'builtin',
    adjustable: { minSec: 3 * 60, maxSec: 10 * 60 },
    items: [
      sit(
        'Morning intention',
        5 * 60,
        'Sit up in bed or on a chair. Let your feet find the floor if you can. Close your eyes.',
        script(
          ['0:15', 'Take three slow breaths. Feel yourself waking up, breath by breath.'],
          ['0:55', 'Notice how you feel this morning. Rested or tired, calm or restless. Just notice, without judging.'],
          ['1:45', 'Now ask yourself quietly. How do I want to be today? Not what I need to get done, but how I want to meet it.'],
          ['2:40', 'Let a word or a short phrase come. Perhaps patient. Perhaps present. Perhaps kind to myself. Choose one.'],
          ['3:30', 'Repeat your intention silently a few times. Feel what it would be like to live it.'],
          ['4:20', 'Take one more deep breath. Open your eyes and carry your intention into the day.']
        ),
        'chair-seat'
      )
    ]
  },
  {
    id: practiceId('sleep-wind-down'),
    title: 'Sleep wind-down',
    summary: 'Lie down, let the day go, and drift toward sleep.',
    description:
      'A slow, softening practice to do in bed with the lights low. You relax the body from the face down, let thoughts about the day pass by, and end in silence so you can fall asleep without being woken.',
    kind: 'meditation',
    level: 'gentle',
    focus: ['calm'],
    origin: 'builtin',
    adjustable: { minSec: 10 * 60, maxSec: 30 * 60 },
    items: [
      sit(
        'Sleep wind-down',
        15 * 60,
        'Lie down in bed in a comfortable position. Let the lights be low. Let your eyes close.',
        script(
          ['0:20', 'Let out a long sigh. And another. Let the day begin to fall away.'],
          ['1:05', 'Feel the bed beneath you. Let your body grow heavy. You can let the mattress hold everything.'],
          ['1:55', 'Let your breath slow down by itself. You might make each breath out a little longer than the breath in.'],
          ['2:50', 'Soften your face. The forehead, the eyes, the jaw. Let the tongue rest.'],
          ['3:45', 'Let your shoulders melt down. Feel your arms grow heavy, all the way to your fingertips.'],
          ['4:45', 'Let your chest and belly soften. With each breath out, let go a little more.'],
          ['5:50', 'Let your hips, legs and feet grow heavy and warm.'],
          ['7:00', 'If thoughts about today or tomorrow appear, let them pass. They will be there in the morning. For now, there is nothing to solve.'],
          ['8:30', 'Picture somewhere you feel safe and at ease. A quiet room, a beach, a forest. Let yourself be there.'],
          ['10:00', 'Count your breaths backward from ten, slowly. If you lose your place, begin again at ten, or simply let the numbers go.'],
          ['11:45', 'Rest in the dark. Heavy, warm, and still.'],
          ['13:30', 'There is nothing more to do. Let yourself drift into sleep.']
        ),
        'corpse'
      )
    ]
  },
  {
    id: practiceId('walking-meditation'),
    title: 'Walking meditation',
    summary: 'Slow, attentive steps for when sitting still is not the right fit.',
    description:
      'Walk back and forth along a short path, paying close attention to each step. It brings the same steadiness as sitting, with the body awake and moving. Good for restless days, sleepy minds, or a break outdoors.',
    kind: 'meditation',
    level: 'gentle',
    focus: ['calm', 'balance'],
    origin: 'builtin',
    adjustable: { minSec: 5 * 60, maxSec: 30 * 60 },
    items: [
      sit(
        'Walking meditation',
        10 * 60,
        'Find a quiet path where you can take ten or twenty steps, indoors or out. Stand still at one end, with your arms relaxed.',
        script(
          ['0:20', 'Feel your feet on the ground. Notice the weight of your body moving down through your legs.'],
          ['1:00', 'Begin to walk slowly, a little slower than usual. Feel each foot lift, move, and land.'],
          ['1:50', 'Keep your gaze soft and a few steps ahead. There is nowhere to arrive. Each step is complete in itself.'],
          ['2:50', 'When you reach the end of your path, pause. Stand for a breath. Then turn slowly and walk back.'],
          ['4:00', 'If your mind wanders, stop for a moment. Feel your feet. Then begin again.'],
          ['5:15', 'You might match your steps to your breath. Breathing in, one step. Breathing out, another.'],
          ['6:30', 'Notice the whole body walking. The swing of the arms, the air on your skin, the sounds around you.'],
          ['8:00', 'Slow down a little more. Feel the heel touch, the roll through the foot, the push of the toes.'],
          ['9:15', 'Come to stillness wherever you are. Stand and feel your body. Take that steadiness with you.']
        ),
        'mountain'
      )
    ]
  },
  {
    id: practiceId('gratitude'),
    title: 'Gratitude',
    summary: 'Turn toward what is already good, and let it register.',
    description:
      'The mind is quick to notice problems and slow to notice what is going well. This practice gives the good things some time, from small comforts to the people who support you. It tends to leave a quiet warmth behind.',
    kind: 'meditation',
    level: 'gentle',
    focus: ['calm'],
    origin: 'builtin',
    adjustable: { minSec: 5 * 60, maxSec: 15 * 60 },
    items: [
      sit(
        'Gratitude',
        8 * 60,
        'Sit comfortably and close your eyes. Let your breathing be easy.',
        script(
          ['0:15', 'Take a few breaths and let your body settle. Feel the support of the ground beneath you.'],
          ['0:55', 'Bring to mind something small you are grateful for today. Warm water. A good cup of tea. A moment of quiet.'],
          ['1:50', 'Stay with it. Notice how gratitude feels in the body. Perhaps a warmth in the chest, or a softening in the face.'],
          ['2:50', 'Now think of a person you are grateful for. Picture them. Recall one thing they have done for you.'],
          ['3:50', 'If you like, thank them silently, in your own words.'],
          ['4:45', 'Now consider something about yourself you can appreciate. Your effort, your care, the way you keep showing up.'],
          ['5:45', 'Widen your gratitude to the simple things that hold your life together. Breath. The body. The people and places that support you.'],
          ['6:50', 'Rest in this feeling for a few breaths.'],
          ['7:30', 'Gently open your eyes, and notice one thing in front of you that you can appreciate.']
        )
      )
    ]
  }
]

const closing = (durationSec: number, intro: string, last: string): PracticeItem =>
  sit('Natural breathing', durationSec, intro, [{ at: Math.round(durationSec * 0.6), text: last }])

const breathwork: Practice[] = [
  {
    id: practiceId('box-breathing'),
    title: 'Box breathing',
    summary: 'Four equal counts to steady a busy mind.',
    description:
      'Breathe in, hold, breathe out and hold again, each for a count of four. The even rhythm gives the mind something simple to follow and settles the nerves before a hard conversation, a talk or sleep. If the holds feel strained, shorten them.',
    kind: 'breath',
    level: 'gentle',
    focus: ['calm'],
    origin: 'builtin',
    adjustable: { minSec: 3 * 60, maxSec: 15 * 60 },
    items: [
      breath(
        'Box breathing',
        { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 },
        15,
        'Sit tall and let your shoulders drop. You will breathe in for four, hold for four, breathe out for four, and hold for four. Follow the orb, and keep every side of the box smooth.',
        4
      ),
      closing(60, 'Let the pattern go and breathe naturally. Notice how your body feels now.', 'When you are ready, open your eyes.')
    ]
  },
  {
    id: practiceId('relaxing-breath'),
    title: 'Relaxing breath',
    summary: 'The four-seven-eight breath, a slow exhale that invites rest.',
    description:
      'Breathe in for four, hold for seven, and breathe out slowly for eight. The long exhale helps the body shift toward rest, which makes this a good practice before sleep. Two short sets are plenty to start. If you feel lightheaded, return to normal breathing.',
    kind: 'breath',
    level: 'gentle',
    focus: ['calm'],
    origin: 'builtin',
    credit: 'Based on the four-seven-eight breath taught by Andrew Weil, rooted in yogic pranayama',
    items: [
      breath(
        'Relaxing breath',
        { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0 },
        4,
        'Rest the tip of your tongue just behind your top teeth. Breathe in quietly through your nose for four. Hold for seven. Breathe out through your mouth with a soft whoosh for eight.',
        4
      ),
      closing(45, 'Breathe normally for a moment. Notice any change in your body.', 'Get ready for one more set.'),
      breath('Second set', { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0 }, 4, 'Once more. Four slow breaths, in for four, hold for seven, out for eight.', 4),
      closing(60, 'Let the breath return to its own rhythm. Stay here and enjoy the quiet.', 'When you are ready, open your eyes.')
    ]
  },
  {
    id: practiceId('coherent-breathing'),
    title: 'Coherent breathing',
    summary: 'Slow, even breaths at about five and a half a minute.',
    description:
      'Breathe in and out for equal, unhurried counts, without any holds. This slow, steady pace is often linked with a calmer heart rhythm and a clearer head. Keep the breath soft and quiet rather than deep and forced.',
    kind: 'breath',
    level: 'gentle',
    focus: ['calm'],
    origin: 'builtin',
    adjustable: { minSec: 5 * 60, maxSec: 20 * 60 },
    items: [
      breath(
        'Coherent breathing',
        { inhale: 5.5, holdIn: 0, exhale: 5.5, holdOut: 0 },
        50,
        'Sit comfortably and breathe through your nose. Let each breath in and each breath out last the same time, about five and a half seconds. Smooth and quiet, like a slow wave.'
      ),
      closing(60, 'Let go of the count and breathe naturally. Notice the pace of your mind.', 'When you are ready, open your eyes.')
    ]
  },
  {
    id: practiceId('extended-exhale'),
    title: 'Extended exhale',
    summary: 'Breathe out longer than you breathe in, and feel yourself calm down.',
    description:
      'Breathing in for four and out for six is one of the simplest ways to slow down. The longer exhale is a direct signal to the body to relax. Use it during stress, before sleep, or any time you feel wound up.',
    kind: 'breath',
    level: 'gentle',
    focus: ['calm'],
    origin: 'builtin',
    adjustable: { minSec: 3 * 60, maxSec: 15 * 60 },
    items: [
      breath(
        'Extended exhale',
        { inhale: 4, holdIn: 0, exhale: 6, holdOut: 0 },
        36,
        'Sit or lie down comfortably. Breathe in through your nose for four. Breathe out slowly for six, through your nose or through softly pursed lips.'
      ),
      closing(60, 'Let the count go. Breathe naturally and notice the calm in your body.', 'When you are ready, open your eyes.')
    ]
  },
  {
    id: practiceId('energizing-breath'),
    title: 'Energizing breath',
    summary: 'A brisk, safe rhythm to wake up body and mind.',
    description:
      'A full breath in followed by a quicker, firm breath out lifts your energy without any strain or breath holding. Three short rounds with rests in between. If you feel dizzy or tingly, stop and breathe normally.',
    kind: 'breath',
    level: 'moderate',
    focus: ['chest'],
    origin: 'builtin',
    items: [
      breath(
        'Rising breath',
        { inhale: 4, holdIn: 0, exhale: 2, holdOut: 0 },
        12,
        'Sit tall with your chest open. Breathe in through your nose for four, filling from the belly up to the chest. Breathe out firmly through your nose for two.'
      ),
      closing(30, 'Rest and breathe normally.', 'Sit tall again for round two.'),
      breath('Round two', { inhale: 4, holdIn: 0, exhale: 2, holdOut: 0 }, 12, 'Again. In for four, out firmly for two.'),
      closing(30, 'Rest and breathe normally.', 'Sit tall again for the last round.'),
      breath('Round three', { inhale: 4, holdIn: 0, exhale: 2, holdOut: 0 }, 12, 'Last round. In for four, out firmly for two.'),
      closing(45, 'Let the breath settle. Feel the energy moving through your body.', 'Open your eyes and take this alertness with you.')
    ]
  },
  {
    id: practiceId('alternate-nostril'),
    title: 'Alternate nostril breathing',
    summary: 'Breathe through one side at a time to balance and quiet the mind.',
    description:
      'You gently close one nostril with your fingers and breathe through the other, switching sides in a steady pattern. The voice teaches the pattern first, then you continue on your own with the orb. If your nose is blocked, try another breath practice today.',
    kind: 'breath',
    level: 'gentle',
    focus: ['calm'],
    origin: 'builtin',
    credit: 'Traditional Nadi Shodhana',
    items: [
      sit(
        'Learning the pattern',
        90,
        'Sit tall and rest your left hand in your lap. Bring your right hand up to your face.',
        script(
          ['0:09', 'Fold your first two fingers into your palm. Your thumb closes the right nostril. Your ring finger closes the left.'],
          ['0:21', 'Close the right nostril with your thumb. Breathe in slowly through the left.'],
          ['0:31', 'Close the left. Open the right. Breathe out through the right.'],
          ['0:41', 'Breathe in through the right.'],
          ['0:47', 'Close the right. Open the left. Breathe out through the left.'],
          ['0:57', 'Breathe in through the left.'],
          ['1:03', 'Switch. Breathe out through the right.'],
          ['1:11', 'Breathe in through the right.'],
          ['1:17', 'Switch. Breathe out through the left.']
        )
      ),
      breath(
        'On your own',
        { inhale: 4, holdIn: 0, exhale: 6, holdOut: 0 },
        24,
        'Now continue on your own with the orb. Switch sides at the top of every breath in. Breathe out, then in, through the same side, then switch again.',
        2
      ),
      closing(60, 'Lower your hand. Breathe in and out through both nostrils.', 'Notice the quality of your mind now. Open your eyes when you are ready.')
    ]
  }
]

export const PRACTICES: Practice[] = [...yoga, ...meditation, ...breathwork]
