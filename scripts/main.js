document.addEventListener("DOMContentLoaded", () => {
  const sections = document.querySelectorAll(".page-section");
  const buttons = document.querySelectorAll(".nav-btn");
  const underline = document.querySelector(".nav-underline");
  const logo = document.getElementById("logo");
  let current = document.querySelector(".page-section.active");
  let animating = false;

  // --- Move underline to active button ---
  function moveUnderline(btn) {
    if (!underline || !btn) return;
    const { offsetLeft, offsetWidth } = btn;
    underline.style.left = `${offsetLeft}px`;
    underline.style.width = `${offsetWidth}px`;
  }

  const activeBtn = document.querySelector(".nav-btn.active");
  if (activeBtn) moveUnderline(activeBtn);

  // --- Handle section switching ---
  function showSection(id) {
  if (animating) return;
  const target = document.getElementById(id);
  if (!target || target === current) return;

  animating = true;

  // Prepare target: visible but hidden behind
  target.style.display = "flex";
  target.style.opacity = 0;
  target.style.zIndex = 2;

  // Current is above
  current.style.zIndex = 3;

  const tl = gsap.timeline({
    defaults: { duration: 0.5, ease: "power2.inOut" },
    onComplete: () => {
      current.style.display = "none";
      current.classList.remove("active");
      target.classList.add("active");
      current = target;
      animating = false;
    }
  });

  // Animate out old, then animate in new — no overlap
  tl.to(current, { opacity: 0, xPercent: -8 })
    .set(current, { zIndex: 1 }) // lower it *after* fading out
    .fromTo(target, { opacity: 0, xPercent: 8 }, { opacity: 1, xPercent: 0 });

}

  // --- Navigation buttons ---
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("active")) return;
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      moveUnderline(btn);
      showSection(btn.dataset.target);
    });
  });

  // --- Logo resets to About ---
  if (logo) {
    logo.addEventListener("click", e => {
      e.preventDefault();
      buttons.forEach(b => b.classList.remove("active"));
      buttons[0].classList.add("active");
      moveUnderline(buttons[0]);
      showSection("about");
    });
  }

  // --- Reposition underline on resize ---
  window.addEventListener("resize", () => {
    const active = document.querySelector(".nav-btn.active");
    if (active) moveUnderline(active);
  });
});