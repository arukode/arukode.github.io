document.addEventListener("DOMContentLoaded", () => {
  // Smooth scroll for nav links
  document.querySelectorAll('nav a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const targetId = this.getAttribute("href");
      const target = document.querySelector(targetId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // Create dark mode toggle
  const toggle = document.createElement("button");
  toggle.className = "theme-toggle";
  toggle.textContent = "☾"; // simple, modern icon substitute
  document.body.appendChild(toggle);

  // Apply stored theme or default to light
  const currentTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", currentTheme);
  updateToggleSymbol(currentTheme);

  // Toggle theme
  toggle.addEventListener("click", () => {
    const newTheme =
      document.documentElement.getAttribute("data-theme") === "light"
        ? "dark"
        : "light";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateToggleSymbol(newTheme);
  });

  function updateToggleSymbol(theme) {
    toggle.textContent = theme === "light" ? "☾" : "☀";
  }
});