# 04 · El cierre del mes

> El flujo más importante de la app. Lo hace una persona, una vez al mes, y de él
> dependen las cuotas de siete hogares.
>
> **El objetivo de diseño fue explícito: que sea imposible equivocarse.** Tan lineal
> y tan paso a paso que no haya decisiones ambiguas.

**Se abre desde:** Administración → "Empezar julio"
**Estado:** `hoja === 'wizard'`, `paso: 0..7`
**Altura:** `top: calc(var(--top) + 6px)` — casi pantalla completa

---

## Principios del flujo

1. **Un dato por pantalla.** Nunca un formulario con ocho campos.
2. **Se guarda solo en cada paso.** Se puede salir y volver sin perder nada.
3. **Teclado numérico propio**, nunca el del sistema (tapa el contexto).
4. **Bob acompaña con contexto**, no valida ni decide. Compara con meses anteriores
   y avisa si algo se sale de lo normal, pero el que decide es el administrador.
5. **El botón de avanzar dice qué falta** cuando no se puede avanzar:
   "Escribe los dos datos" en vez de un botón gris sin explicación.
6. **Nada se publica hasta el paso 7.** Antes de eso, ningún vecino ve nada.

---

## Cabecera común

`padding: 16px 24px 0`, tres elementos:
- Izquierda: círculo de 32px con flecha atrás. En el paso 0 cierra la hoja; en los
  demás retrocede un paso.
- Centro: `PASO 3 DE 7` en mono 10px .16em gris. En el paso 0: `JULIO 2026`.
- Derecha: hueco de 32px para equilibrar.

---

## Paso 0 · Presentación

```
Vamos a cerrar julio                    Syne 800 30px/1.14
Son siete pasos. Se guarda solo en      DM Sans 300
cada uno, así que puedes salir y
volver cuando quieras.

[ lista de los 7 pasos con su estado ]

[ Empezar ]                             botón noche, 54px, radio 999px
```

La lista muestra los siete pasos por nombre. Los ya completados llevan un check verde.
Al volver a entrar, el usuario ve exactamente dónde se quedó.

---

## Paso 1 · Las lecturas

**El paso más delicado.** Siete medidores, siete números de tres decimales.

```
Las lecturas                            [ 3 DE 7 ]  ← píldora celeste
Al lado tienes la del mes pasado.
```

Una fila por departamento:

```
401   Alonso y Julisa           438.038      ← mono 19px, tocable
      anterior 420.638          consumo 17.40 m³
      DM Sans 300 11px gris     mono 11px, celeste o ámbar
```

- Tocar la fila abre el numpad con la etiqueta *"Lectura del 401 · anterior 420.638"*
- El consumo se calcula al vuelo y se muestra debajo
- Si el consumo supera el doble del promedio histórico, se pinta en **ámbar** y
  aparece un icono de atención. No bloquea: avisa.

### Corrección de tecleo

Si el número escrito parece un error de un dígito y existe **exactamente una**
corrección que hace cuadrar todo (ver `01-reglas-de-negocio.md` §8), Bob la propone:

> *"¿Será 438.038? Con 483.038 el consumo sería 62.40 m³, cuatro veces tu promedio,
> y el edificio pasaría de lo que facturó SEDAPAL."*
>
> [ Sí, es 438.038 ]   [ No, lo dejo así ]

**Nunca corrige sola.** Y si hay más de una corrección posible, se calla.

**Para avanzar:** los siete deben tener lectura.

---

## Paso 2 · La factura de agua

```
La factura de agua
Del recibo de SEDAPAL, tal como viene en el papel.

[ Consumo de agua del edificio ]     81  m³      ← etiqueta celeste
[ Monto de la factura de agua ]  S/ 338.60       ← etiqueta celeste
```

Ambos campos abren el numpad. Las etiquetas dicen **de qué** es el consumo y **de qué**
es la factura — nunca "consumo" a secas.

Bob compara en cuanto hay dato:

> *"81 m³ está en línea con los últimos meses: junio fueron 78 y mayo 78."*

o, si se sale:

> *"96 m³ es bastante más que los últimos meses (junio 78, mayo 78). ¿Lo confirmas?"*

**Para avanzar:** ambos campos. Si falta uno, el botón dice *"Escribe los dos datos"*.

---

## Paso 3 · El recibo de luz común

```
El recibo de luz común
La luz de pasillos, ascensor y bomba. Solo el monto.

[ Monto del recibo de luz común ]  S/ 361.20
```

Un solo campo. Bob compara con el mes anterior.

---

## Paso 4 · Los gastos fijos

Los diez conceptos precargados con su monto habitual. Cada fila es tocable y abre el
numpad con el concepto como etiqueta.

- Los anuales llevan la etiqueta `ANUAL ÷ 12`
- El **pozo a tierra** aparece sin cifra, con fondo ámbar suave. No bloquea el avance.
- Al pie, un bloque noche: `SUMAN` + el total en mono 20px

> Si el pozo a tierra sigue sin cifra:
> *"El pozo a tierra sigue sin cifra. Puedes dejarlo así y ponerlo cuando lo tengas."*

---

## Paso 5 · Lo puntual

Lo que cambia de un mes a otro.

### Gastos y créditos

Dos botones: **+ Gasto extraordinario** y **+ Crédito a un departamento**.
Cada uno abre el numpad y, al confirmar, **la entrada aparece listada debajo del botón**
con su concepto, su monto y una línea que explica quién lo paga:

- Gasto: *"se reparte entre los siete"*
- Crédito: *"a favor del 301"*

> Esto se corrigió durante el diseño: antes se seleccionaba y no pasaba nada visible.
> El feedback inmediato es parte del requisito.

### Reasignaciones de agua

```
REASIGNACIONES DE AGUA · ¿SIGUEN?

[✓]  401 · lavado de vehículo              1.50 m³
     activo · se descuenta del área común
```

Una **casilla marcable**, no un campo. Viene marcada si estuvo activa el mes anterior.
El subtítulo dice su estado: *"activo · se descuenta del área común"* o
*"desactivado este mes"*.

El valor en m³ se muestra a la derecha y **sigue lo configurado en el panel**, no un
número escrito a mano.

Desmarcarla pone `lavadoM3 = 0`: todo el área común vuelve a repartirse entre los siete
y el 401 solo paga su medidor.

---

## Paso 6 · La revisión

**El paso que impide publicar algo mal.** No pide datos: los enseña ya calculados.

### El cuadre

Si todo cuadra, bloque verde suave:

> ✓ **El agua cuadra** — *"Lo que pagan los siete más el área común es exactamente
> lo que facturó SEDAPAL."*

Si el reparto se ajustó, lo dice y explica por qué. Si **no** cuadra, bloque ámbar
con el detalle y **el botón de publicar queda bloqueado**.

### Avisos de atención

Se muestran cuando algo merece una segunda mirada, sin bloquear:

- **Exceso grave:** *"Los medidores suman 82.40 m³ y SEDAPAL facturó 81. Sobran
  1.40 m³, un 1.7% de la factura."*
- **Área común anormal:** *"Quedarían 6.80 m³ como área común: un 8.4% de la factura,
  que se reparte entre los siete."*
- **Lectura rara:** la fila del departamento con su lectura anterior, lo que se
  escribió y el consumo resultante, para revisarla de un vistazo.

### El detalle

Las siete cuotas, cada una con:
```
401   mant. 428.60 + agua 83.80        512.40      +12.30
                                                   ámbar si sube
                                                   verde si baja
```

Y el cuadre completo al pie:
```
Lo que pagan los siete                          3 102.28
Área común del agua · 0.30 m³                      12.20
Créditos aplicados                                 50.00
  salen del saldo de la cuenta, no de los demás vecinos
─────────────────────────────────────────────────────────
Total de julio                                  3 164.48
```

---

## Paso 7 · Publicar

Antes de publicar, el administrador escribe **tres notas** con estructura fija.
Son el registro para el siguiente y el contexto para los vecinos:

| Campo | Qué se espera |
|---|---|
| **Qué pasó** | Lo normal del mes |
| **Qué cambió** | Respecto al mes anterior |
| **Qué queda pendiente** | Lo que el siguiente debe saber |

Las tres son editables después de publicar.

Al confirmar:

1. El mes pasa a **publicado**. Los siete lo ven en Inicio.
2. Se genera un **aviso para todos**: *"Ya está el cierre de julio"*.
3. Queda registrado quién lo publicó y cuándo.

### Pantalla de confirmación

```
✓  Julio ya está publicado

   S/ 3 164.48
   repartido entre los siete · el agua cuadró exacto

   [ Volver ]
```

---

## Corregir un mes ya publicado

**Está permitido, y deja rastro.** Un mes publicado se puede reabrir y corregir.

Cuando se guarda una corrección:

1. Se recalculan las cuotas de ese mes.
2. **Se genera un aviso que le llega a los siete**, diciendo qué cambió:
   *"Se corrigió la lectura del 202 en mayo. Su cuota pasó de S/ 498.20 a S/ 512.40."*
3. Queda en el registro de auditoría: qué campo, valor anterior, valor nuevo, quién
   y cuándo.

**No hay correcciones silenciosas.** Es la contrapartida de permitir editar: todo
movimiento es visible para todos. Ver `06-modelo-de-datos.md`.

---

## Panel de administración · otras funciones

Además del cierre del mes:

| Función | Qué hace |
|---|---|
| **Registrar un pago** | Marca un departamento como `confirmado`, con fecha y operación |
| **Avisos de pago por verificar** | Lista de los vecinos que dijeron "ya pagué" |
| **Gastos fijos** | Editar los montos de los diez conceptos. Aplica a los meses siguientes. |
| **Consumo del lavado · 401** | Cambiar los m³ mensuales del lavado |
| **Cargos adicionales y créditos** | Ver y gestionar los activos |
| **Exportar el año en Excel** | Descarga del año completo *(no implementado)* |
