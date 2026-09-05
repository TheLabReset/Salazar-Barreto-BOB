# 06 · Modelo de datos y backend

El prototipo no persiste nada. Esto es lo que hace falta para que sea una app real.

---

## 1. Entidades

```
departamento
  id            '101' | '201' | '202' | '301' | '401' | '501' | '502'
  nombre        texto      — ocupantes
  flat          decimal    — % de participación. Los siete suman 100.00
  piso          entero

lectura
  mes           '2026-07'
  dpto          fk
  valor         decimal(10,3)   — el medidor da 3 decimales
  registradoPor fk usuario
  registradoEn  timestamp
  ⟨ único: (mes, dpto) ⟩

recibo
  mes           '2026-07'      ⟨ único ⟩
  aguaM3        entero
  aguaMonto     decimal(10,2)
  descuento     decimal(10,2)  nullable
  luz           decimal(10,2)

gastoFijo
  concepto      texto          ⟨ único ⟩
  monto         decimal(10,2)  nullable   — null = por confirmar
  anual         booleano
  vigenteDesde  mes            — un cambio no reescribe el pasado

gastoExtra
  mes           '2026-07'
  tipo          'gasto' | 'credito'
  concepto      texto
  monto         decimal(10,2)
  dpto          fk nullable    — obligatorio si tipo = 'credito'

reasignacionAgua
  dpto          fk             — hoy solo el 401
  concepto      'lavado de vehículo'
  m3            decimal(6,2)   — 1.50
  desde         mes
  activoEn      lista de meses — se marca por mes en el paso 5

pago
  mes           '2026-07'
  dpto          fk
  estado        'confirmado' | 'aviso'
  fecha         fecha
  operacion     texto nullable
  texto         texto nullable — lo que escribió el vecino al avisar
  confirmadoPor fk usuario nullable
  ⟨ único: (mes, dpto) ⟩

cierre
  mes           '2026-07'      ⟨ único ⟩
  publicado     booleano
  publicadoPor  fk usuario
  publicadoEn   timestamp
  notaQuePaso       texto
  notaQueCambio     texto
  notaQuePendiente  texto

auditoria
  id, timestamp, usuario, accion, entidad, entidadId,
  campo, valorAnterior, valorNuevo, mes

aviso
  id, tipo, titulo, detalle, mes, creadoEn
  leidoPor      lista de dptos
```

---

## 2. Lo que se guarda y lo que se calcula

**Nunca guardes una cuota calculada.** Guarda las entradas (lecturas, recibos,
gastos) y calcula al vuelo con `calcularMes()`.

Razón: si mañana se corrige una lectura de mayo, todo lo derivado debe recalcularse
solo. Una cuota guardada se queda obsoleta y nadie se entera.

**La única excepción:** al publicar un mes, guarda una **instantánea** del resultado
(las siete cuotas, el total, el cuadre) junto al cierre. Sirve para mostrar qué se
publicó originalmente cuando después hay una corrección — es lo que hace verificable
el aviso *"tu cuota pasó de X a Y"*.

---

## 3. Auditoría · el requisito central

**Decisión del usuario, no negociable:** cualquier movimiento queda registrado y
genera un aviso que le llega a los siete.

### Qué genera aviso

| Acción | Aviso a todos |
|---|---|
| Publicar un mes | *"Ya está el cierre de julio"* |
| Confirmar un pago | *"Se confirmó el pago del 301 de julio"* |
| Corregir un dato de un mes publicado | *"Se corrigió la lectura del 202 en mayo. Su cuota pasó de S/ 498.20 a S/ 512.40."* |
| Cambiar un gasto fijo | *"El ascensor pasó de S/ 680.00 a S/ 720.00 desde agosto"* |
| Activar o desactivar una reasignación | *"El lavado del 401 queda desactivado en julio"* |

### Qué NO genera aviso

Escribir datos en un mes **que todavía no se publicó**. El administrador puede
teclear, corregir y volver atrás las veces que quiera: nadie ve nada hasta el paso 7.

> Sin esto, cerrar el mes sería insoportable — siete notificaciones por cada tecla.

---

## 4. Notificaciones

El diseño asume que los avisos llegan al teléfono, no solo a la campana de la app.

**Recomendación:** Web Push para la PWA. Los siete usuarios son conocidos y se puede
pedir permiso en el onboarding con una razón concreta:
*"Para avisarte cuando esté el cierre del mes y cuando se confirme tu pago."*

Alternativa realista en Perú: un enlace por WhatsApp. Si se toma ese camino, que sea
**además** del aviso en la app, nunca en lugar de.

---

## 5. Autenticación

Siete hogares. No hace falta un sistema de identidad completo.

**Mínimo viable:**
- El departamento se elige una vez y se guarda en el dispositivo. Sin contraseña.
  Los datos son públicos entre los siete por diseño — la transparencia es el punto.
- El **PIN de administración** sí se valida contra el servidor, con límite de intentos.
  Nunca en el cliente.
- El PIN lo cambia el desarrollador cuando rota el administrador. No hay UI para eso,
  y es a propósito.

Si más adelante hace falta identidad real, un enlace mágico por correo es suficiente.

---

## 6. Migración de los datos reales

`datos-edificio.js` trae 8 meses de lecturas y recibos **realistas pero inventados**.
Antes de que la app sirva de algo hay que cargar los verdaderos.

**Orden sugerido:**

1. Los siete departamentos con sus flats reales (los del archivo **sí** son los reales).
2. Lecturas históricas — al menos 13 meses, porque el primer mes necesita el anterior
   para calcular su consumo.
3. Recibos de SEDAPAL y de luz de esos meses.
4. Gastos fijos vigentes.
5. Pagos históricos, con su estado.
6. **El saldo inicial real de la cuenta.** Y cambiar `serieSaldo()` para que acumule
   hacia adelante desde ese saldo, en vez de derivarlo hacia atrás desde `SALDO_BASE`
   como hace el prototipo.

**Validación de la carga:** recalcular cada mes histórico y comparar el total contra
lo que realmente se cobró. Si un mes no cuadra, el dato está mal cargado — o el
cálculo de aquel mes se hizo distinto, que también conviene saberlo antes de arrancar.
