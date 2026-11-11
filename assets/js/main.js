document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  const showcase = document.getElementById('heroShowcase');
  const year = document.getElementById('currentYear');
  const templateGrid = document.getElementById('templateGrid');
  const publishedTemplateCount = document.getElementById('publishedTemplateCount');

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

  let revealObserver = null;

  if ('IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver((entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        instance.unobserve(entry.target);
      });
    }, { threshold: 0.13 });
  }

  const observeRevealItems = (root = document) => {
    root.querySelectorAll?.('.reveal').forEach((item) => {
      if (item.classList.contains('visible')) return;

      if (revealObserver) {
        revealObserver.observe(item);
      } else {
        item.classList.add('visible');
      }
    });
  };

  const applyTemplateFilter = (filter = 'all') => {
    document.querySelectorAll('[data-card]').forEach((card) => {
      const visible = filter === 'all' || card.classList.contains(filter);

      if (visible) {
        card.hidden = false;
        requestAnimationFrame(() => card.classList.add('visible'));
      } else {
        card.classList.remove('visible');
        card.hidden = true;
      }
    });
  };

  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter || 'all';

      document.querySelectorAll('.tab-btn').forEach((item) => {
        item.classList.toggle('active', item === button);
      });

      applyTemplateFilter(filter);
    });
  });

  function createTemplateCard(template, index) {
    const article = document.createElement('article');
    article.classList.add('template-card', 'reveal');
    article.dataset.card = '';
    article.dataset.registryTemplate = '';

    const collection = String(template.collection || 'pasangan').trim().toLowerCase();
    if (/^[a-z0-9-]{2,50}$/.test(collection)) {
      article.classList.add(collection);
    }

    if (template.featured) article.classList.add('featured');

    const media = document.createElement('div');
    media.className = 'template-media';

    const image = document.createElement('img');
    image.src = String(template.thumbnail_url || '');
    image.alt = `Preview ${template.name || template.slug || 'template'}`;
    image.loading = 'lazy';
    media.appendChild(image);

    if (template.featured) {
      const badge = document.createElement('span');
      badge.className = 'template-badge';
      badge.textContent = 'Featured';
      media.appendChild(badge);
    }

    const number = document.createElement('span');
    number.className = 'template-number';
    number.textContent = String(index + 1).padStart(2, '0');
    media.appendChild(number);

    const content = document.createElement('div');
    content.className = 'template-content';

    const meta = document.createElement('div');
    meta.className = 'template-meta';

    const primaryMeta = document.createElement('span');
    primaryMeta.textContent = String(template.category_label || 'Template');
    meta.appendChild(primaryMeta);

    if (template.secondary_label) {
      const secondaryMeta = document.createElement('span');
      secondaryMeta.textContent = String(template.secondary_label);
      meta.appendChild(secondaryMeta);
    }

    const title = document.createElement('h3');
    title.textContent = String(template.name || template.slug || 'Template');

    const description = document.createElement('p');
    description.textContent = String(template.description || '');

    const actions = document.createElement('div');
    actions.className = 'template-actions';

    const folder = encodeURIComponent(String(template.folder || 'pasangan'));
    const slug = encodeURIComponent(String(template.slug || ''));
    const previewId = encodeURIComponent(String(template.preview_id || ''));

    const preview = document.createElement('a');
    preview.className = 'btn-preview';
    preview.target = '_blank';
    preview.rel = 'noopener noreferrer';
    preview.href = `templates/${folder}/${slug}/index.html?id=${previewId}`;
    preview.textContent = 'Preview';

    const order = document.createElement('a');
    order.className = 'btn-order';
    order.href = `order.html?template=${slug}`;
    order.append('Gunakan ');

    const arrow = document.createElement('span');
    arrow.textContent = '↗';
    order.appendChild(arrow);

    actions.append(preview, order);
    content.append(meta, title, description, actions);

    if (template.demo_hint) {
      const hint = document.createElement('p');
      hint.className = 'demo-hint';
      hint.textContent = String(template.demo_hint);
      content.appendChild(hint);
    }

    article.append(media, content);
    return article;
  }

  async function loadTemplateCatalog() {
    if (!templateGrid || !window.KadoDigital?.createSupabaseClient) return;

    try {
      const supabaseClient = window.KadoDigital.createSupabaseClient();
      const { data, error } = await supabaseClient
        .from('templates')
        .select([
          'slug',
          'name',
          'collection',
          'category_label',
          'secondary_label',
          'description',
          'thumbnail_url',
          'folder',
          'preview_id',
          'demo_hint',
          'featured',
          'sort_order'
        ].join(','))
        .eq('status', 'published')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const templates = Array.isArray(data) ? data : [];
      if (!templates.length) return;

      templateGrid.querySelectorAll('[data-registry-template]').forEach((item) => {
        item.remove();
      });

      const customCard = templateGrid.querySelector('.custom-card');

      templates.forEach((template, index) => {
        const card = createTemplateCard(template, index);
        templateGrid.insertBefore(card, customCard || null);
        observeRevealItems(card);
      });

      if (publishedTemplateCount) {
        publishedTemplateCount.textContent = String(templates.length);
      }

      const activeFilter =
        document.querySelector('.tab-btn.active')?.dataset.filter || 'all';
      applyTemplateFilter(activeFilter);
    } catch (error) {
      console.warn('Katalog template memakai fallback statis:', error);
    }
  }

  observeRevealItems();

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

  void loadTemplateCatalog();
});
