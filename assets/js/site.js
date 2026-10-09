(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer:fine)').matches;
  const icons = {
    arrow:'<path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3 7 9 6 9-6"></path>',
    menu:'<path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path>'
  };
  $$('[data-icon]').forEach(el => {
    el.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[el.dataset.icon] || ''}</svg>`;
  });

  // Mobile navigation.
  const menuBtn = $('#menuBtn');
  menuBtn?.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  $$('.navlinks a').forEach(a => a.addEventListener('click', () => {
    document.body.classList.remove('menu-open');
    menuBtn?.setAttribute('aria-expanded','false');
  }));

  // Reveal only when needed; no permanent animation loop.
  const revealItems = $$('.reveal,.reveal-blur');
  if(reducedMotion || !('IntersectionObserver' in window)) revealItems.forEach(el => el.classList.add('visible'));
  else {
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if(entry.isIntersecting){ entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); }
    }), {rootMargin:'0px 0px -8% 0px',threshold:.08});
    revealItems.forEach(el => revealObserver.observe(el));
  }

  // Final heading word reveal.
  $$('.type-reveal').forEach(element => {
    if(element.querySelector('.word-unit')) return;
    const words = element.textContent.trim().split(/\s+/);
    element.textContent='';
    words.forEach((word,index) => {
      const outer=document.createElement('span'); outer.className='word-unit';
      const inner=document.createElement('span'); inner.textContent=word; inner.style.transitionDelay=`${Math.min(index*45,360)}ms`;
      outer.appendChild(inner); element.appendChild(outer); element.append(' ');
    });
  });

  // Gentle magnetic links only on fine pointers.
  if(finePointer && !reducedMotion){
    $$('[data-magnetic]').forEach(el => {
      const inner=el.querySelector('.magnetic-inner') || el;
      el.addEventListener('pointermove', e => { const r=el.getBoundingClientRect(); inner.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.08}px,${(e.clientY-r.top-r.height/2)*.08}px)`; }, {passive:true});
      el.addEventListener('pointerleave', () => inner.style.transform='');
    });
  }

  // Method section.
  const storyItems=$$('.story-item'), scenes=$$('.scene');
  if('IntersectionObserver' in window && storyItems.length && scenes.length){
    const sceneObserver=new IntersectionObserver(entries => entries.forEach(entry => {
      if(entry.isIntersecting){ const idx=Number(entry.target.dataset.scene); storyItems.forEach((item,i)=>item.classList.toggle('active',i===idx)); }
    }),{rootMargin:'-35% 0px -45% 0px'});
    scenes.forEach(s=>sceneObserver.observe(s));
  }
  storyItems.forEach((item,idx)=>item.addEventListener('click',()=>scenes[idx]?.scrollIntoView({behavior:reducedMotion?'auto':'smooth',block:'center'})));

  // Professional experience tabs.
  $$('.role-tabs button').forEach(btn => btn.addEventListener('click', () => {
    $$('.role-tabs button').forEach(b=>b.classList.remove('active'));
    $$('.role-pane').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active'); $('#'+btn.dataset.role)?.classList.add('active');
  }));

  // Active nav section.
  const navLinks=$$('.navlinks a[href^="#"]');
  if('IntersectionObserver' in window){
    const sectionObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting) navLinks.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+entry.target.id));
    }),{rootMargin:'-42% 0px -53% 0px'});
    $$('main section[id]').forEach(s=>sectionObserver.observe(s));
  }

  // Clickable desktop archive.
  const folders = {
    projects:{title:'Progetti',description:'Progetti e portfolio disponibili online.',files:[
      ['Memory Atlas · nuova versione','Web app · mappa e ripasso','https://usa-memory-atlas.vercel.app/'],
      ['Impara capitali e stati','Web app · didattica','https://riccardobuzzolan.github.io/imparacapitalistati/'],
      ['Portfolio Notion','Portfolio completo','https://riccardobuzzolan.notion.site/Riccardo-Buzzolan-368f6793082c8139bd90dc2d61e1a6af?pvs=74'],
      ['Prototipo Figma','Interfaccia e flussi','https://www.figma.com/design/JOqpajXGkd1mJUCCdxGuob/RIccardo-Bz?node-id=194-308'],
      ['Figma Community · progetto 1','Community','https://www.figma.com/community/file/1679523152246484977'],
      ['Figma Community · Riccardo Buzzolan','Community','https://www.figma.com/community/file/1679523452476305396/riccardo-buzzolan']
    ]},
    research:{title:'Articoli e ricerca',description:'Articoli Substack e approfondimenti.',files:[
      ['Substack','Tutti gli articoli','https://riccardobuzzolan.substack.com/'],
      ['Gamification e finanza digitale','Articolo','https://riccardobuzzolan.substack.com/p/gamificationfinanza'],
      ['Engagement e digitalizzazione','Articolo','https://riccardobuzzolan.substack.com/p/engagement-gamification-e-digitalizzazione'],
      ['Play to Survive','Articolo','https://riccardobuzzolan.substack.com/p/play-to-survive-la-gamification-del'],
      ['Medaglie e gradi','Articolo','https://riccardobuzzolan.substack.com/p/medaglie-e-gradi-la-gamification'],
      ['La guerra è un gioco?','Articolo','https://riccardobuzzolan.substack.com/p/la-guerra-e-un-gioco']
    ]},
    work:{title:'Esperienza',description:'Link al percorso professionale.',files:[
      ['Studio 74 Srl','Software amministrativo-fiscale','https://www.studio74.it/'],
      ['Profilo LinkedIn','Esperienza professionale','https://www.linkedin.com/in/riccardobuzzolan/']
    ]},
    study:{title:'Formazione',description:'Università e tesi.',files:[
      ['Università di Verona','Sito ufficiale','https://www.univr.it/'],
      ['Tesi magistrale','Gamification ed engagement','https://drive.google.com/file/d/1Ye46psWW9NGoon4RGrpUP4-ete21cFpr/view'],
      ['Tesi triennale','Digital transformation e smart manufacturing','https://drive.google.com/file/d/1mXexmbV3Xh-pknDdbaPExGmAfn_DeahO/view'],
      ['Archivio Drive','Tesi e documenti','https://drive.google.com/drive/folders/1c9dR-I2Tu8KXl_yR7JLZsUOaxmFhKRwP?usp=drive_link']
    ]}
  };
  const openFolder = key => {
    const folder=folders[key]; if(!folder) return;
    $('#folderBarTitle').textContent=folder.title; $('#folderTitle').textContent=folder.title; $('#folderDescription').textContent=folder.description;
    $('#folderFiles').innerHTML=folder.files.map(file=>`<a class="file-item" href="${file[2]}" target="_blank" rel="noreferrer"><b>${file[0]}</b><span>${file[1]} · apri ↗</span></a>`).join('');
    $('#desktopWindow')?.classList.add('open'); $$('.desktop-icon').forEach(icon=>icon.classList.toggle('selected',icon.dataset.folder===key));
  };
  $$('.desktop-icon').forEach(icon=>icon.addEventListener('click',()=>openFolder(icon.dataset.folder)));
  $('#desktopClose')?.addEventListener('click',()=>{ $('#desktopWindow')?.classList.remove('open'); $$('.desktop-icon').forEach(icon=>icon.classList.remove('selected')); });
  const updateClock=()=>{ if($('#desktopClock')) $('#desktopClock').textContent=new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}); };
  updateClock(); setInterval(updateClock,60000);



      /* V7 pixel portrait — same sampling and interaction as the uploaded Stack.Side HTML. */
      const STACKSIDE_V7_REF = new URL("../images/portrait.webp", document.currentScript.src).href;
      class StackPixelPortrait{
        constructor(canvas,source){
          this.canvas=canvas;this.ctx=canvas.getContext('2d');this.source=source;this.points=[];
          this.pointer={x:0,y:0,tx:0,ty:0,inside:false};this.last=performance.now();this.visible=true;this.frameId=null;
          if(!this.ctx){this.canvas.hidden=true;return}
          if('ResizeObserver' in window){this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas.parentElement)}
          else addEventListener('resize',()=>this.resize(),{passive:true});
          if('IntersectionObserver' in window){this.intersectionObserver=new IntersectionObserver(es=>{this.visible=!!es[0]?.isIntersecting;this.start()},{rootMargin:'100px'});this.intersectionObserver.observe(canvas.parentElement)}
          document.addEventListener('visibilitychange',()=>this.start());
          if(!reducedMotion)this.bind();
          this.load();
        }
        bind(){const wrap=this.canvas.parentElement;wrap.addEventListener('pointerenter',()=>this.pointer.inside=true);wrap.addEventListener('pointerleave',()=>{this.pointer.inside=false;this.pointer.tx=0;this.pointer.ty=0});wrap.addEventListener('pointermove',e=>{const r=wrap.getBoundingClientRect();this.pointer.tx=((e.clientX-r.left)/r.width-.5)*2;this.pointer.ty=((e.clientY-r.top)/r.height-.5)*2},{passive:true})}
        async load(){const img=new Image();img.src=this.source;try{await img.decode()}catch{this.canvas.hidden=true;return}if(!img.naturalWidth||!img.naturalHeight){this.canvas.hidden=true;return}const off=document.createElement('canvas');off.width=img.naturalWidth;off.height=img.naturalHeight;const o=off.getContext('2d',{willReadFrequently:true});if(!o)return;o.drawImage(img,0,0);const data=o.getImageData(0,0,off.width,off.height).data,pts=[],step=4;for(let y=165;y<532;y+=step)for(let x=130;x<610;x+=step){const i=(y*off.width+x)*4,r=data[i],g=data[i+1],b=data[i+2],green=g>105&&g>r*1.22&&g>b*1.06&&(g-r)>22;if(!green)continue;let allowed=false;if(y<400)allowed=(x>245&&x<492);else allowed=(x>145&&x<590);if(y>486&&x<305)allowed=false;if(!allowed)continue;const nx=(x-365)/235;let z=0;if(y<400){const hx=(x-368)/115,hy=(y-285)/120;z=58*Math.sqrt(Math.max(0,1-hx*hx))*(1-Math.min(1,Math.abs(hy)*.36))}else z=18*(1-Math.min(1,Math.abs(nx)));pts.push({x:(x-145)/(590-145),y:(y-165)/(532-165),z,phase:Math.random()*Math.PI*2,s:.7+Math.random()*.8})}this.points=pts;this.resize();this.start()}
        resize(){const r=this.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.55);this.canvas.width=Math.max(1,Math.round(r.width*dpr));this.canvas.height=Math.max(1,Math.round(r.height*dpr));this.ctx.setTransform(dpr,0,0,dpr,0,0);this.w=r.width;this.h=r.height;if(reducedMotion)this.draw(0)}
        start(){if(reducedMotion){this.draw(0);return}if(!this.frameId&&this.points.length&&this.visible&&!document.hidden)this.frameId=requestAnimationFrame(t=>this.loop(t))}
        loop(now){this.frameId=null;if(!this.visible||document.hidden)return;if(now-this.last>28){const dt=Math.min(40,now-this.last);this.last=now;this.pointer.x+=(this.pointer.tx-this.pointer.x)*(.08*dt/16.7);this.pointer.y+=(this.pointer.ty-this.pointer.y)*(.08*dt/16.7);this.draw(now)}this.start()}
        draw(t){if(!this.w||!this.h||!this.points.length)return;const c=this.ctx;c.clearRect(0,0,this.w,this.h);const cx=this.w*.50,cy=this.h*.53,scale=Math.min(this.w/1.04,this.h/1.0),yaw=this.pointer.x*.34,pitch=-this.pointer.y*.22,sy=Math.sin(yaw),cyaw=Math.cos(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch),mx=(this.pointer.x*.5+.5)*this.w,my=(this.pointer.y*.5+.5)*this.h,palette=['#F6B36E','#ED7A27','#D75F12','#171717'];for(const p of this.points){let X=(p.x-.5)*scale*.92,Y=(p.y-.52)*scale*.78,Z=p.z+Math.sin(t*.0014+p.phase)*2.4;const x1=X*cyaw+Z*sy,z1=-X*sy+Z*cyaw,y1=Y*cp-z1*sp,z2=Y*sp+z1*cp,perspective=690/(690+z2);let sx=cx+x1*perspective,syy=cy+y1*perspective,dx=sx-mx,dy=syy-my,d=Math.hypot(dx,dy);if(this.pointer.inside&&d<145){const f=1-d/145;sx+=(dx/(d||1))*f*f*22;syy+=(dy/(d||1))*f*f*22}const ix=Math.max(0,Math.min(palette.length-1,Math.floor((p.y*.72+p.x*.28)*palette.length)));c.globalAlpha=.76+Math.min(.2,z2/300);c.fillStyle=palette[ix];c.beginPath();c.arc(sx,syy,Math.max(.65,1.55*p.s*perspective),0,Math.PI*2);c.fill()}c.globalAlpha=1}
      }
      const stackFaceCanvas=document.getElementById('stackFaceCanvas');if(stackFaceCanvas)new StackPixelPortrait(stackFaceCanvas,STACKSIDE_V7_REF);




      /* PC data sculpture: sample a well-defined workstation into particles. */
      const pcParticleCanvas=document.getElementById('pcParticleCanvas');
      const pcStage=document.getElementById('pcSculptureStage');
      if(pcParticleCanvas&&pcStage&&pcParticleCanvas.getContext('2d')){
        const pcCtx=pcParticleCanvas.getContext('2d'),pcPoints=[],pcPointer={x:.5,y:.5,tx:.5,ty:.5,inside:false};
        const buildPc=()=>{const off=document.createElement('canvas');off.width=760;off.height=470;const c=off.getContext('2d',{willReadFrequently:true});c.clearRect(0,0,760,470);
          // desk shadow and monitor frame
          c.fillStyle='#efefec';c.beginPath();c.roundRect(115,55,455,270,28);c.fill();c.fillStyle='#141414';c.beginPath();c.roundRect(132,72,421,235,20);c.fill();
          // screen UI
          const grad=c.createLinearGradient(150,88,520,292);grad.addColorStop(0,'#dcecf8');grad.addColorStop(.5,'#ffffff');grad.addColorStop(1,'#dceee1');c.fillStyle=grad;c.beginPath();c.roundRect(148,88,389,202,13);c.fill();
          c.fillStyle='#111';c.fillRect(170,111,116,15);c.fillStyle='#315cff';c.fillRect(170,145,250,10);c.fillStyle='#e5492a';c.fillRect(170,166,175,8);c.fillStyle='#eba447';c.beginPath();c.arc(450,160,42,0,Math.PI*2);c.fill();
          c.strokeStyle='#315cff';c.lineWidth=5;c.beginPath();c.moveTo(185,246);c.bezierCurveTo(240,185,290,260,340,205);c.bezierCurveTo(390,150,430,235,505,180);c.stroke();
          // stand
          c.fillStyle='#c8c9cc';c.beginPath();c.roundRect(315,322,52,72,14);c.fill();c.beginPath();c.ellipse(341,399,100,18,0,0,Math.PI*2);c.fill();
          // tower
          c.fillStyle='#222';c.beginPath();c.roundRect(600,110,90,245,22);c.fill();c.strokeStyle='#777';c.lineWidth=2;c.beginPath();c.arc(645,165,25,0,Math.PI*2);c.stroke();c.fillStyle='#e5492a';c.beginPath();c.arc(645,165,5,0,Math.PI*2);c.fill();
          // keyboard + mouse
          c.fillStyle='#f6f5f1';c.beginPath();c.roundRect(170,408,330,42,12);c.fill();c.strokeStyle='#b9babd';c.lineWidth=1;for(let i=0;i<11;i++){c.beginPath();c.moveTo(190+i*27,416);c.lineTo(190+i*27,441);c.stroke()}for(let j=0;j<3;j++){c.beginPath();c.moveTo(183,420+j*9);c.lineTo(485,420+j*9);c.stroke()}c.fillStyle='#f0efec';c.beginPath();c.ellipse(560,428,31,22,0,0,Math.PI*2);c.fill();
          const data=c.getImageData(0,0,760,470).data;for(let y=10;y<465;y+=5){for(let x=10;x<750;x+=5){const i=(y*760+x)*4,a=data[i+3];if(a<30)continue;const r=data[i],g=data[i+1],b=data[i+2],bright=(r+g+b)/3;if(bright>248)continue;pcPoints.push({x:x/760,y:y/470,r,g,b,z:(1-Math.abs(x-380)/380)*20,phase:Math.random()*Math.PI*2,s:.65+Math.random()*.75})}}
        };buildPc();let size={w:0,h:0,d:1};const fit=()=>{const r=pcParticleCanvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.35);pcParticleCanvas.width=Math.max(1,Math.round(r.width*d));pcParticleCanvas.height=Math.max(1,Math.round(r.height*d));size={w:r.width,h:r.height,d}};fit();addEventListener('resize',fit,{passive:true});
        pcStage.addEventListener('pointerenter',()=>pcPointer.inside=true);pcStage.addEventListener('pointerleave',()=>{pcPointer.inside=false;pcPointer.tx=.5;pcPointer.ty=.5});pcStage.addEventListener('pointermove',e=>{const r=pcStage.getBoundingClientRect();pcPointer.tx=(e.clientX-r.left)/r.width;pcPointer.ty=(e.clientY-r.top)/r.height},{passive:true});
        let pcVisible=true;if('IntersectionObserver' in window){const pcVisibilityObserver=new IntersectionObserver(entries=>{pcVisible=entries.some(entry=>entry.isIntersecting)},{rootMargin:'180px'});pcVisibilityObserver.observe(pcStage)}let pcLast=0;const frame=t=>{if(document.hidden||!pcVisible||(!reducedMotion&&t-pcLast<32)){if(!reducedMotion)requestAnimationFrame(frame);return}pcLast=t;pcPointer.x+=(pcPointer.tx-pcPointer.x)*.075;pcPointer.y+=(pcPointer.ty-pcPointer.y)*.075;const {w,h,d}=size;if(w&&h){pcCtx.setTransform(d,0,0,d,0,0);pcCtx.clearRect(0,0,w,h);const scale=Math.min(w/760,h/470),ox=(w-760*scale)/2,oy=(h-470*scale)/2,mx=pcPointer.x*w,my=pcPointer.y*h;for(const p of pcPoints){let x=ox+p.x*760*scale+(pcPointer.x-.5)*(p.y-.5)*18,y=oy+p.y*470*scale+(pcPointer.y-.5)*(p.x-.5)*12;const dx=x-mx,dy=y-my,dist=Math.hypot(dx,dy);if(pcPointer.inside&&dist<115){const f=1-dist/115;x+=(dx/(dist||1))*f*f*22;y+=(dy/(dist||1))*f*f*22}const pulse=1+(reducedMotion?0:Math.sin(t*.001+p.phase)*.07);pcCtx.fillStyle=`rgb(${p.r},${p.g},${p.b})`;pcCtx.globalAlpha=.82;pcCtx.beginPath();pcCtx.arc(x,y,Math.max(.55,p.s*1.1*pulse),0,Math.PI*2);pcCtx.fill()}pcCtx.globalAlpha=1}if(!reducedMotion)requestAnimationFrame(frame)};frame(0);if(reducedMotion)addEventListener('resize',()=>frame(0),{passive:true});
      }



  // Tutoring drawer.
  const tutorDrawer=$('#tutorDrawer'), tutorBackdrop=$('#tutorDrawerBackdrop'), tutorSelect=$('#tutorSubject'); let previousFocus=null;
  const background=$$('body > header, body > main, body > footer, body > a');
  const inertBefore=new Map();
  const openTutor=subject=>{
    if(!tutorDrawer||tutorDrawer.classList.contains('open'))return;
    previousFocus=document.activeElement;
    if(subject&&tutorSelect)tutorSelect.value=subject;
    background.forEach(element=>{inertBefore.set(element,element.inert);element.inert=true});
    tutorDrawer.inert=false;tutorDrawer.classList.add('open');tutorBackdrop?.classList.add('open');
    tutorDrawer.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
    $('#tutorName')?.focus();
  };
  const closeTutor=()=>{
    if(!tutorDrawer)return;
    tutorDrawer.classList.remove('open');tutorBackdrop?.classList.remove('open');
    background.forEach(element=>element.inert=inertBefore.get(element)??false);inertBefore.clear();
    document.body.style.overflow='';previousFocus?.focus?.();
    tutorDrawer.inert=true;tutorDrawer.setAttribute('aria-hidden','true');
  };
  $$('[data-tutor-subject]').forEach(btn=>btn.addEventListener('click',()=>openTutor(btn.dataset.tutorSubject)));
  $('#tutorDrawerClose')?.addEventListener('click',closeTutor); tutorBackdrop?.addEventListener('click',closeTutor);
  addEventListener('keydown',e=>{
    if(!tutorDrawer?.classList.contains('open'))return;
    if(e.key==='Escape'){e.preventDefault();closeTutor();return}
    if(e.key!=='Tab')return;
    const focusable=$$('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]',tutorDrawer).filter(element=>!element.hidden);
    const first=focusable[0],last=focusable.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
  });
  $('#tutorWhatsApp')?.addEventListener('click',()=>{
    const name=$('#tutorName')?.value.trim()||'',subject=tutorSelect?.value||'Materia da definire',mode=$('#tutorMode')?.value||'',message=$('#tutorMessage')?.value.trim()||'';
    const body=[`Ciao Riccardo, vorrei informazioni per una lezione di ${subject}.`,`Modalità preferita: ${mode}.`,name?`Nome: ${name}.`:'',message?`Dettagli: ${message}`:''].filter(Boolean).join('\n');
    window.open(`https://wa.me/393480396556?text=${encodeURIComponent(body)}`,'_blank','noopener');
  });
  $('#tutorSubmit')?.addEventListener('click',()=>{
    const name=$('#tutorName')?.value.trim()||'',email=$('#tutorEmail')?.value.trim()||'',subject=tutorSelect?.value||'Materia da definire',mode=$('#tutorMode')?.value||'',message=$('#tutorMessage')?.value.trim()||'';
    const body=['Ciao Riccardo,','',`vorrei informazioni per una lezione di ${subject}.`,`Modalità preferita: ${mode}.`,name?`Nome: ${name}`:'',email?`Email: ${email}`:'',message?`Dettagli: ${message}`:''].filter(Boolean).join('\n');
    location.href=`mailto:riccardobuzzolan96@gmail.com?subject=${encodeURIComponent('Richiesta ripetizioni · '+subject)}&body=${encodeURIComponent(body)}`;
  });

  // External iframes remain unloaded until a visitor explicitly requests a preview.
  document.querySelectorAll('[data-embed-activate]')?.forEach(button => button.addEventListener('click', () => {
    const frame = document.getElementById(button.dataset.embedActivate);
    if (!frame?.dataset.src) return;
    frame.src = frame.dataset.src;
    frame.hidden = false;
    button.hidden = true;
    button.previousElementSibling?.setAttribute('hidden', '');
  }));

  // Substack embedded browser.
  const substackFrame=$('#substackFrame'), substackOpen=$('#substackOpen'), substackLabel=$('#substackFrameLabel');
  $$('.article-select').forEach(button=>button.addEventListener('click',()=>{
    const url=button.dataset.substackUrl; if(!url)return;
    $$('.article-select').forEach(item=>item.classList.toggle('active',item===button));
    if(substackFrame) {
      substackFrame.dataset.src=url;
      if(substackFrame.hasAttribute('src')) substackFrame.src=url;
    }
    if(substackOpen)substackOpen.href=url;
    if(substackLabel)substackLabel.textContent=url.replace(/^https?:\/\//,'').replace(/\/$/,'');
  }));

  // Projects/research carousel.
  const viewport=$('#projectCarousel'), track=viewport?.querySelector('.carousel-track'); let slideIndex=0;
  const updateCarousel=()=>{ if(!viewport||!track)return; const slide=track.querySelector('.project-slide'); if(!slide)return; const gap=14,step=slide.getBoundingClientRect().width+gap,max=Math.max(0,track.children.length-Math.max(1,Math.floor(viewport.clientWidth/step))); slideIndex=Math.max(0,Math.min(max,slideIndex)); track.style.transform=`translateX(${-slideIndex*step}px)`; };
  $('#carouselNext')?.addEventListener('click',()=>{slideIndex++;updateCarousel()}); $('#carouselPrev')?.addEventListener('click',()=>{slideIndex--;updateCarousel()});
  addEventListener('resize',updateCarousel,{passive:true}); updateCarousel();

  // Archive data grid with real links.
  const gridRows=[
    {name:'Memory Atlas — nuova versione',area:'Web app',status:'Online',url:'https://usa-memory-atlas.vercel.app/'},
    {name:'Impara capitali e stati',area:'Web app',status:'Online',url:'https://riccardobuzzolan.github.io/imparacapitalistati/'},
    {name:'Portfolio Notion',area:'Portfolio',status:'Notion',url:'https://riccardobuzzolan.notion.site/Riccardo-Buzzolan-368f6793082c8139bd90dc2d61e1a6af?pvs=74'},
    {name:'Prototipo Figma',area:'Prototipo',status:'Figma',url:'https://www.figma.com/design/JOqpajXGkd1mJUCCdxGuob/RIccardo-Bz?node-id=194-308'},
    {name:'Figma Community · progetto 1',area:'Progetto',status:'Figma',url:'https://www.figma.com/community/file/1679523152246484977'},
    {name:'Figma Community · Riccardo Buzzolan',area:'Progetto',status:'Figma',url:'https://www.figma.com/community/file/1679523452476305396/riccardo-buzzolan'},
    {name:'Gamification e finanza digitale',area:'Articolo',status:'Substack',url:'https://riccardobuzzolan.substack.com/p/gamificationfinanza'},
    {name:'Engagement, gamification e digitalizzazione',area:'Articolo',status:'Substack',url:'https://riccardobuzzolan.substack.com/p/engagement-gamification-e-digitalizzazione'},
    {name:'Play to Survive',area:'Articolo',status:'Substack',url:'https://riccardobuzzolan.substack.com/p/play-to-survive-la-gamification-del'},
    {name:'Medaglie e gradi',area:'Articolo',status:'Substack',url:'https://riccardobuzzolan.substack.com/p/medaglie-e-gradi-la-gamification'},
    {name:'La guerra è un gioco?',area:'Articolo',status:'Substack',url:'https://riccardobuzzolan.substack.com/p/la-guerra-e-un-gioco'},
    {name:'Tesi magistrale · Gamification',area:'Tesi',status:'Drive',url:'https://drive.google.com/file/d/1Ye46psWW9NGoon4RGrpUP4-ete21cFpr/view'},
    {name:'Tesi triennale · Digital transformation',area:'Tesi',status:'Drive',url:'https://drive.google.com/file/d/1mXexmbV3Xh-pknDdbaPExGmAfn_DeahO/view'},
    {name:'Studio 74 Srl',area:'Esperienza',status:'Sito',url:'https://www.studio74.it/'}
  ];
  let gridSort={key:'name',dir:1};
  const renderGrid=()=>{ const q=($('#gridSearch')?.value||'').toLowerCase(),body=$('#projectGridBody'); if(!body)return; const rows=gridRows.filter(r=>Object.values(r).join(' ').toLowerCase().includes(q)).sort((a,b)=>String(a[gridSort.key]).localeCompare(String(b[gridSort.key]))*gridSort.dir); body.innerHTML=rows.map(r=>`<div class="data-grid-row" role="row"><strong role="cell">${r.name}</strong><span role="cell">${r.area}</span><span role="cell"><i class="status-chip">${r.status}</i></span><span role="cell"><a class="grid-open" href="${r.url}" target="_blank" rel="noreferrer">Apri ↗</a></span></div>`).join(''); };
  $('#gridSearch')?.addEventListener('input',renderGrid); $$('[data-sort]').forEach(btn=>btn.addEventListener('click',()=>{const key=btn.dataset.sort;gridSort={key,dir:gridSort.key===key?-gridSort.dir:1};renderGrid()})); renderGrid();
})();
