import { createSignal, For, onSettled, Show, snapshot } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { useApp } from '../state/app'
import { listVoices, onVoicesChanged, pickVoice, speak } from '../engine/speech'
import { bell, setAmbient, unlockAudio } from '../engine/audio'
import * as db from '../store/db'
import { backupFileName, parseBackup, planMerge, resolveMerge, toBackup, type Conflict, type MergePlan, type ParsedBackup } from '../store/transfer'
import { parseSettings } from '../store/schema'
import { canPromptInstall, isIOS, isStandalone, onInstallAvailable, promptInstall } from '../pwa'
import { Icon } from '../ui/icons'
import { Segmented, Sheet, Stepper, Switch, download, pickFile, plural, toast } from '../ui/kit'
import type { Ambient, BellSound, Settings } from '../domain/types'

function Row(props: { title: string; hint?: string; children: JSX.Element }) {
  return (
    <div class="setting">
      <div>
        <strong>{props.title}</strong>
        <Show when={props.hint}>
          <small>{props.hint}</small>
        </Show>
      </div>
      {props.children}
    </div>
  )
}

function Group(props: { title: string; id?: string; children: JSX.Element }) {
  return (
    <section class="stack" id={props.id}>
      <p class="eyebrow">{props.title}</p>
      <div class="card list" style={{ padding: '0 16px' }}>
        {props.children}
      </div>
    </section>
  )
}

export default function SettingsScreen() {
  const app = useApp()
  const s = app.settings
  const set = (fn: (d: Settings) => void) => app.updateSettings(fn)
  const [voices, setVoices] = createSignal<SpeechSynthesisVoice[]>([])
  const [installable, setInstallable] = createSignal(canPromptInstall())
  const [persisted, setPersisted] = createSignal<boolean | null>(null)
  const [usage, setUsage] = createSignal('')
  const [includeMedia, setIncludeMedia] = createSignal(true)
  const [pending, setPending] = createSignal<{ parsed: ParsedBackup; plan: MergePlan } | null>(null)
  const [conflict, setConflict] = createSignal<Conflict>('copy')
  const [takeSettings, setTakeSettings] = createSignal(false)
  const [erase, setErase] = createSignal(false)
  const [eraseText, setEraseText] = createSignal('')
  let previewTimer = 0

  onSettled(() => {
    const refresh = () => setVoices(listVoices().slice().sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name)))
    refresh()
    const off = onVoicesChanged(refresh)
    const offInstall = onInstallAvailable(() => setInstallable(true))
    void navigator.storage?.persisted?.().then(setPersisted)
    void navigator.storage?.estimate?.().then(e => setUsage(e.usage ? `${(e.usage / 1024 / 1024).toFixed(1)} MB used on this device` : ''))
    if (location.hash === '#data') queueMicrotask(() => document.getElementById('data')?.scrollIntoView({ behavior: 'smooth' }))
    return () => {
      off()
      offInstall()
      clearTimeout(previewTimer)
      setAmbient('none', 0)
    }
  })

  const testVoice = () => {
    unlockAudio()
    speak('Find a comfortable seat, and let your breath slow down.', { voiceURI: s.voice.voiceURI, rate: s.voice.rate, volume: s.sound.volume }, true)
  }
  const testBell = (kind: BellSound) => {
    unlockAudio()
    bell(kind, s.sound.volume)
  }
  const previewAmbient = (kind: Ambient) => {
    unlockAudio()
    clearTimeout(previewTimer)
    setAmbient(kind, s.sound.ambientVolume)
    if (kind !== 'none') previewTimer = window.setTimeout(() => setAmbient('none', 0), 6000)
  }

  const exportAll = async () => {
    const blobs: db.StoredBlob[] = includeMedia() ? await db.getAll<db.StoredBlob>('blobs') : []
    const backup = await toBackup({ settings: structuredClone(snapshot(s)), poses: app.userPoses(), practices: app.userPractices(), logs: app.logs(), blobs }, includeMedia())
    download(backupFileName(), new Blob([JSON.stringify(backup)], { type: 'application/json' }))
    toast('Backup saved to your downloads.')
  }

  const importFile = async () => {
    const file = await pickFile('application/json,.json')
    if (!file) return
    const parsed = parseBackup(await file.text())
    if (!parsed.ok) {
      toast(parsed.message)
      return
    }
    setPending({ parsed: parsed.value, plan: planMerge({ poses: app.userPoses(), practices: app.userPractices(), logs: app.logs() }, parsed.value.backup) })
  }

  const applyImport = async () => {
    const p = pending()
    if (!p) return
    const records = resolveMerge(p.plan, conflict())
    await app.importRecords({ ...records, blobs: p.parsed.blobs, settings: takeSettings() ? parseSettings(p.parsed.backup.settings) : undefined })
    setPending(null)
    toast(`Imported ${plural(records.practices.length, 'practice')}, ${plural(records.poses.length, 'pose')} and ${plural(records.logs.length, 'session')}.`)
  }

  return (
    <main class="page">
      <header class="topbar">
        <button class="icon-btn" aria-label="Back" onClick={() => history.back()}>
          <Icon name="back" />
        </button>
        <strong>Settings</strong>
        <span style={{ width: '44px' }} />
      </header>

      <Show when={!isStandalone()}>
        <section class="banner">
          <Icon name="download" />
          <div class="grow small">
            <strong>Install still.</strong>
            <div class="muted">
              {installable() ? 'Add it to your device. It opens full screen and works offline.' : isIOS() ? 'In Safari, tap Share, then Add to Home Screen.' : 'Use your browser menu and choose Install or Add to Home Screen.'}
            </div>
          </div>
          <Show when={installable()}>
            <button class="btn small primary" onClick={async () => setInstallable(!(await promptInstall()) && canPromptInstall())}>
              Install
            </button>
          </Show>
        </section>
      </Show>

      <Group title="Pacing">
        <Row title="Get ready" hint="Time to move into each new pose, with its name and setup read aloud">
          <Stepper label="get ready time" value={s.pacing.prepareSec} min={0} max={30} step={1} format={v => `${v} s`} onChange={v => set(d => void (d.pacing.prepareSec = v))} />
        </Row>
        <Row title="Switch sides" hint="Pause between the right and left side">
          <Stepper label="switch time" value={s.pacing.switchSec} min={0} max={20} step={1} format={v => `${v} s`} onChange={v => set(d => void (d.pacing.switchSec = v))} />
        </Row>
        <Row title="Wait for me" hint="Pause before each pose until you tap. Great while you learn.">
          <Switch label="Wait for me" checked={s.pacing.waitForMe} onChange={v => set(d => void (d.pacing.waitForMe = v))} />
        </Row>
        <Row title="Countdown ticks" hint="Three soft ticks before each pose begins">
          <Switch label="Countdown ticks" checked={s.sound.countdown} onChange={v => set(d => void (d.sound.countdown = v))} />
        </Row>
      </Group>

      <Group title="Voice">
        <Row title="Voice guidance" hint="Spoken by your device, so it works offline">
          <Switch label="Voice guidance" checked={s.voice.enabled} onChange={v => set(d => void (d.voice.enabled = v))} />
        </Row>
        <Show when={s.voice.enabled}>
          <Row title="How much to say">
            <Segmented
              label="Detail"
              value={s.voice.detail}
              options={[
                { value: 'names', label: 'Names' },
                { value: 'full', label: 'Full' }
              ]}
              onChange={v => set(d => void (d.voice.detail = v))}
            />
          </Row>
          <div class="setting" style={{ 'flex-wrap': 'wrap' }}>
            <div>
              <strong>Voice</strong>
              <small>{pickVoice(s.voice.voiceURI)?.name ?? 'Device default'}</small>
            </div>
            <select class="input" style={{ width: 'auto', 'max-width': '100%' }} value={s.voice.voiceURI ?? ''} onChange={e => set(d => void (d.voice.voiceURI = e.currentTarget.value || null))} aria-label="Voice">
              <option value="">Best available</option>
              <For each={voices()}>{v => <option value={v.voiceURI}>{`${v.name} (${v.lang})`}</option>}</For>
            </select>
          </div>
          <Row title="Speaking pace">
            <input type="range" min="0.7" max="1.2" step="0.02" value={s.voice.rate} onChange={e => set(d => void (d.voice.rate = Number(e.currentTarget.value)))} aria-label="Speaking pace" />
          </Row>
          <div class="setting">
            <small class="muted">On iPhone, more natural voices can be downloaded in Settings, Accessibility, Spoken Content.</small>
            <button class="btn small" onClick={testVoice}>
              <Icon name="volume" size={16} /> Test
            </button>
          </div>
        </Show>
      </Group>

      <Group title="Sound">
        <div class="setting" style={{ 'flex-wrap': 'wrap' }}>
          <div>
            <strong>Bell</strong>
            <small>Marks the start of each pose and the end</small>
          </div>
          <Segmented
            label="Bell"
            value={s.sound.bell}
            options={[
              { value: 'bowl', label: 'Bowl' },
              { value: 'strike', label: 'Strike' },
              { value: 'gong', label: 'Gong' },
              { value: 'chime', label: 'Chime' },
              { value: 'soft', label: 'Soft' }
            ]}
            onChange={v => {
              set(d => void (d.sound.bell = v))
              testBell(v)
            }}
          />
        </div>
        <Row title="Volume">
          <input type="range" min="0" max="1" step="0.05" value={s.sound.volume} onChange={e => set(d => void (d.sound.volume = Number(e.currentTarget.value)))} aria-label="Volume" />
        </Row>
        <div class="setting" style={{ 'flex-wrap': 'wrap' }}>
          <div>
            <strong>Background</strong>
            <small>Plays softly under every practice</small>
          </div>
          <Segmented
            label="Background"
            value={s.sound.ambient}
            options={[
              { value: 'none', label: 'None' },
              { value: 'rain', label: 'Rain' },
              { value: 'ocean', label: 'Ocean' },
              { value: 'forest', label: 'Forest' },
              { value: 'stream', label: 'Stream' },
              { value: 'deep', label: 'Deep' }
            ]}
            onChange={v => {
              set(d => void (d.sound.ambient = v))
              previewAmbient(v)
            }}
          />
        </div>
        <Show when={s.sound.ambient !== 'none'}>
          <Row title="Background volume">
            <input type="range" min="0.05" max="1" step="0.05" value={s.sound.ambientVolume} onChange={e => set(d => void (d.sound.ambientVolume = Number(e.currentTarget.value)))} aria-label="Background volume" />
          </Row>
        </Show>
      </Group>

      <Group title="Device">
        <Row title="Keep screen on" hint="Stops the phone from locking during a practice">
          <Switch label="Keep screen on" checked={s.keepAwake} onChange={v => set(d => void (d.keepAwake = v))} />
        </Row>
        <Row title="Gentle vibration" hint="A soft buzz when a new pose begins (Android)">
          <Switch label="Vibration" checked={s.haptics} onChange={v => set(d => void (d.haptics = v))} />
        </Row>
      </Group>

      <Group title="Appearance">
        <Row title="Theme">
          <Segmented
            label="Theme"
            value={s.theme}
            options={[
              { value: 'system', label: 'Auto' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' }
            ]}
            onChange={v => set(d => void (d.theme = v))}
          />
        </Row>
        <Row title="Motion" hint="Reduce animations and figure morphing">
          <Segmented
            label="Motion"
            value={s.motion}
            options={[
              { value: 'system', label: 'Auto' },
              { value: 'reduce', label: 'Reduced' }
            ]}
            onChange={v => set(d => void (d.motion = v))}
          />
        </Row>
      </Group>

      <Group title="Goals">
        <Row title="Daily goal">
          <Stepper label="daily goal" value={s.goalMin} min={0} max={120} step={5} format={v => (v ? `${v} min` : 'None')} onChange={v => set(d => void (d.goalMin = v))} />
        </Row>
        <Row title="Week starts on">
          <Segmented
            label="Week start"
            value={s.weekStart}
            options={[
              { value: 1, label: 'Monday' },
              { value: 0, label: 'Sunday' }
            ]}
            onChange={v => set(d => void (d.weekStart = v))}
          />
        </Row>
      </Group>

      <Group title="Your data" id="data">
        <div class="setting" style={{ display: 'block' }}>
          <p class="small muted" style={{ margin: '0 0 12px' }}>
            Everything lives only on this device. No account, no server. Export a backup to move to a new phone or keep a copy safe.
            {persisted() === true ? ' Your browser has agreed to keep this data.' : persisted() === false ? ' Install the app to make storage more durable.' : ''} {usage()}
          </p>
          <div class="row wrap">
            <button class="btn small" onClick={() => void exportAll()}>
              <Icon name="download" size={16} /> Export backup
            </button>
            <button class="btn small" onClick={() => void importFile()}>
              <Icon name="upload" size={16} /> Import backup
            </button>
          </div>
          <label class="row small" style={{ 'margin-top': '12px' }}>
            <input type="checkbox" checked={includeMedia()} onChange={e => setIncludeMedia(e.currentTarget.checked)} /> Include my photos and videos (larger file)
          </label>
        </div>
        <Row title="Erase everything" hint="Removes your practices, poses, journal and settings from this device">
          <button class="btn small danger" onClick={() => setErase(true)}>
            Erase
          </button>
        </Row>
      </Group>

      <a class="card pad row" href="/about">
        <Icon name="info" />
        <span class="grow">About still., credits and safety</span>
        <Icon name="chevron" />
      </a>

      <Sheet open={!!pending()} onClose={() => setPending(null)} title="Import">
        <Show when={pending()}>
          {p => (
            <div class="stack">
              <h2 class="display">Import backup</h2>
              <p class="muted" style={{ margin: 0 }}>
                From {new Date(p().parsed.backup.exportedAt).toLocaleDateString(undefined, { dateStyle: 'long' })}.
              </p>
              <ul class="small" style={{ margin: 0, 'padding-left': '1.2em' }}>
                <li>{plural(p().plan.practices.add.length, 'new practice')}, {p().plan.practices.clash.length} you already have</li>
                <li>{plural(p().plan.poses.add.length, 'new pose')}, {p().plan.poses.clash.length} you already have</li>
                <li>
                  {plural(p().plan.logs.add.length, 'journal session')}{p().plan.logs.duplicate ? `, ${p().plan.logs.duplicate} already in your journal` : ''}
                </li>
                <li>{plural(p().parsed.blobs.length, 'photo or video', 'photos and videos')}</li>
              </ul>
              <Show when={p().plan.practices.clash.length + p().plan.poses.clash.length > 0}>
                <Row title="When something already exists">
                  <Segmented
                    label="Conflicts"
                    value={conflict()}
                    options={[
                      { value: 'copy', label: 'Keep both' },
                      { value: 'replace', label: 'Replace' },
                      { value: 'skip', label: 'Skip' }
                    ]}
                    onChange={setConflict}
                  />
                </Row>
              </Show>
              <Row title="Also use its settings">
                <Switch label="Use imported settings" checked={takeSettings()} onChange={setTakeSettings} />
              </Row>
              <button class="btn primary block" onClick={() => void applyImport()}>
                Import
              </button>
            </div>
          )}
        </Show>
      </Sheet>

      <Sheet open={erase()} onClose={() => setErase(false)} title="Erase everything">
        <div class="stack">
          <h2 class="display">Erase everything?</h2>
          <p class="muted">This cannot be undone. Export a backup first if you might want your journal later. Type ERASE to confirm.</p>
          <input class="input" value={eraseText()} onInput={e => setEraseText(e.currentTarget.value)} autocomplete="off" aria-label="Type ERASE to confirm" />
          <button class="btn primary block" disabled={eraseText().trim().toUpperCase() !== 'ERASE'} onClick={() => void app.eraseEverything()}>
            Erase all data
          </button>
        </div>
      </Sheet>
    </main>
  )
}
