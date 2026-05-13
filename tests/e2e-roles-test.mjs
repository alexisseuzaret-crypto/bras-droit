/**
 * Tests d'acceptation : modèle hiérarchique 7 rôles
 * Tests RLS via l'API REST Supabase (vrais JWT, pas superuser)
 * + Test signup flow via Playwright
 */
import { chromium } from 'playwright'

const SUPABASE_URL = 'https://wnunhonivbhufgdnuozc.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndudW5ob25pdmJodWZnZG51b3pjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMTA1NjUsImV4cCI6MjA5MjU4NjU2NX0.NNjA6k346oWPjN_HEIfAep4PNTJUQ9ic20ycmxXLDcY'
const APP_URL = 'https://bras-droit-tau.vercel.app'

async function signIn(email, password) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!r.ok) throw new Error(`SignIn failed for ${email}: ${r.status}`)
  return (await r.json()).access_token
}

async function queryTasks(accessToken) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/tasks?select=id,title,is_private,creator_id&order=created_at`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Accept-Profile': 'bras_droit',
    }
  })
  return r.json()
}

async function queryProfiles(accessToken) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,email,role,manager_id&order=created_at`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Accept-Profile': 'bras_droit',
    }
  })
  return r.json()
}

async function queryMyTasks(accessToken, userId) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/tasks?select=id,title,status&or=(assignee_id.eq.${userId},creator_id.eq.${userId})&order=created_at`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Accept-Profile': 'bras_droit',
    }
  })
  return r.json()
}

async function patchTask(accessToken, taskId, update) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${taskId}`, {
    method: 'PATCH',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept-Profile': 'bras_droit',
      'Content-Profile': 'bras_droit',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(update),
  })
  return r.status
}

let passed = 0
let failed = 0

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`)
    passed++
  } else {
    console.error(`  ❌ ${label}`)
    failed++
  }
}

async function run() {
  console.log('=== TESTS RLS HIÉRARCHIE ===\n')

  // Obtenir les tokens — comptes réels uniquement
  const martinToken  = await signIn('martin@mister-ia.com',           'Martin@MIA26')
  const alexisToken  = await signIn('alexis.seuzaret@mister-ia.com',  'Alexis@MIA26')
  const adelToken    = await signIn('adel.dghim@mister-ia.com',       'Adel@MIA26')
  const romainToken  = await signIn('romain.fouquet@mister-ia.com',   'Romain@MIA26')

  // IDs — comptes réels
  const MARTIN_ID       = '7e387043-6b82-47fd-aea3-d489194b52ca'
  const ALEXIS_ID       = '53427e10-8fe0-4e8c-9768-ff88d6fe9b10'
  const ADEL_ID         = 'fc2811b2-07d3-4503-afab-2348215cd429'  // bras_droit, même manager que Alexis
  const ROMAIN_ID       = '91f5d546-1112-40bc-a404-b7b75eecd270'  // sales, manager Adrien
  const JT_ID           = '68cd3588-8a95-4bdb-9eaa-4a865d2ecec2'
  const OCEANE_ID       = '4319dfa6-0abb-4af5-bc80-82378296c079'
  const ELISE_ID        = '3e54bbdb-4d5a-4dfe-932f-fbc3d33efac8'
  const GEOFFROY_ID     = '52fe1aff-75c6-457a-84a2-35ee5cdb61e9'
  const LUC_ID          = '2b6e43cf-06b1-49b6-8d55-c035ed63df2e'
  const ALEXIS_TASK_ID  = '912b0504-ae3c-47f9-81e1-4138546d536b'  // "Finir dashboard"

  // --- TEST 1 : Profiles visibles par rôle ---
  console.log('TEST 1 : Profiles visibles par rôle')
  const martinProfiles = await queryProfiles(martinToken)
  const alexisProfiles = await queryProfiles(alexisToken)
  const adelProfiles   = await queryProfiles(adelToken)

  const martinIds = martinProfiles.map(p => p.id)
  const alexisIds = alexisProfiles.map(p => p.id)
  const adelIds   = adelProfiles.map(p => p.id)

  assert(martinIds.includes(MARTIN_ID) && martinIds.includes(ALEXIS_ID) && martinIds.includes(ADEL_ID) && martinIds.includes(ROMAIN_ID), 'direction voit tout le monde')
  assert(alexisIds.includes(ALEXIS_ID), 'bras_droit voit lui-même')
  assert(alexisIds.includes(MARTIN_ID), 'bras_droit voit son manager')
  assert(!alexisIds.includes(ADEL_ID),   'bras_droit ne voit PAS un autre bras_droit du même manager')
  assert(!alexisIds.includes(ROMAIN_ID), 'bras_droit ne voit PAS un sales sans lien')
  assert(adelIds.includes(ADEL_ID) && adelIds.includes(MARTIN_ID), 'autre bras_droit voit lui-même + son manager')
  assert(!adelIds.includes(ALEXIS_ID), 'autre bras_droit ne voit PAS Alexis (même manager, accès séparé)')

  // --- TEST 2 : Tasks visibles ---
  console.log('\nTEST 2 : Tasks visibles par rôle')
  const martinTasks = await queryTasks(martinToken)
  const alexisTasks = await queryTasks(alexisToken)
  const adelTasks   = await queryTasks(adelToken)

  const martinTitles = martinTasks.map(t => t.title)
  const alexisTitles = alexisTasks.map(t => t.title)
  const adelTitles   = adelTasks.map(t => t.title)

  assert(
    martinTitles.includes('Finir dashboard') &&
    martinTitles.includes('Tâche privée Alexis') &&
    martinTitles.includes('Tâche Romain'),
    'direction voit toutes les tâches y compris privées'
  )
  assert(alexisTitles.includes('Finir dashboard'),      'bras_droit voit sa tâche publique')
  assert(alexisTitles.includes('Tâche privée Alexis'),  'bras_droit voit sa tâche privée (créateur)')
  assert(!alexisTitles.includes('Tâche publique Adel'), 'bras_droit ne voit PAS les tâches d\'un autre bras_droit')
  assert(!alexisTitles.includes('Tâche Romain'),        'bras_droit ne voit PAS les tâches sales')

  // --- TEST 3 : is_private masqué pour les non-créateurs ---
  console.log('\nTEST 3 : is_private filtre correctement')
  assert(!adelTitles.includes('Tâche privée Alexis'), 'autre bras_droit ne voit PAS la tâche privée d\'Alexis')

  // --- TEST 4 : Sales (Romain) ne voit que ses propres tâches ---
  console.log('\nTEST 4 : Sales (Romain) — visibilité limitée')
  const romainTasks    = await queryTasks(romainToken)
  const romainProfiles = await queryProfiles(romainToken)
  const romainTitles   = romainTasks.map(t => t.title)
  const romainIds      = romainProfiles.map(p => p.id)

  assert(romainIds.length === 1 && romainIds[0] === ROMAIN_ID, 'sales sans bras_droits ne voit que lui-même')
  assert(romainTitles.includes('Tâche Romain'),        'sales voit ses propres tâches')
  assert(!romainTitles.includes('Finir dashboard'),    'sales ne voit PAS les tâches d\'autres')

  // --- TEST 5 : Signup flow via Playwright ---
  console.log('\nTEST 5 : Signup flow (bras_droit avec manager)')
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  await page.goto(`${APP_URL}/signup`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('button[type="submit"]', { timeout: 15000 })

  await page.fill('input#fullName',        'Test Signup BD')
  await page.fill('input[type="email"]',   'test_signup_bd@mister-ia.com')
  await page.fill('input[type="password"]','TestSignup123!')

  const managerSelectVisible = await page.waitForSelector(
    'text=Sélectionner un manager',
    { timeout: 5000, state: 'visible' }
  ).then(() => true).catch(() => false)

  if (!managerSelectVisible) {
    try {
      await page.locator('button[role="combobox"]').first().click()
      await page.waitForTimeout(300)
      await page.getByRole('option', { name: 'Bras droit' }).click()
      await page.waitForTimeout(500)
    } catch {}
  }

  const finalVisible = managerSelectVisible ||
    await page.locator('text=Sélectionner un manager').isVisible().catch(() => false)
  assert(finalVisible, 'Select manager apparaît quand bras_droit sélectionné')

  await browser.close()

  // --- TEST 6 : DAF voit uniquement lui-même + ses bras_droits ---
  console.log('\nTEST 6 : DAF (Jean-Thomas) profile visibility')
  try {
    const jtToken    = await signIn('jean-thomas@mister-ia.com', 'JT@MIA26')
    const jtProfiles = await queryProfiles(jtToken)
    const jtIds      = jtProfiles.map(p => p.id)

    assert(jtIds.includes(JT_ID),       'DAF voit lui-même')
    assert(jtIds.includes(GEOFFROY_ID), 'DAF voit Geoffroy (son bras_droit)')
    assert(jtIds.includes(LUC_ID),      'DAF voit Luc (son bras_droit)')
    assert(jtIds.length === 3,          `DAF voit exactement 3 profils, got ${jtIds.length}`)
    assert(!jtIds.includes(MARTIN_ID),  'DAF ne voit PAS Direction')
    assert(!jtIds.includes(ALEXIS_ID),  'DAF ne voit PAS bras_droit d\'un autre manager')
  } catch (e) {
    console.error('  Test DAF failed:', e.message)
    failed++
  }

  // --- TEST 7 : Sales (Romain) ne voit que lui-même (profils) ---
  console.log('\nTEST 7 : Sales (Romain) — déjà couvert ci-dessus, vérification count')
  assert(romainIds.length === 1, `Sales : exactement 1 profil visible, got ${romainIds.length}`)

  // --- TEST 8 : Consultant junior voit elle-même + son manager ---
  console.log('\nTEST 8 : Consultant junior (Océane) profile visibility')
  try {
    const oceaneToken    = await signIn('oceane.gozlan@mister-ia.com', 'Oceane@MIA26')
    const oceaneProfiles = await queryProfiles(oceaneToken)
    const oceaneIds      = oceaneProfiles.map(p => p.id)

    assert(oceaneIds.includes(OCEANE_ID), 'Consultant junior voit elle-même')
    assert(oceaneIds.includes(ELISE_ID),  'Consultant junior voit son manager (Élise)')
    assert(oceaneIds.length === 2,        `Consultant junior voit exactement 2 profils, got ${oceaneIds.length}`)
    assert(!oceaneIds.includes(MARTIN_ID),'Consultant junior ne voit PAS Direction')
  } catch (e) {
    console.error('  Test Consultant junior failed:', e.message)
    failed++
  }

  // --- TEST 9 : Filtre "mine" — creator_id OR assignee_id ---
  console.log('\nTEST 9 : Filtre mine — palette calendrier retourne les tâches Alexis')
  try {
    const myTasks    = await queryMyTasks(alexisToken, ALEXIS_ID)
    const myTitles   = myTasks.map(t => t.title)
    assert(myTitles.includes('Finir dashboard'),     'Mine filter retourne la tâche publique Alexis')
    assert(myTitles.includes('Tâche privée Alexis'), 'Mine filter retourne la tâche privée Alexis')
    const nonDone = myTasks.filter(t => t.status !== 'done')
    assert(nonDone.length >= 1, 'Au moins une tâche non-done dans la palette')
  } catch (e) {
    console.error('  Test mine filter failed:', e.message)
    failed++
  }

  // --- TEST 10 : Manager peut mettre à jour la tâche d'un bras_droit ---
  console.log('\nTEST 10 : RLS UPDATE — Martin PATCH la tâche d\'Alexis')
  try {
    const status = await patchTask(martinToken, ALEXIS_TASK_ID, { position: 99 })
    assert(status === 204, `Martin peut PATCH tâche Alexis (HTTP ${status}, attendu 204)`)
    await patchTask(martinToken, ALEXIS_TASK_ID, { position: 0 })
  } catch (e) {
    console.error('  Test RLS update failed:', e.message)
    failed++
  }

  // --- Résumé ---
  console.log(`\n=== RÉSULTATS : ${passed} passés / ${passed + failed} total ===`)
  if (failed > 0) {
    console.error(`${failed} test(s) ÉCHOUÉ(s)`)
    process.exit(1)
  } else {
    console.log('✅ Tous les tests passés')
    process.exit(0)
  }
}

run().catch(e => { console.error(e); process.exit(1) })
