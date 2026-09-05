/**
 * Comparación mockup ↔ motor, ejecutando los dos.
 *
 *  - El mockup corre en Chromium, con su runtime y su `datos-edificio.js`.
 *  - El motor corre en Node, importado de `lib/calculo/`.
 *  - Además se leen de la pantalla renderizada las siete cuotas de junio, para
 *    comprobar que la interfaz pinta lo que el motor devuelve y no otra cosa.
 *
 * Julio no es alcanzable en la interfaz de solo lectura del prototipo: su lista
 * de meses (`MESES`) llega hasta junio. Se compara contra el motor del mockup
 * ejecutado en el navegador, que es el mismo código que alimenta la pantalla.
 */
import { chromium } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'

const CDN = '/tmp/claude-0/-home-user-Salazar-Barreto-BOB/43962ced-f1af-58ab-813c-36f0dab47336/scratchpad/cdn'
const L = {
  'https://unpkg.com/react@18.3.1/umd/react.production.min.js': `${CDN}/r/package/umd/react.production.min.js`,
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js': `${CDN}/rd/package/umd/react-dom.production.min.js`,
  'https://unpkg.com/@babel/standalone@7.26.4/babel.min.js': `${CDN}/b/package/babel.min.js`,
}
const HTML = 'file://' + path.resolve('mockup/design_handoff_edificio_salazar_barreto/Salazar Barreto v2.dc.html')

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const p = await b.newPage({ viewport: { width: 440, height: 1600 } })
await p.route('**/*', async r => {
  const u = r.request().url()
  if (L[u]) return r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(L[u], 'utf8') })
  if (u.startsWith('https://fonts.')) return r.fulfill({ status: 200, contentType: 'text/css', body: '' })
  return r.continue()
})
await p.addInitScript(() => localStorage.setItem('sb2-dpto', '401'))
await p.goto(HTML, { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(4500)

// 1 · Lo que el navegador PINTA para junio, leído de la pantalla
await p.evaluate(() => {
  const barra = [...document.querySelectorAll('div')].find(e => e.style.height === '62px' && e.style.borderRadius === '999px' && e.style.background === 'rgb(23, 23, 43)')
  barra?.children[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
})
await p.waitForTimeout(1200)
const pantalla = await p.evaluate(() => {
  const t = document.body.innerText
  const bloque = t.split('LAS 7 CUOTAS')[1]?.split('PAGOS RECIBIDOS')[0] ?? ''
  const cuotas = {}
  for (const m of bloque.matchAll(/(101|201|202|301|401|501|502)\nmant\. ([\d,.]+) \+ agua ([\d,.]+)\n([\d,.]+)/g)) {
    cuotas[m[1]] = { mantenimiento: m[2], agua: m[3], total: m[4] }
  }
  return {
    cuotas,
    totalMes: t.match(/COSTÓ MANTENER EL EDIFICIO\nS\/\n([\d,.]+)/)?.[1] ?? null,
    aguaM3: t.match(/AGUA SEDAPAL\n(\d+)/)?.[1] ?? null,
    facturaAgua: t.match(/FACTURA DE AGUA\n([\d,.]+)/)?.[1] ?? null,
    areaComun: t.match(/([\d,.]+) m³ del área común/)?.[1] ?? null,
  }
})
await p.screenshot({ path: '/tmp/claude-0/-home-user-Salazar-Barreto-BOB/43962ced-f1af-58ab-813c-36f0dab47336/scratchpad/mes-junio.png', fullPage: true })

// 2 · Lo que el MOTOR DEL MOCKUP devuelve, ejecutado dentro del navegador
const motorMockup = await p.evaluate(() => {
  const D = window.__EDIF__
  const salida = {}
  for (const mes of ['2026-06', '2026-07']) {
    const c = D.calcularMes(mes)
    salida[mes] = {
      totalMes: c.totalMes, facturaAgua: c.facturaAgua, comunReal: c.comunReal,
      montoComun: c.montoComun, sumaMedida: c.sumaMedida, lavado: c.lavado,
      cuotas: Object.fromEntries(Object.entries(c.cuotas).map(([k, v]) =>
        [k, { mantenimiento: v.mantenimiento, agua: v.agua, total: v.total, m3: v.m3 }])),
    }
  }
  salida.saldoJunio = D.saldoAl('2026-06').saldo
  salida.fmtEjemplo = D.fmt(1625)
  return salida
})
await b.close()
fs.writeFileSync('/tmp/claude-0/-home-user-Salazar-Barreto-BOB/43962ced-f1af-58ab-813c-36f0dab47336/scratchpad/desde-navegador.json',
  JSON.stringify({ pantalla, motorMockup }, null, 1))
console.log(JSON.stringify({ pantalla, motorMockup }, null, 1).slice(0, 1800))
