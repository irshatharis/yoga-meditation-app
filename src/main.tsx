import { render } from '@solidjs/web'
import { createRouter, useLocation } from '@solidjs/router'
import { Show, createEffect } from 'solid-js'
import type { JSX } from '@solidjs/web'
import './ui/styles.css'
import { AppProvider, loadAll, useApp } from './state/app'
import { requestPersistence } from './store/db'
import { Icon } from './ui/icons'
import { Toaster } from './ui/kit'
import { registerUpdates } from './pwa'
import Today from './screens/Today'
import Practices from './screens/Practices'
import PracticeDetail from './screens/PracticeDetail'
import Builder from './screens/Builder'
import Poses from './screens/Poses'
import PoseDetail from './screens/PoseDetail'
import PoseEditor from './screens/PoseEditor'
import Player from './screens/Player'
import Journal from './screens/Journal'
import SettingsScreen from './screens/Settings'
import About from './screens/About'
import ShareImport from './screens/ShareImport'
import PathDetail from './screens/PathDetail'
import NotFound from './screens/NotFound'

const Router = createRouter({
  routes: [
    { path: '/', component: Today },
    { path: '/practices', component: Practices },
    { path: '/practices/new', component: Builder },
    { path: '/practices/:id', component: PracticeDetail },
    { path: '/practices/:id/edit', component: Builder },
    { path: '/paths/:id', component: PathDetail },
    { path: '/poses', component: Poses },
    { path: '/poses/new', component: PoseEditor },
    { path: '/poses/:id', component: PoseDetail },
    { path: '/poses/:id/edit', component: PoseEditor },
    { path: '/play/:id', component: Player },
    { path: '/journal', component: Journal },
    { path: '/settings', component: SettingsScreen },
    { path: '/about', component: About },
    { path: '/share', component: ShareImport },
    { path: '*404', component: NotFound }
  ]
})

function Appearance() {
  const app = useApp()
  createEffect(
    () => [app.settings.theme, app.settings.motion] as const,
    ([theme, motion]) => {
      const root = document.documentElement
      if (theme === 'system') delete root.dataset.theme
      else root.dataset.theme = theme
      if (motion === 'reduce') root.dataset.motion = 'reduce'
      else delete root.dataset.motion
      const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#15130f' : '#f5efe5')
    }
  )
  return null
}

function TabBar() {
  return (
    <nav class="tabbar" aria-label="Main">
      <a href="/" aria-label="Today">
        <Icon name="home" />
        Today
      </a>
      <a href="/practices">
        <Icon name="grid" />
        Practices
      </a>
      <a href="/poses">
        <Icon name="figure" />
        Poses
      </a>
      <a href="/journal">
        <Icon name="calendar" />
        Journal
      </a>
    </nav>
  )
}

function Shell(props: { children: JSX.Element }) {
  const location = useLocation()
  return (
    <>
      <Appearance />
      <div class="shell">{props.children}</div>
      <Show when={!location.pathname.startsWith('/play')}>
        <TabBar />
      </Show>
      <Toaster />
    </>
  )
}

async function boot() {
  const initial = await loadAll()
  const root = document.getElementById('root')!
  root.textContent = ''
  render(
    () => (
      <AppProvider initial={initial}>
        <Router>{props => <Shell>{props.children}</Shell>}</Router>
      </AppProvider>
    ),
    root
  )
  void requestPersistence()
  registerUpdates()
}

void boot().catch(err => {
  const root = document.getElementById('root')!
  root.innerHTML = `<div style="padding:32px;font-family:system-ui;max-width:32em;margin:auto"><h1 style="font-weight:500">still. could not open its storage.</h1><p>This can happen in a private window or when site data is blocked. ${String(err?.message ?? err)}</p></div>`
})
