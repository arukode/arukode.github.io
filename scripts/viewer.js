// viewer.js
// Add a rotating 3D thumbnail inside each .model-viewer and open a larger modal viewer on click.
// Safe checks for OrbitControls / GLTFLoader being either globals or properties on THREE.

(function () {
  // small helper to pick available controls/loader
  const ControlsClass = (typeof OrbitControls !== 'undefined') ? OrbitControls
    : (THREE && THREE.OrbitControls) ? THREE.OrbitControls
    : null;

  const GLTFLoaderClass = (typeof GLTFLoader !== 'undefined') ? GLTFLoader
    : (THREE && THREE.GLTFLoader) ? THREE.GLTFLoader
    : null;

  if (!GLTFLoaderClass) {
    console.error('GLTFLoader not found. Make sure three/examples/js/loaders/GLTFLoader.js is loaded.');
    return;
  }
  if (!ControlsClass) {
    console.warn('OrbitControls not found. Thumbnails will be auto-rotating (no interactive orbit).');
  }

  // default thumbnail size (px)
  const THUMB_SIZE = 220;

  // utility: compute model center and size, then recenter model
  function centerModel(object3D) {
    const box = new THREE.Box3().setFromObject(object3D);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    // move model so center is at origin
    object3D.position.sub(center);

    return { center, size };
  }

  // create a renderer with device pixel ratio guard
  function createRenderer({ width, height, antialias = true, alpha = true }) {
    const r = new THREE.WebGLRenderer({ antialias, alpha });
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    r.setPixelRatio(dpr);
    r.setSize(width, height, false);
    return r;
  }

  // initialize a thumbnail scene inside a given element, returns controller object
function createThumbnail(el, modelPath) {
  // container for the thumbnail canvas
  const canvasHolder = document.createElement('div');
  canvasHolder.className = 'model-thumb-canvas';
  canvasHolder.style.width = THUMB_SIZE + 'px';
  canvasHolder.style.height = THUMB_SIZE + 'px';
  canvasHolder.style.display = 'inline-block';
  canvasHolder.style.verticalAlign = 'middle';
  canvasHolder.style.overflow = 'hidden';
  canvasHolder.style.borderRadius = '10px';
  canvasHolder.style.background = '#111';
  canvasHolder.style.cursor = 'pointer';

  // replace any text content
  el.innerHTML = '';
  el.appendChild(canvasHolder);

  // --- Scene setup ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  camera.position.set(0, 0, 3);

  const renderer = createRenderer({ width: THUMB_SIZE, height: THUMB_SIZE });
  canvasHolder.appendChild(renderer.domElement);

  // --- Resize handling AFTER canvas exists ---
  const resizeObserver = new ResizeObserver(() => {
    const w = canvasHolder.clientWidth;
    const h = canvasHolder.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
  resizeObserver.observe(canvasHolder);

  // --- Controls setup ---
  const controls = ControlsClass ? new ControlsClass(camera, renderer.domElement) : null;
  if (controls) {
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0;
    controls.target.set(0, 0, 0);
    controls.update();

    // 👇 Add this touch controls fix for mobile
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };
  }

  // --- Lighting ---
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(3, 4, 3);
  scene.add(ambient, dir);

  // --- Load model ---
  const loader = new GLTFLoaderClass();
  let modelRoot = null;

  loader.load(
    modelPath,
    (gltf) => {
      modelRoot = gltf.scene;
      scene.add(modelRoot);

      const { size } = centerModel(modelRoot);
      const maxDim = Math.max(size.x, size.y, size.z, 0.001);
      const fov = camera.fov * (Math.PI / 180);
      const distance = Math.abs(maxDim / Math.sin(fov / 2)) * 0.8;
      camera.position.set(0, 0, distance);
      camera.lookAt(0, 0, 0);
      if (controls) controls.update();
    },
    undefined,
    (err) => console.error('Thumbnail model load error:', err)
  );

  // --- Animation ---
  let rafId = null;
  function animate() {
    rafId = requestAnimationFrame(animate);
    if (controls) {
      controls.update();
    } else if (modelRoot) {
      modelRoot.rotation.y += 0.008;
    }
    renderer.render(scene, camera);
  }

  // --- Mobile render delay ---
  if (/Mobi|Android/i.test(navigator.userAgent)) {
    setTimeout(animate, 300);
  } else {
    animate();
  }

  // cleanup helper
  function dispose() {
    if (rafId) cancelAnimationFrame(rafId);
    renderer.dispose();
    if (renderer.domElement && renderer.domElement.parentNode)
      renderer.domElement.parentNode.removeChild(renderer.domElement);
  }

  return {
    holder: canvasHolder,
    dispose,
    openModal: () => openModalViewer(modelPath)
  };
  }

  // Create and open a modal viewer (bigger)
  function openModalViewer(modelPath) {
    // create overlay modal
    const modal = document.createElement('div');
    modal.className = 'model-modal-overlay';
    modal.style.cssText = `
      position: fixed; inset: 0;
      display: flex; align-items: center; justify-content:center;
      background: rgba(0,0,0,0.85); z-index: 99999;
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      width: 90vw; height: 80vh; max-width: 1400px; max-height: 900px;
      background: #111; border-radius: 12px; position: relative; overflow: hidden;
      display:flex; align-items:center; justify-content:center;
    `;

    // close button
    const closeBtn = document.createElement('button');
    closeBtn.innerText = '✕';
    closeBtn.style.cssText = `
      position:absolute; top:10px; right:12px; z-index:10; background:#222; color:#fff;
      border:none; padding:6px 10px; font-size:20px; border-radius:6px; cursor:pointer;
    `;
    closeBtn.onclick = () => {
      cleanup();
      if (modal.parentNode) modal.parentNode.removeChild(modal);
    };

    modal.appendChild(panel);
    panel.appendChild(closeBtn);
    document.body.appendChild(modal);

    // scene for modal
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    const camera = new THREE.PerspectiveCamera(50, panel.clientWidth / panel.clientHeight, 0.1, 2000);
    camera.position.set(0, 0, 3);

    const renderer = createRenderer({ width: panel.clientWidth, height: panel.clientHeight, antialias: true });
    renderer.setClearColor(0x111111);
    panel.appendChild(renderer.domElement);

    const controls = ControlsClass ? new ControlsClass(camera, renderer.domElement) : null;
    if (controls) {
      controls.enableDamping = true;
      controls.dampingFactor = 0.07;
      controls.enablePan = true;
      controls.autoRotate = false;

    
      controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN
      };
    }

    // lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(3, 5, 3);
    scene.add(dirLight);

    const loader = new GLTFLoaderClass();
    let modelRoot = null;

    loader.load(
      modelPath,
      (gltf) => {
        modelRoot = gltf.scene;
        scene.add(modelRoot);

        const { size } = centerModel(modelRoot);

        const maxDim = Math.max(size.x, size.y, size.z, 0.001);
        const fov = camera.fov * (Math.PI / 180);
        const distance = Math.abs(maxDim / Math.sin(fov / 2)) * 0.9;
        camera.position.set(0, 0, distance);
        camera.lookAt(0, 0, 0);

        if (controls) controls.target.set(0, 0, 0);
        if (controls) controls.update();
      },
      undefined,
      (err) => {
        console.error('Modal viewer load error:', err);
      }
    );

    // animation
    let running = true;
    function animateModal() {
      if (!running) return;
      requestAnimationFrame(animateModal);
      if (controls) controls.update();
      else if (modelRoot) modelRoot.rotation.y += 0.005;
      renderer.render(scene, camera);
    }
    animateModal();

    // resize handling
    const onResize = () => {
      camera.aspect = panel.clientWidth / panel.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(panel.clientWidth, panel.clientHeight);
    };
    window.addEventListener('resize', onResize);

    function cleanup() {
      running = false;
      window.removeEventListener('resize', onResize);
      // attempt to dispose renderer resources
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }

  // Find all .model-viewer elements and create thumbnails.
  document.querySelectorAll('.model-viewer').forEach(el => {
    const modelPath = el.dataset.model || 'models/demo.glb';
    const thumb = createThumbnail(el, modelPath);

    // click opens modal (thumbnail div already receives pointer)
    thumb.holder.addEventListener('click', () => {
      thumb.openModal();
    });
  });

})();
