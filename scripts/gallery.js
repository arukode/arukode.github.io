// gallery.js - self-contained, robust two-layer lightbox with smooth slide transitions.
// Drop-in replacement: creates its own DOM + inline styles so it works regardless of external CSS.

(function () {
  document.addEventListener("DOMContentLoaded", init);

  function init() {
    const thumbs = Array.from(document.querySelectorAll("#gallery img"));
    if (!thumbs.length) return;

    // Build / find lightbox DOM (self-contained)
    let lightbox = document.getElementById("lightbox");
    if (!lightbox) {
      lightbox = document.createElement("div");
      lightbox.id = "lightbox";
      lightbox.setAttribute("aria-hidden", "true");

      // Minimal inline style for container to avoid depending on external CSS
      Object.assign(lightbox.style, {
        position: "fixed",
        inset: "0",
        display: "none",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.9)",
        zIndex: "10000",
        overflow: "hidden",
        padding: "20px",
        boxSizing: "border-box",
      });

      lightbox.innerHTML = `
        <div id="lb-inner" aria-hidden="true" style="position:relative; width:min(90vw,1100px); height:90vh; max-height:90vh; display:flex; align-items:center; justify-content:center; overflow:hidden;">
          <button id="lightbox-close" aria-label="Close" title="Close">✕</button>
          <button id="lightbox-prev" aria-label="Previous" title="Previous">◀</button>
          <button id="lightbox-next" aria-label="Next" title="Next">▶</button>
          <div id="lb-stage" style="position:relative; width:100%; height:100%; display:flex; align-items:center; justify-content:center; overflow:hidden;">
            <img id="lb-img-a" src="" alt="" />
            <img id="lb-img-b" src="" alt="" />
          </div>
        </div>
      `;

      document.body.appendChild(lightbox);

      // style buttons + images via JS to be robust
      const btnClose = lightbox.querySelector("#lightbox-close");
      const btnPrev = lightbox.querySelector("#lightbox-prev");
      const btnNext = lightbox.querySelector("#lightbox-next");
      const imgs = lightbox.querySelectorAll("img");

      // Buttons style
      [btnClose, btnPrev, btnNext].forEach(b => {
        Object.assign(b.style, {
          position: "absolute",
          background: "rgba(30,30,30,0.85)",
          color: "#fff",
          border: "none",
          padding: "8px 10px",
          borderRadius: "6px",
          cursor: "pointer",
          zIndex: "12",
        });
      });

      Object.assign(btnClose.style, { top: "14px", right: "14px" });
      Object.assign(btnPrev.style, { left: "14px", top: "50%", transform: "translateY(-50%)" });
      Object.assign(btnNext.style, { right: "14px", top: "50%", transform: "translateY(-50%)" });

      // Images style (both layers)
      imgs.forEach(img => {
        Object.assign(img.style, {
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          maxWidth: "90vw",
          maxHeight: "90vh",
          width: "auto",
          height: "auto",
          objectFit: "contain",
          borderRadius: "8px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
          transition: "transform 0.44s ease, opacity 0.44s ease",
          opacity: "0",
          zIndex: "1",
          pointerEvents: "none",
        });
      });
    }

    const lbInner = document.getElementById("lb-inner");
    const lbStage = document.getElementById("lb-stage");
    const lbA = document.getElementById("lb-img-a");
    const lbB = document.getElementById("lb-img-b");
    const btnClose = document.getElementById("lightbox-close");
    const btnNext = document.getElementById("lightbox-next");
    const btnPrev = document.getElementById("lightbox-prev");

    // Build list of images to open (exclude 3D .model-viewer)
    const imageThumbs = thumbs.filter(img => !img.closest(".model-viewer"));
    if (!imageThumbs.length) return;

    let current = 0;
    let animating = false;
    let showingA = true; // which layer is currently visible (A or B)

    // Helper: preload image, resolves when at least first frame loaded
    function preload(src) {
      return new Promise((resolve) => {
        const p = new Image();
        p.onload = () => resolve();
        p.onerror = () => resolve(); // don't block if error
        p.src = src;
      });
    }

    // Helper to set a layer's src and alt and ensure it's ready
    async function prepareLayer(layer, src, alt) {
      // For GIFs we still want first frame to show quickly; setting src will start GIF
      await preload(src);
      layer.src = src;
      layer.alt = alt || "Artwork";
    }

    // Ensure only one image element is visible/interactive after transition
    function finalizeSwap(front, back) {
      // front will be the active visible one after transition
      front.style.opacity = "1";
      front.style.zIndex = "3";
      back.style.opacity = "0";
      back.style.zIndex = "1";
      // Reset transforms to center
      front.style.transform = "translate(-50%, -50%)";
      back.style.transform = "translate(-50%, -50%)";
      // Mark showingA accordingly
      showingA = (front === lbA);
      animating = false;
    }

    // Slide routine: direction === 1 -> next (enter from right), -1 -> prev (enter from left)
    async function slideTo(index, direction) {
      if (animating) return;
      animating = true;
      if (index < 0) index = imageThumbs.length - 1;
      if (index >= imageThumbs.length) index = 0;
      current = index;

      const src = imageThumbs[index].dataset.full || imageThumbs[index].src;
      const alt = imageThumbs[index].alt || "Artwork";

      const front = showingA ? lbA : lbB; // currently visible
      const back = showingA ? lbB : lbA;  // incoming

      // Prepare incoming image in back layer (preload then set src)
      await prepareLayer(back, src, alt);

      // Position incoming off-screen based on direction (use transforms centered at 50/50)
      // We'll use percentage transforms relative to center so geometry is stable
      if (direction === 1) {
        // enter from right
        back.style.transform = "translate(150%, -50%)";
      } else {
        // enter from left
        back.style.transform = "translate(-150%, -50%)";
      }
      back.style.opacity = "1";
      back.style.zIndex = "2";

      // Force reflow so the transform takes effect before transition to center
      /* eslint-disable no-unused-expressions */
      back.offsetHeight;
      /* eslint-enable no-unused-expressions */

      // Listen for transitionend on back to finalize
      let called = false;
      function onBackEnd(ev) {
        if (ev.target !== back) return;
        if (called) return;
        called = true;
        back.removeEventListener("transitionend", onBackEnd);
        finalizeSwap(back, front);
      }
      back.addEventListener("transitionend", onBackEnd);

      // Trigger the transitions:
      // - Move incoming (back) into center
      back.style.transform = "translate(-50%, -50%)";
      back.style.opacity = "1";

      // - Move outgoing (front) out of view
      if (direction === 1) {
        // slide front to left
        front.style.transform = "translate(-250%, -50%)";
      } else {
        // slide front to right
        front.style.transform = "translate(150%, -50%)";
      }
      front.style.opacity = "0";

      // Safety: if transitionend doesn't fire (some browsers), fallback after duration
      setTimeout(() => {
        if (!called) {
          called = true;
          back.removeEventListener("transitionend", onBackEnd);
          finalizeSwap(back, front);
        }
      }, 520);
    }

    // Show lightbox (open at index)
    async function showLightbox(index) {
      if (animating) return;
      if (index < 0) index = 0;
      if (index >= imageThumbs.length) index = 0;
      current = index;

      const src = imageThumbs[index].dataset.full || imageThumbs[index].src;
      const alt = imageThumbs[index].alt || "Artwork";

      // Show overlay but keep images hidden until loaded (avoid black box)
      lightbox.style.display = "flex";
      lightbox.setAttribute("aria-hidden", "false");
      document.documentElement.style.overflow = "hidden";

      // prepare both layers to a known state
      lbA.style.opacity = "0"; lbA.style.zIndex = "1"; lbA.style.transform = "translate(-50%, -50%)";
      lbB.style.opacity = "0"; lbB.style.zIndex = "1"; lbB.style.transform = "translate(-50%, -50%)";

      // Load into front layer (use A as front initially)
      const front = lbA;
      await prepareLayer(front, src, alt);
      // ensure front is centered and visible
      front.style.transform = "translate(-50%, -50%)";
      front.style.opacity = "1";
      front.style.zIndex = "3";
      showingA = true;
      animating = false;
    }

    function hideLightbox() {
      // clear layers
      lbA.src = "";
      lbB.src = "";
      lightbox.style.display = "none";
      lightbox.setAttribute("aria-hidden", "true");
      document.documentElement.style.overflow = "";
      animating = false;
    }

    // Attach click handlers to thumbnails
    thumbs.forEach((img) => {
      const galleryItem = img.closest(".gallery-item");
      const isModelPreview = galleryItem && galleryItem.classList.contains("model-viewer");
      img.style.cursor = isModelPreview ? "pointer" : "zoom-in";

      img.addEventListener("click", (e) => {
        e.stopPropagation();
        if (isModelPreview) {
          // trigger existing viewer behavior if any
          galleryItem.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          return;
        }
        const idx = imageThumbs.indexOf(img);
        if (idx >= 0) {
          showLightbox(idx);
        } else {
          // fallback by src
          const s = img.src;
          const fi = imageThumbs.findIndex(t => t.src === s || t.dataset.full === s);
          if (fi >= 0) showLightbox(fi);
        }
      });
    });

    // Buttons
    btnNext.addEventListener("click", (e) => {
      e.stopPropagation();
      slideTo((current + 1) % imageThumbs.length, 1);
    });
    btnPrev.addEventListener("click", (e) => {
      e.stopPropagation();
      slideTo((current - 1 + imageThumbs.length) % imageThumbs.length, -1);
    });
    btnClose.addEventListener("click", (e) => {
      e.stopPropagation();
      hideLightbox();
    });

    // click outside to close
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) hideLightbox();
    });

    // keyboard navigation
    window.addEventListener("keydown", (e) => {
      const visible = lightbox.style.display !== "none" && window.getComputedStyle(lightbox).display !== "none";
      if (!visible) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        slideTo((current + 1) % imageThumbs.length, 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        slideTo((current - 1 + imageThumbs.length) % imageThumbs.length, -1);
      } else if (e.key === "Escape") {
        e.preventDefault();
        hideLightbox();
      }
    });

    // Prevent body scroll while lightbox visible (small accessibility nicety)
    const observer = new MutationObserver(() => {
      const visible = lightbox.style.display !== "none" && window.getComputedStyle(lightbox).display !== "none";
      document.documentElement.style.overflow = visible ? "hidden" : "";
    });
    observer.observe(lightbox, { attributes: true, attributeFilter: ["style", "aria-hidden"] });
  }
})();