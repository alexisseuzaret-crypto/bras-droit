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

  // Obtenir les tokens
  const martinToken = await signIn('martin@mister-ia.com', 'Martin@MIA26')
  const alexisToken = await signIn('alexis.seuzaret@mister-ia.com', 'Alexis@MIA26')
  const testBdToken = await signIn('test_bd@mister-ia.com', 'Test123!')

  // IDs connus — comptes réels
  const MARTIN_ID = '7e387043-6b82-47fd-aea3-d489194b52ca'
  const ALEXIS_ID = '53427e10-8fe0-4e8c-9768-ff88d6fe9b10'
  const JT_ID = '68cd3588-8a95-4bdb-9eaa-4a865d2ecec2'
  const ROMAIN_ID = '91f5d546-1112-40bc-a404-b7b75eecd270'
  const OCEANE_ID = '4319dfa6-0abb-4af5-bc80-82378296c079'
  const ELISE_ID = '3e54bbdb-4d5a-4dfe-932f-fbc3d33efac8'
  const GEOFFROY_ID = '52fe1aff-75c6-457a-84a2-35ee5cdb61e9'
  const LUC_ID = '2b6e43cf-06b1-49b6-8d55-c035ed63df2e'
  const ALEXIS_TASK_ID = '912b0504-ae3c-47f9-81e1-4138546d536b'

  // IDs comptes de test legacy
  const TEST_BD_ID = 'daa28adc-7845-4f08-880e-17ca89d276a2'
  const SALES_ID = '8520e84d-bc33-4819-ace4-b0e5c85ca2c9'

  // --- TEST 1 : Profiles visibles par rôle ---
  console.log('TEST 1 : Profiles visibles par rôle')
  const martinProfiles = await queryProfiles(martinToken)
  const alexisProfiles = await queryProfiles(alexisToken)
  const testBdProfiles = await queryProfiles(testBdToken)

  const martinIds = martinProfiles.map(p => p.id)
  const alexisIds = alexisProfiles.map(p => p.id)
  const testBdIds = testBdProfiles.map(p => p.id)

  assert(martinIds.includes(MARTIN_ID) && martinIds.includes(ALEXIS_ID) && martinIds.includes(TEST_BD_ID) && martinIds.includes(SALES_ID), 'direction voit tout le monde')
  assert(alexisIds.includes(ALEXIS_ID), 'bras_droit voit lui-même')
  assert(alexisIds.includes(MARTIN_ID), 'bras_droit voit son manager')
  assert(!alexisIds.includes(TEST_BD_ID), 'bras_droit ne voit PAS un autre bras_droit')
  assert(!alexisIds.includes(SALES_ID), 'bras_droit ne voit PAS un sales sans lien')
  assert(testBdIds.includes(TEST_BD_ID) && testBdIds.includes(MARTIN_ID), 'test_bd voit lui-même + son manager')
  assert(!testBdIds.includes(ALEXIS_ID), 'test_bd ne voit PAS un autre bras_droit du même manager')

  // --- TEST 2 : Tasks visibles ---
  console.log('\nTEST 2 : Tasks visibles par rôle')
  const martinTasks = await queryTasks(martinToken)
  const alexisTasks = await queryTasks(alexisToken)
  const testBdTasks = await queryTasks(testBdToken)

  const martinTitles = martinTasks.map(t => t.title)
  const alexisTitles = alexisTasks.map(t => t.title)
  const testBdTitles = testBdTasks.map(t => t.title)

  assert(martinTitles.includes('Tâche publique Alexis') && martinTitles.includes('Tâche PRIVÉE Alexis') && martinTitles.includes('Tâche Sales (test)'), 'direction voit toutes les tâches y compris privées')
  assert(alexisTitles.includes('Tâche publique Alexis'), 'bras_droit voit ses tâches publiques')
  assert(alexisTitles.includes('Tâche PRIVÉE Alexis'), 'bras_droit voit ses tâches privées (créateur)')
  assert(!alexisTitles.includes('Tâche publique Test_BD'), 'bras_droit ne voit PAS les tâches d\'un autre bras_droit')
  assert(!alexisTitles.includes('Tâche Sales (test)'), 'bras_droit ne voit PAS les tâches sales')

  // --- TEST 3 : is_private masqué pour les non-créateurs ---
  console.log('\nTEST 3 : is_private filtre correctement')
  const testBdPrivate = testBdTitles.includes('Tâche PRIVÉE Alexis')
  assert(!testBdPrivate, 'test_bd ne voit PAS la tâche privée d\'Alexis')

  // --- TEST 4 : test_sales ne voit que lui-même ---
  console.log('\nTEST 4 : Sales sans bras_droits')
  try {
    const salesToken = await signIn('test_sales@mister-ia.com', 'Test123!')
    const salesTasks = await queryTasks(salesToken)
    const salestTitles = salesTasks.map(t => t.title)
    const salesProfiles = await queryProfiles(salesToken)
    assert(salesProfiles.length === 1 && salesProfiles[0].id === SALES_ID, 'sales sans bras_droits voit uniquement lui-même')
    assert(salestTitles.includes('Tâche Sales (test)') && !salestTitles.includes('Tâche publique Alexis'), 'sales ne voit que ses propres tâches')
  } catch (e) {
    console.error('  Test sales failed:', e.message)
    failed++
  }

  // --- TEST 5 : Signup flow via Playwright ---
  console.log('\nTEST 5 : Signup flow (bras_droit avec manager)')
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  let signupToken = null
  ctx.on('response', async res => {
    if (res.url().includes('/auth/v1/token') && res.status() === 200) {
      try { const d = await res.json(); signupToken = d.access_token } catch {}
    }
  })

  await page.goto(`${APP_URL}/signup`, { waitUntil: 'domcontentloaded' })

  // Attendre que le formulaire soit hydraté (bouton submit présent)
  await page.waitForSelector('button[type="submit"]', { timeout: 15000 })

  // Remplir nom + email + password
  await page.fill('input#fullName', 'Test Signup BD')
  await page.fill('input[type="email"]', 'test_signup_bd@mister-ia.com')
  await page.fill('input[type="password"]', 'TestSignup123!')

  // Le rôle par défaut est bras_droit — le label "Manager" doit déjà être visible
  // Attendre jusqu'à 5s que le section manager apparaisse (hydratation React)
  const managerSelectVisible = await page.waitForSelector(
    'text=Sélectionner un manager',
    { timeout: 5000, state: 'visible' }
  ).then(() => true).catch(() => false)

  if (!managerSelectVisible) {
    // Fallback : essayer de sélectionner "Bras droit" si le rôle a changé
    try {
      await page.locator('button[role="combobox"]').first().click()
      await page.waitForTimeout(300)
      await page.getByRole('option', { name: 'Bras droit' }).click()
      await page.waitForTimeout(500)
    } catch {}
  }

  const finalVisible = managerSelectVisible || await page.locator('text=Sélectionner un manager').isVisible().catch(() => false)
  assert(finalVisible, 'Select manager apparaît quand bras_droit sélectionné')

  // Ne pas soumettre pour ne pas créer un vrai compte de test dans Supabase
  // (cleanup : on va juste vérifier la présence du select)

  await browser.close()

  // --- TEST 6 : DAF voit uniquement lui-même + ses bras_droits ---
  console.log('\nTEST 6 : DAF (Jean-Thomas) profile visibility')
  try {
    const jtToken = await signIn('jean-thomas@mister-ia.com', 'JT@MIA26')
    const jtProfiles = await queryProfiles(jtToken)
    const jtIds = jtProfiles.map(p => p.id)

    assert(jtIds.includes(JT_ID), 'DAF voit lui-même')
    assert(jtIds.includes(GEOFFROY_ID), 'DAF voit Geoffroy (son bras_droit)')
    assert(jtIds.includes(LUC_ID), 'DAF voit Luc (son bras_droit)')
    assert(jtIds.length === 3, `DAF voit exactement 3 profils (lui + 2 BD), got ${jtIds.length}`)
    assert(!jtIds.includes(MARTIN_ID), 'DAF ne voit PAS Direction')
    assert(!jtIds.includes(ALEXIS_ID), 'DAF ne voit PAS un bras_droit d\'un autre manager')
  } catch (e) {
    console.error('  Test DAF failed:', e.message)
    failed++
  }

  // --- TEST 7 : Sales sans bras_droits ne voit que lui-même ---
  console.log('\nTEST 7 : Sales (Romain) profile visibility')
  try {
    const romainToken = await signIn('romain.fouquet@mister-ia.com', 'Romain@MIA26')
    const romainProfiles = await queryProfiles(romainToken)
    const romainIds = romainProfiles.map(p => p.id)

    assert(romainIds.includes(ROMAIN_ID), 'Sales voit lui-même')
    assert(romainIds.length === 1, `Sales sans BD voit exactement 1 profil, got ${romainIds.length}`)
    assert(!romainIds.includes(MARTIN_ID), 'Sales ne voit PAS Direction')
  } catch (e) {
    console.error('  Test Sales failed:', e.message)
    failed++
  }

  // --- TEST 8 : Consultant junior voit elle-même + son manager ---
  console.log('\nTEST 8 : Consultant junior (Océane) profile visibility')
  try {
    const oceaneToken = await signIn('oceane.gozlan@mister-ia.com', 'Oceane@MIA26')
    const oceaneProfiles = await queryProfiles(oceaneToken)
    const oceaneIds = oceaneProfiles.map(p => p.id)

    assert(oceaneIds.includes(OCEANE_ID), 'Consultant junior voit elle-même')
    assert(oceaneIds.includes(ELISE_ID), 'Consultant junior voit son manager (Élise)')
    assert(oceaneIds.length === 2, `Consultant junior voit exactement 2 profils, got ${oceaneIds.length}`)
    assert(!oceaneIds.includes(MARTIN_ID), 'Consultant junior ne voit PAS Direction')
  } catch (e) {
    console.error('  Test Consultant junior failed:', e.message)
    failed++
  }

  // --- TEST 9 : Filtre "mine" calendrier (creator_id OR assignee_id) ---
  console.log('\nTEST 9 : Filtre mine — tâches in_progress apparaissent dans la palette calendrier')
  try {
    const myTasks = await queryMyTasks(alexisToken, ALEXIS_ID)
    const myTitles = myTasks.map(t => t.title)
    assert(myTitles.includes('Finir dashboard'), 'Mine filter retourne la tâche Alexis (creator = assignee = Alexis)')
    const nonDoneTasks = myTasks.filter(t => t.status !== 'done')
    assert(nonDoneTasks.length >= 1, 'Au moins une tâche non-done dans la palette')
  } catch (e) {
    console.error('  Test mine filter failed:', e.message)
    failed++
  }

  // --- TEST 10 : Manager peut mettre à jour la position d'une tâche de son bras_droit ---
  console.log('\nTEST 10 : RLS UPDATE — Martin met à jour la position d\'une tâche d\'Alexis')
  try {
    const statusBefore = await patchTask(martinToken, ALEXIS_TASK_ID, { position: 99 })
    assert(statusBefore === 204, `Martin peut PATCH la tâche d'Alexis (HTTP ${statusBefore}, attendu 204)`)
    // Remettre la position d'origine
    await patchTask(martinToken, ALEXIS_TASK_ID, { position: 0 })
  } catch (e) {
    console.error('  Test RLS update failed:', e.message)
    failed++
  }

  // --- Cleanup : supprimer les users de test ---
  console.log('\nCLEANUP : suppression des users de test')
  try {
    // Appel direct SQL via API (pas possible sans service role key)
    // On laisse le cleanup manuel ou via MCP
    console.log('  ⚠️  Users test_bd et test_sales à supprimer manuellement via MCP')
  } catch {}

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
