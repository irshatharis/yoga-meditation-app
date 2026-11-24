import { Figure } from '../figure/Figure'
import { useApp } from '../state/app'
import { Icon } from '../ui/icons'
import { useBack } from '../ui/kit'
import { GetTheApp } from '../ui/install'
import { FEEDBACK_EMAIL, feedbackHref, SOURCE_URL } from '../seo'
import { LICENSE, SOURCES } from '../content/demos'

const SOUNDS = [
  ['Singing bowl', 'zambolino', 'https://freesound.org/people/zambolino/sounds/439235/'],
  ['Bowl strike', 'dersinnsspace', 'https://freesound.org/people/dersinnsspace/sounds/421829/'],
  ['Temple gong', 'kerozenne', 'https://freesound.org/people/kerozenne/sounds/803159/'],
  ['Chime', 'pazdalma', 'https://freesound.org/people/pazdalma/sounds/718293/'],
  ['Rain', 'unfa', 'https://freesound.org/people/unfa/sounds/177479/'],
  ['Ocean', 'derjuli', 'https://freesound.org/people/derjuli/sounds/693388/'],
  ['Forest', 'upkey', 'https://freesound.org/people/upkey/sounds/826326/'],
  ['Stream', 'yurkobb', 'https://freesound.org/people/yurkobb/sounds/393335/']
] as const

export default function About() {
  const app = useApp()
  const tree = () => app.pose('tree')?.figure
  const back = useBack(() => '/')
  return (
    <main class="page prose">
      <header class="topbar">
        <button class="icon-btn" aria-label="Back" onClick={back}>
          <Icon name="back" />
        </button>
      </header>
      <div class="empty" style={{ padding: '0' }}>
        {tree() && <Figure pose={tree()!} title="" />}
      </div>
      <h1 class="display">
        still<span style={{ color: 'var(--accent)' }}>.</span>
      </h1>
      <p class="lede">A free, quiet place for yoga, breathwork and meditation. No account, no ads, no tracking. Everything you do stays on your device, and the whole app works offline once it has loaded.</p>

      <GetTheApp />

      <section class="card pad" id="feedback">
        <h2 class="display">Say hello</h2>
        <p>still. is made by one person. Ideas, bugs, a pose you miss or a note that it helped. Every message is read.</p>
        <a class="btn primary block" href={feedbackHref()}>
          <Icon name="mail" size={18} /> Email feedback
        </a>
        <p class="small muted" style={{ 'text-align': 'center' }}>
          Or write to <a class="link" href={`mailto:${FEEDBACK_EMAIL}`}>{FEEDBACK_EMAIL}</a>
        </p>
      </section>

      <section class="card pad" id="open-source">
        <h2 class="display">Open source</h2>
        <p>Every line of still. is public and free to reuse under the MIT License. Read the code, report a bug or suggest a change on GitHub.</p>
        <a class="btn block" href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
          <Icon name="code" size={18} /> View the code on GitHub
        </a>
      </section>

      <section class="card pad">
        <h2 class="display">Practice safely</h2>
        <p>Yoga is generally safe for healthy people when practiced with care, but injuries can happen. Move slowly, stay within a comfortable range, and stop if anything hurts, if you feel dizzy, or if your breathing becomes strained.</p>
        <ul>
          <li>Talk to a health professional before starting if you are pregnant, are older, or have a health condition such as high blood pressure, glaucoma, sciatica, or a joint or spine problem. Many poses can be adapted.</li>
          <li>During pregnancy, avoid hot rooms and long periods lying flat on your back.</li>
          <li>Breathwork should never strain. Return to normal breathing if you feel lightheaded.</li>
          <li>Meditation can occasionally bring up difficult feelings. It is fine to open your eyes and stop.</li>
        </ul>
        <p class="small muted">Safety guidance adapted from the National Center for Complementary and Integrative Health, "Yoga: What You Need To Know" (public domain). NCCIH does not endorse this app. still. is not medical advice.</p>
      </section>

      <section class="card pad">
        <h2 class="display">How your data is kept</h2>
        <p>Practices you create, your journal and your settings are stored in this browser on this device only. Nothing is uploaded. Use Settings, Your data, to export a backup file or move to a new device. Share links carry a practice inside the link itself, so they work without any server.</p>
      </section>

      <section class="card pad">
        <h2 class="display">Credits</h2>
        <p>Pose illustrations are drawn by still. from a shared body model, so every figure can move smoothly into the next. All instructions, cues, meditation scripts and practices are original writing based on long-standing public practices: sun salutations, hatha and yin sequences, mindfulness of breathing, body scan, loving-kindness, noting, box breathing, coherent breathing and alternate nostril breathing.</p>
        <p>Sounds are recordings released into the public domain (CC0) on freesound.org. Thank you to:</p>
        <ul>
          {SOUNDS.map(([what, who, href]) => (
            <li>
              {what} by{' '}
              <a class="link" href={href} target="_blank" rel="noopener noreferrer">
                {who}
              </a>
            </li>
          ))}
        </ul>
        <p>
          Pose videos are cut from yoga videos on YouTube by{' '}
          {Object.values(SOURCES).map((source, i, all) => (
            <>
              {i > 0 && (i === all.length - 1 ? ' and ' : ', ')}
              <a class="link" href={source.url} target="_blank" rel="noopener noreferrer">
                {source.by}
              </a>
            </>
          ))}
          , released under{' '}
          <a class="link" href={LICENSE.url} target="_blank" rel="noopener noreferrer">
            {LICENSE.name}
          </a>
          . still. trims, crops and mutes each clip. None of them endorse this app.
        </p>
        <p>Typefaces are Fraunces and Inter, under the SIL Open Font License. Icons are drawn in the style of Lucide (ISC).</p>
        <p>
          The code, practices and writing in still. are released under the{' '}
          <a class="link" href={`${SOURCE_URL}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer">
            MIT License
          </a>
          .
        </p>
      </section>
      <p class="small muted" style={{ 'text-align': 'center' }}>
        Version {__APP_VERSION__}
      </p>
    </main>
  )
}
