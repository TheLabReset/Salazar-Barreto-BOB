# Handoff · App del edificio Jr. Enrique Salazar Barreto

> Paquete de entrega para implementación. Autocontenido: un desarrollador que no
> estuvo en el proceso de diseño puede construir la app leyendo solo esta carpeta.

---

## 1. Qué es esto

Siete departamentos de un edificio en Lima se autoadministran desde que despidieron
a la administradora anterior. El problema no era la plata: era la **opacidad**. Nadie
entendía de dónde salía su cuota, y preguntar se sentía como acusar.

La app existe para que **cada sol sea visible y explicable**, sin que nadie tenga que
pedir explicaciones. Todo número que aparece en pantalla puede abrirse y mostrar cómo
se calculó, con los datos reales del recibo.

**Usuarios:** 7 hogares. Uno de ellos administra en un momento dado (rotativo).
**Dispositivo:** teléfono, casi exclusivamente. PWA instalable.
**Idioma:** español peruano. Moneda: soles (S/). Consumo: metros cúbicos (m³).

### Los dos principios que no se negocian

1. **Nada de "confía en mí".** Cada cuota se abre en su cálculo paso a paso, con los
   números del recibo de SEDAPAL al lado. Si el reparto se tuvo que ajustar, la app lo
   dice y explica por qué.
2. **Vecinos, no morosos.** Nunca se usa lenguaje de cobranza. No existe "deudor",
   "moroso", "vencido" ni el color rojo para un pago. Un pago que falta está
   `Sin registrar` en ámbar. La diferencia importa: son siete personas que se cruzan
   en el ascensor.

---

## 2. Sobre los archivos de esta carpeta

Los archivos `.html` y `.js` incluidos son **referencias de diseño**, no código de
producción. Son prototipos que muestran el aspecto y el comportamiento esperados.

**La tarea es recrear estos diseños en el entorno de la app destino** — React, React
Native, Vue, SwiftUI, lo que corresponda — usando los patrones y librerías que ya
existan en ese proyecto. Si aún no hay proyecto, elige el stack que mejor sirva a una
PWA móvil instalable y construye ahí.

**Una excepción importante:** `datos-edificio.js` **no es solo una referencia**.
Contiene el motor de cálculo con las reglas reales del edificio, ya validado contra
recibos verdaderos. Pórtalo con fidelidad literal — es la parte donde un error cuesta
dinero y confianza. Ver `01-reglas-de-negocio.md`.

---

## 3. Fidelidad

**Alta fidelidad (hifi).** Colores, tipografía, espaciado, radios, animaciones y
copys están decididos y validados con el usuario a lo largo de muchas iteraciones.
Recréalos con precisión. Los valores exactos están en `02-sistema-de-diseno.md`.

Los textos en pantalla también son parte del diseño: fueron escritos y reescritos
específicamente para el tono "vecino, no cobrador". **No los reescribas.** Están
transcritos literalmente en `03-pantallas.md` y `04-cierre-del-mes.md`.

---

## 4. Mapa de la aplicación

### Pantallas de vecino (las ve todo el mundo)

| # | Pantalla | Clave | Qué resuelve |
|---|---|---|---|
| 0 | Elegir departamento | `onboarding` | Primer uso. Se guarda en el dispositivo. |
| 1 | Inicio | `inicio` | ¿Cuánto debo y cómo va el edificio? |
| 2 | El mes | `mes` | ¿En qué se gastó y cómo se repartió? |
| 3 | Mi departamento | `midpto` | Mi historia: pagos y consumo de agua |
| 4 | Historial | `historial` | El año entero del edificio |
| 5 | Avisos | `avisos` | Todo lo que pasó, en orden |

### Pantalla de administración (una persona a la vez)

| # | Pantalla | Clave | Qué resuelve |
|---|---|---|---|
| 6 | Administración | `admin` | Panel con PIN. Cierre del mes y ajustes. |

### Hojas modales (`bottom sheets`)

| Clave | Contenido |
|---|---|
| `bob` | Conversación con el asistente. Ocupa casi toda la altura. |
| `calculo` | El cálculo del mes en 5 secciones numeradas |
| `pagos` | Historial de pagos del departamento |
| `agua` | Consumo de agua del departamento, 12 meses |
| `pagar` | Datos de la cuenta y cómo transferir |
| `aviso-ok` | Confirmación de "ya pagué" |
| `wizard` | **El cierre del mes en 7 pasos.** Casi pantalla completa. |
| `cargos` | Cargos adicionales y créditos (admin) |
| `export` | Exportar el año (admin) |
| `numpad` | Teclado numérico propio. Se superpone a todo. |

Documentación detallada por pantalla en `03-pantallas.md`.
El cierre del mes, paso por paso, en `04-cierre-del-mes.md`.

---

## 5. Los cinco documentos

| Archivo | Contenido |
|---|---|
| `01-reglas-de-negocio.md` | **El motor de cálculo.** Fórmulas, casos borde, validaciones. Lo más importante del paquete. |
| `02-sistema-de-diseno.md` | Tokens, tipografía, componentes, animación, responsive. |
| `03-pantallas.md` | Cada pantalla: layout, componentes, medidas, copys literales. |
| `04-cierre-del-mes.md` | El flujo de 7 pasos del administrador, con sus validaciones. |
| `05-bob-agente.md` | El asistente: qué sabe, qué no puede hacer, cómo habla. |
| `06-modelo-de-datos.md` | Esquema para el backend, auditoría, notificaciones. |

---

## 6. Estado y navegación

Todo el prototipo corre sobre un objeto de estado plano. En producción, la mayoría
de estos campos serán datos del servidor; los de UI se quedan en el cliente.

```js
{
  dpto: null,            // '401' — departamento del usuario. Persiste en el dispositivo.
  pantalla: 'inicio',    // inicio | mes | midpto | historial | avisos | admin
  mes: '2026-06',        // mes que se está mirando (no el mes actual del sistema)
  hoja: null,            // bob | calculo | pagos | agua | pagar | wizard | cargos | export | null
  numpad: null,          // { campo, etiqueta, dec, sufijo } — teclado numérico abierto
  admin: false,          // PIN validado en esta sesión
  pin: '',               // lo que se va tecleando
  paso: 0,               // 0..7 dentro del cierre del mes
  avisosLeidos: false,   // apaga el punto de la campana
  pagos: null,           // overrides de pagos hechos en esta sesión
  correccion: null,      // propuesta de corrección de lectura pendiente de aceptar
}
```

**Reglas de navegación:**
- Sin `dpto` no se ve nada más que el onboarding.
- La barra de navegación inferior solo aparece en `inicio`, `mes`, `midpto`, `historial`.
- `avisos` y `admin` son pantallas completas sin nav — se sale con la flecha atrás.
- Abrir una hoja no cambia la pantalla de fondo. Cerrarla vuelve exactamente a donde estabas.
- El botón atrás del sistema (Android) y el gesto de deslizar deben cerrar la hoja
  activa antes de navegar. **Esto no está implementado en el prototipo y hay que hacerlo.**

---

## 7. Acceso a administración

**Decisión tomada con el usuario, respétala:** no hay gestión de roles, ni traspaso
de turno, ni pantalla de "pasar la administración". Es innecesario para 7 personas.

- El botón "Administración" está en **Avisos**, al final, visible para todos.
- Al tocarlo pide un **PIN de 4 dígitos**. En el prototipo es `2026`.
- Quien no tenga el PIN simplemente no entra. No hay mensaje de "no tienes permiso" —
  el PIN incorrecto solo sacude el campo y lo limpia.
- **El PIN lo cambia el desarrollador en el código** cuando rota el administrador.
  No hay UI para eso a propósito.

En producción el PIN no puede vivir en el cliente. Mínimo viable: validación contra
el servidor con rate limiting. El modelo mental para el usuario no cambia.

---

## 8. Lo que el prototipo NO resuelve

Sé honesto sobre esto al planificar. El prototipo es completo en interfaz y en
reglas de cálculo, pero:

1. **No persiste nada.** Al recargar vuelve al estado inicial. Necesita backend.
2. **No hay autenticación real.** Solo el PIN del admin, en el cliente.
3. **Las notificaciones son visuales.** No hay push, ni email, ni WhatsApp.
   El diseño asume que **cualquier movimiento genera un aviso que le llega a los siete**
   (ver `06-modelo-de-datos.md`, sección de auditoría).
4. **Bob no está conectado a un modelo.** Sus respuestas son deterministas, escritas
   a mano sobre los datos del mes. Ver `05-bob-agente.md` para el contrato real.
5. **No hay exportación real a Excel.** La hoja existe, la descarga no.
6. **Datos de ejemplo.** `datos-edificio.js` tiene 8 meses de lecturas y recibos
   realistas pero inventados a partir de los reales. Hay que cargar los verdaderos.

---

## 9. Orden de implementación sugerido

1. **El motor de cálculo primero, con tests.** Es la única parte donde un error es
   grave. Portar `calcularMes`, `serieSaldo`, `saldoAl` y validarlos contra los
   valores esperados listados en `01-reglas-de-negocio.md`.
2. **Modelo de datos y persistencia.** Ver `06-modelo-de-datos.md`.
3. **Pantallas de vecino** (Inicio → El mes → Mi departamento → Historial → Avisos).
   Son de solo lectura: se puede llegar lejos sin escrituras.
4. **El cierre del mes.** El flujo más complejo y el que más valor entrega.
5. **Auditoría y notificaciones.** Todo movimiento deja rastro y avisa a los siete.
6. **Bob.** Al final: sin datos reales no tiene nada que decir.

---

## 10. Archivos incluidos

| Archivo | Qué es |
|---|---|
| `PROMPT-PRODUCCION.md` | **Prompt de implementación en 10 fases con verificadores adversarios.** Pégalo como primer mensaje a Claude Code. |
| `Salazar Barreto v2.dc.html` | El prototipo completo. Ábrelo en un navegador. PIN `2026`. |
| `datos-edificio.js` | **Motor de cálculo + datos.** Pórtalo con fidelidad. |
| `support.js` | Runtime del prototipo. **No lo portes**, es andamiaje de la herramienta de diseño. |

Para ver el prototipo: abre `Salazar Barreto v2.dc.html`. Elige un departamento
(prueba `401`, es el que tiene el caso del lavado de vehículo). Para el panel de
administración: Avisos → Administración → PIN `2026`.
