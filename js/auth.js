/* Study Platform auth (front-end prototype).
   Email accounts live in this browser's localStorage. Google sign-in uses Google Identity Services.
   For a real launch, verify the Google ID token and handle accounts on a server. */
const Auth = (() => {
  const ROOT = new URL("../", document.currentScript.src).href; // site root, whatever page loads this file
  const CFG = {
    googleClientId: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com", // paste your OAuth client ID here
    appUrl: ROOT + "pages/app.html" // where to go after signing in
  };
  const USERS = "ssp-users", SESSION = "ssp-session";
  const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch (e) { return d } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} };
  const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

  async function hash(pw, salt) {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
    return b64(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: unb64(salt), iterations: 150000, hash: "SHA-256" }, key, 256));
  }

  const user = () => get(SESSION, null);

  function start(u) {
    set(SESSION, u);
    // Give the study app the student's name on first sign-in.
    try {
      const raw = localStorage.getItem("study-platform-v1");
      if (!raw) {
        localStorage.setItem("study-platform-v1", JSON.stringify({ profile: { name: u.name.split(" ")[0], year: 12, school: "", grad: 2026, dailyGoal: 120, weeklyGoal: 10, studyMin: 45, breakMin: 10 } }));
      } else {
        const d = JSON.parse(raw);
        if (d.profile && d.profile.name === "Student") { d.profile.name = u.name.split(" ")[0]; localStorage.setItem("study-platform-v1", JSON.stringify(d)); }
      }
    } catch (e) {}
  }

  async function signup(name, email, pw) {
    email = email.trim().toLowerCase();
    const users = get(USERS, {});
    if (users[email]) throw new Error("An account with this email already exists. Log in instead.");
    if (pw.length < 8) throw new Error("Use at least 8 characters for your password.");
    const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    users[email] = { name: name.trim(), salt, hash: await hash(pw, salt) };
    set(USERS, users);
    start({ email, name: name.trim(), provider: "email" });
  }

  async function login(email, pw) {
    email = email.trim().toLowerCase();
    const u = get(USERS, {})[email];
    if (!u || u.hash !== await hash(pw, u.salt)) throw new Error("Email or password is incorrect.");
    start({ email, name: u.name, provider: "email" });
  }

  function logout() { try { localStorage.removeItem(SESSION) } catch (e) {} location.href = ROOT + "index.html"; }
  function requireAuth() { if (!user()) location.replace(ROOT + "login.html"); }

  function decodeJwt(token) {
    const p = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(new TextDecoder().decode(unb64(p.padEnd(Math.ceil(p.length / 4) * 4, "="))));
  }

  function renderGoogle(el, onDone, onError) {
    if (CFG.googleClientId.startsWith("YOUR_")) {
      el.innerHTML = '<p class="note">Google sign-in isn’t set up yet. Add your client ID in js/auth.js.</p>';
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client"; s.async = true;
    s.onload = () => {
      google.accounts.id.initialize({
        client_id: CFG.googleClientId,
        callback: r => {
          try { const p = decodeJwt(r.credential); start({ email: p.email, name: p.name || p.email, picture: p.picture, provider: "google" }); onDone(); }
          catch (e) { onError("Google sign-in failed. Please try again."); }
        }
      });
      google.accounts.id.renderButton(el, { theme: "outline", size: "large", width: 320, text: "continue_with" });
    };
    s.onerror = () => onError("Couldn’t load Google sign-in. Run the site from http://localhost or your own domain, not from a file.");
    document.head.appendChild(s);
  }

  return { CFG, user, signup, login, logout, requireAuth, renderGoogle };
})();
