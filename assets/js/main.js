document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const templateCards = document.querySelectorAll('[data-card]');
  const revealItems = document.querySelectorAll('.reveal');
  const showcase = document.getElementById('heroShowcase');
  const year = document.getElementById('currentYear');

  const syncNavbar = () => {
    navbar?.classList.toggle('scrolled', window.scrollY > 16);
  };

  syncNavbar();
  window.addEventListener('scroll', syncNavbar, { passive: true });

  navToggle?.addEventListener('click', () => {
    const open = navMenu?.classList.toggle('open') || false;
    navToggle.setAttribute('aria-expanded', String(open));
  });

  navMenu?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      navToggle?.setAttribute('aria-expanded', 'false');
    });
  });

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter || 'all';

      tabButtons.forEach((item) => item.classList.toggle('active', item === button));

      templateCards.forEach((card) => {
        const visible = filter === 'all' || card.classList.contains(filter);

        if (visible) {
          card.hidden = false;
          requestAnimationFrame(() => card.classList.add('visible'));
        } else {
          card.classList.remove('visible');
          card.hidden = true;
        }
      });
    });
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        instance.unobserve(entry.target);
      });
    }, { threshold: 0.13 });

    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('visible'));
  }

  if (
    showcase &&
    !window.matchMedia('(pointer: coarse)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    showcase.addEventListener('pointermove', (event) => {
      const rect = showcase.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      showcase.style.transform =
        `perspective(1200px) rotateY(${x * 3.5}deg) rotateX(${-y * 3}deg)`;
    });

    showcase.addEventListener('pointerleave', () => {
      showcase.style.transform = '';
    });
  }

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }
});
