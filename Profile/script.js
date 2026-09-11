const galaxy=document.getElementById("galaxy");
const gctx=galaxy.getContext("2d");
const canvas=document.getElementById("stars");
const ctx=canvas.getContext("2d");

let w=0,h=0,dpr=1,mouseX=.5,mouseY=.5,lastTime=0,scrollY=0,smoothScrollY=0,maxScroll=1,lastScrollForStars=0;
let stars=[], galaxyParticles=[], nebulaClouds=[];

function resize(){
  dpr=Math.min(window.devicePixelRatio||1,2);
  w=window.innerWidth; h=window.innerHeight;

  galaxy.width=w*dpr; galaxy.height=h*dpr;
  galaxy.style.width=w+"px"; galaxy.style.height=h+"px";
  gctx.setTransform(dpr,0,0,dpr,0,0);

  canvas.width=w*dpr; canvas.height=h*dpr;
  canvas.style.width=w+"px"; canvas.style.height=h+"px";
  ctx.setTransform(dpr,0,0,dpr,0,0);

  const count=Math.min(180,Math.floor((w*h)/8500));
  stars=Array.from({length:count},()=>{
    // Real starlight isn't pure white — bias toward blue-white, warm, or faint gold.
    const tRoll=Math.random();
    const tint=tRoll<.62?[235,236,255]:tRoll<.85?[255,244,222]:[196,214,255];
    return {
      x:Math.random()*w,y:Math.random()*h,
      r:Math.random()*1.1+.12,
      a:Math.random()*.44+.10,
      tw:Math.random()*Math.PI*2,
      twSpeed:Math.random()*.0014+.00025,
      vx:(Math.random()-.5)*.016,
      vy:(Math.random()-.5)*.010,
      depth:Math.random()*.8+.2,
      tint
    };
  });

  maxScroll=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);

  // Dense spiral galaxy in 3D space. Logarithmic arms + temperature-based
  // star color + star-forming knots for a more photographic look.
  const baseRadius=Math.min(w,h)*.47;
  const armCount=2;
  const pitch=0.62;
  const pCount=Math.min(2600,Math.max(1400,Math.floor(w*1.05)));
  galaxyParticles=Array.from({length:pCount},(_,i)=>{
    const arm=(i%armCount)*Math.PI + (Math.random()<.5?-.18:.18);
    const radius=Math.pow(Math.random(),0.58)*baseRadius;
    const scatter=(Math.random()-.5)*(0.5+radius/(baseRadius*1.15));
    const theta=arm + Math.log(1+radius/44)*pitch*4 + scatter;

    const core=1-Math.min(1,radius/baseRadius);
    const isKnot=Math.random()<.05 && core>.12 && core<.75;
    const isNebulaSpeck=!isKnot && Math.random()<.035 && core>.08 && core<.7;

    let hue;
    if(core>.82){
      hue=[255,238,205];
    }else if(isNebulaSpeck){
      hue=[255,158,214];
    }else if(isKnot){
      hue=[196,214,255];
    }else{
      const mix=1-core;
      hue=[Math.round(255-40*mix),Math.round(232-26*mix),Math.round(205+50*mix)];
    }

    return {
      radius,
      theta,
      z:(Math.random()-.5)*(18 + radius*.09),
      size:isKnot?Math.random()*1.5+1.15:Math.random()*.85+.22,
      alpha:isKnot?Math.random()*.35+.55:Math.random()*.7+.10,
      speed:.00032+Math.random()*.00065,
      phase:Math.random()*Math.PI*2,
      hue,
      dusty:!isKnot && !isNebulaSpeck && Math.random()<.10
    };
  });

  // Faint gas / nebula clouds threaded along the arms, drawn beneath the stars.
  nebulaClouds=Array.from({length:16},()=>{
    const arm=Math.round(Math.random())*Math.PI;
    const radius=(0.18+Math.random()*0.78)*baseRadius;
    const theta=arm + Math.log(1+radius/44)*pitch*4 + (Math.random()-.5)*.4;
    const palette=[[130,150,255],[255,150,210],[150,220,255],[255,205,150]];
    return {
      radius,
      theta,
      size:baseRadius*(0.09+Math.random()*0.16),
      alpha:.03+Math.random()*.05,
      color:palette[Math.floor(Math.random()*palette.length)],
      speed:.00032+Math.random()*.00065
    };
  });
}

function drawStars(time=0){
  const dt=Math.min(34,time-lastTime||16);
  lastTime=time;
  ctx.clearRect(0,0,w,h);

  for(const s of stars){
    s.tw+=s.twSpeed*dt;
    s.x += s.vx*dt + (mouseX-.5)*.003*s.depth*dt;
    s.y += s.vy*dt + (mouseY-.5)*.0018*s.depth*dt + (smoothScrollY-lastScrollForStars)*.00002*s.depth;
    if(s.x<-4)s.x=w+4;if(s.x>w+4)s.x=-4;
    if(s.y<-4)s.y=h+4;if(s.y>h+4)s.y=-4;

    const alpha=Math.max(.035,s.a+Math.sin(s.tw)*.12);
    ctx.beginPath();
    ctx.fillStyle=`rgba(${s.tint[0]},${s.tint[1]},${s.tint[2]},${alpha})`;
    ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
    ctx.fill();
    if(s.r>1.0){
      ctx.beginPath();
      ctx.fillStyle=`rgba(${s.tint[0]},${s.tint[1]},${s.tint[2]},${alpha*.24})`;
      ctx.arc(s.x,s.y,s.r*2,0,Math.PI*2);
      ctx.fill();
    }
  }
  lastScrollForStars=smoothScrollY;
}

function drawGalaxy(time=0){
  gctx.clearRect(0,0,w,h);

  // Ease the raw scroll position so the scroll-linked motion glides
  // instead of jumping frame to frame.
  smoothScrollY += (scrollY-smoothScrollY)*.075;
  const scrollFrac=Math.min(1,Math.max(0,smoothScrollY/maxScroll));

  const baseRadius=Math.min(w,h)*.48;
  const cx=w*.50 + (mouseX-.5)*18;
  const cy=h*.46 + (mouseY-.5)*10 + scrollFrac*46;

  // Slow real-time rotation + scroll-linked rotation, eased via smoothScrollY.
  const t=time*.000035;
  const scrollRotation=smoothScrollY*.0016;
  const rot=t+scrollRotation;

  // As the page scrolls, the disc gradually tilts from an angled view toward
  // face-on — like the camera is rising above the galactic plane — and the
  // focal length shortens slightly, a gentle "flying past" zoom.
  const tilt=.48 + Math.sin(time*.00015)*.035 + scrollFrac*.36;
  const focal=700 - scrollFrac*230;

  // The whole scene dims a touch as it "recedes" further down the page.
  gctx.globalAlpha=1-scrollFrac*.22;

  // Faint nebula gas clouds, drawn first so the star field reads on top.
  for(const n of nebulaClouds){
    n.theta += n.speed;
    const a=n.theta+rot;
    const x3=Math.cos(a)*n.radius;
    const y3=Math.sin(a)*n.radius*tilt;
    const perspective=1/(1+(Math.sin(a*1.4)*n.radius*.055)/focal);
    const x=cx+x3*perspective;
    const y=cy+y3*perspective - smoothScrollY*.026;
    if(x<-200||x>w+200||y<-200||y>h+200) continue;

    const grad=gctx.createRadialGradient(x,y,0,x,y,n.size*perspective);
    grad.addColorStop(0,`rgba(${n.color[0]},${n.color[1]},${n.color[2]},${n.alpha})`);
    grad.addColorStop(1,"rgba(0,0,0,0)");
    gctx.fillStyle=grad;
    gctx.beginPath();
    gctx.arc(x,y,n.size*perspective,0,Math.PI*2);
    gctx.fill();
  }

  for(const p of galaxyParticles){
    p.theta += p.speed;
    const a=p.theta+rot;
    const r=p.radius;

    // 3D spiral plane with gentle depth wobble.
    const depth=p.z + Math.sin(p.phase+time*.0002)*3;
    const x3=Math.cos(a)*r;
    const y3=Math.sin(a)*r*tilt;
    const z3=depth + Math.sin(a*1.4)*r*.055;

    const perspective=1/(1+z3/focal);
    const x=cx+x3*perspective;
    const y=cy+y3*perspective - smoothScrollY*.026;

    if(x<-20||x>w+20||y<-20||y>h+20) continue;

    const core=Math.max(0,1-r/baseRadius);
    const tw=.82+.18*Math.sin(p.phase+time*.002);
    let alpha=Math.min(.85,p.alpha*(.42+core*1.5)*tw)*perspective;
    if(p.dusty) alpha*=.35;

    gctx.beginPath();
    gctx.fillStyle=`rgba(${p.hue[0]},${p.hue[1]},${p.hue[2]},${alpha})`;
    gctx.arc(x,y,Math.max(.18,p.size*perspective),0,Math.PI*2);
    gctx.fill();

    // Soft halo around bright star-forming knots.
    if(p.size>1.1){
      gctx.beginPath();
      gctx.fillStyle=`rgba(${p.hue[0]},${p.hue[1]},${p.hue[2]},${alpha*.18})`;
      gctx.arc(x,y,p.size*perspective*2.6,0,Math.PI*2);
      gctx.fill();
    }
  }

  // Soft, warm galactic core with a cooler outer halo.
  const glow=gctx.createRadialGradient(cx,cy,0,cx,cy,baseRadius*.32);
  glow.addColorStop(0,"rgba(255,244,222,.12)");
  glow.addColorStop(.32,"rgba(255,225,190,.05)");
  glow.addColorStop(.62,"rgba(160,150,255,.028)");
  glow.addColorStop(1,"rgba(0,0,0,0)");
  gctx.fillStyle=glow;
  gctx.fillRect(0,0,w,h);

  gctx.globalAlpha=1;
  requestAnimationFrame(drawFrame);
}

function drawFrame(time){
  drawStars(time);
  drawGalaxy(time);
}

resize();
requestAnimationFrame(drawFrame);

window.addEventListener("resize",resize);
window.addEventListener("scroll",()=>{scrollY=window.scrollY;});
window.addEventListener("mousemove",e=>{
  mouseX=e.clientX/w;
  mouseY=e.clientY/h;
});

function spawnMainShootingStar(){
  if(document.hidden)return;
  const star=document.createElement("span");
  star.className="shooting-star";
  const startX=window.innerWidth+100;
  const startY=window.innerHeight*(0.60+Math.random()*0.20);
  const travelX=window.innerWidth*(.95+Math.random()*.20);
  const travelY=-(window.innerHeight*(.62+Math.random()*.10));
  const duration=3900+Math.random()*700;
  const angle=-150+(Math.random()*5-2.5);
  star.style.left=startX+"px";
  star.style.top=startY+"px";
  document.body.appendChild(star);
  star.animate([
    {transform:`translate(0,0) rotate(${angle}deg) scale(.48)`,opacity:0},
    {transform:`translate(${-travelX*.10}px,${travelY*.10}px) rotate(${angle}deg) scale(1)`,opacity:.92,offset:.10},
    {transform:`translate(${-travelX*.58}px,${travelY*.58}px) rotate(${angle}deg) scale(.92)`,opacity:.68,offset:.70},
    {transform:`translate(${-travelX}px,${travelY}px) rotate(${angle}deg) scale(.65)`,opacity:0}
  ],{duration,easing:"cubic-bezier(.18,.48,.22,1)"});
  setTimeout(()=>star.remove(),duration+100);
}
setInterval(spawnMainShootingStar,12000);
setTimeout(spawnMainShootingStar,3000);

function spawnTinyStreak(){
  if(document.hidden)return;
  const streak=document.createElement("span");
  streak.className="tiny-streak";
  const left=Math.random()>.5;
  streak.style.left=left?(-20-Math.random()*80)+"px":(window.innerWidth+20)+"px";
  streak.style.top=(Math.random()*window.innerHeight*.75)+"px";
  document.body.appendChild(streak);
  const dx=left?(80+Math.random()*120):-(80+Math.random()*120);
  const dy=20+Math.random()*50;
  const angle=left?18+Math.random()*8:162+Math.random()*8;
  const duration=1150+Math.random()*700;
  streak.animate([
    {transform:`translate(0,0) rotate(${angle}deg)`,opacity:0},
    {transform:`translate(${dx*.45}px,${dy*.45}px) rotate(${angle}deg)`,opacity:.34,offset:.3},
    {transform:`translate(${dx}px,${dy}px) rotate(${angle}deg)`,opacity:0}
  ],{duration,easing:"ease-out"});
  setTimeout(()=>streak.remove(),duration+80);
}
setInterval(()=>{if(Math.random()>.48)spawnTinyStreak()},3600);

const cursor=document.querySelector(".cursor-star");
let mx=-100,my=-100,cx=-100,cy=-100,rot=0;
window.addEventListener("mousemove",e=>{mx=e.clientX;my=e.clientY;cursor?.classList.add("active");});
function moveCursor(){
  cx += (mx-cx)*.18; cy += (my-cy)*.18; rot+=1.5;
  if(cursor) cursor.style.transform=`translate(${cx}px,${cy}px) translate(-50%,-50%) rotate(${rot}deg)`;
  requestAnimationFrame(moveCursor);
}
moveCursor();
window.addEventListener("mouseleave",()=>cursor?.classList.remove("active"));

const observer=new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      e.target.classList.add("show");
      observer.unobserve(e.target);
    }
  });
},{threshold:.12,rootMargin:"0px 0px -40px 0px"});
document.querySelectorAll(".reveal").forEach(el=>observer.observe(el));

const menu=document.querySelector(".menu"), nav=document.querySelector(".nav nav");
menu?.addEventListener("click",()=>nav.classList.toggle("open"));
nav?.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>nav.classList.remove("open")));

window.addEventListener("scroll",()=>{
  const header=document.querySelector(".nav");
  if(header) header.style.boxShadow=window.scrollY>20?"0 8px 30px rgba(0,0,0,.22)":"none";

  // Very subtle mouse + scroll parallax for the hero orbit/photo.
  const hero=document.querySelector(".hero-photo");
  if(hero){
    const offset=(window.scrollY*.05);
    hero.style.transform=`translate3d(${(mouseX-.5)*8}px,${offset*.02}px,0)`;
  }
});
