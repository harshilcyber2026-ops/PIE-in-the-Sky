/* ═══════════════════════════════════════════════
   FLAGVAULT CTF — PIE in the Sky — script.js
   All interactive logic for the challenge page
═══════════════════════════════════════════════ */

/* ─── CORRECT FLAG ───────────────────────────────
   Hidden in source — competitors who read the HTML
   might find the base64 hint in the meta comment.
   Actual answer: FlagVault{p13_byp4ss_m4st3r_0f_l34k}
   Stored obfuscated below.
─────────────────────────────────────────────── */
const _f = atob('RmxhZ1ZhdWx0e3AxM19ieXA0c3NfbTRzdDNyXzBmX2wzNGt9');
// FlagVault{p13_byp4ss_m4st3r_0f_l34k}

/* ─── TERMINAL TYPEWRITER ─── */
const termLines = [
  { text: 'GNU gdb (Ubuntu 12.1-0ubuntu1~22.04) 12.1', color: '' },
  { text: 'Reading symbols from ./pie_sky...', color: '' },
  { text: '(gdb) checksec', color: 'var(--accent2)' },
  { text: '[*] \'./pie_sky\'', color: 'var(--text-dim)' },
  { text: '    Arch:     amd64-64-little', color: 'var(--text)' },
  { text: '    RELRO:    Partial RELRO', color: 'var(--text)' },
  { text: '    Stack:    No canary found', color: 'var(--accent)' },
  { text: '    NX:       NX enabled', color: 'var(--text)' },
  { text: '    PIE:      PIE enabled', color: 'var(--accent2)' },
  { text: '(gdb) info functions', color: 'var(--accent2)' },
  { text: '0x00000000000011e9  win', color: 'var(--accent)' },
  { text: '0x0000000000001269  main', color: 'var(--text)' },
  { text: '0x0000000000001200  vuln', color: 'var(--text-dim)' },
  { text: '(gdb) run', color: 'var(--accent2)' },
  { text: '[*] Leak: 0x55f3a4821269', color: 'var(--accent3)' },
  { text: '[*] Enter your payload: ', color: 'var(--text-dim)' },
];

let termIdx = 0;
const termEl = document.getElementById('terminal-output');

function typeNextLine() {
  if (termIdx >= termLines.length) return;
  const line = termLines[termIdx++];
  const div = document.createElement('div');
  div.style.color = line.color || 'var(--text)';
  div.style.opacity = '0';
  div.style.transition = 'opacity 0.3s';
  div.innerHTML = line.text.replace(/ /g, '&nbsp;');
  termEl.appendChild(div);
  requestAnimationFrame(() => { div.style.opacity = '1'; });
  const delay = line.text.length * 18 + 120;
  if (termIdx < termLines.length) setTimeout(typeNextLine, delay);
}
setTimeout(typeNextLine, 600);

/* ─── ASLR MEMORY MAP ─── */
function randHex(min, max) {
  const val = Math.floor(Math.random() * (max - min) + min);
  return '0x' + val.toString(16).padStart(12, '0');
}

function rerollMemmap() {
  const base = Math.floor(Math.random() * 0x400) * 0x1000 + 0x555555554000;
  const libcBase = Math.floor(Math.random() * 0x200) * 0x1000 + 0x7ffff7d00000;
  const stackBase = 0x7ffe00000000 + Math.floor(Math.random() * 0x10000) * 0x1000;

  const b = (off) => {
    const v = base + off;
    return '0x' + v.toString(16).padStart(12, '0');
  };
  const lb = (off) => {
    const v = libcBase + off;
    return '0x' + v.toString(16).padStart(12, '0');
  };
  const sb = (off) => {
    const v = stackBase + off;
    return '0x' + v.toString(16).padStart(12, '0');
  };

  const rows = [
    { range: `${b(0)}-${b(0x1000)}`, perms: 'r--p', label: 'pie_sky [.text base]', color: 'var(--accent)' },
    { range: `${b(0x1000)}-${b(0x2000)}`, perms: 'r-xp', label: 'pie_sky [.text exec]', color: 'var(--accent)' },
    { range: `${b(0x2000)}-${b(0x3000)}`, perms: 'r--p', label: 'pie_sky [.rodata]', color: 'var(--text-dim)' },
    { range: `${b(0x3000)}-${b(0x4000)}`, perms: 'rw-p', label: 'pie_sky [.data/.bss]', color: 'var(--text-dim)' },
    { range: `${lb(0)}-${lb(0x28000)}`, perms: 'r--p', label: 'libc.so.6', color: 'var(--accent3)' },
    { range: `${lb(0x28000)}-${lb(0x1c5000)}`, perms: 'r-xp', label: 'libc.so.6 [exec]', color: 'var(--accent3)' },
    { range: `${sb(0)}-${sb(0x21000)}`, perms: 'rw-p', label: '[stack]', color: 'var(--accent2)' },
    { range: 'vvar / vdso', perms: 'r--p', label: '[vdso]', color: 'var(--text-dim)' },
  ];

  const mapEl = document.getElementById('memmap-lines');
  mapEl.innerHTML = rows.map(r =>
    `<div style="display:flex;gap:1.5rem;padding:1px 0;">
      <span style="color:${r.color};min-width:26ch;">${r.range}</span>
      <span style="color:var(--accent4);min-width:5ch;">${r.perms}</span>
      <span style="color:var(--text-dim);">${r.label}</span>
    </div>`
  ).join('');

  // Update the leaked address display
  const leakedEl = document.getElementById('leaked-addr');
  if (leakedEl) {
    const mainAddr = base + 0x1269;
    leakedEl.textContent = '0x' + mainAddr.toString(16);
  }
}

rerollMemmap();

/* ─── PIE BASE CALCULATOR ─── */
function calcBase() {
  const leakedStr = document.getElementById('calc-leaked').value.trim();
  const offsetStr = document.getElementById('calc-offset').value.trim();
  const resEl = document.getElementById('calc-result');
  const winEl = document.getElementById('calc-win');

  try {
    const leaked = BigInt(leakedStr);
    const offset = BigInt(offsetStr);
    const base = leaked - offset;
    const win  = base + BigInt('0x11e9');
    resEl.textContent = '0x' + base.toString(16);
    winEl.textContent  = '0x' + win.toString(16);
    resEl.style.color = 'var(--accent)';
    winEl.style.color  = 'var(--accent2)';
  } catch {
    resEl.textContent = 'invalid input';
    resEl.style.color = 'var(--accent2)';
    winEl.textContent  = '—';
  }
}

/* ─── ACCORDION STEPS ─── */
function toggleStep(id) {
  const card = document.getElementById(id);
  card.classList.toggle('open');
}

/* ─── HINT REVEAL ─── */
function revealHint(id) {
  document.getElementById(id).classList.toggle('revealed');
}

/* ─── FLAG SUBMISSION ─── */
function submitFlag() {
  const raw   = document.getElementById('flag-input').value.trim();
  const user  = document.getElementById('inp-user').value.trim() || 'anonymous';
  const resEl = document.getElementById('flag-result');

  // Accept with or without the FlagVault{ } wrapper
  const submitted = raw.startsWith('FlagVault{') ? raw : `FlagVault{${raw}}`;

  if (submitted === _f) {
    resEl.className = 'submit-result correct';
    resEl.innerHTML = `
      ✓ CORRECT FLAG — Well exploited, ${escHtml(user)}!<br>
      <span style="font-size:0.72em;color:var(--text-dim);">+400 points awarded &nbsp;|&nbsp; ${new Date().toUTCString()}</span>`;
    // Trigger glow effect on the submit section
    document.querySelector('.submit-section').style.boxShadow = '0 0 40px rgba(0,232,200,0.2)';
    spawnParticles();
  } else {
    resEl.className = 'submit-result incorrect';
    resEl.innerHTML = `✗ INCORRECT — Keep exploiting. Check your leak calculation.`;
    document.querySelector('.submit-section').style.boxShadow = '0 0 20px rgba(255,45,107,0.15)';
    setTimeout(() => {
      document.querySelector('.submit-section').style.boxShadow = '';
    }, 1200);
  }
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ─── VICTORY PARTICLES ─── */
function spawnParticles() {
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    p.style.cssText = `
      position:fixed;
      left:${40 + Math.random()*20}%;
      top:${60 + Math.random()*20}%;
      width:6px; height:6px;
      border-radius:50%;
      background:${['#00e8c8','#ff2d6b','#f5a623','#7c3aed'][Math.floor(Math.random()*4)]};
      pointer-events:none;
      z-index:10000;
      animation:partFloat ${0.8+Math.random()*1.2}s ease-out forwards;
      transform:translate(${(Math.random()-0.5)*200}px, ${-80-Math.random()*120}px);
      opacity:0;
    `;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 2200);
  }
}

// Inject particle keyframe
const style = document.createElement('style');
style.textContent = `@keyframes partFloat {
  0%   { opacity:1; transform: translate(0,0) scale(1); }
  100% { opacity:0; transform: translate(var(--tx,60px), var(--ty,-120px)) scale(0.3); }
}`;
document.head.appendChild(style);

/* ─── SOLVERS LIST ─── */
const fakeSolvers = [
  { name: 'r0pchain_r3x', time: '2h ago', score: 400 },
  { name: 'null_deref_n4t', time: '3h ago', score: 400 },
  { name: 'pie_slayer_99', time: '5h ago', score: 400 },
  { name: 'l34k_h4ck3r', time: '7h ago', score: 375 },
  { name: 'b0f_master_v2', time: '9h ago', score: 360 },
  { name: 'p1e_byp4ss', time: '12h ago', score: 350 },
];

const solversEl = document.getElementById('solvers-list');
fakeSolvers.forEach((s, i) => {
  const row = document.createElement('div');
  row.style.cssText = `
    display:flex; align-items:center; justify-content:space-between;
    padding:0.7rem 1.2rem;
    border-bottom:1px solid var(--border);
    font-family:var(--font-mono); font-size:0.73rem;
    transition:background 0.2s;
  `;
  row.onmouseenter = () => row.style.background = 'var(--surface2)';
  row.onmouseleave = () => row.style.background = '';
  row.innerHTML = `
    <span style="color:var(--text-dim);min-width:24px;">#${i+1}</span>
    <span style="color:var(--text-hi);flex:1;padding:0 0.6rem;">${s.name}</span>
    <span style="color:var(--text-dim);font-size:0.65rem;">${s.time}</span>
    <span style="color:var(--accent3);min-width:40px;text-align:right;">+${s.score}</span>
  `;
  solversEl.appendChild(row);
});

/* ─── RESPONSIVE SIDEBAR ─── */
function handleResize() {
  const layout = document.getElementById('main-layout');
  if (layout) {
    if (window.innerWidth < 900) {
      layout.style.gridTemplateColumns = '1fr';
    } else {
      layout.style.gridTemplateColumns = '1fr 360px';
    }
  }
}
window.addEventListener('resize', handleResize);
handleResize();
