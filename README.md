# 🩺 Dashboard de Estudio · Atención a la Dependencia

Dashboard interactivo de preguntas (más de 100) elaborado a partir de 7 presentaciones en PDF del curso.
Sitio 100 % estático (HTML + CSS + JavaScript): no necesita servidor ni instalación.

## Temas y preguntas

| # | Tema | Fuente | Preguntas |
|---|------|--------|-----------|
| 1 | Nutrición y cuidado del adulto mayor | CLASE_1_PDF | 14 |
| 2 | Evaluación nutricional, dependencia y disfagia | CLASE_2_PDF | 15 |
| 3 | Alimentación del paciente hospitalizado | CLASE_3_PDF | 14 |
| 4 | Trastorno del Espectro Autista (TEA) y alimentación | CLASE_3_PDF | 14 |
| 5 | Prevención de caídas y fracturas | Caidas | 15 |
| 6 | Úlceras por presión (UPP) | UPP | 15 |
| 7 | Control de signos vitales | Signos_vitales_snic | 15 |
| 8 | Virus, bacterias y parásitos | Virus_bacterias_parasitos | 16 |

## Funciones

- Cuestionario por tema con opciones mezcladas y explicación en cada respuesta.
- Simulacro mixto de 20 preguntas y repaso automático de errores.
- Racha, resultados con revisión y reintento solo de las falladas.
- Progreso guardado en el navegador (localStorage) y estadísticas por tema.
- Modo claro/oscuro, diseño responsive y atajos de teclado (1–4 y Enter).
- Imágenes tomadas de las propias presentaciones.

## Publicar en GitHub Pages

1. Creá un repositorio nuevo en GitHub y subí **el contenido** de esta carpeta (no la carpeta contenedora).
2. En el repositorio: **Settings → Pages**.
3. En *Build and deployment* elegí **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
4. Guardá. En un par de minutos estará disponible en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.

## Probar en local

Abrí `index.html` en el navegador, o levantá un servidor simple:

```bash
python3 -m http.server 8000
# y visitá http://localhost:8000
```

## Editar o agregar preguntas

Todo el banco está en `js/data.js`. Cada pregunta tiene esta forma (la respuesta correcta va **siempre primera**; la app mezcla las opciones):

```js
{ q: "Pregunta",
  o: ["Correcta", "Incorrecta 1", "Incorrecta 2", "Incorrecta 3"],
  e: "Explicación que se muestra al responder." }
```

## Estructura

```
index.html
css/styles.css
js/data.js      ← temas y preguntas
js/app.js       ← lógica
assets/         ← imágenes extraídas de los PDF
.nojekyll
```

> Material de estudio. Ante dudas clínicas, consultá siempre al equipo de salud.
