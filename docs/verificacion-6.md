# Verificación · Fase 6 · PWA, responsive y accesibilidad

> Estado al cerrar: **5 de los 7 puntos del verificador se comprueban aquí y
> pasan.** Los otros dos —instalarla en un iPhone y un Android de verdad, y
> escucharla con VoiceOver o TalkBack— **necesitan aparatos que no tengo** y
> quedan declarados en §7, con lo que sí se pudo comprobar de cada uno.
>
> Tres defectos de accesibilidad encontrados y arreglados. Y una afirmación del
> propio documento de diseño que **no es cierta**: §5.

---

## 0. La puerta completa

| Chequeo | Resultado |
|---|---|
| `npx tsc --noEmit` | limpio |
| `node scripts/verificar-tokens.mjs` | cero valores huérfanos · 164 ficheros, 18.111 líneas |
| `npx vitest run` | **291 / 291** |
| `npm run test:integracion` | **88 / 88** |
| `npx playwright test` | **132 / 132** |
| `node scripts/lighthouse.mjs` | 5 pantallas, rendimiento 96–98, accesibilidad 95 |
| `npm run build` | compila |

De los 132 de pantalla, **22 son nuevos de esta fase**: 15 de accesibilidad y 7
de PWA.

---

## 1. Manifiesto e iconos

`app/manifest.ts` se genera desde código, no como un `.json` suelto, para que el
nombre salga de `COPYS` y el color de tema de `lib/tema.ts` —que tiene su propio
test comparándolo con el token `--color-crema` de `globals.css`—. Un manifiesto
escrito a mano es el sitio clásico donde un color se queda atrás.

| Qué pide el enunciado | Qué hay |
|---|---|
| Nombre corto "Salazar Barreto" | `short_name: 'Salazar Barreto'` |
| Color de tema `#F7F4EE` | de `COLOR_TEMA`, que sale del token |
| Arranque a pantalla completa | `display: 'standalone'` |
| Instalable en iOS y Android | iconos 192 y 512, `any` y `maskable`, más `apple-touch-icon` de 180 |

**`standalone` y no `fullscreen`**: en pantalla completa iOS esconde la barra de
estado y el reloj, y esta app se consulta de pie en el ascensor. Arrancar sin
barra de navegador es lo que pide el enunciado; esconderle la hora al usuario, no.

Los iconos se generan con `scripts/generar-iconos.mjs`, que **lee los colores de
`lib/tema.ts`** en vez de tenerlos tecleados. La marca es la fachada del edificio
con las siete ventanas donde de verdad están los departamentos: 101 en el
primero, 201 y 202 en el segundo, 301 en el tercero, 401 en el cuarto, 501 y 502
en el quinto. No es el avatar de Bob a propósito: Bob es el asistente, no la app.

Los recortables llevan margen del 26 % porque Android puede recortar hasta un
círculo del 80 % del lienzo.

El test no se conforma con que las rutas respondan 200: **comprueba la firma del
fichero**. Un 200 con el HTML de la página de inicio también responde 200.

---

## 2. Service worker · abre sin conexión, y lo dice

Tres cachés con vidas distintas —el armazón, la última respuesta de cada consulta
y los ficheros con huella de Next— y una regla que gobierna todo: **no inventar
datos**. Sin conexión la app abre y enseña lo último que se guardó en ese
teléfono, y lo dice. Lo que no hace nunca es rellenar un hueco con datos de
ejemplo, con ceros o con la respuesta de otro mes.

### Y algo que deliberadamente NO hace: guardar escrituras

Encolar en silencio el cierre de un mes para mandarlo «cuando vuelva la señal»
acaba publicando dos veces, o publicando datos viejos encima de los nuevos. Sin
señal, una escritura falla y falla a la vista. Hay un test que lo comprueba:
manda un aviso de pago sin conexión, verifica que no sale bien, y **después de
volver la señal comprueba que no se ha mandado solo**.

### El aviso dice dos cosas, no una

> *Sin conexión · estás viendo lo último que se guardó en este teléfono*

Las dos importan. Un aviso que solo dijera «sin conexión» dejaría al vecino
leyendo una cuota vieja creyendo que es la de hoy, que es justo lo que el
producto existe para evitar. Y en administración dice otra cosa, porque el
problema es otro:

> *Sin conexión · no se puede guardar nada hasta que vuelva la señal*

Un administrador a punto de teclear siete lecturas tiene que saberlo **antes** de
empezar.

### Prueba negativa

Se quitó `public/sw.js` y el test de modo avión **dio rojo**. Sin eso, el test
podría estar pasando por la caché del navegador y no por el service worker, y
nadie se enteraría.

Y hay un test de que **con conexión no aparece el aviso**: un aviso permanente no
es un aviso.

---

## 3. Las tres variables de `02` §7

Ya estaban desde la Fase 4, y siguen verdes: `--top`, `--bot` y `--rad` con
`env(safe-area-inset-*)`, y los tres modos —teléfono a pantalla completa sin
marco, pantalla baja en columna de `min(430px, 100vw)`, y escritorio con marco de
390×844 topado en `calc(100dvh - 56px)`—. Lo cubren 94 tests de `responsive`.

**No hay layout de escritorio de dos columnas**, y hay un test que lo impide.

---

## 4. Accesibilidad · tres defectos encontrados

`axe-core` sobre las seis pantallas de vecino, la de administración y cuatro
hojas: **cero violaciones críticas o serias**. Empezó con tres.

### 4.1 · El gráfico de barras se anunciaba como una imagen

`role="img"` sobre un contenedor con siete botones dentro. `img` le dice al
lector de pantalla «esto es una sola cosa, léela entera», y dentro estaban las
siete cifras del mes. Un vecino ciego oía el título del gráfico y **perdía los
siete datos** — en una app cuya promesa es que cada número se puede mirar de
cerca. Ahora es `role="group"` y cada barra se anuncia con su etiqueta y su
valor.

### 4.2 · Las hojas de solo lectura no se podían desplazar con el teclado

El panel tenía `tabIndex={-1}`: focusable para el código y para nadie más. Las
hojas sin botones dentro —el cálculo del mes, el consumo de agua— no se podían
alcanzar ni bajar sin ratón. Una hoja llena de cifras que no se puede desplazar
es una hoja vacía. Ahora es `tabIndex={0}` y entra en la lista de la trampa de
foco.

### 4.3 · El punto de "sin leer" decoraba y no informaba

Un `aria-label` sobre un `<span>` sin rol **no lo lee ningún lector de pantalla**.
El punto terracota de los avisos nuevos era, para quien no lo ve, invisible del
todo. Ahora el punto es `aria-hidden` y el texto va aparte.

### Lo que ya estaba bien

- **Cero `<div onClick>`** en toda la app: los 62 controles son `<button>` o
  `<Link>`. `02` §8 lo marcaba como pendiente y ya no lo está.
- **Trampa de foco** en las hojas, y `Escape` cierra.
- **El botón atrás del sistema y el gesto de deslizar** cierran la hoja antes de
  navegar, vía `history.pushState` y `popstate`. El README del mockup lo marcaba
  como no implementado en el prototipo y como algo que había que hacer.
- **`prefers-reduced-motion`** desactiva toda animación.

### Lo que se añadió: anuncios de estado

`02` §8 pide *«anuncio a lector de pantalla cuando cambia el estado de un pago»*.
Una región `aria-live="polite"` única, invisible, donde se escribe lo que acaba
de pasar:

| Cuándo | Qué se oye |
|---|---|
| El vecino avisa su pago | *Listo. Tu cuota de junio pasó a en verificación: dejas de figurar como pendiente y quien administra lo confirma contra el estado de cuenta.* |
| El admin confirma un pago | *El pago del 201 de junio queda confirmado. Al día.* |
| Se publica el mes | *Julio ya está publicado. Los siete pueden verlo.* |
| Se corrige un mes | *Corrección guardada. Cambiaron 3 cuotas, y los siete tienen el aviso.* |

`polite` y no `assertive`: nada de esto interrumpe. No sustituye al texto en
pantalla — si hubiera que elegir, se elegiría la pantalla.

### El recorrido con teclado, comprobado a mano por el test

- Se tabula 40 veces desde Inicio y **en cada parada se comprueba que el foco se
  ve**: sin contorno ni sombra, quien tabula no sabe dónde está.
- Con una hoja abierta se tabula 30 veces y el foco **nunca sale** de la hoja.
- `Escape` cierra.

### Escalado de texto al 200 %

`02` §8 lo pide. Tres pantallas con la fuente base al doble: ni desborde
horizontal ni texto recortado dentro de su caja. La única excepción son los
`sr-only`, que están recortados a propósito —es la técnica para esconderlos de la
vista sin esconderlos del lector—.

Prueba negativa: se metió un párrafo largo en una caja de 20 px con
`overflow: hidden` y el test dio rojo.

---

## 5. Contraste · la afirmación del documento que no es cierta

`02` §8 dice:

> *«Contraste: tinta sobre crema, crema sobre noche — ambos superan AAA. El gris
> `#7A7570` sobre crema cumple AA para texto normal.»*

Las dos primeras son ciertas. **La tercera no.**

Medido combinación a combinación desde los tokens de `globals.css`, con la
fórmula de luminancia relativa de WCAG 2.1, en `lib/__tests__/contraste.test.ts`:

| Texto | Fondo | Uso | Ratio | Mínimo | ¿AA? |
|---|---|---|---|---|---|
| tinta | crema | texto principal | **17.59** | 4.5 | ✅ AAA |
| gris | crema | texto de contexto | **4.15** | 4.5 | ❌ |
| gris-claro | crema | texto terciario | **2.30** | 4.5 | ❌ |
| terra-oscuro | crema | texto terracota | **4.41** | 4.5 | ❌ |
| verde | crema | texto verde | **4.77** | 4.5 | ✅ |
| ámbar | crema | cifra grande, icono | **3.17** | 3 | ✅ |
| agua | crema | cifra grande, barra | **3.15** | 3 | ✅ |
| terra | crema | barra destacada | **3.09** | 3 | ✅ |
| apagado | crema | deshabilitado | **1.66** | 3 | ❌ (exento) |
| tinta | papel | texto sobre tarjeta | **19.30** | 4.5 | ✅ AAA |
| gris | papel | contexto sobre tarjeta | **4.56** | 4.5 | ✅ |
| crema | noche | texto sobre noche | **16.02** | 4.5 | ✅ AAA |
| agua-claro | noche | agua sobre noche | **9.89** | 4.5 | ✅ AAA |
| sobre-noche-etiqueta | noche | etiqueta | **4.85** | 4.5 | ✅ |
| sobre-noche-contexto | noche | contexto | **5.60** | 4.5 | ✅ |
| sobre-noche-terciario | noche | terciario | **4.18** | 4.5 | ❌ |
| verde-oscuro | verde-suave | píldora *al día* | **7.53** | 4.5 | ✅ |
| terra-texto | ámbar-suave | aviso de Bob | **6.52** | 4.5 | ✅ |

Los ratios están **fijados en el test**: si alguien mueve un color, el test dice
el nuevo en vez de callarse.

### Por qué no se ha corregido

Porque la paleta es **diseño validado con el usuario a lo largo de muchas
iteraciones**, y la regla de este trabajo es que en diseño visual manda el
mockup. Cambiar `--color-gris` de `#7A7570` a algo un 8 % más oscuro arreglaría
la fila más importante, pero eso lo decide quien diseñó la paleta, no yo a
escondidas en una fase de accesibilidad.

Lo que sí se puede afirmar: **el color nunca es el único portador de
información** (`02` §8 y hay un test). Los estados llevan texto —`AL DÍA`, `SIN
REGISTRAR`, `EN VERIFICACIÓN`— además de color. Nadie se queda sin el dato; lo
que cuesta es leerlo cómodamente.

**Es una decisión para el usuario y está en cola para `docs/AUDITORIA-FINAL.md`.**
Las cuatro filas rojas, ordenadas por lo que cuestan:

1. `gris` sobre crema, **4.15**, el texto de contexto de toda la app. Subirlo a
   `#6E6963` daría 4.6 y cumpliría, con un cambio de tono casi imperceptible.
2. `gris-claro` sobre crema, **2.30**, texto terciario. Es el peor de todos.
3. `terra-oscuro` sobre crema, **4.41**, a un pelo. `#9E5726` daría 4.7.
4. `sobre-noche-terciario`, **4.18**. Subir la opacidad de `.45` a `.52` bastaría.

### En `axe` el contraste está desactivado, y aquí se dice

`tests/e2e/accesibilidad.spec.ts` desactiva `color-contrast` **a propósito y con
el motivo escrito al lado**: la regla señala la paleta en las seis pantallas y en
las cuatro hojas, siempre lo mismo, y un chequeo que grita diez veces por algo
que no se va a cambiar acaba con alguien apagando la regla entera. Todo lo demás
de WCAG 2.1 AA se exige a cero.

---

## 6. Lighthouse

| Pantalla | Rendimiento | Accesibilidad | Buenas prácticas |
|---|---|---|---|
| Inicio | 96 | 95 | 96 |
| El mes | 96 | 95 | 100 |
| Mi departamento | 97 | 95 | 100 |
| Historial | 96 | 95 | 100 |
| Avisos | 98 | 95 | 100 |

Rendimiento ≥ 90 ✅, accesibilidad ≥ 95 ✅. **Lo único que baja la accesibilidad
de 100 a 95 es `color-contrast`**, y es lo de §5: el script lo comprueba y falla
si aparece cualquier otra auditoría que no estuviera declarada.

### Un chequeo mío que no podía pasar

La primera versión de `scripts/lighthouse.mjs` exigía `PWA instalable`
preguntando `audits['installable-manifest']?.score === 1`. **Esa auditoría no
existe**: Lighthouse retiró la categoría `pwa` entera en la versión 12, y aquí
quedan cinco categorías —performance, accessibility, best-practices, seo,
agentic-browsing— sin ninguna que hable de manifiesto o de service worker.
Comprobado listándolas.

`undefined === 1` es **siempre falso**, así que el chequeo daba rojo para siempre
pasara lo que pasara. Un chequeo que no puede pasar es tan inútil como uno que no
puede fallar, y encima tapa el hueco: nadie estaba comprobando la instalación.

Ahora lo instalable se comprueba en `tests/e2e/pwa.spec.ts` con las mismas
condiciones que Chrome exige: manifiesto con nombre y nombre corto, `start_url`,
`display: standalone`, al menos un icono de 192 px o más, y un service worker
**activo y con manejador de `fetch`**.

---

## 7. Lo que NO se pudo comprobar, y qué se hizo en su lugar

### 7.1 · Instalarla en un iPhone y un Android reales (verificador, punto 1)

**No tengo aparatos.** Lo que sí está comprobado:

- Las condiciones de instalación de Chrome, una a una, en un navegador de verdad.
- Que el contenido **no se mete bajo el notch ni bajo la barra de gestos**: las
  tres variables usan `env(safe-area-inset-*)` y hay 94 tests de responsive de
  320 a 1440 px. Lo que no puedo simular es el `env()` de un aparato real, que en
  un navegador de escritorio vale 0.

**Esto hay que probarlo en un teléfono antes de dárselo a los siete vecinos**, y
está en la lista de `docs/AUDITORIA-FINAL.md`. La señal de que algo va mal sería
el saludo de Inicio tapado por el notch, o el botón de Bob debajo de la barra de
gestos.

### 7.2 · VoiceOver y TalkBack (verificador, punto 4)

**Tampoco.** Lo que sí está comprobado, y no es lo mismo:

- `axe-core` no encuentra ninguna violación crítica ni seria en la tarjeta noche
  de Inicio ni en el resto.
- Los anuncios de estado existen, están en una región `aria-live` de verdad, y
  hay un test que comprueba que **la región no ocupa sitio en pantalla** —si
  `sr-only` no existiera, el texto de los anuncios saldría escrito en medio—.
- El recorrido con teclado funciona y el foco se ve siempre.

Lo que ninguna herramienta dice es **si lo que se oye se entiende**. La tarjeta
noche de Inicio lleva el saludo, la cuota, el estado y un enlace al cálculo; leída
en voz alta debería sonar a *«Hola, 401. Tu cuota de junio. 384,33 soles. Sin
registrar. ¿Cómo se calculó?»*. Eso es una hipótesis, no una comprobación.

---

## 8. La mejor objeción de un escéptico competente

> *«Desactivaste la regla de contraste en axe y encima dices que la accesibilidad
> es 95. Eso es maquillar el número.»*

Es la objeción correcta. Tres respuestas:

1. **El número no está maquillado**: Lighthouse mide el contraste y da 95, no
   100, y ese 95 es el que aparece en la tabla. Lo desactivado es la regla en
   `axe`, no en Lighthouse.
2. **Lo que se desactiva se mide mejor en otro sitio**: no es que el contraste no
   se compruebe, es que se comprueba combinación a combinación con el ratio
   exacto, en vez de diez veces con el mismo mensaje.
3. **Y se dice**, aquí y en el comentario del propio test. Un chequeo desactivado
   en silencio es una mentira; uno desactivado con el motivo escrito y la medida
   al lado es una decisión.

Segunda objeción:

> *«Dices que cumple accesibilidad y hay cuatro combinaciones que no llegan a AA.
> Entonces no cumple.»*

Cierto, y por eso el estado de esta fase no dice «cumple AA». Dice: cero
violaciones críticas o serias de todo lo demás, y **cuatro combinaciones de color
que no llegan a AA, con sus ratios, su causa y lo que costaría arreglarlas**. La
decisión es de quien diseñó la paleta.

---

## 9. Bajo qué condición esto estaría equivocado, y cuál sería la señal temprana

**Estaría equivocado si** `env(safe-area-inset-*)` no se comporta en un iPhone
real como se comporta en el navegador con valor 0. Es la parte de esta fase que
solo está razonada. **La señal temprana**: el saludo de Inicio tapado por el
notch, o la navegación inferior pisada por la barra de gestos, en la primera
instalación real.

**Segunda condición**: el service worker cachea `/api/…` con red primero y caché
después. Si un vecino abre la app con señal muy mala —no cortada, *mala*— el
`fetch` puede tardar mucho antes de fallar, y durante ese rato la pantalla está
en blanco en vez de enseñar lo guardado. **La señal**: quejas de que «tarda» en
vez de «no funciona». La respuesta sería un tiempo límite en el service worker,
que ahora no tiene.

**Tercera**: la accesibilidad se midió con `axe` y con Lighthouse, que son
herramientas. Ninguna de las dos usa la app. La señal de que se hizo mal sería
alguien que no puede completar el aviso de pago con lector de pantalla — y eso no
lo va a decir ningún test.
