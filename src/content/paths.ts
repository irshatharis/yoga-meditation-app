import { pathId, practiceId, type Path } from '../domain/types'

const day = (practice: string, note: string) => ({ practice: practiceId(practice), note })

export const PATHS: Path[] = [
  {
    id: pathId('first-week-of-yoga'),
    title: 'First week of yoga',
    summary: 'Seven short practices that build a steady, friendly start.',
    kind: 'yoga',
    days: [
      day('beginner-foundations', 'Meet the basic poses. Go slowly and use the easier options freely.'),
      day('gentle-wake-up', 'A short, easy day. Notice how the poses from yesterday feel today.'),
      day('lower-back-relief', 'Small movements for the spine. Comfort is the goal, not depth.'),
      day('sun-salutation-a', 'Your first flow. Let the breath lead and take the knees down whenever you like.'),
      day('balance-and-focus', 'Balance takes practice. Wobbling and falling out are part of learning.'),
      day('evening-wind-down', 'A slow day to recover. Try it in the evening before bed.'),
      day('beginner-foundations', 'Return to day one and notice what has changed in a single week.')
    ]
  },
  {
    id: pathId('ten-days-of-meditation'),
    title: 'Ten days of meditation',
    summary: 'Ten days, ten techniques, one simple habit.',
    kind: 'meditation',
    days: [
      day('breathing-space', 'Three minutes is enough to begin. Just show up.'),
      day('breath-awareness', 'The core skill. Each time you notice the mind has wandered, you are doing it right.'),
      day('body-scan', 'Move from the head to the toes. Falling asleep is fine, though staying awake is the aim.'),
      day('noting', 'Name what you notice with a soft word. It helps you step back from busy thoughts.'),
      day('walking-meditation', 'Take the practice for a walk. A hallway is plenty of space.'),
      day('loving-kindness', 'Practice goodwill. Feelings may or may not come, and either is fine.'),
      day('gratitude', 'Give the good things in your life some attention.'),
      day('open-awareness', 'Let go of a single focus and rest in everything at once.'),
      day('guided-meditation', 'Bring it all together in one longer sit.'),
      day('silent-meditation', 'Sit on your own. Try ten minutes, or whatever length feels right.')
    ]
  },
  {
    id: pathId('breathe-better'),
    title: 'Breathe better',
    summary: 'Five days to learn the breath patterns that calm and focus you.',
    kind: 'breath',
    days: [
      day('extended-exhale', 'Start with the simplest calming tool. Breathe out longer than you breathe in.'),
      day('box-breathing', 'Four equal sides. Keep the holds easy and never strain.'),
      day('coherent-breathing', 'A slow, even rhythm. Let the breath be soft rather than deep.'),
      day('alternate-nostril', 'Learn the hand position first. The pattern settles in after a few rounds.'),
      day('relaxing-breath', 'A long, slow exhale for winding down. Try it before sleep.')
    ]
  }
]
