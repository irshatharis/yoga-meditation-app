// How this browser puts still. on the home screen. Only Chromium browsers
// offer an install dialog the page can open. Everywhere else the person does
// it from the browser's own menus, so the guide has to show them where.

export type InstallWay =
  | "installed"
  | "prompt"
  | "ios-safari"
  | "ios-safari-legacy"
  | "ios-chrome"
  | "ios-elsewhere"
  | "android-menu"
  | "mac-safari"
  | "desktop-menu"
  | "unsupported";

export type Device = "iphone" | "android" | "computer";

export type Env = {
  ua: string;
  touchPoints: number;
  standalone: boolean;
  canPrompt: boolean;
};

const IOS = /iphone|ipad|ipod/i;
// Other iOS browsers and the browsers inside social and chat apps all say Safari too.
const NOT_SAFARI =
  /CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|FBAN|FBAV|Instagram|Line\/|Twitter|Snapchat|LinkedInApp|Pinterest/i;

export const isIOSDevice = (env: Pick<Env, "ua" | "touchPoints">) =>
  IOS.test(env.ua) || (/Macintosh/.test(env.ua) && env.touchPoints > 1);

export function installWay(env: Env): InstallWay {
  if (env.standalone) return "installed";
  if (env.canPrompt) return "prompt";
  const { ua } = env;
  if (isIOSDevice(env)) {
    if (/CriOS/.test(ua)) return "ios-chrome";
    if (NOT_SAFARI.test(ua) || !/Safari\//.test(ua)) return "ios-elsewhere";
    // Safari 26 moved Share behind the ••• button next to the address.
    return Number(ua.match(/Version\/(\d+)/)?.[1] ?? 26) >= 26
      ? "ios-safari"
      : "ios-safari-legacy";
  }
  if (/Android/i.test(ua)) return "android-menu";
  if (/Firefox\//.test(ua)) return "unsupported";
  if (
    /Macintosh/.test(ua) &&
    /Safari\//.test(ua) &&
    !/Chrome|Chromium|Edg\//.test(ua)
  ) {
    return Number(ua.match(/Version\/(\d+)/)?.[1] ?? 0) >= 17
      ? "mac-safari"
      : "unsupported";
  }
  if (/Chrome|Chromium|Edg\//.test(ua)) return "desktop-menu";
  return "unsupported";
}

export type Scene =
  | "safari-bar"
  | "safari-menu"
  | "safari-legacy-bar"
  | "chrome-ios-bar"
  | "share-sheet"
  | "add-dialog"
  | "home-screen"
  | "android-bar"
  | "android-menu"
  | "desktop-bar"
  | "mac-menu";

export type Step = { text: string; scene: Scene };

const FINISH_IOS: Step[] = [
  {
    text: "Scroll down the list and tap Add to Home Screen.",
    scene: "share-sheet",
  },
  { text: "Leave Open as Web App on, then tap Add.", scene: "add-dialog" },
  {
    text: "Open still. from your Home Screen from now on.",
    scene: "home-screen",
  },
];

export const STEPS: Record<
  Exclude<InstallWay, "installed" | "prompt" | "unsupported" | "ios-elsewhere">,
  Step[]
> = {
  "ios-safari": [
    {
      text: "In Safari, tap the ••• button next to the address.",
      scene: "safari-bar",
    },
    { text: "Tap Share.", scene: "safari-menu" },
    ...FINISH_IOS,
  ],
  "ios-safari-legacy": [
    {
      text: "In Safari, tap the Share button in the bar at the bottom.",
      scene: "safari-legacy-bar",
    },
    ...FINISH_IOS,
  ],
  "ios-chrome": [
    {
      text: "In Chrome, tap the Share button at the right of the address.",
      scene: "chrome-ios-bar",
    },
    ...FINISH_IOS,
  ],
  "android-menu": [
    {
      text: "Tap the ⋮ menu at the top right of your browser.",
      scene: "android-bar",
    },
    { text: "Tap Install app, or Add to home screen.", scene: "android-menu" },
    {
      text: "Open still. from your home screen from now on.",
      scene: "home-screen",
    },
  ],
  "mac-safari": [
    {
      text: "In Safari, open the File menu and choose Add to Dock.",
      scene: "mac-menu",
    },
  ],
  "desktop-menu": [
    {
      text: "Click the install button at the right end of the address bar, then Install.",
      scene: "desktop-bar",
    },
  ],
};

// The way shown when the person picks a device other than the one in hand.
const DEFAULT_WAY: Record<Device, keyof typeof STEPS> = {
  iphone: "ios-safari",
  android: "android-menu",
  computer: "desktop-menu",
};

export const deviceFor = (env: Pick<Env, "ua" | "touchPoints">): Device =>
  isIOSDevice(env)
    ? "iphone"
    : /Android/i.test(env.ua)
      ? "android"
      : "computer";

// The steps for a device. The browser in hand wins when it is on that device.
export function stepsFor(
  device: Device,
  here: InstallWay,
  hereDevice: Device,
): Step[] {
  const way =
    device === hereDevice && here in STEPS
      ? (here as keyof typeof STEPS)
      : DEFAULT_WAY[device];
  return STEPS[way];
}
