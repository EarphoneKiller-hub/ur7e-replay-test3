// UR7e replay test3 page: synced videos, 3D view of the data-collection arm (V7) and the UR7e, charts.
// Data: window.SCENE (data/scene.js) and window.TRIALS (data/trials.js), written by analysis/export_web_data.py.
const D = window.TRIALS, SC = window.SCENE;
const TR = D.trials, PRE = D.meta.pre_s, POST = 3.0;
const $ = (id) => document.getElementById(id);
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const fmt = (v, n = 1) => (v == null || !isFinite(v) ? "–" : v.toFixed(n));

// ---------- state and clock
const S = { k: 0, t: -PRE, playing: false, rate: 1, t0perf: 0, tAt: 0 };
const cams = ["side", "wrist", "phone"];
const vids = Object.fromEntries(cams.map((c) => [c, $("vid_" + c)]));
const trial = () => TR[S.k];
const tMin = () => -PRE, tMax = () => trial().wall_s + POST;

function tauAt(tr, t) {                      // replay time (s after the replay starts) -> recorded time tau and grid index
  const w = tr.wall, n = w.length;
  if (t <= 0) return { tau: 0, i: 0, f: 0 };
  if (t >= w[n - 1]) return { tau: (n - 1) / tr.fs, i: n - 2, f: 1 };
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (w[m] <= t) lo = m; else hi = m; }
  const f = (t - w[lo]) / (w[hi] - w[lo]);
  return { tau: (lo + f) / tr.fs, i: lo, f };
}
const lerpRow = (arr, dim, i, f) => { const a = i * dim, b = (i + 1) * dim, o = new Array(dim); for (let j = 0; j < dim; j++) { const x = arr[a + j], y = arr[b + j]; o[j] = x == null ? y : y == null ? x : x + (y - x) * f; } return o; };

// ---------- header, tabs, summary table, notes
function buildStatic() {
  const devMax = Math.max(...TR.map((t) => t.stats.path_dev_mm.max));
  const devRms = TR.map((t) => t.stats.path_dev_mm.rms);
  const k = [
    [`${TR.length} / ${TR.length}`, "trials completed (error_code 0, both replay runs)"],
    [`${fmt(devMax, 2)} mm`, `max deviation of the measured UR spoon-tip path from the command (RMS ${fmt(Math.min(...devRms), 2)}–${fmt(Math.max(...devRms), 2)} mm)`],
    ["62–64 ms", "constant lag of the UR's actual position behind the command"],
    [`1 / ${Math.round(1 / D.meta.effective)}`, `replay speed = recorded speed × ${D.meta.speed} (script) × ${Math.round(D.meta.slider * 100)}% (speed slider)`],
  ];
  $("kpis").innerHTML = k.map(([v, l]) => `<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join("");
  $("tabs").innerHTML = TR.map((t, i) => `<button type="button" data-i="${i}" aria-pressed="${i === S.k}">Trial ${t.k}<small>${t.short.slice(9, 11)}:${t.short.slice(11, 13)}:${t.short.slice(13, 15)}</small></button>`).join("");
  $("tabs").onclick = (e) => { const b = e.target.closest("button"); if (b) selectTrial(+b.dataset.i); };
  const simCells = (sim) => {
    const ob = sim.out_of_bore_mm, cls = ob > 3 ? "bad" : ob > 0 ? "warn" : "ok";
    return `<td class="gs">${fmt(sim.depth_mm, 1)}</td><td class="${cls}">${ob > 0 ? fmt(ob, 1) : "none"}</td>`;
  };
  const rows = TR.map((t, i) => {
    const s = t.stats;
    const src = t.clips.find((c) => c.cam === "phone")?.rerun ? "re-shot" : "run 2";
    return `<tr data-i="${i}"><td>${t.k}</td><td class="l">${t.short.slice(9, 11)}:${t.short.slice(11, 13)}:${t.short.slice(13, 15)}</td><td>${fmt(t.rec_s, 1)}</td><td>${fmt(t.wall_s, 1)}</td>
      ${simCells(t.sim)}
      <td class="gs">${fmt(s.path_dev_mm.rms, 2)}</td><td>${fmt(s.path_dev_mm.max, 2)}</td><td>${fmt(s.tip_rot_sync_deg.max, 2)}</td><td>${Math.max(...s.joint_err_max_deg).toFixed(3)}</td>
      <td class="l gs">run 1 ${s.start_local.slice(0, 8)}</td><td class="l">${src}</td></tr>`;
  }).join("");
  const fit = D.meta.fit;
  $("summary").innerHTML = `<thead><tr><th rowspan="2">Trial</th><th rowspan="2" class="l">Recorded at</th><th rowspan="2">Demo length s</th><th rowspan="2">Replay length s</th>
    <th colspan="2" class="grp gs">Simulation, tube position fitted from video</th>
    <th colspan="4" class="grp gs">UR measured − command</th><th colspan="2" class="grp gs">Video</th></tr>
    <tr><th class="gs">Insertion depth mm</th><th title="Largest amount by which the spoon shaft would pass the inner wall of the tube">Past inner wall mm</th>
    <th class="gs">Path dev. RMS mm</th><th>Path dev. max mm</th><th>Orientation dev. max °</th><th>Joint dev. max °</th><th class="l gs">Side</th><th class="l">Wrist / close-up</th></tr></thead><tbody>${rows}</tbody>`;
  $("fitnote").innerHTML = `<b>Tube position fitted from video</b>: the top ${fmt(fit.green_mm, 0)} mm of the tube below the mouth is wrapped in opaque green tape, so in the phone close-up the spoon tip disappears the moment it enters the mouth and reappears the moment it leaves. Looking up the spoon-tip position in the UR trajectory at those two moments gives the real position of the tube mouth along the tube axis (consistent to ±${fmt(fit.mouth_below_S0_mm.sd, 1)} mm over the 10 trials); the sideways position was not measured and the planned position is used. <b>Insertion depth</b> is the distance from this mouth to the deepest point of the spoon tip; <b>past inner wall</b> treats the spoon and the tube as rigid bodies and gives the largest amount by which the spoon shaft would pass the inner wall, with about ±2 mm uncertainty from the sideways position and from the spoon mounting. While the spoon is pulled out, the tube mouth moves at most ${fmt(fit.collar_shift_px_max, 1)} px in the video (about 0.4 mm), so the tube is not pushed. The 3D view, the depth chart and the colours all use this fitted position.`;
  $("summary").querySelector("tbody").onclick = (e) => { const r = e.target.closest("tr"); if (r) { selectTrial(+r.dataset.i); window.scrollTo({ top: 0, behavior: "smooth" }); } };
  const notes = [
    "<b>Trajectories</b>: 10 demonstrations (test3) recorded with the V7 data-collection arm on 2026-11-20, mapped to the UR7e by inverse kinematics in the same way as test2, with the whole layout rotated +45° about the z axis of the UR base. The replay script ran at 0.5× speed with the teach-pendant speed slider at 50%, so the replay is 4× slower than the demonstration; 4× playback on this page is the original demonstration speed.",
    "<b>3D simulation</b>: the V7 is drawn from <code>Arm_V7.urdf</code> with the encoder joint angles recorded during the demonstration; the UR7e from the <code>ur_description</code> model with the commanded joint angles of the replay. Both use the same end-effector, spoon and tube rack, and the tube is placed at the position fitted from video. Both arms are drawn in one frame (the UR base), so their bases overlap; the spoons should coincide exactly.",
    "<b>Replay run 1</b> (12:06–12:23, rosbag recorded): side camera. The start time of each trial was fitted from <code>/joint_states</code> in the bag (joint-angle residual 0.003°); the UR's measured joint angles were then turned into a spoon-tip position with nominal kinematics and compared with the command.",
    "<b>The side camera is slow motion</b>: it captures at about 100 fps and stores at 30 fps, so file time runs 3.33× slower than real time. Fitting frame numbers against bag time gives 100.002 fps with ±0.15 s residual over the 10 trials; the clips here are converted back to real time.",
    "<b>Replay run 2</b> (from about 13:11, no rosbag, same speed as run 1): wrist camera and phone close-up. The start of each trial was found in the wrist video by matching the motion curve from the run-1 bag (correlation 0.81–0.85); phone time = wrist time − 88.70 s (consistent to ±0.1 s over the 10 trials). The time scale of both runs was checked trial by trial and is 1.00.",
    "<b>Trials 1 and 2</b>: the phone missed them in run 2, so the wrist and phone views of these two trials come from a short re-shoot at the end; the side view is still from run 1.",
    "<b>Limitations</b>: the UR's \u201cmeasured\u201d position is its own joint encoders plus nominal DH kinematics. It shows that the UR followed the command precisely, but it does not include the UR's absolute positioning error, the mounting error of the spoon in the end-effector (about 1–2 mm) or the placement error of the tube; whether the spoon touched the tube has to be judged from the videos. The colours and the \u201cpast inner wall\u201d values in the simulation use the tube position fitted from video; the sideways position was not measured (about ±2 mm).",
  ];
  $("notes").innerHTML = notes.map((n) => `<li>${n}</li>`).join("");
}

// ---------- videos
function loadVideos() {
  const tr = trial();
  for (const c of cams) {
    const clip = tr.clips.find((x) => x.cam === c), v = vids[c];
    v.dataset.pre = clip ? clip.pre_s : PRE;
    v.src = clip ? clip.file : "";
    v.playbackRate = S.rate;
    if (c !== "side") {
      const chip = $("chip_" + c);
      chip.textContent = clip && clip.rerun ? "Run 2 (re-shot)" : "Run 2";
      chip.className = "chip " + (clip && clip.rerun ? "rerun" : "run2");
    }
  }
}
function syncVideos(force) {
  for (const c of cams) {
    const v = vids[c]; if (!v.src || v.readyState < 1) continue;
    const want = Math.min(Math.max(+v.dataset.pre + S.t, 0), (v.duration || 1e9) - 0.05);
    if (force || Math.abs(v.currentTime - want) > 0.2 * Math.max(1, S.rate)) v.currentTime = want;
    if (S.playing && v.paused && S.t + PRE < (v.duration || 1e9)) v.play().catch(() => {});
    if (!S.playing && !v.paused) v.pause();
  }
}
for (const c of cams) vids[c].addEventListener("loadedmetadata", () => { vids[c].playbackRate = S.rate; syncVideos(true); });

// ---------- transport
function setT(t, force) {
  S.t = Math.min(Math.max(t, tMin()), tMax());
  if (S.playing) { S.tAt = S.t; S.t0perf = performance.now(); }
  syncVideos(force); render();
}
function play(on) {
  S.playing = on; $("play").textContent = on ? "Pause" : "Play";
  if (on) { if (S.t >= tMax() - 0.05) S.t = tMin(); S.tAt = S.t; S.t0perf = performance.now(); }
  syncVideos(true);
}
$("play").onclick = () => play(!S.playing);
$("back").onclick = () => setT(S.t - 5, true);
$("scrub").oninput = (e) => setT(tMin() + (tMax() - tMin()) * e.target.value / 1000, true);
$("rate").onchange = (e) => { S.rate = +e.target.value; for (const c of cams) vids[c].playbackRate = S.rate; if (S.playing) { S.tAt = S.t; S.t0perf = performance.now(); } };
document.addEventListener("keydown", (e) => { if (e.code === "Space" && !/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName)) { e.preventDefault(); play(!S.playing); } });

function selectTrial(i) {
  S.k = i; play(false); S.t = tMin();
  document.querySelectorAll("#tabs button").forEach((b) => b.setAttribute("aria-pressed", +b.dataset.i === i));
  document.querySelectorAll("#summary tbody tr").forEach((r) => r.classList.toggle("sel", +r.dataset.i === i));
  loadVideos(); setTrial3d(); drawCharts(); render();
}

// ---------- readouts
function render() {
  const tr = trial(), { tau, i, f } = tauAt(tr, S.t);
  $("scrub").value = Math.round(1000 * (S.t - tMin()) / (tMax() - tMin()));
  $("readout").textContent = `Replay ${S.t.toFixed(1)} / ${tr.wall_s.toFixed(1)} s · demo time ${tau.toFixed(2)} / ${tr.rec_s.toFixed(2)} s`;
  $("tauChip").textContent = `Demo time ${tau.toFixed(2)} s`;
  const g = (a) => { const x = a[i], y = a[i + 1]; return x == null ? y : y == null ? x : x + (y - x) * f; };
  const depth = g(tr.depth), radial = g(tr.radial), c = g(tr.sim_c), e = g(tr.err);
  const simTxt = c == null ? "not near the tube" : c < 0 ? `${(-c).toFixed(1)} mm past inner wall` : `${c.toFixed(1)} mm from tube wall`;
  $("now").innerHTML = [
    [depth > 0 ? `${fmt(depth, 1)} mm` : `${fmt(-depth, 0)} mm above the mouth`, "Spoon-tip depth below the tube mouth"],
    [depth > -30 ? `${fmt(radial, 1)} mm` : "–", "Spoon tip to tube axis"],
    [simTxt, "Simulation: min. spoon-to-tube distance"],
    [`${fmt(e, 0)} µm`, "UR measured − command (spoon tip)"],
  ].map(([v, l]) => `<div><div class="v">${v}</div><div class="l">${l}</div></div>`).join("");
  update3d(tr, i, f); drawCursor();
}

function tick() {
  if (S.playing) {
    const t = S.tAt + (performance.now() - S.t0perf) / 1000 * S.rate;
    if (t >= tMax()) { S.t = tMax(); play(false); } else S.t = t;
    syncVideos(false); render();
  }
  if (R3) R3.renderer.render(R3.scene, R3.camera);
  requestAnimationFrame(tick);
}

// ---------- charts (canvas)
const charts = { depth: $("chDepth"), err: $("chErr") };
let chartGeom = {};
function setupCanvas(cv) {
  const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  const ctx = cv.getContext("2d", { willReadFrequently: true }); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return { ctx, W: r.width, H: r.height };
}
function drawChart(key, series, opt) {
  const cv = charts[key], { ctx, W, H } = setupCanvas(cv), tr = trial();
  const pad = { l: 44, r: 10, t: 10, b: 26 }, x0 = pad.l, x1 = W - pad.r, y0 = pad.t, y1 = H - pad.b;
  const xs = (t) => x0 + (t - tMin()) / (tMax() - tMin()) * (x1 - x0);
  const ys = (v) => y1 - (v - opt.ymin) / (opt.ymax - opt.ymin) * (y1 - y0);
  const muted = css("--muted"), border = css("--border");
  ctx.clearRect(0, 0, W, H); ctx.font = "11px system-ui, sans-serif"; ctx.fillStyle = muted; ctx.strokeStyle = border; ctx.lineWidth = 1;
  if (opt.bands) for (const [a, b, col] of opt.bands) { ctx.fillStyle = col; ctx.fillRect(xs(a), y0, Math.max(1, xs(b) - xs(a)), y1 - y0); }
  ctx.fillStyle = muted;
  for (const v of opt.yticks) { const y = ys(v); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.textAlign = "right"; ctx.fillText(v, x0 - 6, y + 4); }
  const step = tMax() > 80 ? 20 : 10;
  for (let t = 0; t <= tMax(); t += step) { const x = xs(t); ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y1 + 4); ctx.stroke(); ctx.textAlign = "center"; ctx.fillText(t, x, y1 + 16); }
  ctx.textAlign = "right"; ctx.fillText("replay time s", x1, y1 + 16 + 0); ctx.textAlign = "left"; ctx.fillText(opt.unit, 4, y0 + 10);
  for (const s of series) {
    ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 1.6; ctx.beginPath(); let pen = false;
    for (let i = 0; i < tr.wall.length; i++) {
      const v = s.data[i]; if (v == null || (s.mask && !s.mask(i))) { pen = false; continue; }
      const x = xs(tr.wall[i]), y = ys(Math.min(Math.max(v, opt.ymin), opt.ymax));
      if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
    }
    ctx.stroke();
  }
  chartGeom[key] = { xs, x0, x1, y0, y1, img: ctx.getImageData(0, 0, cv.width, cv.height) };
}
function drawCharts() {
  const tr = trial(), n = tr.wall.length, bands = [];
  let cur = null, a = 0;
  const kind = (c) => (c == null ? null : c < 0 ? "rgba(220,38,38,.18)" : c < 1 ? "rgba(234,179,8,.22)" : null);
  for (let i = 0; i <= n; i++) {
    const k = i < n ? kind(tr.sim_c[i]) : null;
    if (k !== cur) { if (cur) bands.push([tr.wall[a], tr.wall[i - 1], cur]); cur = k; a = i; }
  }
  const dmax = Math.max(...tr.depth.filter((v) => v != null));
  drawChart("depth", [{ data: tr.depth, color: css("--line-cmd"), mask: (i) => tr.depth[i] > -40 }],
    { ymin: -40, ymax: Math.ceil((dmax + 5) / 20) * 20, yticks: [-40, -20, 0, 20, 40, 60, 80], unit: "mm", bands });
  const emax = Math.max(...tr.err.filter((v) => v != null));
  const top = emax > 200 ? 300 : 200;
  drawChart("err", [{ data: tr.err, color: css("--line-act"), width: 1.2 }], { ymin: 0, ymax: top, yticks: top === 300 ? [0, 100, 200, 300] : [0, 50, 100, 150, 200], unit: "µm" });
  drawCursor();
}
function drawCursor() {
  for (const key of Object.keys(charts)) {
    const g = chartGeom[key]; if (!g) continue;
    const cv = charts[key], ctx = cv.getContext("2d"); ctx.putImageData(g.img, 0, 0);
    const dpr = window.devicePixelRatio || 1; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const x = g.xs(S.t); ctx.strokeStyle = css("--accent"); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, g.y0); ctx.lineTo(x, g.y1); ctx.stroke();
  }
}
let rz; window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { drawCharts(); resize3d(); }, 120); });
const mq = window.matchMedia("(prefers-color-scheme: dark)"); mq.addEventListener?.("change", () => drawCharts());

// ---------- 3D
let R3 = null;
async function init3d() {
  const host = $("view3d");
  let THREE, OrbitControls;
  try {
    THREE = await import("three");
    ({ OrbitControls } = await import("three/addons/controls/OrbitControls.js"));
  } catch (e) { host.innerHTML = '<div class="err3d">The 3D view needs an internet connection to load three.js (cdn.jsdelivr.net). Videos and charts still work.</div>'; return; }
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setPixelRatio(window.devicePixelRatio || 1);
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 5, 20000); camera.up.set(0, 0, 1);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = false;
  const home = () => { camera.position.set(960, -690, 640); controls.target.set(330, 200, 130); controls.update(); };
  home(); $("resetView").onclick = home;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6));
  const dl = new THREE.DirectionalLight(0xffffff, 1.6); dl.position.set(400, -600, 1200); scene.add(dl);
  const grid = new THREE.GridHelper(1600, 32, 0x8a94a6, 0xc3cad6); grid.rotation.x = Math.PI / 2; grid.position.set(300, 150, 0); grid.material.opacity = 0.45; grid.material.transparent = true; scene.add(grid);
  const axes = new THREE.AxesHelper(120); scene.add(axes);

  const geoCache = {};
  const geom = (key) => {
    if (geoCache[key]) return geoCache[key];
    const m = SC.meshes[key], bin = atob(m.b64), u = new Uint16Array(m.n * 3);
    for (let i = 0; i < u.length; i++) u[i] = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8);
    const p = new Float32Array(u.length);
    for (let i = 0; i < u.length; i++) p[i] = m.lo[i % 3] + u[i] / 65535 * m.size[i % 3];
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.computeVertexNormals();
    return (geoCache[key] = g);
  };
  const mat4 = (a) => new THREE.Matrix4().set(...a.flat());
  const originM = (xyz, rpy) => new THREE.Matrix4().compose(new THREE.Vector3(...xyz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rpy[0], rpy[1], rpy[2], "ZYX")), new THREE.Vector3(1, 1, 1));
  const material = (color, opacity = 1) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1, transparent: opacity < 1, opacity, depthWrite: opacity >= 1, side: THREE.DoubleSide });

  function makeRobot(R, color, opacity, extraMats) {
    const group = new THREE.Group(); scene.add(group);
    const byParent = {}; for (const j of R.tree.joints) (byParent[j.parent] ||= []).push(j);
    const order = []; const q = [R.root]; while (q.length) { const l = q.shift(); for (const j of byParent[l] || []) { order.push(j); q.push(j.child); } }
    const origins = Object.fromEntries(order.map((j) => [j.name, originM(j.xyz, j.rpy)]));
    const meshes = R.tree.links.map((l) => { const m = new THREE.Mesh(geom(l.mesh), material(color, opacity)); m.matrixAutoUpdate = false; group.add(m); return { ...l, obj: m, off: originM(l.xyz, l.rpy) }; });
    const att = R.attached.map((a) => { const m = new THREE.Mesh(geom(a.mesh), extraMats[a.mesh] || material(color, opacity)); m.matrixAutoUpdate = false; group.add(m); return { ...a, obj: m, off: mat4(a.T) }; });
    const rootM = mat4(R.T_world_root);
    const set = (vals) => {
      const W = { [R.root]: rootM.clone() }, tmp = new THREE.Matrix4(), axis = new THREE.Vector3();
      for (const j of order) {
        const M = W[j.parent].clone().multiply(origins[j.name]);
        if (j.type !== "fixed") { const v = vals[j.name] ?? 0; axis.set(...j.axis).normalize(); M.multiply(tmp.makeRotationAxis(axis, v)); }
        W[j.child] = M;
      }
      for (const m of meshes) m.obj.matrix.copy(W[m.link]).multiply(m.off);
      for (const a of att) a.obj.matrix.copy(W[a.link]).multiply(a.off);
      return W;
    };
    return { group, set, meshes, att };
  }
  const spoonMat = material(0xdc2626), bodyMat = material(0x3f4652);
  const v7 = makeRobot(SC.v7, 0xf08c2e, 1, { uree_spoon: spoonMat });
  const ur = makeRobot(SC.ur, 0xb8c0cc, 0.38, { uree_body: material(0x3f4652, 0.38), uree_spoon: material(0xdc2626, 0.38) });
  const holder = new THREE.Mesh(geom(SC.holder.mesh), material(0x3b82f6, 0.55)); holder.matrixAutoUpdate = false; holder.matrix.copy(mat4(SC.holder.T)); scene.add(holder);

  const pathGroup = new THREE.Group(); scene.add(pathGroup);
  const actGroup = new THREE.Group(); scene.add(actGroup);
  const marker = new THREE.Mesh(new THREE.SphereGeometry(3.5, 16, 12), new THREE.MeshBasicMaterial({ color: 0x111827 })); scene.add(marker);
  R3 = { THREE, renderer, scene, camera, controls, v7, ur, pathGroup, actGroup, marker, host };
  $("tgV7").onchange = (e) => (v7.group.visible = e.target.checked);
  $("tgUR").onchange = (e) => (ur.group.visible = e.target.checked); ur.group.visible = $("tgUR").checked;
  $("tgPath").onchange = (e) => (pathGroup.visible = e.target.checked);
  $("tgAct").onchange = (e) => (actGroup.visible = e.target.checked);
  resize3d(); setTrial3d(); render();
}
function resize3d() {
  if (!R3) return; const r = R3.host.getBoundingClientRect();
  R3.renderer.setSize(r.width, r.height, false); R3.camera.aspect = r.width / r.height; R3.camera.updateProjectionMatrix();
}
function setTrial3d() {
  if (!R3) return; const { THREE, pathGroup, actGroup } = R3, tr = trial();
  pathGroup.clear(); actGroup.clear();
  const n = tr.tip_cmd.length / 3, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const C = { g: [0.09, 0.64, 0.29], y: [0.92, 0.7, 0.03], r: [0.86, 0.15, 0.15], n: [0.62, 0.64, 0.68] };
  for (let i = 0; i < n; i++) {
    pos.set(tr.tip_cmd.slice(3 * i, 3 * i + 3), 3 * i);
    const c = tr.sim_c[i]; col.set(c == null ? C.n : c < 0 ? C.r : c < 1 ? C.y : C.g, 3 * i);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  pathGroup.add(new THREE.Line(g, new THREE.LineBasicMaterial({ vertexColors: true })));
  const ga = new THREE.BufferGeometry(); ga.setAttribute("position", new THREE.BufferAttribute(new Float32Array(tr.tip_act.map((v) => v ?? 0)), 3));
  actGroup.add(new THREE.Line(ga, new THREE.LineDashedMaterial({ color: 0x111827, dashSize: 3, gapSize: 3 })).computeLineDistances());
}
function update3d(tr, i, f) {
  if (!R3) return;
  const v7q = lerpRow(tr.v7, 10, i, f), urq = lerpRow(tr.ur, 6, i, f), tip = lerpRow(tr.tip_cmd, 3, i, f);
  R3.v7.set(Object.fromEntries(SC.v7.joint_names.map((n, j) => [n, v7q[j]])));
  R3.ur.set(Object.fromEntries(SC.ur.joint_names.map((n, j) => [n, urq[j]])));
  R3.marker.position.set(...tip);
}

// ---------- start
buildStatic(); loadVideos(); drawCharts(); render(); requestAnimationFrame(tick);
selectTrial(0);
init3d();
