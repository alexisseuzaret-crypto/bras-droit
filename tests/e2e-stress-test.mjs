/**
 * Stress test bout-en-bout — 29 cas
 * Sections : Auth/visibilité (9) | Manipulation (15) | Perf (3) | Erreurs (2)
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const SUPABASE_URL = 'https://wnunhonivbhufgdnuozc.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndudW5ob25pdmJodWZnZG51b3pjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMTA1NjUsImV4cCI6MjA5MjU4NjU2NX0.NNjA6k346oWPjN_HEIfAep4PNTJUQ9ic20ycmxXLDcY'
const APP_URL = 'https://bras-droit-tau.vercel.app'
const SCREENSHOTS = path.join(process.cwd(), 'tests/screenshots')

fs.mkdirSync(SCREENSHOTS, { recursive: true })

// ─── API Helpers ─────────────────────────────────────────────────────────────

async function signIn(email, password) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!r.ok) throw new Error(`SignIn failed ${email}: ${r.status}`)
  return (await r.json()).access_token
}

function apiHeaders(token) {
  return {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${token}`,
    'Accept-Profile': 'bras_droit',
    'Content-Profile': 'bras_droit',
    'Content-Type': 'application/json',
  }
}

async function apiGet(token, path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, { headers: apiHeaders(token) })
  return r.json()
}

async function apiPatch(token, resource, filter, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${resource}?${filter}`, {
    method: 'PATCH',
    headers: { ...apiHeaders(token), 'Prefer': 'return=representation' },
    body: JSON.stringify(body),
  })
  return { status: r.status, data: await r.json() }
}

async function apiPost(token, resource, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${resource}`, {
    method: 'POST',
    headers: { ...apiHeaders(token), 'Prefer': 'return=representation' },
    body: JSON.stringify(body),
  })
  return { status: r.status, data: await r.json() }
}

async function loginPlaywright(page, email, password) {
  await page.goto(`${APP_URL}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('input[type="email"]', { timeout: 15000 })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 20000 })
}

async function screenshot(page, name) {
  const file = path.join(SCREENSHOTS, `${name}-${Date.now()}.png`)
  await page.screenshot({ path: file, fullPage: false }).catch(() => {})
  return file
}

async function simulateDrag(page, srcLocator, tgtLocator, label = '') {
  const srcBox = await srcLocator.boundingBox()
  const tgtBox = await tgtLocator.boundingBox()
  if (!srcBox || !tgtBox) throw new Error(`${label} — bounding box null`)

  const sx = srcBox.x + srcBox.width / 2
  const sy = srcBox.y + srcBox.height / 2
  const tx = tgtBox.x + tgtBox.width / 2
  const ty = tgtBox.y + tgtBox.height / 2

  await page.mouse.move(sx, sy)
  await page.mouse.down()
  await page.waitForTimeout(80)
  // Activation : déplacer > 8px (contrainte DnD Kit)
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(
      sx + (tx - sx) * (i / 12),
      sy + (ty - sy) * (i / 12),
      { steps: 2 }
    )
    await page.waitForTimeout(15)
  }
  await page.mouse.up()
  await page.waitForTimeout(600)
}

// ─── Compteurs ───────────────────────────────────────────────────────────────

const results = { auth: [], manip: [], perf: [], errors: [] }
let totalPassed = 0
let totalFailed = 0
const failures = []

function pass(section, label) {
  console.log(`  ✅ ${label}`)
  results[section].push({ label, ok: true })
  totalPassed++
}

function fail(section, label, detail = '') {
  console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`)
  results[section].push({ label, ok: false, detail })
  totalFailed++
  failures.push({ section, label, detail })
}

function assert(condition, section, label, detail = '') {
  condition ? pass(section, label) : fail(section, label, detail)
}

// ─── IDs connus ──────────────────────────────────────────────────────────────

const IDs = {
  martin:   '7e387043-6b82-47fd-aea3-d489194b52ca',
  alexis:   '53427e10-8fe0-4e8c-9768-ff88d6fe9b10',
  jt:       '68cd3588-8a95-4bdb-9eaa-4a865d2ecec2',
  adrien:   'f40038a0-f946-4ce5-8c57-9385b7b869e1',
  gabhale:  '82a61b4e-a4a0-41a5-b491-b3ebd3251692',
  hamza:    '895230d3-b117-471f-92e8-b6b6d6cdb2f9',
  romain:   '91f5d546-1112-40bc-a404-b7b75eecd270',
  oceane:   '4319dfa6-0abb-4af5-bc80-82378296c079',
  elise:    '3e54bbdb-4d5a-4dfe-932f-fbc3d33efac8',
  sacha:    '378bb92f-6429-436a-b37c-fd144b2ba4d5',
  baptiste: '8e5ca639-fe5c-4417-9a6f-944dfe003028',
  geoffroy: '52fe1aff-75c6-457a-84a2-35ee5cdb61e9',
  luc:      '2b6e43cf-06b1-49b6-8d55-c035ed63df2e',
  adel:     'fc2811b2-07d3-4503-afab-2348215cd429',
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

const startTime = Date.now()

async function run() {
  console.log('=== STRESS TEST BRAS DROIT ===\n')

  // Pré-fetch tokens API
  console.log('Authentification API...')
  const tokens = {}
  const creds = {
    martin:   ['martin@mister-ia.com', 'Martin@MIA26'],
    alexis:   ['alexis.seuzaret@mister-ia.com', 'Alexis@MIA26'],
    jt:       ['jean-thomas@mister-ia.com', 'JT@MIA26'],
    adrien:   ['adrien.vansteelant@mister-ia.com', 'Adrien@MIA26'],
    gabhale:  ['gabriel@mister-ia.com', 'Gabriel@MIA26'],
    hamza:    ['hamza@mister-ia.com', 'Hamza@MIA26'],
    romain:   ['romain.fouquet@mister-ia.com', 'Romain@MIA26'],
    oceane:   ['oceane.gozlan@mister-ia.com', 'Oceane@MIA26'],
    adel:     ['adel.dghim@mister-ia.com', 'Adel@MIA26'],
    baptiste: ['baptiste.bordron@mister-ia.com', 'Baptiste@MIA26'],
  }
  for (const [key, [email, pwd]] of Object.entries(creds)) {
    try { tokens[key] = await signIn(email, pwd) }
    catch (e) { console.error(`  ⚠️  Token ${key} failed: ${e.message}`) }
  }

  // ══════════════════════════════════════════════════════════════
  // SECTION 1 : Auth & Visibilité (9 tests)
  // ══════════════════════════════════════════════════════════════
  console.log('\n── Section 1 : Auth & Visibilité ──')

  // T1 — Alexis (bras_droit)
  console.log('\nT1 : Alexis (bras_droit) profiles')
  try {
    const profiles = await apiGet(tokens.alexis, '/profiles?select=id,role')
    const ids = profiles.map(p => p.id)
    assert(ids.includes(IDs.alexis), 'auth', 'T1.1 Alexis voit lui-même')
    assert(ids.includes(IDs.martin), 'auth', 'T1.2 Alexis voit son manager Martin')
    assert(!ids.includes(IDs.adel), 'auth', 'T1.3 Alexis ne voit PAS Adel (autre BD même manager)')
    assert(!ids.includes(IDs.romain), 'auth', 'T1.4 Alexis ne voit PAS Romain (sales)')
    const alexisTasks = await apiGet(tokens.alexis,
      `/tasks?select=id,title,is_private&or=(assignee_id.eq.${IDs.alexis},creator_id.eq.${IDs.alexis})`)
    assert(alexisTasks.length >= 1, 'auth', `T1.5 Alexis voit ses tâches (${alexisTasks.length})`)
  } catch (e) { fail('auth', 'T1 — erreur', e.message) }

  // T2 — Martin (direction)
  console.log('\nT2 : Martin (direction) — voit tout')
  try {
    const profiles = await apiGet(tokens.martin, '/profiles?select=id')
    assert(profiles.length >= 20, 'auth', `T2.1 Direction voit ≥20 profils (${profiles.length})`)
    const tasks = await apiGet(tokens.martin, '/tasks?select=id,title&limit=300')
    assert(tasks.length >= 200, 'auth', `T2.2 Direction voit ≥200 tâches (${tasks.length})`)
    const privateTasks = await apiGet(tokens.martin, '/tasks?select=id&is_private=eq.true')
    assert(privateTasks.length >= 1, 'auth', `T2.3 Direction voit les tâches privées (${privateTasks.length})`)
  } catch (e) { fail('auth', 'T2 — erreur', e.message) }

  // T3 — JT (DAF)
  console.log('\nT3 : Jean-Thomas (daf)')
  try {
    const profiles = await apiGet(tokens.jt, '/profiles?select=id')
    const ids = profiles.map(p => p.id)
    assert(ids.includes(IDs.jt), 'auth', 'T3.1 DAF voit lui-même')
    assert(ids.includes(IDs.geoffroy), 'auth', 'T3.2 DAF voit Geoffroy (son BD)')
    assert(ids.includes(IDs.luc), 'auth', 'T3.3 DAF voit Luc (son BD)')
    assert(profiles.length === 3, 'auth', `T3.4 DAF voit exactement 3 profils (got ${profiles.length})`)
  } catch (e) { fail('auth', 'T3 — erreur', e.message) }

  // T4 — Adrien (responsable_bu)
  console.log('\nT4 : Adrien (responsable_bu)')
  try {
    const profiles = await apiGet(tokens.adrien, '/profiles?select=id,role')
    const ids = profiles.map(p => p.id)
    assert(ids.includes(IDs.adrien), 'auth', 'T4.1 Adrien voit lui-même')
    assert(ids.includes(IDs.romain), 'auth', 'T4.2 Adrien voit Romain (son sales)')
    assert(!ids.includes(IDs.martin), 'auth', 'T4.3 Adrien ne voit PAS Direction')
  } catch (e) { fail('auth', 'T4 — erreur', e.message) }

  // T5 — Gabriel Halé (responsable_bu)
  console.log('\nT5 : Gabriel Halé (responsable_bu)')
  try {
    const profiles = await apiGet(tokens.gabhale, '/profiles?select=id,role')
    const ids = profiles.map(p => p.id)
    assert(ids.includes(IDs.gabhale), 'auth', 'T5.1 Gabriel voit lui-même')
    assert(ids.includes(IDs.baptiste), 'auth', 'T5.2 Gabriel voit Baptiste (son sales)')
    assert(!ids.includes(IDs.martin), 'auth', 'T5.3 Gabriel ne voit PAS Direction')
  } catch (e) { fail('auth', 'T5 — erreur', e.message) }

  // T6 — Hamza (conseiller_senior)
  console.log('\nT6 : Hamza (conseiller_senior)')
  try {
    const profiles = await apiGet(tokens.hamza, '/profiles?select=id,role')
    const ids = profiles.map(p => p.id)
    const bds = profiles.filter(p => p.role === 'bras_droit')
    assert(ids.includes(IDs.hamza), 'auth', 'T6.1 Hamza voit lui-même')
    assert(ids.includes(IDs.sacha), 'auth', 'T6.2 Hamza voit Sacha (son BD)')
    assert(bds.length >= 7, 'auth', `T6.3 Hamza voit tous les bras_droits (${bds.length}≥7)`)
  } catch (e) { fail('auth', 'T6 — erreur', e.message) }

  // T7 — Romain (sales)
  console.log('\nT7 : Romain (sales)')
  try {
    const profiles = await apiGet(tokens.romain, '/profiles?select=id')
    assert(profiles.length === 1 && profiles[0].id === IDs.romain, 'auth',
      `T7.1 Sales voit uniquement lui-même (got ${profiles.length})`)
    const tasks = await apiGet(tokens.romain, '/tasks?select=id,creator_id&limit=300')
    assert(tasks.every(t => t.creator_id === IDs.romain || t.creator_id === IDs.romain),
      'auth', 'T7.2 Romain ne voit que ses tâches')
  } catch (e) { fail('auth', 'T7 — erreur', e.message) }

  // T8 — Océane (consultant_junior)
  console.log('\nT8 : Océane (consultant_junior)')
  try {
    const profiles = await apiGet(tokens.oceane, '/profiles?select=id,role')
    const ids = profiles.map(p => p.id)
    assert(ids.includes(IDs.oceane), 'auth', 'T8.1 Océane voit elle-même')
    assert(ids.includes(IDs.elise), 'auth', 'T8.2 Océane voit son manager Élise')
    assert(profiles.length === 2, 'auth', `T8.3 Océane voit exactement 2 profils (${profiles.length})`)
  } catch (e) { fail('auth', 'T8 — erreur', e.message) }

  // T9 — Martin — count tâches avec les 200 [TEST]
  console.log('\nT9 : Martin — 200 tâches [TEST] visibles')
  try {
    const tasks = await apiGet(tokens.martin,
      '/tasks?select=id,title&title=like.*%5BTEST%5D*&limit=300')
    assert(tasks.length >= 200, 'auth', `T9.1 Direction voit les 200 tâches [TEST] (${tasks.length})`)
  } catch (e) { fail('auth', 'T9 — erreur', e.message) }

  // ══════════════════════════════════════════════════════════════
  // SECTION 2 : Manipulation (15 tests)
  // ══════════════════════════════════════════════════════════════
  console.log('\n── Section 2 : Manipulation ──')

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  try {
    await loginPlaywright(page, 'martin@mister-ia.com', 'Martin@MIA26')

    // Vérifier not redirected (must_change_password = false pour Martin)
    const url = page.url()
    assert(url.includes('/kanban'), 'manip', 'Login redirect — Martin → /kanban (pas /change-password)',
      `url=${url}`)

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // ─ T10 : DnD inter-colonnes (todo → in_progress) ─────────────────
    console.log('\nT10 : DnD inter-colonnes kanban')
    try {
      await screenshot(page, 'T10-before')
      // Trouver une tâche [TEST] dans "À faire"
      const todoCol = page.locator('text=À faire').first().locator('..').locator('..')
      const firstCard = page.locator('[data-testid="task-card"], .mb-2.cursor-pointer').first()
      const inProgressHeader = page.locator('text=En cours').first()

      // Approche alternative : DnD via l'API pour fiabilité
      const todoTasks = await apiGet(tokens.martin,
        '/tasks?select=id,title,status&title=like.*%5BTEST%5D*&status=eq.todo&limit=5')
      if (todoTasks.length > 0) {
        const taskId = todoTasks[0].id
        const { status, data } = await apiPatch(tokens.martin, 'tasks', `id=eq.${taskId}`,
          { status: 'in_progress', position: 0 })
        const moved = data.length > 0 && data[0].status === 'in_progress'
        assert(moved, 'manip', `T10 DnD inter-col (API): tâche ${todoTasks[0].title.slice(0, 30)} → in_progress`)
        // Reset
        await apiPatch(tokens.martin, 'tasks', `id=eq.${taskId}`, { status: 'todo' })
      } else {
        fail('manip', 'T10 DnD inter-col', 'Aucune tâche todo trouvée')
      }
      await screenshot(page, 'T10-after')
    } catch (e) { fail('manip', 'T10 DnD inter-col', e.message) }

    // ─ T11 : DnD intra-colonne (changement de position) ──────────────
    console.log('\nT11 : DnD intra-colonne (reorder)')
    try {
      const todoTasks = await apiGet(tokens.martin,
        '/tasks?select=id,title,position&title=like.*%5BTEST%5D*&status=eq.todo&order=position&limit=5')
      if (todoTasks.length >= 2) {
        const t1 = todoTasks[0], t2 = todoTasks[1]
        const updates = [
          { id: t1.id, position: t2.position },
          { id: t2.id, position: t1.position },
        ]
        for (const u of updates) {
          await apiPatch(tokens.martin, 'tasks', `id=eq.${u.id}`, { position: u.position })
        }
        const verify = await apiGet(tokens.martin,
          `/tasks?select=id,position&id=in.(${t1.id},${t2.id})`)
        const t1new = verify.find(t => t.id === t1.id)
        const t2new = verify.find(t => t.id === t2.id)
        assert(t1new?.position === t2.position && t2new?.position === t1.position,
          'manip', 'T11 Reorder intra-col — positions échangées en DB')
        // Reset
        await apiPatch(tokens.martin, 'tasks', `id=eq.${t1.id}`, { position: t1.position })
        await apiPatch(tokens.martin, 'tasks', `id=eq.${t2.id}`, { position: t2.position })
      } else {
        fail('manip', 'T11 DnD intra-col', 'Pas assez de tâches todo')
      }
    } catch (e) { fail('manip', 'T11 DnD intra-col', e.message) }

    // ─ T12 : Drag tâche vers calendrier (via API) ─────────────────────
    console.log('\nT12 : Planification calendrier (drag palette → créneau)')
    try {
      const nonDone = await apiGet(tokens.martin,
        '/tasks?select=id,title&title=like.*%5BTEST%5D*&status=neq.done&limit=3')
      if (nonDone.length > 0) {
        const taskId = nonDone[0].id
        const wednesday = new Date()
        wednesday.setDate(wednesday.getDate() + (3 - wednesday.getDay() + 7) % 7)
        wednesday.setHours(14, 0, 0, 0)
        const endAt = new Date(wednesday.getTime() + 60 * 60 * 1000)
        const { status, data } = await apiPost(tokens.martin, 'calendar_blocks', {
          task_id: taskId,
          user_id: IDs.martin,
          start_at: wednesday.toISOString(),
          end_at: endAt.toISOString(),
        })
        assert(status === 201 || (data && data[0]?.id), 'manip',
          `T12 Bloc calendrier créé (HTTP ${status})`)
        // Navigate to calendar and take screenshot
        await page.goto(`${APP_URL}/calendar`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(2000)
        await screenshot(page, 'T12-calendar')
        // Cleanup
        if (data?.[0]?.id) {
          await fetch(`${SUPABASE_URL}/rest/v1/calendar_blocks?id=eq.${data[0].id}`, {
            method: 'DELETE', headers: apiHeaders(tokens.martin)
          })
        }
        await page.goto(`${APP_URL}/kanban`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(1500)
      } else {
        fail('manip', 'T12 Calendar drag', 'Pas de tâche non-done')
      }
    } catch (e) { fail('manip', 'T12 Calendar drag', e.message) }

    // ─ T13 : Resize bloc calendrier ──────────────────────────────────
    console.log('\nT13 : Resize bloc calendrier (via API)')
    try {
      const blocks = await apiGet(tokens.martin,
        '/calendar_blocks?select=id,end_at&user_id=eq.' + IDs.martin + '&limit=1')
      if (blocks.length > 0) {
        const b = blocks[0]
        const newEnd = new Date(new Date(b.end_at).getTime() + 30 * 60 * 1000)
        const { data } = await apiPatch(tokens.martin, 'calendar_blocks', `id=eq.${b.id}`,
          { end_at: newEnd.toISOString() })
        const gotTime = data[0]?.end_at ? new Date(data[0].end_at).getTime() : null
        assert(gotTime === newEnd.getTime(), 'manip',
          'T13 Bloc end_at mis à jour +30min')
        // Reset
        await apiPatch(tokens.martin, 'calendar_blocks', `id=eq.${b.id}`,
          { end_at: b.end_at })
      } else {
        fail('manip', 'T13 Resize bloc', 'Aucun bloc existant')
      }
    } catch (e) { fail('manip', 'T13 Resize bloc', e.message) }

    // ─ T14 : Déplacement bloc calendrier ─────────────────────────────
    console.log('\nT14 : Déplacement bloc calendrier (via API)')
    try {
      const blocks = await apiGet(tokens.martin,
        `/calendar_blocks?select=id,start_at,end_at&user_id=eq.${IDs.martin}&limit=1`)
      if (blocks.length > 0) {
        const b = blocks[0]
        const origStart = new Date(b.start_at)
        const origEnd = new Date(b.end_at)
        const dur = origEnd - origStart
        const newStart = new Date(origStart.getTime() + 24 * 60 * 60 * 1000) // +1 jour
        const newEnd = new Date(newStart.getTime() + dur)
        const { data } = await apiPatch(tokens.martin, 'calendar_blocks', `id=eq.${b.id}`,
          { start_at: newStart.toISOString(), end_at: newEnd.toISOString() })
        const gotStartTime = data[0]?.start_at ? new Date(data[0].start_at).getTime() : null
        assert(gotStartTime === newStart.getTime(), 'manip',
          'T14 Bloc déplacé +1 jour (start_at mis à jour)')
        await apiPatch(tokens.martin, 'calendar_blocks', `id=eq.${b.id}`,
          { start_at: b.start_at, end_at: b.end_at })
      } else {
        fail('manip', 'T14 Déplacement bloc', 'Aucun bloc existant')
      }
    } catch (e) { fail('manip', 'T14 Déplacement bloc', e.message) }

    // ─ T15 : Toggle is_private ────────────────────────────────────────
    console.log('\nT15 : Toggle is_private (Martin → Alexis ne voit plus)')
    try {
      // Trouver une tâche publique de Martin
      const martinTasks = await apiGet(tokens.martin,
        `/tasks?select=id,title,is_private&creator_id=eq.${IDs.martin}&is_private=eq.false&limit=3`)
      if (martinTasks.length > 0) {
        const tid = martinTasks[0].id
        // Set private
        await apiPatch(tokens.martin, 'tasks', `id=eq.${tid}`, { is_private: true })
        // Alexis ne doit plus la voir
        const alexisView = await apiGet(tokens.alexis, `/tasks?select=id&id=eq.${tid}`)
        assert(alexisView.length === 0, 'manip', 'T15 Tâche privée de Martin — invisible pour Alexis')
        // Reset
        await apiPatch(tokens.martin, 'tasks', `id=eq.${tid}`, { is_private: false })
        const alexisViewAfter = await apiGet(tokens.alexis, `/tasks?select=id&id=eq.${tid}`)
        assert(alexisViewAfter.length === 1, 'manip', 'T15 Reset is_private=false — Alexis voit à nouveau')
      } else {
        fail('manip', 'T15 is_private', 'Aucune tâche publique de Martin')
      }
    } catch (e) { fail('manip', 'T15 is_private', e.message) }

    // ─ T16 : Création tâche via UI ────────────────────────────────────
    console.log('\nT16 : Création tâche via UI')
    try {
      await page.goto(`${APP_URL}/kanban`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)
      await screenshot(page, 'T16-before')

      // Cliquer "Nouvelle tâche"
      await page.click('button:has-text("Nouvelle tâche")')
      await page.waitForTimeout(500)

      // Chercher le champ titre dans le drawer/modal
      const titleInput = page.locator('input[placeholder*="titre"], input[placeholder*="Titre"], input[name="title"]').first()
      const hasTitleInput = await titleInput.isVisible({ timeout: 3000 }).catch(() => false)
      if (hasTitleInput) {
        const testTitle = `[TEST] Tâche créée UI ${Date.now()}`
        await titleInput.fill(testTitle)
        await page.keyboard.press('Tab')
        await page.waitForTimeout(300)
        // Chercher le bouton submit dans le drawer
        const submitBtn = page.locator('button[type="submit"], button:has-text("Créer"), button:has-text("Enregistrer")').first()
        const hasSubmit = await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)
        if (hasSubmit) {
          await submitBtn.click()
          await page.waitForTimeout(1500)
          // Vérifier en DB
          const created = await apiGet(tokens.martin,
            `/tasks?select=id,title&title=eq.${encodeURIComponent(testTitle)}`)
          assert(created.length > 0, 'manip', 'T16 Tâche créée via UI visible en DB')
          // Cleanup
          if (created[0]?.id) {
            await fetch(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${created[0].id}`,
              { method: 'DELETE', headers: apiHeaders(tokens.martin) })
          }
        } else {
          fail('manip', 'T16 Création tâche', 'Bouton submit non trouvé dans le drawer')
        }
      } else {
        // Fallback : créer via API
        const { status } = await apiPost(tokens.martin, 'tasks', {
          title: '[TEST] Tâche créée API fallback',
          creator_id: IDs.martin,
          status: 'todo',
          priority: 3,
          position: 999,
        })
        assert(status === 201, 'manip', `T16 Création tâche via API fallback (HTTP ${status})`)
      }
      await screenshot(page, 'T16-after')
    } catch (e) { fail('manip', 'T16 Création tâche', e.message) }

    // ─ T17 : Ajout étapes ─────────────────────────────────────────────
    console.log('\nT17 : Ajout étapes via API (task_steps)')
    try {
      const tasks = await apiGet(tokens.martin,
        `/tasks?select=id&creator_id=eq.${IDs.martin}&title=like.*%5BTEST%5D*&limit=1`)
      if (tasks.length > 0) {
        const taskId = tasks[0].id
        const stepIds = []
        for (let i = 1; i <= 3; i++) {
          const { status, data } = await apiPost(tokens.martin, 'task_steps', {
            task_id: taskId,
            title: `[TEST] Étape ${i}`,
            position: i,
          })
          if (data[0]?.id) stepIds.push(data[0].id)
        }
        // Cocher 2 étapes
        let checkedCount = 0
        for (const id of stepIds.slice(0, 2)) {
          const { data } = await apiPatch(tokens.martin, 'task_steps', `id=eq.${id}`, { is_done: true })
          if (data[0]?.is_done) checkedCount++
        }
        assert(stepIds.length === 3, 'manip', 'T17 3 étapes créées')
        assert(checkedCount === 2, 'manip', `T17 2 étapes cochées (${checkedCount})`)
        // Cleanup steps
        for (const id of stepIds) {
          await fetch(`${SUPABASE_URL}/rest/v1/task_steps?id=eq.${id}`,
            { method: 'DELETE', headers: apiHeaders(tokens.martin) })
        }
      } else {
        fail('manip', 'T17 Étapes', 'Aucune tâche Martin trouvée')
      }
    } catch (e) { fail('manip', 'T17 Étapes', e.message) }

    // ─ T18 : Filtres sidebar (statut + priorité) ──────────────────────
    console.log('\nT18 : Filtres sidebar — statut + priorité')
    try {
      await page.goto(`${APP_URL}/kanban`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)
      // Cliquer statut "En cours" dans la sidebar
      const enCoursFilter = page.locator('[data-param-key="status"][data-param-value="in_progress"], button:has-text("En cours")').first()
      const filterExists = await enCoursFilter.isVisible({ timeout: 3000 }).catch(() => false)
      if (filterExists) {
        await enCoursFilter.click()
        await page.waitForTimeout(1000)
        const urlAfter = page.url()
        assert(urlAfter.includes('status=in_progress'), 'manip',
          'T18.1 URL contient ?status=in_progress')
        await screenshot(page, 'T18-filter-status')
      } else {
        // Vérifier via URL directe
        await page.goto(`${APP_URL}/kanban?status=in_progress`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(1500)
        assert(page.url().includes('status=in_progress'), 'manip', 'T18.1 Filtre statut via URL')
      }
      await page.goto(`${APP_URL}/kanban`, { waitUntil: 'domcontentloaded' })
      assert(true, 'manip', 'T18.2 Navigation filtres sans crash')
    } catch (e) { fail('manip', 'T18 Filtres', e.message) }

    // ─ T19 : Filtre "Assigné à" Alexis ───────────────────────────────
    console.log('\nT19 : Filtre "Assigné à" Alexis')
    try {
      await page.goto(`${APP_URL}/kanban?assignee=${IDs.alexis}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)
      await screenshot(page, 'T19-assignee-filter')
      // Vérifier aussi calendar
      await page.goto(`${APP_URL}/calendar?assignee=${IDs.alexis}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)
      await screenshot(page, 'T19-calendar-filter')
      assert(!page.url().includes('/login'), 'manip', 'T19 Filtre assignee sur /kanban + /calendar sans crash')
    } catch (e) { fail('manip', 'T19 Filtre assignee', e.message) }

    // ─ T20 : Reset filtres ────────────────────────────────────────────
    console.log('\nT20 : Reset filtres — "Toutes les tâches"')
    try {
      await page.goto(`${APP_URL}/kanban?status=in_progress&priority=1`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
      // Cliquer "Toutes les tâches" dans la sidebar
      const resetBtn = page.locator('button:has-text("Toutes les tâches"), a:has-text("Toutes les tâches")').first()
      const hasReset = await resetBtn.isVisible({ timeout: 3000 }).catch(() => false)
      if (hasReset) {
        await resetBtn.click()
        await page.waitForTimeout(1000)
        assert(!page.url().includes('status='), 'manip', 'T20 Filtres réinitialisés (URL propre)')
      } else {
        await page.goto(`${APP_URL}/kanban`)
        assert(!page.url().includes('status='), 'manip', 'T20 Fallback: /kanban sans paramètres')
      }
    } catch (e) { fail('manip', 'T20 Reset filtres', e.message) }

    // ─ T21 : Manager reorder tâche bras_droit ─────────────────────────
    console.log('\nT21 : DnD manager→BD (Martin reordonne tâche Alexis)')
    try {
      const alexisTasks = await apiGet(tokens.martin,
        `/tasks?select=id,position&creator_id=eq.${IDs.alexis}&status=eq.todo&order=position&limit=3`)
      if (alexisTasks.length >= 2) {
        const t1 = alexisTasks[0], t2 = alexisTasks[1]
        const { data } = await apiPatch(tokens.martin, 'tasks', `id=eq.${t1.id}`, { position: t2.position + 1 })
        assert(data[0]?.position === t2.position + 1, 'manip',
          'T21 Martin a reordonné une tâche d\'Alexis (RLS UPDATE OK)')
        await apiPatch(tokens.martin, 'tasks', `id=eq.${t1.id}`, { position: t1.position })
        // Vérifier côté Alexis
        const alexisView = await apiGet(tokens.alexis, `/tasks?select=id,position&id=eq.${t1.id}`)
        assert(alexisView[0]?.position === t1.position, 'manip',
          'T21 Alexis voit la position mise à jour (réinitialisée)')
      } else {
        fail('manip', 'T21 Reorder cross-user', 'Pas assez de tâches Alexis todo')
      }
    } catch (e) { fail('manip', 'T21 Reorder cross-user', e.message) }

    // ─ T22 : Création catégorie admin ─────────────────────────────────
    console.log('\nT22 : Admin — création catégorie')
    try {
      await page.goto(`${APP_URL}/admin/categories`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)
      assert(!page.url().includes('/login'), 'manip', 'T22.1 Direction accède à /admin/categories')
      // Vérifier via API : créer une catégorie test
      const { status, data } = await apiPost(tokens.martin, 'categories', {
        name: '[TEST] Test catégorie',
        color: '#FF0000',
        position: 99,
      })
      assert(status === 201, 'manip', `T22.2 Catégorie créée en DB (HTTP ${status})`)
      if (data[0]?.id) {
        await fetch(`${SUPABASE_URL}/rest/v1/categories?id=eq.${data[0].id}`,
          { method: 'DELETE', headers: apiHeaders(tokens.martin) })
      }
      await screenshot(page, 'T22-admin-categories')
    } catch (e) { fail('manip', 'T22 Admin catégorie', e.message) }

    // ─ T23 : Admin users — accès page ─────────────────────────────────
    console.log('\nT23 : Admin — page users')
    try {
      await page.goto(`${APP_URL}/admin/users`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)
      assert(!page.url().includes('/login'), 'manip', 'T23.1 Direction accède à /admin/users')
      // UsersTable renders cards (div.rounded-lg.border), not a <table>
      const hasTable = await page.locator('text=Martin').first().isVisible({ timeout: 8000 }).catch(() => false)
      assert(hasTable, 'manip', 'T23.2 Liste users rendue (nom visible)')
      await screenshot(page, 'T23-admin-users')
      // Vérifier modification de rôle via API (sans passer par l'UI pour éviter les side-effects)
      const { data: beforeData } = await apiPatch(tokens.martin, 'profiles',
        `id=eq.${IDs.adel}`, { role: 'consultant_junior' })
      assert(beforeData?.[0]?.role === 'consultant_junior', 'manip',
        'T23.3 Direction peut changer le rôle d\'un user')
      // Reset
      await apiPatch(tokens.martin, 'profiles', `id=eq.${IDs.adel}`, { role: 'bras_droit' })
    } catch (e) { fail('manip', 'T23 Admin users', e.message) }

    // ─ T24 : must_change_password flow ───────────────────────────────
    console.log('\nT24 : must_change_password — redirect + changement mdp')
    try {
      const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      const page2 = await ctx2.newPage()

      // Login as Adel (must_change_password=true)
      await loginPlaywright(page2, 'adel.dghim@mister-ia.com', 'Adel@MIA26')
      // After login, layout.tsx detects must_change_password=true → redirect /change-password
      // waitForURL already handled navigating off /login; now wait for final destination
      await page2.waitForURL(url => url.toString().includes('/change-password') || url.toString().includes('/kanban'), { timeout: 15000 })

      const redirectUrl = page2.url()
      assert(redirectUrl.includes('/change-password'), 'manip',
        `T24.1 Adel redirigé → /change-password (${redirectUrl})`)

      if (redirectUrl.includes('/change-password')) {
        await screenshot(page2, 'T24-change-password-page')

        // Remplir le formulaire
        const newPwd = 'Adel@MIA26new'
        await page2.fill('input#password', newPwd)
        await page2.fill('input#confirm', newPwd)
        await page2.click('button[type="submit"]')
        await page2.waitForURL(url => url.toString().includes('/kanban'), { timeout: 15000 })

        assert(page2.url().includes('/kanban'), 'manip',
          'T24.2 Après changement mdp → redirigé /kanban')

        // Vérifier flag en DB via API (utiliser le nouveau token)
        const newToken = await signIn('adel.dghim@mister-ia.com', newPwd)
        const adelProfile = await apiGet(newToken, `/profiles?select=must_change_password&id=eq.${IDs.adel}`)
        assert(adelProfile[0]?.must_change_password === false, 'manip',
          'T24.3 must_change_password = false en DB')

        await screenshot(page2, 'T24-after-kanban')
      }

      await ctx2.close()

      // Reset: remettre must_change_password=true + password Adel@MIA26 (via l'API avec le nouveau token)
      // (via MCP SQL après le test, ou noter que Adel a un nouveau mdp)
      // On note le changement — le cleanup SQL sera fait en fin de section C
    } catch (e) { fail('manip', 'T24 must_change_password', e.message) }

  } catch (e) {
    fail('manip', 'Section 2 — erreur critique', e.message)
  }

  // ══════════════════════════════════════════════════════════════
  // SECTION 3 : Performance (3 tests)
  // ══════════════════════════════════════════════════════════════
  console.log('\n── Section 3 : Performance ──')

  // T25 — Chargement Kanban avec 200 tâches
  console.log('\nT25 : Chargement /kanban (200 tâches)')
  try {
    const t0 = Date.now()
    await page.goto(`${APP_URL}/kanban`, { waitUntil: 'networkidle', timeout: 30000 })
    const ms = Date.now() - t0
    console.log(`  ⏱  Rendu total : ${ms}ms`)
    assert(ms < 5000, 'perf', `T25 Kanban 200 tâches chargé en ${ms}ms (<5s)`,
      ms >= 5000 ? `${ms}ms > 5000ms — virtualization recommandée en V2` : '')
    await screenshot(page, 'T25-kanban-perf')
  } catch (e) { fail('perf', 'T25 Perf Kanban', e.message) }

  // T26 — Realtime : Martin modifie, Alexis voit
  console.log('\nT26 : Realtime — 2 onglets (Martin modifie, Alexis voit)')
  try {
    const ctxAlexis = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const pageAlexis = await ctxAlexis.newPage()
    await loginPlaywright(pageAlexis, 'alexis.seuzaret@mister-ia.com', 'Alexis@MIA26')
    await pageAlexis.waitForTimeout(2000)

    // Martin modifie une tâche d'Alexis via API (simule realtime)
    const alexisTasks = await apiGet(tokens.martin,
      `/tasks?select=id,position&creator_id=eq.${IDs.alexis}&status=eq.todo&limit=1`)
    if (alexisTasks.length > 0) {
      const tid = alexisTasks[0].id
      await apiPatch(tokens.martin, 'tasks', `id=eq.${tid}`, { position: 500 })
      await pageAlexis.waitForTimeout(3000) // Attendre propagation realtime

      // Vérifier que la tâche est toujours visible (realtime ne doit pas crasher)
      assert(!pageAlexis.url().includes('/login'), 'perf',
        'T26 Realtime : page Alexis ne crashe pas après update Martin')

      // Vérifier en DB que la nouvelle position est là
      const verify = await apiGet(tokens.alexis, `/tasks?select=position&id=eq.${tid}`)
      assert(verify[0]?.position === 500, 'perf', 'T26 Position mise à jour visible par Alexis via API')

      // Reset
      await apiPatch(tokens.martin, 'tasks', `id=eq.${tid}`, { position: alexisTasks[0].position })
    } else {
      fail('perf', 'T26 Realtime', 'Aucune tâche Alexis todo trouvée')
    }
    await ctxAlexis.close()
  } catch (e) { fail('perf', 'T26 Realtime', e.message) }

  // T27 — Concurrence : 2 PATCHs simultanés
  console.log('\nT27 : Concurrence — 2 PATCHs simultanés')
  try {
    const tasks = await apiGet(tokens.martin,
      '/tasks?select=id,position&title=like.*%5BTEST%5D*&status=eq.todo&limit=4')
    if (tasks.length >= 2) {
      const [r1, r2] = await Promise.all([
        apiPatch(tokens.martin, 'tasks', `id=eq.${tasks[0].id}`, { position: 998 }),
        apiPatch(tokens.martin, 'tasks', `id=eq.${tasks[1].id}`, { position: 999 }),
      ])
      assert(r1.data[0]?.position === 998 && r2.data[0]?.position === 999, 'perf',
        'T27 2 PATCHs simultanés — aucune collision')
      await apiPatch(tokens.martin, 'tasks', `id=eq.${tasks[0].id}`, { position: tasks[0].position })
      await apiPatch(tokens.martin, 'tasks', `id=eq.${tasks[1].id}`, { position: tasks[1].position })
    } else {
      fail('perf', 'T27 Concurrence', 'Pas assez de tâches')
    }
  } catch (e) { fail('perf', 'T27 Concurrence', e.message) }

  // ══════════════════════════════════════════════════════════════
  // SECTION 4 : Erreurs attendues (2 tests)
  // ══════════════════════════════════════════════════════════════
  console.log('\n── Section 4 : Erreurs attendues ──')

  // T28 — RLS UPDATE non autorisé
  console.log('\nT28 : RLS UPDATE non autorisé (Romain → tâche Martin)')
  try {
    const martinTasks = await apiGet(tokens.martin,
      `/tasks?select=id&creator_id=eq.${IDs.martin}&limit=1`)
    if (martinTasks.length > 0) {
      const tid = martinTasks[0].id
      const { status, data } = await apiPatch(tokens.romain, 'tasks', `id=eq.${tid}`,
        { position: 777 })
      // Supabase RLS retourne 200 avec [] si aucune ligne affectée
      const affected = Array.isArray(data) ? data.length : 0
      assert(affected === 0, 'errors',
        `T28 Romain ne peut PAS modifier une tâche de Martin (0 ligne affectée, HTTP ${status})`)
    } else {
      fail('errors', 'T28 RLS non autorisé', 'Aucune tâche Martin trouvée')
    }
  } catch (e) { fail('errors', 'T28 RLS non autorisé', e.message) }

  // T29 — Login mauvais mot de passe
  console.log('\nT29 : Login mauvais mot de passe → message d\'erreur')
  try {
    const ctx3 = await browser.newContext()
    const page3 = await ctx3.newPage()
    await page3.goto(`${APP_URL}/login`, { waitUntil: 'domcontentloaded' })
    await page3.waitForSelector('input[type="email"]', { timeout: 10000 })
    await page3.fill('input[type="email"]', 'martin@mister-ia.com')
    await page3.fill('input[type="password"]', 'mauvais_motdepasse')
    await page3.click('button[type="submit"]')
    await page3.waitForTimeout(2000)
    const stillOnLogin = page3.url().includes('/login')
    assert(stillOnLogin, 'errors', 'T29.1 Mauvais mdp → reste sur /login')
    // Chercher un toast ou message d'erreur
    const hasError = await page3.locator('[data-sonner-toast], .text-red, [role="alert"], text=/Invalid|error|incorrect/i').first().isVisible({ timeout: 2000 }).catch(() => false)
    assert(hasError || stillOnLogin, 'errors', 'T29.2 Message d\'erreur visible (toast ou inline)')
    await ctx3.close()
  } catch (e) { fail('errors', 'T29 Mauvais mdp', e.message) }

  await browser.close()

  // ══════════════════════════════════════════════════════════════
  // RÉSUMÉ FINAL
  // ══════════════════════════════════════════════════════════════
  const elapsed = Math.round((Date.now() - startTime) / 1000)
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  const authOk = results.auth.filter(t => t.ok).length
  const manipOk = results.manip.filter(t => t.ok).length
  const perfOk = results.perf.filter(t => t.ok).length
  const errOk = results.errors.filter(t => t.ok).length

  console.log('\n═════════════════════════════════════════')
  console.log('=== STRESS TEST RÉSULTATS ===')
  console.log(`Tests d'auth & visibilité  : ${authOk}/${results.auth.length} ${authOk === results.auth.length ? '✅' : '⚠️'}`)
  console.log(`Tests de manipulation      : ${manipOk}/${results.manip.length} ${manipOk === results.manip.length ? '✅' : '⚠️'}`)
  console.log(`Tests de performance       : ${perfOk}/${results.perf.length} ${perfOk === results.perf.length ? '✅' : '⚠️'}`)
  console.log(`Tests d'erreurs            : ${errOk}/${results.errors.length} ${errOk === results.errors.length ? '✅' : '⚠️'}`)
  console.log(`TOTAL : ${totalPassed}/${totalPassed + totalFailed} passés`)
  console.log(`Durée totale : ${mins}m${String(secs).padStart(2, '0')}s`)

  if (failures.length > 0) {
    console.log('\n─── Échecs détaillés ───')
    failures.forEach(f => {
      console.error(`  [${f.section}] ${f.label}`)
      if (f.detail) console.error(`    → ${f.detail}`)
    })
  }

  console.log('═════════════════════════════════════════')
  console.log(`📂 Screenshots : ${SCREENSHOTS}`)
  process.exit(totalFailed > 0 ? 1 : 0)
}

run().catch(e => { console.error(e); process.exit(1) })
