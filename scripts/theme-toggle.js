document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('theme-switch');
  const root = document.documentElement;

  toggle.addEventListener('change', () => {
    const isLight = toggle.checked;
    gsap.to(root, {
      duration: 0.6,
      "--bg-color": isLight ? "#fafafa" : "#111",
      "--text-color": isLight ? "#111" : "#fff",
      "--accent": isLight ? "#1e88e5" : "#fcbf49",
      "--header-bg": isLight ? "#fff" : "#000",
      ease: "power2.inOut"
    });
    root.setAttribute("data-theme", isLight ? "light" : "dark");
  });
});