/* Study Platform authentication
   Front-end prototype using localStorage and Google Identity Services.
   Production websites should verify Google ID tokens on a server.
*/
const Auth = (() => {
  const CFG = {
    googleClientId: "975102357812-e3osguv8vvokagfprs19f9j9h0jjd6nv.apps.googleusercontent.com",
    appUrl: "student-study-platform.html"
  };

  const USERS = "ssp-users";
  const SESSION = "ssp-session";
  const PROFILE_KEY = "study-platform-v1";

  // Resolve paths from this script so redirects work from nested pages.
  const scriptURL = document.currentScript?.src || "";
  const ROOT = scriptURL
    ? new URL("../", scriptURL).href
    : new URL("./", location.href).href;

  const get = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  };

  const set = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  };

  const base64 = bytes =>
    btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(""));

  const fromBase64 = value =>
    Uint8Array.from(atob(value), char => char.charCodeAt(0));

  async function hash(password, salt) {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const result = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: fromBase64(salt),
        iterations: 150000,
        hash: "SHA-256"
      },
      key,
      256
    );

    return base64(new Uint8Array(result));
  }

  function user() {
    return get(SESSION, null);
  }

  function syncProfile(account) {
    try {
      const raw = get(PROFILE_KEY, {});
      const profile = raw.profile || {};

      raw.profile = {
        name: profile.name && profile.name !== "Student"
          ? profile.name
          : (account.name || "Student").trim().split(/\s+/)[0],
        year: 12,
        school: "",
        grad: new Date().getFullYear(),
        dailyGoal: 120,
        weeklyGoal: 10,
        studyMin: 45,
        breakMin: 10,
        prefTime: "evening",
        avatar: "",
        ...profile
      };

      localStorage.setItem(PROFILE_KEY, JSON.stringify(raw));
    } catch (error) {
      console.warn("Could not update the study profile.", error);
    }
  }

  function start(account, remember = true) {
    const session = {
      email: account.email || "",
      name: account.name || account.email || "Student",
      provider: account.provider || "email",
      picture: account.picture || ""
    };

    if (!set(SESSION, session)) {
      throw new Error("Unable to save your session. Check your browser storage settings.");
    }

    syncProfile(session);
    return session;
  }

  async function signup(name, email, password, remember = true) {
    name = String(name || "").trim();
    email = String(email || "").trim().toLowerCase();

    if (!name) throw new Error("Enter your name.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error("Enter a valid email address.");
    }
    if (String(password).length < 8) {
      throw new Error("Use at least 8 characters for your password.");
    }

    const users = get(USERS, {});
    if (users[email]) {
      throw new Error("An account with this email already exists. Log in instead.");
    }

    const salt = base64(crypto.getRandomValues(new Uint8Array(16)));

    users[email] = {
      name,
      salt,
      hash: await hash(password, salt)
    };

    if (!set(USERS, users)) {
      throw new Error("Could not save your account. Check browser storage.");
    }

    start({ email, name, provider: "email" }, remember);
  }

  async function login(email, password, remember = true) {
    email = String(email || "").trim().toLowerCase();

    const account = get(USERS, {})[email];

    if (!account || !account.salt || !account.hash) {
      throw new Error("Email or password is incorrect.");
    }

    if (account.hash !== await hash(String(password), account.salt)) {
      throw new Error("Email or password is incorrect.");
    }

    start({ email, name: account.name, provider: "email" }, remember);
  }

  function decodeJwt(token) {
    if (typeof token !== "string") {
      throw new Error("Missing Google credential.");
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid Google credential.");
    }

    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padded = payload.padEnd(
      Math.ceil(payload.length / 4) * 4,
      "="
    );

    return JSON.parse(
      new TextDecoder().decode(fromBase64(padded))
    );
  }

  function googleLogin(profile, remember = true) {
    if (!profile || !profile.sub || !profile.email) {
      return Promise.reject(
        new Error("Google did not provide the required account details.")
      );
    }

    if (profile.email_verified !== true) {
      return Promise.reject(
        new Error("Please use a Google account with a verified email address.")
      );
    }

    // The browser prototype associates Google accounts by email.
    // This is not a substitute for server-side token verification.
    const email = profile.email.trim().toLowerCase();
    const users = get(USERS, {});
    const existing = users[email];

    if (existing) {
      // Preserve existing email/password credentials and account data.
      existing.name = existing.name || profile.name || email;
      existing.googleLinked = true;
      users[email] = existing;

      if (!set(USERS, users)) {
        return Promise.reject(
          new Error("Could not save the account. Check browser storage.")
        );
      }
    } else {
      users[email] = {
        name: profile.name || email,
        googleLinked: true
      };

      if (!set(USERS, users)) {
        return Promise.reject(
          new Error("Could not save the account. Check browser storage.")
        );
      }
    }

    try {
      start({
        email,
        name: profile.name || existing?.name || email,
        picture: profile.picture || "",
        provider: "google"
      }, remember);

      return Promise.resolve(user());
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function renderGoogle(element, onDone = () => {}, onError = () => {}) {
    if (!element) {
      onError("Google sign-in button container was not found.");
      return;
    }

    if (!CFG.googleClientId || CFG.googleClientId.startsWith("YOUR_")) {
      element.textContent = "Google sign-in has not been configured.";
      onError("Add your Google OAuth client ID in js/auth.js.");
      return;
    }

    function initialise() {
      if (!window.google?.accounts?.id) {
        onError("Google sign-in could not initialise. Please refresh the page.");
        return;
      }

      window.google.accounts.id.initialize({
        client_id: CFG.googleClientId,
        callback: response => {
          try {
            const profile = decodeJwt(response.credential);

            if (profile.aud !== CFG.googleClientId) {
              throw new Error("Google credential audience did not match.");
            }

            if (profile.exp && Date.now() >= profile.exp * 1000) {
              throw new Error("Google sign-in has expired. Please try again.");
            }

            googleLogin({
              sub: profile.sub,
              email: profile.email,
              email_verified: profile.email_verified,
              name: profile.name,
              picture: profile.picture
            })
              .then(() => onDone())
              .catch(error => onError(error.message || "Google sign-in failed."));
          } catch (error) {
            onError(error.message || "Google sign-in failed. Please try again.");
          }
        }
      });

      element.replaceChildren();

      window.google.accounts.id.renderButton(element, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "continue_with",
        shape: "rectangular"
      });
    }

    if (window.google?.accounts?.id) {
      initialise();
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", initialise, { once: true });
      existingScript.addEventListener(
        "error",
        () => onError("Could not load Google sign-in. Check your connection and site URL."),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initialise;
    script.onerror = () => onError(
      "Could not load Google sign-in. Check your connection and site URL."
    );
    document.head.appendChild(script);
  }

  function logout() {
    try {
      localStorage.removeItem(SESSION);
    } catch (error) {
      console.warn("Could not clear the session.", error);
    }

    location.href = new URL("index.html", ROOT).href;
  }

  function requireAuth() {
    if (!user()) {
      location.replace(new URL("login.html", ROOT).href);
    }
  }

  function redirectAfterLogin() {
    location.href = new URL(CFG.appUrl, ROOT).href;
  }

  return {
    CFG,
    user,
    signup,
    login,
    googleLogin,
    renderGoogle,
    logout,
    requireAuth,
    redirectAfterLogin
  };
})();