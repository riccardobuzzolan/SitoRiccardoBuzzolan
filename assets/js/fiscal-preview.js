(() => {
 const slot=document.getElementById('fiscal-preview-slot');if(!slot)return;
 const update=event=>{
  const allowed=event?.detail?.external===true || document.documentElement.dataset.externalConsent==='granted';
  if(allowed && !slot.querySelector('iframe')){
   const frame=document.createElement('iframe');
   frame.title='Anteprima interattiva del progetto Scadenze Fiscali';
   frame.src='https://scadenze-fiscali.vercel.app/';
   frame.loading='eager';
   frame.referrerPolicy='strict-origin-when-cross-origin';
   slot.append(frame);
  } else if(!allowed){slot.replaceChildren();}
 };
 document.addEventListener('siteprivacy:changed',update);
 if(document.readyState==='complete')update();
})();
