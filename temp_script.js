
'use strict';
const API='http://localhost:8000';
const S={preds:[],hubs:new Set(),totalScore:0,sepMet:false,filters:new Set(['open','monitor','skip','cold']),q:'',sortK:'p_profit',sortD:-1,tab:'map',shapCh:null,histCh:null,sv:{p:.5,h:10,s:2.0},city:'delhi'};
const $=id=>document.getElementById(id);
const pct=v=>v!=null?(+v*100).toFixed(1)+'%':'N/A';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pcol=p=>p>.7?'var(--green)':p>.4?'var(--amber)':'var(--red)';
const rlbl=r=>({open:'✅ Open',monitor:'🟡 Monitor',skip:'❌ Skip'}[r]||r);
const rbdg=r=>`<span class="tbdg b${r[0]}">${r}</span>`;

/* CURSOR */
(()=>{
  const cur=$('cur'),dot=$('curdot');
  let mx=0,my=0,cx=0,cy=0;
  document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;dot.style.left=mx+'px';dot.style.top=my+'px';});
  (function loop(){cx+=(mx-cx)*.12;cy+=(my-cy)*.12;cur.style.left=cx+'px';cur.style.top=cy+'px';requestAnimationFrame(loop);})();
  document.addEventListener('mousedown',()=>cur.classList.add('c'));
  document.addEventListener('mouseup',()=>cur.classList.remove('c'));
  document.addEventListener('mouseover',e=>{if(e.target.closest('button,a,.tabbtn,.chip,.hitem,.ntbl tr,.zt tr,.slwrap'))cur.classList.add('h');});
  document.addEventListener('mouseout', e=>{if(e.target.closest('button,a,.tabbtn,.chip,.hitem,.ntbl tr,.zt tr,.slwrap'))cur.classList.remove('h');});
})();

/* LOADING CANVAS */
(()=>{
  const cv=$('lcanvas'),ctx=cv.getContext('2d');
  let W,H,pts=[];
  const rsz=()=>{W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;};
  rsz();window.addEventListener('resize',rsz);
  for(let i=0;i<80;i++)pts.push({x:Math.random()*1800,y:Math.random()*1000,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,r:Math.random()*1.5+.5,a:Math.random()*.4+.1});
  (function draw(){
    ctx.clearRect(0,0,W,H);
    pts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=W;if(p.x>W)p.x=0;if(p.y<0)p.y=H;if(p.y>H)p.y=0;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(0,255,170,${p.a})`;ctx.fill();});
    for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy);if(d<100){ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.strokeStyle=`rgba(0,255,170,${.07*(1-d/100)})`;ctx.lineWidth=.5;ctx.stroke();}}
    requestAnimationFrame(draw);
  })();
})();

/* HEX LOADING GRID */
(()=>{const g=$('lhexgrid');for(let i=0;i<35;i++){const h=document.createElement('div');h.className='lhexc';h.style.animationDelay=(i*.03)+'s';h.style.background=i%7===0?'var(--gdim)':i%5===0?'var(--bdim)':'var(--bg3)';if(i%7===0)h.style.borderColor='var(--gmid)';g.appendChild(h);}})();

/* TYPEWRITER */
async function tw(el,txt,spd=28){return new Promise(res=>{let i=0;const t=setInterval(()=>{el.textContent+=txt[i++];if(i>=txt.length){clearInterval(t);res();}},spd);});}
async function runTerm(){await tw($('tl1'),'connecting to backend api...',25);await new Promise(r=>setTimeout(r,200));await tw($('tl2'),'fetching geospatial grid...',25);}
runTerm();

/* PROGRESS */
function setP(p,lbl){$('pfill').style.width=p+'%';$('ppct').textContent=p+'%';if(lbl)$('plbl').textContent=lbl;}

/* TOAST */
function toast(msg,type='',dur=4000){const c=$('toasts'),el=document.createElement('div');el.className='toast '+type;el.innerHTML=`<span>${type==='err'?'⚠️':'✓'}</span><span>${msg}</span>`;c.appendChild(el);setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),300);},dur);}

/* ══════════════ CUSTOM SLIDER ENGINE ══════════════ */
class Slider{
  constructor(wid,fid,tid,vid,iid,cfg){
    this.W=$(wid);this.F=$(fid);this.T=$(tid);this.V=$(vid);this.I=$(iid);
    this.min=+cfg.min;this.max=+cfg.max;this.step=+cfg.step;this.v=+cfg.val;
    this.fmt=cfg.fmt||(v=>v.toFixed(2));this.cb=cfg.cb||null;
    this._drag=false;this._init();
  }
  get pct(){return(this.v-this.min)/(this.max-this.min)*100;}
  snap(raw){return clamp(this.min+Math.round((raw-this.min)/this.step)*this.step,this.min,this.max);}
  fromX(cx){const r=this.W.getBoundingClientRect();return this.snap(this.min+clamp((cx-r.left)/r.width,0,1)*(this.max-this.min));}
  render(){
    const p=this.pct;
    this.F.style.width=p+'%';
    this.T.style.left=p+'%';
    this.V.textContent=this.fmt(this.v);
    this.I.style.width=p+'%';
    // Color transitions based on value
    const g=Math.round(p*2.55),hue=this.v/this.max;
    this.F.style.boxShadow=`0 0 ${8+hue*8}px rgba(0,255,170,${.3+hue*.2})`;
  }
  set(val){const pv=this.v;this.v=val;this.render();if(this.v!==pv&&this.cb)this.cb(this.v);}
  _init(){
    this.render();
    // Mouse drag
    this.T.addEventListener('mousedown',e=>{e.preventDefault();this._drag=true;this.T.classList.add('dr');
      const mv=ev=>{this.set(this.fromX(ev.clientX));};
      const up=()=>{this._drag=false;this.T.classList.remove('dr');document.removeEventListener('mousemove',mv);};
      document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up,{once:true});
    });
    // Track click
    this.W.addEventListener('click',e=>{if(e.target===this.T)return;this.set(this.fromX(e.clientX));});
    // Keyboard
    this.T.addEventListener('keydown',e=>{
      const d=e.key==='ArrowRight'||e.key==='ArrowUp'?1:e.key==='ArrowLeft'||e.key==='ArrowDown'?-1:0;
      if(!d)return;e.preventDefault();
      // Accelerate on shift
      const mult=e.shiftKey?5:1;
      this.set(clamp(this.v+d*this.step*mult,this.min,this.max));
    });
    // Touch
    this.T.addEventListener('touchstart',e=>{e.preventDefault();
      const mv=ev=>{this.set(this.fromX(ev.touches[0].clientX));};
      document.addEventListener('touchmove',mv);
      document.addEventListener('touchend',()=>{document.removeEventListener('touchmove',mv);},{once:true});
    });
    // Scroll wheel on slider
    this.W.addEventListener('wheel',e=>{e.preventDefault();const d=e.deltaY<0?1:-1;this.set(clamp(this.v+d*this.step,this.min,this.max));},{passive:false});
  }
}

const SL=[
  new Slider('sw0','sf0','st0','sv0','si0',{min:0,max:1,step:.05,val:.5,fmt:v=>(+v).toFixed(2),cb:v=>{S.sv.p=v;applyMapFilter();}}),
  new Slider('sw1','sf1','st1','sv1','si1',{min:1,max:50,step:1,val:10,fmt:v=>Math.round(v)+'',cb:v=>{S.sv.h=Math.round(v);}}),
  new Slider('sw2','sf2','st2','sv2','si2',{min:.5,max:10,step:.5,val:2,fmt:v=>(+v).toFixed(1),cb:v=>{S.sv.s=v;}}),
];

/* ══════════════ MAP ══════════════ */
const map=new maplibregl.Map({container:'map',style:'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',center:[77.1,28.65],zoom:10.5,attributionControl:false});
map.addControl(new maplibregl.NavigationControl({showCompass:false}),'bottom-right');
map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right');

map.on('load',()=>{
  map.addSource('cells',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
  map.addSource('hubs', {type:'geojson',data:{type:'FeatureCollection',features:[]}});
  map.addSource('hlines',{type:'geojson',data:{type:'FeatureCollection',features:[]}});

  map.addLayer({id:'hlines',type:'line',source:'hlines',paint:{'line-color':'rgba(0,255,170,.15)','line-width':1,'line-dasharray':[4,4]}});

  map.addLayer({id:'cells',type:'circle',source:'cells',paint:{
    'circle-radius':['interpolate',['linear'],['zoom'],9,5,13,13],
    'circle-color':['case',['==',['get','vis'],false],'transparent',['get','is_cold_start'],'#38c8ff',['>',['get','p_profit'],.7],'#00ffaa',['>',['get','p_profit'],.4],'#ffcc00','#ff3355'],
    'circle-opacity':.85,'circle-stroke-width':.8,'circle-stroke-color':'rgba(255,255,255,.1)',
  }});
  map.addLayer({id:'hpulse',type:'circle',source:'hubs',paint:{'circle-radius':['interpolate',['linear'],['zoom'],9,18,13,32],'circle-color':'transparent','circle-stroke-width':1,'circle-stroke-color':'rgba(0,255,170,.22)'}});
  map.addLayer({id:'hdots',type:'circle',source:'hubs',paint:{'circle-radius':['interpolate',['linear'],['zoom'],9,8,13,16],'circle-color':'#fff','circle-stroke-width':2.5,'circle-stroke-color':'#00ffaa','circle-opacity':.95}});

  ['cells','hdots'].forEach(l=>{
    map.on('mouseenter',l,()=>{map.getCanvas().style.cursor='pointer';});
    map.on('mouseleave',l,()=>{map.getCanvas().style.cursor='';$('tip').style.display='none';});
    map.on('mousemove',l,onMove);
    map.on('click',l,onClick);
  });
  loadData();
});

/* DATA LOAD */
async function loadData(){
  try{
    setP(5,'Connecting to API…');
    const cells=await apiFetch('/grid?city='+S.city);
    setP(30,`Grid: ${cells.length} cells`);
    $('tl3w').style.display='flex';$('tl3').textContent=`batch inference on ${cells.length} cells…`;
    setP(50,'Running LightGBM batch…');
    const res=await apiFetch('/batch',{method:'POST',body:JSON.stringify({locations:cells.map(c=>({lat:c.lat,lon:c.lon,grid_id:c.grid_id})),city:S.city})});
    S.preds=res.predictions;
    setP(90,'Rendering…');
    updKPIs();renderCells();buildHist();buildZT();updDL();updLegPcts();pipeDone(4);
    setP(100,'Ready');setConn(true,`${S.preds.length} zones live`);
    document.querySelectorAll('.kcell').forEach(c=>c.classList.add('rdy'));
    setTimeout(()=>$('lov').classList.add('out'),600);
    toast(`${S.preds.length} predictions loaded`,'ok');
  }catch(e){setConn(false,'Backend unreachable');toast(e.message,'err',8000);$('lov').classList.add('out');console.error(e);}
}

async function apiFetch(path,opts={}){
  opts.headers={'Content-Type':'application/json',...(opts.headers||{})};
  const r=await fetch(API+path,opts);
  if(!r.ok)throw new Error(`${path} → ${r.status} ${r.statusText}`);
  return r.json();
}

/* RENDER CELLS */
function visP(){return S.preds.filter(p=>{if(S.q&&!p.grid_id.toLowerCase().includes(S.q))return false;if(p.is_cold_start&&!S.filters.has('cold'))return false;if(!p.is_cold_start&&!S.filters.has(p.recommendation))return false;return true;});}

function renderCells(){
  const vis=new Set(visP().map(p=>p.grid_id));
  map.getSource('cells').setData({type:'FeatureCollection',features:S.preds.map(p=>({type:'Feature',geometry:{type:'Point',coordinates:[+p.lon,+p.lat]},properties:{...p,vis:vis.has(p.grid_id)}}))});
  if(S.preds.length){const lats=S.preds.map(p=>+p.lat),lons=S.preds.map(p=>+p.lon);map.flyTo({center:[(Math.min(...lons)+Math.max(...lons))/2,(Math.min(...lats)+Math.max(...lats))/2],zoom:11,duration:1400});}
}

function applyMapFilter(){
  if(!S.preds.length)return;
  const vis=new Set(visP().map(p=>p.grid_id));
  map.getSource('cells').setData({type:'FeatureCollection',features:S.preds.map(p=>({type:'Feature',geometry:{type:'Point',coordinates:[+p.lon,+p.lat]},properties:{...p,vis:vis.has(p.grid_id)}}))});
}

function renderHubs(){
  const hp=S.preds.filter(p=>S.hubs.has(p.grid_id));
  map.getSource('hubs').setData({type:'FeatureCollection',features:hp.map(p=>({type:'Feature',geometry:{type:'Point',coordinates:[+p.lon,+p.lat]},properties:{...p}}))});
  // Nearest-neighbor lines
  const lines=[];
  for(let i=0;i<hp.length;i++){let md=Infinity,mj=-1;for(let j=0;j<hp.length;j++){if(i===j)continue;const dx=hp[i].lon-hp[j].lon,dy=hp[i].lat-hp[j].lat,d=dx*dx+dy*dy;if(d<md){md=d;mj=j;}}if(mj>i)lines.push({type:'Feature',geometry:{type:'LineString',coordinates:[[+hp[i].lon,+hp[i].lat],[+hp[mj].lon,+hp[mj].lat]]}});}
  map.getSource('hlines').setData({type:'FeatureCollection',features:lines});
}

/* TOOLTIP */
const tip=$('tip');
function onMove(e){
  const p=e.features[0].properties;
  if(p.vis===false||p.vis==='false')return;
  const isHub=S.hubs.has(p.grid_id),pp=+p.p_profit,lo=+p.ci_lower,hi=+p.ci_upper;
  const loW=(isNaN(lo)?pp*.85:lo)*100,hiW=(isNaN(hi)?pp*1.15:hi)*100,midW=pp*100;
  tip.innerHTML=`<div class="tid">${p.grid_id}${isHub?'<span class="thub">★ HUB</span>':''}</div>
    <div class="trow"><span class="tkey">p_profit</span><span class="tval" style="color:${pcol(pp)}">${pct(pp)}</span></div>
    <div class="trow"><span class="tkey">95% CI</span><span class="tval">[${pct(lo)} – ${pct(hi)}]</span></div>
    <div class="trow"><span class="tkey">Recommendation</span><span class="tval">${rbdg(p.recommendation)}</span></div>
    <div class="trow"><span class="tkey">Data</span><span class="tval" style="color:${p.is_cold_start||p.is_cold_start==='true'?'var(--blue)':'var(--green)'}">${p.is_cold_start||p.is_cold_start==='true'?'⬡ Cold Start':'✦ Historical'}</span></div>
    <div class="tcibar"><div class="tcif" style="left:${loW}%;width:${Math.max(0,hiW-loW)}%;background:rgba(56,200,255,.22)"></div><div class="tcif" style="left:${midW-.5}%;width:1%;background:var(--blue)"></div></div>
    <div class="thint">CLICK FOR FULL DETAIL</div>`;
  const rect=$('main').getBoundingClientRect();
  let x=e.originalEvent.clientX-rect.left+14,y=e.originalEvent.clientY-rect.top-14;
  if(x+240>rect.width)x=e.originalEvent.clientX-rect.left-250;
  tip.style.left=Math.max(6,x)+'px';tip.style.top=Math.max(6,y)+'px';tip.style.display='block';
}

function onClick(e){
  tip.style.display='none';
  let p=e.features[0].properties;
  let d=p.shap_drivers;if(typeof d==='string'){try{d=JSON.parse(d);}catch{d=[];}}
  openPanel({...p,shap_drivers:d||[]});
  const rect=$('main').getBoundingClientRect();
  const r=document.createElement('div');r.className='ripple';r.style.left=(e.originalEvent.clientX-rect.left)+'px';r.style.top=(e.originalEvent.clientY-rect.top)+'px';
  $('main').appendChild(r);setTimeout(()=>r.remove(),700);
}

/* DETAIL PANEL */
function openPanel(p){
  const pp=+p.p_profit;
  $('panid').textContent=p.grid_id;
  const pEl=$('mcp');pEl.textContent=pct(pp);pEl.style.color=pcol(pp);
  $('mcr').textContent=rlbl(p.recommendation);
  $('mct').textContent=(p.is_cold_start||p.is_cold_start==='true')?'⬡ Thompson Sampling':'✦ LightGBM Ensemble';
  $('mcc').textContent=`${(+p.lat).toFixed(5)},  ${(+p.lon).toFixed(5)}`;
  // CI vis
  const lo=+p.ci_lower,hi=+p.ci_upper;
  const loP=(isNaN(lo)?pp*.85:lo)*100,hiP=(isNaN(hi)?pp*1.15:hi)*100,midP=pp*100;
  $('cirng').style.left=loP+'%';$('cirng').style.width=Math.max(0,hiP-loP)+'%';
  $('cipt').style.left=midP+'%';
  $('cilo').textContent=pct(lo);$('cihi').textContent=pct(hi);
  renderShap(p.shap_drivers);renderNearby(p.recommendation,p.grid_id);
  $('cpanel').classList.add('open');
}
$('btnclose').addEventListener('click',()=>$('cpanel').classList.remove('open'));

/* SHAP CHART */
function renderShap(drivers){
  const cv=$('shapch');
  if(S.shapCh){S.shapCh.destroy();S.shapCh=null;}
  if(!drivers||!drivers.length){
    const ctx=cv.getContext('2d');ctx.clearRect(0,0,cv.width,cv.height);
    ctx.fillStyle='#283d52';ctx.font='11px JetBrains Mono';ctx.textAlign='center';
    ctx.fillText('No SHAP data — cold start cell',cv.width/2,80);return;
  }
  const t5=[...drivers].sort((a,b)=>Math.abs(b.impact)-Math.abs(a.impact)).slice(0,5);
  t5.sort((a,b)=>a.impact-b.impact);
  S.shapCh=new Chart(cv,{type:'bar',data:{labels:t5.map(d=>d.feature),datasets:[{data:t5.map(d=>d.impact),backgroundColor:t5.map(d=>d.impact>=0?'rgba(0,255,170,.65)':'rgba(255,51,85,.65)'),borderColor:t5.map(d=>d.impact>=0?'#00ffaa':'#ff3355'),borderWidth:1,borderRadius:4}]},
  options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,animation:{duration:500,easing:'easeOutQuart'},
  plugins:{legend:{display:false},tooltip:{backgroundColor:'#0b1220',borderColor:'#1e2f45',borderWidth:1,titleColor:'#8aafc8',bodyColor:'#eaf4ff',titleFont:{family:'JetBrains Mono',size:10},bodyFont:{family:'JetBrains Mono',size:11},callbacks:{label:c=>` SHAP: ${c.raw.toFixed(4)}`}}},
  scales:{x:{grid:{color:'rgba(30,47,69,.8)'},ticks:{color:'#4a6a88',font:{family:'JetBrains Mono',size:9}},border:{color:'#1e2f45'}},y:{grid:{display:false},ticks:{color:'#8aafc8',font:{family:'JetBrains Mono',size:9}},border:{color:'#1e2f45'}}}}});
}

/* NEARBY */
function renderNearby(rec,cid){
  $('ntbody').innerHTML=S.preds.filter(p=>p.recommendation===rec&&p.grid_id!==cid).slice(0,12).map(p=>`
    <tr onclick="openPanel(${JSON.stringify(p).replace(/"/g,'&quot;')})">
      <td class="idc">${p.grid_id}</td><td style="color:${pcol(+p.p_profit)}">${pct(+p.p_profit)}</td><td>${rlbl(p.recommendation)}</td>
    </tr>`).join('');
}

/* HISTOGRAM */
function buildHist(){
  const cv=$('minihist');
  if(S.histCh)S.histCh.destroy();
  const bins=new Array(10).fill(0);
  S.preds.forEach(p=>{const b=Math.min(9,Math.floor(+p.p_profit*10));bins[b]++;});
  S.histCh=new Chart(cv,{type:'bar',data:{labels:['0','10','20','30','40','50','60','70','80','90'],datasets:[{data:bins,backgroundColor:bins.map((_,i)=>i>=7?'rgba(0,255,170,.7)':i>=4?'rgba(255,204,0,.7)':'rgba(255,51,85,.7)'),borderWidth:0,borderRadius:2}]},
  options:{responsive:true,maintainAspectRatio:false,animation:{duration:800,easing:'easeOutQuart'},
  plugins:{legend:{display:false},tooltip:{backgroundColor:'#0b1220',borderColor:'#1e2f45',borderWidth:1,titleColor:'#8aafc8',bodyColor:'#eaf4ff',titleFont:{family:'JetBrains Mono',size:9},bodyFont:{family:'JetBrains Mono',size:10}}},
  scales:{x:{display:false,grid:{display:false}},y:{display:false,grid:{display:false}}}}});
}

/* KPIs */
function animN(el,tgt,dur=700){const st=performance.now(),fr=parseFloat(el.textContent)||0;(function step(now){const t=Math.min((now-st)/dur,1),e=1-Math.pow(1-t,3);el.textContent=Math.round(fr+(tgt-fr)*e);if(t<1)requestAnimationFrame(step);})(performance.now());}

function updKPIs(){
  const ps=S.preds,no=ps.filter(p=>p.recommendation==='open').length,nm=ps.filter(p=>p.recommendation==='monitor').length,ns=ps.filter(p=>p.recommendation==='skip').length,nc=ps.filter(p=>p.is_cold_start).length;
  animN($('kvtot'),ps.length);animN($('kvopen'),no);animN($('kvmon'),nm);animN($('kvskip'),ns);animN($('kvcold'),nc);
  $('kvhubs').textContent=S.hubs.size||'—';
  $('kvscore').textContent=S.totalScore?S.totalScore.toFixed(3):'';
  $('cco').textContent=no;$('ccm').textContent=nm;$('ccs').textContent=ns;$('ccc').textContent=nc;
}
function updLegPcts(){
  const n=S.preds.length||1,f=x=>((x/n)*100).toFixed(1)+'%';
  $('lpopen').textContent=f(S.preds.filter(p=>p.recommendation==='open').length);
  $('lpmon').textContent=f(S.preds.filter(p=>p.recommendation==='monitor').length);
  $('lpskip').textContent=f(S.preds.filter(p=>p.recommendation==='skip').length);
  $('lpcold').textContent=f(S.preds.filter(p=>p.is_cold_start).length);
  $('lphubs').textContent=S.hubs.size||'—';
}

/* FILTER CHIPS */
const chipCls={open:'ag',monitor:'aa',skip:'ar',cold:'ab'};
document.querySelectorAll('[data-f]').forEach(ch=>{
  ch.addEventListener('click',()=>{
    const f=ch.dataset.f,cls=chipCls[f];
    if(S.filters.has(f)){S.filters.delete(f);ch.classList.remove(cls);}
    else{S.filters.add(f);ch.classList.add(cls);}
    applyMapFilter();
  });
});

/* SEARCH */
const si=$('si');
si.addEventListener('input',()=>{
  S.q=si.value.toLowerCase().trim();
  $('sc').style.display=S.q?'block':'none';
  applyMapFilter();
  if(S.q){const m=S.preds.find(p=>p.grid_id.toLowerCase()===S.q);if(m)map.flyTo({center:[+m.lon,+m.lat],zoom:14,duration:600});}
});
$('sc').addEventListener('click',()=>{si.value='';S.q='';$('sc').style.display='none';applyMapFilter();});

/* ZONES TABLE */
function buildZT(){
  let rows=[...S.preds].sort((a,b)=>+b.p_profit - +a.p_profit);
  $('tblmeta').textContent=`${rows.length} zones`;
  $('ztbody').innerHTML=rows.map(p=>`<tr onclick="switchTab('map');openPanel(${JSON.stringify(p).replace(/"/g,'&quot;')})">
    <td class="idc">${p.grid_id}</td><td>${(+p.lat).toFixed(5)}</td><td>${(+p.lon).toFixed(5)}</td>
    <td style="color:${pcol(+p.p_profit)}">${pct(+p.p_profit)}</td>
    <td>${pct(+p.ci_lower)}</td><td>${pct(+p.ci_upper)}</td>
    <td>${rlbl(p.recommendation)}</td><td>${p.is_cold_start?'⬡ Cold':'✦ Hist'}</td></tr>`).join('');
}
document.querySelectorAll('.zt th[data-s]').forEach(th=>{
  th.addEventListener('click',()=>{
    const k=th.dataset.s;if(S.sortK===k)S.sortD*=-1;else{S.sortK=k;S.sortD=-1;}
    document.querySelectorAll('.zt th').forEach(t=>t.classList.remove('srt'));th.classList.add('srt');
    const rows=[...S.preds].sort((a,b)=>typeof a[k]==='string'?S.sortD*a[k].localeCompare(b[k]):S.sortD*(+a[k]-+b[k]));
    $('ztbody').innerHTML=rows.map(p=>`<tr onclick="switchTab('map');openPanel(${JSON.stringify(p).replace(/"/g,'&quot;')})">
      <td class="idc">${p.grid_id}</td><td>${(+p.lat).toFixed(5)}</td><td>${(+p.lon).toFixed(5)}</td>
      <td style="color:${pcol(+p.p_profit)}">${pct(+p.p_profit)}</td>
      <td>${pct(+p.ci_lower)}</td><td>${pct(+p.ci_upper)}</td>
      <td>${rlbl(p.recommendation)}</td><td>${p.is_cold_start?'⬡ Cold':'✦ Hist'}</td></tr>`).join('');
  });
});

/* TABS */
function switchTab(n){
  S.tab=n;document.querySelectorAll('.tabbtn').forEach(b=>b.classList.toggle('act',b.dataset.tab===n));
  const tw=$('tblwrap'),dl=$('dlbar');
  if(n==='table'){tw.classList.add('vis');dl.style.opacity='0';}
  else{tw.classList.remove('vis');dl.style.opacity='1';}
}
document.querySelectorAll('.tabbtn').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));

/* OPTIMIZER */
$('btnopt').addEventListener('click',async()=>{
  const btn=$('btnopt');btn.disabled=true;btn.classList.add('spinning');$('blbl').textContent='Solving…';
  try{
    const res=await apiFetch('/optimize',{method:'POST',body:JSON.stringify({max_hubs:Math.round(S.sv.h),min_separation_km:S.sv.s,min_prob_threshold:S.sv.p,city:S.city})});
    S.hubs=new Set(res.selected_hubs);S.totalScore=res.total_score;S.sepMet=res.separation_constraint_met;
    renderHubs();updKPIs();updLegPcts();pipeDone(5);
    $('rmt').style.display='none';$('rmc').style.display='block';
    animN($('rv0'),res.selected_hubs.length);
    $('rv1').textContent=res.total_score.toFixed(4);
    $('rv2').textContent=res.separation_constraint_met?'✅ Met':'⚠️ Not Met';
    $('rv2').style.color=res.separation_constraint_met?'var(--green)':'var(--amber)';
    $('rc0').classList.add('hl');$('rc1').classList.add('hl');
    $('hlist').innerHTML=res.selected_hubs.map(id=>`<div class="hitem" onclick="flyTo('${id}')"><div class="hdot"></div><span style="color:var(--t1)">${id}</span></div>`).join('');
    updDL();flyToHubs();toast(`${res.selected_hubs.length} optimal hubs selected`,'ok');
  }catch(e){toast('Optimizer error: '+e.message,'err');}
  finally{btn.disabled=false;btn.classList.remove('spinning');$('blbl').textContent='Run BIP Optimizer';}
});

function flyTo(id){const p=S.preds.find(x=>x.grid_id===id);if(p)map.flyTo({center:[+p.lon,+p.lat],zoom:14,duration:800});}
function flyToHubs(){if(!S.hubs.size)return;const hp=S.preds.filter(p=>S.hubs.has(p.grid_id));const lons=hp.map(p=>+p.lon),lats=hp.map(p=>+p.lat);map.fitBounds([[Math.min(...lons),Math.min(...lats)],[Math.max(...lons),Math.max(...lats)]],{padding:80,duration:1200});}

/* DOWNLOADS */
function csvLink(rows){if(!rows.length)return'#';const k=Object.keys(rows[0]);const csv=[k.join(','),...rows.map(r=>k.map(x=>JSON.stringify(r[x]??'')).join(','))].join('\n');return'data:text/csv;charset=utf-8,'+encodeURIComponent(csv);}
function updDL(){
  $('dla').href=csvLink(S.preds.map(p=>({grid_id:p.grid_id,lat:p.lat,lon:p.lon,p_profit:p.p_profit,ci_lower:p.ci_lower,ci_upper:p.ci_upper,recommendation:p.recommendation,is_cold_start:p.is_cold_start})));
  $('dlh').href=csvLink(S.preds.filter(p=>S.hubs.has(p.grid_id)).map(p=>({grid_id:p.grid_id,lat:p.lat,lon:p.lon,p_profit:p.p_profit})));
}

/* PIPELINE */
function pipeDone(n){for(let i=1;i<=n;i++){const el=$('ps'+i);if(el)el.classList.add('done');}}

/* STATUS */
function setConn(live,msg){$('cdot').className='cdot'+(live?' live':'');$('cbadge').className='cbadge'+(live?' live':'');$('ctxt').textContent=msg;}

/* KEYBOARD SHORTCUTS */
document.addEventListener('keydown',e=>{
  if(e.target===si)return;
  if(e.key==='?'){$('kbdov').classList.toggle('vis');return;}
  if(e.key==='Escape'){$('kbdov').classList.remove('vis');$('cpanel').classList.remove('open');return;}
  if(e.key==='o'||e.key==='O'){if(!$('btnopt').disabled)$('btnopt').click();return;}
  if(e.key==='/'){e.preventDefault();si.focus();si.select();return;}
  if(e.key==='t'||e.key==='T'){switchTab(S.tab==='map'?'table':'map');return;}
  if(e.key==='h'||e.key==='H'){flyToHubs();return;}
  if(e.key==='d'||e.key==='D'){$('dla').click();return;}
});
$('kbdov').addEventListener('click',e=>{if(e.target===$('kbdov'))$('kbdov').classList.remove('vis');});

/* CITY SELECTOR */
$('citysel').addEventListener('change',function(){
  S.city=this.value;
  S.preds=[];S.hubs=new Set();S.totalScore=0;
  map.getSource('cells').setData({type:'FeatureCollection',features:[]});
  map.getSource('hubs').setData({type:'FeatureCollection',features:[]});
  map.getSource('hlines').setData({type:'FeatureCollection',features:[]});
  $('rmt').style.display='block';$('rmc').style.display='none';
  updKPIs();
  $('lov').classList.remove('out');
  setP(0,'Switching city…');
  loadData();
});

/* DYNAMIC CITY LIST FROM API */
(async function(){
  try{
    const data=await apiFetch('/cities');
    const sel=$('citysel');
    if(data.cities && data.cities.length){
      sel.innerHTML='';
      data.cities.forEach(c=>{
        const opt=document.createElement('option');
        opt.value=c.key;opt.textContent=c.name+' ('+c.cell_count+' cells)';
        if(c.key==='delhi')opt.selected=true;
        sel.appendChild(opt);
      });
    }
  }catch(e){console.warn('Could not load cities:',e);}
})();
