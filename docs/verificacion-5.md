# Verificación · Fase 5 · El cierre del mes y el resto del panel

> Estado al cerrar: **10 de 10 puntos del verificador pasan.** Dos defectos
> encontrados por el propio verificador y arreglados aquí; uno de ellos —la
> corrección de tecleo— estaba **muerto en producción con el motor en verde**.
> Al final, §7, lo que queda declarado y no arreglado.

---

## 0. La puerta completa, sin cortar en el primer rojo

| Chequeo | Resultado |
|---|---|
| `npx tsc --noEmit` | limpio |
| `node scripts/verificar-tokens.mjs` | cero valores huérfanos · 157 ficheros, 16.097 líneas |
| `npx vitest run` | **261 / 261** |
| `npm run test:integracion` | **80 / 80** (Postgres real) |
| `node scripts/prueba-negativa.mjs` | **12 / 12** defectos de motor detectados |
| `node scripts/prueba-negativa-integracion.mjs` | **8 / 8** defectos de servicio detectados |
| `npx playwright test` | **96 / 96** |
| `npm run build` | compila |

Los 96 de Playwright incluyen los cuatro nuevos de esta fase: la propuesta de
corrección aceptada, el caso de dos sospechosas, la corrección de un mes
publicado, y la descarga del Excel leída de vuelta con ExcelJS.

---

## 1. Playwright, el flujo completo, del paso 0 al 7

`tests/e2e/cierre.spec.ts` recorre los siete pasos con los datos reales de julio
—las siete lecturas, el recibo de SEDAPAL (81 m³ · S/ 338.60), la luz común
(S/ 361.20), los gastos fijos, nada puntual, revisión y publicar— y compara las
siete cuotas **al céntimo** con lo que devuelve el motor de la Fase 1:

| Dpto | Cuota de julio |
|---|---|
| 101 | 381.83 |
| 201 | 342.85 |
| 202 | 683.54 |
| 301 | 371.02 |
| 401 | 388.96 |
| 501 | 535.69 |
| 502 | 663.70 |
| **Total del mes** | **3,374.38** |

### Tres cifras cruzadas a mano, con calculadora aparte

No contra el motor: **desde el papel**, con `python3` y aritmética decimal.

| Cifra | A mano, desde el recibo | La app |
|---|---|---|
| Total del mes | `1625 + 680 + 208.33 + 50 + 48.75 + 32.50 + 30 + 361.20 + 338.60` = **3374.38** | 3,374.38 |
| Mantenimiento del 101 | `round(3035.78 × 11.72) / 100` = **355.79** | 355.79 |
| Agua del 101 | `round2(6.23 × 338.60/81)` = **26.04** | 26.04 |

La tercera salió **26.05 en el primer intento**, y el desvío enseñó algo: usé el
consumo sin redondear (`186.461 − 180.23 = 6.231`). El motor redondea el consumo
a dos decimales **antes** de multiplicar por el precio del m³, como manda el
orden de redondeos de `01` §9. Con `6.23` da 26.04 y coincide. Es la
demostración de que el orden de los 16 redondeos no es cosmético: mueve
céntimos en la cuota de una persona.

---

## 2. Salir a mitad y volver

`se sale a mitad y se vuelve al mismo paso, con los datos escritos`: se escribe
una lectura en el paso 1, se **recarga la página entera** —no se cierra la hoja,
se recarga— y al volver a entrar el contador sigue en `1 / 7` y la lectura
`186.461` está en pantalla.

El paso vive en la base, no en el navegador, porque el administrador puede
cambiar de teléfono. Ninguna escritura de los pasos 1 a 6 genera aviso: nada
está publicado todavía.

---

## 3. Forzar que no cuadre

`con una lectura que no cuadra, el paso 6 bloquea la publicación`: se escriben
las siete lecturas con una que hace retroceder el medidor. El paso 6 no deja
publicar y dice qué no cuadra. El botón de avanzar **nunca se pone gris y se
calla**: su tipo obliga a pasar `motivoBloqueo`, así que un botón bloqueado sin
explicación no compila.

---

## 4. La corrección de tecleo · el defecto que el motor no podía ver

**Estaba muerta.** El motor de `01` §8 llevaba desde la Fase 1 probado contra el
mockup —90 tests de fidelidad, todos verdes— y la propuesta **no aparecía nunca
en la aplicación**.

La causa es de orden, no de cálculo. La regla descarta candidatas comparando
contra dos cosas que en el paso 1 todavía no existen: los m³ que facturó SEDAPAL
—que se escriben en el paso 2— y la suma de los otros seis medidores. Preguntada
en el paso 1, `objetivoM3` vale 0, la diferencia sale negativa para toda
candidata y no sobrevive ninguna. Medido:

```
propuestas con objetivoM3 = 0: 0 de 11.329 lecturas
```

Es exactamente la familia de defecto que el método llama *chequeo que nunca viste
fallar*: código correcto, tests verdes, y una función que en producción devuelve
`null` siempre.

**El arreglo.** El motor no se toca —es regla de cálculo, y es literal—. Se
arregla *cuándo* se pregunta:

- `lib/calculo/correccion.ts` gana `revisarLecturas()`, que **exige las siete
  lecturas y el recibo** y devuelve `null` con menos. Es honesto: con menos, la
  regla de §8 no se puede evaluar.
- El **paso 2** enseña la propuesta en cuanto se escriben los m³. Es el primer
  instante del cierre en que la regla es evaluable.
- El **paso 1** la conserva para cuando se reedita una lectura con el recibo ya
  puesto (el administrador que vuelve).

`04` dibuja la propuesta en el paso 1 y aquí sale también en el paso 2. No es una
licencia de diseño: es el único sitio donde la regla que el propio documento
manda aplicar tiene los datos que necesita.

### Los cuatro casos del verificador, con los datos reales de julio

| Caso | Qué hace | Dónde |
|---|---|---|
| Dos dígitos transpuestos (401: `483.038` en vez de `438.038`) | **La propone**, con la frase del documento | e2e + unitario |
| Dos correcciones posibles a la vez (401 y 101 mal) | **Se calla** | e2e + unitario |
| Lectura menor que la anterior | Nunca propone un valor por debajo del medidor anterior | unitario |
| Las siete bien | **Se calla** | unitario |

### La frase, y por qué no está escrita fija

`04` la enseña así:

> *«¿Será 438.038? Con 483.038 el consumo sería 62.40 m³, cuatro veces tu
> promedio, y el edificio pasaría de lo que facturó SEDAPAL.»*

Hay un test que compara esa frase **carácter a carácter** con la que produce la
app para ese caso. Pero no se escribe fija: las dos razones que enumera no son
ciertas siempre. Una lectura también puede fallar por quedarse **corta** contra
la factura, o por retroceder el medidor. Un aviso que afirma lo que no pasó es
peor que no avisar —regla 4: *un rótulo tiene que ser verdad en todos los
estados*—, así que la frase se arma con las razones que de verdad se cumplen
(`motivosLectura`), y hay un test que comprueba que en el caso de lectura corta
**no** dice «pasaría de lo que facturó».

### Prueba negativa

Se reintrodujo el defecto —quitar la revisión del paso 2, que es lo que había
antes— y el test de extremo a extremo **dio rojo**:

```
✘ una lectura con dos dígitos transpuestos: Bob la propone y se acepta
```

Restaurado, vuelve a verde. Un chequeo que nunca viste fallar es una decoración.

---

## 5. Desmarcar el lavado

`desmarcar el lavado: el 401 paga menos y el total del mes no cambia`. Las tres
cosas a la vez, que es lo que hace la prueba útil: el área común vuelve a
repartirse entre los siete, el 401 paga menos, y **el total del mes no se mueve**
—porque el lavado no es un cobro aparte: es agua que ya facturó SEDAPAL y solo
cambia de bolsillo—.

---

## 6. Publicar dos veces

El segundo intento falla limpiamente, con mensaje, sin dejar el mes a medias.

### Concurrencia

Dos escrituras simultáneas sobre el mismo mes. El bloqueo optimista es una sola
sentencia —`updateMany({ where: { mes, version } })`—, no un leer-comparar-
escribir en JavaScript. La versión anterior tenía la carrera abierta: las dos
escrituras tenían éxito y una se perdía sin ruido. Está en los 80 de integración.

---

## 7. Corregir un mes publicado

`tests/e2e/admin.spec.ts` lo hace por la pantalla, no por la API: abre la hoja
desde el panel, cambia la lectura del 202 (`35.112 → 35.500`), escribe el motivo,
guarda, y después comprueba tres cosas:

1. La cuota del 202 **cambió de verdad** en lo que sirve la API a los vecinos.
2. En **Avisos** aparece el aviso, y lleva **el monto anterior y el nuevo**, más
   el motivo tal como lo escribió el administrador.
3. En integración: queda el apunte en auditoría (`entidad: lectura`,
   `accion: corregir`) con el valor nuevo, y una corrección que descuadraría el
   mes **no se guarda**.

### Defecto encontrado aquí

La hoja de corrección **contaba como cambio un valor idéntico al que ya había**.
El teclado numérico abre con la lectura actual puesta; si el administrador la
confirmaba sin tocarla, el botón se desbloqueaba y decía *«Guardar la corrección
y avisar»*, y el servidor respondía con un 400 —*«No hay nada que corregir: los
valores son los mismos»*— que el administrador leería como que la app se rompió.

Arreglado en `HojaCorregir.tsx`: un valor igual al original **sale** del conjunto
de cambios, así que el botón vuelve a decir *«Cambia algo para poder corregir»*,
que es la verdad.

---

## 8. Exportar el año en Excel

El prototipo tenía la hoja dibujada y la descarga no existía. Aquí se descarga de
verdad: `/api/export/[anio]` genera el `.xlsx` con el mismo motor que la app, y
el navegador lo baja.

El test espera el evento `download`, comprueba el nombre del fichero, **abre el
libro con ExcelJS** —que lo lea ya prueba que es un `.xlsx` y no un HTML de
error— y compara las siete cuotas de junio **celda por celda** contra lo que
sirve la API.

### Defecto en mi propio chequeo

La primera versión buscaba cada cuota *«en algún sitio del libro»*. Como la hoja
de **Pagos** repite las mismas siete cifras que la de **Cuotas**, desviar la fila
de Cuotas en un céntimo **seguía dando verde**. Y una segunda versión comparaba
texto formateado (`"634.90"`) contra celdas numéricas (`634.9`), así que pasaba
solo en las cuotas que no terminan en cero.

Ahora localiza la hoja `Cuotas`, la fila de junio y la columna de cada
departamento, y compara números. Prueba negativa: se desvió la fila de cuotas en
`+0.01` y el test dio rojo nombrando la cifra:

```
Error: la cuota del 101 en la celda de junio
Expected: 373.82
Received: 373.83
```

---

## 9. Dos defectos de infraestructura de prueba, y sus chequeos

### El servidor viejo que servía el build de antes

La suite de extremo a extremo daba por hecho que había un `next start` corriendo.
Uno que llevaba media hora arriba seguía sirviendo el `.next` que un `next build`
posterior había reemplazado: **los catorce chunks de JavaScript devolvían 400**,
la página se pintaba en el servidor y no reaccionaba a nada, y el rojo salía como
*«no aparece el diálogo»* en un test que no tenía nada que ver con el problema.

Cerrado en `playwright.config.ts`: Playwright construye y levanta su propio
servidor (`webServer`, `reuseExistingServer: false`). Cuesta un minuto y quita la
clase entera de fallo.

### Dos ficheros resembrando la misma base a la vez

`test.describe.configure({ mode: 'serial' })` ordena los tests de **un** fichero,
no los de dos. Con `cierre.spec.ts` y `admin.spec.ts` en workers distintos, los
dos llamaban a resembrar contra la misma base: el cierre se quedaba a medias
porque el otro le había borrado el mes debajo, y el rojo aparecía en el fichero
inocente. En aislado los dos pasaban; juntos, no.

Cerrado con `tests/e2e/basedatos.ts`: un cerrojo entre procesos por fichero
creado con `wx` —creación exclusiva, atómica en el sistema de ficheros, sin
carrera entre comprobar y crear—. Los tests de solo lectura siguen en paralelo.
Si el cerrojo no se puede tomar en 180 s, **falla**: soltarlo a la fuerza
enmascararía la causa.

---

## 10. La mejor objeción de un escéptico competente

> *«Enseñas la propuesta de corrección en el paso 2 y el documento de diseño la
> dibuja en el paso 1. Dijiste que en copys y diseño manda el mockup. Te
> saltaste tu propia regla.»*

Es la objeción correcta y merece respuesta, no excusa. Tres cosas:

1. **El texto es literal.** Hay un test que compara la frase con la del documento
   carácter a carácter, en el caso que el documento enseña.
2. **La regla de cálculo es literal.** `proponerCorreccion` no se tocó: sigue
   pasando los 90 tests de fidelidad contra el mockup.
3. **Lo que cambió es el momento**, y es lo único que hace que la función exista.
   En el paso 1 la propuesta no aparece nunca —cero en 11.329 lecturas medidas—.
   Entre respetar el sitio del dibujo y que la función haga algo, gana que haga
   algo: `04` §"Corrección de tecleo" describe un comportamiento, y la única
   forma de tenerlo es preguntar cuando hay recibo. El paso 1 lo conserva para el
   caso en que sí puede responder.

Segunda objeción, más incómoda:

> *«El descarte de una propuesta ("No, lo dejo así") no se guarda en el servidor.
> Si el administrador vuelve al paso 2, la pregunta reaparece.»*

Cierto, y es deliberado: la lectura sospechosa **sigue siéndolo**. Callar la
pregunta para siempre porque una vez se dijo que no es esconder un dato que aún
no cuadra. Cuesta un toque; el silencio costaría una cuota mal.

---

## 11. Lo que queda declarado, no arreglado

1. **La tolerancia del cuadre del agua sigue en 0.03**, exactamente en el peor
   caso observado para datos realistas (0,029999999999972 sobre 300.000 meses
   simulados), y falla el 45,72 % de las veces en la rama de reparto ajustado.
   No se toca porque las reglas de cálculo son literales. La decisión —subirla a
   0.05, o repartir el último céntimo— es del usuario y está en cola para
   `docs/AUDITORIA-FINAL.md`.
2. **El descarte de una propuesta de corrección no persiste** entre visitas al
   paso 2. Justificado arriba.
3. **La propuesta se calla con dos departamentos sospechosos**, que es lo que
   manda `01` §8, pero **no dice que se ha callado**. El administrador no sabe que
   la app vio algo raro. Está en cola para la auditoría final: enseñar un aviso
   sin propuesta («hay más de una lectura que no cuadra») sería honesto, pero es
   texto nuevo que el mockup no tiene y no lo invento en esta fase.

---

## 12. Bajo qué condición esto estaría equivocado, y cuál sería la señal temprana

**Estaría equivocado si** los datos reales del edificio se parecen menos a los de
ejemplo de lo que supongo: el reparto de julio no entra en la rama ajustada
—`ajustado: false`, `factor: 1`—, así que el camino donde la tolerancia del
cuadre falla el 45,72 % de las veces **no lo recorre ningún test de esta fase**.
Ocho meses de ejemplo son ocho puntos del espacio, no el espacio.

**La señal temprana** sería un mes en que los medidores sumen más de lo que
facturó SEDAPAL. Ahí entra la rama ajustada, y el paso 6 bloqueará la publicación
por un descuadre de céntimos que el administrador no va a saber explicar. Si eso
pasa antes de que se decida la tolerancia, el mes se queda sin publicar.

**Segunda señal**: si la propuesta de corrección no aparece nunca durante varios
meses reales, no significa que no haya erratas — significa que hay que volver a
medir cuántas veces la regla de §8 encuentra exactamente una candidata con datos
de verdad. Lo medido es una sola cosa y conviene no estirarla: **en julio de
2026, cinco de los siete departamentos** (101, 201, 401, 501 y 502) tienen al
menos una transposición de dígitos adyacentes que la regla detecta y corrige
sola; el 301 y el 202, ninguna. Es un mes, no una tasa.
