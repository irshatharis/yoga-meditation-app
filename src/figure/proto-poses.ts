import type { FigurePose } from './skeleton'

export const proto: Record<string, FigurePose> = {
  mountain: { view: 'side', spine: [180, 180], head: 180, armA: [4, 2], armB: [-2, -2], legA: [0, 0], legB: [0, 0] },
  downDog: { view: 'side', spine: [50, 52], head: 40, armA: [52, 52], armB: [54, 54], legA: [-32, -32, 92], legB: [-30, -30, 90] },
  warrior2: { view: 'front', spine: [180, 180], head: 180, armA: [-90, -90], armB: [90, 90], legA: [-82, 0, -90], legB: [55, 55] },
  tree: { view: 'front', spine: [180, 180], head: 180, armA: [-168, 172], armB: [168, -172], legA: [-55, 78, 10], legB: [0, 0] },
  child: { view: 'side', spine: [62, 96], head: 70, armA: [100, 92], armB: [102, 92], legA: [62, -90, -90], legB: [64, -90, -90] },
  cobra: { view: 'side', spine: [118, 150], head: 160, armA: [-12, 25], armB: [-10, 25], legA: [-92, -90, -95], legB: [-90, -90, -95] },
  triangle: { view: 'front', spine: [-108, -108], head: -110, armA: [0, 0], armB: [180, 180], legA: [-35, -35, -90], legB: [35, 35] },
  pigeon: { view: 'side', spine: [172, 178], head: 176, armA: [8, 2], armB: [14, 4], legA: [96, -100, -150], legB: [-100, -92, -95] }
}
