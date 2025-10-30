document.addEventListener("DOMContentLoaded", () => {
  const sections = document.querySelectorAll(".page-section");
  const buttons = document.querySelectorAll(".nav-btn");
  const underline = document.querySelector(".nav-underline");
  const logo = document.getElementById("logo");
  let current = document.querySelector(".page-section.active");
  if (!current) {
  current = document.getElementById("home");
  current.classList.add("active");
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

    // --- Prepare target for animation ---
    target.style.display = "flex";       // make sure it's in layout
    target.style.visibility = "visible"; // renderable for layout
    target.style.zIndex = 2;

    // prepare its start state
    gsap.set(target, { opacity: 0, xPercent: 8 });

    // current stays above for the fade-out
    current.style.zIndex = 3;

    // --- Run animation ---
    const tl = gsap.timeline({
      defaults: { duration: 0.5, ease: "power2.inOut" },
      onComplete: () => {
        // cleanup and swap
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

    // animate out old, fade in new
    tl.to(current, { opacity: 0, xPercent: -8 })
      .set(current, { zIndex: 1 })
      .to(target, { opacity: 1, xPercent: 0 }, "-=0.05"); // slight overlap for smoothness
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

// --- Logo redirects to hidden Home section ---
if (logo) {
  logo.addEventListener("click", e => {
    e.preventDefault();

    // Find a button to keep underline logic consistent (optional)
    buttons.forEach(b => b.classList.remove("active"));
    underline.style.width = "0"; // hide underline when on Home

    showSection("home");
  });
}

  // --- Reposition underline on resize ---
  window.addEventListener("resize", () => {
    const active = document.querySelector(".nav-btn.active");
    if (active) moveUnderline(active);
  });
});


 // ----------------------------
// Snipcart: reliable ESC + nav-close logic (fixed version)
// ----------------------------
(function () {
  const debug = true;
  function dlog(...args) { if (debug) console.log('[SNIPCART CTRL]', ...args); }

  function tryCloseCart() {
    try {
      if (window.Snipcart?.api?.theme?.cart) {
        window.Snipcart.api.theme.cart.close();
        dlog('Closed via Snipcart.api.theme.cart.close()');
        return true;
      }
    } catch (e) { dlog('theme.cart.close failed', e); }

    try {
      if (window.Snipcart?.api?.modal?.close) {
        window.Snipcart.api.modal.close();
        dlog('Closed via Snipcart.api.modal.close()');
        return true;
      }
    } catch (e) { dlog('modal.close failed', e); }

    const closeBtn = document.querySelector('.snipcartclose, .snipcart-close, .snipcartclose-btn, [data-close]');
    if (closeBtn) {
      closeBtn.click();
      dlog('Closed via clicking internal close button', closeBtn);
      return true;
    }

    const overlay = document.querySelector('snipcart-cart, .snipcart, .snipcart__container, .snipcart-modal');
    if (overlay) {
      overlay.style.display = 'none';
      dlog('Force-hidden Snipcart overlay element', overlay);
      return true;
    }

    dlog('No successful close method found');
    return false;
  }

function isCartOpen() {
  // Check both body classes and actual DOM visibility
  const cartElem = document.querySelector('snipcart-cart, .snipcart, .snipcartcontainer, .snipcart-cartcontainer');
  const isVisible = cartElem && (
    cartElem.offsetParent !== null ||
    getComputedStyle(cartElem).visibility !== 'hidden' &&
    getComputedStyle(cartElem).opacity > 0
  );

  const checks = [
    document.body.classList.contains('snipcart-cart--opened'),
    document.body.classList.contains('snipcart-checkout'),
    document.body.classList.contains('snipcart-open'),
    isVisible
  ];

  const result = checks.some(Boolean);
  console.log('[SNIPCART CTRL] isCartOpen ->', result, { visible: isVisible });
  return result;
}

  function attachControls() {
    dlog('Attaching Snipcart controls');

    document.querySelectorAll('.nav-btn, #logo, .nav a').forEach(el => {
      el.addEventListener('click', () => setTimeout(() => {
        if (isCartOpen()) tryCloseCart();
      }, 120));
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (isCartOpen()) {
          const ok = tryCloseCart();
          if (!ok) dlog('ESC pressed but closing failed');
        }
      }
    });

    document.addEventListener('snipcart.open', () => dlog('event: snipcart.open'));
    document.addEventListener('snipcart.close', () => dlog('event: snipcart.close'));
  }

  function waitForSnipcartThenAttach(maxWait = 8000) {
    let attached = false;

    function safeAttach() {
      if (attached) return;
      attached = true;
      attachControls();
    }

    document.addEventListener('snipcart.ready', safeAttach);

    const interval = setInterval(() => {
      if (window.Snipcart && window.Snipcart.api) {
        clearInterval(interval);
        safeAttach();
      }
    }, 300);

    setTimeout(() => {
      if (!attached) {
        clearInterval(interval);
        dlog('Timeout waiting for Snipcart, attaching anyway');
        safeAttach();
      }
    }, maxWait);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitForSnipcartThenAttach());
  } else {
    waitForSnipcartThenAttach();
  }

  window.__snipcartForceClose = tryCloseCart;
})();