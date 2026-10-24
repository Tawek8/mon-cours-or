(() => {
  'use strict';
  const button = document.getElementById('document-print'),
    status = document.getElementById('document-print-status');
  document.getElementById('document-close').addEventListener('click', () => window.close());
  let html;
  try {
    html = window.opener?.GoldPrintDocument?.take(location.hash.slice(1));
  } catch {}
  if (!html) {
    button.textContent = 'Document indisponible';
    status.textContent = 'Fermez cette page et relancez Imprimer depuis votre estimation.';
    return;
  }
  const template = document.createElement('template');
  template.innerHTML = html;
  document.body.append(template.content);
  history.replaceState(null, '', location.pathname + location.search);
  function ready() {
    const image = document.querySelector('#client-print-sheet img');
    if (!image.complete) {
      image.addEventListener('load', ready, { once: true });
      image.addEventListener('error', ready, { once: true });
      return;
    }
    button.disabled = false;
    button.textContent = 'Imprimer';
    status.textContent = image.naturalWidth
      ? 'Vérifiez le document, puis appuyez sur Imprimer. Si la fenêtre ne s’ouvre pas, utilisez Partager > Imprimer dans Safari.'
      : 'Le logo est indisponible. Vous pouvez imprimer ou fermer et réessayer.';
  }
  button.addEventListener('click', () => {
    window.print();
  });
  // Aucun nettoyage après impression : Safari peut capturer le document plus tard.
  if (document.readyState === 'complete') ready();
  else window.addEventListener('load', ready, { once: true });
})();
