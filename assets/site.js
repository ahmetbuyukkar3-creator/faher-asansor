(function(){
  var d=document, root=d.documentElement;
  root.classList.add('js');
  var $=function(s){return d.querySelector(s)};
  var lift=$('#giris'), stage=$('.lift-stage'), cam=$('.cam'), lobby=$('.lobby'), plate=$('.plate'), door=$('.door');
  var cabin=$('.cabin'), etch=$('.etch'), leafL=$('.leaf-l'), leafR=$('.leaf-r');
  var hero=$('.intro-hero'), shade=$('.shade'), portal=$('.portal'), veil=$('.portal-veil'), top=$('.hdr');
  // Sahne kaydırmaya bağlı (kendiliğinden oynamaz); Windows'ta animasyon kapalı olsa da açık kalır.
  // Reduced motion keeps the same scroll driver; decorative CSS motion is reduced.

  // Görsellerdeki ölçüler (görsel genişliğine/yüksekliğine oran). Kapı = iki kanadın kapladığı alan.
  var MODES={
    desk:{src:'assets/lobi-yatay.webp',iw:2736,ih:1536,door:[.395,.226,.211,.571],panel:[.381,.118,.237,.073]},
    phone:{src:'assets/lobi-dikey.webp',iw:1536,ih:2736,door:[.257,.261,.486,.456],panel:[.25,.13,.52,.087]}
  };
  var CAB={iw:1664,ih:2512,ox:.112,ow:.773,oy:.02,mirror:[.352,.247,.283,.203]};

  function clamp(v){return v<0?0:v>1?1:v}
  function ease(t){return 1-Math.pow(1-t,3)}
  function inOut(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
  function px(el,x,y,w,h){var s=el.style;s.left=x+'px';s.top=y+'px';s.width=w+'px';s.height=h+'px'}

  var G={}, mode='';
  function layout(){
    var vw=stage.clientWidth, vh=stage.clientHeight;
    var m=vw/vh<.85?'phone':'desk', M=MODES[m];
    if(m!==mode){
      mode=m; lobby.src=M.src; lobby.decode().catch(function(){});
      leafL.style.backgroundImage=leafR.style.backgroundImage='url("'+M.src+'")';
    }
    var s0=Math.max(vw/M.iw, vh/M.ih), LW=M.iw*s0, LH=M.ih*s0, LX=(vw-LW)/2, LY=(vh-LH)/2;
    px(lobby,LX,LY,LW,LH);
    var D={x:LX+M.door[0]*LW, y:LY+M.door[1]*LH, w:M.door[2]*LW, h:M.door[3]*LH};
    px(door,D.x,D.y,D.w,D.h);
    px(plate,LX+M.panel[0]*LW,LY+M.panel[1]*LH,M.panel[2]*LW,M.panel[3]*LH);
    var hw=D.w/2;
    [leafL,leafR].forEach(function(el,i){
      el.style.width=hw+'px';
      el.style.backgroundSize=LW+'px '+LH+'px';
      el.style.backgroundPosition=(-(D.x-LX)-i*hw)+'px '+(-(D.y-LY))+'px';
    });
    var CW=D.w/CAB.ow, CH=CW*CAB.ih/CAB.iw, cx=-CAB.ox*CW, cy=-CAB.oy*CH;
    px(cabin,cx,cy,CW,CH);
    var mr=CAB.mirror, mx=cx+mr[0]*CW, my=cy+mr[1]*CH, mw=mr[2]*CW, mh=mr[3]*CH;
    px(etch,mx,my,mw,mh);
    var Mx=D.x+mx, My=D.y+my;
    var s1=Math.max(1, Math.min(.86*vh/D.h, .8*vw/D.w));
    var S=Math.max(s1*1.2, Math.min(.72*vh/mh, .84*vw/mw));
    G={vw:vw,vh:vh,cx:vw/2,cy:vh/2,dcx:D.x+D.w/2,dcy:D.y+D.h/2,M:{x:Mx,y:My,w:mw,h:mh},mcx:Mx+mw/2,mcy:My+mh/2,s1:s1,S:S};
  }

  function scene(p){
    var hf=clamp(p/.07);
    hero.style.opacity=1-hf;
    hero.style.transform='translate3d(0,'+(-30*hf)+'px,0)';
    hero.style.visibility=hf>=1?'hidden':'visible';
    shade.style.opacity=1-clamp(p/.2);

    var z1=ease(clamp((p-.03)/.27));                 // lobiden kapıya yaklaşma
    var c=inOut(clamp((p-.28)/.18));                 // kapılar açılıyor
    var z2=inOut(clamp((p-.44)/.38));                // kabine giriş, aynaya iniş
    var s, Px, Py;
    if(z2<=0){ s=Math.pow(G.s1,z1); Px=G.cx+(G.dcx-G.cx)*z1; Py=G.cy+(G.dcy-G.cy)*z1; }
    else { s=G.s1*Math.pow(G.S/G.s1,z2); Px=G.dcx+(G.mcx-G.dcx)*z2; Py=G.dcy+(G.mcy-G.dcy)*z2; }
    var tx=G.cx-Px*s, ty=G.cy-Py*s;
    cam.style.transform='translate3d('+tx+'px,'+ty+'px,0) scale('+s+')';
    leafL.style.transform='translate3d('+(-100*c)+'%,0,0)';
    leafR.style.transform='translate3d('+(100*c)+'%,0,0)';
    etch.style.opacity=String(clamp((p-.6)/.16)*.9);

    var e=ease(clamp((p-.83)/.13));                  // ayna portala dönüşüyor
    if(e>0){
      var M=G.M, k=1-e;
      var l=(tx+M.x*s)*k, t=(ty+M.y*s)*k, r=(G.vw-(tx+(M.x+M.w)*s))*k, b=(G.vh-(ty+(M.y+M.h)*s))*k;
      portal.style.visibility='visible';
      portal.style.clipPath='inset('+Math.max(0,t)+'px '+Math.max(0,r)+'px '+Math.max(0,b)+'px '+Math.max(0,l)+'px)';
      veil.style.opacity=String(1-clamp(e*1.6));

    } else portal.style.visibility='hidden';
  }


  // The portal previews the exact hero. The real hero meets it at the same
  // viewport coordinates (main overlaps the last 100svh of the intro).
  var realHero=$('main .hero'), preview=realHero.cloneNode(true);
  preview.removeAttribute('id'); preview.removeAttribute('aria-label');
  preview.querySelectorAll('[id]').forEach(function(el){el.removeAttribute('id')});
  var clonedHeading=preview.querySelector('h1'), clonedText=d.createElement('div');
  clonedText.className=clonedHeading.className; clonedText.innerHTML=clonedHeading.innerHTML;
  clonedHeading.replaceWith(clonedText);
  preview.querySelectorAll('img').forEach(function(el){el.loading='eager'});
  portal.insertBefore(preview,veil);

  var lenis=new Lenis({duration:1.2,smoothWheel:true,autoResize:true});
  window.faherScroll=lenis;
  var burger=$('#burger'), menu=$('#mnav'), main=$('main');
  function setOpen(open,focus){
    d.body.classList.toggle('open',open);burger.setAttribute('aria-expanded',String(open));
    burger.setAttribute('aria-label',open?'Menüyü kapat':'Menüyü aç');
    menu.setAttribute('aria-hidden',String(!open));menu.inert=!open;
    main.inert=open; lift.inert=open;
    if(lenis){if(open)lenis.stop();else lenis.start()}
    if(open)menu.querySelector('a').focus();else if(focus)burger.focus();
  }
  burger.addEventListener('click',function(){setOpen(!d.body.classList.contains('open'),true)});
  d.addEventListener('keydown',function(e){
    if(!d.body.classList.contains('open'))return;
    if(e.key==='Escape'){setOpen(false,true);return}
    if(e.key==='Tab'){
      var focusable=[burger].concat(Array.from(menu.querySelectorAll('a')));
      var idx=focusable.indexOf(d.activeElement);
      e.preventDefault();focusable[(idx+(e.shiftKey?-1:1)+focusable.length)%focusable.length].focus();
    }
  });
  d.querySelectorAll('a[href^="#"]').forEach(function(a){a.addEventListener('click',function(e){
    var el=d.getElementById(a.getAttribute('href').slice(1));if(!el)return;
    e.preventDefault();setOpen(false,false);
    // Immediate jumps from the intro also serve as an accessible skip action.
    var dest=scrollY+el.getBoundingClientRect().top-(el===realHero?0:90);
    if(lenis)lenis.scrollTo(dest,{duration:1.6,immediate:a.classList.contains('skip')});
    else window.scrollTo({top:dest,behavior:'instant'});
    if(a.classList.contains('skip') || menu.contains(a)){el.tabIndex=-1;el.focus({preventScroll:true})}
  })});
  var mf=$('#mf');
  var fragment=d.createDocumentFragment();
  mf.textContent.split(/(\s+)/).forEach(function(word){
    if(/^\s+$/.test(word)){fragment.appendChild(d.createTextNode(word));return}
    var span=d.createElement('span');span.className='w';span.textContent=word;fragment.appendChild(span);
  });mf.replaceChildren(fragment);
  var words=mf.querySelectorAll('.w');
  var statement=$('#statement'), pin=statement.querySelector('.stage-pin');
  var film=pin.querySelector('.stage-film'), filmImage=film.querySelector('img'), cap=pin.querySelector('.stage-cap');
  var metrics={}, lastY=NaN, lastLit=-1, lastProgress=-1, lastStage=-1, assetsReady=false;
  var revealObserver=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){entry.target.classList.add('in');revealObserver.unobserve(entry.target)}
    });
  },{threshold:0,rootMargin:'0px 0px -6% 0px'});
  d.querySelectorAll('main .fade').forEach(function(el){revealObserver.observe(el)});
  // All layout reads live here, outside the animation callback. Hero has no
  // containment/estimated height: real and portal copies share identical CSS.
  function measure(){
    layout();
    var y=lenis.scroll, sr=statement.getBoundingClientRect(), mr=mf.getBoundingClientRect();
    metrics={start:lift.getBoundingClientRect().top+y,total:lift.offsetHeight-stage.offsetHeight,
      vh:stage.clientHeight, statementTop:sr.top+y,statementHeight:sr.height,
      mfTop:mr.top+y,mfHeight:mr.height,mobile:innerWidth<820};
    lastY=NaN;lastProgress=-1;lastStage=-1;
    lenis.resize();
  }
  var measureTimer;
  function scheduleMeasure(){clearTimeout(measureTimer);measureTimer=setTimeout(measure,80)}
  var observer=new ResizeObserver(scheduleMeasure);
  [stage,realHero,statement,mf].forEach(function(el){observer.observe(el)});
  function frame(t){
    lenis.raf(t);
    var y=lenis.scroll;
    if(assetsReady && y!==lastY){
      var dy=Number.isNaN(lastY)?0:y-lastY;lastY=y;
      var p=clamp((y-metrics.start)/Math.max(1,metrics.total));
      if(p!==lastProgress){scene(p);lastProgress=p}
      // At y = start + total, sticky top and normal-flow hero top are both 0.
      // Beyond it both move by exactly -(y-start-total), including large jumps.
      var siteVisible=y>=metrics.start+metrics.total;
      d.body.classList.toggle('site-visible',siteVisible);
      lift.classList.toggle('lift-active',!siteVisible);
      top.classList.toggle('intro',p<.96);
      if(!d.body.classList.contains('open')){
        if(dy>2 && siteVisible)top.classList.add('hide');
        else if(dy < -2 || !siteVisible)top.classList.remove('hide');
        top.classList.toggle('solid',siteVisible);
      }
      var sp=clamp((y-metrics.statementTop)/Math.max(1,metrics.statementHeight-metrics.vh));
      if(sp!==lastStage){
        var g=inOut(clamp(sp/.7)), sx=1-2*(metrics.mobile?.26:.40)*(1-g), sy=1-2*(metrics.mobile?.30:.32)*(1-g);
        film.style.transform='translate3d(0,0,0) scale('+sx+','+sy+')';
        filmImage.style.transform='translate3d(0,0,0) scale('+((1.3-.3*g)/sx)+','+((1.3-.3*g)/sy)+')';
        cap.style.opacity=String(clamp((g-.7)/.3));
        pin.classList.toggle('cov',g>(metrics.mobile?.55:.2));lastStage=sp;
      }
      var mp=clamp((metrics.vh*.82-(metrics.mfTop-y))/(metrics.mfHeight+metrics.vh*.2));
      var lit=Math.min(words.length,Math.floor(mp*words.length*1.1));
      if(lit!==lastLit){
        for(var i=Math.max(0,Math.min(lastLit,lit));i<Math.max(lastLit,lit);i++)words[i].classList.toggle('on',i<lit);
        lastLit=lit;
      }
    }
    requestAnimationFrame(frame);
  }
  measure();
  window.addEventListener('resize',function(){scheduleMeasure();if(innerWidth>960 && d.body.classList.contains('open'))setOpen(false,false)});
  window.addEventListener('pageshow',scheduleMeasure);
  if(d.fonts)d.fonts.ready.then(scheduleMeasure);
  // Decode lobby, cabin, signs and both copies of the portal photos before use.
  var introImages=Array.from(lift.querySelectorAll('img')).concat(Array.from(realHero.querySelectorAll('img')));
  introImages.forEach(function(img){img.loading='eager'});
  Promise.all(introImages.map(function(img){return img.decode().catch(function(){})})).then(function(){
    assetsReady=true;measure();
  });
  requestAnimationFrame(frame);
})();
