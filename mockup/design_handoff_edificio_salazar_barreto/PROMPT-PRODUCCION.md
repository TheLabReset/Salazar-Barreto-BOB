# Prompt de implementación · Edificio Jr. Enrique Salazar Barreto

> **Cómo usar este archivo:** copia todo su contenido y pégalo como primer mensaje a
> Claude Code, en un repositorio nuevo que contenga únicamente la carpeta `mockup/`
> con este paquete de handoff dentro.

---

Vas a construir una aplicación web de producción a partir del mockup de diseño que
está en `mockup/`. Lee **todo** `mockup/` antes de escribir una sola línea de código.

Trabaja en **fases**. Al final de cada fase actúas como **verificador adversario** de
tu propio trabajo: intentas romperlo, buscas lo que falta, y no pasas a la siguiente
fase hasta que la verificación pasa. Si algo no pasa, lo arreglas y vuelves a verificar.

No me pidas confirmación entre fases. Avanza hasta el final y repórtame al terminar.

---

## Contexto del proyecto

Siete departamentos de un edificio en Lima se autoadministran. La app existe para que
**cada sol sea visible y explicable**: toda cuota se abre y muestra cómo se calculó,
con los números del recibo de SEDAPAL al lado.

- **Usuarios:** 7 hogares. Uno administra en un momento dado (rotativo, sin sistema de roles).
- **Dispositivo:** teléfono, casi exclusivamente. PWA instalable.
- **Idioma:** español peruano. Moneda: soles (S/). Consumo: metros cúbicos (m³).
- **Tono:** vecinos, no morosos. Nunca "deudor", "moroso", "vencido", ni rojo para un pago.

Los dos principios están en `mockup/README.md` §1. Léelos y respétalos: gobiernan
decisiones de producto, no solo de estilo.

---

## Stack obligatorio

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend | **Next.js 15 App Router + TypeScript strict** | Deploy en Vercel |
| Estilos | **Tailwind CSS 4** con tokens en `@theme` | Ver Fase 2 |
| Estado servidor | **TanStack Query v5** | |
| Backend | **Next.js Route Handlers** | En el mismo repo, deploy en Vercel |
| Base de datos | **PostgreSQL en Railway** | |
| ORM | **Prisma** | Migraciones versionadas |
| Validación | **Zod** — esquemas compartidos cliente/servidor | |
| Tests | **Vitest** (unitarios) + **Playwright** (e2e) | |
| Bob (IA) | **DeepSeek V4 Flash**, vía adaptador | Ver Fase 8 |

**No añadas** librerías de componentes (shadcn, MUI, Chakra), de gráficos (recharts,
chart.js) ni de animación (framer-motion). El diseño es específico y las medidas están
documentadas; una librería genérica te va a pelear cada píxel. Los gráficos son barras
y sparklines: SVG a mano, cuarenta líneas.

---

# FASE 0 · Lectura y plan

1. Lee los siete documentos de `mockup/`: `README.md` y `01` a `06`.
2. Abre `mockup/Salazar Barreto v2.dc.html` y estúdialo. Es la referencia visual
   literal. Ignora `support.js` — es andamiaje de la herramienta de diseño, no lo portes.
3. Lee `mockup/datos-edificio.js` línea por línea. **Es el único archivo que se porta
   con fidelidad literal.** Contiene el motor de cálculo validado contra recibos reales.
4. Escribe `docs/PLAN.md`: árbol de archivos que vas a crear, decisiones tomadas, y
   dudas que resolviste solo (con el criterio que usaste).

### Verificador adversario · Fase 0

Responde en `docs/verificacion-0.md`, por escrito:

- ¿Cuál es la diferencia entre un **gasto extraordinario** y un **crédito** a un
  departamento? ¿Quién paga cada uno? Si tu respuesta no menciona que el crédito sale
  del saldo de la cuenta y no del bolsillo de los otros seis, vuelve a leer §4.2.
- ¿Por qué el lavado del 401 **se reasigna** y no se suma? ¿Qué pasaba con la primera
  versión? Si no puedes explicar por qué sobraba dinero sin dueño, vuelve a leer §3.3.
- ¿Qué es el "reparto ajustado" y cuándo se activa? ¿Cómo se llama **en la interfaz**?
- ¿Cuántos estados tiene un pago y cuál de ellos **no** suma al saldo?
- ¿Qué genera un aviso a los siete vecinos y qué no? Si tu respuesta no distingue
  entre un mes publicado y uno en curso, vuelve a leer `06` §3.

Si falla alguna, no avances.

---

# FASE 1 · Motor de cálculo y tests

**Esta fase es la más importante del proyecto.** Es la única parte donde un error
cuesta dinero real y confianza entre vecinos. Hazla primero, con tests, y sin interfaz.

### 1.1 Portar el motor

Crea `lib/calculo/` con TypeScript estricto:

```
lib/calculo/
  constantes.ts     DPTOS, GASTOS_FIJOS, LAVADO, SALDO_BASE
  tipos.ts          Departamento, Recibo, Lecturas, Overrides, ResultadoMes, CuotaDpto
  redondeo.ts       round2, round3, fmt, fmt3
  calcularMes.ts    la función principal
  saldo.ts          serieSaldo, saldoAl
  correccion.ts     proponerCorreccion
  index.ts
```

Reglas al portar:

- **No cambies el orden de las operaciones ni de los redondeos.** El cuadre depende
  de dónde cae cada `round2`. `precioM3` se arrastra sin redondear.
- Tipos exactos: lecturas `decimal(10,3)`, montos `decimal(10,2)`, flats `decimal(5,2)`.
- `ResultadoMes` debe exponer **todos** los campos de `01` §11. La interfaz los consume.
- Sin `any`. Sin `as` salvo con un comentario que justifique por qué.
- Cada función pura y sin efectos: mismas entradas, mismas salidas.

### 1.2 Tests

Escribe `lib/calculo/__tests__/` con Vitest. Como mínimo, **los 14 casos de
`01` §10 tal como están escritos**, más:

- Propiedad: para 200 combinaciones aleatorias de lecturas y recibos plausibles,
  `cuadraAgua` y `cuadraMes` son siempre verdaderos. Usa `fast-check` si ayuda.
- Propiedad: `Σ flat === 100.00` exacto.
- Propiedad: cambiar `lavadoM3` **nunca** cambia `totalMes`.
- Propiedad: un crédito a un departamento nunca sube la cuota de otro.
- Borde: `sumaMedida === m3Sedapal` exacto → `brutoComun === 0`, sin lavado, cuadra.
- Borde: un departamento con consumo 0 (medidor sin movimiento).
- Borde: `m3Sedapal === 0` → no debe dividir por cero; devuelve un resultado marcado
  como inválido, no `NaN`.
- Borde: todos los gastos fijos en `null` → `totalMes` es solo el agua y la luz.
- `proponerCorreccion`: con dos candidatas válidas devuelve `null`. Con una, la devuelve.
  Con una lectura menor que la anterior, `null`.

### Verificador adversario · Fase 1

1. `npx tsc --noEmit` sin errores. `npx vitest run` todo verde.
2. **Comparación numérica contra el mockup.** Abre el HTML del mockup en un navegador,
   anota las siete cuotas de junio y julio de 2026, el total del mes, el área común y
   el saldo. Compara con tu motor. **Deben coincidir al céntimo.** Si no, tu port
   tiene un bug — arréglalo, no ajustes el test.
3. Busca en tu propio código: ¿hay algún `round` que hayas movido de sitio? ¿algún
   `parseFloat` que pierda precisión? ¿algún `+` sobre strings?
4. Grepea `any`, `@ts-ignore`, `@ts-expect-error` en `lib/calculo/`. Deben ser cero.
5. Escribe `docs/verificacion-1.md` con la tabla de comparación mockup ↔ motor.

---

# FASE 2 · Tokens de diseño · cero valores huérfanos

**Requisito explícito del cliente: ningún color, tamaño, radio o espaciado suelto en
el código.** Todo pasa por un token.

### 2.1 Definir los tokens

Transcribe **exactamente** las tablas de `mockup/02-sistema-de-diseno.md` §1–3 a
`app/globals.css` con `@theme` de Tailwind 4:

```css
@theme {
  --color-crema: #F7F4EE;
  --color-papel: #FFFFFF;
  --color-noche: #17172B;
  --color-terra: #C9773A;
  /* … los 18 colores, sin excepción … */

  --color-agua: #3E93B8;        /* TODO lo relacionado con agua */
  --color-agua-claro: #8ECBE4;

  /* fondos suaves */
  --color-verde-suave: rgb(45 122 79 / .10);
  /* … */

  /* sobre noche */
  --color-sobre-noche: #F7F4EE;
  --color-sobre-noche-etiqueta: rgb(247 244 238 / .50);
  /* … */

  --font-titulo: 'Syne', sans-serif;
  --font-cuerpo: 'DM Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --radius-marco: 38px;
  --radius-hoja: 32px;
  --radius-noche: 24px;
  /* … los 9 radios … */

  --shadow-marco: 0 24px 60px rgb(14 14 14 / .13);
  --shadow-hoja: 0 -8px 40px rgb(14 14 14 / .2);
}

:root {
  --top: 38px;
  --bot: 20px;
  --rad: var(--radius-marco);
}
```

También la **escala tipográfica** de §2 como utilidades componibles — cada rol
(`titulo-pantalla`, `cifra-protagonista`, `etiqueta-seccion`, …) con su tamaño,
peso, interlineado y `letter-spacing` exactos.

> La `etiqueta-seccion` (mono 10px, `.16em`, mayúsculas) es el sello visual de la
> app y aparece en casi todas las secciones. Hazla un componente, no una clase que
> haya que recordar.

### 2.2 Fuentes

`next/font/google`: Syne (600, 700, 800), DM Sans (300, 400, 500), JetBrains Mono
(400, 500, 600). `display: 'swap'`, subconjunto latino. Autoalojadas por Next —
**sin `<link>` a Google Fonts**, que añade un salto de red en el arranque.

### 2.3 Primitivas

`components/ui/`: `Etiqueta`, `Cifra`, `PildoraEstado`, `TarjetaNoche`,
`TarjetaBlanca`, `FilaDivisoria`, `Boton`, `BotonSecundario`.

Cada una consume **solo** tokens. Ninguna acepta un color arbitrario por prop:
acepta una variante semántica (`estado="al-dia" | "sin-registrar" | "en-verificacion"`).

### Verificador adversario · Fase 2

Escribe un script `scripts/verificar-tokens.mjs` que falle el build si encuentra:

- Un hex (`/#[0-9a-f]{3,8}\b/i`) en cualquier `.tsx` o `.ts` fuera de `globals.css`
- Un `rgb(` o `rgba(` en `.tsx`
- Un `px` literal en una prop de `style` o en una clase arbitraria `[...]` de Tailwind,
  salvo los que estén en una lista blanca explícita y comentada
- Una clase de color de Tailwind por defecto (`text-gray-500`, `bg-slate-*`, …)
- Las palabras `Inter`, `Roboto`, `Arial` en cualquier archivo
- Un `font-family` que no venga de un token

Añádelo a `npm run verify` y al pipeline de CI.

Además, a mano:
- Compara tu paleta contra la tabla de `02` §1, color por color. ¿Los 18 están?
- ¿Hay algún sitio donde el agua **no** sea `--color-agua`? Debe ser celeste en
  consumo, factura, m³, gráficos y etiquetas. Sin excepción.
- ¿Hay rojo en algún estado de pago? No debe haberlo.
- ¿Hay más de un bloque `noche` en alguna pantalla? Solo uno por pantalla.

---

# FASE 3 · Base de datos y backend

### 3.1 Esquema

Traduce `mockup/06-modelo-de-datos.md` §1 a `prisma/schema.prisma`. Fíjate en:

- `Decimal` con precisión explícita, **nunca `Float`**. Lecturas `@db.Decimal(10,3)`,
  montos `@db.Decimal(10,2)`, flats `@db.Decimal(5,2)`.
- Los `@@unique` del documento: `(mes, dpto)` en lecturas y pagos, `mes` en recibo y cierre.
- `GastoFijo.monto` **nullable** — `null` significa "por confirmar" (el pozo a tierra).
  No lo pongas a 0: son cosas distintas y la interfaz las muestra distinto.
- `Auditoria` y `Aviso` completas desde el principio, no "para después".

### 3.2 Semilla

`prisma/seed.ts` que cargue los datos de `mockup/datos-edificio.js`: los siete
departamentos con sus flats **reales**, y los 8 meses de lecturas, recibos y pagos.

Marca claramente en el archivo qué es real y qué es de ejemplo:

```ts
// REAL — de la escritura del edificio. No modificar sin documento.
const DPTOS = [ … ]

// EJEMPLO — realista pero inventado. Reemplazar con los recibos verdaderos.
const LECTURAS = { … }
```

### 3.3 API

Route Handlers en `app/api/`. Todo validado con Zod, esquemas compartidos en `lib/esquemas/`.

```
GET    /api/meses                      lista de meses con su estado
GET    /api/meses/[mes]                ResultadoMes calculado
GET    /api/meses/[mes]/borrador       el mes en curso, con overrides sin guardar
PUT    /api/meses/[mes]/lecturas       guardar lecturas (parcial)
PUT    /api/meses/[mes]/recibo         guardar recibo (parcial)
PUT    /api/meses/[mes]/gastos         gastos extra y créditos
PUT    /api/meses/[mes]/reasignaciones activar/desactivar el lavado
POST   /api/meses/[mes]/publicar       cierre + notas + avisos a los siete
POST   /api/meses/[mes]/corregir       corrección de un mes publicado
GET    /api/dptos/[id]/historial       pagos y consumo, 12 meses
POST   /api/pagos/aviso                el vecino dice "ya pagué"
POST   /api/pagos/confirmar            el admin confirma (requiere PIN)
GET    /api/gastos-fijos               los diez conceptos
PUT    /api/gastos-fijos               editar montos (vigenteDesde)
GET    /api/avisos                     lista, con leído/no leído
POST   /api/avisos/leer                marcar como leídos
POST   /api/admin/pin                  validar PIN, devuelve sesión corta
GET    /api/export/[anio]              Excel del año
POST   /api/bob                        pregunta a Bob
```

Reglas del backend:

1. **Nunca guardes una cuota calculada.** Guarda entradas, calcula al vuelo con el
   motor de la Fase 1. Ver `06` §2.
2. **Excepción única:** al publicar, guarda una instantánea del `ResultadoMes` junto
   al cierre. Es lo que hace verificable el aviso *"tu cuota pasó de X a Y"*.
3. **Toda escritura escribe en `Auditoria`** en la misma transacción. Sin excepción.
4. **Avisos solo sobre meses publicados.** Escribir en un mes en curso no notifica a
   nadie — si no, cerrar el mes serían 200 notificaciones. Ver `06` §3.
5. El PIN se valida **en el servidor**, con límite de intentos por IP. Vive en
   `ADMIN_PIN` como variable de entorno, nunca en el bundle del cliente.
6. `serieSaldo()` **acumula hacia adelante** desde un saldo inicial real en la base de
   datos. El mockup lo deriva hacia atrás desde `SALDO_BASE` — eso era una muleta del
   prototipo. No la copies.

### Verificador adversario · Fase 3

1. `prisma migrate dev` limpio desde cero, luego `prisma db seed`, sin errores.
2. **Test de integración:** para los 8 meses de la semilla, el `ResultadoMes` que
   devuelve la API es idéntico al que devuelve el motor local con los mismos datos.
3. **Intenta romperlo.** Escribe tests que envíen:
   - Una lectura menor que la del mes anterior
   - Un monto negativo
   - Un `mes` con formato inválido (`'2026-13'`, `'junio'`, `''`)
   - Un `dpto` que no existe
   - Un crédito sin `dpto`
   - Publicar un mes que ya está publicado
   - Confirmar un pago sin PIN válido
   - PIN incorrecto 20 veces seguidas
   Cada uno debe devolver un error claro con su código HTTP, **nunca un 500 ni un
   registro corrupto en la base**.
4. **Verifica la auditoría:** ejecuta cada escritura y comprueba que dejó su registro
   con `valorAnterior` y `valorNuevo` correctos. Si una escritura no deja rastro, es
   un bug de la Fase 3, no un detalle.
5. **Verifica los avisos:** publicar un mes genera un aviso; escribir una lectura en
   un mes en curso **no** genera ninguno.
6. `docs/verificacion-3.md` con los resultados.

---

# FASE 4 · Pantallas de vecino

Implementa en este orden, siguiendo `mockup/03-pantallas.md` **literalmente**:

1. **P0 · Elegir departamento** — se guarda en el dispositivo
2. **P1 · Inicio** — la que define todo. Cabecera con degradado, tarjeta noche con la
   cuota, los 7 este mes, en qué se gastó, la cuenta
3. **P2 · El mes** — selector horizontal, rejilla asimétrica del agua, gastos, cuotas
4. **P3 · Mi departamento** — tarjeta del lavado (solo 401), historia de pagos y consumo
5. **P4 · Historial** — saldo, consumo del edificio, lista de meses
6. **P5 · Avisos** — agrupados por fecha, con el acceso a Administración al final

Y las hojas modales: `calculo` (la pieza central de la transparencia, cinco secciones
numeradas), `pagar`, `aviso-ok`, `pagos`, `agua`.

### Reglas de implementación

- **Los textos son literales.** Los copys de `03` y `04` se escribieron y reescribieron
  para el tono "vecino, no cobrador". No los mejores, no los acortes, no los traduzcas.
  Ponlos en `lib/copys.ts` para que se vea que son contenido y no decoración.
- **Ningún valor interpolado se escribe fijo.** El caso concreto: la línea del lavado
  dice *"Incluye 1.50 m³"* y ese 1.50 **viene del cálculo**. Este bug apareció dos
  veces durante el diseño. Si el admin cambia el valor a 3, la frase debe decir 3.00.
- **Teclado numérico propio en todo campo numérico.** Nunca el del sistema: tapa el
  contexto que el usuario necesita (la lectura anterior, el promedio, lo que dice Bob).
  Ver `02` §4.6.
- **Gráficos en SVG a mano.** Barras con una sola en color (terracota para dinero,
  `--color-agua` para agua), sin ejes, sin leyenda, sin cuadrícula. Tooltip noche al tocar.
- **Botón atrás del sistema y gesto de deslizar** deben cerrar la hoja activa antes de
  navegar. **El mockup no lo implementa y hay que hacerlo.**
- Animaciones de `02` §6 con CSS, **una sola vez**, nunca en bucle. Todas desactivadas
  bajo `prefers-reduced-motion`.

### Verificador adversario · Fase 4

1. **Comparación visual.** Abre el mockup y tu implementación al lado, a 390px de
   ancho, pantalla por pantalla. Anota cada diferencia de tamaño, peso, color o
   espaciado en `docs/verificacion-4.md` y **arréglalas**. No es "aproximado": los
   valores están documentados.
2. **Responsive real.** Prueba a 320, 360, 390, 430, 768, 1024 y 1440px de ancho, y a
   560px de alto. En ningún caso debe haber desborde horizontal ni recorte.
   Test de Playwright que recorra las seis pantallas en cada tamaño y falle si
   `scrollWidth > clientWidth`.
3. **`min-width: 0`** en todo contenedor flex que reciba texto. La rejilla del agua en
   P2 se desborda por debajo de 340px sin esto.
4. **Texto largo.** Cambia el nombre de un departamento a 60 caracteres. ¿Se rompe algo?
5. **Escalado del sistema.** Fuente del navegador al 200%. ¿Sigue usable?
6. **Cero datos.** Un mes sin lecturas, sin recibo, sin pagos. ¿Muestra estados vacíos
   con sentido o revienta?
7. **Un solo bloque noche por pantalla.** Cuéntalos.
8. **El agua es celeste en todas partes.** Grepea y comprueba.
9. **Sin rojo en ningún estado de pago.**
10. Lighthouse móvil: rendimiento y accesibilidad ≥ 90. Reporta las cifras.

---

# FASE 5 · El cierre del mes

El flujo más importante. Sigue `mockup/04-cierre-del-mes.md` paso por paso.

Siete pasos: lecturas → factura de agua → luz común → gastos fijos → lo puntual →
revisión → publicar. Más el paso 0 de presentación.

### Requisitos no negociables

1. **Se guarda solo en cada paso.** Se puede salir y volver sin perder nada. Persiste
   en el servidor, no en el navegador: el admin puede cambiar de teléfono.
2. **El botón de avanzar dice qué falta.** *"Escribe los dos datos"*, no un botón gris
   sin explicación.
3. **Bob acompaña con contexto, no decide.** Compara con meses anteriores y avisa si
   algo se sale de lo normal. El que decide es el administrador.
4. **La corrección de tecleo nunca corrige sola.** Propone con dos botones, y solo si
   existe **exactamente una** candidata válida. Con dos o más, se calla. Ver `01` §8.
5. **El paso 6 bloquea la publicación si el cuadre falla.** Es la última red de seguridad.
6. **Los avisos de atención no bloquean.** Exceso de m³, área común anormal, lectura
   rara: se muestran, el admin decide.
7. **El paso 5 muestra lo que se añade.** Cada gasto o crédito aparece listado bajo el
   botón, con su monto y quién lo paga. Esto se corrigió en el diseño: antes se
   seleccionaba y no pasaba nada visible.
8. **La reasignación del lavado es una casilla, no un campo.** Viene marcada si estuvo
   activa el mes anterior. El valor en m³ sigue lo configurado en el panel.
9. **Nada se publica hasta el paso 7.** Ningún vecino ve nada antes.

También el resto del panel: registrar pago, avisos de pago por verificar, editar
gastos fijos, consumo del lavado, cargos y créditos, exportar el año a Excel
(implementa la descarga de verdad — el mockup solo tiene la hoja).

Y la **corrección de un mes publicado**: recalcula, avisa a los siete con qué cambió,
y deja registro. Sin correcciones silenciosas.

### Verificador adversario · Fase 5

1. **Playwright, el flujo completo**, del paso 0 al 7, con datos reales de julio.
   Compara el resultado final con el motor de la Fase 1. Al céntimo.
2. **Sal a mitad y vuelve.** En el paso 3, recarga la página. ¿Estás en el paso 3 con
   los datos escritos? Repítelo en cada paso.
3. **Fuerza que no cuadre.** Mete un recibo de agua incoherente. ¿El paso 6 bloquea?
   ¿Explica qué no cuadra?
4. **Prueba la corrección de tecleo.** Escribe una lectura con dos dígitos
   transpuestos. ¿La propone? Escribe una donde haya dos correcciones posibles.
   ¿Se calla? Escribe una menor que la anterior. ¿La rechaza?
5. **Desmarca el lavado.** ¿El área común vuelve a repartirse entre los siete?
   ¿El total del mes **no** cambia? ¿El 401 paga menos?
6. **Publica dos veces.** El segundo intento debe fallar limpiamente.
7. **Corrige un mes publicado.** ¿Se generó el aviso a los siete? ¿Con el monto
   anterior y el nuevo? ¿Está en auditoría?
8. **Concurrencia.** Dos pestañas escribiendo el mismo mes. ¿Se pierde un dato en
   silencio? Si sí, arréglalo con bloqueo optimista.
9. **El Excel abre en Excel** y los números cuadran con la app.
10. `docs/verificacion-5.md`.

---

# FASE 6 · PWA, responsive y rendimiento

1. **Manifest e iconos** — instalable en iOS y Android. Icono, nombre corto
   ("Salazar Barreto"), color de tema `#F7F4EE`, arranque a pantalla completa.
2. **Service worker** — cachea el shell y la última consulta de cada pantalla. La app
   debe abrir y mostrar el último estado conocido sin conexión, con un aviso claro de
   que está desconectada. No inventes datos offline.
3. **Las tres variables de `02` §7** — `--top`, `--bot`, `--rad` con `env(safe-area-inset-*)`.
   Tres modos: teléfono vertical a pantalla completa sin marco; pantalla baja en columna
   de `min(430px, 100vw)`; tablet y escritorio con marco centrado de 390×844 topado en
   `calc(100dvh - 56px)`.
4. **No hagas un layout de escritorio de dos columnas.** Decisión tomada: son siete
   vecinos consultando su cuota desde el celular. Una versión ancha es una pantalla
   que nadie usa y que hay que mantener igual.
5. **Accesibilidad** — lo que `02` §8 marca como pendiente: `<button>` de verdad en vez
   de `<div onClick>`, `aria-label` donde el texto no baste, trampa de foco en las hojas,
   anuncio a lector de pantalla al cambiar el estado de un pago, orden de tabulación.

### Verificador adversario · Fase 6

1. Instálala en un iPhone y un Android reales (o emuladores con notch). ¿El contenido
   se mete bajo el notch o la barra de gestos?
2. Modo avión: ¿abre? ¿avisa que está desconectada? ¿o muestra números viejos como si
   fueran actuales?
3. Recorrido completo **solo con teclado**. ¿Se puede? ¿El foco se ve siempre?
4. Con VoiceOver o TalkBack: ¿la tarjeta noche de Inicio se entiende al escucharla?
5. `axe-core` en las seis pantallas: cero violaciones críticas o serias.
6. Lighthouse móvil: PWA instalable, rendimiento ≥ 90, accesibilidad ≥ 95.
7. Contraste: verifica **cada** combinación de texto y fondo de `02` §1 con una
   herramienta. Reporta los ratios en `docs/verificacion-6.md`.

---

# FASE 7 · Deploy · Vercel y Railway

1. **Railway:** PostgreSQL. Migraciones aplicadas. Copia de seguridad diaria activada.
2. **Vercel:** el proyecto Next.js, con las variables de entorno:

```
DATABASE_URL           postgres de Railway (con pooling)
DIRECT_URL             conexión directa para migraciones
ADMIN_PIN              el PIN de administración
DEEPSEEK_API_KEY       vacío por ahora — Fase 8
BOB_MODO               'determinista' | 'deepseek'
NEXT_PUBLIC_APP_URL
```

3. **`.env.example`** con todas, comentadas, sin valores reales.
4. **CI en GitHub Actions:** `tsc --noEmit` → `verificar-tokens` → `vitest` →
   `playwright` → `build`. Si algo falla, no despliega.
5. **`docs/DESPLIEGUE.md`**: pasos para levantar todo desde cero, en orden, con los
   comandos exactos. Escrito para que yo lo siga sin que estés delante.

### Verificador adversario · Fase 7

1. Clona el repo en una carpeta limpia. Sigue `DESPLIEGUE.md` al pie de la letra.
   ¿Levanta? Si tuviste que improvisar un paso, el documento está incompleto.
2. Build de producción local (`next build && next start`). ¿Algún error que en
   desarrollo no aparecía?
3. **Grepea el bundle del cliente** buscando `ADMIN_PIN`, `DATABASE_URL`,
   `DEEPSEEK_API_KEY`. **Cero resultados.** Si aparece uno, es un incidente de seguridad.
4. Rompe la conexión a la base a propósito. ¿La app da un error claro o una pantalla
   en blanco?
5. Migración en frío contra una base vacía de Railway. ¿Limpia?

---

# FASE 8 · El camino listo para Bob

**No conectes DeepSeek todavía.** Deja el camino hecho para que yo enchufe la clave
cuando quiera.

### 8.1 Arquitectura

```
lib/bob/
  tipos.ts           Pregunta, Respuesta, Herramienta
  herramientas.ts    las funciones que Bob puede llamar
  determinista.ts    el catálogo de intenciones (lo del mockup, ampliado)
  deepseek.ts        el adaptador de DeepSeek V4 Flash
  index.ts           enruta según BOB_MODO
  prompt.ts          el prompt del sistema
```

Con `BOB_MODO=determinista` funciona sin clave ni coste. Con `BOB_MODO=deepseek`
usa el modelo. **La interfaz no cambia entre los dos.**

### 8.2 Herramientas

Bob **no ve los números directamente**. Llama funciones y redacta con lo que devuelven:

```ts
calcularMes(mes)              → ResultadoMes
cuotaDe(dpto, mes)            → CuotaDpto
consumoDe(dpto, meses)        → serie de m³
serieSaldo(desde, hasta)      → serie de saldos
estadoPagos(mes)              → qué dptos pagaron
gastosDe(mes)                 → los conceptos con su monto
comparaMeses(mesA, mesB)      → qué cambió
explicaLavado(mes)            → la explicación de la reasignación
```

Tipadas con Zod, expuestas como *tool calls*. **Si no hay herramienta, no hay número.**

### 8.3 El prompt del sistema

Escríbelo con las prohibiciones de `mockup/05-bob-agente.md` §2 **explícitas y
literales**. Especialmente:

> Bob **no tiene acceso a la cuenta bancaria**. No puede ver depósitos, ni decir que
> vio un depósito, ni rellenar un monto desde el estado de cuenta. Los pagos los
> verifica una persona contra el banco.

Y las reglas de voz de §3: dos líneas, siempre con el dato, siempre con dónde
verificarlo, sin hablar de sí mismo, reportando también lo bueno.

### 8.4 Guardas duras · en código, no en el prompt

1. **Límite de longitud.** Si la respuesta pasa de dos frases, se recorta. En código.
2. **Sin escritura.** El endpoint de Bob solo lee. Sin excepción.
3. **Verificación de números.** Todo número de la respuesta debe existir en el
   resultado de alguna herramienta llamada en esa conversación. Si aparece uno que no,
   se descarta la respuesta y se cae al determinista. **Esta guarda es la que impide
   que Bob invente cifras**, y no puede vivir en el prompt.
4. **Registro completo.** Cada pregunta, cada llamada a herramienta, cada respuesta.
   Para poder revisar si dijo algo mal.
5. **Tiempo de espera y respaldo.** Si DeepSeek tarda más de 8 segundos o falla, cae
   al determinista sin que el usuario vea un error.

### 8.5 Prohibido en la interfaz

De `05` §6: texto letra por letra fingiendo que piensa, chispas ✨, gradientes
morados, iconografía de "IA", burbuja flotante en la esquina, disculpas, y "insights"
sin acción posible.

**Al abrir Bob, la conversación está ahí mismo.** Sin pantalla intermedia. Se corrigió
durante el diseño porque interrumpía el flujo.

### Verificador adversario · Fase 8

1. Con `BOB_MODO=determinista` y sin `DEEPSEEK_API_KEY`: ¿la app arranca y Bob
   responde las cuatro preguntas sugeridas?
2. **Test de la guarda de números.** Simula una respuesta del modelo con una cifra
   inventada. ¿La guarda la detecta y cae al determinista?
3. **Test de la guarda de longitud.** Simula una respuesta de diez párrafos.
4. **Intenta hacer que Bob escriba.** Pídele que confirme un pago, que cambie una
   lectura, que publique el mes. Debe negarse y explicar quién sí puede.
5. **Intenta hacer que hable del banco.** *"¿Viste mi depósito?"* La respuesta debe
   decir que no tiene acceso y que lo verifica el administrador.
6. Simula que DeepSeek tarda 30 segundos. ¿Cae al determinista o se queda colgado?
7. `docs/verificacion-8.md` con las respuestas literales de las pruebas 4 y 5.

---

# FASE 9 · Auditoría final adversaria

Actúa como si te hubieran contratado para **encontrar todo lo que está mal** en este
proyecto, sin haberlo escrito tú. Sé duro.

### 9.1 Números

- Recalcula los 8 meses de la semilla y compara con el mockup. Al céntimo.
- ¿Hay algún camino en el que una cuota se guarde en vez de calcularse?
- ¿Hay algún `Float` en el esquema de Prisma? ¿Algún `parseFloat` que pierda precisión?
- ¿El saldo acumula hacia adelante, o quedó la muleta del prototipo?

### 9.2 Tokens

- Ejecuta `verificar-tokens`. Cero.
- Grepea a mano: hex, `rgb(`, `px` sueltos, colores de Tailwind por defecto, `Inter`.
- ¿Los 18 colores de `02` §1 están definidos y usados donde toca?

### 9.3 Responsive

- Las seis pantallas y las diez hojas, en siete anchos y tres alturas. Cero desbordes.
- ¿Alguna hoja modal se sale de la pantalla en horizontal?
- ¿El teclado numérico tapa el campo que se está escribiendo?

### 9.4 Seguridad

- El bundle del cliente sin ningún secreto. Grepéalo.
- ¿Se puede confirmar un pago sin PIN, llamando a la API directamente?
- ¿Se puede publicar un mes desde el cliente sin pasar por el servidor?
- ¿El límite de intentos del PIN funciona de verdad?
- Inyección: manda `'; DROP TABLE`, `<script>`, y un JSON de 10 MB a cada endpoint.

### 9.5 Fidelidad al diseño

- Los copys, palabra por palabra contra `03` y `04`. ¿Alguno se "mejoró"?
- ¿Hay algún valor interpolado escrito fijo? Cambia el lavado a 3 m³ y recorre la app
  entera buscando un "1.50" que se quedó.
- ¿Aparece "moroso", "deudor", "vencido" o rojo en algún estado de pago?
- ¿El agua es celeste en absolutamente todo?
- ¿Hay alguna animación en bucle?

### 9.6 Lo que sabemos que falta

Comprueba que ninguno se te olvidó:

- Botón atrás del sistema cerrando la hoja activa
- Descarga real del Excel
- Notificaciones push (o el enlace de WhatsApp, **además** de la campana)
- Estados vacíos con sentido para un mes sin datos
- La app abriendo sin conexión con el último estado conocido

### 9.7 El informe

`docs/AUDITORIA-FINAL.md` con:

1. Todo lo que encontraste, con severidad
2. Lo que arreglaste
3. Lo que **no** arreglaste y por qué
4. Lo que hace falta antes de que esto se use de verdad
5. La lista de datos reales que yo tengo que cargar

Sé honesto en el punto 3. Un informe que dice que todo está perfecto no me sirve.

---

## Entregable final

Repositorio con:

- Aplicación Next.js completa y desplegable en Vercel
- Prisma + PostgreSQL en Railway, con migraciones y semilla
- Cero valores huérfanos: todo por token, verificado por script en CI
- 100% adaptativo, de 320px a escritorio, verificado con tests
- Motor de cálculo con tests, validado al céntimo contra el mockup
- Bob funcionando en modo determinista, con el camino de DeepSeek V4 Flash listo
- `docs/`: `PLAN.md`, `DESPLIEGUE.md`, las nueve `verificacion-N.md`, `AUDITORIA-FINAL.md`
- CI que bloquea el deploy si algo falla

**Al terminar, dime en tres párrafos:** qué construiste, qué encontraste en la
auditoría final que no esperabas, y qué necesitas de mí para que esto se pueda usar.
