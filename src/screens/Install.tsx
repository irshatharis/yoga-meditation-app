import { createMemo, createSignal, For, Show } from "solid-js";
import { stepsFor, type Device } from "../domain/install";
import { useApp } from "../state/app";
import { promptInstall, thisDevice, useInstallWay } from "../pwa";
import { SITE_URL } from "../seo";
import { Icon } from "../ui/icons";
import { InstallArt } from "../ui/install";
import { Segmented, toast, useBack } from "../ui/kit";

const DEVICES = [
  { value: "iphone", label: "iPhone" },
  { value: "android", label: "Android" },
  { value: "computer", label: "Computer" },
] as const;

export default function Install() {
  const app = useApp();
  const back = useBack(() => "/");
  const way = useInstallWay();
  const here = thisDevice();
  const [device, setDevice] = createSignal<Device>(here);
  const onThis = () => device() === here;
  const steps = createMemo(() => stepsFor(device(), way(), here));
  const hasData = () => app.logs().length > 0 || app.userPractices().length > 0;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(SITE_URL);
      toast("Link copied. Paste it into Safari.");
    } catch {
      toast(`Open ${SITE_URL.replace("https://", "")} in Safari.`);
    }
  };

  return (
    <main class="page prose install">
      <header class="topbar">
        <button class="icon-btn" aria-label="Back" onClick={back}>
          <Icon name="back" />
        </button>
      </header>

      <div>
        <h1 class="display">
          Put still. on your <em>home screen.</em>
        </h1>
        <p class="lede">
          It opens like any other app, full screen, and works with no signal. It
          takes about twenty seconds.
        </p>
      </div>

      <Show when={onThis() && way() === "installed"}>
        <section class="banner">
          <Icon name="check" />
          <div class="grow small">
            <strong>still. is installed.</strong>
            <div class="muted">
              Open it from your home screen. Your practices and journal live
              there.
            </div>
          </div>
        </section>
      </Show>

      <Show when={onThis() && way() === "prompt"}>
        <button
          class="btn primary block install-now"
          onClick={() => void promptInstall()}
        >
          <Icon name="download" size={18} /> Install still.
        </button>
      </Show>

      <Show when={onThis() && way() === "ios-elsewhere"}>
        <section class="banner">
          <Icon name="info" />
          <div class="grow small">
            <strong>Open this page in Safari first.</strong>
            <div class="muted">
              On iPhone, the app you are in now cannot add still. to the Home
              Screen. Safari can.
            </div>
          </div>
          <button class="btn small primary" onClick={() => void copyLink()}>
            Copy link
          </button>
        </section>
      </Show>

      <Show when={onThis() && way() === "unsupported"}>
        <section class="banner">
          <Icon name="info" />
          <div class="grow small">
            <strong>This browser cannot install apps.</strong>
            <div class="muted">
              still. works here just as it is. To install it, open{" "}
              {SITE_URL.replace("https://", "")} in Chrome, Edge or Safari.
            </div>
          </div>
        </section>
      </Show>

      <Segmented
        label="Device"
        value={device()}
        options={DEVICES}
        onChange={setDevice}
      />

      <Show when={!(onThis() && (way() === "prompt" || way() === "installed"))}>
        <ol class="install-steps">
          <For each={steps()}>
            {(step, i) => (
              <li class="card install-step">
                <InstallArt scene={step.scene} />
                <p>
                  <span class="install-num">{i() + 1}</span>
                  {step.text}
                </p>
              </li>
            )}
          </For>
        </ol>
      </Show>

      <Show when={steps()[0]?.scene === "safari-bar"}>
        <p class="small muted">
          On iOS 18 or earlier, the Share button sits in the bar at the bottom
          of Safari, so step 2 is not needed.
        </p>
      </Show>
      <Show when={device() === "iphone"}>
        <section class="card pad">
          <h2 class="display">Install before you begin</h2>
          <p>
            On iPhone, the app on your Home Screen keeps its own journal and
            practices, apart from Safari. Safari can also clear a website's data
            after a week away. The installed app keeps it.
          </p>
          <Show when={onThis() && hasData()}>
            <p>
              To bring what you have here,{" "}
              <a class="link" href="/settings#data">
                save a backup in Settings
              </a>
              , then restore it inside the app.
            </p>
          </Show>
        </section>
      </Show>
    </main>
  );
}
