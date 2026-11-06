(() => {
  const SESSION_KEY = "he-session";
  const DAY = 86400000;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* The supply line keeps the full postcode and shortens the start.
     Phone: 15 characters. Tablet: 20. Desktop: 30, or the whole address if it already fits. */
  function deviceTypeFor(width) {
    if (width < 768) return "mobile";
    if (width <= 1024) return "tablet";
    return "desktop";
  }

  function truncateAddress(fullAddress, maxLength, deviceType) {
    const limits = { mobile: 15, tablet: 20, desktop: 30 };
    const limit = Object.prototype.hasOwnProperty.call(limits, deviceType) ? limits[deviceType] : maxLength;
    const address = String(fullAddress || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!address || address.length <= limit) return address;

    const match = address.match(/^(.*?)(?:,\s*)?([A-Z]{1,2}\d[A-Z\d]{0,2})\s+(\d[A-Z]{2})$/i);
    if (!match) return `${address.slice(0, Math.max(0, limit - 3))}...`;

    const postcode = `${match[2].toUpperCase()} ${match[3].toUpperCase()}`.slice(0, 8);
    const prefix = match[1].replace(/[\s,]+$/, "");
    const available = limit - postcode.length - 5;
    const start = prefix.slice(0, Math.max(0, available));
    const result = `${start}..., ${postcode}`;
    return result.length <= limit ? result : result.slice(0, limit);
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

    function showAddress(full) {
      fullAddress = String(full || "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const shown = truncateAddress(fullAddress, undefined, deviceTypeFor(window.innerWidth));
      $$("[data-supply-line]").forEach((el) => {
        el.textContent = shown;
        el.title = fullAddress;
        el.dataset.addressFull = fullAddress;
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
    window.addEventListener("resize", () => {
      if (fullAddress) showAddress(fullAddress);
    });

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
      const rows = [
        ["Meter Serial Number", data.serial, "meter serial number"],
        [data.pointLabel, data.point, data.pointLabel.toLowerCase()],
      ];
      ids.innerHTML = rows
        .map(
          ([label, value, name]) =>
            `<div class="id-row"><div class="id-copy"><span>${label}</span><b>${value}</b></div><button type="button" class="copy-sq" data-copy="${value}" data-copy-label="${label}" aria-label="Copy ${name}">${copyIcon}</button></div>`
        )
        .join("");
      list.innerHTML = data.history
        .map((item, i) => {
          const cells = item.rows
            .map(
              ([label, value]) =>
                `<div class="hist-row"><span class="hist-label">${label}</span><span class="hist-value">${value}</span><span class="hist-src">${item.src}</span></div>`
            )
            .join("");
          return `<article class="hist"${i >= shown ? " hidden" : ""}><div class="hist-date"><span>${item.date}</span><span class="hist-src-mobile">${item.src}</span></div><div class="hist-grid${item.rows.length === 1 ? " single" : ""}">${cells}</div></article>`;
        })
        .join("");
      more.hidden = shown >= data.history.length;
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
          return [item.date, ...values, item.src].map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",");
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

    paint();
  }

  function initTariff() {
    const btn = $("[data-vat]");
    const more = $("[data-vat-more]");
    if (!btn || !more) return;
    btn.addEventListener("click", () => {
      const open = more.hidden;
      more.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
    });
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
    initReadings();
    initTariff();
    $$("[data-sign-out]").forEach((btn) =>
      btn.addEventListener("click", () => {
        session.end();
        location.href = "index.html";
      })
    );
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
