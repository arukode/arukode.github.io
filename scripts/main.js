// main.js (drop-in replacement)
// Page switching + GSAP + Snipcart integration
// NOTE: Removed any automatic "close cart" logic on item add / nav clicks.
// Cart will remain open unless the user closes it (ESC still works).

document.addEventListener("DOMContentLoaded", () => {
  const sections = document.querySelectorAll(".page-section");
  const buttons = document.querySelectorAll(".nav-btn");
  const underline = document.querySelector(".nav-underline");
  const logo = document.getElementById("logo");

  // pick current active section or fallback to #home
  let current = document.querySelector(".page-section.active");
  if (!current) {
    const home = document.getElementById("home");
    if (home) {
      current = home;
      home.classList.add("active");
    } else {
      current = sections[0];
      if (current) current.classList.add("active");
    }
  }
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

    // Prepare
    target.style.display = "flex";
    target.style.visibility = "visible";
    target.style.zIndex = 2;
    gsap.set(target, { opacity: 0, xPercent: 8 });

    current.style.zIndex = 3;

    const tl = gsap.timeline({
      defaults: { duration: 0.5, ease: "power2.inOut" },
      onComplete: () => {
        current.style.display = "none";
        current.style.visibility = "hidden";
        current.classList.remove("active");

        target.classList.add("active");
        target.style.opacity = 1;
        target.style.zIndex = 2;
        current = target;
        animating = false;
      }
    });

    tl.to(current, { opacity: 0, xPercent: -8 })
      .set(current, { zIndex: 1 })
      .to(target, { opacity: 1, xPercent: 0 }, "-=0.05");
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

  // --- Logo goes to hidden Home (no underline) ---
  if (logo) {
    logo.addEventListener("click", (e) => {
      e.preventDefault();
      buttons.forEach(b => b.classList.remove("active"));
      const u = document.querySelector(".nav-underline");
      if (u) { u.style.width = "0"; u.style.left = "0"; }
      showSection("home");
    });
  }

  // --- Reposition underline on resize ---
  window.addEventListener("resize", () => {
    const active = document.querySelector(".nav-btn.active");
    if (active) moveUnderline(active);
  });
});

/* ----------------------------
   Snipcart handling (NO auto-close)
   ----------------------------
   - No auto-closing on item.added or nav clicks.
   - Update cart UI (count + bump) when Snipcart state changes.
   - ESC will still close the cart if the user presses it.
*/

(function () {
  const debug = false;
  function dlog(...args) { if (debug) console.log('[SNIPCART]', ...args); }

  function isCartOpen() {
    try {
      const bodyHas = document.body.classList.contains('snipcart-cart--opened') ||
                      document.body.classList.contains('snipcart-checkout') ||
                      document.body.classList.contains('snipcart-open');
      const cartNodes = document.querySelectorAll('snipcart-cart, .snipcart, .snipcart__container, .snipcart-modal');
      const visible = Array.from(cartNodes).some(n => n instanceof Element && n.offsetParent !== null);
      const result = bodyHas || visible;
      dlog('isCartOpen ->', result);
      return result;
    } catch (e) {
      return false;
    }
  }

  function wireCartUI() {
    const cartIcon = document.querySelector('.cart-icon');
    const cartCount = document.querySelector('.cart-count');

    if (!window.Snipcart || !Snipcart.store) return;

    Snipcart.store.subscribe(() => {
      try {
        const state = Snipcart.store.getState();
        const count = (state && state.cart && state.cart.items && state.cart.items.count) ? state.cart.items.count : 0;
        if (cartCount) cartCount.textContent = count;

        if (cartIcon) {
          cartIcon.classList.add('cart-bump');
          setTimeout(() => cartIcon.classList.remove('cart-bump'), 420);
        }
      } catch (e) {
        dlog('store subscribe err', e);
      }
    });
  }

  function attachHandlers() {
    try {
      if (window.Snipcart && window.Snipcart.events) {
        // We do NOT close the cart on item.added anymore.
        // But we still wire UI updates and ESC close for manual control.

        // Keep ESC to manually close cart (accessibility)
        window.addEventListener('keydown', (e) => {
          if ((e.key === 'Escape' || e.key === 'Esc') && isCartOpen()) {
            try {
              if (window.Snipcart && window.Snipcart.api && window.Snipcart.api.theme && typeof window.Snipcart.api.theme.cart.close === 'function') {
                window.Snipcart.api.theme.cart.close();
                dlog('ESC: closed cart via theme API');
              }
            } catch (err) {
              dlog('ESC: failed to close via API', err);
            }
          }
        });

        wireCartUI();
      }
    } catch (err) {
      dlog('attachHandlers error', err);
    }
  }

  function waitForSnipcart(maxWait = 8000) {
    let attached = false;

    function safeAttach() {
      if (attached) return;
      attached = true;
      attachHandlers();
    }

    document.addEventListener('snipcart.ready', safeAttach);

    const poll = setInterval(() => {
      if (window.Snipcart && window.Snipcart.events && window.Snipcart.api) {
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