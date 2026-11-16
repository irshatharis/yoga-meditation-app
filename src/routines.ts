export type PracticeStep = {
  id: string
  title: string
  duration: number
  instruction: string
  cue?: string
}

export type PracticeRoutine = {
  id: string
  title: string
  subtitle: string
  steps: PracticeStep[]
}

export const yogaRoutine: PracticeRoutine = {
  id: 'hatha-basics',
  title: 'Hatha yoga',
  subtitle: 'A gentle full-body morning sequence',
  steps: [
    { id: 'child', title: "Child's pose", duration: 30, instruction: 'Rest your hips towards your heels. Let your forehead soften towards the mat.', cue: 'Breathe slowly and comfortably.' },
    { id: 'cat-cow', title: 'Cat-cow', duration: 60, instruction: 'Move slowly between rounding and gently arching your spine.', cue: 'One smooth breath for each movement.' },
    { id: 'sun-salutation', title: 'Sun salutation', duration: 180, instruction: 'Move through two slow rounds of your familiar sun salutation.', cue: 'Keep the movement comfortable. Take breaks whenever you need.' },
    { id: 'warrior-ii-left', title: 'Warrior II · left', duration: 30, instruction: 'Bend your front knee gently, extend your arms, and keep the knee tracking towards your toes.' },
    { id: 'warrior-ii-right', title: 'Warrior II · right', duration: 30, instruction: 'Switch sides. Set your feet comfortably and extend your arms.' },
    { id: 'warrior-i-left', title: 'Supported Warrior I · left', duration: 30, instruction: 'Use a wall or chair for balance. Keep your stance shorter if needed.' },
    { id: 'warrior-i-right', title: 'Supported Warrior I · right', duration: 30, instruction: 'Switch sides. Keep your hips and lower back comfortable.' },
    { id: 'lunge-left', title: 'Low lunge · left', duration: 30, instruction: 'Lower your back knee onto a cushion if helpful. Gently shift forward without forcing your hip.' },
    { id: 'lunge-right', title: 'Low lunge · right', duration: 30, instruction: 'Switch sides. Keep the movement small and steady.' },
    { id: 'butterfly', title: 'Butterfly', duration: 45, instruction: 'Bring the soles of your feet together. Let your knees relax without pushing them down.' },
    { id: 'pigeon-left', title: 'Pigeon · left', duration: 30, instruction: 'Set up gently. Keep the front knee comfortable; use supine figure four instead if you feel knee pressure.' },
    { id: 'pigeon-right', title: 'Pigeon · right', duration: 30, instruction: 'Switch sides, or choose supine figure four if that feels better for your knee.' },
    { id: 'malasana', title: 'Supported malasana', duration: 30, instruction: 'Use a block or sturdy support under you. Keep your heels supported if they do not reach the floor.' },
    { id: 'leg-raises-left', title: 'Side-lying leg raises · left', duration: 45, instruction: 'Lie on your side and lift the top leg with your toes pointing forward. Keep your pelvis steady.', cue: 'Move slowly. Quality matters more than height.' },
    { id: 'leg-raises-right', title: 'Side-lying leg raises · right', duration: 45, instruction: 'Switch sides and repeat with a steady pelvis.' },
    { id: 'bridge', title: 'Bridge', duration: 60, instruction: 'Lift your hips by pressing through your feet and engaging your glutes. Avoid over-arching your lower back.', cue: 'Do controlled repetitions, resting between them.' },
    { id: 'knees-chest', title: 'Apanasana · knees to chest', duration: 40, instruction: 'Gently draw your knees towards your chest and relax your lower back.' },
    { id: 'savasana', title: 'Shavasana', duration: 120, instruction: 'Lie comfortably, let your body settle, and allow your breathing to return to normal.' }
  ]
}

export const silentMeditation: PracticeRoutine = {
  id: 'silent-meditation',
  title: 'Silent meditation',
  subtitle: 'A quiet 15-minute sit',
  steps: [
    { id: 'silent-sit', title: 'Sit in silence', duration: 15 * 60, instruction: 'Sit comfortably. Let your attention rest naturally. When the mind wanders, gently return to the present.' }
  ]
}

export const guidedMeditation: PracticeRoutine = {
  id: 'guided-meditation',
  title: 'Guided meditation',
  subtitle: 'A gentle introduction to mindfulness',
  steps: [
    { id: 'arrive', title: 'Arrive', duration: 2 * 60, instruction: 'Find a posture that feels both relaxed and alert. Let your hands rest. Notice the contact between your body and the ground.', cue: 'There is nothing you need to achieve right now.' },
    { id: 'body', title: 'Notice the body', duration: 3 * 60, instruction: 'Bring attention to the sensations in your body. Notice areas of contact, warmth, coolness, or tension without needing to change them.', cue: 'If you notice tension, allow it to be there.' },
    { id: 'breath', title: 'Observe the breath', duration: 5 * 60, instruction: 'Notice the natural rhythm of breathing. Feel the breath where it is easiest to notice, perhaps at the nostrils, chest, or abdomen.', cue: 'Do not control the breath. Simply know that you are breathing.' },
    { id: 'thoughts', title: 'Notice thoughts', duration: 3 * 60, instruction: 'When thoughts appear, notice that thinking is happening. You do not need to follow the thought or push it away. Gently return to the breath.', cue: 'Wandering is not failure. Returning is the practice.' },
    { id: 'close', title: 'Close gently', duration: 2 * 60, instruction: 'Let go of the focus on the breath. Notice your whole body and the sounds around you. When you are ready, slowly open your eyes.', cue: 'Take your time before getting up.' }
  ]
}
