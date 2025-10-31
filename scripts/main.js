// main.js — smooth transitions, no home-page ghosting
document.addEventListener("DOMContentLoaded", () => {
  const sections = document.querySelectorAll(".page-section");
  const buttons = document.querySelectorAll(".nav-btn");
  const underline = document.querySelector(".nav-underline");
  const logo = document.getElementById("logo");
  const overlay = document.querySelector(".page-transition");

  let current = document.querySelector(".page-section.active");
  if (!current) {
    current = document.getElementById("home") || sections[0];
    if (current) current.classList.add("active");
  }

  let animating = false;

  function moveUnderline(btn) {
    if (!underline || !btn) return;
    const { offsetLeft, offsetWidth } = btn;
    underline.style.left = `${offsetLeft}px`;
    underline.style.width = `${offsetWidth}px`;
  }

  const activeBtn = document.querySelector(".nav-btn.active");
  if (activeBtn) moveUnderline(activeBtn);

  function showSection(id) {
  if (animating) return;
  const target = document.getElementById(id);
  if (!target || target === current) return;

  animating = true;
  const overlay = document.querySelector(".page-transition");
  overlay.classList.add("active");

  // Preload state
  gsap.set(target, { opacity: 0, xPercent: 8, zIndex: 2, visibility: "visible" });

  const tl = gsap.timeline({
    defaults: { duration: 0.4, ease: "power2.out" },
    onComplete: () => {
      current.classList.remove("active");
      target.classList.add("active");

      // Reset states
      gsap.set(current, { opacity: 0, zIndex: 1, visibility: "hidden" });
      overlay.classList.remove("active");
      current = target;
      animating = false;
    }
  });

  tl.to(current, { opacity: 0, xPercent: -5 })
    .to(target, { opacity: 1, xPercent: 0 }, "-=0.2");
}

  // Navigation buttons
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("active")) return;
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      moveUnderline(btn);
      showSection(btn.dataset.target);
    });
  });


  // --- Logo goes to hidden Home (no underline) ---
  if (logo) {
  logo.addEventListener("click", (e) => {
    e.preventDefault();

    // Remove active highlight from all nav buttons
    buttons.forEach(b => b.classList.remove("active"));

    // Reset the underline fully
    if (underline) {
      underline.style.width = "0";
      underline.style.left = "0";
    }

    // Always force show home, even if current === home
    if (current.id !== "home") {
      showSection("home");
    }
  });
}

  window.addEventListener("resize", () => {
    const active = document.querySelector(".nav-btn.active");
    if (active) moveUnderline(active);
  });
});

/* ----------------------------
   Snipcart handling (NO auto-close)
   ---------------------------- */
(function () {
  const debug = false;
  const dlog = (...a) => debug && console.log("[SNIPCART]", ...a);

  function isCartOpen() {
    try {
      const bodyHas = document.body.classList.contains("snipcart-cart--opened")
        || document.body.classList.contains("snipcart-checkout")
        || document.body.classList.contains("snipcart-open");
      const cartNodes = document.querySelectorAll("snipcart-cart, .snipcart, .snipcart__container, .snipcart-modal");
      const visible = Array.from(cartNodes).some(n => n.offsetParent !== null);
      return bodyHas || visible;
    } catch {
      return false;
    }
  }

  function wireCartUI() {
    const cartIcon = document.querySelector(".cart-icon");
    const cartCount = document.querySelector(".cart-count");
    if (!window.Snipcart || !Snipcart.store) return;

    Snipcart.store.subscribe(() => {
      try {
        const state = Snipcart.store.getState();
        const count = state?.cart?.items?.count ?? 0;
        if (cartCount) cartCount.textContent = count;

        if (cartIcon) {
          cartIcon.classList.add("cart-bump");
          setTimeout(() => cartIcon.classList.remove("cart-bump"), 420);
        }
      } catch (e) {
        dlog("store subscribe err", e);
      }
    });
  }

  function attachHandlers() {
    try {
      if (window.Snipcart && window.Snipcart.events) {
        window.addEventListener("keydown", e => {
          if ((e.key === "Escape" || e.key === "Esc") && isCartOpen()) {
            try {
              window.Snipcart.api?.theme?.cart?.close?.();
              dlog("ESC closed cart");
            } catch (err) {
              dlog("ESC close failed", err);
            }
          }
        });
        wireCartUI();
      }
    } catch (err) {
      dlog("attachHandlers error", err);
    }
  }

  function waitForSnipcart(maxWait = 8000) {
    let attached = false;
    const safeAttach = () => {
      if (attached) return;
      attached = true;
      attachHandlers();
    };
    document.addEventListener("snipcart.ready", safeAttach);
    const poll = setInterval(() => {
      if (window.Snipcart?.events && window.Snipcart?.api) {
        clearInterval(poll);
        safeAttach();
      }
    }, 250);
    setTimeout(() => {
      if (!attached) {
        clearInterval(poll);
        safeAttach();
      }
    }, maxWait);
  }

  waitForSnipcart();
})();