// gallery.js (REPLACE your existing file with this)
// Robust lightbox + keyboard navigation for the gallery thumbnails.
// Works whether thumbnails are <img class="gallery-item"> OR <div class="gallery-item"><img></div>

(function () {
  document.addEventListener("DOMContentLoaded", init);

  function init() {
    // Grab all imgs inside #gallery (covers both patterns)
    const thumbs = Array.from(document.querySelectorAll("#gallery img"));

    if (!thumbs.length) {
      // no thumbnails found — nothing to do
      return;
    }

    // Create/find lightbox
    let lightbox = document.getElementById("lightbox");
    if (!lightbox) {
      lightbox = document.createElement("div");
      lightbox.id = "lightbox";
      lightbox.setAttribute("aria-hidden", "true");
      Object.assign(lightbox.style, {
        position: "fixed",
        inset: "0",
        display: "none",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.85)",
        zIndex: "10000",
        padding: "20px",
      });

      lightbox.innerHTML = `
        <div id="lb-inner" style="position:relative; max-width:90vw; max-height:90vh; width: min(1100px,95%); display:flex; align-items:center; justify-content:center;">
          <button id="lightbox-close" aria-label="Close" style="position:absolute; top:12px; right:12px; z-index:11; background:#222; color:#fff; border:none; padding:8px 10px; border-radius:6px; cursor:pointer;">✕</button>
          <button id="lightbox-prev" aria-label="Previous" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); z-index:11; background:#222; color:#fff; border:none; padding:8px 10px; border-radius:6px; cursor:pointer;">◀</button>
          <button id="lightbox-next" aria-label="Next" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); z-index:11; background:#222; color:#fff; border:none; padding:8px 10px; border-radius:6px; cursor:pointer;">▶</button>
          <img id="lightbox-img" src="" alt="Expanded view" style="max-width:100%; max-height:100%; display:block; pointer-events:none; box-shadow:0 10px 40px rgba(0,0,0,0.6); border-radius:6px;" />
        </div>
      `;
      document.body.appendChild(lightbox);
    }

    const lbInner = document.getElementById("lb-inner");
    const lbImg = document.getElementById("lightbox-img");
    const btnClose = document.getElementById("lightbox-close");
    const btnNext = document.getElementById("lightbox-next");
    const btnPrev = document.getElementById("lightbox-prev");

    // Build list of thumbnails we WILL open in image lightbox
    // Exclude images that belong to a model preview (inside .model-viewer).
    const imageThumbs = thumbs.filter(img => {
      const parent = img.closest(".model-viewer");
      return parent ? false : true;
    });

    // If nothing to show in image lightbox, we still want to wire 3D previews, so continue.
    const sources = imageThumbs.map(t => t.getAttribute("src"));

    let current = 0;

    function showLightbox(index) {
      if (!imageThumbs.length) return;
      if (index < 0) index = imageThumbs.length - 1;
      if (index >= imageThumbs.length) index = 0;
      current = index;

      // support data-full if you have hi-res versions
      const source = imageThumbs[index].dataset.full || imageThumbs[index].src || sources[index];
      lbImg.src = source;
      lbImg.alt = imageThumbs[index].alt || "Artwork";

      lightbox.style.display = "flex";
      lightbox.setAttribute("aria-hidden", "false");

      if (window.gsap) {
        gsap.fromTo(lightbox, { opacity: 0 }, { opacity: 1, duration: 0.25 });
        gsap.fromTo(lbImg, { scale: 0.96, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "power2.out" });
      } else {
        lightbox.style.opacity = 1;
      }

      // focus for keyboard
      btnNext.focus();
    }

    function hideLightbox() {
      if (window.gsap) {
        gsap.to(lightbox, {
          opacity: 0,
          duration: 0.18,
          onComplete() {
            lightbox.style.display = "none";
            lightbox.setAttribute("aria-hidden", "true");
            lbImg.src = "";
          }
        });
      } else {
        lightbox.style.display = "none";
        lightbox.setAttribute("aria-hidden", "true");
        lbImg.src = "";
      }
    }

    function showNext() { showLightbox(current + 1); }
    function showPrev() { showLightbox(current - 1); }

    // Wire thumbs (two cases: image element is the .gallery-item OR the image is inside a .gallery-item wrapper)
    thumbs.forEach((img) => {
      const galleryItem = img.closest(".gallery-item");
      const isModelPreview = galleryItem && galleryItem.classList.contains("model-viewer");

      // Cursor affordance
      img.style.cursor = isModelPreview ? "pointer" : "zoom-in";

      img.addEventListener("click", (e) => {
        e.stopPropagation();

        if (isModelPreview) {
          // Let the existing viewer code handle it — trigger click on the model container
          galleryItem.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          return;
        }

        // If it's an image thumbnail, find its index among imageThumbs
        const idx = imageThumbs.indexOf(img);
        if (idx >= 0) {
          showLightbox(idx);
        } else {
          // fallback: try to find by src
          const src = img.src;
          const fallbackIndex = imageThumbs.findIndex(t => t.src === src || t.dataset.full === src);
          if (fallbackIndex >= 0) showLightbox(fallbackIndex);
        }
      });
    });

    // Buttons
    btnNext.addEventListener("click", (e) => { e.stopPropagation(); showNext(); });
    btnPrev.addEventListener("click", (e) => { e.stopPropagation(); showPrev(); });
    btnClose.addEventListener("click", (e) => { e.stopPropagation(); hideLightbox(); });

    // Click backdrop to close (only if clicked outside inner)
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) hideLightbox();
    });

    // Keyboard navigation (works only when lightbox is visible)
    window.addEventListener("keydown", (e) => {
      const visible = lightbox.style.display !== "none" && window.getComputedStyle(lightbox).display !== "none";
      if (!visible) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        showNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        showPrev();
      } else if (e.key === "Escape") {
        e.preventDefault();
        hideLightbox();
      }
    });

    // Prevent body scroll when lightbox is visible (small accessibility nicety)
    const observer = new MutationObserver(() => {
      const visible = lightbox.style.display !== "none" && window.getComputedStyle(lightbox).display !== "none";
      document.documentElement.style.overflow = visible ? "hidden" : "";
    });
    observer.observe(lightbox, { attributes: true, attributeFilter: ["style", "aria-hidden"] });
  }
})();
