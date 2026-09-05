# 03 · Pantallas

Los textos citados son literales. Fueron escritos para el tono "vecino, no cobrador".
No los reescribas.

---

## P0 · Elegir departamento

**Cuándo:** primer uso, o al tocar "Cambiar de departamento" en Mi departamento.
**Estado:** `dpto === null`

Sin navegación inferior. Scroll vertical, `inset: var(--top) 0 0`.

```
padding: 54px 32px 0

  JR. ENRIQUE SALAZAR BARRETO        mono 10px .16em, terracota
  ¿Cuál es tu departamento?          Syne 800 26px/1.15
  Así Inicio te muestra lo tuyo      DM Sans 300 15px/1.5 gris
  primero.

  [ lista de 7 filas tocables ]
```

Cada fila: número en mono, nombre de los ocupantes en DM Sans 300 gris, y el piso.
Al tocar, entra directo a Inicio. La elección se guarda en el dispositivo.

---

## P1 · Inicio

**La pantalla que define todo.** Responde en cinco segundos: *cuánto debo* y
*cómo va el edificio*.

**Estado:** `pantalla === 'inicio'` · Scroll `inset: 0`, `padding-bottom: calc(88px + var(--bot))`

### Orden vertical

**1 · Cabecera con degradado**
Fondo `linear-gradient(#EEDFCF, #F7F4EE 78%)`, `padding: var(--top) 0 8px`.
Interior `padding: 26px 24px 22px`, flex con `justify-content: space-between`.

- Izquierda: `JUNIO 2026` (mono 10px .16em, `#A85F2A`) sobre `Hola, 401` (Syne 800 27px)
- Derecha: campana. Si hay avisos sin leer, punto terracota. Lleva a P5.

**2 · Tarjeta noche — tu cuota**
`padding: 0 20px`, tarjeta `#17172B`, radio 24px, `padding: 24px 24px 20px`.

```
TU CUOTA DE JUNIO                    [ SIN REGISTRAR ]
S/ 512.40                            mono 500 46px, -.03em
Vence el 10 de julio                 300 13px/1.4, crema .55
─────────────────────────────────────
Mantenimiento                            S/ 428.60
Consumo de agua · 8.42 m³                 S/ 83.80    ← #8ECBE4
  Incluye 1.50 m³ del lavado de vehículo,
  que salen del caño común.               ← solo el 401
─────────────────────────────────────
[ ¿Cómo se calculó? ]  [ Ya pagué ]
```

El monto cuenta desde 0 al abrir. La línea del lavado solo aparece en el 401 y
**el valor se interpola desde el cálculo**, nunca se escribe fijo.

**3 · Los 7 este mes**
`padding: 28px 24px 0`

Etiqueta `LOS 7 ESTE MES` a la izquierda, `5 de 7` en mono a la derecha.
Debajo, la barra de progreso segmentada de siete tramos.
Luego dos grupos con subtítulo gris 11px: **Ya registrado** / **Aún sin registrar**,
cada uno con sus filas de departamento.

**4 · En qué se gastó**
`padding: 30px 24px 0`. Los cuatro gastos mayores del mes, cada uno con concepto,
monto en mono, y una barra horizontal de 4px proporcional al total.

**5 · La cuenta**
Tarjeta blanca, radio 22px. Etiqueta `LA CUENTA`, saldo en mono 32px, línea de
contexto, sparkline de 12 meses, y al pie dos columnas separadas por línea vertical:
**Recibido** y **Gastado**.

---

## P2 · El mes

**Estado:** `pantalla === 'mes'` · Scroll `inset: var(--top) 0 0`

**1 · Título** `El mes` (Syne 800 27px), `padding: 24px 24px 0`

**2 · Selector de mes** — carrusel horizontal, `gap: 8px`, `overflow-x: auto`,
sin barra de scroll. El mes activo en píldora noche. Se autocentra al abrir.

**3 · Tarjeta noche**
```
COSTÓ MANTENER EL EDIFICIO
S/ 3 216.48                              mono 500 42px
Junio 2026 · S/ 84.20 más que el mes pasado
```

**4 · Rejilla asimétrica del agua**
`display: flex; gap: 12px`. Izquierda `flex: 1.45`, derecha `flex: 1` en columna.
**Ambos con `min-width: 0`** — sin eso se desborda por debajo de 340px.

- Izquierda: tarjeta alta, etiqueta `CONSUMO DE AGUA POR DPTO · M³` en `#3E93B8`,
  gráfico de 7 barras de 132px con la del usuario en celeste.
- Derecha arriba: `AGUA SEDAPAL` → m³ del edificio
- Derecha abajo: `FACTURA DE AGUA` → monto + nota del área común

**5 · Explicación del agua** — texto que cambia según el caso:

> Normal: *"Los medidores sumaron 76.20 m³ y SEDAPAL facturó 78. De la diferencia,
> 1.50 m³ son el lavado del 401; los 0.30 m³ restantes son área común y se reparten
> entre los siete."*

> Ajustado: *"Los medidores sumaron 82.40 m³ y SEDAPAL facturó 81. Como no se puede
> cobrar más de lo que llegó en el recibo, a cada uno se le descontó la misma proporción."*

**6 · Gastos del mes** — los diez conceptos en filas con divisoria. Los anuales
llevan la etiqueta `ANUAL ÷ 12` (mono 8px sobre fondo neutro suave). El pozo a
tierra sin cifra va en ámbar con `POR CONFIRMAR`.

**7 · Las 7 cuotas** — fila por departamento: número, desglose
(*"mant. 428.60 + agua 83.80"*), total en mono.

**8 · Pagos recibidos** — quién, cuándo, cuánto, número de operación.

---

## P3 · Mi departamento

**Estado:** `pantalla === 'midpto'`

**1 · Cabecera** — `ALONSO Y JULISA · FLAT 10.21%` sobre `Depa 401` (Syne 800 30px)

**2 · Tarjeta noche** — la cuota del mes desglosada, con píldora de estado

**3 · Tarjeta del lavado** *(solo el 401)*
Tarjeta blanca. Etiqueta `LAVADO DE VEHÍCULO` en `#3E93B8`, valor `1.50 m³`.
Debajo:

> *"El agua sale del caño común, así que esos 1.50 m³ se restan del área común y se
> suman a los tuyos. No es un cobro aparte: el total sigue siendo lo que factura SEDAPAL."*

**4 · Tu historia en el edificio** — dos tarjetas tocables:

- **Historial de pagos** → total pagado en el año, sparkline, abre la hoja `pagos`
- **Tu consumo de agua** → m³ del mes en `#3E93B8`, gráfico de 12 barras en celeste
  con el mes actual destacado, abre la hoja `agua`

**5 · Cambiar de departamento** — vuelve al onboarding

---

## P4 · Historial

**Estado:** `pantalla === 'historial'`

**1 · Título** `Historial` + subtítulo

**2 · Tarjeta noche — La cuenta** — saldo actual, contexto, sparkline

**3 · Consumo de agua del edificio · m³** — barras de 12 meses en `#3E93B8`

**4 · Lista de meses** — cada uno abre P2 en ese mes

---

## P5 · Avisos

**Estado:** `pantalla === 'avisos'` · Sin navegación inferior. Se sale con la flecha.

Cabecera con `Avisos` y "Marcar todo como leído".
Agrupados por fecha con subtítulo gris (`HOY`, `ESTA SEMANA`, `ANTES`).

Cada aviso es una tarjeta blanca de radio 18px con:
- Contenedor de icono 34×34px, radio 12px, fondo del color del tipo
- Título en `400 14.5px DM Sans`, detalle en `300 12px` gris
- Marca de tiempo

**Tipos de aviso:**

| Tipo | Color | Ejemplo |
|---|---|---|
| Mes publicado | terracota | *"Ya está el cierre de junio"* |
| Pago confirmado | verde | *"Se confirmó tu pago de junio"* |
| Corrección | ámbar | *"Se corrigió la lectura del 202 en mayo"* |
| Recordatorio | gris | *"Faltan 3 días para el 10"* |

**Al final de la pantalla:** el acceso a **Administración**. Visible para todos.
Al tocarlo, pide el PIN de 4 dígitos.

---

## Hojas modales

### `calculo` · ¿Cómo se calculó esto?

Se abre desde Inicio y desde El mes. **La pieza central de la transparencia.**
Cinco secciones numeradas, cada una con un círculo noche de 22px con su número:

1. **Lo que cobró SEDAPAL** — m³ facturados, monto, descuento si lo hay, precio por m³
2. **Lo que midió cada medidor** — los siete consumos y su suma
3. **Qué pasó con la diferencia** (o **Por qué se ajustó**) — el área común, el lavado
   del 401 si aplica, o la explicación del reparto proporcional
4. **Lo que paga cada uno** — las siete cuotas con su desglose y la diferencia
   respecto al mes anterior
5. **El cuadre** — sobre fondo verde suave: *"El agua cuadra"* + la suma que lo
   demuestra. Si no cuadra, ámbar con el detalle de qué falta.

### `pagar` · Cómo pagar

Datos de la cuenta, botón de copiar el número, monto exacto a transferir, y el botón
"Ya pagué" que dispara el aviso.

### `aviso-ok` · Confirmación

> **Listo, ya avisaste**
> *"Tu mes pasó a «en verificación». Deja de figurar como pendiente y quien administra
> lo confirma contra el estado de cuenta."*

### `bob` · El asistente

Ocupa casi toda la altura (`top: var(--top)`). Ver `05-bob-agente.md`.

**Importante:** al abrir Bob, la conversación está ahí mismo. No hay una segunda
ventana ni un paso intermedio. El usuario pregunta y responde en el mismo lugar.

### `numpad` · Teclado numérico

Se superpone a cualquier hoja, incluido el cierre del mes. Ver `02-sistema-de-diseno.md` §4.6.
