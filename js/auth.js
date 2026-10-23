
const Auth = (() => {
  const ROOT = (
    (document.currentScript && document.currentScript.src) || ""
  ).replace(/js\/auth\.js.*$/, "");

  const UK = "sp:users";
  const SK = "sp:session";

  const rd = (storage, key) => {
    try {
      return JSON.parse(storage.getItem(key));
    } catch (e) {
      return null;
    }
  };

  const users = () => rd(localStorage, UK) || {};

  const hex = buffer =>
    [...new Uint8Array(buffer)]
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");

  const rnd = () =>
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8);

  async function hash(password, salt) {
    if (window.crypto && crypto.subtle) {
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
      );

      const bits = await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: new TextEncoder().encode(salt),
          iterations: 100000,
          hash: "SHA-256"
        },
        key,
        256
      );

      return hex(bits);
    }

    // Compatibility fallback for local prototypes only.
    let h = 5381;

    for (const character of salt + password) {
      h = ((h << 5) + h + character.charCodeAt(0)) >>> 0;
    }

    return "x" + h;
  }

  function open(user, remember) {
    const session = JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email || "",
      guest: !!user.guest,
      provider: user.provider || "local"
    });

    try {
      sessionStorage.removeItem(SK);
      localStorage.removeItem(SK);

      (remember ? localStorage : sessionStorage).setItem(
        SK,
        session
      );
    } catch (e) {
      throw new Error(
        "Your browser is blocking storage, so sign-in can't be kept. " +
        "Allow site data and try again."
      );
    }
  }

  function saveUserData(user) {
    try {
      localStorage.setItem(
        "sp:data:" + user.id,
        JSON.stringify({
          profile: {
            name: user.name
          }
        })
      );
    } catch (e) {
      // Profile data is supplementary.
    }
  }

  return {
    ROOT,

    CFG: {
      appUrl: ROOT + "pages/dashboard.html"
    },

    user() {
      try {
        return rd(sessionStorage, SK) || rd(localStorage, SK);
      } catch (e) {
        return null;
      }
    },

    async signup(name, email, password, remember) {
      name = (name || "").trim();
      email = (email || "").trim().toLowerCase();
      password = password || "";

      if (!name) {
        throw new Error("Enter your name.");
      }

      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new Error("Enter a valid email address.");
      }

      if (password.length < 8) {
        throw new Error(
          "Use a password of at least 8 characters."
        );
      }

      const all = users();

      if (all[email]) {
        throw new Error(
          "An account with that email already exists. Log in instead."
        );
      }

      const salt = rnd();

      const user = {
        id: rnd(),
        name,
        email,
        salt,
        hash: await hash(password, salt),
        provider: "local"
      };

      all[email] = user;

      try {
        localStorage.setItem(UK, JSON.stringify(all));
      } catch (e) {
        throw new Error(
          "Your browser is blocking storage, so the account can't be saved."
        );
      }

      saveUserData(user);
      open(user, remember);
    },

    async login(email, password, remember) {
      email = (email || "").trim().toLowerCase();

      const user = users()[email];

      if (
        !user ||
        !user.salt ||
        !user.hash ||
        user.hash !== await hash(password || "", user.salt)
      ) {
        throw new Error("Email or password is incorrect.");
      }

      open(user, remember);
    },

    /*
     * Google sign-in
     *
     * Expects a profile object supplied by the Google Identity
     * Services callback in login.html:
     *
     * {
     *   id: profile.sub,
     *   name: profile.name,
     *   email: profile.email
     * }
     *
     * The Google ID token must be verified server-side in production.
     */
    async googleLogin(profile, remember) {
      if (
        !profile ||
        typeof profile.id !== "string" ||
        !profile.id.trim() ||
        typeof profile.email !== "string" ||
        !profile.email.trim()
      ) {
        throw new Error(
          "Google account details are missing."
        );
      }

      const email = profile.email.trim().toLowerCase();
      const googleId = profile.id.trim();
      const name =
        (profile.name || "").trim() ||
        email.split("@")[0];

      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new Error(
          "Google returned an invalid email address."
        );
      }

      const all = users();
      let user = all[email];

      if (user) {
        // Never silently connect a different Google account
        // to an account that already has a different Google ID.
        if (user.googleId && user.googleId !== googleId) {
          throw new Error(
            "This email is linked to another Google account."
          );
        }

        user.googleId = googleId;
        user.provider = "google";
        user.name = name || user.name;
      } else {
        user = {
          id: "google_" + googleId,
          googleId,
          name,
          email,
          provider: "google"
        };
      }

      all[email] = user;

      try {
        localStorage.setItem(UK, JSON.stringify(all));
      } catch (e) {
        throw new Error(
          "Your browser is blocking storage. Please try again."
        );
      }

      saveUserData(user);
      open(user, !!remember);
    },

    guest() {
      open(
        {
          id: "guest",
          name: "Guest",
          guest: true,
          provider: "guest"
        },
        false
      );
    },

    logout() {
      try {
        sessionStorage.removeItem(SK);
        localStorage.removeItem(SK);
      } catch (e) {
        // Continue to the login page.
      }

      location.href = ROOT + "index.html";
    },

    requireAuth() {
      if (!Auth.user()) {
        location.replace(ROOT + "login.html");
      }
    },

    deleteAccount() {
      const user = Auth.user();

      if (!user) return;

      const all = users();

      for (const email in all) {
        if (all[email].id === user.id) {
          delete all[email];
        }
      }

      try {
        localStorage.setItem(UK, JSON.stringify(all));
        localStorage.removeItem("sp:data:" + user.id);
        localStorage.removeItem("sp:timer:" + user.id);
      } catch (e) {
        throw new Error(
          "The account could not be deleted from browser storage."
        );
      }

      Auth.logout();
    }
  };
})();
