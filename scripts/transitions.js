// scripts/transitions.js
(function () {
  const buttons = Array.from(document.querySelectorAll('.nav-btn'));
  const sections = Array.from(document.querySelectorAll('.page-section'));
  const overlay = document.getElementById('page-overlay');

  if (!buttons.length || !sections.length) return;

  function showSection(id) {
    const target = document.getElementById(id);
    if (!target) return;

    // update active classes on nav
    buttons.forEach(b => b.classList.toggle('active', b.dataset.target === id));

    // if gsap available, do a horizontal slide
    if (window.gsap) {
      const current = sections.findIndex(s => s.classList.contains('active'));
      const nextIndex = sections.indexOf(target);
      if (current === nextIndex) return;
      const dir = (nextIndex > current) ? 1 : -1;

      // prepare next
      target.style.transform = `translateX(${dir * 20}%)`;
      target.style.opacity = '0';
      target.classList.add('active');

      const anims = [];
      anims.push(gsap.to(sections[current], { xPercent: -dir * 10, autoAlpha: 0, duration: 0.42, ease: 'power2.in', onComplete: () => {
        sections[current].classList.remove('active');
        sections[current].style.transform = '';
        sections[current].style.opacity = '';
      }}));
      anims.push(gsap.fromTo(target, { xPercent: dir * 10, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 0.48, ease: 'power2.out' }));
    } else {
      // fallback: simple swap
      sections.forEach(s => s.classList.remove('active'));
      target.classList.add('active');
    }
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.target;
      showSection(t);
    });
  });

  // init: first button active
  const first = buttons[0];
  if (first) first.classList.add('active');
})();