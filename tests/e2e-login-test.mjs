import { chromium } from 'playwright'

const URL = 'https://bras-droit-tau.vercel.app'
const EMAIL = 'alexis.seuzaret@mister-ia.com'
const PASSWORD = 'Alexis@BrasDroit26'

async function run() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  const redirects = []
  page.on('response', res => {
    if (res.status() >= 300 && res.status() < 400) {
      redirects.push(`${res.status()} ${res.url()} → ${res.headers()['location']}`)
    }
  })

  console.log('1. Navigation vers /login')
  await page.goto(`${URL}/login`, { waitUntil: 'networkidle' })
  console.log(`   URL: ${page.url()}`)

  console.log('2. Remplissage du formulaire')
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)

  console.log('3. Submit')
  await page.click('button[type="submit"]')

  // Attente navigation complète (hard nav = full page load)
  await page.waitForURL(`${URL}/kanban`, { timeout: 15000 }).catch(() => {})

  const finalUrl = page.url()
  console.log(`4. URL finale: ${finalUrl}`)

  // Stabilité : 5 secondes sans navigation
  let stable = true
  const urlBefore = page.url()
  await page.waitForTimeout(5000)
  const urlAfter = page.url()
  if (urlBefore !== urlAfter) {
    stable = false
    console.log(`   INSTABLE: ${urlBefore} → ${urlAfter}`)
  }

  // Vérification contenu
  const hasKanban = await page.locator('text=Kanban').first().isVisible().catch(() => false)
  const bodyText = await page.locator('body').innerText().catch(() => '')
  const hasContent = bodyText.length > 100

  console.log('\n=== RÉSULTATS ===')
  console.log(`URL finale: ${finalUrl}`)
  console.log(`Atteint /kanban: ${finalUrl.includes('/kanban')}`)
  console.log(`URL stable 5s: ${stable}`)
  console.log(`Contenu Kanban visible: ${hasKanban}`)
  console.log(`Body non-vide: ${hasContent}`)
  console.log(`Redirects interceptés: ${redirects.length}`)
  redirects.forEach(r => console.log(`  ${r}`))

  const success = finalUrl.includes('/kanban') && stable && hasContent
  console.log(`\n${success ? '✅ TEST PASSÉ' : '❌ TEST ÉCHOUÉ'}`)

  await browser.close()
  process.exit(success ? 0 : 1)
}

run().catch(e => { console.error(e); process.exit(1) })
