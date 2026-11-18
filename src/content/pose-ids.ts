// Every built-in pose. Practices may only reference these ids, and
// poses.ts must define each one (checked by tests).
export const POSE_IDS = [
  'mountain', 'upward-salute', 'standing-forward-fold', 'halfway-lift', 'chair', 'warrior-1', 'warrior-2',
  'reverse-warrior', 'extended-side-angle', 'triangle', 'pyramid', 'wide-leg-forward-fold', 'goddess', 'high-lunge',
  'low-lunge', 'standing-side-bend', 'garland',
  'tree', 'warrior-3', 'half-moon', 'eagle', 'dancer',
  'plank', 'knees-chest-chin', 'chaturanga', 'side-plank', 'dolphin', 'downward-dog', 'upward-dog',
  'tabletop', 'cat', 'cow', 'thread-the-needle', 'bird-dog', 'child', 'puppy', 'camel', 'gate', 'half-splits', 'lizard', 'pigeon',
  'cobra', 'sphinx', 'locust', 'bow',
  'easy-seat', 'staff', 'seated-forward-fold', 'head-to-knee', 'bound-angle', 'wide-seated-forward-fold', 'seated-twist', 'boat',
  'hero', 'seated-side-bend', 'neck-release', 'chair-seat',
  'bridge', 'supine-twist', 'knees-to-chest', 'happy-baby', 'supine-figure-four', 'reclined-bound-angle', 'legs-up-the-wall',
  'fish', 'reclined-hamstring', 'side-lying-leg-raise', 'corpse'
] as const

export type BuiltinPoseId = (typeof POSE_IDS)[number]
