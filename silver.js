(() => {
  'use strict';
  const section = document.createElement('section');
  section.id = 'silver-section';
  section.className = 'section';
  section.innerHTML =
    '<h2>Cours de l’Argent</h2><p class="small">Cotations des pièces et lingots · €/produit</p><div id="silver-quotes"></div><p id="silver-status" class="small" aria-live="polite">Chargement des cours d’argent…</p><a class="small" href="https://www.gold.fr/cours-argent-prix-de-l-argent/" target="_blank" rel="noopener">Source : Gold.fr</a>';
  const anchor = document.getElementById('cpor-section');
  anchor.after(section);
  const root = section.querySelector('#silver-quotes'),
    status = section.querySelector('#silver-status');
  let saved = null;
  function validate(p) {
    if (
      !p ||
      !Array.isArray(p.products) ||
      !p.products.length ||
      !Number.isFinite(Date.parse(p.updatedAt))
    )
      throw Error('Format des cours argent inconnu');
    for (const v of p.products)
      if (
        typeof v.name !== 'string' ||
        !['available', 'suspended', 'unavailable'].includes(v.status) ||
        (v.status === 'available' && !(Number.isFinite(v.price) && v.price > 0))
      )
        throw Error('Cotation argent incorrecte');
    return p;
  }
  // Illustrations reprises de GoldGestion (vignettes Gold.fr), trouvées d’après le nom.
  // L’ordre compte : les formats 1 kg avant les 1 once, l’Écu avant les autres Hercule.
  const pictures = [
    ['lingot argent', 'lingot.jpg'],
    ['kookaburra 1kg', 'kookaburra_kg.jpg'],
    ['koala argent 1kg', 'koala_kg.jpg'],
    ['maple', 'maple.jpg'],
    ['vienna', 'vienna.jpg'],
    ['philharmoni', 'vienna.jpg'],
    ['kangourou', 'kangourou.jpg'],
    ['britannia', 'britannia.jpg'],
    ['eagle', 'eagle.jpg'],
    ['krugerrand', 'krugerrand.jpg'],
    ['panda', 'panda.jpg'],
    ['kookaburra', 'kookaburra.jpg'],
    ['koala', 'koala.png'],
    ['20 francs turin', 'turin20.jpg'],
    ['10 francs turin', 'turin10.jpg'],
    ['ecu', 'ecu5.jpg'],
    ['50 francs hercule', 'hercule50.jpg'],
    ['10 francs hercule', 'hercule10.jpg'],
    ['semeuse', 'semeuse5.jpg'],
    ['100 francs', 'franc100.jpg'],
  ];
  function picture(name) {
    const key = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
    return pictures.find(([match]) => key.includes(match))?.[1] || null;
  }
  function render(p) {
    root.replaceChildren();
    const fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
    for (const product of p.products) {
      const row = document.createElement('div');
      row.className = 'quote silver';
      const file = picture(product.name);
      if (file) {
        const img = document.createElement('img');
        img.className = 'quote-img';
        img.src = 'img/argent/' + file;
        img.alt = '';
        img.loading = 'lazy';
        img.onerror = () => img.remove();
        row.append(img);
      }
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = product.name;
      const value = document.createElement('span');
      value.className = 'value';
      value.textContent =
        product.status === 'available'
          ? fmt.format(product.price)
          : product.status === 'suspended'
            ? 'Cotation suspendue'
            : 'Indisponible';
      row.append(name, value);
      root.append(row);
    }
  }
  try {
    const raw = localStorage.getItem('silver-prices');
    if (raw) {
      saved = validate(JSON.parse(raw));
      render(saved);
      status.textContent =
        'Derniers cours enregistrés · Récupérés le ' +
        new Date(saved.updatedAt).toLocaleString('fr-FR');
    }
  } catch {}
  window.refreshSilver = async () => {
    window.GoldFreshness?.start('silver');
    try {
      const response = await fetch('/api/silver', { cache: 'no-store' });
      if (!response.ok) throw Error('HTTP ' + response.status);
      const payload = validate(await response.json());
      saved = payload;
      window.GoldFreshness?.success('silver', payload);
      render(payload);
      localStorage.setItem('silver-prices', JSON.stringify(payload));
      window.dispatchEvent(new Event('prices-updated'));
      status.textContent =
        'Récupérés le ' +
        new Date(payload.updatedAt).toLocaleString('fr-FR') +
        ' · Source : Gold.fr';
    } catch (e) {
      window.GoldFreshness?.fail('silver');
      status.textContent =
        'Actualisation argent impossible : ' +
        e.message +
        (saved
          ? ' · Derniers cours enregistrés du ' + new Date(saved.updatedAt).toLocaleString('fr-FR')
          : ' · Aucun cours disponible');
    }
  };
  window.refreshSilver();
})();
