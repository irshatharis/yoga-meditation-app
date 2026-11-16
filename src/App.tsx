import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Activity, ArrowLeft, Check, ChevronRight, CircleHelp, Clock3, Leaf, Pause, Play, RotateCcw, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { guidedMeditation, silentMeditation, yogaRoutine, type PracticeRoutine, type PracticeStep } from './routines'

type Tab = 'today' | 'yoga' | 'meditation'
type MeditationMode = 'silent' | 'guided'
type Settings = { yogaRounds: number; meditationMinutes: number; voice: boolean }

const DEFAULT_SETTINGS: Settings = { yogaRounds: 2, meditationMinutes: 15, voice: true }
const STORAGE_KEY = 'still-practice-settings-v1'

function readSettings(): Settings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
  } catch { return DEFAULT_SETTINGS }
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function speak(text: string, enabled: boolean) {
  if (!enabled || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.88
  utterance.pitch = 0.95
  window.speechSynthesis.speak(utterance)
}

function bell() {
  try {
    const ctx = new AudioContext()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 660
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.025)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.1)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 1.15)
    oscillator.onended = () => void ctx.close()
  } catch { /* Audio may be unavailable; the timer still works. */ }
}

function buildYoga(settings: Settings): PracticeRoutine {
  return {
    ...yogaRoutine,
    steps: yogaRoutine.steps.map(step => step.id === 'sun-salutation'
      ? { ...step, duration: settings.yogaRounds * 90, instruction: `Move through ${settings.yogaRounds} slow rounds of your familiar sun salutation.` }
      : step)
  }
}

function Session({ routine, voice, onExit }: { routine: PracticeRoutine; voice: boolean; onExit: () => void }) {
  const [index, setIndex] = useState(0)
  const [remaining, setRemaining] = useState(routine.steps[0].duration)
  const [running, setRunning] = useState(false)
  const [complete, setComplete] = useState(false)
  const [announced, setAnnounced] = useState(false)
  const step = routine.steps[index]
  const total = routine.steps.reduce((sum, item) => sum + item.duration, 0)
  const elapsedBefore = routine.steps.slice(0, index).reduce((sum, item) => sum + item.duration, 0)
  const elapsed = elapsedBefore + step.duration - remaining
  const progress = Math.min(100, (elapsed / total) * 100)

  useEffect(() => {
    setRemaining(step.duration)
    setAnnounced(false)
    if (running) speak(`${step.title}. ${step.instruction}`, voice)
  }, [index]) // intentionally announces only when the step changes

  useEffect(() => {
    if (!running || complete) return
    const timer = window.setInterval(() => {
      setRemaining(current => {
        if (current <= 1) {
          if (index < routine.steps.length - 1) {
            setIndex(next => next + 1)
          } else {
            setRunning(false)
            setComplete(true)
            bell()
            speak('Practice complete. Take your time.', voice)
          }
          return 0
        }
        if (current === 11 && !announced) {
          setAnnounced(true)
          speak('Ten seconds remaining.', voice)
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [running, complete, index, routine.steps.length, announced, voice])

  useEffect(() => () => { window.speechSynthesis?.cancel() }, [])

  const start = () => {
    if (complete) {
      setIndex(0)
      setRemaining(routine.steps[0].duration)
      setComplete(false)
    }
    setRunning(true)
    if (!complete) speak(`${step.title}. ${step.instruction}`, voice)
  }
  const next = () => {
    if (index < routine.steps.length - 1) {
      setIndex(i => i + 1)
      setRemaining(routine.steps[index + 1].duration)
      setComplete(false)
    } else {
      setRunning(false); setComplete(true); bell()
    }
  }
  const previous = () => {
    if (index > 0) {
      setIndex(i => i - 1)
      setRemaining(routine.steps[index - 1].duration)
      setComplete(false)
    }
  }
  const reset = () => {
    setRunning(false); setComplete(false); setIndex(0); setRemaining(routine.steps[0].duration)
    window.speechSynthesis?.cancel()
  }

  if (complete) return (
    <main className="session-wrap">
      <button className="back-button" onClick={onExit}><ArrowLeft size={17}/> Back to practice</button>
      <section className="complete-card">
        <div className="complete-icon"><Check size={28}/></div>
        <p className="eyebrow">SESSION COMPLETE</p>
        <h1>Well practised.</h1>
        <p>You made time for yourself. Take a moment before moving on with your day.</p>
        <button className="primary-button" onClick={reset}><RotateCcw size={17}/> Repeat session</button>
      </section>
    </main>
  )

  return (
    <main className="session-wrap">
      <button className="back-button" onClick={onExit}><ArrowLeft size={17}/> Exit session</button>
      <div className="session-heading">
        <p className="eyebrow">{routine.title.toUpperCase()}</p>
        <h1>{step.title}</h1>
        <p>{step.instruction}</p>
        {step.cue && <p className="session-cue">{step.cue}</p>}
      </div>
      <div className="timer-orb">
        <div className="timer-inner">
          <span className="timer-label">{running ? 'TIME LEFT' : 'READY WHEN YOU ARE'}</span>
          <strong>{formatTime(remaining)}</strong>
          <span className="step-counter">Step {index + 1} of {routine.steps.length}</span>
        </div>
      </div>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }}/></div>
      <div className="session-controls">
        <button className="icon-button" aria-label="Previous step" onClick={previous} disabled={index === 0}><SkipBack size={19}/></button>
        <button className="play-button" onClick={() => running ? setRunning(false) : start()}>{running ? <><Pause size={20}/> Pause</> : <><Play size={20} fill="currentColor"/> {remaining === step.duration ? 'Begin' : 'Resume'}</>}</button>
        <button className="icon-button" aria-label="Next step" onClick={next}><SkipForward size={19}/></button>
      </div>
      <div className="session-footer">
        <button className="text-button" onClick={reset}><RotateCcw size={15}/> Restart</button>
        <span>{formatTime(total)} total</span>
        <span className="voice-indicator">{voice ? <Volume2 size={15}/> : <VolumeX size={15}/>} Voice {voice ? 'on' : 'off'}</span>
      </div>
      <div className="up-next">
        <p className="eyebrow">UP NEXT</p>
        {routine.steps[index + 1] ? <div className="next-row"><span>{routine.steps[index + 1].title}</span><span>{formatTime(routine.steps[index + 1].duration)}</span></div> : <div className="next-row"><span>Finish and rest</span><Check size={16}/></div>}
      </div>
    </main>
  )
}

function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [meditationMode, setMeditationMode] = useState<MeditationMode>('silent')
  const [settings, setSettings] = useState<Settings>(readSettings)
  const [session, setSession] = useState<PracticeRoutine | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showYogaDetails, setShowYogaDetails] = useState(false)

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)) }, [settings])

  const yoga = useMemo(() => buildYoga(settings), [settings])
  const meditation = meditationMode === 'silent'
    ? { ...silentMeditation, steps: [{ ...silentMeditation.steps[0], duration: settings.meditationMinutes * 60 }] }
    : guidedMeditation
  const yogaMinutes = Math.round(yoga.steps.reduce((sum, s) => sum + s.duration, 0) / 60)
  const meditationMinutes = Math.round(meditation.steps.reduce((sum, s) => sum + s.duration, 0) / 60)

  if (session) return <Session routine={session} voice={settings.voice} onExit={() => setSession(null)}/>

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" onClick={e => { e.preventDefault(); setTab('today') }}><span className="brand-mark"><Leaf size={19}/></span><span>still<span className="brand-dot">.</span></span></a>
        <button className="settings-button" onClick={() => setShowSettings(v => !v)}><span className="settings-dot"/> Settings</button>
      </header>

      <main className="main-content">
        <div className="welcome">
          <p className="eyebrow">YOUR DAILY PRACTICE</p>
          <h1>A little space<br/><em>for yourself.</em></h1>
          <p className="welcome-copy">Move gently. Sit quietly. Begin again.</p>
        </div>

        <nav className="tabs" aria-label="Practice sections">
          <button className={tab === 'today' ? 'tab active' : 'tab'} onClick={() => setTab('today')}>Today</button>
          <button className={tab === 'yoga' ? 'tab active' : 'tab'} onClick={() => setTab('yoga')}>Yoga</button>
          <button className={tab === 'meditation' ? 'tab active' : 'tab'} onClick={() => setTab('meditation')}>Meditation</button>
        </nav>

        {showSettings && <section className="settings-panel">
          <div className="panel-heading"><div><p className="eyebrow">PREFERENCES</p><h2>Your practice</h2></div><button className="close-button" onClick={() => setShowSettings(false)}>Done</button></div>
          <label className="setting-row"><span><strong>Sun salutations</strong><small>Number of rounds</small></span><select value={settings.yogaRounds} onChange={e => setSettings(s => ({ ...s, yogaRounds: Number(e.target.value) }))}><option value={1}>1 round</option><option value={2}>2 rounds</option><option value={3}>3 rounds</option><option value={4}>4 rounds</option></select></label>
          <label className="setting-row"><span><strong>Silent meditation</strong><small>Session duration</small></span><select value={settings.meditationMinutes} onChange={e => setSettings(s => ({ ...s, meditationMinutes: Number(e.target.value) }))}><option value={5}>5 minutes</option><option value={10}>10 minutes</option><option value={15}>15 minutes</option><option value={20}>20 minutes</option><option value={30}>30 minutes</option></select></label>
          <label className="setting-row"><span><strong>Voice instructions</strong><small>Spoken pose and meditation cues</small></span><input type="checkbox" checked={settings.voice} onChange={e => setSettings(s => ({ ...s, voice: e.target.checked }))}/></label>
          <p className="settings-note"><CircleHelp size={14}/> Settings are saved on this device.</p>
        </section>}

        {tab === 'today' && <section className="today-view">
          <div className="daily-summary">
            <div><span className="summary-label">YOUR MORNING FLOW</span><strong>{yogaMinutes + meditationMinutes} <small>min</small></strong><span className="summary-sub">Yoga + meditation</span></div>
            <div className="summary-art"><span>☼</span></div>
          </div>
          <PracticeCard icon={<Activity size={20}/>} tag="MOVEMENT" title="Hatha yoga" description="Your gentle full-body sequence" duration={`${yogaMinutes} min`} onStart={() => setSession(yoga)} onDetails={() => { setTab('yoga'); setShowYogaDetails(true) }}/>
          <PracticeCard icon={<Leaf size={20}/>} tag="STILLNESS" title="Meditation" description={meditationMode === 'silent' ? 'A quiet sit, with no guidance' : 'Gentle mindfulness instructions'} duration={`${meditationMinutes} min`} onStart={() => setSession(meditation)} onDetails={() => setTab('meditation')}/>
          <p className="gentle-note">There is no need to do everything perfectly. Adjust the practice to how your body feels today.</p>
        </section>}

        {tab === 'yoga' && <section className="detail-view">
          <div className="section-intro"><div className="section-icon"><Activity size={22}/></div><div><p className="eyebrow">MOVEMENT</p><h2>Hatha yoga</h2><p>Your current 18-step morning sequence.</p></div></div>
          <div className="routine-meta"><span><Clock3 size={15}/> {yogaMinutes} minutes</span><span>{yoga.steps.length} steps</span></div>
          <div className="step-list">{yoga.steps.map((step, i) => <div className="step-row" key={step.id}><span className="step-number">{String(i + 1).padStart(2, '0')}</span><span className="step-name">{step.title}</span><span className="step-duration">{formatTime(step.duration)}</span></div>)}</div>
          <button className="primary-button full-button" onClick={() => setSession(yoga)}><Play size={17} fill="currentColor"/> Start yoga</button>
          <p className="small-disclaimer">Move within a comfortable range. Use supine figure four instead of pigeon if pigeon creates knee discomfort. Stop if you feel dizzy, unusually breathless, or experience chest discomfort.</p>
        </section>}

        {tab === 'meditation' && <section className="detail-view">
          <div className="section-intro"><div className="section-icon meditation-icon"><Leaf size={22}/></div><div><p className="eyebrow">STILLNESS</p><h2>Meditation</h2><p>Choose how you'd like to sit today.</p></div></div>
          <div className="mode-switch">
            <button className={meditationMode === 'silent' ? 'mode-option selected' : 'mode-option'} onClick={() => setMeditationMode('silent')}><span className="mode-symbol">◯</span><strong>Silent</strong><small>{settings.meditationMinutes} minutes</small></button>
            <button className={meditationMode === 'guided' ? 'mode-option selected' : 'mode-option'} onClick={() => setMeditationMode('guided')}><span className="mode-symbol">☼</span><strong>Guided</strong><small>15 minutes</small></button>
          </div>
          <div className="meditation-description">
            {meditationMode === 'silent'
              ? <><h3>Simply sit.</h3><p>No instructions during the session. Settle into a comfortable posture, let your attention rest, and gently return when you notice your mind has wandered. A bell marks the end.</p></>
              : <><h3>A gentle structure.</h3><p>Move through five stages: arrive, notice the body, observe the breath, notice thoughts, and close gently. The instructions are spoken at the beginning of each stage, then you have space to practise.</p></>}
          </div>
          <div className="routine-meta"><span><Clock3 size={15}/> {meditationMinutes} minutes</span><span>{meditation.steps.length} {meditation.steps.length === 1 ? 'stage' : 'stages'}</span></div>
          {meditationMode === 'guided' && <div className="step-list">{meditation.steps.map((step, i) => <div className="step-row" key={step.id}><span className="step-number">{String(i + 1).padStart(2, '0')}</span><span className="step-name">{step.title}</span><span className="step-duration">{formatTime(step.duration)}</span></div>)}</div>}
          <button className="primary-button full-button" onClick={() => setSession(meditation)}><Play size={17} fill="currentColor"/> Begin meditation</button>
          <p className="small-disclaimer">The guided session is a simple mindfulness practice, not a substitute for learning with a qualified teacher. You can always return to silent sitting.</p>
        </section>}
      </main>
      <footer className="app-footer"><span>still. · version 0.1</span><span>Made for your mornings</span></footer>
    </div>
  )
}

function PracticeCard({ icon, tag, title, description, duration, onStart, onDetails }: {
  icon: ReactNode; tag: string; title: string; description: string; duration: string; onStart: () => void; onDetails: () => void
}) {
  return <article className="practice-card">
    <div className="card-top"><span className="card-icon">{icon}</span><span className="eyebrow">{tag}</span><span className="card-duration">{duration}</span></div>
    <h2>{title}</h2><p>{description}</p>
    <div className="card-actions"><button className="card-start" onClick={onStart}><Play size={15} fill="currentColor"/> Start</button><button className="card-details" onClick={onDetails}>View routine <ChevronRight size={15}/></button></div>
  </article>
}

export default App
