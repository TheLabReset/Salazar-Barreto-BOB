# 02 · Sistema de diseño

Alta fidelidad. Los valores de aquí son los que hay que reproducir.

---

## 1. Color

### Paleta

| Token | Hex | Uso |
|---|---|---|
| `crema` | `#F7F4EE` | Fondo de la app. El único fondo. |
| `papel` | `#FFFFFF` | Tarjetas elevadas |
| `noche` | `#17172B` | **El protagonista.** Un bloque por pantalla. |
| `terra` | `#C9773A` | Acento de marca, dato activo, barra destacada |
| `terra-oscuro` | `#A85F2A` | Texto terracota sobre fondo claro, hover de enlaces |
| `terra-texto` | `#7A4A1E` | Texto de aviso sobre fondo ámbar suave |
| `verde` | `#2D7A4F` | Resuelto, al día, cuadra |
| `verde-oscuro` | `#1E5637` | Texto verde sobre fondo verde suave |
| `ambar` | `#C07A1A` | Pendiente, atención. **Nunca rojo.** |
| `agua` | `#3E93B8` | **Todo lo relacionado con agua** |
| `agua-claro` | `#8ECBE4` | Agua sobre fondo noche |
| `tinta` | `#0E0E0E` | Texto principal |
| `gris` | `#7A7570` | Texto de contexto |
| `gris-claro` | `#A8A29C` | Texto terciario |
| `apagado` | `#C4BFB8` | Deshabilitado |
| `linea` | `rgba(14,14,14,.08)` | Divisorias. Reemplazan bordes de tarjeta. |
| `borde-tarjeta` | `rgba(14,14,14,.06)` | Borde sutil de tarjeta blanca |
| `escritorio` | `#E9E5DD` | Fondo fuera del marco (solo escritorio/tablet) |

### Fondos suaves

Se construyen con el color al 10-12% de opacidad:

| Situación | Valor |
|---|---|
| Verde suave | `rgba(45,122,79,.10)` |
| Ámbar suave | `rgba(192,122,26,.12)` |
| Agua suave | `rgba(62,147,184,.12)` |
| Terracota suave | `rgba(201,119,58,.12)` |
| Neutro suave | `rgba(14,14,14,.06)` |

### Sobre fondo noche

| Uso | Valor |
|---|---|
| Texto principal | `#F7F4EE` |
| Etiqueta | `rgba(247,244,238,.50)` |
| Contexto | `rgba(247,244,238,.55)` |
| Terciario | `rgba(247,244,238,.45)` |
| Divisoria | `rgba(247,244,238,.12)` |
| Divisoria sutil | `rgba(247,244,238,.08)` |

### Reglas de color

1. **Máximo dos colores con significado por pantalla.** El resto es crema, tinta y gris.
2. **El agua siempre es `#3E93B8`.** Consumo, factura, m³, gráficos de agua, etiquetas.
   Es un anclaje mental deliberado: el usuario asocia el celeste con agua sin leer.
3. **Nunca rojo.** Un pago que falta es ámbar, no una alarma. Estas son siete personas
   que se saludan en la escalera.
4. **Un solo bloque noche por pantalla.** Es lo que el ojo busca primero. Dos compiten.
5. El degradado terracota (`#EEDFCF → #F7F4EE 78%`) aparece **solo** detrás de la
   cabecera de Inicio. En ningún otro sitio.

---

## 2. Tipografía

Tres familias, cada una con un trabajo. Google Fonts.

```
Syne:         600, 700, 800
DM Sans:      300, 400, 500   (opsz 9..40)
JetBrains Mono: 400, 500, 600
```

| Familia | Para qué |
|---|---|
| **Syne** | Títulos de pantalla y cifras protagonistas. Es la voz editorial. |
| **DM Sans** | Todo el cuerpo. Peso 300 por defecto — la app respira. |
| **JetBrains Mono** | Números, fechas, montos, lecturas y las etiquetas de sección. |

### Escala

| Rol | Valor |
|---|---|
| Título de pantalla | `800 27px/1 Syne`, `letter-spacing: -.02em` |
| Título grande | `800 30px/1.14 Syne` |
| Título de hoja | `800 26px/1.15 Syne` |
| Cifra protagonista | `500 46px/1 JetBrains Mono`, `letter-spacing: -.03em` |
| Cifra secundaria | `500 40-42px/1 JetBrains Mono` |
| Cifra de tarjeta | `500 27-32px/1 JetBrains Mono` |
| Símbolo de moneda | `400 20-22px/1 JetBrains Mono` en color atenuado |
| **Etiqueta de sección** | `500 10px/1 JetBrains Mono`, `letter-spacing:.16em`, MAYÚSCULAS |
| Etiqueta pequeña | `500 9px/1 JetBrains Mono`, `letter-spacing:.14em`, MAYÚSCULAS |
| Cuerpo | `300 13.5-15px/1.45 DM Sans` |
| Cuerpo destacado | `400-500 14px/1.3 DM Sans` |
| Contexto | `300 12-13px/1.4 DM Sans`, color gris |
| Monto en lista | `400 14px/1 JetBrains Mono` |
| Píldora de estado | `500 10px/1 JetBrains Mono`, `letter-spacing:.08em`, MAYÚSCULAS |

> **La etiqueta mono en mayúsculas de 10px con `letter-spacing:.16em` es el sello
> visual de la app.** Encabeza casi todas las secciones. Da precisión técnica con
> puro tipo, sin costo visual. No la sustituyas por un `<h3>` normal.

---

## 3. Forma

### Radios

| Valor | Uso |
|---|---|
| `38px` | El marco del dispositivo, y la esquina inferior de las hojas |
| `32px` | Esquina superior de las hojas |
| `24px` | Tarjeta noche |
| `22px` | Tarjeta blanca grande |
| `20px` | Tarjeta blanca mediana |
| `18px` | Bloque interno |
| `14px` | Contenedor de icono |
| `12px`, `8px` | Iconos pequeños, casillas |
| `999px` | Píldoras, botones, navegación, avatares |

### Sombras

Casi ninguna. La jerarquía se construye con color y espacio, no con profundidad.

| Elemento | Valor |
|---|---|
| Marco del dispositivo (solo escritorio) | `0 24px 60px rgba(14,14,14,.13)` |
| Hoja modal | `0 -8px 40px rgba(14,14,14,.2)` |
| Todo lo demás | ninguna |

### Bordes

- Tarjeta blanca: `1px solid rgba(14,14,14,.06)`
- Divisoria de lista: `1px solid rgba(14,14,14,.08)`
- **Preferir divisorias a tarjetas.** Una lista de siete departamentos son siete filas
  separadas por líneas finas, no siete tarjetas. La tarjeta se reserva para bloques
  que son una unidad conceptual.

### Espaciado

Múltiplos de 4 en general, pero con valores impares donde el ojo lo pide (13px, 11px).

| Situación | Valor |
|---|---|
| Margen lateral de pantalla | `24px` (contenido) · `20px` (tarjetas) |
| Entre secciones | `26-30px` |
| Interior de tarjeta grande | `20-24px` |
| Interior de tarjeta mediana | `16-18px` |
| Fila de lista | `13-14px` vertical |
| Espacio bajo el contenido (por la nav) | `calc(88px + var(--bot))` |

---

## 4. Componentes

### 4.1 Tarjeta noche

El protagonista. Fondo `#17172B`, radio `24px`, padding `24px`, texto crema.
Contiene: etiqueta mono → cifra grande → línea de contexto → desglose con divisorias.

Una por pantalla. En Inicio es la cuota del usuario; en El mes, el costo total; en
Mi departamento, la cuota desglosada; en Historial, el saldo de la cuenta.

### 4.2 Píldora de estado

`500 10px JetBrains Mono`, `letter-spacing:.08em`, MAYÚSCULAS,
`padding: 6px 11px`, `border-radius: 999px`, `white-space: nowrap`.

| Estado | Fondo | Texto |
|---|---|---|
| `AL DÍA` | `rgba(45,122,79,.10)` | `#2D7A4F` |
| `SIN REGISTRAR` | `rgba(192,122,26,.12)` | `#C07A1A` |
| `EN VERIFICACIÓN` | `rgba(14,14,14,.06)` | `#7A7570` |

Sobre fondo noche los mismos colores suben la opacidad del fondo a `.18` y el texto
usa la versión clara.

### 4.3 Fila de departamento

```
[ 401 ]  Alonso y Julisa ─────────  S/ 512.40   [ AL DÍA ]
  mono      DM Sans 300 gris          mono         píldora
  34px         flex:1                14px        flex:0 0 auto
```
`padding: 13px 0`, `border-bottom: 1px solid rgba(14,14,14,.08)`, `gap: 12px`.
La fila del propio usuario lleva un punto terracota o fondo terracota al 4%.

### 4.4 Gráfico de barras

Barras verticales con **una sola en color** — la del usuario o la del mes activo.
El resto en `rgba(14,14,14,.10)`. Sin ejes, sin leyenda, sin cuadrícula.
Altura `132px` en El mes. Etiqueta de dpto/mes debajo en mono 9px.

Al tocar una barra: tooltip noche flotante con el valor exacto.

**El color destacado depende del dato:** terracota para dinero, `#3E93B8` para agua.

### 4.5 Barra de progreso segmentada

Siete segmentos (uno por departamento), `height: 5px`, `border-radius: 999px`,
`gap: 4px`, `flex: 1` cada uno. Verde los pagados, gris los pendientes.
Cuenta la historia "5 de 7" antes de leer la lista.

### 4.6 Teclado numérico propio

**No se usa el teclado del sistema en ningún campo numérico.** Razón: el teclado
nativo tapa el contexto que el usuario necesita ver (la lectura anterior, el promedio,
lo que dice Bob), y en Android varía demasiado.

El numpad es una hoja que sube desde abajo con:
- Etiqueta del campo arriba (ej. *"Lectura del 401 · anterior 180.230"*)
- El valor que se va escribiendo, en mono grande, con su sufijo (`m³` o `S/`)
- Rejilla 3×4: dígitos, punto decimal (si aplica), borrar
- Botón de confirmar en noche

Se abre con `abrirNumpad(campo, etiqueta, valorActual, admiteDecimales, sufijo, onOk)`.

### 4.7 Navegación inferior

Píldora flotante noche, `height: 62px`, `border-radius: 999px`,
`left/right: 20px`, `bottom: var(--bot)`.

Cuatro destinos: Inicio · El mes · Mi dpto · Historial. Iconos de línea 1.6px, 44×44px
de área táctil. El activo lleva fondo `rgba(247,244,238,.12)`.

A la derecha, **separado por 10px**, un círculo terracota de 62px con el avatar de Bob.
No es un quinto destino: es una acción.

### 4.8 Hoja modal

`position: absolute; left/right/bottom: 0`. Fondo crema.
`border-radius: 32px 32px var(--rad) var(--rad)` — la esquina inferior sigue al marco.
Fondo oscurecido detrás: `rgba(14,14,14,.34)` + `backdrop-filter: blur(2px)`.
Asa de arrastre: 40×4px, `rgba(14,14,14,.14)`, centrada, 14px desde arriba.

Alturas según contenido:
- Bob: `top: var(--top)` — casi pantalla completa
- Cálculo, agua, pagos, cierre del mes: `top: calc(var(--top) + 6px)`
- El resto: `max-height: 76%`

---

## 5. Bob · el asistente

Ver `05-bob-agente.md` para el comportamiento. Aquí, solo lo visual.

- **Avatar:** blobatar generado, hue ámbar (`#C07A1A`), forma redondeada.
  Tamaños: 20px (en línea), 24px (en tarjeta), 38px (en la nav), 42px (cabecera).
- **Nunca** una chispa ✨, ni un gradiente morado, ni una cara con expresión de juicio.
- Cuando Bob dice algo dentro de un flujo, va en una tarjeta de fondo ámbar suave
  con el avatar de 24px a la izquierda y el texto en `300 13px/1.5 DM Sans`.
- Máximo dos líneas. Si necesita más, es que hay que rediseñar el momento.

---

## 6. Movimiento

Todo tiene motivo. Nada decora.

| Animación | Especificación |
|---|---|
| Entrada de bloque | `fadeUp`: `opacity 0→1`, `translateY(8px)→0`, `.34s cubic-bezier(.2,.8,.3,1)` |
| Hoja modal | `translateY(100%)→0`, `.32s cubic-bezier(.2,.85,.3,1)` |
| Cifra que cuenta | Al abrir, sube desde 0 hasta el valor. Una vez. |
| Barras del gráfico | Crecen desde abajo, escalonadas 30ms. Una vez. |
| Cambio de mes | Deslizamiento lateral, 200ms |
| Registrar un pago | La píldora hace morph de ámbar a verde y el saldo recuenta |

```css
@media (prefers-reduced-motion: reduce) { /* todas las animaciones se desactivan */ }
```

**Nunca un bucle infinito.** Nada pulsa, respira ni gira esperando atención.

---

## 7. Responsive

El interior es completamente fluido: flex, `inset`, `min-width: 0`. Solo el
contenedor cambia. Dos variables controlan el espaciado dependiente del dispositivo:

```css
--top   /* espacio superior: notch */
--bot   /* espacio inferior: barra de gestos */
--rad   /* radio del marco */
```

### Teléfono vertical · `max-width: 540px`

La app **ocupa la pantalla completa**. Sin marco, sin borde, sin sombra, radio 0.

```css
--top: calc(30px + env(safe-area-inset-top));
--bot: calc(18px + env(safe-area-inset-bottom));
width: 100vw; height: 100dvh;
```

### Pantalla baja · `max-height: 560px`

Teléfono horizontal, ventana pequeña. Columna de `min(430px, 100vw)` a altura
completa, centrada, con bordes laterales. **No se estira la interfaz a lo ancho.**

```css
--top: calc(22px + env(safe-area-inset-top));
--bot: calc(14px + env(safe-area-inset-bottom));
```

### Tablet y escritorio

Marco de dispositivo centrado, `390×844`, radio 38px, sombra suave, sobre fondo
`#E9E5DD`. Altura topada en `calc(100dvh - 56px)` para que nunca se recorte.

```css
--top: 38px; --bot: 20px; --rad: 38px;
```

**Decisión deliberada: no hay layout de escritorio de dos columnas.** Son siete
vecinos consultando su cuota desde el celular. Una versión ancha sería una pantalla
que nadie usa y que hay que mantener igual.

### Verificado

Sin desbordes horizontales de 320px a 430px en las seis pantallas de vecino.
Todo contenedor flex que pueda recibir texto largo lleva `min-width: 0`.

---

## 8. Accesibilidad

Lo que ya cumple y hay que mantener:

- Áreas táctiles de 44×44px mínimo en toda la navegación y los controles.
- Contraste: tinta sobre crema, crema sobre noche — ambos superan AAA.
  El gris `#7A7570` sobre crema cumple AA para texto normal.
- `prefers-reduced-motion` desactiva toda animación.
- El color nunca es el único portador de información: los estados llevan texto
  (`AL DÍA`, `SIN REGISTRAR`) además de color.

Lo que **falta** y hay que añadir al implementar:

- Roles y etiquetas ARIA. El prototipo usa `<div onClick>` en todas partes; en
  producción deben ser `<button>` con `aria-label` donde el texto no baste.
- Foco visible y orden de tabulación en las hojas modales (trampa de foco).
- Anuncio a lector de pantalla cuando cambia el estado de un pago.
- Escalado de texto del sistema: probar con el tamaño de fuente al 200%.
