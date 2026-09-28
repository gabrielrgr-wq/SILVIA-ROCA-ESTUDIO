/* ==========================================================
   Dashboard de estudio — lógica de la aplicación
   Sin dependencias. El progreso se guarda en localStorage.
   ========================================================== */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const LS_KEY = "dash-dependencia-v1";
  const CIRC = 2 * Math.PI * 52; // circunferencia del anillo
  const MIX_SIZE = 20;

  /* ---------- Utilidades ---------- */
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const topicById = (id) => TOPICS.find((t) => t.id === id);
  const totalQuestions = TOPICS.reduce((n, t) => n + t.qs.length, 0);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- Estado persistente ---------- */
  const defaultState = () => ({ theme: null, topics: {}, wrong: [], answered: 0, correct: 0, bestStreak: 0 });
  let state = defaultState();
  try { state = Object.assign(defaultState(), JSON.parse(localStorage.getItem(LS_KEY) || "{}")); } catch (e) { /* ignorar */ }
  const save = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* ignorar */ } };

  /* ---------- Tema claro / oscuro ---------- */
  const applyTheme = () => {
    const dark = state.theme ? state.theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    $("#themeBtn").textContent = dark ? "☀️" : "🌙";
  };
  $("#themeBtn").addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme === "dark";
    state.theme = dark ? "light" : "dark";
    save(); applyTheme();
  });

  /* ---------- Vistas ---------- */
  const show = (id) => {
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ---------- Modal de confirmación ---------- */
  const confirmBox = (title, text) => new Promise((res) => {
    const m = $("#modal");
    $("#modalTitle").textContent = title;
    $("#modalText").textContent = text;
    m.hidden = false;
    const done = (v) => { m.hidden = true; $("#modalYes").onclick = $("#modalNo").onclick = null; res(v); };
    $("#modalYes").onclick = () => done(true);
    $("#modalNo").onclick = () => done(false);
  });

  /* ==========================================================
     INICIO
     ========================================================== */
  const setRing = (el, value) => { el.style.strokeDasharray = CIRC; el.style.strokeDashoffset = CIRC * (1 - value / 100); };

  function renderHome() {
    // estadísticas globales
    const acc = pct(state.correct, state.answered);
    $("#globalPct").textContent = acc + "%";
    requestAnimationFrame(() => setRing($("#globalRing"), acc));
    $("#stTotal").textContent = totalQuestions;
    $("#stAnswered").textContent = state.answered;
    const mastered = TOPICS.filter((t) => (state.topics[t.id]?.best || 0) >= 80).length;
    $("#stMastered").textContent = `${mastered}/${TOPICS.length}`;
    $("#stStreak").textContent = state.bestStreak;
    $("#wrongCount").textContent = state.wrong.length;
    $("#reviewBtn").disabled = state.wrong.length === 0;

    // tarjetas de temas
    const grid = $("#topicGrid");
    grid.innerHTML = "";
    TOPICS.forEach((t) => {
      const p = state.topics[t.id] || {};
      const best = p.best || 0;
      const card = document.createElement("button");
      card.className = "card";
      card.style.setProperty("--accent", t.accent);
      card.innerHTML = `
        <div class="card-img">
          <img src="${t.images[0]}" alt="${esc(t.title)}" loading="lazy">
          <span class="card-count">${t.qs.length} preguntas</span>
          <span class="card-icon">${t.icon}</span>
        </div>
        <div class="card-body">
          <h3>${esc(t.title)}</h3>
          <p>${esc(t.desc)}</p>
          <div class="mini-progress"><i style="width:${best}%"></i></div>
          <div class="card-foot">
            <span>${p.attempts ? `Mejor: <b>${best}%</b> · ${p.attempts} intento${p.attempts > 1 ? "s" : ""}` : "Sin intentos aún"}</span>
            <span class="go">${p.attempts ? "Repasar →" : "Comenzar →"}</span>
          </div>
        </div>`;
      card.addEventListener("click", () => startQuiz({ mode: "topic", topicId: t.id }));
      grid.appendChild(card);
    });

    // panel de progreso
    const panel = $("#progressPanel");
    panel.innerHTML = `<div class="legend"><span><i></i>Mejor resultado</span><span><i class="l"></i>Último intento</span></div>` +
      TOPICS.map((t) => {
        const p = state.topics[t.id] || {};
        return `<div class="prow" style="--accent:${t.accent}">
          <div class="name"><span>${t.icon}</span>${esc(t.title)}</div>
          <div class="pbar"><div class="last" style="width:${p.last || 0}%"></div><div class="best" style="width:${p.best || 0}%"></div></div>
          <div class="val">${p.attempts ? (p.best || 0) + "%" : "—"}</div>
        </div>`;
      }).join("");
  }

  /* ==========================================================
     CUESTIONARIO
     ========================================================== */
  let session = null;

  const buildQuestion = (topic, idx) => {
    const q = topic.qs[idx];
    return {
      key: `${topic.id}:${idx}`,
      topicId: topic.id,
      q: q.q,
      e: q.e,
      opts: shuffle(q.o.map((t, i) => ({ t, c: i === 0 }))),
    };
  };

  function startQuiz({ mode, topicId, keys }) {
    let list = [];
    let title = "";
    let accent = "#4f46e5";

    if (mode === "topic") {
      const t = topicById(topicId);
      list = shuffle(t.qs.map((_, i) => buildQuestion(t, i)));
      title = `${t.icon} ${t.title}`;
      accent = t.accent;
    } else if (mode === "mix") {
      const all = TOPICS.flatMap((t) => t.qs.map((_, i) => buildQuestion(t, i)));
      list = shuffle(all).slice(0, MIX_SIZE);
      title = "🎲 Simulacro mixto";
    } else if (mode === "review" || mode === "keys") {
      const all = TOPICS.flatMap((t) => t.qs.map((_, i) => buildQuestion(t, i)));
      const wanted = new Set(keys || state.wrong);
      list = shuffle(all.filter((x) => wanted.has(x.key)));
      title = mode === "review" ? "🔁 Repaso de errores" : "🎯 Preguntas falladas";
    }
    if (!list.length) return;

    session = { mode, topicId, title, accent, list, i: 0, score: 0, streak: 0, best: 0, answers: [], locked: false, start: Date.now() };
    document.documentElement.style.setProperty("--accent", accent);
    $("#quizTitle").textContent = title;
    show("quiz");
    renderQuestion();
  }

  function renderQuestion() {
    const s = session;
    const item = s.list[s.i];
    const topic = topicById(item.topicId);
    s.locked = false;

    $("#qBar").style.width = (s.i / s.list.length) * 100 + "%";
    $("#qCount").textContent = `Pregunta ${s.i + 1} de ${s.list.length}`;
    $("#qScore").textContent = s.score;
    $("#qStreak").textContent = s.streak;
    $("#qTag").textContent = `${topic.icon} ${topic.title}`;
    $("#qTag").style.setProperty("--accent", topic.accent);
    document.documentElement.style.setProperty("--accent", topic.accent);
    $("#qText").textContent = item.q;

    // imagen acorde al tema (rota cada 2 preguntas)
    const imgs = topic.images;
    const src = imgs[Math.floor(s.i / 2) % imgs.length];
    const img = $("#qImg");
    img.style.opacity = 0;
    img.onload = () => { img.style.opacity = 1; };
    img.src = src;
    img.alt = topic.title;
    if (img.complete) img.style.opacity = 1;
    $("#qCap").textContent = `${topic.icon} ${topic.title} · ${topic.pdf}`;

    const box = $("#qOptions");
    box.innerHTML = "";
    item.opts.forEach((o, i) => {
      const b = document.createElement("button");
      b.className = "opt";
      b.innerHTML = `<span class="key">${"ABCD"[i]}</span><span>${esc(o.t)}</span>`;
      b.addEventListener("click", () => answer(i));
      box.appendChild(b);
    });

    const fb = $("#qFeedback");
    fb.className = "feedback";
    fb.innerHTML = "";
    const next = $("#nextBtn");
    next.disabled = true;
    next.textContent = s.i === s.list.length - 1 ? "Ver resultados 🏁" : "Siguiente →";
  }

  function answer(idx) {
    const s = session;
    if (!s || s.locked) return;
    s.locked = true;
    const item = s.list[s.i];
    const ok = item.opts[idx].c;

    document.querySelectorAll("#qOptions .opt").forEach((b, i) => {
      b.disabled = true;
      if (item.opts[i].c) b.classList.add("correct");
      else if (i === idx) b.classList.add("wrong");
    });

    if (ok) { s.score++; s.streak++; s.best = Math.max(s.best, s.streak); }
    else s.streak = 0;
    s.answers.push({ item, chosen: idx, ok });

    // progreso global
    state.answered++;
    if (ok) {
      state.correct++;
      state.wrong = state.wrong.filter((k) => k !== item.key);
    } else if (!state.wrong.includes(item.key)) state.wrong.push(item.key);
    state.bestStreak = Math.max(state.bestStreak, s.best);
    save();

    $("#qScore").textContent = s.score;
    $("#qStreak").textContent = s.streak;
    const fb = $("#qFeedback");
    fb.className = `feedback show ${ok ? "ok" : "bad"}`;
    fb.innerHTML = `<b>${ok ? "¡Correcto! 🎉" : "Casi… 🤔"}</b>${esc(item.e)}`;
    const next = $("#nextBtn");
    next.disabled = false;
    next.focus({ preventScroll: true });
    $("#qBar").style.width = ((s.i + 1) / s.list.length) * 100 + "%";
  }

  function next() {
    const s = session;
    if (!s || !s.locked) return;
    if (s.i < s.list.length - 1) { s.i++; renderQuestion(); }
    else finish();
  }
  $("#nextBtn").addEventListener("click", next);

  $("#exitBtn").addEventListener("click", async () => {
    if (await confirmBox("¿Salir del cuestionario?", "Se perderá el avance de este intento (las respuestas ya dadas quedan registradas en tu estadística).")) {
      session = null; renderHome(); show("home");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (!$("#quiz").classList.contains("active") || !session || !$("#modal").hidden) return;
    if (/^[1-4]$/.test(e.key)) { answer(+e.key - 1); }
    else if ((e.key === "Enter" || e.key === "ArrowRight") && session.locked) { e.preventDefault(); next(); }
  });

  /* ==========================================================
     RESULTADOS
     ========================================================== */
  function finish() {
    const s = session;
    const total = s.list.length;
    const p = pct(s.score, total);
    const secs = Math.round((Date.now() - s.start) / 1000);

    if (s.mode === "topic") {
      const prev = state.topics[s.topicId] || {};
      state.topics[s.topicId] = { best: Math.max(prev.best || 0, p), last: p, attempts: (prev.attempts || 0) + 1 };
      save();
    }

    const msgs = p === 100 ? ["¡Perfecto! 🏆", "Dominás este tema por completo. ¡Excelente trabajo!"]
      : p >= 80 ? ["¡Muy bien! 🎉", "Tenés un gran manejo del tema. Repasá los detalles que fallaste."]
      : p >= 60 ? ["Buen camino 💪", "Vas bien, pero conviene repasar algunos conceptos antes del examen."]
      : ["A seguir practicando 📖", "No te desanimes: releé el material y probá de nuevo con las falladas."];

    $("#resTopic").textContent = s.title;
    $("#resTitle").textContent = msgs[0];
    $("#resMsg").textContent = `${msgs[1]} Tiempo: ${Math.floor(secs / 60)} min ${secs % 60} s · Mejor racha: ${s.best}.`;
    $("#resPct").textContent = p + "%";
    $("#resFrac").textContent = `${s.score} de ${total} correctas`;
    const ring = $("#resRing");
    ring.style.strokeDasharray = CIRC; ring.style.strokeDashoffset = CIRC;
    ring.style.stroke = p >= 80 ? "var(--ok)" : p >= 60 ? "#f59e0b" : "var(--bad)";
    show("results");
    requestAnimationFrame(() => setTimeout(() => setRing(ring, p), 60));
    if (p >= 80) confetti();

    const wrong = s.answers.filter((a) => !a.ok);
    $("#retryWrongBtn").style.display = wrong.length ? "" : "none";
    $("#reviewSub").textContent = wrong.length
      ? `Tenés ${wrong.length} respuesta${wrong.length > 1 ? "s" : ""} para repasar (primero) y ${s.score} correctas.`
      : "¡Todas correctas! Estas son tus respuestas.";

    const ordered = [...wrong, ...s.answers.filter((a) => a.ok)];
    $("#reviewList").innerHTML = ordered.map((a) => {
      const right = a.item.opts.find((o) => o.c).t;
      return `<article class="rev ${a.ok ? "" : "bad"}">
        <h4>${esc(a.item.q)}</h4>
        ${a.ok ? "" : `<p class="r-bad">✖ Tu respuesta: ${esc(a.item.opts[a.chosen].t)}</p>`}
        <p class="r-ok">✔ Correcta: ${esc(right)}</p>
        <p class="r-exp">💡 ${esc(a.item.e)}</p>
      </article>`;
    }).join("");

    s.finished = true;
  }

  function confetti() {
    const em = ["🎉", "✨", "🎊", "⭐", "💙", "💚"];
    for (let i = 0; i < 40; i++) {
      const c = document.createElement("span");
      c.className = "confetti";
      c.textContent = em[i % em.length];
      c.style.left = Math.random() * 100 + "vw";
      c.style.animationDuration = 2.2 + Math.random() * 2.2 + "s";
      c.style.animationDelay = Math.random() * 0.6 + "s";
      c.style.fontSize = 16 + Math.random() * 18 + "px";
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 5500);
    }
  }

  $("#retryBtn").addEventListener("click", () => {
    const s = session;
    startQuiz({ mode: s.mode === "keys" ? "keys" : s.mode, topicId: s.topicId, keys: s.list.map((x) => x.key) });
  });
  $("#retryWrongBtn").addEventListener("click", () => {
    const keys = session.answers.filter((a) => !a.ok).map((a) => a.item.key);
    startQuiz({ mode: "keys", keys });
  });
  $("#homeBtn").addEventListener("click", () => { session = null; renderHome(); show("home"); });
  $("#brand").addEventListener("click", (e) => { e.preventDefault(); if (!session || session.finished) { session = null; renderHome(); show("home"); } });

  /* ---------- Botones del inicio ---------- */
  $("#mixBtn").addEventListener("click", () => startQuiz({ mode: "mix" }));
  $("#reviewBtn").addEventListener("click", () => startQuiz({ mode: "review" }));
  $("#resetBtn").addEventListener("click", async () => {
    if (await confirmBox("¿Reiniciar todo el progreso?", "Se borrarán resultados, estadísticas y preguntas falladas guardadas en este navegador.")) {
      const theme = state.theme;
      state = defaultState(); state.theme = theme;
      save(); renderHome(); show("home");
    }
  });

  /* ---------- Inicio ---------- */
  applyTheme();
  renderHome();
})();
