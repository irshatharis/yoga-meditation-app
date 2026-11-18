import { poseId, type Pose } from '../domain/types'
import type { BuiltinPoseId } from './pose-ids'

// Every built-in pose. Text is spoken aloud, so it stays free of symbols and
// parentheses, and sided poses never name a side: the same words serve both.
// Figures show the right side; the left side is drawn as their mirror image.

type Draft = Omit<Pose, 'id' | 'media' | 'origin' | 'cautions'> & { id: BuiltinPoseId; cautions?: string[] }

const pose = (p: Draft): Pose => ({ ...p, id: poseId(p.id), cautions: p.cautions ?? [], media: [], origin: 'builtin' })

export const POSES: Pose[] = [
  // Standing
  pose({
    id: 'mountain',
    name: 'Mountain',
    sanskrit: 'Tadasana',
    family: 'standing',
    level: 'gentle',
    focus: ['balance', 'calm'],
    sided: false,
    summary: 'Stand tall and steady, the quiet starting point for every standing pose.',
    setup: [
      'Stand with your feet hip width apart.',
      'Let your arms rest by your sides.',
      'Lengthen up through the crown of your head.'
    ],
    cues: ['Spread your weight evenly through both feet.', 'Soften your shoulders away from your ears.', 'Let your breath move slow and easy.'],
    release: 'Stay standing and let your body settle.',
    easier: 'Widen your stance a little for more stability.',
    figure: { view: 'side', spine: [180, 180], head: 180, armA: [4, 2], armB: [-3, -3], legA: [0, 0], legB: [0, 0] }
  }),
  pose({
    id: 'upward-salute',
    name: 'Upward salute',
    sanskrit: 'Urdhva Hastasana',
    family: 'standing',
    level: 'gentle',
    focus: ['shoulders', 'spine'],
    sided: false,
    summary: 'Reach both arms overhead to lengthen the whole front of the body.',
    setup: [
      'Stand tall, feet hip width apart.',
      'Breathe in and sweep your arms up overhead.',
      'Let your palms face each other.'
    ],
    cues: ['Reach up through your fingertips.', 'Keep your lower ribs soft as your arms rise.', 'Lift your gaze gently if your neck feels easy.'],
    release: 'Breathe out and float your arms back down by your sides.',
    cautions: ['Keep your arms lower if you have a shoulder injury.'],
    easier: 'Keep your arms wider, in a soft V shape.',
    figure: { view: 'side', spine: [180, 186], head: 188, armA: [186, 188], armB: [184, 186], legA: [0, 0], legB: [0, 0] }
  }),
  pose({
    id: 'standing-forward-fold',
    name: 'Standing forward fold',
    sanskrit: 'Uttanasana',
    family: 'standing',
    level: 'gentle',
    focus: ['hamstrings', 'back', 'calm'],
    sided: false,
    summary: 'Fold forward from the hips and let the head and spine hang heavy.',
    setup: [
      'Stand with your feet hip width apart.',
      'Soften your knees and fold forward from your hips.',
      'Let your head and arms hang.'
    ],
    cues: ['Keep a generous bend in your knees.', 'Let the back of your neck go soft.', 'Breathe into the back of your body.'],
    release: 'Bend your knees, press into your feet, and roll up slowly, head last.',
    cautions: ['Rise slowly if you tend to feel dizzy.', 'Keep your knees well bent if your low back is sensitive.'],
    easier: 'Rest your hands on blocks or on your shins.',
    figure: { view: 'side', spine: [62, 30], head: 8, armA: [-30, -26, 90], armB: [-28, -24, 90], legA: [3, -1], legB: [3, -1] }
  }),
  pose({
    id: 'halfway-lift',
    name: 'Halfway lift',
    sanskrit: 'Ardha Uttanasana',
    family: 'standing',
    level: 'gentle',
    focus: ['back', 'hamstrings'],
    sided: false,
    summary: 'Lift halfway up with a long, flat back and your hands on your shins.',
    setup: [
      'From your fold, bring your hands to your shins.',
      'Breathe in and lengthen your spine until your back is flat.'
    ],
    cues: ['Reach your chest forward and your hips back.', 'Keep your neck long, gaze toward the floor ahead.', 'Soften your knees if your back starts to round.'],
    release: 'Breathe out and fold back down.',
    easier: 'Rest your hands on your thighs and bend your knees.',
    figure: { view: 'side', spine: [100, 98], head: 100, armA: [-35, -35], armB: [-33, -33], legA: [5, -3], legB: [5, -3] }
  }),
  pose({
    id: 'chair',
    name: 'Chair',
    sanskrit: 'Utkatasana',
    family: 'standing',
    level: 'moderate',
    focus: ['legs', 'core'],
    sided: false,
    summary: 'Sit back as if into a chair, arms reaching up, to build heat and strength.',
    setup: [
      'Stand with your feet hip width apart.',
      'Bend your knees and sit your hips back.',
      'Reach your arms up beside your ears.'
    ],
    cues: ['Shift your weight toward your heels.', 'Draw your belly gently in and up.', 'Keep breathing as your legs work.'],
    release: 'Press into your feet, straighten your legs, and lower your arms.',
    cautions: ['Sit less deeply if your knees complain.'],
    easier: 'Keep your hands at your heart and sit back only a little.',
    figure: { view: 'side', spine: [155, 160], head: 162, armA: [164, 166], armB: [162, 164], legA: [62, -18, 90], legB: [62, -18, 90] }
  }),
  pose({
    id: 'warrior-1',
    name: 'Warrior one',
    sanskrit: 'Virabhadrasana I',
    family: 'standing',
    level: 'moderate',
    focus: ['legs', 'hips'],
    sided: true,
    summary: 'A strong lunge with the back heel down and the arms reaching high.',
    setup: [
      'Step one foot back a long stride and press the back heel down.',
      'Bend your front knee over the ankle.',
      'Reach your arms overhead.'
    ],
    cues: ['Draw your hips toward facing the front, as far as feels natural.', 'Press firmly through the outer edge of your back foot.', 'Lift your chest and soften your shoulders.'],
    release: 'Lower your arms, straighten the front leg, and step your feet together.',
    cautions: ['Keep the front knee over the ankle to protect it.'],
    easier: 'Shorten your stance and rest your hands on your hips.',
    figure: { view: 'side', spine: [180, 184], head: 182, armA: [184, 182], armB: [182, 180], legA: [70, -2, 90], legB: [-48, -48, 80] }
  }),
  pose({
    id: 'warrior-2',
    name: 'Warrior two',
    sanskrit: 'Virabhadrasana II',
    family: 'standing',
    level: 'moderate',
    focus: ['legs', 'hips'],
    sided: true,
    summary: 'Open wide with the arms reaching in opposite directions, steady and strong.',
    setup: [
      'Step wide and turn your front foot forward.',
      'Bend the front knee over the ankle.',
      'Reach your arms wide and gaze over your front hand.'
    ],
    cues: ['Let your front knee track toward your little toe.', 'Keep your torso upright, centered between your legs.', 'Reach long through both arms and relax your shoulders.'],
    release: 'Straighten your front leg and lower your arms.',
    cautions: ['If your front knee aches, bend it less.'],
    easier: 'Shorten your stance and bend the front knee less.',
    figure: { view: 'front', spine: [180, 180], head: 180, armA: [-90, -90], armB: [90, 90], legA: [-82, 0, -90], legB: [56, 56, 80] }
  }),
  pose({
    id: 'reverse-warrior',
    name: 'Reverse warrior',
    sanskrit: 'Viparita Virabhadrasana',
    family: 'standing',
    level: 'moderate',
    focus: ['spine', 'legs'],
    sided: true,
    summary: 'From warrior two, arc back and reach the front arm up and over.',
    setup: [
      'Begin in warrior two.',
      'Reach your front arm up and back.',
      'Let your back hand rest lightly on your back leg.'
    ],
    cues: ['Keep your front knee deeply bent.', 'Lengthen the side of your waist.', 'Rest your back hand lightly, without leaning on it.'],
    release: 'Return to warrior two, then straighten the front leg.',
    cautions: ['Keep your gaze forward if looking up strains your neck.'],
    easier: 'Bend the front knee less and keep the arc small.',
    figure: { view: 'front', spine: [172, 162], head: 160, armA: [165, 155], armB: [20, 15], legA: [-82, 0, -90], legB: [56, 56, 80] }
  }),
  pose({
    id: 'extended-side-angle',
    name: 'Extended side angle',
    sanskrit: 'Utthita Parsvakonasana',
    family: 'standing',
    level: 'moderate',
    focus: ['legs', 'hips', 'spine'],
    sided: true,
    summary: 'Lean over a bent front knee and reach one long line from heel to fingertips.',
    setup: [
      'Begin in warrior two.',
      'Rest your front forearm on your thigh, or your hand on the floor.',
      'Reach your top arm over your ear.'
    ],
    cues: ['Make one long line from your back heel to your top fingertips.', 'Roll your top ribs open toward the ceiling.', 'Press the outer edge of your back foot down.'],
    release: 'Press into your feet and rise back to warrior two.',
    cautions: ['Keep your gaze down if your neck feels strained.'],
    easier: 'Rest your forearm on your front thigh instead of reaching for the floor.',
    figure: { view: 'front', spine: [-124, -124], head: -130, armA: [-20, 15], armB: [-128, -128], legA: [-82, 0, -90], legB: [56, 56, 80] }
  }),
  pose({
    id: 'triangle',
    name: 'Triangle',
    sanskrit: 'Trikonasana',
    family: 'standing',
    level: 'moderate',
    focus: ['hamstrings', 'hips', 'spine'],
    sided: true,
    summary: 'Straight legs, long sides, and the arms in one vertical line.',
    setup: [
      'Step wide and turn your front foot forward.',
      'Tip over your front leg.',
      'Rest your hand on your shin and lift your top arm.'
    ],
    cues: ['Lengthen both sides of your waist evenly.', 'Keep your front knee soft rather than locked.', 'Stack your top shoulder over your bottom one.', 'Breathe into your open chest.'],
    release: 'Press into your feet and rise up with a long spine.',
    easier: 'Rest your lower hand on a block or higher up your leg.',
    figure: { view: 'front', spine: [-110, -112], head: -115, armA: [-4, -4], armB: [176, 176], legA: [-32, -32, -90], legB: [32, 32, 80] }
  }),
  pose({
    id: 'pyramid',
    name: 'Pyramid',
    sanskrit: 'Parsvottanasana',
    family: 'standing',
    level: 'moderate',
    focus: ['hamstrings'],
    sided: true,
    summary: 'A deep fold over a straight front leg that stretches the back of the leg.',
    setup: [
      'Step one foot back a short stride.',
      'Square your hips to the front.',
      'Fold forward over your front leg, hands to the floor or blocks.'
    ],
    cues: ['Draw your front hip back to keep your hips level.', 'Lead with your chest rather than your head.', 'Soften the front knee if the stretch feels sharp.'],
    release: 'Bring your hands to your hips and rise up with a long back.',
    easier: 'Shorten your stance and rest your hands on blocks.',
    figure: { view: 'side', spine: [74, 50], head: 30, armA: [-30, -20, 90], armB: [-28, -18, 90], legA: [28, 28, 90], legB: [-28, -28, 74] }
  }),
  pose({
    id: 'wide-leg-forward-fold',
    name: 'Wide-legged forward fold',
    sanskrit: 'Prasarita Padottanasana',
    family: 'standing',
    level: 'moderate',
    focus: ['hamstrings', 'hips'],
    sided: false,
    summary: 'Fold forward between wide legs and let the head hang toward the floor.',
    setup: [
      'Step your feet wide, toes pointing forward.',
      'Lengthen your spine, hands on your hips.',
      'Fold forward and rest your hands on the floor or ankles.'
    ],
    cues: ['Press through the outer edges of your feet.', 'Let the crown of your head reach down.', 'Breathe slowly into the backs of your legs.'],
    release: 'Bring your hands to your hips and rise up with a flat back.',
    cautions: ['Rise slowly if you tend to feel lightheaded.'],
    easier: 'Rest your hands on blocks and keep your knees soft.',
    figure: { view: 'front', spine: [0, 0], head: 0, torso: 0.6, armA: [66, 85, 5], armB: [-66, -85, -5], legA: [-45, -45], legB: [45, 45] }
  }),
  pose({
    id: 'goddess',
    name: 'Goddess',
    sanskrit: 'Utkata Konasana',
    family: 'standing',
    level: 'moderate',
    focus: ['legs', 'hips'],
    sided: false,
    summary: 'A wide, grounded squat with the arms in a strong cactus shape.',
    setup: [
      'Step your feet wide and turn your toes out.',
      'Bend your knees and sink your hips down.',
      'Lift your arms, elbows bent, palms forward.'
    ],
    cues: ['Track your knees out over your toes.', 'Keep your tailbone heavy and your chest open.', 'Breathe steadily as your legs warm.'],
    release: 'Straighten your legs and lower your arms.',
    cautions: ['Sink less deeply if your knees feel strained.'],
    easier: 'Rest your hands on your thighs and sink only halfway.',
    figure: { view: 'front', spine: [180, 180], head: 180, armA: [-90, 180], armB: [90, 180], legA: [-62, 0, -88], legB: [62, 0, 88] }
  }),
  pose({
    id: 'high-lunge',
    name: 'High lunge',
    sanskrit: 'Ashta Chandrasana',
    family: 'standing',
    level: 'moderate',
    focus: ['legs', 'hips'],
    sided: true,
    summary: 'A balanced lunge on the ball of the back foot, arms reaching up.',
    setup: [
      'Step one foot back into a long stance, back heel lifted.',
      'Bend your front knee over the ankle.',
      'Reach your arms overhead.'
    ],
    cues: ['Press back through your back heel.', 'Keep your hips level and facing forward.', 'Lift your belly and your chest.'],
    release: 'Lower your hands to the floor beside your front foot.',
    easier: 'Lower the back knee to the floor.',
    figure: { view: 'side', spine: [178, 182], head: 180, armA: [182, 180], armB: [180, 178], legA: [72, 0, 90], legB: [-57, -57, 40] }
  }),
  pose({
    id: 'low-lunge',
    name: 'Low lunge',
    sanskrit: 'Anjaneyasana',
    family: 'kneeling',
    level: 'gentle',
    focus: ['hips'],
    sided: true,
    summary: 'Lower the back knee and let the hips sink to open the front of the hip.',
    setup: [
      'Step one foot forward between your hands.',
      'Lower your back knee to the mat.',
      'Lift your chest and reach your arms up.'
    ],
    cues: ['Let your hips sink forward and down.', 'Feel the stretch along the front of your back hip.', 'Draw your lower belly gently in.'],
    release: 'Bring your hands down beside your front foot.',
    cautions: ['Pad your back knee with a folded blanket if it feels tender.'],
    easier: 'Keep your hands resting on your front thigh.',
    figure: { view: 'side', spine: [176, 184], head: 184, armA: [184, 186], armB: [182, 184], legA: [88, -12, 90], legB: [-20, -92, -92] }
  }),
  pose({
    id: 'standing-side-bend',
    name: 'Standing side bend',
    sanskrit: 'Indudalasana',
    family: 'standing',
    level: 'gentle',
    focus: ['spine'],
    sided: true,
    summary: 'Reach both arms up and arc gently to one side.',
    setup: [
      'Stand tall and reach both arms overhead.',
      'Clasp your hands.',
      'Arc your upper body over to one side.'
    ],
    cues: ['Keep both feet rooted evenly.', 'Lengthen up before you lean over.', 'Breathe into the long side of your body.'],
    release: 'Breathe in and return to center.',
    easier: 'Keep one hand on your hip and reach just the other arm.',
    figure: { view: 'front', spine: [-174, -160], head: -155, armA: [-172, -150], armB: [-175, -125], legA: [4, 1], legB: [-2, -1] }
  }),
  pose({
    id: 'garland',
    name: 'Garland',
    sanskrit: 'Malasana',
    family: 'standing',
    level: 'moderate',
    focus: ['hips', 'legs'],
    sided: false,
    summary: 'A deep squat that opens the hips and grounds the body.',
    setup: [
      'Stand with your feet wide, toes out.',
      'Bend your knees and sink your hips low.',
      'Press your palms together at your heart.'
    ],
    cues: [
      'Press your elbows gently into your inner knees.',
      'Let your heels stay heavy.',
      'Lift your chest as your hips drop.'
    ],
    release: 'Bring your hands to the floor and sit down gently.',
    cautions: ['Skip deep squatting if you have a knee injury.'],
    easier: 'Sit on a block, or roll a blanket under your heels.',
    figure: { view: 'side', spine: [165, 172], head: 175, armA: [40, -165, 180], armB: [42, -163, 180], legA: [115, -35, 90], legB: [115, -35, 90] }
  }),

  // Balance
  pose({
    id: 'tree',
    name: 'Tree',
    sanskrit: 'Vrksasana',
    family: 'balance',
    level: 'gentle',
    focus: ['balance', 'hips'],
    sided: true,
    summary: 'Root down through one foot and grow tall like a tree.',
    setup: [
      'Shift your weight onto one foot.',
      'Place the other sole on your inner calf or thigh, away from the knee.',
      'Bring your palms together, or reach your arms up.'
    ],
    cues: ['Press your foot and leg into each other.', 'Let the bent knee open out to the side.', 'Find a still point to rest your gaze on.'],
    release: 'Lower your foot and stand evenly on both feet.',
    easier: 'Rest your toes on the floor with your heel against your ankle.',
    figure: { view: 'front', spine: [180, 180], head: 180, armA: [-168, 172], armB: [168, -172], legA: [-55, 78, 10], legB: [0, 0] }
  }),
  pose({
    id: 'warrior-3',
    name: 'Warrior three',
    sanskrit: 'Virabhadrasana III',
    family: 'balance',
    level: 'strong',
    focus: ['balance', 'legs', 'core'],
    sided: true,
    summary: 'Balance on one leg with the body in a long line parallel to the floor.',
    setup: [
      'Stand on one leg with a soft knee.',
      'Hinge forward as the other leg lifts behind you.',
      'Reach your arms forward.'
    ],
    cues: ['Keep your hips level, both pointing toward the floor.', 'Reach back through your lifted heel.', 'Draw your belly in to support your back.'],
    release: 'Lower your lifted foot and rise back to standing.',
    easier: 'Rest your hands on a wall or on blocks.',
    figure: { view: 'side', spine: [88, 88], head: 92, armA: [92, 92], armB: [90, 90], legA: [0, 0], legB: [-88, -88] }
  }),
  pose({
    id: 'half-moon',
    name: 'Half moon',
    sanskrit: 'Ardha Chandrasana',
    family: 'balance',
    level: 'strong',
    focus: ['balance', 'hips', 'legs'],
    sided: true,
    summary: 'Balance on one leg and one hand, with the body open to the side.',
    setup: [
      'From triangle, bend your front knee.',
      'Set your hand on a block ahead of your foot.',
      'Lift your back leg and straighten the standing leg.',
      'Reach your top arm up.'
    ],
    cues: ['Stack your top hip over your bottom hip.', 'Flex your lifted foot and press through the heel.', 'Keep your standing knee soft.'],
    release: 'Bend the standing knee and lower your lifted foot.',
    easier: 'Use a block under your hand, or keep your back against a wall.',
    figure: { view: 'front', spine: [-88, -90], head: -95, hips: 60, armA: [-3, -3], armB: [180, 180], legA: [-6, -6], legB: [88, 88] }
  }),
  pose({
    id: 'eagle',
    name: 'Eagle',
    sanskrit: 'Garudasana',
    family: 'balance',
    level: 'moderate',
    focus: ['balance', 'shoulders', 'hips'],
    sided: true,
    summary: 'Wrap the arms and legs and sit low, balancing on one foot.',
    setup: [
      'Bend your knees and cross one thigh over the other.',
      'Wrap your arms, elbows stacked, palms toward each other.'
    ],
    cues: [
      'Hook your top foot behind your calf, or rest its toes down.',
      'Lift your elbows to shoulder height.',
      'Sink your hips a little lower.',
      'Breathe into the space between your shoulder blades.'
    ],
    release: 'Unwind your arms and legs and stand on both feet.',
    cautions: ['Skip the leg wrap if your knees feel tender.'],
    easier: 'Rest the toes of your top foot on the floor like a kickstand.',
    figure: { view: 'side', spine: [160, 165], head: 165, armA: [95, 180], armB: [93, 178], legA: [55, -30, -40], legB: [45, -15, 90] }
  }),
  pose({
    id: 'dancer',
    name: 'Dancer',
    sanskrit: 'Natarajasana',
    family: 'balance',
    level: 'strong',
    focus: ['balance', 'chest', 'shoulders'],
    sided: true,
    summary: 'Hold one foot behind you and tip forward into a graceful backbend.',
    setup: [
      'Stand on one leg and hold the other foot behind you.',
      'Reach your free arm forward.',
      'Press your foot into your hand and tip forward.'
    ],
    cues: ['Keep your standing knee soft and steady.', 'Lift through your chest as your back leg rises.', 'Fix your gaze on one still point.'],
    release: 'Slowly lower your foot and stand on both legs.',
    cautions: ['Keep the backbend small if your low back feels pinched.'],
    easier: 'Hold a wall or a chair with your free hand.',
    figure: { view: 'side', spine: [125, 115], head: 120, armA: [-108, -108], armB: [130, 130], legA: [-110, 150], legB: [0, 0] }
  }),

  // Arm support
  pose({
    id: 'plank',
    name: 'Plank',
    sanskrit: 'Kumbhakasana',
    family: 'arm-support',
    level: 'moderate',
    focus: ['core', 'shoulders'],
    sided: false,
    summary: 'Hold the body in one strong, straight line from head to heels.',
    setup: [
      'Place your hands under your shoulders.',
      'Step your feet back one at a time.',
      'Make one straight line from your head to your heels.'
    ],
    cues: ['Press the floor away and spread your fingers wide.', 'Draw your belly in and lengthen your tailbone toward your heels.', 'Keep breathing smoothly.'],
    release: 'Lower your knees to the mat and rest.',
    cautions: ['Spread the weight through your whole hand to protect your wrists.'],
    easier: 'Lower your knees and keep a long line from knees to head.',
    figure: { view: 'side', spine: [114, 114], head: 110, armA: [0, 0, 90], armB: [0, 0, 90], legA: [-66, -66, 5], legB: [-66, -66, 5] }
  }),
  pose({
    id: 'knees-chest-chin',
    name: 'Knees, chest, and chin',
    sanskrit: 'Ashtanga Namaskara',
    family: 'arm-support',
    level: 'gentle',
    focus: ['chest', 'shoulders'],
    sided: false,
    summary: 'Lower the knees, chest, and chin to the floor with the hips still lifted.',
    setup: [
      'From plank, lower your knees.',
      'Bend your elbows in close.',
      'Lower your chest and chin between your hands, hips lifted.'
    ],
    cues: ['Keep your elbows hugging in.', 'Let your chest melt down gently.', 'Breathe calmly.'],
    release: 'Lower your hips and lie down on your belly.',
    easier: 'Lower all the way down to your belly.',
    figure: { view: 'side', spine: [44, 60], head: 92, armA: [-110, 17, 90], armB: [-108, 19, 90], legA: [-15, -100, -30], legB: [-15, -100, -30] }
  }),
  pose({
    id: 'chaturanga',
    name: 'Four-limbed staff',
    sanskrit: 'Chaturanga Dandasana',
    family: 'arm-support',
    level: 'strong',
    focus: ['core', 'shoulders'],
    sided: false,
    summary: 'Lower halfway from plank, elbows hugging in, the body straight and strong.',
    setup: [
      'Begin in plank.',
      'Shift forward onto your toes.',
      'Bend your elbows straight back and lower halfway.'
    ],
    cues: ['Keep your elbows close to your ribs.', 'Hold your shoulders at elbow height or a little above.', 'Keep your body in one straight line.'],
    release: 'Lower all the way to the mat.',
    cautions: ['Lower your knees first to protect your shoulders.', 'Skip it with a wrist or shoulder injury.'],
    easier: 'Lower your knees to the mat before bending your elbows.',
    figure: { view: 'side', spine: [100, 100], head: 98, armA: [-95, 0, 90], armB: [-93, 0, 90], legA: [-80, -80, 5], legB: [-80, -80, 5] }
  }),
  pose({
    id: 'side-plank',
    name: 'Side plank',
    sanskrit: 'Vasisthasana',
    family: 'arm-support',
    level: 'strong',
    focus: ['core', 'shoulders', 'balance'],
    sided: true,
    summary: 'Balance on one hand and the edge of one foot, lifting the hips high.',
    setup: ['Begin in plank.', 'Roll onto the outer edge of one foot and stack your feet.', 'Lift your top arm.'],
    cues: ['Press the floor away with your lower hand.', 'Lift your hips so your body forms one long line.', 'Reach up through your top fingertips.'],
    release: 'Lower your top hand and return to plank.',
    cautions: ['Skip it with a wrist or shoulder injury.'],
    easier: 'Lower your bottom knee to the mat for support.',
    figure: { view: 'front', spine: [-123, -123], head: -125, hips: 57, armA: [0, 0, -90], armB: [180, 180], legA: [57, 57], legB: [57, 57] }
  }),
  pose({
    id: 'dolphin',
    name: 'Dolphin',
    sanskrit: 'Ardha Pincha Mayurasana',
    family: 'inversion',
    level: 'moderate',
    focus: ['shoulders', 'hamstrings'],
    sided: false,
    summary: 'Like downward dog on the forearms, building strength in the shoulders.',
    setup: [
      'From hands and knees, lower onto your forearms.',
      'Tuck your toes and lift your hips up and back.',
      'Let your head hang.'
    ],
    cues: ['Press your forearms firmly into the floor.', 'Lift your shoulders away from the floor.', 'Bend your knees to keep your back long.'],
    release: 'Lower your knees to the mat and rest.',
    cautions: ['Skip it with a shoulder injury or high blood pressure.'],
    easier: 'Keep your knees bent and your heels high.',
    figure: { view: 'side', spine: [42, 42], head: 30, armA: [-5, 92, 92], armB: [-3, 92, 92], legA: [-38, -38, 92], legB: [-36, -36, 92] }
  }),
  pose({
    id: 'downward-dog',
    name: 'Downward-facing dog',
    sanskrit: 'Adho Mukha Svanasana',
    family: 'inversion',
    level: 'moderate',
    focus: ['hamstrings', 'shoulders', 'back'],
    sided: false,
    summary: 'An upside down V that lengthens the spine and the backs of the legs.',
    setup: [
      'From hands and knees, tuck your toes.',
      'Lift your hips up and back.',
      'Straighten your legs as much as feels good.'
    ],
    cues: ['Spread your fingers and press through your whole hand.', 'Lengthen from your wrists to your hips.', 'Let your heels drift toward the floor without forcing them.'],
    release: 'Lower your knees to the mat.',
    cautions: ['Keep your knees bent if your hamstrings are tight.', 'Hold it briefly if you have high blood pressure.'],
    easier: 'Bend your knees generously and lift your heels.',
    figure: { view: 'side', spine: [48, 50], head: 35, armA: [50, 50, 90], armB: [52, 52, 90], legA: [-35, -35, 95], legB: [-33, -33, 93] }
  }),
  pose({
    id: 'upward-dog',
    name: 'Upward-facing dog',
    sanskrit: 'Urdhva Mukha Svanasana',
    family: 'arm-support',
    level: 'moderate',
    focus: ['chest', 'spine'],
    sided: false,
    summary: 'Lift the chest forward and up on straight arms, legs hovering above the floor.',
    setup: [
      'Lie on your belly, hands by your ribs.',
      'Press down through your hands and feet.',
      'Straighten your arms and lift your chest and legs.'
    ],
    cues: ['Roll your shoulders back and down.', 'Press the tops of your feet down to lift your legs.', 'Keep your neck long, gaze forward.'],
    release: 'Lower down to your belly.',
    cautions: ['Try cobra instead if your low back feels compressed.', 'Skip it during pregnancy.'],
    easier: 'Practice cobra, with bent elbows and your hips on the floor.',
    figure: { view: 'side', spine: [118, 155], head: 165, armA: [-4, -4, 90], armB: [-2, -2, 90], legA: [-70, -70, -92], legB: [-70, -70, -92] }
  }),

  // Kneeling
  pose({
    id: 'tabletop',
    name: 'Tabletop',
    sanskrit: 'Bharmanasana',
    family: 'kneeling',
    level: 'gentle',
    focus: ['spine', 'core'],
    sided: false,
    summary: 'A neutral hands and knees shape, the base for many floor poses.',
    setup: [
      'Come onto your hands and knees.',
      'Stack your wrists under your shoulders and knees under hips.',
      'Lengthen your spine.'
    ],
    cues: ['Press evenly through both hands.', 'Keep your neck long, gaze down.', 'Let your breath move into your back.'],
    release: 'Sit back onto your heels.',
    cautions: ['Pad your knees with a blanket if they feel tender.'],
    easier: 'Rest on your forearms if your wrists ache.',
    figure: { view: 'side', spine: [106, 106], head: 100, armA: [0, 0, 90], armB: [0, 0, 90], legA: [0, -90, -90], legB: [0, -90, -90] }
  }),
  pose({
    id: 'cat',
    name: 'Cat',
    sanskrit: 'Marjaryasana',
    family: 'kneeling',
    level: 'gentle',
    focus: ['spine', 'back'],
    sided: false,
    summary: 'Round the spine up toward the ceiling, chin toward the chest.',
    setup: ['Begin on your hands and knees.', 'Breathe out and round your back up.', 'Let your head drop.'],
    cues: ['Draw your belly toward your spine.', 'Spread your shoulder blades wide.', 'Tuck your tailbone gently under.'],
    release: 'Return to a flat, neutral back.',
    easier: 'Practice the same shape seated in a chair, hands on your knees.',
    figure: { view: 'side', spine: [125, 60], head: 20, armA: [0, 0, 90], armB: [0, 0, 90], legA: [0, -90, -90], legB: [0, -90, -90] }
  }),
  pose({
    id: 'cow',
    name: 'Cow',
    sanskrit: 'Bitilasana',
    family: 'kneeling',
    level: 'gentle',
    focus: ['spine', 'chest'],
    sided: false,
    summary: 'Let the belly drop and lift the chest and gaze.',
    setup: [
      'Begin on your hands and knees.',
      'Breathe in and let your belly sink.',
      'Lift your chest and gaze forward.'
    ],
    cues: ['Broaden across your collarbones.', 'Keep your shoulders away from your ears.', 'Move with your breath.'],
    release: 'Return to a flat, neutral back.',
    cautions: ['Keep the curve small if your low back feels pinched.'],
    easier: 'Practice the same movement seated in a chair.',
    figure: { view: 'side', spine: [85, 125], head: 150, armA: [0, 0, 90], armB: [0, 0, 90], legA: [0, -90, -90], legB: [0, -90, -90] }
  }),
  pose({
    id: 'thread-the-needle',
    name: 'Thread the needle',
    sanskrit: 'Parsva Balasana',
    family: 'kneeling',
    level: 'gentle',
    focus: ['shoulders', 'spine'],
    sided: true,
    summary: 'Slide one arm under the other and rest the shoulder down in a gentle twist.',
    setup: [
      'Begin on your hands and knees.',
      'Slide one arm under your body, palm up.',
      'Rest that shoulder and the side of your head down.'
    ],
    cues: ['Keep your hips over your knees.', 'Let your upper back soften into the twist.', 'Rest your top hand on the floor, or reach it toward the ceiling.'],
    release: 'Press into your top hand and unwind back to hands and knees.',
    cautions: ['Rest your head on a cushion if your neck feels strained.'],
    easier: 'Keep the twist small and your top hand on the floor.',
    figure: { view: 'side', spine: [60, 70], head: 90, armA: [-85, -85], armB: [180, 180], legA: [0, -90, -90], legB: [0, -90, -90] }
  }),
  pose({
    id: 'bird-dog',
    name: 'Bird dog',
    sanskrit: 'Dandayamana Bharmanasana',
    family: 'kneeling',
    level: 'moderate',
    focus: ['core', 'balance'],
    sided: true,
    summary: 'From hands and knees, reach one arm forward and the opposite leg back.',
    setup: [
      'Begin on your hands and knees.',
      'Reach one arm forward at shoulder height.',
      'Extend the opposite leg straight back at hip height.'
    ],
    cues: ['Keep your hips level and square to the floor.', 'Reach long in both directions.', 'Draw your belly gently in.'],
    release: 'Lower your hand and knee back to the mat.',
    easier: 'Lift only the leg, keeping both hands on the floor.',
    figure: { view: 'side', spine: [106, 106], head: 100, armA: [92, 92], armB: [0, 0, 90], legA: [0, -90, -90], legB: [-90, -90] }
  }),
  pose({
    id: 'child',
    name: 'Child',
    sanskrit: 'Balasana',
    family: 'rest',
    level: 'gentle',
    focus: ['back', 'hips', 'calm'],
    sided: false,
    summary: 'Fold forward over the knees and rest, the forehead on the mat.',
    setup: [
      'Kneel with your big toes together.',
      'Sit your hips back to your heels.',
      'Fold forward and rest your forehead down.'
    ],
    cues: [
      'Let your breath widen your back.',
      'Soften your shoulders and your jaw.',
      'Let your arms rest forward or by your sides.',
      'Let your hips grow heavy.'
    ],
    release: 'Walk your hands back and slowly sit up.',
    cautions: ['Widen your knees if your belly needs room, or during pregnancy.'],
    easier: 'Place a cushion between your hips and heels, or under your forehead.',
    figure: { view: 'side', spine: [108, 62], head: 75, armA: [72, 84, 90], armB: [72, 84, 90], legA: [72, -91, -90], legB: [72, -91, -90] }
  }),
  pose({
    id: 'puppy',
    name: 'Puppy',
    sanskrit: 'Uttana Shishosana',
    family: 'kneeling',
    level: 'gentle',
    focus: ['shoulders', 'chest', 'spine'],
    sided: false,
    summary: 'The hips stay high over the knees as the chest melts toward the mat.',
    setup: [
      'Begin on your hands and knees.',
      'Walk your hands forward, hips over knees.',
      'Melt your chest toward the mat.'
    ],
    cues: ['Reach your hips gently back.', 'Let your chest soften toward the floor.', 'Keep your arms active and your elbows lifted.'],
    release: 'Walk your hands back to hands and knees.',
    cautions: ['Go gently if you have a shoulder injury.'],
    easier: 'Rest your forehead on a block or a cushion.',
    figure: { view: 'side', spine: [36, 66], head: 92, armA: [74, 82, 90], armB: [74, 82, 90], legA: [0, -90, -90], legB: [0, -90, -90] }
  }),
  pose({
    id: 'camel',
    name: 'Camel',
    sanskrit: 'Ustrasana',
    family: 'kneeling',
    level: 'strong',
    focus: ['chest', 'spine'],
    sided: false,
    summary: 'Kneel tall and open into a deep backbend, hands reaching for the heels.',
    setup: [
      'Kneel tall, hips over knees.',
      'Bring your hands to your low back.',
      'Lift your chest and lean back.',
      'Reach for your heels if that feels good.'
    ],
    cues: ['Press your hips forward over your knees.', 'Lift your chest up before you lean back.', 'Keep your neck long, or tuck your chin if that feels better.'],
    release: 'Bring your hands to your low back and rise slowly, leading with your chest.',
    cautions: ['Skip it with a low back or neck injury.', 'Rise slowly if you feel dizzy.'],
    easier: 'Keep your hands on your low back, or tuck your toes to lift your heels.',
    figure: { view: 'side', spine: [-165, -130], head: -100, armA: [-20, -20], armB: [-18, -18], legA: [8, -90, -90], legB: [8, -90, -90] }
  }),
  pose({
    id: 'gate',
    name: 'Gate',
    sanskrit: 'Parighasana',
    family: 'kneeling',
    level: 'gentle',
    focus: ['spine', 'hamstrings'],
    sided: true,
    summary: 'Kneel on one knee, extend the other leg to the side, and bend toward it.',
    setup: [
      'Kneel tall and extend one leg out to the side.',
      'Rest your hand on that leg.',
      'Reach your other arm up and over.'
    ],
    cues: ['Keep your hips facing forward.', 'Lengthen the side of your waist.', 'Breathe into your top ribs.'],
    release: 'Reach back up to center and bring your knees together.',
    cautions: ['Pad your kneeling knee with a blanket.'],
    easier: 'Keep your top hand on your hip.',
    figure: { view: 'front', spine: [-160, -135], head: -130, armA: [-35, -30], armB: [-160, -125], legA: [-59, -59, -100], legB: [2, 178] }
  }),
  pose({
    id: 'half-splits',
    name: 'Half splits',
    sanskrit: 'Ardha Hanumanasana',
    family: 'kneeling',
    level: 'moderate',
    focus: ['hamstrings'],
    sided: true,
    summary: 'Shift the hips back over the back knee and straighten the front leg.',
    setup: [
      'From a low lunge, shift your hips back.',
      'Straighten your front leg and flex the foot.',
      'Fold forward over the leg.'
    ],
    cues: ['Keep your hips stacked over your back knee.', 'Soften the front knee if the stretch feels sharp.', 'Lead with your chest, not your head.'],
    release: 'Bend your front knee and come back into your lunge.',
    cautions: ['Pad your back knee with a blanket.'],
    easier: 'Place blocks under your hands.',
    figure: { view: 'side', spine: [88, 80], head: 85, armA: [-15, 64, 90], armB: [-13, 66, 90], legA: [57, 57], legB: [0, -90, -90] }
  }),
  pose({
    id: 'lizard',
    name: 'Lizard',
    sanskrit: 'Utthan Pristhasana',
    family: 'kneeling',
    level: 'moderate',
    focus: ['hips'],
    sided: true,
    summary: 'A deep lunge with both hands inside the front foot to open the hips.',
    setup: [
      'From a lunge, bring both hands inside your front foot.',
      'Lower your back knee, or keep it lifted.'
    ],
    cues: [
      'Let your front foot step toward the edge of the mat.',
      'Let your hips sink low.',
      'Keep your front knee pointing over your toes.',
      'Lower onto your forearms if you feel open.'
    ],
    release: 'Bring your hands under your shoulders and step back.',
    cautions: ['Pad your back knee with a blanket.'],
    easier: 'Rest your hands on blocks and keep the back knee down.',
    figure: { view: 'side', spine: [100, 98], head: 100, armA: [0, 0, 90], armB: [2, 2, 90], legA: [95, -25, 90], legB: [-75, -88, -92] }
  }),
  pose({
    id: 'pigeon',
    name: 'Pigeon',
    sanskrit: 'Eka Pada Rajakapotasana',
    family: 'seated',
    level: 'moderate',
    focus: ['hips'],
    sided: true,
    summary: 'A deep hip opener with one shin across the mat and the other leg long behind.',
    setup: [
      'From hands and knees, bring one knee forward behind your wrist.',
      'Slide the other leg straight back.',
      'Rest your hands beside your hips.'
    ],
    cues: [
      'Angle your front shin across the mat as far as feels easy.',
      'Keep your hips level, with a cushion underneath if needed.',
      'Flex your front foot to protect the knee.',
      'Let each breath soften the outer hip.'
    ],
    release: 'Tuck your back toes, press into your hands, and return to hands and knees.',
    cautions: ['If your front knee hurts, try figure four on your back instead.'],
    easier: 'Place a cushion under the hip of the front leg.',
    figure: { view: 'side', spine: [178, 182], head: 182, armA: [6, 10, 90], armB: [8, 12, 90], legA: [86, -92, -95], legB: [-88, -90, -92] }
  }),

  // Prone
  pose({
    id: 'cobra',
    name: 'Cobra',
    sanskrit: 'Bhujangasana',
    family: 'prone',
    level: 'gentle',
    focus: ['chest', 'spine', 'back'],
    sided: false,
    summary: 'Lift the chest from the floor with the hands lightly supporting you.',
    setup: [
      'Lie on your belly, hands beside your ribs.',
      'Press the tops of your feet down.',
      'Breathe in and lift your chest.'
    ],
    cues: ['Lift with your back muscles more than your hands.', 'Draw your shoulders back and down.', 'Keep the back of your neck long.'],
    release: 'Breathe out and lower slowly to the mat.',
    cautions: ['Keep the lift low if your back feels pinched.', 'Skip lying on your belly later in pregnancy.'],
    easier: 'Stay low, or come onto your forearms in sphinx.',
    figure: { view: 'side', spine: [118, 150], head: 160, armA: [-10, 30, 90], armB: [-8, 30, 90], legA: [-92, -90, -95], legB: [-90, -90, -95] }
  }),
  pose({
    id: 'sphinx',
    name: 'Sphinx',
    sanskrit: 'Salamba Bhujangasana',
    family: 'prone',
    level: 'gentle',
    focus: ['spine', 'chest'],
    sided: false,
    summary: 'Rest on the forearms with a long, gentle curve in the spine.',
    setup: [
      'Lie on your belly.',
      'Place your elbows under your shoulders, forearms parallel.',
      'Press into your forearms and lift your chest.'
    ],
    cues: ['Draw your chest forward between your arms.', 'Let your belly and legs stay heavy.', 'Relax your face and jaw.'],
    release: 'Lower your chest and rest your head on your hands.',
    cautions: ['Skip lying on your belly later in pregnancy.'],
    easier: 'Slide your elbows further forward for a softer curve.',
    figure: { view: 'side', spine: [108, 128], head: 150, armA: [-2, 92, 92], armB: [0, 92, 92], legA: [-92, -90, -95], legB: [-90, -90, -95] }
  }),
  pose({
    id: 'locust',
    name: 'Locust',
    sanskrit: 'Salabhasana',
    family: 'prone',
    level: 'moderate',
    focus: ['back', 'core'],
    sided: false,
    summary: 'Lift the chest, arms, and legs from the floor to strengthen the back body.',
    setup: ['Lie on your belly, arms by your sides.', 'Breathe in and lift your chest, arms, and legs.'],
    cues: ['Reach back through your fingertips and toes.', 'Keep your neck long, gaze down.', 'Breathe steadily.'],
    release: 'Breathe out and lower everything to the mat.',
    cautions: ['Skip lying on your belly later in pregnancy.', 'Go gently with a low back injury.'],
    easier: 'Lift only your chest, or one leg at a time.',
    figure: { view: 'side', spine: [100, 112], head: 106, armA: [-104, -104], armB: [-102, -102], legA: [-104, -104, -98], legB: [-102, -102, -98] }
  }),
  pose({
    id: 'bow',
    name: 'Bow',
    sanskrit: 'Dhanurasana',
    family: 'prone',
    level: 'strong',
    focus: ['chest', 'shoulders', 'spine'],
    sided: false,
    summary: 'Hold the ankles and lift into a bow shape, opening the whole front body.',
    setup: [
      'Lie on your belly and bend your knees.',
      'Reach back and hold your ankles.',
      'Press your feet into your hands to lift.'
    ],
    cues: ['Keep your knees about hip width apart.', 'Let the press of your legs lift you.', 'Keep breathing, even if the breath feels short.'],
    release: 'Breathe out, lower slowly, and let go of your ankles.',
    cautions: ['Skip it with a low back or neck injury.', 'Skip it during pregnancy.'],
    easier: 'Hold one ankle at a time.',
    figure: { view: 'side', spine: [112, 125], head: 130, armA: [-108, -108], armB: [-106, -106], legA: [-110, 140], legB: [-108, 142] }
  }),

  // Seated
  pose({
    id: 'easy-seat',
    name: 'Easy seat',
    sanskrit: 'Sukhasana',
    family: 'seated',
    level: 'gentle',
    focus: ['hips', 'calm'],
    sided: false,
    summary: 'A simple cross-legged seat for breathing and meditation.',
    setup: ['Sit and cross your legs at the shins.', 'Rest your hands on your knees.', 'Sit tall.'],
    cues: ['Feel your sit bones rooted beneath you.', 'Let your shoulders settle.', 'Let the breath come and go on its own.'],
    release: 'Uncross your legs and stretch them out.',
    easier: 'Sit on a folded blanket or cushion so your hips are above your knees.',
    figure: { view: 'front', spine: [180, 180], head: 180, armA: [-25, -30], armB: [25, 30], legA: [-80, 88], legB: [80, -88] }
  }),
  pose({
    id: 'staff',
    name: 'Staff',
    sanskrit: 'Dandasana',
    family: 'seated',
    level: 'gentle',
    focus: ['back', 'hamstrings', 'core'],
    sided: false,
    summary: 'Sit tall with the legs straight forward, the foundation for seated poses.',
    setup: [
      'Sit with your legs straight out in front.',
      'Flex your feet.',
      'Press your hands down beside your hips and sit tall.'
    ],
    cues: ['Press the backs of your legs gently down.', 'Lift your chest and soften your shoulders.', 'Breathe evenly.'],
    release: 'Relax your legs and shake them out gently.',
    easier: 'Sit on a folded blanket and bend your knees slightly.',
    figure: { view: 'side', spine: [180, 180], head: 180, armA: [0, 2, 2], armB: [2, 4, 4], legA: [86, 86], legB: [86, 86] }
  }),
  pose({
    id: 'seated-forward-fold',
    name: 'Seated forward fold',
    sanskrit: 'Paschimottanasana',
    family: 'seated',
    level: 'gentle',
    focus: ['hamstrings', 'back', 'calm'],
    sided: false,
    summary: 'Fold forward over straight legs with a long spine.',
    setup: [
      'Sit with your legs straight out in front.',
      'Breathe in and reach up.',
      'Breathe out and fold forward, holding your shins or feet.'
    ],
    cues: ['Lead with your chest to keep your spine long.', 'Bend your knees if your back rounds a lot.', 'Let each breath out take you a little deeper.'],
    release: 'Breathe in and roll up slowly to sitting.',
    cautions: ['Keep your knees bent if your low back is sensitive.'],
    easier: 'Sit on a cushion and loop a strap around your feet.',
    figure: { view: 'side', spine: [128, 112], head: 102, armA: [35, 75, 180], armB: [33, 73, 180], legA: [86, 86], legB: [86, 86] }
  }),
  pose({
    id: 'head-to-knee',
    name: 'Head to knee',
    sanskrit: 'Janu Sirsasana',
    family: 'seated',
    level: 'gentle',
    focus: ['hamstrings', 'hips'],
    sided: true,
    summary: 'Fold over one straight leg with the other foot resting against the inner thigh.',
    setup: [
      'Sit with your legs out in front.',
      'Bend one knee and rest that foot against the other inner thigh.',
      'Fold forward over the straight leg.'
    ],
    cues: ['Keep your spine long as you fold.', 'Let the bent knee relax toward the floor.', 'Breathe into the back of the straight leg.'],
    release: 'Roll up slowly and straighten both legs.',
    cautions: ['Support the bent knee with a cushion if it does not reach the floor.'],
    easier: 'Sit on a cushion and loop a strap around your foot.',
    figure: { view: 'side', spine: [128, 112], head: 102, armA: [35, 75, 180], armB: [33, 73, 180], legA: [86, 86], legB: [104, -72, -80] }
  }),
  pose({
    id: 'bound-angle',
    name: 'Bound angle',
    sanskrit: 'Baddha Konasana',
    family: 'seated',
    level: 'gentle',
    focus: ['hips'],
    sided: false,
    summary: 'Sit with the soles of the feet together and the knees open wide.',
    setup: [
      'Sit tall and bring the soles of your feet together.',
      'Let your knees fall open.',
      'Hold your feet.'
    ],
    cues: ['Lengthen up through your spine.', 'Let your knees relax down without pushing them.', 'Breathe into your hips.'],
    release: 'Use your hands to bring your knees together and stretch your legs out.',
    cautions: ['Support your knees with cushions if your inner thighs feel strained.'],
    easier: 'Sit on a folded blanket and slide your feet further away.',
    figure: { view: 'front', spine: [180, 180], head: 180, armA: [-8, 20], armB: [8, -20], legA: [-72, 70], legB: [72, -70] }
  }),
  pose({
    id: 'wide-seated-forward-fold',
    name: 'Wide-angle seated forward fold',
    sanskrit: 'Upavistha Konasana',
    family: 'seated',
    level: 'moderate',
    focus: ['hamstrings', 'hips'],
    sided: false,
    summary: 'Open the legs wide and walk the hands forward between them.',
    setup: [
      'Sit with your legs open wide, toes pointing up.',
      'Walk your hands forward and fold from your hips.'
    ],
    cues: ['Keep your spine long rather than rounding down.', 'Press the backs of your legs into the floor.', 'Breathe, and let gravity do the work.'],
    release: 'Walk your hands back and sit upright.',
    easier: 'Sit on a cushion and keep your hands close to your body.',
    figure: { view: 'front', spine: [180, 180], head: 180, torso: 0.6, armA: [-60, -70], armB: [60, 70], legA: [-82, -82, 180], legB: [82, 82, 180] }
  }),
  pose({
    id: 'seated-twist',
    name: 'Seated twist',
    sanskrit: 'Ardha Matsyendrasana',
    family: 'seated',
    level: 'gentle',
    focus: ['spine', 'back'],
    sided: true,
    summary: 'Sit tall and turn the torso around a bent knee.',
    setup: [
      'Sit tall and bend one knee, foot outside the other thigh.',
      'Hug the knee with your opposite arm.',
      'Place your other hand behind you and turn.'
    ],
    cues: ['Lengthen first, then twist.', 'Turn from your belly, then your ribs, then your head.', 'Keep both sit bones grounded.'],
    release: 'Breathe out, unwind slowly, and face forward.',
    cautions: ['Keep the twist gentle if your back is sensitive.'],
    easier: 'Keep the bottom leg straight and the twist small.',
    figure: { view: 'front', spine: [180, 180], head: 175, armA: [-20, -10], armB: [-66, -70], legA: [-140, 0], legB: [80, -88] }
  }),
  pose({
    id: 'boat',
    name: 'Boat',
    sanskrit: 'Navasana',
    family: 'seated',
    level: 'strong',
    focus: ['core', 'balance'],
    sided: false,
    summary: 'Balance on the sit bones with the legs lifted and the arms reaching forward.',
    setup: [
      'Sit with your knees bent and feet down.',
      'Lean back and lift your feet.',
      'Reach your arms forward.'
    ],
    cues: ['Lift your chest and keep your spine long.', 'Draw your belly in.', 'Keep breathing steadily.'],
    release: 'Lower your feet to the floor and rest.',
    cautions: ['Skip it during pregnancy.', 'Keep your knees bent if your low back strains.'],
    easier: 'Keep your knees bent and hold the backs of your thighs.',
    figure: { view: 'side', spine: [-150, -152], head: -165, armA: [90, 90], armB: [88, 88], legA: [135, 135, 140], legB: [135, 135, 140] }
  }),
  pose({
    id: 'hero',
    name: 'Hero',
    sanskrit: 'Virasana',
    family: 'kneeling',
    level: 'gentle',
    focus: ['legs', 'calm'],
    sided: false,
    summary: 'Kneel and sit between or on the heels, with a tall, quiet spine.',
    setup: [
      'Kneel with your knees together.',
      'Sit back between your feet, or on a block.',
      'Rest your hands on your thighs.'
    ],
    cues: ['Sit tall through the crown of your head.', 'Let your shoulders relax.', 'Breathe slowly.'],
    release: 'Lean forward onto your hands and stretch your legs back.',
    cautions: ['Sit on a block if your knees feel strained.', 'Skip it with a knee injury.'],
    easier: 'Sit on a block or a stack of cushions.',
    figure: { view: 'side', spine: [180, 180], head: 180, armA: [18, 28, 72], armB: [20, 30, 72], legA: [72, -91, -90], legB: [72, -91, -90] }
  }),
  pose({
    id: 'seated-side-bend',
    name: 'Seated side bend',
    sanskrit: 'Parsva Sukhasana',
    family: 'seated',
    level: 'gentle',
    focus: ['spine'],
    sided: true,
    summary: 'From a cross-legged seat, reach one arm overhead and lean to the side.',
    setup: [
      'Sit cross legged.',
      'Place one hand on the floor beside your hip.',
      'Reach the other arm up and over toward that side.'
    ],
    cues: ['Keep both sit bones heavy.', 'Breathe into the long side of your body.', 'Let your neck relax.'],
    release: 'Reach back up to center and lower your arm.',
    easier: 'Rest your lower forearm on a cushion beside you.',
    figure: { view: 'front', spine: [-165, -140], head: -140, armA: [-20, -5], armB: [-150, -125], legA: [-80, 88], legB: [80, -88] }
  }),
  pose({
    id: 'neck-release',
    name: 'Neck release',
    family: 'seated',
    level: 'gentle',
    focus: ['neck', 'calm'],
    sided: true,
    summary: 'Let the head tilt to one side for a soft stretch along the neck.',
    setup: ['Sit tall.', 'Let one ear drop toward its shoulder.', 'Rest that hand lightly on your head.'],
    cues: ['Let the opposite shoulder grow heavy.', 'Keep your breath slow.', 'Soften your jaw and your face.'],
    release: 'Lift your head slowly back to center.',
    cautions: ['Move gently, and stop if you feel tingling or sharp pain.'],
    easier: 'Leave the hand down and simply let the head tilt.',
    figure: { view: 'front', spine: [180, 180], head: -135, armA: [-160, 85, 100], armB: [25, 30], legA: [-80, 88], legB: [80, -88] }
  }),
  pose({
    id: 'chair-seat',
    name: 'Seated on a chair',
    family: 'seated',
    level: 'gentle',
    focus: ['calm', 'spine'],
    sided: false,
    summary: 'Sit tall near the front of a chair with both feet flat on the floor.',
    setup: [
      'Sit near the front of a sturdy chair.',
      'Plant your feet hip width apart.',
      'Rest your hands on your thighs and sit tall.'
    ],
    cues: ['Stack your shoulders over your hips.', 'Feel your feet on the floor.', 'Breathe slowly and easily.'],
    release: 'Sit back and let the chair support you.',
    easier: 'Sit back against the chair for support.',
    figure: { view: 'side', spine: [180, 180], head: 180, armA: [18, 50, 90], armB: [20, 52, 90], legA: [90, 0, 90], legB: [88, 2, 90], prop: 'chair' }
  }),

  // Supine
  pose({
    id: 'bridge',
    name: 'Bridge',
    sanskrit: 'Setu Bandha Sarvangasana',
    family: 'supine',
    level: 'moderate',
    focus: ['back', 'chest', 'legs'],
    sided: false,
    summary: 'Lift the hips from the floor with the feet planted, opening the chest.',
    setup: [
      'Lie on your back, knees bent, feet flat.',
      'Rest your arms by your sides.',
      'Press into your feet and lift your hips.'
    ],
    cues: ['Keep your knees pointing forward, over your ankles.', 'Press your arms and shoulders down.', 'Lift your chest toward your chin.'],
    release: 'Lower your spine slowly to the mat, one part at a time.',
    cautions: ['Keep your head still while your hips are lifted.'],
    easier: 'Rest your sacrum on a block under your hips.',
    figure: { view: 'side', spine: [-66, -74], head: -90, armA: [92, 92, 92], armB: [92, 92, 92], legA: [112, 2, 90], legB: [112, 2, 90] }
  }),
  pose({
    id: 'supine-twist',
    name: 'Supine twist',
    sanskrit: 'Supta Matsyendrasana',
    family: 'supine',
    level: 'gentle',
    focus: ['spine', 'back', 'calm'],
    sided: true,
    summary: 'Lie back and let both knees fall to one side for a restful twist.',
    setup: [
      'Lie on your back and hug your knees in.',
      'Open your arms wide.',
      'Let both knees fall to one side.'
    ],
    cues: ['Let your shoulders stay heavy on the mat.', 'Turn your head the other way if your neck allows.', 'Let each breath out soften you into the floor.'],
    release: 'Bring your knees back to center.',
    cautions: ['Twist gently if your back is sensitive.'],
    easier: 'Rest your knees on a cushion.',
    figure: { view: 'top', spine: [180, 180], head: 180, armA: [-90, -90], armB: [90, 90], legA: [-75, 0], legB: [-80, -5] }
  }),
  pose({
    id: 'knees-to-chest',
    name: 'Knees to chest',
    sanskrit: 'Apanasana',
    family: 'supine',
    level: 'gentle',
    focus: ['back', 'calm'],
    sided: false,
    summary: 'Hug both knees in and let the low back release.',
    setup: [
      'Lie on your back.',
      'Draw both knees toward your chest.',
      'Hold your shins or the backs of your thighs.'
    ],
    cues: ['Let your low back settle into the mat.', 'Rock gently side to side if it feels good.', 'Breathe into your belly against your thighs.'],
    release: 'Release your feet to the mat with your knees bent.',
    easier: 'Hold behind your thighs instead of your shins.',
    figure: { view: 'side', spine: [-90, -90], head: -90, armA: [125, 135], armB: [123, 133], legA: [-135, 100], legB: [-133, 102] }
  }),
  pose({
    id: 'happy-baby',
    name: 'Happy baby',
    sanskrit: 'Ananda Balasana',
    family: 'supine',
    level: 'gentle',
    focus: ['hips', 'back'],
    sided: false,
    summary: 'Hold the feet with the knees wide and the soles toward the ceiling.',
    setup: [
      'Lie on your back and draw your knees in.',
      'Open your knees wide.',
      'Hold the outsides of your feet, soles up.'
    ],
    cues: ['Stack your ankles over your knees.', 'Let your tailbone rest toward the mat.', 'Rock gently if it feels good.'],
    release: 'Let go of your feet and lower them to the mat.',
    easier: 'Hold behind your knees, or loop a strap over each foot.',
    figure: { view: 'side', spine: [-90, -90], head: -90, armA: [160, 162, 160], armB: [158, 160, 158], legA: [-135, 180, -90], legB: [-133, 180, -90] }
  }),
  pose({
    id: 'supine-figure-four',
    name: 'Figure four on the back',
    sanskrit: 'Sucirandhrasana',
    family: 'supine',
    level: 'gentle',
    focus: ['hips'],
    sided: true,
    summary: 'Cross one ankle over the opposite knee to open the outer hip.',
    setup: [
      'Lie on your back, knees bent, feet flat.',
      'Cross one ankle over the opposite knee.',
      'Flex the top foot.'
    ],
    cues: [
      'Let the crossed knee open away from you.',
      'For more, lift the bottom foot and hold behind that thigh.',
      'Keep your head and shoulders resting down.',
      'Breathe into the outer hip.'
    ],
    release: 'Uncross your legs and set both feet on the mat.',
    easier: 'Keep your bottom foot on the floor.',
    figure: { view: 'side', spine: [-90, -90], head: -90, armA: [92, 92, 92], armB: [92, 92, 92], legA: [170, 62], legB: [140, 5, 90] }
  }),
  pose({
    id: 'reclined-bound-angle',
    name: 'Reclined bound angle',
    sanskrit: 'Supta Baddha Konasana',
    family: 'supine',
    level: 'gentle',
    focus: ['hips', 'calm'],
    sided: false,
    summary: 'Lie back with the soles together and the knees open, fully at rest.',
    setup: [
      'Lie on your back, knees bent.',
      'Bring the soles of your feet together.',
      'Let your knees fall open.'
    ],
    cues: ['Let your belly soften with each breath.', 'Let gravity open your hips.', 'Feel your back resting on the floor.'],
    release: 'Use your hands to bring your knees together.',
    cautions: ['Support your knees with cushions if your inner thighs feel strained.'],
    easier: 'Place a cushion under each knee.',
    figure: { view: 'top', spine: [180, 180], head: 180, armA: [-25, -15], armB: [25, 15], legA: [-50, 50], legB: [50, -50] }
  }),
  pose({
    id: 'legs-up-the-wall',
    name: 'Legs up the wall',
    sanskrit: 'Viparita Karani',
    family: 'inversion',
    level: 'gentle',
    focus: ['calm', 'hamstrings'],
    sided: false,
    summary: 'Rest on your back with your legs resting up a wall.',
    setup: [
      'Sit sideways against a wall.',
      'Swing your legs up as you lie back.',
      'Rest your arms by your sides.'
    ],
    cues: ['Let the backs of your legs rest on the wall.', 'Let your belly rise and fall.', 'Let your whole body grow heavy.'],
    release: 'Bend your knees, roll to one side, and rest before sitting up.',
    cautions: ['Skip it if you have glaucoma.'],
    easier: 'Move your hips a little away from the wall.',
    figure: { view: 'side', spine: [-90, -90], head: -90, armA: [84, 84, 90], armB: [84, 84, 90], legA: [180, 180, -150], legB: [180, 180, -150], prop: 'wall' }
  }),
  pose({
    id: 'fish',
    name: 'Fish',
    sanskrit: 'Matsyasana',
    family: 'supine',
    level: 'moderate',
    focus: ['chest', 'neck'],
    sided: false,
    summary: 'Lift the chest on the forearms and let the head rest back lightly.',
    setup: [
      'Lie on your back, legs long.',
      'Tuck your hands under your hips.',
      'Press into your forearms and lift your chest.',
      'Rest the crown of your head lightly down.'
    ],
    cues: ['Keep most of your weight in your forearms.', 'Lift your chest toward the ceiling.', 'Breathe into your upper chest.'],
    release: 'Lift your head, then lower your back slowly to the mat.',
    cautions: ['Skip it with a neck injury.', 'Keep almost no weight on your head.'],
    easier: 'Rest your upper back on a block or a folded blanket.',
    figure: { view: 'side', spine: [-128, -72], head: -46, armA: [56, 90, 90], armB: [58, 90, 90], legA: [86, 86], legB: [86, 86] }
  }),
  pose({
    id: 'reclined-hamstring',
    name: 'Reclined hand to big toe',
    sanskrit: 'Supta Padangusthasana',
    family: 'supine',
    level: 'gentle',
    focus: ['hamstrings'],
    sided: true,
    summary: 'Lie back and lift one leg with a strap to lengthen the back of the leg.',
    setup: [
      'Lie on your back, legs long.',
      'Loop a strap or towel around one foot.',
      'Lift that leg toward the ceiling.'
    ],
    cues: ['Keep the lower leg heavy on the mat.', 'Press up through the lifted heel.', 'Relax your shoulders onto the floor.'],
    release: 'Bend the knee, let go of the strap, and lower the leg.',
    easier: 'Bend the bottom knee and set that foot flat on the floor.',
    figure: { view: 'side', spine: [-90, -90], head: -90, armA: [150, 165], armB: [148, 163], legA: [178, 178, -92], legB: [88, 88], prop: 'strap' }
  }),
  pose({
    id: 'side-lying-leg-raise',
    name: 'Side-lying leg raise',
    family: 'supine',
    level: 'gentle',
    focus: ['hips', 'legs', 'core'],
    sided: true,
    summary: 'Lie on one side and lift the top leg to strengthen the outer hip.',
    setup: [
      'Lie on one side, legs long and stacked.',
      'Rest your head on your lower arm.',
      'Place your top hand on the floor in front.'
    ],
    cues: ['Lift the top leg slowly, then lower it with control.', 'Keep your hips stacked, without rolling back.', 'Breathe out as you lift.'],
    release: 'Lower your leg and roll onto your back.',
    easier: 'Bend the bottom knee for a steadier base.',
    figure: { view: 'front', spine: [-90, -90], head: -100, hips: 90, armA: [-92, -92], armB: [20, 0, 90], legA: [90, 90], legB: [125, 125] }
  }),
  pose({
    id: 'corpse',
    name: 'Corpse',
    sanskrit: 'Savasana',
    family: 'rest',
    level: 'gentle',
    focus: ['calm'],
    sided: false,
    summary: 'Lie still on your back and let the whole body rest.',
    setup: [
      'Lie on your back, legs relaxed apart.',
      'Rest your arms by your sides, palms up.',
      'Close your eyes.'
    ],
    cues: ['Let the floor hold your full weight.', 'Let your breath be natural.', 'Soften your face, your jaw, and your belly.'],
    release: 'Deepen your breath, roll to one side, and rest there before sitting up.',
    easier: 'Place a cushion under your knees and a blanket over your body.',
    figure: { view: 'top', spine: [180, 180], head: 180, armA: [-18, -16], armB: [18, 16], legA: [-6, -6], legB: [6, 6] }
  })
]
