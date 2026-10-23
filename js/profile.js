/* Profile page: edit personal details and study preferences. Saved to localStorage with the rest of the app data. */
(() => {
  Auth.requireAuth();

  const KEY = "study-platform-v1";
  const DEF = { name: "Student", year: 12, school: "", grad: 2026, dailyGoal: 120, weeklyGoal: 10, studyMin: 45, breakMin: 10, prefTime: "evening", avatar: "" };
  const TIMES = { morning: "Mornings", afternoon: "Afternoons", evening: "Evenings", night: "Late nights", any: "Flexible hours" };
  const RANGE = { year: [1, 13, "Year level"], grad: [2000, 2100, "Graduation year"], dailyGoal: [10, 720, "Daily goal"], weeklyGoal: [1, 80, "Weekly goal"], studyMin: [5, 240, "Study duration"], breakMin: [1, 60, "Break duration"] };
  const NUMERIC = Object.keys(RANGE);

  const $ = id => document.getElementById(id);
  const readRaw = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch (e) { return {} } };
  const toast = m => { const t = $("toast"); t.textContent = m; t.style.display = "block"; clearTimeout(toast.h); toast.h = setTimeout(() => t.style.display = "none", 2400); };
  const hm = m => m >= 60 ? Math.floor(m / 60) + "h" + (m % 60 ? " " + (m % 60) + "m" : "") : m + " min";

  let saved = { ...DEF, ...readRaw().profile };
  let draft = { ...saved };

  // ----- selects -----
  function fillSelect(el, from, to, extra, fmt = v => v) {
    const vals = new Set();
    for (let v = from; v <= to; v++) vals.add(v);
    if (Number.isFinite(+extra)) vals.add(+extra);
    el.innerHTML = [...vals].sort((a, b) => a - b).map(v => `<option value="${v}">${fmt(v)}</option>`).join("");
  }
  const thisYear = new Date().getFullYear();
  fillSelect($("year"), 7, 12, saved.year, v => "Year " + v);
  fillSelect($("grad"), thisYear - 1, thisYear + 8, saved.grad);

  function fill() {
    document.querySelectorAll("[data-k]").forEach(el => { el.value = draft[el.dataset.k] ?? ""; });
  }

  // ----- summary card -----
  function paintAvatar() {
    const av = $("av");
    av.textContent = ""; av.style.background = "";
    if (draft.avatar) {
      const img = new Image(); img.alt = "Profile photo"; img.src = draft.avatar; av.appendChild(img);
    } else {
      const n = (draft.name || "?").trim();
      let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360;
      av.style.background = `hsl(${h} 42% 36%)`;
      av.textContent = n.split(/\s+/).slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "?";
    }
    $("rm").disabled = !draft.avatar;
  }

  function update() {
    $("pvName").textContent = (draft.name || "").trim() || "Your name";
    $("pvSub").textContent = ["Year " + draft.year, (draft.school || "").trim(), "Class of " + draft.grad].filter(Boolean).join(" · ");
    const g = +draft.dailyGoal, s = +draft.studyMin;
    $("facts").innerHTML = "";
    [Number.isFinite(g) ? hm(g) + " daily goal" : "", Number.isFinite(s) ? s + " min sessions" : "", TIMES[draft.prefTime] || ""].filter(Boolean).forEach(t => {
      const sp = document.createElement("span"); sp.textContent = t; $("facts").appendChild(sp);
    });
    paintAvatar();
    const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
    $("state").textContent = dirty ? "You have unsaved changes" : "All changes saved";
    $("state").classList.toggle("dirty", dirty);
    $("save").disabled = $("discard").disabled = !dirty;
    window.onbeforeunload = dirty ? e => { e.preventDefault(); e.returnValue = ""; } : null;
  }

  // ----- validation -----
  function validate() {
    const errs = {};
    if (!String(draft.name).trim()) errs.name = "Enter your name.";
    NUMERIC.forEach(k => {
      const [lo, hi, label] = RANGE[k], v = draft[k];
      if (v === "" || !Number.isFinite(+v) || +v < lo || +v > hi) errs[k] = `${label} must be between ${lo} and ${hi}.`;
    });
    document.querySelectorAll("[data-e]").forEach(p => {
      const k = p.dataset.e; p.textContent = errs[k] || "";
      const inp = document.querySelector(`[data-k="${k}"]`); if (inp) inp.setAttribute("aria-invalid", errs[k] ? "true" : "false");
    });
    return errs;
  }

  // ----- form events -----
  document.querySelectorAll("[data-k]").forEach(el => {
    el.addEventListener("input", () => {
      const k = el.dataset.k;
      draft[k] = NUMERIC.includes(k) ? (el.value === "" ? "" : +el.value) : el.value;
      update();
      if (el.getAttribute("aria-invalid") === "true") validate();
    });
  });

  $("f").addEventListener("submit", e => {
    e.preventDefault();
    const errs = validate();
    const first = Object.keys(errs)[0];
    if (first) { document.querySelector(`[data-k="${first}"]`).focus(); return; }
    draft.name = draft.name.trim(); draft.school = (draft.school || "").trim();
    NUMERIC.forEach(k => draft[k] = +draft[k]);
    const raw = readRaw();
    raw.profile = { ...DEF, ...raw.profile, ...draft };
    try { localStorage.setItem(KEY, JSON.stringify(raw)); }
    catch (x) { return toast("Couldn’t save. Your browser may be blocking storage or is full."); }
    saved = { ...draft };
    fill(); update(); toast("Profile saved");
  });

  $("discard").onclick = () => { draft = { ...saved }; fill(); validate(); update(); };

  // ----- avatar -----
  $("pick").onclick = () => $("file").click();
  $("rm").onclick = () => { draft.avatar = ""; update(); };
  $("file").onchange = e => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    if (!/^image\//.test(f.type)) return toast("Choose an image file (JPG or PNG).");
    if (f.size > 8e6) return toast("That image is over 8 MB. Choose a smaller one.");
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(img.width, img.height), c = document.createElement("canvas");
        c.width = c.height = 256;
        c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 256, 256);
        draft.avatar = c.toDataURL("image/jpeg", 0.85); update();
      };
      img.onerror = () => toast("Couldn’t read that image.");
      img.src = r.result;
    };
    r.readAsDataURL(f);
  };

  // ----- account -----
  const u = Auth.user();
  if (u) {
    $("acctEmail").textContent = u.email;
    $("acctHow").textContent = u.provider === "google" ? "Signed in with Google" : "Signed in with email and password";
  }
  $("out").onclick = $("logout").onclick = e => { e.preventDefault(); window.onbeforeunload = null; Auth.logout(); };

  // ----- data -----
  $("exp").onclick = () => {
    const blob = new Blob([JSON.stringify(readRaw(), null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "student-data.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $("impBtn").onclick = () => $("imp").click();
  $("imp").onchange = e => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!d || typeof d !== "object" || Array.isArray(d) || !(d.profile || d.subjects)) throw 0;
        localStorage.setItem(KEY, JSON.stringify(d));
        window.onbeforeunload = null; location.reload();
      } catch (x) { toast("That file isn’t a valid Study Platform backup."); }
    };
    r.readAsText(f);
  };
  $("wipe").onclick = () => $("dlg").showModal();
  $("no").onclick = () => $("dlg").close();
  $("yes").onclick = () => { try { localStorage.removeItem(KEY); } catch (x) {} window.onbeforeunload = null; location.reload(); };

  fill(); update();
})();
