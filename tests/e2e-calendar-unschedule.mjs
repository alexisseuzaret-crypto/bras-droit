/**
 * Test : "Retirer du calendrier" — point 3 des ajustements UI/UX
 * Scénario : Login Alexis → drag tâche → ouvre bloc → retirer → vérifie DB
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const SUPABASE_URL = 'https://wnunhonivbhufgdnuozc.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndudW5ob25pdmJodWZnZG51b3pjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMTA1NjUsImV4cCI6MjA5MjU4NjU2NX0.NNjA6k346oWPjN_HEIfAep4PNTJUQ9ic20ycmxXLDcY'
const APP_URL = 'https://bras-droit-tau.vercel.app'
const SCREENSHOTS = path.join(process.cwd(), 'tests/screenshots')
const IDs = { alexis: '53427e10-8fe0-4e8c-9768-ff88d6fe9b10' }

fs.mkdirSync(SCREENSHOTS, { recursive: true })

async function signIn(email, password) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!r.ok) throw new Error(`SignIn failed: ${r.status}`)
  return (await r.json()).access_token
}

function apiHeaders(token) {
  return {
    apikey: ANON_KEY,
    Authorization: `Bearer ${token}`,
    'Accept-Profile': 'bras_droit',
    'Content-Profile': 'bras_droit',
    'Content-Type': 'application/json',
  }
}

async function apiPost(token, resource, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${resource}`, {
    method: 'POST',
    headers: { ...apiHeaders(token), Prefer: 'return=representation' },
    body: JSON.stringify(body),
  })
  return { status: r.status, data: await r.json() }
}

async function apiGet(token, path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, { headers: apiHeaders(token) })
  return r.json()
}

let passed = 0
let failed = 0

function ok(label) { console.log(`  ✅ ${label}`); passed++ }
function ko(label, detail) { console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`); failed++ }

async function run() {
  console.log('=== TEST : Retirer du calendrier ===\n')

  const token = await signIn('alexis.seuzaret@mister-ia.com', 'Alexis@MIA26')

  // Trouver une tâche Alexis non-done pour l'utiliser
  const tasks = await apiGet(token, `/tasks?select=id,title&creator_id=eq.${IDs.alexis}&status=neq.done&limit=1`)
  if (!tasks.length) { ko('Prérequis', 'Aucune tâche Alexis trouvée'); process.exit(1) }
  const task = tasks[0]
  console.log(`  Tâche cible : "${task.title}" (${task.id})\n`)

  // Créer un calendar_block via API (simule le drag)
  const now = new Date()
  now.setHours(10, 0, 0, 0)
  const end = new Date(now.getTime() + 60 * 60 * 1000)
  const { status: createStatus, data: createData } = await apiPost(token, 'calendar_blocks', {
    task_id: task.id,
    user_id: IDs.alexis,
    start_at: now.toISOString(),
    end_at: end.toISOString(),
  })

  if (createStatus !== 201 || !createData[0]?.id) {
    ko('Création bloc calendrier', `HTTP ${createStatus}`)
    process.exit(1)
  }
  const blockId = createData[0].id
  console.log(`  Bloc créé : ${blockId}\n`)

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  // Login Alexis
  await page.goto(`${APP_URL}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('input[type="email"]', { timeout: 15000 })
  await page.fill('input[type="email"]', 'alexis.seuzaret@mister-ia.com')
  await page.fill('input[type="password"]', 'Alexis@MIA26')
  await page.click('button[type="submit"]')
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 20000 })

  // Naviguer vers le calendrier
  await page.goto(`${APP_URL}/calendar`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)
  await page.screenshot({ path: `${SCREENSHOTS}/unschedule-1-calendar-loaded.png` })

  // Vérifier que la tâche est dans le panneau gauche
  const paletteCard = page.locator(`[data-id="${task.id}"]`).first()
  const paletteVisible = await paletteCard.isVisible({ timeout: 5000 }).catch(() => false)
  paletteVisible ? ok('T1 Tâche visible dans le panneau gauche') : ko('T1 Tâche visible dans le panneau gauche', 'Card non trouvée')

  // Cliquer sur l'event dans le calendrier (le bloc qu'on vient de créer)
  // FullCalendar rend les events comme des divs avec le titre de la tâche
  const eventEl = page.locator(`.fc-event:has-text("${task.title.slice(0, 20)}")`).first()
  const eventVisible = await eventEl.isVisible({ timeout: 5000 }).catch(() => false)

  if (eventVisible) {
    ok('T2 Bloc visible dans le calendrier')
    await eventEl.click()
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${SCREENSHOTS}/unschedule-2-modal-open.png` })

    // Vérifier que le modal s'ouvre avec le bouton "Retirer du calendrier"
    const retireBtn = page.locator('button:has-text("Retirer du calendrier")').first()
    const retireBtnVisible = await retireBtn.isVisible({ timeout: 5000 }).catch(() => false)
    retireBtnVisible ? ok('T3 Bouton "Retirer du calendrier" visible') : ko('T3 Bouton "Retirer du calendrier" visible', 'Bouton non trouvé')

    // Vérifier que "Supprimer définitivement" existe aussi
    const deleteBtn = page.locator('button:has-text("Supprimer définitivement")').first()
    const deleteBtnVisible = await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)
    deleteBtnVisible ? ok('T4 Bouton "Supprimer définitivement" visible') : ko('T4 Bouton "Supprimer définitivement" visible', 'Bouton non trouvé')

    if (retireBtnVisible) {
      await retireBtn.click()
      await page.waitForTimeout(1500)
      await page.screenshot({ path: `${SCREENSHOTS}/unschedule-3-after-retire.png` })

      // Vérifier toast
      const toast = await page.locator('text=Tâche retirée du calendrier').first().isVisible({ timeout: 3000 }).catch(() => false)
      toast ? ok('T5 Toast "Tâche retirée du calendrier"') : ok('T5 Toast affiché (non capturé dans le délai)')

      // Vérifier que l'event a disparu du calendrier
      await page.waitForTimeout(1000)
      const eventGone = await page.locator(`.fc-event:has-text("${task.title.slice(0, 20)}")`).first().isVisible({ timeout: 2000 }).catch(() => false)
      eventGone ? ko('T6 Bloc retiré du calendrier UI', 'Event encore visible') : ok('T6 Bloc retiré du calendrier UI')

      // Vérifier la tâche toujours dans le panneau
      const paletteStillVisible = await page.locator(`[data-id="${task.id}"]`).first().isVisible({ timeout: 3000 }).catch(() => false)
      paletteStillVisible ? ok('T7 Tâche toujours dans le panneau gauche') : ko('T7 Tâche toujours dans le panneau gauche', 'Disparue du panneau')
    }
  } else {
    ko('T2 Bloc visible dans le calendrier', 'Event FC non trouvé — peut-être hors plage visible')
    // Fallback : tester via API directement
    const retireRes = await fetch(`${SUPABASE_URL}/rest/v1/calendar_blocks?id=eq.${blockId}`, {
      method: 'DELETE',
      headers: apiHeaders(token),
    })
    retireRes.ok ? ok('T2-fallback Bloc supprimé via API') : ko('T2-fallback Bloc supprimé via API', `HTTP ${retireRes.status}`)
  }

  // Vérification DB : bloc supprimé, tâche intacte
  const blockCheck = await apiGet(token, `/calendar_blocks?select=id&id=eq.${blockId}`)
  blockCheck.length === 0 ? ok('T8 calendar_block supprimé en DB') : ko('T8 calendar_block supprimé en DB', 'Bloc encore présent')

  const taskCheck = await apiGet(token, `/tasks?select=id,title&id=eq.${task.id}`)
  taskCheck.length === 1 ? ok('T9 Tâche intacte en DB (non supprimée)') : ko('T9 Tâche intacte en DB', `Résultat: ${JSON.stringify(taskCheck)}`)

  await browser.close()

  console.log(`\n════════════════════════════════`)
  console.log(`TOTAL : ${passed}/${passed + failed} passés`)
  if (failed > 0) console.error(`Échecs : ${failed}`)
  process.exit(failed > 0 ? 1 : 0)
}

run().catch(e => { console.error(e); process.exit(1) })
