// Runs in <head> so the right appearance is applied before first paint.
(function () {
  var KEY = "he-theme";

  function stored() {
    try {
      return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
    } catch (e) {
      return "light";
    }
  }

  function apply(pref) {
    var dark = pref === "dark";
    var root = document.documentElement;
    root.setAttribute("data-theme", dark ? "dark" : "light");
    root.setAttribute("data-theme-pref", dark ? "dark" : "light");
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#0d130e" : "#f5f4f0");
  }

  window.HETheme = {
    get: stored,
    set: function (pref) {
      var next = pref === "dark" ? "dark" : "light";
      try {
        localStorage.setItem(KEY, next);
      } catch (e) {}
      apply(next);
    },
    apply: apply,
  };

  try {
    var meter = sessionStorage.getItem("he-customer");
    if (meter === "smart" || meter === "offline" || meter === "trad") {
      document.documentElement.setAttribute("data-meter", meter);
    }
  } catch (e) {}

  apply(stored());
})();
