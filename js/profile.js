/* Study Platform Profile
   Edit personal details and study preferences.
   Profile data is stored in study-platform-v1.
*/
(() => {
  "use strict";

  // ----- authentication -----
  if (typeof Auth === "undefined") {
    console.error("Auth is unavailable. Load js/auth.js before profile.js.");
    location.replace("../login.html");
    return;
  }

  Auth.requireAuth();

  if (!Auth.user()) return;

  // ----- configuration -----
  const KEY = "study-platform-v1";

  const DEF = {
    name: "Student",
    year: 12,
    school: "",
    grad: new Date().getFullYear(),
    dailyGoal: 120,
    weeklyGoal: 10,
    studyMin: 45,
    breakMin: 10,
    prefTime: "evening",
    avatar: ""
  };

  const TIMES = {
    morning: "Mornings",
    afternoon: "Afternoons",
    evening: "Evenings",
    night: "Late nights",
    any: "Flexible hours"
  };

  const RANGE = {
    year: [7, 12, "Year level"],
    grad: [2000, 2100, "Graduation year"],
    dailyGoal: [10, 720, "Daily goal"],
    weeklyGoal: [1, 80, "Weekly goal"],
    studyMin: [5, 240, "Study duration"],
    breakMin: [1, 60, "Break duration"]
  };

  const NUMERIC = Object.keys(RANGE);
  const $ = id => document.getElementById(id);

  // ----- storage -----
  function readRaw() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || "{}");
      return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
    } catch (error) {
      console.error("Could not read student data.", error);
      return {};
    }
  }

  function saveRaw(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("Could not save student data.", error);
      return false;
    }
  }

  function toast(message) {
    const element = $("toast");

    if (!element) {
      console.info(message);
      return;
    }

    element.textContent = message;
    element.style.display = "block";

    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      element.style.display = "none";
    }, 2600);
  }

  function hm(minutes) {
    return minutes >= 60
      ? Math.floor(minutes / 60) + "h" +
        (minutes % 60 ? " " + (minutes % 60) + "m" : "")
      : minutes + " min";
  }

  // ----- initial profile -----
  const account = Auth.user();
  const initialData = readRaw();

  const savedProfile = {
    ...DEF,
    ...(initialData.profile || {})
  };

  // If this is the first profile, use the signed-in student's name.
  if (
    (!savedProfile.name || savedProfile.name === "Student") &&
    account?.name
  ) {
    savedProfile.name = account.name.trim().split(/\s+/)[0];
  }

  let saved = { ...savedProfile };
  let draft = { ...savedProfile };

  // ----- required element checks -----
  const requiredIds = [
    "year", "grad", "av", "rm", "pvName", "pvSub",
    "facts", "state", "save", "discard", "f", "pick",
    "file", "acctEmail", "acctHow", "out", "logout",
    "exp", "impBtn", "imp", "wipe", "dlg", "no", "yes"
  ];

  const missing = requiredIds.filter(id => !$(id));

  if (missing.length) {
    console.error("Profile page is missing required HTML elements:", missing);
  }

  // ----- selects -----
  function fillSelect(element, from, to, extra, format = value => value) {
    if (!element) return;

    const values = new Set();

    for (let value = from; value <= to; value++) {
      values.add(value);
    }

    if (
      extra !== "" &&
      extra !== null &&
      extra !== undefined &&
      Number.isFinite(Number(extra))
    ) {
      values.add(Number(extra));
    }

    element.replaceChildren();

    [...values]
      .sort((a, b) => a - b)
      .forEach(value => {
        const option = document.createElement("option");
        option.value = String(value);
        option.textContent = String(format(value));
        element.appendChild(option);
      });
  }

  const thisYear = new Date().getFullYear();

  fillSelect($("year"), 7, 12, saved.year, value => "Year " + value);
  fillSelect($("grad"), thisYear - 1, thisYear + 8, saved.grad);

  function fill() {
    document.querySelectorAll("[data-k]").forEach(element => {
      const key = element.dataset.k;
      element.value = draft[key] ?? "";
    });
  }

  // ----- avatar and profile summary -----
  function paintAvatar() {
    const avatar = $("av");
    if (!avatar) return;

    avatar.replaceChildren();
    avatar.style.background = "";

    if (draft.avatar) {
      const image = new Image();
      image.alt = "Profile photo";
      image.src = draft.avatar;
      avatar.appendChild(image);
    } else {
      const name = (draft.name || "?").trim();

      let hue = 0;
      for (const character of name) {
        hue = (hue * 31 + character.charCodeAt(0)) % 360;
      }

      avatar.style.background = `hsl(${hue} 42% 36%)`;
      avatar.textContent =
        name.split(/\s+/).slice(0, 2)
          .map(word => word[0] || "")
          .join("")
          .toUpperCase() || "?";
    }

    if ($("rm")) $("rm").disabled = !draft.avatar;
  }

  function update() {
    if ($("pvName")) {
      $("pvName").textContent = (draft.name || "").trim() || "Your name";
    }

    if ($("pvSub")) {
      $("pvSub").textContent = [
        "Year " + (draft.year || ""),
        (draft.school || "").trim(),
        "Class of " + (draft.grad || "")
      ].filter(Boolean).join(" · ");
    }

    const dailyGoal = Number(draft.dailyGoal);
    const studyMinutes = Number(draft.studyMin);

    if ($("facts")) {
      $("facts").replaceChildren();

      [
        Number.isFinite(dailyGoal) && draft.dailyGoal !== ""
          ? hm(dailyGoal) + " daily goal"
          : "",
        Number.isFinite(studyMinutes) && draft.studyMin !== ""
          ? studyMinutes + " min sessions"
          : "",
        TIMES[draft.prefTime] || ""
      ].filter(Boolean).forEach(text => {
        const span = document.createElement("span");
        span.textContent = text;
        $("facts").appendChild(span);
      });
    }

    paintAvatar();

    const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

    if ($("state")) {
      $("state").textContent = dirty
        ? "You have unsaved changes"
        : "All changes saved";

      $("state").classList.toggle("dirty", dirty);
    }

    if ($("save")) $("save").disabled = !dirty;
    if ($("discard")) $("discard").disabled = !dirty;

    window.onbeforeunload = dirty
      ? event => {
          event.preventDefault();
          event.returnValue = "";
        }
      : null;
  }

  // ----- validation -----
  function validate() {
    const errors = {};

    if (!String(draft.name || "").trim()) {
      errors.name = "Enter your name.";
    }

    NUMERIC.forEach(key => {
      const [minimum, maximum, label] = RANGE[key];
      const value = draft[key];

      if (
        value === "" ||
        value === null ||
        value === undefined ||
        !Number.isFinite(Number(value)) ||
        Number(value) < minimum ||
        Number(value) > maximum
      ) {
        errors[key] =
          `${label} must be between ${minimum} and ${maximum}.`;
      }
    });

    document.querySelectorAll("[data-e]").forEach(element => {
      const key = element.dataset.e;
      element.textContent = errors[key] || "";

      const input = document.querySelector(`[data-k="${key}"]`);

      if (input) {
        input.setAttribute(
          "aria-invalid",
          errors[key] ? "true" : "false"
        );
      }
    });

    return errors;
  }

  // ----- form events -----
  document.querySelectorAll("[data-k]").forEach(element => {
    element.addEventListener("input", () => {
      const key = element.dataset.k;

      draft[key] = NUMERIC.includes(key)
        ? (element.value === "" ? "" : Number(element.value))
        : element.value;

      update();

      if (element.getAttribute("aria-invalid") === "true") {
        validate();
      }
    });
  });

  if ($("f")) {
    $("f").addEventListener("submit", event => {
      event.preventDefault();

      const errors = validate();
      const firstError = Object.keys(errors)[0];

      if (firstError) {
        document.querySelector(`[data-k="${firstError}"]`)?.focus();
        return;
      }

      draft.name = String(draft.name).trim();
      draft.school = String(draft.school || "").trim();

      NUMERIC.forEach(key => {
        draft[key] = Number(draft[key]);
      });

      const raw = readRaw();

      raw.profile = {
        ...DEF,
        ...(raw.profile || {}),
        ...draft
      };

      if (!saveRaw(raw)) {
        toast("Couldn’t save. Your browser storage may be blocked or full.");
        return;
      }

      saved = { ...draft };
      draft = { ...saved };

      fill();
      validate();
      update();
      toast("Profile saved");
    });
  }

  if ($("discard")) {
    $("discard").onclick = () => {
      draft = { ...saved };
      fill();
      validate();
      update();
    };
  }

  // ----- avatar upload -----
  if ($("pick") && $("file")) {
    $("pick").onclick = () => $("file").click();
  }

  if ($("rm")) {
    $("rm").onclick = () => {
      draft.avatar = "";
      update();
    };
  }

  if ($("file")) {
    $("file").onchange = event => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file) return;

      if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
        toast("Choose a JPG, PNG, WebP or GIF image.");
        return;
      }

      if (file.size > 8 * 1024 * 1024) {
        toast("That image is over 8 MB. Choose a smaller one.");
        return;
      }

      const reader = new FileReader();

      reader.onerror = () => toast("Couldn’t read that image.");

      reader.onload = () => {
        const image = new Image();

        image.onerror = () => toast("Couldn’t open that image.");

        image.onload = () => {
          const size = Math.min(image.width, image.height);

          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 256;

          const context = canvas.getContext("2d");

          if (!context) {
            toast("Your browser could not process that image.");
            return;
          }

          context.drawImage(
            image,
            (image.width - size) / 2,
            (image.height - size) / 2,
            size,
            size,
            0,
            0,
            256,
            256
          );

          try {
            draft.avatar = canvas.toDataURL("image/jpeg", 0.85);
            update();
          } catch (error) {
            toast("Couldn’t process that image.");
          }
        };

        image.src = reader.result;
      };

      reader.readAsDataURL(file);
    };
  }

  // ----- account information -----
  if ($("acctEmail")) {
    $("acctEmail").textContent = account.email || "No email available";
  }

  if ($("acctHow")) {
    $("acctHow").textContent = account.provider === "google"
      ? "Signed in with Google"
      : account.provider === "email"
        ? "Signed in with email and password"
        : "Signed in to Study Platform";
  }

  const handleLogout = event => {
    event.preventDefault();
    window.onbeforeunload = null;
    Auth.logout();
  };

  if ($("out")) $("out").onclick = handleLogout;
  if ($("logout")) $("logout").onclick = handleLogout;

  // ----- export data -----
  if ($("exp")) {
    $("exp").onclick = () => {
      try {
        const blob = new Blob(
          [JSON.stringify(readRaw(), null, 2)],
          { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "student-data.json";
        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (error) {
        toast("Couldn’t export your data.");
      }
    };
  }

  // ----- import data -----
  if ($("impBtn") && $("imp")) {
    $("impBtn").onclick = () => $("imp").click();
  }

  if ($("imp")) {
    $("imp").onchange = event => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file) return;

      const reader = new FileReader();

      reader.onerror = () => toast("Couldn’t read that backup file.");

      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);

          if (
            !data ||
            typeof data !== "object" ||
            Array.isArray(data) ||
            (!data.profile && !data.subjects)
          ) {
            throw new Error("Invalid backup format.");
          }

          if (
            data.profile &&
            (typeof data.profile !== "object" ||
             Array.isArray(data.profile))
          ) {
            throw new Error("Invalid profile data.");
          }

          if (!saveRaw(data)) {
            toast("Couldn’t import the backup. Browser storage may be full.");
            return;
          }

          window.onbeforeunload = null;
          location.reload();
        } catch (error) {
          toast("That file isn’t a valid Study Platform backup.");
        }
      };

      reader.readAsText(file);
    };
  }

  // ----- reset study data -----
  if ($("wipe") && $("dlg")) {
    $("wipe").onclick = () => {
      if (typeof $("dlg").showModal === "function") {
        $("dlg").showModal();
      } else {
        toast("Your browser does not support this confirmation dialog.");
      }
    };
  }

  if ($("no") && $("dlg")) {
    $("no").onclick = () => $("dlg").close();
  }

  if ($("yes")) {
    $("yes").onclick = () => {
      try {
        // Clear study data only. Keep the signed-in account and session.
        localStorage.removeItem(KEY);
      } catch (error) {
        toast("Couldn’t reset study data.");
        return;
      }

      window.onbeforeunload = null;
      location.reload();
    };
  }

  // ----- initialise -----
  fill();
  validate();
  update();
})();
