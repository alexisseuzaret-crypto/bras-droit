/**
 * Tests d'acceptation : modèle hiérarchique 5 rôles
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
  const martinToken = await signIn('martin@mister-ia.com', 'Martin@BrasDroit26')
  const alexisToken = await signIn('alexis.seuzaret@mister-ia.com', 'Alexis@BrasDroit26')
  const testBdToken = await signIn('test_bd@mister-ia.com', 'Test123!')

  // IDs connus
  const MARTIN_ID = '7e387043-6b82-47fd-aea3-d489194b52ca'
  const ALEXIS_ID = '53427e10-8fe0-4e8c-9768-ff88d6fe9b10'
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
