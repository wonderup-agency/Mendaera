<!-- Lenis.js  -->
<script src="https://unpkg.com/lenis@1.2.3/dist/lenis.min.js"></script>
<script>

  const lenis = new Lenis({
    prevent: (node) => node.closest('[data-w-lightbox]') !== null
  });
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  lenis.stop();
  $(document).ready(function(){lenis.start();})
  lenis.on('scroll', ({ scroll }) => {
    if (scroll >= 50) {
      document.querySelector('.nav_component').style.transform = 'translateY(-100%)';
    } else {
      document.querySelector('.nav_component').style.transform = 'translateY(0%)';
    }
  });


</script>

<script>
  document.addEventListener('DOMContentLoaded', () => {
    if(document.querySelector('.is-test-env')){
      const button = document.querySelector('.is-test-env');
      if (window.location.hostname === 'mendaera-wup.webflow.io') {
        button.style.display = 'block'; 
      } else {
        button.style.display = 'none';
      }
    }
  });
</script>
<!-- Global Animations  -->
<script>
// fade-up: individual elements fade in + slide up
document.querySelectorAll('[data-animate="fade-up"]').forEach((el) => {
  gsap.set(el, { opacity: 0, y: 20 })
  gsap.to(el, {
    opacity: 1,
    y: 0,
    duration: 0.7,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: el,
      start: 'top 85%',
      toggleActions: 'play none none none',
    },
  })
})

// stagger: direct children fade in + slide up with stagger
document.querySelectorAll('[data-animate="stagger"]').forEach((container) => {
  const children = container.children
  if (!children.length) return
  gsap.set(children, { opacity: 0, y: 20 })
  gsap.to(children, {
    opacity: 1,
    y: 0,
    duration: 0.7,
    stagger: 0.12,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: container,
      start: 'top 85%',
      toggleActions: 'play none none none',
    },
  })
})
// ------------------------
// Line Animations — horizontal (center→edges) & vertical (top→bottom)
// ------------------------

// Horizontal lines: scaleX 0→1 from center, then corner icons
document.querySelectorAll('.horizontal_line-wrapper').forEach((wrapper) => {
  const line = wrapper.querySelector('.horizontal_line')
  const icons = wrapper.querySelectorAll('.horizontal_icon')
  if (!line) return

  gsap.set(line, { scaleX: 0, transformOrigin: '50% 50%' })
  gsap.set(icons, { opacity: 0, scale: 0 })

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: wrapper,
      start: 'top 90%',
      toggleActions: 'play none none none',
    },
  })

  tl.to(line, {
    scaleX: 1,
    duration: 1.2,
    ease: 'power2.inOut',
  })
  tl.to(icons, {
    opacity: 1,
    scale: 1,
    duration: 0.4,
    stagger: 0.15,
    ease: 'back.out(1.4)',
  }, '-=0.15')
})

// Vertical lines: scaleY 0→1 top to bottom, then plus icons
document.querySelectorAll('.vertical_line-wrapper').forEach((wrapper) => {
  const line = wrapper.querySelector('.vertical_line')
  const icons = wrapper.querySelectorAll('.vertical_icon')
  if (!line) return

  gsap.set(line, { scaleY: 0, transformOrigin: '50% 0%' })
  gsap.set(icons, { opacity: 0, scale: 0 })

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: wrapper,
      start: 'top 90%',
      toggleActions: 'play none none none',
    },
  })

  tl.to(line, {
    scaleY: 1,
    duration: 1.2,
    ease: 'power2.inOut',
  })
  tl.to(icons, {
    opacity: 1,
    scale: 1,
    duration: 0.4,
    stagger: 0.15,
    ease: 'back.out(1.4)',
  }, '-=0.15')
})
</script>