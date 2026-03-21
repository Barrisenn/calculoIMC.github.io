// ═══════════════════════════════════════════════
//  IMC Pro — Health Intelligence
//  Gauge · Chart · AI Coach (Claude) · PWA · History
// ═══════════════════════════════════════════════

// ─── Constants ───────────────────────────────
const CLASSIF = [
  { max: 18.5, label: 'Abaixo do peso',    classe: 'baixo', cor: '#60a5fa' },
  { max: 25,   label: 'Peso ideal',        classe: 'ideal', cor: '#34d399' },
  { max: 30,   label: 'Sobrepeso',         classe: 'leve',  cor: '#fbbf24' },
  { max: 35,   label: 'Obesidade Grau I',  classe: 'ob1',   cor: '#f97316' },
  { max: 40,   label: 'Obesidade Grau II', classe: 'ob2',   cor: '#ef4444' },
  { max: Infinity, label: 'Obesidade Grau III', classe: 'ob3', cor: '#dc2626' },
];

const GAUGE_SEGMENTS = [
  { from: 10,   to: 18.5, cor: '#60a5fa' },
  { from: 18.5, to: 25,   cor: '#34d399' },
  { from: 25,   to: 30,   cor: '#fbbf24' },
  { from: 30,   to: 35,   cor: '#f97316' },
  { from: 35,   to: 40,   cor: '#ef4444' },
  { from: 40,   to: 45,   cor: '#dc2626' },
];

const IMC_MIN = 10, IMC_MAX = 45;

// ─── State ───────────────────────────────────
const state = {
  sexo: 'm',
  lastResult: null,
};

// ─── Utilities ───────────────────────────────
function $(id) { return document.getElementById(id); }

function classificar(imc) {
  return CLASSIF.find(c => imc < c.max);
}

// ─── Calculations (Mifflin–St Jeor) ─────────
function calcIMC(peso, alturaCm) {
  const h = alturaCm / 100;
  return peso / (h * h);
}

function calcBMR(peso, alturaCm, idade, sexo) {
  const base = 10 * peso + 6.25 * alturaCm - 5 * idade;
  return sexo === 'm' ? base + 5 : base - 161;
}

function calcGorduraCorporal(imc, idade, sexo) {
  // Deurenberg formula
  const factor = sexo === 'm' ? 16.2 : 5.4;
  return (1.20 * imc) + (0.23 * idade) - factor;
}

function calcPesoIdeal(alturaCm) {
  const h2 = Math.pow(alturaCm / 100, 2);
  return { min: (18.5 * h2).toFixed(1), max: (24.9 * h2).toFixed(1) };
}

function calcAgua(peso) {
  return Math.round(peso * 35);
}

// ─── Canvas: Setup ───────────────────────────
function setupCanvas(canvas, cssW, cssH) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width  = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return ctx;
}

// ─── Canvas: Gauge ───────────────────────────
// The arc spans from π (left) to 2π (right) clockwise → goes through the top.
// angle(imc) = π + ((imc - IMC_MIN) / (IMC_MAX - IMC_MIN)) * π
function imcToAngle(imc) {
  const clamped = Math.min(Math.max(imc, IMC_MIN), IMC_MAX);
  return Math.PI + ((clamped - IMC_MIN) / (IMC_MAX - IMC_MIN)) * Math.PI;
}

function drawGauge(ctx, imc, cssW, cssH) {
  const cx = cssW / 2;
  const cy = cssH - 10;
  const r  = Math.min(cx, cy) - 14;
  const lw = 16;

  ctx.clearRect(0, 0, cssW, cssH);

  // Background track
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI, false);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = lw + 2;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Colored segments
  GAUGE_SEGMENTS.forEach(seg => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, imcToAngle(seg.from), imcToAngle(seg.to), false);
    ctx.strokeStyle = seg.cor;
    ctx.lineWidth = lw;
    ctx.lineCap = 'butt';
    ctx.stroke();
  });

  // Needle shadow
  if (imc !== null) {
    const a = imcToAngle(imc);
    const nl = r - 12;
    const nx = cx + nl * Math.cos(a);
    const ny = cy + nl * Math.sin(a);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx + 2, ny + 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Needle
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Hub outer
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Hub inner
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
  }

  // IMC boundary labels
  const labels = [18.5, 25, 30, 35];
  const isDark = document.documentElement.dataset.theme !== 'light';
  ctx.font = `bold ${Math.round(cssW * 0.038)}px system-ui`;
  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  labels.forEach(val => {
    const a = imcToAngle(val);
    const lr = r + 18;
    ctx.fillText(val, cx + lr * Math.cos(a), cy + lr * Math.sin(a));
  });
}

// Animated gauge sweep
function animarGauge(targetIMC) {
  const canvas = $('gaugeCanvas');
  const cssW = 240, cssH = 130;
  const ctx = setupCanvas(canvas, cssW, cssH);

  const startTime = performance.now();
  const duration  = 1100;
  const startIMC  = IMC_MIN;

  function frame(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    const currentIMC = startIMC + (targetIMC - startIMC) * eased;

    drawGauge(ctx, currentIMC, cssW, cssH);
    $('imcValor').textContent = (eased < 0.98 ? currentIMC : targetIMC).toFixed(1);

    if (t < 1) requestAnimationFrame(frame);
    else {
      drawGauge(ctx, targetIMC, cssW, cssH);
      $('imcValor').textContent = targetIMC.toFixed(2);
    }
  }

  requestAnimationFrame(frame);
}

// ─── Canvas: History Chart ───────────────────
function drawChart(historico) {
  const canvas = $('chartCanvas');
  if (!canvas || historico.length < 2) {
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    return;
  }

  const wrapper = canvas.parentElement;
  const cssW = wrapper.clientWidth || 400;
  const cssH = 200;
  const ctx  = setupCanvas(canvas, cssW, cssH);

  const pad = { top: 16, right: 16, bottom: 36, left: 38 };
  const W = cssW - pad.left - pad.right;
  const H = cssH - pad.top  - pad.bottom;
  const IMC_LO = 10, IMC_HI = 45;

  const toX = i => pad.left + (i / (historico.length - 1)) * W;
  const toY = v => pad.top  + H - ((v - IMC_LO) / (IMC_HI - IMC_LO)) * H;

  const isDark = document.documentElement.dataset.theme !== 'light';

  ctx.clearRect(0, 0, cssW, cssH);

  // Colored bands
  const bands = [
    { lo: 10,   hi: 18.5, cor: 'rgba(96,165,250,0.10)'  },
    { lo: 18.5, hi: 25,   cor: 'rgba(52,211,153,0.10)'  },
    { lo: 25,   hi: 30,   cor: 'rgba(251,191,36,0.10)'  },
    { lo: 30,   hi: 35,   cor: 'rgba(249,115,22,0.10)'  },
    { lo: 35,   hi: 40,   cor: 'rgba(239,68,68,0.10)'   },
    { lo: 40,   hi: 45,   cor: 'rgba(153,27,27,0.12)'   },
  ];

  bands.forEach(b => {
    const y1 = toY(Math.min(b.hi, IMC_HI));
    const y2 = toY(Math.max(b.lo, IMC_LO));
    ctx.fillStyle = b.cor;
    ctx.fillRect(pad.left, y1, W, y2 - y1);
  });

  // Reference lines
  const refLines = [18.5, 25, 30];
  const lineAlpha = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
  const textAlpha = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
  refLines.forEach(val => {
    const y = toY(val);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + W, y);
    ctx.strokeStyle = lineAlpha;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = textAlpha;
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(val, pad.left - 4, y);
  });

  // Gradient fill under line
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + H);
  grad.addColorStop(0, 'rgba(102,126,234,0.3)');
  grad.addColorStop(1, 'rgba(102,126,234,0)');

  ctx.beginPath();
  historico.forEach((item, i) => {
    const x = toX(i), y = toY(parseFloat(item.imc));
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(toX(historico.length - 1), pad.top + H);
  ctx.lineTo(toX(0), pad.top + H);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  historico.forEach((item, i) => {
    const x = toX(i), y = toY(parseFloat(item.imc));
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#818cf8';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Points
  const COR_MAP = { baixo: '#60a5fa', ideal: '#34d399', leve: '#fbbf24', ob1: '#f97316', ob2: '#ef4444', ob3: '#dc2626' };
  historico.forEach((item, i) => {
    const x = toX(i), y = toY(parseFloat(item.imc));
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = COR_MAP[item.classe] || '#818cf8';
    ctx.fill();
    ctx.strokeStyle = isDark ? '#1e293b' : '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // X-axis date labels
  const step = Math.max(1, Math.floor(historico.length / 5));
  ctx.fillStyle = textAlpha;
  ctx.font = '9px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  historico.forEach((item, i) => {
    if (i % step === 0 || i === historico.length - 1) {
      ctx.fillText(item.data.split(',')[0], toX(i), cssH - pad.bottom + 6);
    }
  });
}

// ─── History ─────────────────────────────────
function carregarHistorico() {
  try { return JSON.parse(localStorage.getItem('imcHistorico') || '[]'); }
  catch { return []; }
}

function salvarHistorico(h) {
  localStorage.setItem('imcHistorico', JSON.stringify(h));
}

function adicionarAoHistorico(item) {
  const h = carregarHistorico();
  h.push(item);
  salvarHistorico(h);
}

function renderHistorico() {
  const h = carregarHistorico();
  const card  = $('cardHistorico');
  const lista = $('listaHistorico');

  if (h.length === 0) {
    card.classList.add('oculto');
    return;
  }

  card.classList.remove('oculto');
  lista.innerHTML = '';

  h.slice().reverse().forEach(item => {
    const li = document.createElement('li');
    li.className = `hist-${item.classe}`;
    li.textContent = `${item.data} — Peso: ${item.peso} kg | Altura: ${item.altura} cm | IMC: ${item.imc} (${item.label})`;
    lista.appendChild(li);
  });

  drawChart(h);
}

// ─── Validation ──────────────────────────────
function validar(peso, alturaCm, idade) {
  let ok = true;
  const set = (id, msg) => { $(id).textContent = msg; if (msg) ok = false; };

  set('erroPeso',   (!peso || peso <= 0 || peso > 500)       ? 'Informe um peso válido (1–500 kg).' : '');
  set('erroAltura', (!alturaCm || alturaCm < 50 || alturaCm > 300) ? 'Informe uma altura válida (50–300 cm).' : '');
  set('erroIdade',  (!idade || idade < 2 || idade > 120)     ? 'Informe uma idade válida (2–120 anos).' : '');

  return ok;
}

// ─── Stats cards ─────────────────────────────
function renderStats(dados) {
  const { bmr, tdee, pesoIdeal, agua, gordura, imc } = dados;
  const grid = $('statsGrid');

  const stats = [
    { icon: '🔥', label: 'Metabolismo Basal', value: Math.round(bmr).toLocaleString('pt-BR'), unit: 'kcal/dia' },
    { icon: '⚡', label: 'Gasto Sedentário',  value: Math.round(tdee).toLocaleString('pt-BR'), unit: 'kcal/dia' },
    { icon: '🎯', label: 'Peso Ideal',        value: `${pesoIdeal.min}–${pesoIdeal.max}`, unit: 'kg' },
    { icon: '💧', label: 'Água/dia',          value: (agua / 1000).toFixed(1), unit: 'litros' },
    { icon: '📊', label: 'Gordura Corp.*',    value: gordura > 0 ? gordura.toFixed(1) : '—', unit: gordura > 0 ? '%' : '' },
    { icon: '🏷️', label: 'Seu IMC',           value: parseFloat(imc).toFixed(2), unit: '' },
  ];

  grid.innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="stat-icon">${s.icon}</div>
      <div class="stat-label">${s.label}</div>
      <div class="stat-value">${s.value} <span class="stat-unit">${s.unit}</span></div>
    </div>
  `).join('');
}

// ─── Main calculation ─────────────────────────
function calcular() {
  const peso     = parseFloat($('peso').value);
  const alturaCm = parseFloat($('altura').value);
  const idade    = parseFloat($('idade').value);
  const sexo     = state.sexo;

  if (!validar(peso, alturaCm, idade)) return;

  const imc       = calcIMC(peso, alturaCm);
  const classif   = classificar(imc);
  const bmr       = calcBMR(peso, alturaCm, idade, sexo);
  const tdee      = bmr * 1.2;
  const pesoIdeal = calcPesoIdeal(alturaCm);
  const agua      = calcAgua(peso);
  const gordura   = calcGorduraCorporal(imc, idade, sexo);

  state.lastResult = { peso, alturaCm, idade, sexo, imc: imc.toFixed(2), classe: classif.classe, label: classif.label, bmr, tdee, pesoIdeal, agua, gordura };

  // Save to history
  adicionarAoHistorico({
    data: new Date().toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' }),
    peso, altura: alturaCm, imc: imc.toFixed(2), classe: classif.classe, label: classif.label,
  });

  // Show result card
  const card = $('cardResultado');
  card.classList.remove('oculto');

  // Badge
  const badge = $('imcBadge');
  badge.textContent = classif.label;
  badge.className = `badge badge-${classif.classe}`;

  // Faixa
  const faixas = ['< 18,5', '18,5 – 24,9', '25,0 – 29,9', '30,0 – 34,9', '35,0 – 39,9', '≥ 40,0'];
  const idx = CLASSIF.indexOf(classif);
  $('imcFaixa').textContent = `Faixa: ${faixas[idx] ?? ''}`;

  // Stats
  renderStats({ bmr, tdee, pesoIdeal, agua, gordura, imc: imc.toFixed(2) });

  // Animate gauge
  animarGauge(imc);

  // Refresh history
  renderHistorico();

  // Scroll to result
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── AI Coach (Claude Streaming) ─────────────
function buildPrompt(r) {
  return `Você é um coach de saúde amigável, empático e motivador. Responda SOMENTE em português brasileiro.

Perfil do usuário:
- Idade: ${r.idade} anos | Sexo: ${r.sexo === 'm' ? 'Masculino' : 'Feminino'}
- Peso: ${r.peso} kg | Altura: ${r.alturaCm} cm
- IMC: ${r.imc} — ${r.label}
- Metabolismo basal: ${Math.round(r.bmr)} kcal/dia
- Gordura corporal estimada: ${r.gordura > 0 ? r.gordura.toFixed(1) + '%' : 'não calculada'}
- Faixa de peso saudável: ${r.pesoIdeal.min}–${r.pesoIdeal.max} kg

Forneça uma resposta estruturada com:
1. **Avaliação** – Uma análise amigável e honesta do estado atual (2-3 frases)
2. **3 Dicas Práticas** – Personalizadas para o perfil acima, concretas e acionáveis
3. **Meta de 30 dias** – Uma meta realista e motivadora
4. **Lembrete** – Uma frase curta recomendando consulta profissional

Use linguagem calorosa, informal mas profissional. Máximo 280 palavras.`;
}

async function consultarIA() {
  const apiKey = localStorage.getItem('imcApiKey');
  if (!apiKey || !state.lastResult) return;

  const iaConfig   = $('iaConfig');
  const iaResposta = $('iaResposta');
  const typing     = $('typingIndicator');
  const iaTexto    = $('iaTexto');
  const iaActions  = $('iaActions');

  iaConfig.classList.add('oculto');
  iaResposta.classList.remove('oculto');
  typing.classList.remove('oculto');
  iaTexto.textContent = '';
  iaActions.classList.add('oculto');

  $('cardIA').scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 800,
        stream: true,
        messages: [{ role: 'user', content: buildPrompt(state.lastResult) }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Erro ${response.status}`);
    }

    typing.classList.add('oculto');

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') break;
        try {
          const parsed = JSON.parse(raw);
          const text = parsed.choices?.[0]?.delta?.content;
          if (text) iaTexto.textContent += text;
        } catch { /* ignore parse errors */ }
      }
    }

    // Format final text
    iaTexto.innerHTML = formatIATexto(iaTexto.textContent);
    iaActions.classList.remove('oculto');

  } catch (err) {
    typing.classList.add('oculto');
    iaTexto.innerHTML = `<span style="color:#f87171">⚠️ ${err.message}</span><br><span class="text-muted">Verifique sua chave de API e tente novamente.</span>`;
    iaActions.classList.remove('oculto');
  }
}

function formatIATexto(text) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

// ─── Theme ───────────────────────────────────
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('btnTheme').textContent = theme === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('imcTema', theme);

  // Redraw chart with new theme colors
  const h = carregarHistorico();
  if (h.length >= 2) drawChart(h);
}

// ─── Event listeners ─────────────────────────
$('btnCalcular').addEventListener('click', calcular);

// Enter key triggers calculation
['peso', 'altura', 'idade'].forEach(id => {
  $(id).addEventListener('keydown', e => { if (e.key === 'Enter') calcular(); });
});

// Segmented control (gender)
$('segSexo').addEventListener('click', e => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;
  document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.sexo = btn.dataset.value;
});

// Theme toggle
$('btnTheme').addEventListener('click', () => {
  const current = document.documentElement.dataset.theme;
  setTheme(current === 'dark' ? 'light' : 'dark');
});

// AI: save key and consult
$('btnSalvarKey').addEventListener('click', () => {
  const key = $('apiKey').value.trim();
  if (!key.startsWith('gsk_')) {
    $('apiKey').style.borderColor = '#ef4444';
    setTimeout(() => ($('apiKey').style.borderColor = ''), 2000);
    return;
  }
  localStorage.setItem('imcApiKey', key);
  consultarIA();
});

// AI: open panel button
$('btnIA').addEventListener('click', () => {
  const cardIA = $('cardIA');
  cardIA.classList.remove('oculto');
  const existingKey = localStorage.getItem('imcApiKey');

  if (existingKey) {
    $('iaConfig').classList.add('oculto');
    $('iaResposta').classList.remove('oculto');
    // Consult directly if we have a fresh result and haven't already responded
    if ($('iaTexto').textContent === '') consultarIA();
  }

  cardIA.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// AI: new consultation
$('btnNovaConsulta').addEventListener('click', () => {
  $('iaTexto').textContent = '';
  $('iaActions').classList.add('oculto');
  consultarIA();
});

// AI: change key
$('btnTrocarKey').addEventListener('click', () => {
  localStorage.removeItem('imcApiKey');
  $('iaConfig').classList.remove('oculto');
  $('iaResposta').classList.add('oculto');
  $('iaTexto').textContent = '';
  $('apiKey').value = '';
});

// Clear history
$('btnLimpar').addEventListener('click', () => {
  localStorage.removeItem('imcHistorico');
  renderHistorico();
});

// Resize: redraw chart
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const h = carregarHistorico();
    if (h.length >= 2) drawChart(h);
  }, 150);
});

// ─── PWA Service Worker ───────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// ─── Init ────────────────────────────────────
(function init() {
  // Restore theme
  const savedTheme = localStorage.getItem('imcTema') || 'dark';
  setTheme(savedTheme);

  // Restore last gender selection
  const savedSexo = localStorage.getItem('imcSexo') || 'm';
  state.sexo = savedSexo;
  document.querySelectorAll('.seg-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.value === savedSexo);
  });

  // Save gender on change
  $('segSexo').addEventListener('click', e => {
    const btn = e.target.closest('.seg-btn');
    if (btn) localStorage.setItem('imcSexo', btn.dataset.value);
  });

  // Render existing history
  renderHistorico();

  // Draw empty gauge
  const canvas = $('gaugeCanvas');
  const ctx = setupCanvas(canvas, 240, 130);
  drawGauge(ctx, null, 240, 130);
})();
