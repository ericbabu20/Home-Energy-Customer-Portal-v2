(() => {
  const SESSION_KEY = "he-session";
  const CUSTOMER_KEY = "he-customer";
  const DAY = 86400000;
  const CUSTOMERS = {
    smart: "This customer has a smart meter. Readings come in on their own.",
    offline: "This customer’s smart meter is not communicating. The last reading is still on the account.",
    trad: "This customer has a traditional meter. They can book a smart meter, and they type readings on the Meter readings page.",
  };
  const CUSTOMER_LABEL = {
    smart: "Prototype customers, smart meter",
    offline: "Prototype customers, not communicating",
    trad: "Prototype customers, traditional meter",
  };

  function customer() {
    const id = sessionStorage.getItem(CUSTOMER_KEY);
    return CUSTOMERS[id] ? id : "smart";
  }

  const customerHooks = [];
  function onCustomerChange(fn) {
    customerHooks.push(fn);
  }

  function paintCustomer() {
    const id = customer();
    document.documentElement.setAttribute("data-meter", id);
    $$("[data-customer]").forEach((btn) => btn.setAttribute("aria-checked", String(btn.dataset.customer === id)));
    const note = $("[data-customer-note]");
    if (note) note.textContent = CUSTOMERS[id];
    const toggle = $("[data-proto-toggle]");
    if (toggle) {
      toggle.setAttribute("aria-label", CUSTOMER_LABEL[id]);
    }
  }

  function setCustomer(id) {
    if (!CUSTOMERS[id] || id === customer()) return;
    sessionStorage.setItem(CUSTOMER_KEY, id);
    paintCustomer();
    customerHooks.forEach((fn) => fn(id));
  }

  /* ---------- Tariff journey prototype state ---------- */

  const TARIFF_KEY = "he-tariff";
  const TARIFF_OUTCOME_KEY = "he-tariff-outcome";
  const TARIFF_DONE_KEY = "he-tariff-done";
  const TOAST_KEY = "he-toast";
  const TARIFF_SCENARIOS = {
    change: "Change tariff",
    renewal: "Tariff renewal",
    pob: "Pay on bill to Direct Debit",
  };
  const TARIFF_NOTES = {
    change: "On a variable tariff, paying by Direct Debit. Compare tariffs is on Your tariff.",
    renewal: "On a fixed tariff that ends soon. See renewal options is on Home and Your tariff.",
    pob: "Paying on bill. Switch to Direct Debit is on Home and Your tariff.",
  };
  const TARIFF_OUTCOMES = {
    change: [
      ["ok", "Everything works"],
      ["unavailable", "Tariff is no longer available"],
      ["fail", "Tariff change fails"],
    ],
    renewal: [
      ["ok", "Everything works"],
      ["moved", "Fixed tariff ends while choosing"],
      ["closed", "Renewal window closes"],
      ["ended", "Fixed tariff has already ended"],
      ["noOptions", "No renewal options online"],
      ["fail", "Renewal fails"],
    ],
    pob: [
      ["ok", "Everything works"],
      ["inelig", "Can’t set up Direct Debit online"],
      ["bankFail", "Bank details can’t be checked"],
      ["partial", "Tariff changes, Direct Debit fails"],
      ["fail", "Everything fails"],
    ],
  };
  const TARIFFS = {
    fx1: { name: "[Fixed tariff name A]", kind: "Fixed", group: "fixed", best: true, cmp: "cheaper", diff: 353, month: 468.5, term: "Fixed for [12] months", end: "[end date]", exit: "£75 per fuel", exitFee: "£75", fuels: ["elec", "gas"], rates: { elec: [51.2, 23.1], gas: [29.62, 19.4] } },
    fx2: { name: "[Fixed tariff name B]", kind: "Fixed", group: "fixed", cmp: "more", diff: 172, month: 512.25, term: "Fixed for [24] months", end: "[end date]", exit: "£100 per fuel", exitFee: "£100", fuels: ["elec", "gas"], rates: { elec: [52.8, 25.9], gas: [30.15, 21.05] } },
    fx3: { name: "[Fixed tariff name C]", kind: "Fixed", group: "fixed", cmp: "cheaper", diff: 216, month: 479.9, term: "Fixed for [18] months", end: "[end date]", exit: "£50 per fuel", exitFee: "£50", fuels: ["elec", "gas"], rates: { elec: [50.95, 24.1], gas: [29.8, 19.85] } },
    vr1: { name: "[Variable tariff name]", kind: "Variable", group: "variable", cmp: "cheaper", diff: 95, month: 489.95, term: "Prices follow the Ofgem price cap", end: "No end date", exit: "", fuels: ["elec", "gas"], rates: { elec: [53.35, 24.5], gas: [32.67, 20.1] } },
    sm1: { name: "[Smart tariff name A]", kind: "Smart", group: "smart", cmp: "more", diff: 86, month: 505.1, term: "Fixed for [12] months", end: "[end date]", exit: "£75 per fuel", exitFee: "£75", fuels: ["elec", "gas"], dayNight: true, rates: { elec: [54.1, 30.2, 13.5], gas: [31.2, 20.9] } },
    cur: { name: "Fair Variable Dual", kind: "Variable", group: "variable", current: true, month: 497.85, term: "Prices follow the Ofgem price cap", end: "No end date", exit: "", fuels: ["elec", "gas"], dayNight: true, rates: { elec: [53.35, 29.47, 14.86], gas: [12.81, 20.76] } },
    curFixed: { name: "[Current fixed tariff name]", kind: "Fixed", group: "fixed", current: true, month: 482.4, term: "Fixed for [12] months", end: "[end date]", exit: "£60 per fuel", exitFee: "£60", fuels: ["elec", "gas"], dayNight: true, rates: { elec: [50.1, 27.8, 13.95], gas: [28.9, 18.7] } },
  };

  const gbp = (n) => `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const pence = (n) => `${n.toFixed(2)}p`;

  function tariffScenario() {
    const id = sessionStorage.getItem(TARIFF_KEY);
    return TARIFF_SCENARIOS[id] ? id : "change";
  }

  function tariffOutcome() {
    const id = sessionStorage.getItem(TARIFF_OUTCOME_KEY);
    return TARIFF_OUTCOMES[tariffScenario()].some(([value]) => value === id) ? id : "ok";
  }

  function tariffDone() {
    try {
      return JSON.parse(sessionStorage.getItem(TARIFF_DONE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function setTariffDone(patch) {
    sessionStorage.setItem(TARIFF_DONE_KEY, JSON.stringify({ ...tariffDone(), ...patch }));
  }

  const tariffHooks = [];
  function onTariffChange(fn) {
    tariffHooks.push(fn);
  }

  function paintTariffControls() {
    const scenario = tariffScenario();
    const outcome = tariffOutcome();
    $$("[data-tariff-scenario]").forEach((btn) => btn.setAttribute("aria-checked", String(btn.dataset.tariffScenario === scenario)));
    const note = $("[data-tariff-scenario-note]");
    if (note) note.textContent = TARIFF_NOTES[scenario];
    const box = $("[data-tariff-outcomes]");
    if (!box) return;
    box.replaceChildren(
      ...TARIFF_OUTCOMES[scenario].map(([value, label]) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.setAttribute("role", "radio");
        btn.dataset.tariffOutcome = value;
        btn.setAttribute("aria-checked", String(value === outcome));
        btn.textContent = label;
        return btn;
      })
    );
  }

  function changeTariffPrototype(scenario, outcome) {
    sessionStorage.setItem(TARIFF_KEY, scenario);
    if (outcome && outcome !== "ok") sessionStorage.setItem(TARIFF_OUTCOME_KEY, outcome);
    else sessionStorage.removeItem(TARIFF_OUTCOME_KEY);
    sessionStorage.removeItem(TARIFF_DONE_KEY);
    paintTariffControls();
    tariffHooks.forEach((fn) => fn());
  }

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* Split a supply address so the street can shrink and the postcode stays whole. */
  function splitAddress(fullAddress) {
    const address = String(fullAddress || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const match = address.match(/^(.*?)(?:,\s*)?([A-Z]{1,2}\d[A-Z\d]{0,2})\s+(\d[A-Z]{2})$/i);
    if (!match) return { address, start: address, postcode: "" };
    return {
      address,
      start: match[1].replace(/[\s,]+$/, ""),
      postcode: `${match[2].toUpperCase()} ${match[3].toUpperCase()}`,
    };
  }

  /* ---------- Toast ---------- */

  let toastTimer;
  function toast(message) {
    const el = $("[data-toast]");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  /* ---------- Appearance ---------- */

  function syncThemeControls() {
    const pref = window.HETheme.get();
    $$("[data-theme-control] [data-theme-value]").forEach((btn) => {
      btn.setAttribute("aria-checked", String(btn.dataset.themeValue === pref));
    });
  }

  function initTheme() {
    $$("[data-theme-control]").forEach((group) => {
      group.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-theme-value]");
        if (!btn) return;
        window.HETheme.set(btn.dataset.themeValue);
        syncThemeControls();
      });

      group.addEventListener("keydown", (e) => {
        if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
        const items = $$("[data-theme-value]", group);
        const i = items.indexOf(document.activeElement);
        if (i < 0) return;
        const next = items[(i + (e.key === "ArrowRight" ? 1 : items.length - 1)) % items.length];
        next.focus();
        next.click();
        e.preventDefault();
      });
    });
    syncThemeControls();
  }

  /* ---------- Session (demo only) ---------- */

  const session = {
    get() {
      try {
        return JSON.parse(sessionStorage.getItem(SESSION_KEY));
      } catch (_) {
        return null;
      }
    },
    start(email, single) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email, at: Date.now(), single: !!single }));
      if (single) sessionStorage.setItem("he-supply-id", "sandon");
    },
    end() {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem("he-supply-id");
    },
    single() {
      return !!this.get()?.single;
    },
  };

  /* ---------- Sign-in page ---------- */

  function initLogin() {
    const form = $("[data-login]");
    if (!form) return;
    if (session.get()) {
      location.replace("portal.html");
      return;
    }

    const email = $("#email");
    const password = $("#password");

    function setError(input, message) {
      const hint = $("#" + input.getAttribute("aria-describedby"));
      input.setAttribute("aria-invalid", message ? "true" : "false");
      if (hint) hint.textContent = message;
    }

    function validate() {
      let ok = true;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        setError(email, "Enter an email address like name@example.com.");
        ok = false;
      } else setError(email, "");

      if (password.value.length < 6) {
        setError(password, "Enter a password with at least 6 characters.");
        ok = false;
      } else setError(password, "");
      return ok;
    }

    [email, password].forEach((input) =>
      input.addEventListener("input", () => {
        if (input.getAttribute("aria-invalid") === "true") validate();
      })
    );

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validate()) {
        form.querySelector('[aria-invalid="true"]')?.focus();
        return;
      }
      session.start(email.value.trim());
      location.href = "portal.html";
    });

    $("[data-demo-login]")?.addEventListener("click", () => {
      session.start("demo@homeenergy.co.uk");
      location.href = "portal.html";
    });

    $("[data-solo-login]")?.addEventListener("click", () => {
      session.start("solo@homeenergy.co.uk", true);
      location.href = "portal.html";
    });

    $("[data-reveal]")?.addEventListener("click", (e) => {
      const btn = e.currentTarget;
      const show = password.type === "password";
      password.type = show ? "text" : "password";
      btn.textContent = show ? "Hide" : "Show";
      btn.setAttribute("aria-pressed", String(show));
    });
  }

  /* ---------- Portal ---------- */

  function formatDate(d) {
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }

  function formatRange(a, b) {
    const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
    if (sameMonth) {
      return `${a.getDate()}\u2013${formatDate(b)}`;
    }
    return `${a.toLocaleDateString("en-GB", { day: "numeric", month: "long" })} \u2013 ${formatDate(b)}`;
  }

  function supplyTarget() {
    let t = Number(sessionStorage.getItem("he-supply-at"));
    if (!t || t < Date.now()) {
      t = Date.now() + 8 * DAY + 6 * 3600000 + 41 * 60000;
      sessionStorage.setItem("he-supply-at", String(t));
    }
    return t;
  }

  function initDates(target) {
    const signedUpAt = target - 10 * DAY;
    const supply = new Date(target);
    const started = new Date(signedUpAt);
    const windowStart = new Date(signedUpAt + 2 * DAY);
    const windowEnd = new Date(target + 5 * DAY);
    const values = {
      supply: formatDate(supply),
      started: formatDate(started),
      window: formatRange(windowStart, windowEnd),
    };
    $$("[data-date]").forEach((el) => {
      el.textContent = values[el.dataset.date] || "";
    });
  }

  function initCountdown(target) {
    const root = $("[data-countdown]");
    if (!root) return;
    const parts = {
      d: $('[data-cd="d"]', root),
      h: $('[data-cd="h"]', root),
      m: $('[data-cd="m"]', root),
      s: $('[data-cd="s"]', root),
    };
    const pad = (n) => String(n).padStart(2, "0");
    const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

    function tick() {
      const left = Math.max(0, Math.floor((target - Date.now()) / 1000));
      const d = Math.floor(left / 86400);
      const h = Math.floor((left % 86400) / 3600);
      const m = Math.floor((left % 3600) / 60);
      const s = left % 60;
      parts.d.textContent = pad(d);
      parts.h.textContent = pad(h);
      parts.m.textContent = pad(m);
      parts.s.textContent = pad(s);
      const text = `${plural(d, "day")} ${plural(h, "hour")}`;
      $$("[data-cd-text]").forEach((el) => (el.textContent = text));
      root.setAttribute("aria-label", `Your supply starts in ${text}`);
    }

    tick();
    setInterval(tick, 1000);
  }

  function initMenu() {
    const sheet = $("[data-menu]");
    const opener = $("[data-menu-open]");
    if (!sheet || !opener) return;
    const backdrop = $(".sheet-backdrop");

    function open() {
      sheet.classList.add("open");
      backdrop.classList.add("open");
      opener.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
      setTimeout(() => $("[data-menu-close]", sheet)?.focus(), 50);
    }

    function close() {
      if (!sheet.classList.contains("open")) return;
      sheet.classList.remove("open");
      backdrop.classList.remove("open");
      opener.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      opener.focus();
    }

    opener.addEventListener("click", open);
    $$("[data-menu-close]").forEach((el) => el.addEventListener("click", close));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab" && sheet.classList.contains("open")) {
        const focusables = $$("a[href], button:not([disabled])", sheet);
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 1080) close();
    });
  }

  function initAddress() {
    const dialog = $("[data-address-dialog]");
    const backdrop = $(".address-backdrop");
    if (!dialog || !backdrop) return;

    const KEY = "he-supply-id";
    let opener = null;

    function storedId() {
      if (session.single()) return "sandon";
      try {
        return sessionStorage.getItem(KEY) || "sandon";
      } catch (_) {
        return "sandon";
      }
    }

    let fullAddress = "";

    function lineParts(el) {
      let start = el.querySelector(".value-start");
      let postcode = el.querySelector(".value-postcode");
      if (!start || !postcode) {
        el.replaceChildren();
        start = document.createElement("span");
        start.className = "value-start";
        postcode = document.createElement("span");
        postcode.className = "value-postcode";
        el.append(start, postcode);
      }
      return { start, postcode };
    }

    function fitSupplyLine(el, parts) {
      const street = parts.start || parts.address;
      const tail = parts.postcode ? `, ${parts.postcode}` : "";
      const { start, postcode } = lineParts(el);
      postcode.textContent = tail;
      if (el.clientWidth <= 0) {
        start.textContent = street;
        return;
      }
      const room = el.clientWidth - postcode.offsetWidth;
      if (room <= 8) {
        start.textContent = "";
        postcode.textContent = parts.postcode || street;
        return;
      }
      start.textContent = street;
      if (start.scrollWidth <= room) return;
      let low = 0;
      let high = street.length;
      let best = "…";
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const candidate = `${street.slice(0, mid).replace(/[\s,]+$/, "")}…`;
        start.textContent = candidate;
        if (start.scrollWidth <= room) {
          best = candidate;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      start.textContent = best;
    }

    function showAddress(full) {
      const parts = splitAddress(full);
      fullAddress = parts.address;
      $$("[data-supply-line]").forEach((el) => {
        el.title = fullAddress;
        el.dataset.addressFull = fullAddress;
        if (el.closest(".address-chip")) {
          el.textContent = fullAddress;
          return;
        }
        fitSupplyLine(el, parts);
      });
      $$("[data-site-address]").forEach((el) => {
        el.textContent = fullAddress;
      });
      const chip = $(".address-chip");
      if (chip) chip.setAttribute("aria-label", `Supply address ${fullAddress}`);
    }

    function applyAvailability() {
      const single = session.single();
      $$("[data-address-open]").forEach((btn) => {
        const line = $(".value", btn)?.dataset.addressFull || $(".value", btn)?.textContent?.trim() || "";
        btn.disabled = single;
        btn.setAttribute("aria-disabled", String(single));
        if (single) {
          btn.removeAttribute("aria-haspopup");
          btn.removeAttribute("aria-controls");
          btn.setAttribute("aria-expanded", "false");
          btn.setAttribute(
            "aria-label",
            `Supply address ${line}. This is your only supply address, so it can't be changed.`
          );
          btn.title = "You only have one supply address";
        } else {
          btn.disabled = false;
          btn.setAttribute("aria-haspopup", "dialog");
          btn.setAttribute("aria-controls", "address-dialog");
          btn.setAttribute("aria-label", `Supply address ${line}`);
          btn.removeAttribute("title");
        }
      });
    }

    function inputFor(id) {
      return $(`input[name="supply-address"][value="${id}"]`, dialog);
    }

    function chosen() {
      return $('input[name="supply-address"]:checked', dialog);
    }

    function syncApply() {
      const apply = $("[data-address-apply]", dialog);
      const pick = chosen();
      if (!apply || !pick) return;
      const same = pick.value === storedId();
      apply.disabled = same;
      apply.textContent = same ? "Already selected" : "Switch to this address";
    }

    function paint(id) {
      const input = inputFor(id) || chosen();
      if (!input) return;
      showAddress(input.dataset.full);
      const accountEl = $("[data-account]");
      if (accountEl) accountEl.textContent = input.dataset.account;
      const copy = $("[data-copy]");
      if (copy) copy.dataset.copy = input.dataset.account;
      $$(".address-option", dialog).forEach((label) => {
        const radio = $("input", label);
        label.classList.toggle("is-current", radio && radio.value === input.value);
      });
      input.checked = true;
      try {
        sessionStorage.setItem(KEY, input.value);
      } catch (_) {}
      syncApply();
      applyAvailability();
    }

    function open(from) {
      if (session.single()) return;
      opener = from;
      const current = inputFor(storedId());
      if (current) current.checked = true;
      syncApply();
      dialog.classList.add("open");
      dialog.setAttribute("aria-hidden", "false");
      backdrop.classList.add("open");
      $$("[data-address-open]").forEach((btn) => {
        btn.setAttribute("aria-expanded", String(btn === from));
      });
      document.body.style.overflow = "hidden";
      setTimeout(() => (current || chosen() || $("[data-address-close]", dialog))?.focus(), 50);
    }

    function close() {
      if (!dialog.classList.contains("open")) return;
      dialog.classList.remove("open");
      dialog.setAttribute("aria-hidden", "true");
      backdrop.classList.remove("open");
      $$("[data-address-open]").forEach((btn) => btn.setAttribute("aria-expanded", "false"));
      document.body.style.overflow = "";
      if (opener) opener.focus();
    }

    paint(storedId());
    const addressWatcher = new ResizeObserver(() => {
      if (!fullAddress) return;
      const parts = splitAddress(fullAddress);
      $$(".address-picker [data-supply-line]").forEach((el) => fitSupplyLine(el, parts));
    });
    $$(".address-picker").forEach((picker) => addressWatcher.observe(picker));

    $$("[data-address-open]").forEach((btn) => {
      btn.addEventListener("click", () => open(btn));
    });
    $$("[data-address-close]").forEach((el) => el.addEventListener("click", close));
    dialog.addEventListener("change", (e) => {
      if (e.target.name === "supply-address") syncApply();
    });
    $("[data-address-apply]", dialog)?.addEventListener("click", () => {
      const pick = chosen();
      if (!pick || pick.value === storedId()) return;
      paint(pick.value);
      toast("Supply address updated");
      close();
    });
    document.addEventListener("keydown", (e) => {
      if (!dialog.classList.contains("open")) return;
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = $$("input, button:not([disabled])", dialog);
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    });
  }

  function initHeaderEdge() {
    const header = $("[data-header]");
    if (!header) return;
    const update = () => header.classList.toggle("is-scrolled", window.scrollY > 4);
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  function initTips() {
    const row = $("[data-tips]");
    const dots = $$("[data-dots] span");
    if (!row || !dots.length) return;
    row.addEventListener(
      "scroll",
      () => {
        const card = row.firstElementChild;
        if (!card) return;
        const step = card.getBoundingClientRect().width + 12;
        const i = Math.min(dots.length - 1, Math.round(row.scrollLeft / step));
        dots.forEach((d, n) => d.classList.toggle("on", n === i));
      },
      { passive: true }
    );
  }

  function initCopy() {
    document.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-copy]");
      if (!btn) return;
      const value = btn.dataset.copy;
      const label = btn.dataset.copyLabel || "Account number";
      try {
        await navigator.clipboard.writeText(value);
        toast(`${label} ${value} copied`);
      } catch (_) {
        toast(`${label}: ${value}`);
      }
    });
  }

  function initReadings() {
    const root = $("[data-readings]");
    if (!root) return;

    const fuels = {
      elec: {
        historyTitle: "Meter reading history",
        pointLabel: "Meter Point Administration Number",
        serial: "22L4399661",
        point: "1100018058472",
        date: "25 Apr 2026",
        figures: [
          { label: "Last reading - Day", value: "35,137", unit: "kWh" },
          { label: "Last reading - Night", value: "17,851", unit: "kWh" },
        ],
        history: [
          { date: "25 Apr 2026", src: "Last reading on your account", rows: [["Day Reading", "35,137 kWh"], ["Night Reading", "17,851 kWh"]] },
          { date: "15 Mar 2026", src: "Submitted by your smart meter", rows: [["Day Reading", "34,891 kWh"], ["Night Reading", "17,604 kWh"]] },
          { date: "18 Feb 2026", src: "Submitted by you", rows: [["Day Reading", "34,522 kWh"], ["Night Reading", "17,238 kWh"]] },
          { date: "15 Jan 2026", src: "Submitted by your smart meter", rows: [["Day Reading", "34,129 kWh"], ["Night Reading", "16,941 kWh"]] },
          { date: "15 Dec 2025", src: "Submitted by your smart meter", rows: [["Day Reading", "33,872 kWh"], ["Night Reading", "16,774 kWh"]] },
          { date: "15 Nov 2025", src: "Estimated based on your past usage", rows: [["Day Reading", "33,497 kWh"], ["Night Reading", "16,567 kWh"]] },
        ],
      },
      gas: {
        historyTitle: "Meter reading history",
        pointLabel: "Meter Point Reference Number",
        serial: "G4A00918273",
        point: "7400193826",
        date: "23 September 2026",
        figures: [{ label: "Last reading", value: "8,462", unit: "m³" }],
        history: [
          { date: "23 Sep 2026", src: "Submitted by your smart meter", rows: [["Reading", "8,462 m³"]] },
          { date: "23 Aug 2026", src: "Submitted by your smart meter", rows: [["Reading", "8,431 m³"]] },
          { date: "23 Jul 2026", src: "Submitted by your smart meter", rows: [["Reading", "8,405 m³"]] },
          { date: "23 Jun 2026", src: "Submitted by you", rows: [["Reading", "8,377 m³"]] },
        ],
      },
    };

    const copyIcon =
      '<svg class="icon" viewBox="0 0 15 15" aria-hidden="true"><rect x="4.5" y="4.5" width="9" height="9" rx="2" /><path d="M10.5 2.5v-.5A1 1 0 0 0 9.5 1H2a1 1 0 0 0-1 1v7.5a1 1 0 0 0 1 1h.5" /></svg>';
    const gaugeIcon =
      '<svg class="icon" viewBox="0 0 18 18" aria-hidden="true"><path d="M3.2 12.2a5.8 5.8 0 1 1 11.6 0" /><path d="M9 12.2 12.2 8" /><circle cx="9" cy="12.2" r="1" fill="currentColor" stroke="none" /></svg>';
    const calIcon =
      '<svg class="icon" viewBox="0 0 18 18" aria-hidden="true"><rect x="3" y="4" width="12" height="11" rx="2" /><path d="M3 8h12M6.5 2.5v3M11.5 2.5v3" /></svg>';
    const pageSize = 4;
    let fuel = "elec";
    let shown = pageSize;

    const figures = $("[data-figures]", root);
    const ids = $("[data-ids]", root);
    const list = $("[data-history-list]", root);
    const more = $("[data-load-more]", root);
    const panel = $("#history-panel");
    const toggle = $(".history-toggle", root);
    const chev = $("[data-history-chev]", root);

    function paint() {
      const data = fuels[fuel];
      $("[data-meter-date]", root).textContent = data.date;
      $("[data-history-title]", root).textContent = data.historyTitle;
      $("[data-history-serial]", root).textContent = data.serial;
      figures.classList.toggle("single", data.figures.length === 1);
      figures.innerHTML = data.figures
        .map(
          (f) =>
            `<div class="figure"><span>${f.label}</span><strong>${f.value} <em>${f.unit}</em></strong></div>`
        )
        .join("");
      const offline = customer() === "offline";
      const tradCustomer = customer() === "trad";
      const chip = $("[data-meter-chip]", root);
      if (chip) {
        chip.classList.toggle("is-quiet", offline);
        $("[data-meter-dot]", root).classList.toggle("is-quiet", offline);
        $("[data-meter-chip-text]", root).textContent = tradCustomer ? "Traditional meter" : offline ? "Not communicating" : "Smart meter connected";
        $("[data-meter-headline]", root).textContent = tradCustomer
          ? "Enter your meter reading"
          : offline
            ? "We can’t connect to your smart meter"
            : "Your smart meter is sending us readings";
        $("[data-meter-lead]", root).hidden = tradCustomer;
        $("[data-meter-lead]", root).textContent = offline
          ? `Last meter reading received on ${data.date}.`
          : "We’re receiving readings automatically, so you don’t need to submit them manually";
        figures.hidden = tradCustomer;
        chip.hidden = tradCustomer;
        $("[data-meter-when]", root).hidden = offline || tradCustomer;
        const manual = $("[data-offline-submit]", root);
        manual.hidden = !offline;
        manual.textContent = root.classList.contains("is-manual") ? "Hide manual reading" : "Submit a reading manually";
      }
      const shortPoint = data.pointLabel.startsWith("Meter Point Reference") ? "MPRN" : "MPAN";
      const rows = [
        [shortPoint, data.point, data.pointLabel],
        ["Meter serial number", data.serial, "Meter serial number"],
      ];
      ids.innerHTML = rows
        .map(
          ([label, value, name]) =>
            `<div class="id-tile"><div><span class="id-kicker">${label}</span><b>${value}</b></div><button type="button" class="copy-sq" data-copy="${value}" data-copy-label="${name}" aria-label="Copy ${name}">${copyIcon}</button></div>`
        )
        .join("");
      list.innerHTML = data.history
        .map((item, i) => {
            const src = customer() === "trad" ? item.src.replace("Submitted by your smart meter", "Submitted by you") : item.src;
            const cells = item.rows
            .map(
              ([label, value]) =>
                `<div class="hist-row"><span class="hist-label">${label}</span><span class="hist-value">${value}</span><span class="hist-src">${src}</span></div>`
            )
            .join("");
          return `<article class="hist"${i >= shown ? " hidden" : ""}><div class="hist-date"><span>${item.date}</span><span class="hist-src-mobile">${src}</span></div><div class="hist-grid${item.rows.length === 1 ? " single" : ""}">${cells}</div></article>`;
        })
        .join("");
      more.hidden = shown >= data.history.length;
      if (customer() === "trad") renderTrad();
    }

    $$("[data-fuel]", root).forEach((btn) => {
      btn.addEventListener("click", () => {
        fuel = btn.dataset.fuel;
        shown = pageSize;
        $$("[data-fuel]", root).forEach((other) => other.setAttribute("aria-checked", String(other === btn)));
        paint();
      });
    });

    root.querySelector(".fuel").addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const buttons = $$("[data-fuel]", root);
      const next = buttons[(buttons.indexOf(document.activeElement) + (e.key === "ArrowRight" ? 1 : buttons.length - 1)) % buttons.length];
      next.focus();
      next.click();
      e.preventDefault();
    });

    function toggleHistory() {
      const open = panel.hidden;
      panel.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
      chev.classList.toggle("is-open", open);
    }

    toggle.addEventListener("click", toggleHistory);
    $(".history-chev-btn", root).addEventListener("click", toggleHistory);

    more.addEventListener("click", () => {
      shown = fuels[fuel].history.length;
      paint();
    });

    $("[data-download]", root).addEventListener("click", () => {
      const data = fuels[fuel];
      const head = data.figures.length > 1 ? ["Date", "Day reading", "Night reading", "Source"] : ["Date", "Reading", "Source"];
      const lines = [head.join(",")].concat(
        data.history.map((item) => {
          const values = item.rows.map((row) => row[1]);
          const src = customer() === "trad" ? item.src.replace("Submitted by your smart meter", "Submitted by you") : item.src;
          return [item.date, ...values, src].map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",");
        })
      );
      const blob = new Blob([lines.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fuel === "gas" ? "gas-meter-readings.csv" : "electricity-meter-readings.csv";
      link.click();
      URL.revokeObjectURL(url);
      toast("Meter reading history downloaded");
    });

    const registers = {
      elec: [
        { k: "day", label: "DY-Day reading", last: 35137, date: "25 April 2026", unit: "kWh", hi: 3000 },
        { k: "night", label: "NT-Night reading", last: 17851, date: "25 April 2026", unit: "kWh", hi: 3000 },
      ],
      gas: [{ k: "gas", label: "Enter reading", last: 8462, date: "23 September 2026", unit: "m³", hi: 500 }],
    };
    const trad = {
      elec: { values: {}, touched: {}, tried: false, confirm: false, done: false, res: [] },
      gas: { values: {}, touched: {}, tried: false, confirm: false, done: false, res: [] },
      help: false,
    };
    const fmt = (n) => n.toLocaleString("en-GB");

    function checkReading(reg, raw) {
      const name = reg.k === "day" || reg.k === "night" ? `${reg.k} ` : "";
      const text = (raw || "").trim().replace(/,/g, "");
      if (!text) return { type: "err", message: `Enter your ${name}reading` };
      if (!/^\d+$/.test(text)) return { type: "err", message: "Use numbers only. Don’t include spaces, letters or decimal points" };
      if (text.length > 8) return { type: "err", message: "A reading can’t be longer than 8 digits" };
      const n = Number(text);
      if (n < reg.last) {
        return { type: "err", message: `This is lower than your previous ${name}reading of ${fmt(reg.last)} ${reg.unit}. Check the number and try again` };
      }
      if (n - reg.last > reg.hi) return { type: "warn", message: "This is much higher than usual. Check the number, or submit it if it’s right", n };
      return { type: "ok", n };
    }

    function renderTrad() {
      const box = $("[data-trad-only]", root);
      if (!box) return;
      const regs = registers[fuel];
      const state = trad[fuel];
      const results = regs.map((reg) => ({ reg, result: checkReading(reg, state.values[reg.k]) }));
      const errs = results.filter((item) => item.result.type === "err").map((item) => item.result.message);
      const warn = results.some((item) => item.result.type === "warn");
      const alert = $("[data-trad-alert]", root);
      alert.hidden = !(state.tried && errs.length);
      $("[data-trad-errs]", root).innerHTML = errs.map((message) => `<li>${message}</li>`).join("");
      const fields = $("[data-trad-fields]", root);
      fields.classList.toggle("single", regs.length === 1);
      fields.hidden = state.done;
      fields.innerHTML = results
        .map(({ reg, result }) => {
          const show = (state.tried || state.touched[reg.k]) && result.type !== "ok";
          const tone = !show ? "" : result.type === "warn" ? " is-warn" : " is-err";
          const name = reg.label;
          return `<div class="trad-field">
            <h3>${name}</h3>
            <div class="trad-entry${tone}${!show && state.touched[reg.k] && result.type === "ok" ? " is-ok" : ""}">
              <input data-trad-input="${reg.k}" inputmode="numeric" autocomplete="off" placeholder="Enter reading" aria-label="${name} in ${reg.unit}" value="${state.values[reg.k] || ""}" />
              <em>${reg.unit}</em>
            </div>
            <p class="trad-field-msg${result.type === "warn" ? " is-warn" : ""}"${show ? "" : " hidden"}>${result.message || ""}</p>
            <p class="trad-hint">Previous reading <b>${fmt(reg.last)} ${reg.unit}</b> on ${reg.date}</p>
          </div>`;
        })
        .join("");
      const actions = $("[data-trad-actions]", root);
      actions.hidden = state.done;
      $("[data-trad-submit]", root).textContent = state.confirm && warn ? "Yes, submit reading" : "Submit reading";
      $("[data-trad-edit]", root).hidden = !(state.confirm && warn);
      const help = $("[data-trad-help-panel]", root);
      help.hidden = !trad.help;
      $("[data-trad-help]", root).setAttribute("aria-expanded", String(trad.help));
      const steps =
        fuel === "gas"
          ? ["Find the meter box", "Skip red digits and decimals", "Use the m³ figure"]
          : ["Find the meter cupboard", "Skip red digits", "DY is day, NT is night"];
      $("[data-trad-steps]", root).innerHTML = steps.map((text, i) => `<li><span>${i + 1}</span><p>${text}</p></li>`).join("");
      const done = $("[data-trad-done]", root);
      done.hidden = !state.done;
      $("[data-trad-res]", root).innerHTML = state.res
        .map((item) => `<div><span>${item.label}</span><b>${item.value}</b></div>`)
        .join("");
    }

    let manualOpen = false;

    function applyCustomerMode() {
      const id = customer();
      if (id !== "offline") manualOpen = false;
      root.classList.toggle("is-trad", id === "trad");
      root.classList.toggle("is-offline", id === "offline");
      root.classList.toggle("is-manual", id === "offline" && manualOpen);
      if (id === "trad" || (id === "offline" && manualOpen)) renderTrad();
      paint();
    }

    root.addEventListener("input", (e) => {
      const input = e.target.closest("[data-trad-input]");
      if (!input) return;
      trad[fuel].values[input.dataset.tradInput] = input.value;
      trad[fuel].confirm = false;
      $("[data-trad-submit]", root).textContent = "Submit reading";
      $("[data-trad-edit]", root).hidden = true;
    });

    root.addEventListener("focusout", (e) => {
      const input = e.target.closest("[data-trad-input]");
      if (!input || !input.value.trim()) return;
      trad[fuel].touched[input.dataset.tradInput] = true;
      if (e.relatedTarget && e.relatedTarget.closest("[data-trad-submit], [data-trad-edit], [data-trad-help], [data-fuel]")) return;
      renderTrad();
    });

    root.addEventListener("click", (e) => {
      if (e.target.closest("[data-offline-submit]")) {
        manualOpen = !manualOpen;
        applyCustomerMode();
        if (manualOpen) $("[data-trad-only]", root)?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (customer() !== "trad" && !(customer() === "offline" && manualOpen)) return;
      if (e.target.closest("[data-trad-help]")) {
        trad.help = !trad.help;
        renderTrad();
        return;
      }
      if (e.target.closest("[data-trad-edit]")) {
        trad[fuel].confirm = false;
        renderTrad();
        return;
      }
      if (e.target.closest("[data-trad-reset]")) {
        trad[fuel] = { values: {}, touched: {}, tried: false, confirm: false, done: false, res: [] };
        renderTrad();
        return;
      }
      if (!e.target.closest("[data-trad-submit]")) return;
      const state = trad[fuel];
      const results = registers[fuel].map((reg) => ({ reg, result: checkReading(reg, state.values[reg.k]) }));
      if (results.some((item) => item.result.type === "err")) {
        state.tried = true;
        renderTrad();
        return;
      }
      if (results.some((item) => item.result.type === "warn") && !state.confirm) {
        state.tried = true;
        state.confirm = true;
        renderTrad();
        return;
      }
      state.done = true;
      state.res = results.map(({ reg, result }) => ({
        label: reg.label.replace("Enter reading", "Reading"),
        value: `${fmt(result.n)} ${reg.unit}`,
      }));
      renderTrad();
    });

    onCustomerChange(applyCustomerMode);
    applyCustomerMode();
  }

  function initBills() {
    const root = $("[data-bills]");
    if (!root) return;

    const bolt = '<svg class="icon" viewBox="0 0 18 18" aria-hidden="true"><path d="M10.2 1.2 3.4 10.2h4.2L7.2 16.8l7.4-9.6H10z" /></svg>';
    const flame = '<svg class="icon" viewBox="0 0 18 18" aria-hidden="true"><path d="M9 16.2c2.6-1.6 4.2-4 4.2-6.6 0-2.2-1.1-3.6-2.2-5.1-.3 1.8-1.2 2.6-2 2.6.2-2.2-.6-4-2.2-5.6-.2 2.6-.8 4.1-2.2 5.5C3.4 8.4 2.6 9.8 2.6 11.4c0 3 2.6 4.8 6.4 4.8z" /></svg>';
    const dlIcon = '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5v7M4.8 6.8 8 10l3.2-3.2M3 13h10" /></svg>';
    const pageSize = 10;
    const files = new Map();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const plan = new URLSearchParams(location.search).get("plan") === "bill" ? "bill" : "dd";

    const transactions = [
      { date: "2025-06-15", label: "15th June 2025", kind: "payment", text: "Direct Debit payment of £116 received", amount: "14.23", dir: "CR" },
      { date: "2025-06-14", label: "14th June 2025", kind: "bill", text: "We billed you £90.04", amount: "9.38", dir: "DR" },
      { date: "2025-06-14", label: "14th June 2025", kind: "bill", text: "We billed you £90.04", amount: "84.38", dir: "DR" },
      { date: "2025-06-14", label: "14th June 2025", kind: "bill", text: "We billed you £90.04", amount: "9.38", dir: "CR" },
      { date: "2025-06-13", label: "13th June 2025", kind: "payment", text: "Bank transfer of £100 received", amount: "34.38", dir: "CR" },
      { date: "2025-06-12", label: "12th June 2025", kind: "payment", text: "Direct Debit payment of £116 received", amount: "9.38", dir: "CR" },
      { date: "2025-06-12", label: "12th June 2025", kind: "payment", text: "Bank transfer of £100 received", amount: "9.38", dir: "CR" },
      { date: "2025-06-12", label: "12th June 2025", kind: "payment", text: "Bank transfer of £100 received", amount: "9.38", dir: "DR" },
      { date: "2025-06-14", label: "14th June 2025", kind: "bill", text: "We billed you £90.04", amount: "9.38", dir: "CR" },
      { date: "2025-05-15", label: "15th May 2025", kind: "payment", text: "Direct Debit payment of £116 received", amount: "25.40", dir: "CR" },
      { date: "2025-05-14", label: "14th May 2025", kind: "bill", text: "We billed you £90.04", amount: "90.60", dir: "DR" },
      { date: "2025-04-15", label: "15th April 2025", kind: "payment", text: "Direct Debit payment of £116 received", amount: "0.56", dir: "CR" },
      { date: "2025-04-12", label: "12th April 2025", kind: "payment", text: "Bank transfer of £100 received", amount: "116.56", dir: "DR" },
      { date: "2025-03-14", label: "14th March 2025", kind: "bill", text: "We billed you £90.04", amount: "16.56", dir: "DR" },
      { date: "2025-03-12", label: "12th March 2025", kind: "payment", text: "Direct Debit payment of £116 received", amount: "73.48", dir: "CR" },
    ];

    const bills = [
      { date: "2025-10-25", label: "25th October 2025", inv: "INV-2025-2685", total: "407.21", elec: "226.25", gas: "180.96" },
      { date: "2025-09-20", label: "20th September 2025", inv: "INV-2025-5174", total: "400.24", elec: "207.85", gas: "192.39" },
      { date: "2025-08-15", label: "15th August 2025", inv: "INV-2025-0258", total: "409.59", elec: "219.24", gas: "190.35" },
      { date: "2025-07-12", label: "12th July 2025", inv: "INV-2025-0301", total: "398.27", elec: "211.07", gas: "187.20" },
      { date: "2025-06-08", label: "8th June 2025", inv: "INV-2025-0347", total: "398.27", elec: "211.07", gas: "187.20" },
      { date: "2025-05-04", label: "4th May 2025", inv: "INV-2025-0401", total: "404.25", elec: "224.40", gas: "179.85" },
      { date: "2025-04-03", label: "3rd April 2025", inv: "INV-2025-0512", total: "427.03", elec: "248.45", gas: "178.58" },
      { date: "2025-03-03", label: "3rd March 2025", inv: "INV-2025-0201", total: "412.10", elec: "230.00", gas: "182.10" },
      { date: "2025-02-04", label: "4th February 2025", inv: "INV-2025-0144", total: "389.55", elec: "210.20", gas: "179.35" },
      { date: "2025-01-06", label: "6th January 2025", inv: "INV-2025-0088", total: "421.40", elec: "240.10", gas: "181.30" },
      { date: "2024-12-05", label: "5th December 2024", inv: "INV-2024-0612", total: "398.90", elec: "215.40", gas: "183.50" },
      { date: "2024-11-04", label: "4th November 2024", inv: "INV-2024-0550", total: "405.12", elec: "222.00", gas: "183.12" },
      { date: "2024-10-06", label: "6th October 2024", inv: "INV-2024-0488", total: "392.70", elec: "208.15", gas: "184.55" },
      { date: "2024-09-08", label: "8th September 2024", inv: "INV-2024-0410", total: "410.33", elec: "225.00", gas: "185.33" },
      { date: "2024-08-05", label: "5th August 2024", inv: "INV-2024-0333", total: "386.40", elec: "200.10", gas: "186.30" },
    ];

    let txShown = pageSize;
    let billShown = pageSize;
    let txNewest = true;
    let billNewest = true;
    let filter = "all";
    let tab = "history";

    const txList = $("[data-tx-list]", root);
    const billList = $("[data-bill-list]", root);
    const txMore = $("[data-tx-more]", root);
    const billMore = $("[data-bill-more]", root);
    const txEmpty = $("[data-tx-empty]", root);
    const filterMenu = $("#tx-filter");
    const filterBtn = $("[data-filter-open]", root);

    function ordered(list, newest) {
      return list
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
          const diff = a.item.date.localeCompare(b.item.date);
          if (diff !== 0) return newest ? -diff : diff;
          return a.index - b.index;
        })
        .map((row) => row.item);
    }

    function saveFile(id, name, lines) {
      files.set(id, { name, body: lines.join("\n") });
      return id;
    }

    function paintTx() {
      const matched = ordered(
        transactions.filter((item) => filter === "all" || item.kind === filter),
        txNewest
      );
      txList.innerHTML = matched
        .map((item, i) => {
          const word = item.dir === "CR" ? "in credit" : "in debit";
          const cls = item.dir === "CR" ? "is-credit" : "is-debit";
          const id = `tx-${i}`;
          const download = item.kind === "bill"
            ? `<button type="button" class="tx-download" data-file="${saveFile(id, "bill.txt", [item.label, item.text, "Balance £" + item.amount + " " + item.dir + " (" + word + ")"])}">Download ${dlIcon}</button>`
            : "";
          return `<article class="tx"${i >= txShown ? " hidden" : ""}><div><p class="tx-date"><time datetime="${item.date}">${item.label}</time></p><p class="tx-desc">${item.text}</p></div><div class="tx-side"><p class="tx-bal ${cls}">£${item.amount} ${item.dir}<span class="sr-only">, ${word}</span></p>${download}</div></article>`;
        })
        .join("");
      const visible = Math.min(txShown, matched.length);
      $("[data-tx-count]", root).textContent = `Showing ${visible} of ${matched.length} transaction${matched.length === 1 ? "" : "s"}`;
      txMore.hidden = visible >= matched.length;
      txEmpty.hidden = matched.length > 0;
    }

    function paintBills() {
      const matched = ordered(bills, billNewest);
      billList.innerHTML = matched
        .map((item, i) => {
          const id = `bill-${item.inv}`;
          saveFile(id, `${item.inv}.txt`, [
            item.label,
            item.inv,
            `Total £${item.total}`,
            `Electricity £${item.elec}`,
            `Gas £${item.gas}`,
          ]);
          return `<article class="bill-card"${i >= billShown ? " hidden" : ""}><div class="bill-card-top"><div><p class="bill-date"><time datetime="${item.date}">${item.label}</time></p><p class="bill-inv">${item.inv}</p></div><button type="button" class="bill-dl" data-file="${id}">Download bill ${dlIcon}</button></div><p class="bill-total">£${item.total}</p><p class="bill-split"><span><span class="fuel-tile" aria-hidden="true">${bolt}</span>Electricity £${item.elec}</span><span><span class="fuel-tile" aria-hidden="true">${flame}</span>Gas £${item.gas}</span></p></article>`;
        })
        .join("");
      const visible = Math.min(billShown, matched.length);
      $("[data-bill-count]", root).textContent = `Showing ${visible} of ${matched.length} bills`;
      billMore.hidden = visible >= matched.length;
    }

    $$("[data-plan]", root).forEach((el) => {
      el.hidden = el.dataset.plan !== plan;
    });
    const planLink = $("[data-plan-link]", root);
    planLink.innerHTML = plan === "bill"
      ? 'Previewing pay on bill. <a href="bills.html">Back to Direct Debit</a>'
      : 'This is the Direct Debit layout. <a href="bills.html?plan=bill">Preview pay on bill</a>';

    function selectTab(next, animate) {
      if (animate && next === tab) return;
      const apply = () => {
        tab = next;
        $$("[data-bill-tab]", root).forEach((btn) => {
          const on = btn.dataset.billTab === next;
          btn.setAttribute("aria-selected", String(on));
          btn.tabIndex = on ? 0 : -1;
        });
        $$("[data-bill-panel]", root).forEach((panel) => {
          panel.hidden = panel.dataset.billPanel !== next;
        });
      };
      const panels = $$("[data-bill-panel]", root);
      if (!animate || reduceMotion) {
        apply();
        return;
      }
      const current = panels.find((panel) => !panel.hidden);
      current.style.setProperty("--swap-x", next === "bills" ? "1" : "-1");
      current.classList.add("is-leaving");
      window.setTimeout(() => {
        apply();
        const incoming = panels.find((panel) => !panel.hidden);
        incoming.classList.remove("is-leaving");
        incoming.classList.add("is-entering");
        requestAnimationFrame(() => {
          requestAnimationFrame(() => incoming.classList.remove("is-entering"));
        });
      }, 170);
    }

    $$("[data-bill-tab]", root).forEach((btn) => {
      btn.addEventListener("click", () => selectTab(btn.dataset.billTab, true));
    });

    root.querySelector("[role=tablist]").addEventListener("keydown", (e) => {
      const tabs = $$("[data-bill-tab]", root);
      const index = tabs.indexOf(document.activeElement);
      if (index < 0) return;
      let next = index;
      if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
      else if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = tabs.length - 1;
      else return;
      tabs[next].focus();
      selectTab(tabs[next].dataset.billTab, true);
      e.preventDefault();
    });

    $("[data-sort]", root).addEventListener("click", (e) => {
      txNewest = !txNewest;
      e.currentTarget.setAttribute("aria-pressed", String(!txNewest));
      e.currentTarget.textContent = txNewest ? "Newest first" : "Oldest first";
      paintTx();
    });

    $("[data-bill-sort]", root).addEventListener("click", (e) => {
      billNewest = !billNewest;
      e.currentTarget.setAttribute("aria-pressed", String(!billNewest));
      e.currentTarget.textContent = billNewest ? "Newest first" : "Oldest first";
      paintBills();
    });

    function setFilterOpen(open) {
      filterMenu.hidden = !open;
      filterBtn.setAttribute("aria-expanded", String(open));
    }

    filterBtn.addEventListener("click", () => setFilterOpen(filterMenu.hidden));
    $$("[data-filter]", root).forEach((btn) => {
      btn.addEventListener("click", () => {
        filter = btn.dataset.filter;
        txShown = pageSize;
        $$("[data-filter]", root).forEach((other) => other.setAttribute("aria-checked", String(other === btn)));
        $("[data-filter-label]", root).textContent = btn.textContent === "All" ? "Filter" : btn.textContent;
        setFilterOpen(false);
        filterBtn.focus();
        paintTx();
      });
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".filter-wrap")) setFilterOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !filterMenu.hidden) {
        setFilterOpen(false);
        filterBtn.focus();
      }
    });

    txMore.addEventListener("click", () => {
      txShown = transactions.length;
      paintTx();
    });
    billMore.addEventListener("click", () => {
      billShown = bills.length;
      paintBills();
    });

    const helpBtn = $("[data-bill-help]", root);
    const helpNote = $("#bill-help");
    helpBtn.addEventListener("click", () => {
      const open = helpNote.hidden;
      helpNote.hidden = !open;
      helpBtn.setAttribute("aria-expanded", String(open));
    });

    root.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-file]");
      if (!btn) return;
      const file = files.get(btn.dataset.file);
      if (!file) return;
      const url = URL.createObjectURL(new Blob([file.body], { type: "text/plain" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(url);
      toast("Download started");
    });

    paintTx();
    paintBills();
  }

  function initTariff() {
    const btn = $("[data-vat]");
    const more = $("[data-vat-more]");
    if (btn && more) {
      btn.addEventListener("click", () => {
        const open = more.hidden;
        more.hidden = !open;
        btn.setAttribute("aria-expanded", String(open));
      });
    }
    const info = $("[data-tariff-info]");
    const note = $("[data-tariff-note]");
    if (info && note) {
      info.addEventListener("click", () => {
        const open = note.hidden;
        note.hidden = !open;
        info.setAttribute("aria-expanded", String(open));
      });
    }
    paintTariffPage();
  }

  function paintTariffPage() {
    const hero = $("[data-tariff-hero]");
    if (!hero) return;
    const rateCells = $$("[data-tariff-rates] .rate-list dd").map((dd) => ({ node: dd.firstChild, text: dd.firstChild.textContent }));
    let closedDismissed = false;
    const set = (sel, text) => {
      const el = $(sel);
      if (el) el.textContent = text;
    };

    function paint() {
      const scenario = tariffScenario();
      const outcome = tariffOutcome();
      const done = tariffDone();
      const renewal = scenario === "renewal";
      const fixed = renewal && outcome !== "ended";
      const ddDone = scenario === "pob" && Boolean(done.dd);
      const closed = renewal && outcome === "closed" && done.closed;
      const show = {
        closed: closed && !closedDismissed,
        ended: renewal && outcome === "ended",
        renew: fixed && !done.renewal && !closed && outcome !== "noOptions",
        "renew-done": renewal && Boolean(done.renewal),
        "no-options": renewal && outcome === "noOptions" && !done.renewal,
        "pay-link": scenario === "pob" && !ddDone,
        promo: scenario === "pob" && !ddDone,
        compare: scenario === "change" || (renewal && (outcome === "ended" || closed)),
        entry: scenario === "change" || (renewal && (outcome === "ended" || closed)),
      };
      $$("[data-tariff-show]").forEach((el) => {
        el.hidden = !show[el.dataset.tariffShow];
      });
      [hero, $("[data-tariff-rates]"), $("[data-tariff-usage]")].forEach((el) => {
        if (el) el.hidden = show.closed;
      });

      set("[data-tariff-chip]", fixed ? "Fixed tariff" : "Variable tariff");
      set("[data-tariff-name]", fixed ? "[Current fixed tariff name]" : renewal ? "[Standard variable tariff name]" : "Fair Variable Dual");
      set("[data-tenure-since]", fixed ? "[start date]" : renewal ? "[date]" : "24 June 2024");
      set("[data-tenure-length]", fixed ? "[48] days left" : renewal ? "" : "2 years 4 months");
      set("[data-tenure-start]", fixed ? "[Start month]" : renewal ? "[Start month]" : "Jun 2024");
      set("[data-tenure-end]", fixed ? "[End date]" : "No end date");
      set("[data-fact-end]", fixed ? "[end date]" : "No end date");
      set("[data-fact-exit]", fixed ? TARIFFS.curFixed.exit : "No exit fees");
      set("[data-fact-pay]", scenario === "pob" && !ddDone ? "Pay on bill" : "Direct Debit");
      set(
        "[data-tariff-note]",
        fixed
          ? "A fixed tariff keeps your rates the same until the end date. You pay an exit fee if you leave early."
          : "A variable tariff can go up or down when energy prices change. This one has no end date and no exit fee."
      );
      const info = $("[data-tariff-info]");
      if (info) info.setAttribute("aria-label", fixed ? "About a fixed tariff" : "About a variable tariff");
      $("[data-tariff-tenure]").classList.toggle("is-fixed", fixed);

      const pendingId = scenario === "pob" ? done.dd || done.partial : done[scenario];
      const pending = $("[data-tariff-pending]");
      if (pending) {
        pending.hidden = !TARIFFS[pendingId];
        pending.textContent = TARIFFS[pendingId] ? `Switching to ${TARIFFS[pendingId].name} on [date]` : "";
      }
      set("[data-tariff-renewed]", TARIFFS[done.renewal] ? TARIFFS[done.renewal].name : "");
      const fixedRates = [...TARIFFS.curFixed.rates.elec, ...TARIFFS.curFixed.rates.gas];
      rateCells.forEach(({ node, text }, i) => {
        node.textContent = fixed && fixedRates[i] !== undefined ? `${pence(fixedRates[i])} ` : text;
      });
    }

    const dismiss = $("[data-tariff-dismiss-closed]");
    if (dismiss) {
      dismiss.addEventListener("click", () => {
        closedDismissed = true;
        paint();
        $("[data-tariff-name]").setAttribute("tabindex", "-1");
        $("[data-tariff-name]").focus();
      });
    }
    onTariffChange(() => {
      closedDismissed = false;
      paint();
    });
    paint();
  }

  function initHomeTariff() {
    const cards = $$("[data-home-tariff]");
    if (!cards.length) return;
    function paint() {
      const scenario = tariffScenario();
      const outcome = tariffOutcome();
      const done = tariffDone();
      cards.forEach((card) => {
        const kind = card.dataset.homeTariff;
        let visible = kind === scenario;
        if (kind === "renewal") visible = visible && !done.renewal && !done.closed && outcome !== "ended";
        if (kind === "pob") visible = visible && !done.dd;
        card.hidden = !visible;
      });
    }
    onTariffChange(paint);
    paint();
  }

  function initMovingOut() {
    const root = $("[data-moving]");
    if (!root) return;

    const ADDRESSES = [
      "Flat 1/1, 14 Albert Drive, Glasgow, G41 2PE",
      "Flat 2/1, 14 Albert Drive, Glasgow, G41 2PE",
      "Flat 3/1, 14 Albert Drive, Glasgow, G41 2PE",
    ];
    const WEEK = ["M", "T", "W", "T", "F", "S", "S"];
    const today = startOfDay(new Date());
    const params = new URLSearchParams(location.search);
    const asked = params.get("scenario") === "later" ? "later" : "now";

    const state = {
      step: 1,
      moveDate: asked === "later" ? addDays(today, 16) : addDays(today, -2),
      readDate: asked === "later" ? addDays(today, 16) : addDays(today, -2),
      calMonth: startOfMonth(asked === "later" ? addDays(today, 16) : addDays(today, -2)),
      pickMonth: startOfMonth(today),
      pending: asked === "later" ? today : addDays(today, -2),
      pickerOpen: false,
      manual: false,
      photoName: "",
      addrMode: "list",
      booted: false,
    };

    function startOfDay(date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    function startOfMonth(date) {
      return new Date(date.getFullYear(), date.getMonth(), 1);
    }
    function addDays(date, n) {
      const d = startOfDay(date);
      d.setDate(d.getDate() + n);
      return d;
    }
    function addMonths(date, n) {
      return new Date(date.getFullYear(), date.getMonth() + n, 1);
    }
    function sameDay(a, b) {
      return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }
    function scenarioOf(date) {
      return startOfDay(date) <= today ? "now" : "later";
    }
    function longDate(date) {
      return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
    function shortDate(date) {
      return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    }
    function monthTitle(date) {
      return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    }
    function pad5(n) {
      return String(n).padStart(5, "0");
    }
    function readingFor(date) {
      if (customer() === "trad" || customer() === "offline") return null;
      const diff = Math.round((startOfDay(date) - today) / DAY);
      if (diff > 0 || diff < -40) return null;
      if (diff === -12) return { src: "own", day: pad5(45210), night: pad5(12880) };
      if (diff === -2 || diff === -7 || diff === -9) return null;
      return { src: "smart", day: pad5(43000 + Math.abs(diff) * 17), night: pad5(11000 + Math.abs(diff) * 9) };
    }
    function setError(step, message) {
      const el = $(`[data-error="${step}"]`, root);
      if (!el) return;
      el.hidden = !message;
      el.textContent = message || "";
    }
    function emailValue() {
      return ($("[data-email]", root).value || "").trim();
    }
    function mobileValue() {
      return ($("[data-mobile]", root).value || "").trim();
    }
    function addressText() {
      if (state.addrMode === "manual") {
        const line = $("[data-addr-line]", root).value.trim();
        const town = $("[data-addr-town]", root).value.trim();
        const post = $("[data-addr-post]", root).value.trim();
        return [line, town, post].filter(Boolean).join(", ");
      }
      const picked = $('input[name="forward-address"]:checked', root);
      return ADDRESSES[Number(picked ? picked.value : 0)];
    }
    function readingsSummary() {
      if (scenarioOf(state.moveDate) === "later") return `Reminder set for ${shortDate(state.moveDate)}`;
      const stored = !state.manual && readingFor(state.readDate);
      if (stored) {
        return stored.src === "smart"
          ? `Smart meter reading for ${shortDate(state.readDate)}`
          : `Your reading for ${shortDate(state.readDate)}`;
      }
      const day = $("[data-day]", root).value.trim();
      const night = $("[data-night]", root).value.trim();
      return day && night ? `Day ${day}, night ${night}` : "Readings added";
    }

    function renderMonth(container, month, selected, opts) {
      container.replaceChildren();
      WEEK.forEach((label) => {
        const dow = document.createElement("span");
        dow.className = "move-dow";
        dow.textContent = label;
        container.append(dow);
      });
      const lead = (month.getDay() + 6) % 7;
      for (let i = 0; i < lead; i++) {
        const pad = document.createElement("span");
        pad.className = "move-day is-pad";
        container.append(pad);
      }
      const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
      for (let day = 1; day <= days; day++) {
        const date = new Date(month.getFullYear(), month.getMonth(), day);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "move-day";
        const futureBlocked = opts.max && date > opts.max;
        if (futureBlocked) btn.disabled = true;
        if (sameDay(date, selected)) btn.classList.add("is-selected");
        if (sameDay(date, today)) btn.classList.add("is-today");
        if (opts.moveDate && sameDay(date, opts.moveDate)) btn.classList.add("is-moveout");
        btn.setAttribute("aria-pressed", String(sameDay(date, selected)));
        btn.setAttribute("aria-label", longDate(date));
        const num = document.createElement("span");
        num.textContent = String(day);
        btn.append(num);
        const info = opts.dots ? readingFor(date) : null;
        if (info) {
          const dot = document.createElement("span");
          dot.className = `move-dot ${info.src}`;
          btn.append(dot);
          btn.setAttribute("aria-label", `${longDate(date)}, ${info.src === "smart" ? "smart meter reading" : "your reading"}`);
        }
        btn.addEventListener("click", () => opts.onPick(date));
        container.append(btn);
      }
    }

    function paint(focus) {
      const scenario = scenarioOf(state.moveDate);

      $$("[data-step]", root).forEach((section) => {
        const on = Number(section.dataset.step) === state.step;
        section.hidden = !on;
      });
      const live = $("[data-move-live]", root);
      const heading = $(`[data-step="${state.step}"] h2`, root);
      if (state.step === 5) {
        const visible = $(`[data-step="5"] [data-when="${scenario}"] h2`, root);
        if (visible) live.textContent = visible.textContent;
      } else if (heading) live.textContent = heading.textContent;

      $("[data-cal-title]", root).textContent = monthTitle(state.calMonth);
      $("[data-move-selected]", root).textContent = longDate(state.moveDate);
      renderMonth($("[data-move-cal]", root), state.calMonth, state.moveDate, {
        onPick(date) {
          state.moveDate = date;
          state.readDate = date;
          state.manual = false;
          paint(false);
        },
      });

      const now = scenario === "now";
      $('[data-when="now"]', root).hidden = !now;
      $('[data-when="later"]', root).hidden = now;
      $("[data-out-date]", root).textContent = longDate(state.moveDate);
      $("[data-read-date]", root).textContent = longDate(state.readDate);
      const stored = readingFor(state.readDate);
      const showStored = now && stored && !state.manual;
      $("[data-stored]", root).hidden = !showStored;
      $("[data-manual-card]", root).hidden = !(now && !showStored);
      $("[data-manual-off]", root).hidden = !(stored && state.manual);
      if (showStored) {
        $("[data-read-tag]", root).textContent = stored.src === "smart" ? "Smart meter reading" : "Your reading";
        $("[data-stored] .live-dot", root).hidden = stored.src !== "smart";
        $("[data-read-day]", root).textContent = stored.day;
        $("[data-read-night]", root).textContent = stored.night;
        $("[data-read-note]", root).textContent =
          stored.src === "smart"
            ? `We have a smart meter reading for ${shortDate(state.readDate)}. We’ll use it as your final reading.`
            : `You sent this reading for ${shortDate(state.readDate)}. We’ll use it as your final reading.`;
      }
      const picker = $("[data-picker]", root);
      picker.hidden = !state.pickerOpen;
      $("[data-open-picker]", root).setAttribute("aria-expanded", String(state.pickerOpen));
      if (state.pickerOpen) {
        $("[data-pick-title]", root).textContent = monthTitle(state.pickMonth);
        renderMonth($("[data-pick-cal]", root), state.pickMonth, state.pending, {
          max: today,
          dots: true,
          moveDate: state.moveDate,
          onPick(date) {
            state.pending = date;
            paint(false);
          },
        });
        const pendingInfo = readingFor(state.pending);
        $("[data-pick-preview]", root).textContent = pendingInfo
          ? `${longDate(state.pending)} · ${pendingInfo.src === "smart" ? "Smart meter reading" : "Your reading"} · Day ${pendingInfo.day} · Night ${pendingInfo.night}`
          : `${longDate(state.pending)} · No reading stored. You can type one after you choose this date.`;
      }

      $("[data-tile-month]", root).textContent = state.moveDate.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
      $("[data-tile-day]", root).textContent = String(state.moveDate.getDate());
      $("[data-remind-date]", root).textContent = longDate(state.moveDate);

      $("[data-email-view]", root).textContent = emailValue();
      $("[data-mobile-view]", root).textContent = mobileValue();
      $("[data-sum-date]", root).textContent = longDate(state.moveDate);
      $("[data-sum-contact]", root).textContent = emailValue();
      $("[data-sum-address]", root).textContent = addressText() || "Not added yet";
      const occName = $("[data-occ-name]", root).value.trim();
      $("[data-sum-occ]", root).textContent = $('[data-occ="y"]', root).classList.contains("is-on")
        ? occName || "Details added"
        : "Not known";
      $("[data-sum-read]", root).textContent = readingsSummary();
      $("[data-done-email]", root).textContent = emailValue();
      $("[data-done-read]", root).textContent = scenario === "later" ? shortDate(state.moveDate) : "Already sent";

      $('[data-step="5"]', root).setAttribute("aria-labelledby", scenario === "now" ? "move-q5" : "move-q5b");
      if (focus) {
        const target =
          state.step === 5 ? $(`[data-step="5"] [data-when="${scenario}"] h2`, root) : $(`[data-step="${state.step}"] h2`, root);
        if (target) target.focus();
      }
      state.booted = true;
    }

    function showStep(next) {
      state.step = next;
      state.pickerOpen = false;
      setError(next, "");
      paint(state.booted);
    }

    function applyScenario(name) {
      state.moveDate = name === "later" ? addDays(today, 16) : addDays(today, -2);
      state.readDate = state.moveDate;
      state.pending = name === "later" ? today : state.moveDate;
      state.calMonth = startOfMonth(state.moveDate);
      state.manual = false;
      state.pickerOpen = false;
      const url = new URL(location.href);
      url.searchParams.set("scenario", name);
      history.replaceState(null, "", url);
      paint(false);
    }

    document.addEventListener("click", (e) => {
      if (!root.contains(e.target)) return;
      const quick = e.target.closest("[data-quick]");
      if (quick) {
        state.moveDate = addDays(today, Number(quick.dataset.quick));
        state.readDate = state.moveDate;
        state.manual = false;
        state.calMonth = startOfMonth(state.moveDate);
        paint(false);
        return;
      }
      if (e.target.closest("[data-cal-prev]")) {
        state.calMonth = addMonths(state.calMonth, -1);
        paint(false);
        return;
      }
      if (e.target.closest("[data-cal-next]")) {
        state.calMonth = addMonths(state.calMonth, 1);
        paint(false);
        return;
      }
      if (e.target.closest("[data-next]")) {
        if (!validate(state.step)) return;
        showStep(Math.min(7, state.step + 1));
        return;
      }
      if (e.target.closest("[data-back]")) {
        showStep(Math.max(1, state.step - 1));
        return;
      }
      const edit = e.target.closest("[data-edit]");
      if (edit) {
        const key = edit.dataset.edit;
        const field = $(`[data-${key}-edit]`, root);
        const view = $(`[data-${key}-view]`, root);
        const open = field.hidden;
        field.hidden = !open;
        view.hidden = open;
        edit.textContent = open ? "Done" : "Edit";
        if (open) $(`[data-${key}]`, root).focus();
        return;
      }
      if (e.target.closest("[data-manual-address]")) {
        state.addrMode = "manual";
        $("[data-addr-list]", root).hidden = true;
        $("[data-manual-fields]", root).hidden = false;
        return;
      }
      if (e.target.closest("[data-use-list]")) {
        state.addrMode = "list";
        $("[data-addr-list]", root).hidden = false;
        $("[data-manual-fields]", root).hidden = true;
        return;
      }
      const occ = e.target.closest("[data-occ]");
      if (occ) {
        $$("[data-occ]", root).forEach((btn) => {
          const on = btn === occ;
          btn.classList.toggle("is-on", on);
          btn.setAttribute("aria-pressed", String(on));
        });
        $("[data-occ-fields]", root).hidden = occ.dataset.occ !== "y";
        return;
      }
      if (e.target.closest("[data-open-picker]")) {
        state.pending = state.readDate;
        state.pickMonth = startOfMonth(state.readDate);
        state.pickerOpen = true;
        paint(false);
        return;
      }
      if (e.target.closest("[data-close-picker]")) {
        state.pickerOpen = false;
        paint(false);
        return;
      }
      if (e.target.closest("[data-pick-prev]")) {
        state.pickMonth = addMonths(state.pickMonth, -1);
        paint(false);
        return;
      }
      if (e.target.closest("[data-pick-next]")) {
        if (addMonths(state.pickMonth, 1) <= startOfMonth(today)) state.pickMonth = addMonths(state.pickMonth, 1);
        paint(false);
        return;
      }
      if (e.target.closest("[data-use-date]")) {
        state.readDate = state.pending;
        state.manual = false;
        state.pickerOpen = false;
        paint(false);
        return;
      }
      if (e.target.closest("[data-manual-on]")) {
        state.manual = true;
        paint(false);
        $("[data-day]", root).focus();
        return;
      }
      if (e.target.closest("[data-manual-off]")) {
        state.manual = false;
        paint(false);
        return;
      }
      if (e.target.closest("[data-calendar]")) {
        downloadReminder(state.moveDate);
        return;
      }
      const goto = e.target.closest("[data-goto]");
      if (goto) showStep(Number(goto.dataset.goto));
    });

    onCustomerChange(() => paint(false));

    $("[data-photo]", root).addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      const name = $("[data-photo-name]", root);
      state.photoName = file ? file.name : "";
      name.hidden = !file;
      name.textContent = file ? `Photo added: ${file.name}` : "";
    });

    function validate(step) {
      if (step === 2) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue())) {
          setError(2, "Enter an email address like name@example.com.");
          return false;
        }
        if (mobileValue().replace(/\s/g, "").length < 10) {
          setError(2, "Enter a mobile number.");
          return false;
        }
      }
      if (step === 3 && state.addrMode === "manual") {
        if (!$("[data-addr-line]", root).value.trim() || !$("[data-addr-post]", root).value.trim()) {
          setError(3, "Enter the address line and the postcode.");
          return false;
        }
      }
      if (step === 4 && $('[data-occ="y"]', root).classList.contains("is-on")) {
        if (!$("[data-occ-name]", root).value.trim()) {
          setError(4, "Enter the name of the person moving in, or choose No.");
          return false;
        }
      }
      if (step === 5 && scenarioOf(state.moveDate) === "now" && (state.manual || !readingFor(state.readDate))) {
        const day = $("[data-day]", root).value.trim();
        const night = $("[data-night]", root).value.trim();
        if (!/^\d{1,6}$/.test(day) || !/^\d{1,6}$/.test(night)) {
          setError(5, "Enter the day and night readings as numbers.");
          return false;
        }
      }
      setError(step, "");
      return true;
    }

    function downloadReminder(date) {
      const p = (n) => String(n).padStart(2, "0");
      const day = `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}`;
      const next = addDays(date, 1);
      const end = `${next.getFullYear()}${p(next.getMonth() + 1)}${p(next.getDate())}`;
      const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Home Energy//Moving out//EN",
        "BEGIN:VEVENT",
        `DTSTART;VALUE=DATE:${day}`,
        `DTEND;VALUE=DATE:${end}`,
        "SUMMARY:Send your final meter readings",
        "DESCRIPTION:Day and night readings for meter 22L4399661.",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
      link.download = "final-meter-reading.ics";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1500);
    }

    paint(false);
  }

  function initBooking() {
    const root = $("[data-booking]");
    if (!root) return;
    if (customer() !== "trad") {
      location.replace("readings.html");
      return;
    }

    onCustomerChange((id) => {
      if (id !== "trad") location.href = "readings.html";
    });

    const STORE = "he-booking";
    const SCENARIO = "he-book-scenario";
    const SCENARIOS = ["ok", "fail", "online", "no-slots", "notice"];
    const SLOT_TEXT = {
      morning: "Morning, 8am to 12pm",
      afternoon: "Afternoon, 12pm to 4pm",
      evening: "Evening, 4pm to 8pm",
    };
    const TITLES = {
      slots: "Get a smart meter",
      property: "Get a smart meter",
      review: "Get a smart meter",
      "no-slots": "Get a smart meter",
      manage: "Your smart meter appointment",
      notice: "Your smart meter appointment",
      reschedule: "Reschedule appointment",
      "reschedule-review": "Reschedule appointment",
      cancel: "Cancel appointment",
    };
    const STEPS = {
      slots: [1, "Slot booking"],
      property: [2, "Property details"],
      review: [3, "Review and confirm"],
    };
    const ICON_OK =
      '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="m7.5 12.5 3 3 6-6.5" /></svg>';
    const ICON_ALERT =
      '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 7v6M12 16.5v.5" /></svg>';
    const DONE = [
      ["Manage appointment", "manage", "secondary"],
      ["Done", "home", "primary"],
    ];
    const CONTACT = [["Contact us", "contact", "primary"]];
    const MODALS = {
      booked: {
        tone: "ok",
        title: "Your smart meter appointment has been booked",
        text: "We look forward to visiting you on the scheduled date and time. If you need to make any changes, you can manage your appointment through your account.",
        note: true,
        actions: DONE,
      },
      rescheduled: {
        tone: "ok",
        title: "Your smart meter appointment has been rescheduled",
        text: "Your appointment has been updated. You can make further changes from your account.",
        actions: DONE,
      },
      cancelled: {
        title: "Your smart meter appointment has been cancelled",
        text: "Your smart meter appointment has been successfully cancelled. If you change your mind, you can easily book a new appointment through your account at any time.",
        actions: [
          ["Book appointment", "rebook", "secondary"],
          ["Done", "home", "primary"],
        ],
      },
      "book-error": {
        tone: "alert",
        title: "Your smart meter booking was unsuccessful",
        text: "Unfortunately, we couldn’t complete your booking. Please try again later, or contact us for assistance.",
        actions: CONTACT,
      },
      "reschedule-error": {
        tone: "alert",
        title: "We couldn’t reschedule your smart meter appointment",
        text: "Sorry, we weren’t able to reschedule your appointment right now. Please try again later or contact us for assistance.",
        actions: CONTACT,
      },
      "cancel-error": {
        tone: "alert",
        title: "We couldn’t cancel your smart meter appointment",
        text: "Sorry, we weren’t able to cancel your appointment right now. Please try again later or contact us for assistance.",
        actions: CONTACT,
      },
      online: {
        tone: "alert",
        title: "We’re unable to book your smart meter online",
        text: "Please contact us so we can help arrange your smart meter booking.",
        actions: CONTACT,
      },
    };

    const heading = $("[data-book-heading]", root);
    const title = $("[data-book-title]", root);
    const steps = $("[data-book-steps]", root);
    const modal = $("[data-book-modal]", root);
    const questions = $$("[data-question]", root).map((el) => ({ name: el.dataset.question, label: el.dataset.label }));
    const moveReason = $('[data-reason="move"]', root);
    const cancelReason = $('[data-reason="cancel"]', root);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function saved() {
      try {
        return JSON.parse(sessionStorage.getItem(STORE));
      } catch (_) {
        return null;
      }
    }

    function store(booking) {
      sessionStorage.setItem(STORE, JSON.stringify(booking));
    }

    function scenario() {
      const id = sessionStorage.getItem(SCENARIO);
      return SCENARIOS.includes(id) ? id : "ok";
    }

    /* Bookings need 2 working days' notice, so the first slot is the third working day from today. */
    function workingDays(count, skip) {
      const out = [];
      const day = new Date();
      day.setHours(12, 0, 0, 0);
      let seen = 0;
      while (out.length < count) {
        day.setDate(day.getDate() + 1);
        if (day.getDay() === 0 || day.getDay() === 6) continue;
        seen += 1;
        if (seen > skip) out.push(new Date(day));
      }
      return out;
    }

    function ordinal(n) {
      const suffix = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
    }

    const shortDate = (d) => d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    function longDate(iso) {
      const d = new Date(iso);
      const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
      const month = d.toLocaleDateString("en-GB", { month: "long" });
      return `${weekday}, ${ordinal(d.getDate())} ${month} ${d.getFullYear()}`;
    }

    const when = (slot) => (slot && slot.date && slot.time ? `${longDate(slot.date)} - ${SLOT_TEXT[slot.time]}` : "");

    function picker(name, onPick) {
      const box = $(`[data-picker="${name}"]`, root);
      const btn = $("[data-picker-btn]", box);
      const value = $("[data-picker-value]", box);
      const list = $("[data-picker-list]", box);
      const empty = value.textContent;
      let picked = "";

      workingDays(7, 2).forEach((d) => {
        const li = document.createElement("li");
        const opt = document.createElement("button");
        opt.type = "button";
        opt.setAttribute("role", "option");
        opt.setAttribute("aria-selected", "false");
        opt.dataset.date = d.toISOString();
        opt.textContent = shortDate(d);
        opt.addEventListener("click", () => {
          set(opt.dataset.date);
          open(false);
          btn.focus();
          onPick();
        });
        li.append(opt);
        list.append(li);
      });

      const options = () => $$("[role='option']", list);

      function open(state) {
        list.hidden = !state;
        btn.setAttribute("aria-expanded", String(state));
        if (state) (options().find((o) => o.dataset.date === picked) || options()[0]).focus();
      }

      function set(iso) {
        picked = iso || "";
        const match = options().find((o) => o.dataset.date === picked);
        if (!match) picked = "";
        options().forEach((o) => o.setAttribute("aria-selected", String(o === match)));
        value.textContent = match ? match.textContent : empty;
        value.classList.toggle("is-set", !!match);
      }

      btn.addEventListener("click", () => open(list.hidden));
      list.addEventListener("keydown", (e) => {
        const all = options();
        const i = all.indexOf(document.activeElement);
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const step = e.key === "ArrowDown" ? 1 : -1;
          all[(i + step + all.length) % all.length].focus();
        } else if (e.key === "Escape") {
          e.stopPropagation();
          open(false);
          btn.focus();
        }
      });
      document.addEventListener("click", (e) => {
        if (!box.contains(e.target)) open(false);
      });

      return { get: () => picked, set };
    }

    function slots(name, onPick) {
      const group = $(`[data-slots="${name}"]`, root);
      const buttons = $$("[data-slot]", group);
      let picked = "";

      function set(slot) {
        picked = slot || "";
        buttons.forEach((b) => {
          const on = b.dataset.slot === picked;
          b.setAttribute("aria-checked", String(on));
          b.tabIndex = on || (!picked && b === buttons[0]) ? 0 : -1;
        });
      }

      group.addEventListener("click", (e) => {
        const b = e.target.closest("[data-slot]");
        if (!b) return;
        set(b.dataset.slot);
        onPick();
      });
      group.addEventListener("keydown", (e) => {
        if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) return;
        e.preventDefault();
        const i = buttons.indexOf(document.activeElement);
        const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
        const next = buttons[(i + step + buttons.length) % buttons.length];
        next.focus();
        next.click();
      });

      set("");
      return { get: () => picked, set };
    }

    const bookDate = picker("book", sync);
    const bookTime = slots("book", sync);
    const moveDate = picker("move", sync);
    const moveTime = slots("move", sync);

    const gates = {
      slots: () => bookDate.get() && bookTime.get(),
      property: () => questions.every((q) => $(`input[name="${q.name}"]:checked`, root)),
      reschedule: () => moveDate.get() && moveTime.get() && moveReason.value,
      cancel: () => cancelReason.value,
    };

    function sync() {
      $$("[data-gate]", root).forEach((btn) => {
        if (btn.getAttribute("aria-busy") !== "true") btn.disabled = !gates[btn.dataset.gate]();
      });
    }

    function answers() {
      return questions.map((q) => ({ label: q.label, value: $(`input[name="${q.name}"]:checked`, root)?.value || "" }));
    }

    const needs = () => $$("[data-chips] [aria-pressed='true']", root).map((chip) => chip.textContent.trim());

    function fill(view, key, text) {
      $$(`[data-out="${key}"]`, $(`[data-view="${view}"]`, root)).forEach((el) => {
        el.textContent = text;
      });
    }

    function paintReview() {
      fill("review", "when", when({ date: bookDate.get(), time: bookTime.get() }));
      const dl = $('[data-out="answers"]', root);
      dl.replaceChildren(
        ...answers().map((a) => {
          const row = document.createElement("div");
          const dt = document.createElement("dt");
          const dd = document.createElement("dd");
          dt.textContent = `${a.label}:`;
          dd.textContent = a.value;
          row.append(dt, dd);
          return row;
        })
      );
      const box = $('[data-out="needs"]', root);
      const list = needs();
      if (!list.length) {
        const p = document.createElement("p");
        p.className = "book-plain";
        p.textContent = "None";
        box.replaceChildren(p);
        return;
      }
      const ol = document.createElement("ol");
      ol.className = "book-needs";
      list.forEach((need) => {
        const li = document.createElement("li");
        li.textContent = need;
        ol.append(li);
      });
      box.replaceChildren(ol);
    }

    function show(view, focus = true) {
      $$("[data-view]", root).forEach((section) => {
        section.hidden = section.dataset.view !== view;
      });
      title.textContent = TITLES[view];
      const step = STEPS[view];
      steps.hidden = !step;
      if (step) {
        $("[data-book-step]", root).textContent = `Step ${step[0]} of 3: ${step[1]}`;
        const bar = $("[data-book-progress]", root);
        bar.setAttribute("aria-valuenow", String(step[0]));
        bar.setAttribute("aria-valuetext", `Step ${step[0]} of 3`);
        $$("span", bar).forEach((seg, i) => seg.classList.toggle("is-on", i < step[0]));
      }
      if (view === "review") paintReview();
      if (view === "manage") fill("manage", "when", when(saved()));
      if (view === "reschedule-review") {
        fill("reschedule-review", "new-when", when({ date: moveDate.get(), time: moveTime.get() }));
        fill("reschedule-review", "move-reason", moveReason.value);
      }
      sync();
      if (focus) {
        heading.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      }
    }

    function resetBooking() {
      bookDate.set("");
      bookTime.set("");
      $$("[data-question] input", root).forEach((input) => {
        input.checked = false;
      });
      $$("[data-chips] [aria-pressed]", root).forEach((chip) => chip.setAttribute("aria-pressed", "false"));
    }

    function openModal(id) {
      const m = MODALS[id];
      const badge = $("[data-modal-badge]", modal);
      badge.hidden = !m.tone;
      badge.className = `book-badge ${m.tone === "alert" ? "is-alert" : "is-ok"}`;
      badge.innerHTML = m.tone === "alert" ? ICON_ALERT : m.tone ? ICON_OK : "";
      $("[data-modal-title]", modal).textContent = m.title;
      $("[data-modal-text]", modal).textContent = m.text;
      $("[data-modal-note]", modal).hidden = !m.note;
      const actions = $("[data-modal-actions]", modal);
      actions.classList.toggle("is-single", m.actions.length === 1);
      actions.replaceChildren(
        ...m.actions.map(([label, act, kind]) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = `btn btn-${kind}`;
          btn.dataset.modalAct = act;
          btn.textContent = label;
          return btn;
        })
      );
      if (modal.open) modal.close();
      modal.showModal();
    }

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.close();
        return;
      }
      const btn = e.target.closest("[data-modal-act]");
      if (!btn) return;
      const act = btn.dataset.modalAct;
      modal.close();
      if (act === "home") location.href = "portal.html";
      else if (act === "manage") show("manage");
      else if (act === "rebook") show("slots");
      else if (act === "contact") toast("Contact us isn't part of this demo yet");
    });

    const BUSY = { book: "Booking…", reschedule: "Rescheduling…", cancel: "Cancelling…" };

    function submit(kind, btn) {
      if (kind === "book" && scenario() === "online") {
        openModal("online");
        return;
      }
      const label = btn.textContent;
      btn.disabled = true;
      btn.setAttribute("aria-busy", "true");
      btn.textContent = BUSY[kind];
      setTimeout(() => {
        btn.textContent = label;
        btn.removeAttribute("aria-busy");
        btn.disabled = false;
        sync();
        if (scenario() === "fail") {
          openModal(`${kind}-error`);
          return;
        }
        if (kind === "book") {
          store({ date: bookDate.get(), time: bookTime.get(), answers: answers(), needs: needs() });
          show("manage", false);
          openModal("booked");
        } else if (kind === "reschedule") {
          store({ ...saved(), date: moveDate.get(), time: moveTime.get(), reason: moveReason.value });
          show("manage", false);
          openModal("rescheduled");
        } else {
          sessionStorage.removeItem(STORE);
          resetBooking();
          show("slots", false);
          openModal("cancelled");
        }
      }, 700);
    }

    root.addEventListener("click", (e) => {
      const next = e.target.closest("[data-next]");
      if (next) {
        show(next.dataset.next);
        return;
      }
      const chip = e.target.closest("[data-chips] [aria-pressed]");
      if (chip) {
        chip.setAttribute("aria-pressed", String(chip.getAttribute("aria-pressed") !== "true"));
        return;
      }
      const act = e.target.closest("[data-act]");
      if (!act) return;
      const kind = act.dataset.act;
      if (kind === "start-reschedule" || kind === "start-cancel") {
        if (scenario() === "notice") {
          show("notice");
          return;
        }
        if (kind === "start-reschedule") {
          moveDate.set("");
          moveTime.set("");
          moveReason.value = "";
          show("reschedule");
        } else {
          cancelReason.value = "";
          show("cancel");
        }
        return;
      }
      submit(kind, act);
    });

    root.addEventListener("change", sync);

    function start() {
      if (modal.open) modal.close();
      if (saved()) {
        show("manage", false);
        return;
      }
      if (scenario() === "no-slots") {
        show("no-slots", false);
        return;
      }
      show("slots", false);
      if (scenario() === "online") openModal("online");
    }

    function paintScenario() {
      const id = scenario();
      $$("[data-book-scenario]").forEach((btn) => btn.setAttribute("aria-checked", String(btn.dataset.bookScenario === id)));
    }

    document.addEventListener("click", (e) => {
      const choice = e.target.closest("[data-book-scenario]");
      if (choice) {
        sessionStorage.setItem(SCENARIO, choice.dataset.bookScenario);
        paintScenario();
        start();
        return;
      }
      if (e.target.closest("[data-book-reset]")) {
        sessionStorage.removeItem(STORE);
        resetBooking();
        start();
        toast("The booked appointment was cleared");
      }
    });

    paintScenario();
    start();
  }

  /* ---------- Tariff journeys: change, renewal, pay on bill to Direct Debit ---------- */

  function initTariffJourney() {
    const root = $("[data-tj]");
    if (!root) return;
    const params = new URLSearchParams(location.search);
    const EXIT_URLS = { home: "portal.html", account: "account.html" };
    const exitUrl = EXIT_URLS[params.get("from")] || "tariff.html";
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SCENARIO_FOR = { renewal: "renewal", dd: "pob" };
    const JOURNEY_FOR = { change: "change", renewal: "renewal", pob: "dd" };
    const DESC = "[Two-line tariff description. Short summary of what makes this tariff different and who it suits best.]";
    const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);
    const FUEL_ICON = {
      elec: '<svg class="icon" viewBox="0 0 18 18"><path d="M10.2 1.2 3.4 10.2h4.2L7.2 16.8l7.4-9.6H10z" /></svg>',
      gas: '<svg class="icon" viewBox="0 0 18 18"><path d="M9 16.2c2.6-1.6 4.2-4 4.2-6.6 0-2.2-1.1-3.6-2.2-5.1-.3 1.8-1.2 2.6-2 2.6.2-2.2-.6-4-2.2-5.6-.2 2.6-.8 4.1-2.2 5.5C3.4 8.4 2.6 9.8 2.6 11.4c0 3 2.6 4.8 6.4 4.8z" /></svg>',
    };
    const GROUPS = [
      ["fixed", "Fixed tariffs"],
      ["variable", "Variable tariffs"],
      ["smart", "Smart tariffs"],
    ];
    const JOURNEYS = {
      change: {
        title: "Change tariff",
        steps: ["Choose tariff", "Review and confirm"],
        list: ["fx1", "fx2", "vr1", "cur", "sm1"],
        note: "Compare the tariffs available to you with your current one.",
        options: "Other tariffs you can switch to",
        summary: "Your new tariff",
        submit: "Confirm tariff change",
        successTitle: "Your tariff change is confirmed",
        toast: "Tariff change confirmed",
      },
      renewal: {
        title: "Renew your tariff",
        steps: ["Choose tariff", "Review and confirm"],
        list: ["fx1", "fx2", "fx3", "vr1"],
        note: "Choose your next tariff by [date]. If you do nothing, you’ll move to our [standard variable tariff name].",
        options: "Your renewal options",
        summary: "Your renewal",
        submit: "Confirm renewal",
        successTitle: "Your renewal is confirmed",
        toast: "Renewal confirmed",
      },
      dd: {
        title: "Set up Direct Debit",
        steps: ["Choose tariff", "Set up Direct Debit", "Review and confirm"],
        list: ["fx1", "fx2", "vr1", "sm1"],
        note: "To pay by Direct Debit, you’ll first change to a Direct Debit tariff.",
        options: "Choose a Direct Debit tariff",
        summary: "Your new tariff",
        submit: "Confirm and switch",
        successTitle: "You’re set up to pay by Direct Debit",
        toast: "Direct Debit set up",
      },
    };
    const STEP_OF = { pick: 0, confirm: 1, bank: 1, review: 2 };

    let journey = params.get("journey");
    if (!JOURNEYS[journey]) journey = JOURNEY_FOR[tariffScenario()];
    if (SCENARIO_FOR[journey] && tariffScenario() !== SCENARIO_FOR[journey]) {
      sessionStorage.setItem(TARIFF_KEY, SCENARIO_FOR[journey]);
      sessionStorage.removeItem(TARIFF_OUTCOME_KEY);
      paintTariffControls();
    }

    let state;
    const heading = $("[data-tj-heading]", root);
    const ordinal = (n) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;
    const J = () => JOURNEYS[journey];
    const outcome = () => (journey === "change" && tariffScenario() !== "change" ? "ok" : tariffOutcome());
    const sel = () => TARIFFS[state.sel];
    const fill = (key, text) => $$(`[data-out="${key}"]`, root).forEach((el) => (el.textContent = text));
    const amountText = () => gbp((sel() ? sel().month : 0) + state.amount);

    function fresh() {
      const done = tariffDone();
      const retry = journey === "dd" && TARIFFS[done.partial] ? done.partial : null;
      return {
        view: retry ? "bank" : "pick",
        sel: retry,
        retry: Boolean(retry),
        prev: journey === "renewal" && TARIFFS[done.renewal] ? done.renewal : null,
        gone: new Set(),
        open: new Set(),
        amount: 0,
        day: null,
        failed: false,
        bankFailed: false,
        busy: false,
        dirty: false,
      };
    }

    function rateRows(t, fuel) {
      const rows = [["Standing charge", "per day"]];
      if (fuel === "elec" && t.dayNight) rows.push(["Day rate", "per kWh"], ["Night rate", "per kWh"]);
      else rows.push(["Unit rate", "per kWh"]);
      return rows;
    }

    function rateCards(t, level = 3) {
      return t.fuels
        .map(
          (fuel) => `
          <article class="rate-card">
            <h${level} class="rate-head"><span class="fuel-tile" aria-hidden="true">${FUEL_ICON[fuel]}</span>${fuel === "elec" ? "Electricity" : "Gas"}</h${level}>
            <dl class="rate-list">
              ${rateRows(t, fuel)
                .map(([label, unit], i) => `<div><dt>${label}</dt><dd>${pence(t.rates[fuel][i])} <span>${unit}</span></dd></div>`)
                .join("")}
            </dl>
          </article>`
        )
        .join("");
    }

    function rateMini(t, level = 5) {
      const fuels = t.fuels
        .map(
          (fuel) => `
          <section class="tj-mini-fuel">
            <h${level}><span class="fuel-tile" aria-hidden="true">${FUEL_ICON[fuel]}</span>${fuel === "elec" ? "Electricity" : "Gas"}</h${level}>
            <dl>
              ${rateRows(t, fuel)
                .map(([label, unit], i) => `<div><dt>${label}</dt><dd><b>${pence(t.rates[fuel][i])}</b> ${unit}</dd></div>`)
                .join("")}
            </dl>
          </section>`
        )
        .join("");
      return `<div class="tj-mini-rates">${fuels}</div>`;
    }

    function usageLine(t) {
      return `<p class="tj-usage">Est. usage · Electricity 9,185 kWh a year${t.fuels.includes("gas") ? " · Gas 17,000 kWh a year" : ""}</p>`;
    }

    function facts(rows) {
      return rows.map(([dt, dd]) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`).join("");
    }

    function tariffFacts(t, start) {
      return facts([
        ["Contract type", t.kind === "Smart" ? "Fixed" : t.kind],
        ...(start ? [["Start date", start]] : []),
        ["End date", t.end],
        ["Exit fees", t.exit || "No exit fees"],
        ["Payment method", "Direct Debit"],
      ]);
    }

    function details(t, level = 3) {
      return `
        <dl class="tj-facts">${tariffFacts(t)}</dl>
        <div class="rate-cards">${rateCards(t, level)}</div>
        <p class="tj-usage">Est. usage · Electricity 9,185 kWh a year${t.fuels.includes("gas") ? " · Gas 17,000 kWh a year" : ""}</p>`;
    }

    function currentTariff() {
      const fixed = journey === "renewal" && !state.moved;
      return {
        name: journey === "renewal" ? (fixed ? "[Current fixed tariff name]" : "[Standard variable tariff name]") : "Fair Variable Dual",
        type: fixed ? "Fixed" : "Variable",
        pay: journey === "dd" ? "Pay on bill" : "Direct Debit",
        rows: fixed
          ? [["Contract type", "Fixed"], ["Start date", "[start date]"], ["End date", "[end date]"], ["Exit fees", TARIFFS.curFixed.exit]]
          : [["Contract type", "Variable"], ["Start date", journey === "renewal" ? "[end date]" : "24 June 2024"], ["End date", "No end date"], ["Exit fees", "No exit fees"]],
      };
    }

    function cardCta(id, t) {
      if (t.current) return `<span class="tj-card-state">Your current tariff</span>`;
      if (id === state.prev) return `<span class="tj-card-state">Your renewal choice</span>`;
      if (t.off || state.gone.has(id)) return `<span class="tj-card-state is-off">Not available right now</span>`;
      const on = state.sel === id;
      return `<button type="button" class="btn btn-primary tj-choose" data-tj-choose="${id}" aria-label="Choose ${t.name}">${on ? "✓ Selected" : "Choose this tariff"}</button>`;
    }

    function card(id) {
      const t = TARIFFS[id];
      const open = state.open.has(id);
      const off = t.off || state.gone.has(id);
      const cmp = t.current
        ? ""
        : `<span class="tj-compare ${t.cmp === "cheaper" ? "is-cheaper" : "is-more"}">£${t.diff} a year ${t.cmp === "cheaper" ? "cheaper" : "more"}</span>`;
      const tick = '<svg class="icon" viewBox="0 0 14 14" aria-hidden="true"><polyline points="2.5,7.5 5.5,10.5 11.5,3.5" /></svg>';
      const points = [t.fuels.includes("gas") ? "Electricity and gas" : "Electricity only", t.term, "Pay by Direct Debit", t.exit ? `Exit fees of ${t.exit}` : "No exit fees"];
      return `
        <article class="tj-card${state.sel === id ? " is-selected" : ""}${off ? " is-off" : ""}${t.current ? " is-current" : ""}" aria-labelledby="tj-card-${id}">
          <div class="tj-card-head">
            <h4 id="tj-card-${id}">${t.name}</h4>
            <div class="tj-tags">${t.best ? '<span class="tj-chip is-best">Best value</span>' : ""}<span class="tj-tag">${t.kind}</span></div>
          </div>
          <p class="tj-desc">${DESC}</p>
          <div class="tj-cost">
            <div class="tj-cost-main">
              <span class="sr-only">Estimated cost</span>
              <span><b>${gbp(t.month)}</b> a month</span>
              <span class="tj-cost-year">${gbp(t.month * 12)} a year (estimate)</span>
            </div>
            ${cmp}
          </div>
          <ul class="tj-points">${points.map((p) => `<li>${tick}${p}</li>`).join("")}</ul>
          <button type="button" class="link-btn tj-more-btn" data-tj-more="${id}" aria-expanded="${open}" aria-controls="tj-more-${id}">${open ? "Hide tariff rates" : "View tariff rates"}<svg class="icon tj-caret" viewBox="0 0 14 14" aria-hidden="true"><polyline points="2,5 7,10 12,5" /></svg></button>
          <div class="tj-more" id="tj-more-${id}"${open ? "" : " hidden"}>${rateMini(t)}${usageLine(t)}</div>
          <div class="tj-card-cta">${cardCta(id, t)}</div>
        </article>`;
    }

    function paintPick() {
      const J0 = J();
      const out = outcome();
      const blocked = (journey === "dd" && out === "inelig") || (journey === "renewal" && out === "noOptions");
      $("[data-tj-pick-note]", root).textContent = J0.note;
      const cur = currentTariff();
      fill("cur-name", cur.name);
      fill("cur-type", cur.type);
      fill("cur-pay", cur.pay);
      $("[data-tj-cur-facts]", root).innerHTML = facts(cur.rows);
      const curRates = cur.type === "Fixed" ? TARIFFS.curFixed : TARIFFS.cur;
      $("[data-tj-cur-more]", root).innerHTML = `<h3 class="tj-more-title">Tariff rates</h3>${rateMini(curRates, 4)}${usageLine(curRates)}`;
      $("[data-tj-inelig]", root).hidden = !(journey === "dd" && out === "inelig");
      $("[data-tj-no-options]", root).hidden = !(journey === "renewal" && out === "noOptions");
      $("[data-tj-options]", root).hidden = blocked;
      $("[data-tj-options-title]", root).textContent = J0.options;
      $("[data-tj-default]", root).hidden = journey !== "renewal";
      $("[data-tj-groups]", root).innerHTML = GROUPS.map(([group, label]) => {
        const ids = J0.list.filter((id) => TARIFFS[id].group === group);
        if (!ids.length) return "";
        return `<section class="tj-group" aria-labelledby="tj-group-${group}"><h3 id="tj-group-${group}">${label}</h3><div class="tj-cards">${ids.map(card).join("")}</div></section>`;
      }).join("");
    }

    function paintConfirm() {
      const t = sel();
      const out = outcome();
      const unavailable = journey === "change" && out === "unavailable" && state.gone.has(state.sel);
      root.classList.toggle("is-unavailable", unavailable);
      $("[data-tj-unavailable]", root).hidden = !unavailable;
      $("[data-tj-changing]", root).hidden = !(journey === "renewal" && state.prev && state.prev !== state.sel);
      $("[data-tj-moved]", root).hidden = !state.moved;
      $("[data-tj-moved-note]", root).hidden = !state.moved;
      $("[data-tj-renewal-only]", root).hidden = journey !== "renewal";
      $("[data-tj-summary-label]", root).textContent = J().summary;
      fill("prev-name", state.prev ? TARIFFS[state.prev].name : "");
      fill("sel-kind", t.kind);
      $("[data-tj-sel-facts]", root).innerHTML = tariffFacts(t, "[date]");
      $("[data-tj-rates]", root).innerHTML = rateCards(t);
      $('[data-tj-submit="confirm"]', root).textContent = J().submit;
    }

    function paintBank() {
      $("[data-tj-retry]", root).hidden = !state.retry;
      $("[data-tj-change-tariff]", root).hidden = state.retry;
      fill("amount", amountText());
      const amountInput = $("[data-tj-amount-input]", root);
      if (document.activeElement !== amountInput) amountInput.value = (sel().month + state.amount).toFixed(2);
      $("[data-tj-recommended]", root).hidden = state.amount !== 0;
      $("[data-tj-below]", root).hidden = state.amount >= 0;
      const daySelect = $("[data-tj-day-select]", root);
      if (!daySelect.options.length) {
        daySelect.innerHTML = `<option value="">Choose a date</option>${DAYS.map((day) => `<option value="${day}">${ordinal(day)} of the month</option>`).join("")}`;
      }
      daySelect.value = state.day ? String(state.day) : "";
      $("[data-tj-day-summary]", root).hidden = !state.day;
      fill("day", state.day ? ordinal(state.day) : "");
    }

    function field(name) {
      return $(`[data-tj-field="${name}"]`, root);
    }

    function paintReview() {
      const t = sel();
      const acct = field("acct").value;
      const rows = [
        ["Current tariff", "Fair Variable Dual (Pay on bill)", '<span class="tj-tag is-leave">Leaving</span>', ""],
        ["New tariff", t.name, '<span class="tj-tag is-join">Joining</span><button type="button" class="link-btn" data-tj-details="selected">View tariff details</button>', state.retry ? "" : "pick"],
        ["Direct Debit amount", amountText(), '<button type="button" class="link-btn" data-tj-review-open>Your Direct Debit may be reviewed</button>', "bank"],
        ["Payment date", `${ordinal(state.day)} of every month`, "", "bank"],
        ["Bank details", `${field("first").value.trim()} ${field("last").value.trim()}`, `<span>Account ending •••• ${acct.slice(-4)}</span>`, "bank"],
      ];
      $("[data-tj-review]", root).innerHTML = rows
        .map(
          ([dt, value, extra, edit]) => `
          <div>
            <dt>${dt}</dt>
            <dd><b>${value}</b>${extra ? `<span class="tj-review-extra">${extra}</span>` : ""}</dd>
            ${edit ? `<button type="button" class="link-btn tj-edit" data-tj-go="${edit}" aria-label="Edit ${dt.toLowerCase()}">Edit</button>` : ""}
          </div>`
        )
        .join("");
    }

    function paintOutcome(view) {
      const t = sel();
      const dd = journey === "dd";
      if (view === "success") {
        fill("success-title", J().successTitle);
        fill("success-text", dd ? `${t.name} starts on [date]. Your first payment of ${amountText()} is on or around [date].` : `${t.name} starts on [date].`);
        const steps = dd
          ? ["We’ll send a confirmation email within 24 hours.", "[Advance notice of first collection – Billing to confirm]", "Your payment method on Your tariff will show Direct Debit."]
          : ["We’ll send a confirmation email within 24 hours.", "Your new rates apply from [date]."];
        $("[data-tj-next-steps]", root).innerHTML = steps.map((s) => `<li>${s}</li>`).join("");
      }
      if (view === "error") {
        fill("error-title", dd ? "We couldn’t set up your Direct Debit" : "Something went wrong");
        fill(
          "error-text",
          dd
            ? "Something went wrong on our side. We’ve kept your details, apart from your account number. Please try again or contact us if this keeps happening."
            : "We couldn’t update your tariff right now. Please try again or contact us if this keeps happening."
        );
      }
    }

    function paintAgree(view) {
      const section = $(`[data-tj-view="${view}"]`, root);
      const t = sel();
      const exitRow = $("[data-tj-exit-row]", section);
      exitRow.hidden = !t || !t.exit;
      const agree = $("[data-tj-agree]", section).checked;
      const exit = exitRow.hidden || $("[data-tj-exit]", section).checked;
      const submit = $("[data-tj-submit]", section);
      submit.disabled = state.busy || !(agree && exit);
      if (state.busy) submit.textContent = "Confirming…";
      else submit.textContent = view === "confirm" ? J().submit : "Confirm and switch";
    }

    function paintSteps() {
      const steps = J().steps;
      const idx = STEP_OF[state.view];
      const box = $("[data-tj-steps]", root);
      box.hidden = idx === undefined || journey === "change" || (journey !== "dd" && state.view === "bank");
      if (box.hidden) return;
      $("[data-tj-step]", root).textContent = `Step ${idx + 1} of ${steps.length}: ${steps[idx]}`;
      const bar = $("[data-tj-progress]", root);
      bar.setAttribute("aria-valuemax", String(steps.length));
      bar.setAttribute("aria-valuenow", String(idx + 1));
      bar.setAttribute("aria-valuetext", `Step ${idx + 1} of ${steps.length}`);
      bar.style.setProperty("--steps", steps.length);
      bar.innerHTML = steps.map((_, i) => `<span${i <= idx ? ' class="is-on"' : ""}></span>`).join("");
    }

    function lockAddress(locked) {
      $$("[data-address-open]").forEach((btn) => {
        btn.disabled = locked;
        if (locked) btn.title = "Finish or cancel this change to switch address";
        else btn.removeAttribute("title");
      });
    }

    function show(view, focus = true) {
      state.view = view;
      $$("[data-tj-view]", root).forEach((section) => {
        section.hidden = section.dataset.tjView !== view;
      });
      const title = J().title;
      $("[data-tj-title]", root).textContent = title;
      $("[data-tj-crumb]", root).textContent = title;
      document.title = `${title} · Home Energy`;
      if (sel()) {
        fill("sel-month", gbp(sel().month));
        fill("sel-year", gbp(sel().month * 12));
        fill("exit-fee", sel().exitFee || "");
        fill("min-amount", gbp(sel().month));
      }
      if (view === "pick") paintPick();
      if (view === "confirm") paintConfirm();
      if (view === "bank") paintBank();
      if (view === "review") paintReview();
      if (view === "success" || view === "error") paintOutcome(view);
      if (view === "confirm" || view === "review") paintAgree(view);
      paintSteps();
      const finished = view === "success" || view === "partial";
      $$("[data-tj-leave]", root).forEach((el) => {
        if (el.matches("button")) el.hidden = finished;
      });
      lockAddress(!finished && view !== "error");
      if (focus) {
        heading.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      }
    }

    function start() {
      state = fresh();
      $$("[data-tj-agree], [data-tj-exit], [data-tj-holder]", root).forEach((box) => (box.checked = false));
      $$("[data-tj-field]", root).forEach((input) => {
        input.value = "";
        input.removeAttribute("aria-invalid");
      });
      $$("[data-tj-hint]", root).forEach((hint) => (hint.textContent = ""));
      $$("[data-tj-day-error], [data-tj-holder-error], [data-tj-bank-error]", root).forEach((el) => (el.hidden = true));
      $("[data-tj-paper]", root).hidden = false;
      fill("sel-name", state.sel ? sel().name : "");
      show(state.view, false);
    }

    function leave() {
      if (state.dirty && !["success", "partial"].includes(state.view)) {
        $("[data-tj-leave-modal]", root).showModal();
        return;
      }
      location.href = exitUrl;
    }

    function finish() {
      sessionStorage.setItem(TOAST_KEY, state.view === "partial" ? JOURNEYS.change.toast : J().toast);
      location.href = params.get("from") === "account" ? "account.html" : "tariff.html";
    }

    function openDrawer() {
      $("[data-tj-drawer-title]", root).textContent = sel().name;
      $("[data-tj-drawer-body]", root).innerHTML = details(sel());
      $("[data-tj-drawer]", root).showModal();
    }

    function toggleDisclosure(btn) {
      const open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", String(open));
      document.getElementById(btn.getAttribute("aria-controls")).hidden = !open;
      const label = $("[data-tj-toggle-label]", btn);
      if (label) label.textContent = open ? "Hide tariff details" : "View tariff details";
    }

    function submit(view) {
      const out = outcome();
      state.busy = true;
      paintAgree(view);
      setTimeout(() => {
        state.busy = false;
        if (journey === "change" && out === "unavailable" && !state.gone.size) {
          state.gone.add(state.sel);
          paintAgree(view);
          paintConfirm();
          heading.focus({ preventScroll: true });
          window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
          return;
        }
        if (journey === "renewal" && out === "closed") {
          setTariffDone({ closed: true });
          location.href = "tariff.html";
          return;
        }
        if (out === "fail" && !state.failed) {
          state.failed = true;
          show("error");
          return;
        }
        if (journey === "dd" && out === "partial" && !state.retry) {
          setTariffDone({ partial: state.sel });
          state.retry = true;
          show("partial");
          return;
        }
        if (journey === "change") setTariffDone({ change: state.sel });
        if (journey === "renewal") setTariffDone({ renewal: state.sel, closed: false });
        if (journey === "dd") setTariffDone({ dd: state.sel, partial: null });
        show("success");
      }, 1200);
    }

    function validateBank() {
      const checks = {
        first: (v) => (v.trim() ? "" : "Enter the account holder’s first name"),
        last: (v) => (v.trim() ? "" : "Enter the account holder’s last name"),
        acct: (v) => (/^\d{8}$/.test(v) ? "" : "Account number must be 8 digits"),
        sort: (v) => (/^\d{2}-\d{2}-\d{2}$/.test(v) ? "" : "Enter a valid sort code, like 00-00-00"),
      };
      let firstBad = null;
      Object.entries(checks).forEach(([name, check]) => {
        const input = field(name);
        const message = check(input.value);
        $(`[data-tj-hint="${name}"]`, root).textContent = message;
        if (message) input.setAttribute("aria-invalid", "true");
        else input.removeAttribute("aria-invalid");
        if (message && !firstBad) firstBad = input;
      });
      const dayError = $("[data-tj-day-error]", root);
      dayError.hidden = Boolean(state.day);
      const daySelect = $("[data-tj-day-select]", root);
      if (state.day) daySelect.removeAttribute("aria-invalid");
      else daySelect.setAttribute("aria-invalid", "true");
      const holder = $("[data-tj-holder]", root).checked;
      $("[data-tj-holder-error]", root).hidden = holder;
      if (!state.day) {
        daySelect.focus();
        return false;
      }
      if (firstBad) {
        firstBad.focus();
        return false;
      }
      if (!holder) {
        $("[data-tj-holder]", root).focus();
        return false;
      }
      return true;
    }

    root.addEventListener("click", (e) => {
      const choose = e.target.closest("[data-tj-choose]");
      if (choose) {
        state.sel = choose.dataset.tjChoose;
        state.dirty = true;
        fill("sel-name", sel().name);
        if (journey === "renewal" && outcome() === "moved") state.moved = true;
        show(journey === "dd" ? "bank" : "confirm");
        return;
      }
      const more = e.target.closest("[data-tj-more]");
      if (more) {
        const id = more.dataset.tjMore;
        if (state.open.has(id)) state.open.delete(id);
        else state.open.add(id);
        paintPick();
        $(`[data-tj-more="${id}"]`, root).focus();
        return;
      }
      const go = e.target.closest("[data-tj-go]");
      if (go) {
        if (go.dataset.tjGo === "pick") root.classList.remove("is-unavailable");
        show(go.dataset.tjGo);
        return;
      }
      if (e.target.closest("[data-tj-back], [data-tj-leave]")) {
        e.preventDefault();
        leave();
        return;
      }
      if (e.target.closest("[data-tj-bank-back]")) {
        if (state.retry) leave();
        else show("pick");
        return;
      }
      const amount = e.target.closest("[data-tj-amount]");
      if (amount) {
        const total = Math.max(5, sel().month + state.amount + Number(amount.dataset.tjAmount));
        state.amount = Math.round((total - sel().month) * 100) / 100;
        state.dirty = true;
        paintBank();
        return;
      }
      if (e.target.closest("[data-tj-bank-next]")) {
        if (!validateBank()) return;
        const bankError = $("[data-tj-bank-error]", root);
        if (outcome() === "bankFail" && !state.bankFailed) {
          state.bankFailed = true;
          bankError.hidden = false;
          bankError.setAttribute("tabindex", "-1");
          bankError.focus();
          return;
        }
        bankError.hidden = true;
        show("review");
        return;
      }
      const submitBtn = e.target.closest("[data-tj-submit]");
      if (submitBtn && !submitBtn.disabled) {
        submit(submitBtn.dataset.tjSubmit);
        return;
      }
      if (e.target.closest("[data-tj-try-again]")) {
        if (journey === "dd") {
          field("acct").value = "";
          show("bank");
        } else {
          show("confirm");
          submit("confirm");
        }
        return;
      }
      if (e.target.closest("[data-tj-retry-dd]")) {
        field("acct").value = "";
        show("bank");
        return;
      }
      if (e.target.closest("[data-tj-finish]")) {
        finish();
        return;
      }
      if (e.target.closest("[data-tj-details]")) {
        openDrawer();
        return;
      }
      const toggle = e.target.closest("[data-tj-toggle]");
      if (toggle) {
        toggleDisclosure(toggle);
        return;
      }
      if (e.target.closest("[data-tj-review-open]")) {
        $("[data-tj-review-modal]", root).showModal();
        return;
      }
      if (e.target.closest("[data-tj-review-close]")) {
        $("[data-tj-review-modal]", root).close();
        return;
      }
      if (e.target.closest("[data-tj-drawer-close]")) {
        $("[data-tj-drawer]", root).close();
        return;
      }
      if (e.target.closest("[data-tj-paper-close]")) {
        $("[data-tj-paper]", root).hidden = true;
        $('[data-tj-view="review"] [data-tj-agree]', root).focus();
        return;
      }
      if (e.target.closest("[data-tj-leave-confirm]")) {
        location.href = exitUrl;
        return;
      }
      if (e.target.closest("[data-tj-leave-cancel]")) {
        $("[data-tj-leave-modal]", root).close();
      }
    });

    root.addEventListener("change", (e) => {
      if (e.target.matches("[data-tj-agree], [data-tj-exit]")) {
        state.dirty = true;
        paintAgree(e.target.closest("[data-tj-view]").dataset.tjView);
      }
      if (e.target.matches("[data-tj-holder]")) {
        state.dirty = true;
        $("[data-tj-holder-error]", root).hidden = true;
      }
      if (e.target.matches("[data-tj-day-select]")) {
        state.day = Number(e.target.value) || null;
        state.dirty = true;
        $("[data-tj-day-error]", root).hidden = Boolean(state.day);
        if (state.day) e.target.removeAttribute("aria-invalid");
        paintBank();
      }
      if (e.target.matches("[data-tj-amount-input]")) {
        e.target.value = (sel().month + state.amount).toFixed(2);
      }
    });

    root.addEventListener("input", (e) => {
      if (e.target.matches("[data-tj-amount-input]")) {
        const cleaned = e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
        if (cleaned !== e.target.value) e.target.value = cleaned;
        const typed = Number.parseFloat(cleaned);
        if (Number.isFinite(typed) && typed >= 5) {
          state.amount = Math.round((Math.min(typed, 2000) - sel().month) * 100) / 100;
          state.dirty = true;
          paintBank();
        }
        return;
      }
      const input = e.target.closest("[data-tj-field]");
      if (!input) return;
      state.dirty = true;
      if (input.dataset.tjField === "acct") input.value = input.value.replace(/\D/g, "").slice(0, 8);
      if (input.dataset.tjField === "sort") {
        const digits = input.value.replace(/\D/g, "").slice(0, 6);
        input.value = digits.match(/.{1,2}/g)?.join("-") || "";
      }
    });

    $$(".tj-drawer", root).forEach((dialog) =>
      dialog.addEventListener("click", (e) => {
        if (e.target === dialog) dialog.close();
      })
    );

    onTariffChange(() => {
      journey = JOURNEY_FOR[tariffScenario()];
      const url = new URL(location.href);
      url.searchParams.set("journey", journey);
      history.replaceState(null, "", url);
      start();
    });

    start();
  }

  function initPrototype() {
    const params = new URLSearchParams(location.search);
    if (CUSTOMERS[params.get("customer")]) sessionStorage.setItem(CUSTOMER_KEY, params.get("customer"));
    const panel = $("[data-proto-panel]");
    const toggle = $("[data-proto-toggle]");
    const menu = $(".proto-menu");
    if (!panel || !toggle || !menu) return;
    const tariffControls = document.createElement("div");
    tariffControls.className = "proto-group";
    tariffControls.innerHTML = `
      <p class="proto-note">Tariff journey</p>
      <div class="proto-choices" role="radiogroup" aria-label="Tariff journey">
        ${Object.entries(TARIFF_SCENARIOS)
          .map(([value, label]) => `<button type="button" role="radio" data-tariff-scenario="${value}" aria-checked="false">${label}</button>`)
          .join("")}
      </div>
      <p class="proto-note" data-tariff-scenario-note></p>
      <p class="proto-note">Tariff outcome</p>
      <div class="proto-choices" role="radiogroup" aria-label="Tariff outcome" data-tariff-outcomes></div>
      <button type="button" class="link-btn" data-tariff-reset>Reset tariff journeys</button>`;
    panel.append(tariffControls);
    function setOpen(open) {
      panel.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
    }
    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-proto-toggle]")) {
        setOpen(panel.hidden);
        return;
      }
      const choice = e.target.closest("[data-customer]");
      if (choice) {
        setCustomer(choice.dataset.customer);
        return;
      }
      const scenario = e.target.closest("[data-tariff-scenario]");
      if (scenario) {
        if (scenario.dataset.tariffScenario !== tariffScenario()) changeTariffPrototype(scenario.dataset.tariffScenario);
        return;
      }
      const outcome = e.target.closest("[data-tariff-outcome]");
      if (outcome) {
        if (outcome.dataset.tariffOutcome !== tariffOutcome()) changeTariffPrototype(tariffScenario(), outcome.dataset.tariffOutcome);
        return;
      }
      if (e.target.closest("[data-tariff-reset]")) {
        changeTariffPrototype(tariffScenario(), tariffOutcome());
        toast("Tariff journeys reset");
        return;
      }
      if (!menu.contains(e.target)) setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });
    paintCustomer();
    paintTariffControls();
  }

  function initPortal() {
    if (!$("[data-header]")) return;
    if (!session.get()) {
      location.replace("index.html");
      return;
    }
    const target = supplyTarget();
    initDates(target);
    initCountdown(target);
    initMenu();
    initAddress();
    initHeaderEdge();
    initTips();
    initCopy();
    initPrototype();
    initTariffJourney();
    initHomeTariff();
    const pendingToast = sessionStorage.getItem(TOAST_KEY);
    if (pendingToast) {
      sessionStorage.removeItem(TOAST_KEY);
      setTimeout(() => toast(pendingToast), 300);
    }
    initReadings();
    initBooking();
    initTariff();
    initBills();
    initMovingOut();
    initAccount();
    $$("[data-sign-out]").forEach((btn) =>
      btn.addEventListener("click", () => {
        session.end();
        location.href = "index.html";
      })
    );
  }

  /* ---------- Your account ---------- */

  const ACCOUNT_KEY = "he-account-v2";
  const PSR_NEEDS = [
    "Age-related support",
    "Hearing loss",
    "Visual impairment",
    "Chronic illness",
    "Extra heating needs",
    "Mobility needs",
    "Medical equipment that needs power",
    "[Other needs – PSR team to confirm]",
  ];
  const READING_FREQ = { half: "Half-hourly", daily: "Daily", monthly: "Monthly" };
  const ACCOUNT_PAGES = ["login", "contact", "billing", "dd", "psr", "marketing", "smart", "support", "contactus", "faqs"];
  const accountDefaults = () => ({
    contact: { name: "Keith Bastian", email: "keith.bastian@gmail.com", mobile: "07700 900123", tel: "020 7123 4567" },
    username: "keith.bastian@gmail.com",
    mkt: { email: true, phone: false, sms: true },
    freq: "daily",
    dd: { set: null, holder: "Keith Bastian", last4: "4321", sortEnd: "21", day: 1 },
    psr: { reg: true, date: "12 January 2025", needs: ["Age-related support", "Hearing loss", "Extra heating needs"] },
    fail: false,
  });
  const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th");
  const phoneDigits = (v) => v.replace(/[\s()-]/g, "");
  const ACCOUNT_CHECKS = {
    name: (v) => Boolean(v.trim()),
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
    mobile: (v) => /^(07\d{9}|\+447\d{9})$/.test(phoneDigits(v)),
    tel: (v) => !v.trim() || /^(0\d{9,10}|\+44\d{9,10})$/.test(phoneDigits(v)),
  };

  function initAccount() {
    const root = $("[data-acct]");
    if (!root) return;
    let state;
    try {
      state = { ...accountDefaults(), ...JSON.parse(sessionStorage.getItem(ACCOUNT_KEY)) };
    } catch {
      state = accountDefaults();
    }
    const save = () => sessionStorage.setItem(ACCOUNT_KEY, JSON.stringify(state));
    const mobile = matchMedia("(max-width: 720px)");
    const dialog = $("[data-acct-modal]", root);
    const modalBody = $("[data-acct-modal-body]", root);
    const modalSubmit = $("[data-acct-modal-submit]", root);
    let editing = null;
    let draft = {};
    let touched = {};
    let busy = null;
    let error = null;
    let modal = null;
    let md = {};
    let mt = {};
    let mstep = 1;
    let opener = null;
    let lastPage = "menu";

    const isSmart = () => customer() !== "trad";
    const ddSet = () => state.dd.set ?? (tariffScenario() !== "pob" || Boolean(tariffDone().dd));
    const needsTariffChange = () => tariffScenario() === "pob" && !tariffDone().dd;
    const later = (ms, fn) => setTimeout(fn, ms);

    function setBusy(btn, on) {
      const spin = $(".acct-spin", btn);
      if (on && !spin) btn.insertAdjacentHTML("afterbegin", '<span class="acct-spin" aria-hidden="true"></span>');
      if (!on && spin) spin.remove();
      btn.toggleAttribute("aria-busy", on);
    }

    /* Pages on mobile */

    function page() {
      const id = location.hash.slice(1);
      if (!mobile.matches || !ACCOUNT_PAGES.includes(id)) return "menu";
      return id === "smart" && !isSmart() ? "menu" : id;
    }

    function paintPage() {
      const current = page();
      root.dataset.acctPage = current;
      $("[data-acct-back]", root).hidden = current === "menu";
      $$("[data-acct-card]", root).forEach((card) => card.classList.toggle("is-current", card.dataset.acctCard === current));
      if (current === lastPage) return;
      if (editing) cancelEdit();
      window.scrollTo(0, 0);
      if (current === "menu") {
        const row = $(`.acct-row[href="#${lastPage}"]`, root);
        if (row) row.focus();
      } else {
        const heading = $(`[data-acct-card="${current}"] h2`, root);
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
      lastPage = current;
    }

    function goBack() {
      if (history.state && history.state.acct) {
        history.back();
        return;
      }
      history.replaceState(null, "", location.pathname + location.search);
      paintPage();
    }

    /* Cards */

    function paintValues() {
      $$("[data-acct-value]", root).forEach((el) => (el.textContent = state.contact[el.dataset.acctValue] || "Not provided"));
      $("[data-acct-username]", root).textContent = state.username;
      $("[data-acct-freq]", root).textContent = READING_FREQ[state.freq];
      $$("[data-acct-smart-only]", root).forEach((el) => (el.hidden = !isSmart()));
    }

    function paintPrefs() {
      const prefs = editing === "marketing" ? draft : state.mkt;
      $$("[data-acct-pref]", root).forEach((btn) => {
        btn.setAttribute("aria-checked", String(Boolean(prefs[btn.dataset.acctPref])));
        btn.setAttribute("aria-disabled", String(editing !== "marketing"));
      });
      const count = Object.values(prefs).filter(Boolean).length;
      $("[data-acct-optin]", root).textContent = `${count} of 3 opted in`;
      $("[data-acct-mkt-none]", root).hidden = !(editing === "marketing" && count === 0);
    }

    function paintDd() {
      const set = ddSet();
      $$("[data-acct-dd]", root).forEach((el) => (el.hidden = el.dataset.acctDd !== (set ? "set" : "none")));
      $("[data-acct-dd-journey]", root).hidden = !needsTariffChange();
      $("[data-acct-dd-modal]", root).hidden = needsTariffChange();
      const values = { ...state.dd, day: `${ordinal(state.dd.day)} of each month` };
      $$("[data-acct-dd-value]", root).forEach((el) => (el.textContent = values[el.dataset.acctDdValue]));
    }

    function paintPsr() {
      const reg = state.psr.reg ? "yes" : "no";
      $$("[data-acct-psr]", root).forEach((el) => (el.hidden = el.dataset.acctPsr !== reg));
      $("[data-acct-psr-date]", root).textContent = state.psr.date;
      $("[data-acct-needs]", root).innerHTML = state.psr.needs.map((need) => `<li>${need}</li>`).join("");
    }

    function paintAll() {
      paintValues();
      paintPrefs();
      paintDd();
      paintPsr();
      paintProto();
      paintPage();
    }

    /* Inline editing: contact, marketing, smart */

    function editValid() {
      if (editing === "contact") {
        const changed = Object.keys(ACCOUNT_CHECKS).some((k) => draft[k] !== state.contact[k]);
        return changed && Object.entries(ACCOUNT_CHECKS).every(([k, check]) => check(draft[k]));
      }
      if (editing === "marketing") {
        const changed = Object.keys(state.mkt).some((k) => draft[k] !== state.mkt[k]);
        return changed && Object.values(draft).some(Boolean);
      }
      if (editing === "smart") return draft.freq !== state.freq;
      return false;
    }

    function paintContactErrors() {
      Object.entries(ACCOUNT_CHECKS).forEach(([k, check]) => {
        const bad = editing === "contact" && touched[k] && !check(draft[k]);
        const input = $(`[data-acct-input="${k}"]`, root);
        if (bad) input.setAttribute("aria-invalid", "true");
        else input.removeAttribute("aria-invalid");
        $(`[data-acct-err="${k}"]`, root).hidden = !bad;
      });
    }

    function paintEdit() {
      ["contact", "marketing", "smart"].forEach((k) => {
        const on = editing === k;
        $$(`[data-acct-view="${k}"]`, root).forEach((el) => (el.hidden = on));
        $$(`[data-acct-form="${k}"]`, root).forEach((el) => (el.hidden = !on));
        $(`[data-acct-error="${k}"]`, root).hidden = error !== k;
        const btn = $(`[data-acct-save="${k}"]`, root);
        btn.setAttribute("aria-disabled", String(!(on && editValid()) || Boolean(busy)));
        setBusy(btn, busy === k);
      });
      paintContactErrors();
      paintPrefs();
    }

    function startEdit(k) {
      editing = k;
      draft = k === "contact" ? { ...state.contact } : k === "marketing" ? { ...state.mkt } : { freq: state.freq };
      touched = {};
      error = null;
      if (k === "contact") $$("[data-acct-input]", root).forEach((input) => (input.value = draft[input.dataset.acctInput]));
      if (k === "smart") $(`input[name="acct-freq"][value="${draft.freq}"]`, root).checked = true;
      paintEdit();
      const first = { contact: "[data-acct-input]", marketing: "[data-acct-pref]", smart: 'input[name="acct-freq"]:checked' }[k];
      $(`[data-acct-card="${k}"] ${first}`, root).focus();
    }

    function cancelEdit() {
      const k = editing;
      editing = null;
      draft = {};
      error = null;
      paintEdit();
      const edit = k && $(`[data-acct-edit="${k}"]`, root);
      if (edit && !edit.closest("[hidden]")) edit.focus();
    }

    function saveEdit() {
      const k = editing;
      if (busy || !k) return;
      if (!editValid()) {
        if (k !== "contact") return;
        Object.keys(ACCOUNT_CHECKS).forEach((name) => (touched[name] = true));
        paintContactErrors();
        const bad = $('[data-acct-input][aria-invalid="true"]', root);
        if (bad) bad.focus();
        return;
      }
      busy = k;
      error = null;
      paintEdit();
      later(1000, () => {
        busy = null;
        if (state.fail) {
          error = k;
          paintEdit();
          return;
        }
        if (k === "contact") state.contact = { ...draft };
        if (k === "marketing") state.mkt = { ...draft };
        if (k === "smart") state.freq = draft.freq;
        save();
        editing = null;
        draft = {};
        paintValues();
        paintEdit();
        $(`[data-acct-edit="${k}"]`, root).focus();
        toast(k === "contact" ? "Your details have been updated" : "Your preferences have been updated");
      });
    }

    /* Pop-ups: username, password, bank, PSR */

    const field = (label, key, attrs = "", errorText = "") => `
      <label class="acct-field">${label}
        <input data-m="${key}" ${attrs} ${errorText ? `aria-describedby="acct-m-err-${key}"` : ""} />
        ${errorText ? `<span class="acct-field-error" id="acct-m-err-${key}" data-m-err="${key}" hidden>${errorText}</span>` : ""}
      </label>`;

    function modalInfo() {
      const masked = state.username.replace(/^(.).*(@.*)$/, "$1••••$2");
      return {
        username:
          mstep === 1
            ? { title: "Change username", sub: "Your username is the email address you use to log in.", btn: "Send code" }
            : { title: "Check your email", sub: `We’ve sent a 6-digit code to ${masked}. Enter it to confirm your new username.`, btn: "Verify and save" },
        password: { title: "Change password", sub: "", btn: "Save changes" },
        bank: ddSet()
          ? { title: "Change bank details", sub: "We’ll use these details for your next payment.", btn: "Save changes" }
          : { title: "Set up Direct Debit", sub: "Pay automatically each month.", btn: "Set up Direct Debit" },
        psr: state.psr.reg
          ? { title: "Update PSR details", sub: "Choose the support your household needs.", btn: "Save changes" }
          : { title: "Join the Priority Services Register", sub: "Choose the support your household needs.", btn: "Join the register" },
        psrRemove: { title: "Remove your registration?", sub: "", btn: "Remove registration" },
      }[modal];
    }

    function modalBodyHtml() {
      if (modal === "username" && mstep === 1)
        return (
          field("New username (email)", "u", 'type="email" autocomplete="email" spellcheck="false"', "Enter an email address, like name@example.com") +
          field("Confirm new username", "c", 'type="email" autocomplete="off" spellcheck="false"', "Usernames don’t match")
        );
      if (modal === "username")
        return `
          <label class="acct-field">6-digit code
            <input class="acct-code" data-m="code" inputmode="numeric" autocomplete="one-time-code" placeholder="000000" maxlength="6" />
          </label>
          <button type="button" class="link-btn acct-resend" data-acct-resend>Send a new code</button>`;
      if (modal === "password")
        return `
          ${field("Current password", "cur", 'type="password" autocomplete="current-password"')}
          ${field("New password", "nw", 'type="password" autocomplete="new-password" aria-describedby="acct-pw-rules"')}
          <ul class="acct-rules" id="acct-pw-rules" data-acct-rules></ul>
          ${field("Confirm new password", "cf", 'type="password" autocomplete="new-password"', "Passwords don’t match")}
          <label class="acct-check"><input type="checkbox" data-m-check="show" />Show passwords</label>`;
      if (modal === "bank")
        return `
          ${field("Account holder name", "holder", 'autocomplete="off"', "Enter the account holder’s name")}
          <div class="acct-pair">
            ${field("Account number", "acct", 'inputmode="numeric" autocomplete="off" placeholder="8 digits"', "Must be 8 digits")}
            ${field("Sort code", "sort", 'inputmode="numeric" autocomplete="off" placeholder="00-00-00"', "Use the format 00-00-00")}
          </div>
          ${
            ddSet()
              ? ""
              : `<label class="acct-field">Payment date
                  <span class="tj-select"><select data-m="day">${Array.from({ length: 28 }, (_, i) => `<option value="${i + 1}">${ordinal(i + 1)} of each month</option>`).join("")}</select></span>
                </label>`
          }
          <label class="acct-check is-top"><input type="checkbox" data-m-check="auth" /><span>I’m the account holder and I authorise Home Energy to collect payments from this account by Direct Debit.</span></label>
          <p class="acct-foot">Your payments are protected by the <a href="#" data-demo="Direct Debit Guarantee">Direct Debit Guarantee</a>.</p>`;
      if (modal === "psr")
        return `
          <fieldset class="acct-needs-pick">
            <legend class="sr-only">Support needs</legend>
            ${PSR_NEEDS.map((need, i) => `<label class="acct-need"><input type="checkbox" data-m-need="${i}" />${need}</label>`).join("")}
          </fieldset>
          <p class="acct-error" role="alert" data-acct-psr-none hidden>Choose at least one support need.</p>`;
      return `<p class="acct-copy-text">You’ll stop getting extra help, like advance notice of planned power cuts. You can join again at any time.</p>`;
    }

    function modalValid() {
      switch (modal) {
        case "username":
          return mstep === 1
            ? ACCOUNT_CHECKS.email(md.u) && md.u.trim() === md.c.trim() && md.u.trim() !== state.username
            : /^\d{6}$/.test(md.code);
        case "password":
          return Boolean(md.cur) && md.nw.length >= 8 && /\d/.test(md.nw) && /[A-Z]/.test(md.nw) && md.nw === md.cf && md.nw !== md.cur;
        case "bank":
          return Boolean(md.holder.trim()) && /^\d{8}$/.test(md.acct) && /^\d{2}-\d{2}-\d{2}$/.test(md.sort) && md.auth;
        case "psr": {
          const now = [...md.needs].sort().join("|");
          const was = state.psr.reg ? [...state.psr.needs].sort().join("|") : "";
          return md.needs.length > 0 && now !== was;
        }
        case "psrRemove":
          return true;
      }
      return false;
    }

    function modalErrors() {
      const e = {};
      if (modal === "username" && mstep === 1) {
        const same = md.u.trim() === state.username;
        e.u = mt.u && (!ACCOUNT_CHECKS.email(md.u) || same) ? (same ? "This is already your username" : "Enter an email address, like name@example.com") : "";
        e.c = mt.c && md.c !== md.u ? "Usernames don’t match" : "";
      }
      if (modal === "password") e.cf = mt.cf && md.cf !== md.nw ? "Passwords don’t match" : "";
      if (modal === "bank") {
        e.holder = mt.holder && !md.holder.trim() ? "Enter the account holder’s name" : "";
        e.acct = mt.acct && !/^\d{8}$/.test(md.acct) ? "Must be 8 digits" : "";
        e.sort = mt.sort && !/^\d{2}-\d{2}-\d{2}$/.test(md.sort) ? "Use the format 00-00-00" : "";
      }
      return e;
    }

    function paintModal() {
      const errors = modalErrors();
      $$("[data-m]", modalBody).forEach((input) => {
        const key = input.dataset.m;
        const msg = errors[key] || "";
        if (msg) input.setAttribute("aria-invalid", "true");
        else input.removeAttribute("aria-invalid");
        const hint = $(`[data-m-err="${key}"]`, modalBody);
        if (hint) {
          if (msg) hint.textContent = msg;
          hint.hidden = !msg;
        }
        if (modal === "password") input.type = md.show ? "text" : "password";
      });
      const rules = $("[data-acct-rules]", modalBody);
      if (rules)
        rules.innerHTML = [
          ["At least 8 characters", md.nw.length >= 8],
          ["At least one number", /\d/.test(md.nw)],
          ["At least one capital letter", /[A-Z]/.test(md.nw)],
        ]
          .map(([label, ok]) => `<li class="${ok ? "is-ok" : ""}"><span aria-hidden="true">${ok ? "✓" : "○"}</span>${label}<span class="sr-only">${ok ? ", done" : ", not done yet"}</span></li>`)
          .join("");
      const none = $("[data-acct-psr-none]", modalBody);
      if (none) none.hidden = !(mt.needs && md.needs.length === 0);
      const err = $("[data-acct-modal-error]", root);
      err.hidden = error !== "modal";
      $("[data-acct-modal-error-text]", root).textContent =
        modal === "username" && mstep === 2 ? "That code didn’t work. Check it and try again, or send a new code." : "We couldn’t save your changes. Please try again.";
      modalSubmit.setAttribute("aria-disabled", String(!modalValid() || Boolean(busy)));
      setBusy(modalSubmit, busy === "modal");
    }

    function renderModal() {
      const info = modalInfo();
      $("[data-acct-modal-title]", root).textContent = info.title;
      const sub = $("[data-acct-modal-sub]", root);
      sub.textContent = info.sub;
      sub.hidden = !info.sub;
      modalSubmit.textContent = info.btn;
      $("[data-acct-modal-cancel]", root).textContent = modal === "psrRemove" ? "Keep registration" : "Cancel";
      modalBody.innerHTML = modalBodyHtml();
      $$("[data-m]", modalBody).forEach((input) => (input.value = md[input.dataset.m] ?? ""));
      $$("[data-m-check]", modalBody).forEach((box) => (box.checked = Boolean(md[box.dataset.mCheck])));
      $$("[data-m-need]", modalBody).forEach((box) => (box.checked = md.needs.includes(PSR_NEEDS[box.dataset.mNeed])));
      paintModal();
      const first = $("input, select", modalBody) || modalSubmit;
      first.focus();
    }

    function openModal(kind, from) {
      if (editing) cancelEdit();
      modal = kind;
      mstep = 1;
      mt = {};
      error = null;
      md = {
        username: { u: "", c: "", code: "" },
        password: { cur: "", nw: "", cf: "", show: false },
        bank: { holder: "", acct: "", sort: "", day: String(state.dd.day || 1), auth: false },
        psr: { needs: state.psr.reg ? [...state.psr.needs] : [] },
        psrRemove: {},
      }[kind];
      opener = from;
      dialog.classList.toggle("is-confirm", kind === "psrRemove");
      dialog.showModal();
      renderModal();
    }

    function closeModal() {
      if (busy === "modal") return;
      dialog.close();
    }

    function submitModal() {
      if (busy) return;
      if (!modalValid()) {
        $$("[data-m]", modalBody).forEach((input) => (mt[input.dataset.m] = true));
        mt.needs = true;
        paintModal();
        const bad = $('[aria-invalid="true"]', modalBody);
        if (bad) bad.focus();
        return;
      }
      busy = "modal";
      error = null;
      paintModal();
      if (modal === "username" && mstep === 1) {
        later(800, () => {
          busy = null;
          mstep = 2;
          renderModal();
        });
        return;
      }
      later(1100, () => {
        busy = null;
        if (state.fail) {
          error = "modal";
          paintModal();
          return;
        }
        let message = "Your details have been updated";
        if (modal === "username") state.username = md.u.trim();
        if (modal === "bank") {
          if (!ddSet()) message = "Direct Debit set up";
          state.dd = { set: true, holder: md.holder.trim(), last4: md.acct.slice(-4), sortEnd: md.sort.slice(-2), day: Number(md.day) };
        }
        if (modal === "psr") {
          const date = state.psr.reg ? state.psr.date : new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
          if (!state.psr.reg) message = "You’re now on the Priority Services Register";
          state.psr = { reg: true, date, needs: [...md.needs] };
        }
        if (modal === "psrRemove") {
          state.psr = { reg: false, date: "", needs: [] };
          message = "You’ve been removed from the Priority Services Register";
        }
        save();
        const kind = modal;
        dialog.close();
        paintAll();
        if (kind === "psr" || kind === "psrRemove") {
          const next = $(`[data-acct-psr="${state.psr.reg ? "yes" : "no"}"] .btn-primary`, root);
          if (next) next.focus();
        }
        toast(message);
      });
    }

    dialog.addEventListener("cancel", (e) => {
      if (busy === "modal") e.preventDefault();
    });

    dialog.addEventListener("close", () => {
      modal = null;
      md = {};
      mt = {};
      error = null;
      if (opener && document.contains(opener) && !opener.closest("[hidden]")) opener.focus();
      opener = null;
    });

    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) closeModal();
    });

    $("[data-acct-modal-form]", root).addEventListener("submit", (e) => {
      e.preventDefault();
      submitModal();
    });

    modalBody.addEventListener("input", (e) => {
      const input = e.target.closest("[data-m]");
      if (!input) return;
      const key = input.dataset.m;
      let value = input.value;
      if (key === "acct") value = value.replace(/\D/g, "").slice(0, 8);
      if (key === "code") value = value.replace(/\D/g, "").slice(0, 6);
      if (key === "sort") value = (value.replace(/\D/g, "").slice(0, 6).match(/.{1,2}/g) || []).join("-");
      if (value !== input.value) input.value = value;
      md[key] = value;
      if (error === "modal") error = null;
      paintModal();
    });

    modalBody.addEventListener("change", (e) => {
      const check = e.target.closest("[data-m-check]");
      if (check) md[check.dataset.mCheck] = check.checked;
      const need = e.target.closest("[data-m-need]");
      if (need) {
        const label = PSR_NEEDS[need.dataset.mNeed];
        md.needs = need.checked ? [...md.needs, label] : md.needs.filter((n) => n !== label);
        mt.needs = true;
      }
      if (e.target.matches('select[data-m="day"]')) md.day = e.target.value;
      paintModal();
    });

    modalBody.addEventListener(
      "blur",
      (e) => {
        const input = e.target.closest("[data-m]");
        if (!input) return;
        mt[input.dataset.m] = true;
        paintModal();
      },
      true
    );

    /* Events */

    $("[data-acct-form=contact]", root).addEventListener("submit", (e) => {
      e.preventDefault();
      saveEdit();
    });

    $$("[data-acct-input]", root).forEach((input) => {
      input.addEventListener("input", () => {
        draft[input.dataset.acctInput] = input.value;
        if (error === "contact") error = null;
        paintEdit();
      });
      input.addEventListener("blur", () => {
        touched[input.dataset.acctInput] = true;
        paintContactErrors();
      });
    });

    $$('input[name="acct-freq"]', root).forEach((radio) =>
      radio.addEventListener("change", () => {
        draft.freq = radio.value;
        paintEdit();
      })
    );

    root.addEventListener("click", (e) => {
      const row = e.target.closest(".acct-row");
      if (row && mobile.matches) {
        e.preventDefault();
        history.pushState({ acct: true }, "", row.getAttribute("href"));
        paintPage();
        return;
      }
      if (e.target.closest("[data-acct-back]")) {
        goBack();
        return;
      }
      const contactLink = e.target.closest("[data-acct-contact-link]");
      if (contactLink) {
        e.preventDefault();
        if (mobile.matches) {
          history.pushState({ acct: true }, "", "#contactus");
          paintPage();
        } else {
          toast("Contact us isn't part of this demo yet");
        }
        return;
      }
      const edit = e.target.closest("[data-acct-edit]");
      if (edit) {
        startEdit(edit.dataset.acctEdit);
        return;
      }
      if (e.target.closest("[data-acct-cancel]")) {
        cancelEdit();
        return;
      }
      const saveBtn = e.target.closest("[data-acct-save]");
      if (saveBtn && saveBtn.type !== "submit") {
        saveEdit();
        return;
      }
      const pref = e.target.closest("[data-acct-pref]");
      if (pref) {
        if (editing !== "marketing") return;
        draft[pref.dataset.acctPref] = !draft[pref.dataset.acctPref];
        if (error === "marketing") error = null;
        paintEdit();
        return;
      }
      const open = e.target.closest("[data-acct-modal-open]");
      if (open) {
        openModal(open.dataset.acctModalOpen, open);
        return;
      }
      if (e.target.closest("[data-acct-modal-close]")) {
        closeModal();
        return;
      }
      if (e.target.closest("[data-acct-resend]")) {
        md.code = "";
        error = null;
        renderModal();
        toast("We’ve sent a new code");
        return;
      }
      const acc = e.target.closest("[data-acct-acc]");
      if (acc) {
        const isOpen = acc.getAttribute("aria-expanded") !== "true";
        acc.setAttribute("aria-expanded", String(isOpen));
        document.getElementById(acc.getAttribute("aria-controls")).hidden = !isOpen;
      }
    });

    window.addEventListener("popstate", paintPage);
    window.addEventListener("hashchange", paintPage);
    mobile.addEventListener("change", paintPage);

    /* Prototype controls */

    const panel = $("[data-proto-panel]");
    const proto = document.createElement("div");
    proto.className = "proto-group";
    proto.innerHTML = `
      <p class="proto-note">Your account</p>
      <label class="proto-check"><input type="checkbox" data-acct-proto="dd" />Direct Debit set up</label>
      <label class="proto-check"><input type="checkbox" data-acct-proto="psr" />On the Priority Services Register</label>
      <label class="proto-check"><input type="checkbox" data-acct-proto="fail" />Simulate save failure</label>
      <p class="proto-note">Smart meter preferences show for smart meter customers.</p>
      <button type="button" class="link-btn" data-acct-proto-reset>Reset Your account</button>`;
    if (panel) panel.append(proto);

    function paintProto() {
      const values = { dd: ddSet(), psr: state.psr.reg, fail: state.fail };
      $$("[data-acct-proto]", proto).forEach((box) => (box.checked = values[box.dataset.acctProto]));
    }

    proto.addEventListener("change", (e) => {
      const key = e.target.dataset.acctProto;
      if (key === "dd") state.dd.set = e.target.checked;
      if (key === "psr") state.psr = e.target.checked ? { ...accountDefaults().psr } : { reg: false, date: "", needs: [] };
      if (key === "fail") state.fail = e.target.checked;
      save();
      paintAll();
    });

    proto.addEventListener("click", (e) => {
      if (!e.target.closest("[data-acct-proto-reset]")) return;
      state = accountDefaults();
      save();
      if (editing) cancelEdit();
      paintAll();
      toast("Your account reset");
    });

    paintAll();
    paintEdit();
    onTariffChange(paintAll);
    onCustomerChange(paintAll);
  }

  /* ---------- Demo-only actions ---------- */

  function initDemoActions() {
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-demo]");
      if (!el) return;
      e.preventDefault();
      toast(`${el.dataset.demo} isn't part of this demo yet`);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initDemoActions();
    initLogin();
    initPortal();
  });
})();
