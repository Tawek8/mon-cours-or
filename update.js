// Rechercher les nouveaux fichiers sans recharger une saisie en cours.
(()=>{
 'use strict';
 if(!('serviceWorker' in navigator))return;
 const previouslyControlled=!!navigator.serviceWorker.controller;
 let notified=false,registration=null;
 function notify(){
  if(notified||!previouslyControlled)return;notified=true;
  const box=document.createElement('div');box.className='app-update';box.setAttribute('role','status');
  const label=document.createElement('span');label.textContent='Une nouvelle version est disponible.';
  const button=document.createElement('button');button.type='button';button.textContent='Mettre à jour';
  button.addEventListener('click',()=>{button.disabled=true;location.reload()});
  const note=document.createElement('small');note.textContent='Terminez votre estimation avant de recharger.';
  box.append(label,button,note);document.querySelector('main').prepend(box);
 }
 navigator.serviceWorker.addEventListener('controllerchange',notify);
 navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{
  registration=reg;
  if(reg.waiting)notify();
  reg.addEventListener('updatefound',()=>{const worker=reg.installing;if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&previouslyControlled)notify()})});
  reg.update().catch(()=>{});
 }).catch(()=>{});
 // Les applications ouvertes depuis l’écran d’accueil peuvent rester longtemps en mémoire.
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&registration)registration.update().catch(()=>{})});
})();
