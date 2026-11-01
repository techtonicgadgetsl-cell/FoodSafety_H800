/* Shared: form definition, grading, storage, area GeoJSON, nav */
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---- Grades: EDIT mark ranges here (min % of each grade, highest first) ---- */
const GRADES=[
 {g:'A',min:75,max:100,name:'Good',months:3,col:'#10b981',cls:'bg-emerald-100 text-emerald-700'},
 {g:'B',min:50,max:74,name:'Satisfactory',months:2,col:'#f59e0b',cls:'bg-amber-100 text-amber-700'},
 {g:'C',min:25,max:49,name:'Unsatisfactory',months:1,col:'#ea580c',cls:'bg-orange-100 text-orange-700'},
 {g:'D',min:0,max:24,name:'Very unsatisfactory',months:1,col:'#e11d48',cls:'bg-rose-100 text-rose-700'}
];
const G=Object.fromEntries(GRADES.map(x=>[x.g,x]));
const gradeOf=p=>GRADES.find(x=>p>=x.min).g;
const rangeTxt=g=>`${G[g].min}–${G[g].max}%`;

/* ---- Form definition (official H800 revised 2022) ---- */
const YN5=[[5,'5 – Yes'],[0,'0 – No']];
const G3=[[4,'4 – Satisfactory'],[2,'2 – Partly'],[0,'0 – Unsatisfactory']];
const H3=[[4,'4 – No defects'],[2,'2 – One type of defect'],[0,'0 – Manufacturing & maintenance defects']];
const P3=[[5,'5 – More than 75%'],[2,'2 – 50–75%'],[0,'0 – Less than 50%']];
const YN2=[[2,'2 – Yes'],[0,'0 – No']];
const SECS=[
 {id:'g',t:'1. General',na:{l:'No need to be registered (registration items not applicable)',keys:['g1','g2']},items:[
  ['g1','Premises registered under the regulation',YN5],['g2','Registration certificate displayed',YN5],
  ['g3','Not convicted within one year',YN5],['g4','Food not destroyed within one year',YN5]]},
 {id:'b',t:'2. Building',items:[
  ['b1','Safe water',[[4,'4 – Safe'],[0,'0 – Unsafe']]],['b2','Cleanliness and cleaning',G3],
  ['b3','Pests and animals',[[4,'4 – None'],[2,'2 – Other pests/animals'],[0,'0 – Cockroach / rat / animal present']]],
  ['b4','Sound pollution',[[4,'4 – Normal voice heard beyond 1 m'],[2,'2 – Only within 1 m'],[0,'0 – Only very close']]],
  ['b5','Toilet’s cleanliness',[[4,'4 – Clean / toilet not necessary'],[2,'2 – Water & soap but dirt/smell'],[0,'0 – No water or soap']]]]},
 {id:'h',t:'3. Food handler',items:[
  ['h1','Medical certificates',P3],['h2','Hair net / head cap, mask, gloves, slippers / shoes',P3],
  ['h3','Unhygienic behaviour (eating, chewing, smoking, spitting)',[[5,'5 – No one'],[2,'2 – Less than 50%'],[0,'0 – More than 50%']]],
  ['h4','Use clean utensils to serve food',P3]]},
 {id:'p',t:'4. Processing and/or serving area',items:[
  ['p1','Walls hygienic',H3],['p2','Floor hygienic',H3],['p3','Ceiling hygienic',H3],['p4','Food contactable surfaces hygienic',H3],
  ['p5','Waste water (sanitary disposal)',YN2],['p6','Waste bins all closed',YN2]]},
 {id:'s',t:'5. Food storage',na:{l:'No storage of cooked food',keys:['s1','s2','s3','s4']},items:[
  ['s1','Cooked perishable food kept closed',G3],['s2','2/4 temperature rule',G3],['s3','Stored in food grade container',G3],
  ['s4','Contamination prevented (cooked food)',G3],['s5','Uncooked food – contamination prevented',G3]]}
];
const maxOf=i=>Math.max(...i[2].map(o=>o[0]));

/* ---- Records (localStorage) ---- */
let recs=[];try{recs=JSON.parse(localStorage.getItem('h800_records_v2'))||[]}catch(e){}
const persist=()=>{try{localStorage.setItem('h800_records_v2',JSON.stringify(recs))}catch(e){}};
const pk=r=>(r.name+'|'+(r.addr||'')).toLowerCase();
const addMonths=(d,m)=>{const x=new Date(d);x.setMonth(x.getMonth()+m);return x.toISOString().slice(0,10)};
const today=()=>new Date().toISOString().slice(0,10);
const latest=()=>{const m=new Map();recs.forEach(r=>{const k=pk(r);if(!m.has(k)||m.get(k).date<r.date)m.set(k,r)});return [...m.values()]};

/* ---- Area GeoJSON: geo-data.js first, else saved once in IndexedDB ---- */
const idb=()=>new Promise((res,rej)=>{const r=indexedDB.open('h800',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
async function kvGet(k){try{const d=await idb();return await new Promise(res=>{const q=d.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>res(null)})}catch(e){return null}}
async function kvSet(k,v){const d=await idb();return new Promise((res,rej)=>{const t=d.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=res;t.onerror=()=>rej(t.error)})}
async function kvDel(k){const d=await idb();return new Promise(res=>{const t=d.transaction('kv','readwrite');t.objectStore('kv').delete(k);t.oncomplete=res})}
/* Auto-convert Sri Lanka Grid (Kandawala, metres) GeoJSON to WGS84 lat/lng; normal lat/lng files are left untouched */
const SLG=(()=>{const a=6377276.345,f=1/300.8017,e2=f*(2-f),ep2=e2/(1-e2),lat0=7.0004729*Math.PI/180,lon0=80.7716944*Math.PI/180,k0=0.9999238418,FE=2e5,FN=2e5,S=Math.sin,C=Math.cos,T=Math.tan;
 const arc=p=>a*((1-e2/4-3*e2**2/64-5*e2**3/256)*p-(3*e2/8+3*e2**2/32+45*e2**3/1024)*S(2*p)+(15*e2**2/256+45*e2**3/1024)*S(4*p)-(35*e2**3/3072)*S(6*p)),M0=arc(lat0);
 return (E,N)=>{const M=(N-FN)/k0+M0,mu=M/(a*(1-e2/4-3*e2**2/64-5*e2**3/256)),e1=(1-Math.sqrt(1-e2))/(1+Math.sqrt(1-e2));
  const p1=mu+(3*e1/2-27*e1**3/32)*S(2*mu)+(21*e1**2/16-55*e1**4/32)*S(4*mu)+(151*e1**3/96)*S(6*mu)+(1097*e1**4/512)*S(8*mu);
  const C1=ep2*C(p1)**2,T1=T(p1)**2,N1=a/Math.sqrt(1-e2*S(p1)**2),R1=a*(1-e2)/(1-e2*S(p1)**2)**1.5,D=(E-FE)/(N1*k0);
  const ph=p1-(N1*T(p1)/R1)*(D**2/2-(5+3*T1+10*C1-4*C1**2-9*ep2)*D**4/24+(61+90*T1+298*C1+45*T1**2-252*ep2-3*C1**2)*D**6/720);
  const la=lon0+(D-(1+2*T1+C1)*D**3/6+(5-2*C1+28*T1-3*C1**2+8*ep2+24*T1**2)*D**5/120)/C(p1);
  const Nn=a/Math.sqrt(1-e2*S(ph)**2),X=Nn*C(ph)*C(la)-97,Y=Nn*C(ph)*S(la)+787,Z=Nn*(1-e2)*S(ph)+86,aw=6378137,fw=1/298.257223563,e2w=fw*(2-fw),p=Math.hypot(X,Y);
  let lat=Math.atan2(Z,p*(1-e2w));for(let i=0;i<6;i++){const Nw=aw/Math.sqrt(1-e2w*S(lat)**2);lat=Math.atan2(Z+e2w*Nw*S(lat),p)}
  return [+(Math.atan2(Y,X)*180/Math.PI).toFixed(6),+(lat*180/Math.PI).toFixed(6)]}})();
function fixGeo(g){
 if(!g)return g;let big=false;const walk=c=>{if(typeof c[0]==='number'){if(Math.abs(c[0])>360||Math.abs(c[1])>360)big=true}else c.forEach(walk)};
 const geoms=x=>x.type==='FeatureCollection'?x.features.map(f=>f.geometry):x.type==='Feature'?[x.geometry]:[x];
 geoms(g).forEach(m=>m&&m.coordinates&&walk(m.coordinates));if(!big)return g;
 const cv=c=>typeof c[0]==='number'?SLG(c[0],c[1]):c.map(cv),cp=JSON.parse(JSON.stringify(g));
 geoms(cp).forEach(m=>{if(m&&m.coordinates)m.coordinates=cv(m.coordinates)});return cp}
async function getGeo(){return fixGeo(window.AREA_GEOJSON||await kvGet('area'))}
async function addArea(map){
 const g=await getGeo();if(!g)return null;
 return L.geoJSON(g,{style:{color:'#1d4ed8',weight:2,fillColor:'#3b82f6',fillOpacity:.08},
  onEachFeature:(f,ly)=>{const p=f.properties||{},n=p.GND_N||p.name||p.NAME;if(n)ly.bindTooltip(String(n),{sticky:true})}}).addTo(map);
}
const tile=()=>L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,maxNativeZoom:16,detectRetina:true,attribution:'Tiles &copy; Esri'});


/* ---- Map tools: Street / Satellite / Topo, place search, GPS with accuracy ---- */
const OSM=()=>L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20,maxNativeZoom:19,detectRetina:true,attribution:'&copy; OpenStreetMap'});
const ESRI=s=>'https://server.arcgisonline.com/ArcGIS/rest/services/'+s+'/MapServer/tile/{z}/{y}/{x}';
const SAT=(labels,roads)=>L.layerGroup([L.tileLayer(ESRI('World_Imagery'),{maxZoom:20,maxNativeZoom:18,detectRetina:true,attribution:'Tiles &copy; Esri'}),
 ...(roads?[L.tileLayer(ESRI('Reference/World_Transportation'),{maxZoom:20,maxNativeZoom:16,detectRetina:true})]:[]),
 ...(labels?[L.tileLayer(ESRI('Reference/World_Boundaries_and_Places'),{maxZoom:20,maxNativeZoom:16,detectRetina:true})]:[])]);
const accTxt=a=>'GPS ±'+Math.round(a)+' m '+(a<=10?'(good)':a<=30?'(fair)':'(low – go outside / tap the map to adjust)');
function locateMe(map,o={}){
 if(!navigator.geolocation){alert('Location not available.');return}
 if(map._stopLoc)map._stopLoc();
 if(map._meLay)map.removeLayer(map._meLay);
 const lay=L.layerGroup().addTo(map);map._meLay=lay;let best=null,first=true,w,t;
 const stop=()=>{navigator.geolocation.clearWatch(w);clearTimeout(t);map._stopLoc=null};
 map._stopLoc=stop;
 w=navigator.geolocation.watchPosition(p=>{
  const ll=[p.coords.latitude,p.coords.longitude],acc=p.coords.accuracy;
  lay.clearLayers();
  const c=L.circle(ll,{radius:acc,color:'#2563eb',weight:1,fillColor:'#3b82f6',fillOpacity:.15}).addTo(lay);
  L.circleMarker(ll,{radius:7,color:'#fff',weight:2,fillColor:'#2563eb',fillOpacity:1}).addTo(lay);
  if(first){first=false;map.fitBounds(c.getBounds(),{maxZoom:19,padding:[20,20]})}
  if(!best||acc<best.acc){best={lat:ll[0],lng:ll[1],acc};o.fix&&o.fix(best)}
  o.status&&o.status(accTxt(acc));
  if(acc<=8)stop();
 },e=>{stop();alert('Could not get location ('+e.message+'). Search or tap the map instead.')},{enableHighAccuracy:true,timeout:20000,maximumAge:0});
 t=setTimeout(stop,20000);
}
function parseLL(t){let s=String(t).trim();try{s=decodeURIComponent(s)}catch(e){}
 const m=s.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)||s.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/)||s.match(/[?&](?:q|ll|query|destination)=\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/)||s.match(/^(-?\d+\.\d+)\s*[, ]\s*(-?\d+\.\d+)$/);
 if(!m)return null;const a=+m[1],b=+m[2];return Math.abs(a)<=90&&Math.abs(b)<=180?{lat:a,lng:b}:null}
function mapTools(map,o={}){
 const topo=tile(),street=OSM(),sat=SAT(),B={'Topo':topo,'Street':street,'Satellite':sat,'Satellite + Labels':SAT(1,1)};let k='Satellite + Labels';
 try{k=localStorage.getItem('h800_base')||'Satellite + Labels'}catch(e){}
 (B[k]||B['Satellite + Labels']).addTo(map);
 L.control.layers(B,null,{position:'topright'}).addTo(map);
 map.on('baselayerchange',e=>{try{localStorage.setItem('h800_base',e.name)}catch(x){}});
 const S=L.control({position:'topleft'});
 S.onAdd=()=>{
  const d=L.DomUtil.create('div');d.style.cssText='background:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,.3);padding:4px;width:min(270px,62vw)';
  d.innerHTML='<div style="display:flex;gap:4px"><input type="search" placeholder="Search place / paste Google Maps link or lat,lng" style="flex:1;min-width:0;border:1px solid #cbd5e1;border-radius:6px;padding:5px 8px;font-size:16px"><button type="button" class="sb" style="border:0;background:#0d9488;color:#fff;border-radius:6px;padding:0 10px">🔍</button></div><div class="res" style="max-height:190px;overflow:auto;font-size:12px"></div>'
   +(o.locate!==false?'<div style="margin-top:4px;display:flex;gap:6px;align-items:center;flex-wrap:wrap"><a class="gm" target="_blank" rel="noopener" style="border:1px solid #cbd5e1;border-radius:6px;padding:3px 8px;font-size:12px;color:#0369a1">↗ Google Maps</a><button type="button" class="lb" style="border:1px solid #cbd5e1;border-radius:6px;padding:3px 8px;font-size:12px">📍 My location</button><span class="ac" style="font-size:11px;color:#475569"></span></div>':'');
  L.DomEvent.disableClickPropagation(d);L.DomEvent.disableScrollPropagation(d);
  const inp=d.querySelector('input'),res=d.querySelector('.res');let mk=null;
  const go=async()=>{const q=inp.value.trim();if(!q)return;
   const pl=parseLL(q);
   if(pl){if(mk)map.removeLayer(mk);mk=L.circleMarker([pl.lat,pl.lng],{radius:8,color:'#fff',weight:2,fillColor:'#e11d48',fillOpacity:1}).addTo(map);map.setView([pl.lat,pl.lng],18);res.innerHTML='<div style="padding:4px;color:#047857">✔ Location found from link / coordinates</div>';o.onFix&&o.onFix({lat:pl.lat,lng:pl.lng,acc:0});return}
   if(/goo\.gl|maps\.app/i.test(q)){res.innerHTML='<div style="padding:4px;color:#e11d48">Short links cannot be read. Open the link, then copy the long address from the browser bar – or long-press the spot in Google Maps and copy the coordinates.</div>';return}res.innerHTML='<div style="padding:4px">Searching…</div>';
   try{const r=await (await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=lk&q='+encodeURIComponent(q))).json();
    if(!r.length){res.innerHTML='<div style="padding:4px">No results.</div>';return}
    res.innerHTML=r.map((x,i)=>`<div data-i="${i}" style="padding:5px 4px;border-top:1px solid #e2e8f0;cursor:pointer">${esc(x.display_name)}</div>`).join('');
    res.onclick=e=>{const n=e.target.closest('[data-i]');if(!n)return;const x=r[+n.dataset.i];
     if(mk)map.removeLayer(mk);mk=L.circleMarker([+x.lat,+x.lon],{radius:8,color:'#fff',weight:2,fillColor:'#e11d48',fillOpacity:1}).addTo(map);
     if(x.boundingbox&&x.type!=='house')map.fitBounds([[+x.boundingbox[0],+x.boundingbox[2]],[+x.boundingbox[1],+x.boundingbox[3]]],{maxZoom:18});else map.setView([+x.lat,+x.lon],18);res.innerHTML=''}
   }catch(e){res.innerHTML='<div style="padding:4px;color:#e11d48">Search failed (internet?).</div>'}};
  d.querySelector('.sb').onclick=go;inp.onkeydown=e=>{if(e.key==='Enter')go()};
  const gm=d.querySelector('.gm');if(gm)gm.onclick=()=>{const c=map.getCenter();gm.href='https://www.google.com/maps/search/?api=1&query='+c.lat.toFixed(6)+','+c.lng.toFixed(6)};
  const lb=d.querySelector('.lb');if(lb)lb.onclick=()=>locateMe(map,{status:t=>d.querySelector('.ac').textContent=t,fix:o.onFix});
  return d};
 S.addTo(map);
}

/* ---- Helpers ---- */
const sidOf=r=>{let h=5381;const s=pk(r);for(let i=0;i<s.length;i++)h=(h*33^s.charCodeAt(i))>>>0;return h.toString(36)};
const baseUrl=()=>(window.APP_URL||location.href.replace(/[^\/]*([?#].*)?$/,'')).replace(/\/?$/,'/');
const shopUrl=sid=>baseUrl()+'q.html?s='+sid;
const ownerUrl=(sid,code)=>baseUrl()+'q.html?s='+sid+'&k='+code;
const daysTo=d=>Math.round((new Date(d)-new Date(today()))/864e5);
const secPct=(r,s)=>{const v=r.subs&&r.subs[s.id];return v&&typeof v==='object'&&v.on!==false&&v.m?v.t/v.m*100:null};
const shopRecs=sid=>recs.filter(r=>sidOf(r)===sid).sort((a,b)=>a.date.localeCompare(b.date)||a.id-b.id);

/* ---- Firebase (optional: fill firebase-config.js) ---- */
const FB_ON=!!(window.FIREBASE_CONFIG&&FIREBASE_CONFIG.apiKey&&window.firebase);
let auth=null,db=null;
if(FB_ON){firebase.initializeApp(FIREBASE_CONFIG);auth=firebase.auth();db=firebase.firestore()}
const COL='h800_records';
const saveRec=async r=>{persist();if(FB_ON)await db.collection(COL).doc(String(r.id)).set(r)};
const delRec=async id=>{recs=recs.filter(x=>x.id!==id);persist();if(FB_ON)await db.collection(COL).doc(String(id)).delete()};
function loginUI(){return new Promise(res=>{
 const d=document.createElement('div');d.className='fixed inset-0 bg-slate-900/80 z-[5000] flex items-center justify-center p-3';
 d.innerHTML=`<div class="bg-white rounded-xl p-5 w-full max-w-sm space-y-3"><h2 class="font-bold text-lg">H800 – Staff login</h2>
 <input id="lg_e" type="email" placeholder="E-mail" class="w-full border rounded p-2"><input id="lg_p" type="password" placeholder="Password / PIN" class="w-full border rounded p-2">
 <p id="lg_m" class="text-xs text-rose-600"></p><button id="lg_b" class="w-full bg-emerald-600 text-white rounded p-2 font-medium">Sign in</button></div>`;
 document.body.appendChild(d);$('lg_e').value=localStorage.getItem('h800_email')||'';if($('lg_e').value)$('lg_p').focus();
 const go=async()=>{try{await auth.signInWithEmailAndPassword($('lg_e').value.trim(),$('lg_p').value);localStorage.setItem('h800_email',$('lg_e').value.trim());d.remove();res()}catch(e){$('lg_m').textContent='Login failed: '+e.message}};
 $('lg_b').onclick=go;$('lg_p').onkeydown=e=>{if(e.key==='Enter')go()};
})}
async function boot(active,fn){
 nav(active);
 if(FB_ON){
  await new Promise(r=>{const u=auth.onAuthStateChanged(()=>{u();r()})});
  if(!auth.currentUser)await loginUI();
  try{
   const cloud=(await db.collection(COL).get()).docs.map(d=>d.data()),ids=new Set(cloud.map(r=>r.id));
   let extra=[];
   if(!localStorage.getItem('h800_migrated')){extra=recs.filter(r=>!ids.has(r.id));for(const r of extra)await db.collection(COL).doc(String(r.id)).set(r);localStorage.setItem('h800_migrated','1')}
   recs=cloud.concat(extra);persist();
  }catch(e){alert('Could not load data: '+e.message)}
 }
 fn();
}

/* ---- Public / owner publishing ---- */
const ALPHA='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode=()=>[...crypto.getRandomValues(new Uint8Array(8))].map(b=>ALPHA[b%32]).join('');
async function ownerCode(sid){const ref=db.collection('h800_shops').doc(sid),d=await ref.get();if(d.exists)return d.data().code;const code=newCode();await ref.set({sid,code});return code}
async function publishShop(sid){
 if(!FB_ON)return;const R=shopRecs(sid);if(!R.length)return;const l=R[R.length-1],S=window.H800_SET||{},loc=R.slice().reverse().find(r=>r.lat!=null)||l;
 const code=await ownerCode(sid);
 await db.collection('h800_public').doc(sid).set({sid,name:l.name,cat:l.cat,addr:l.addr||'',grade:l.grade,pct:l.pct,total:l.total,denom:l.denom,date:l.date,next:l.next,lat:loc.lat??null,lng:loc.lng??null,office:S.office||''});
 await db.collection('h800_owner').doc(sid+'_'+code).set({sid,name:l.name,history:R.map(r=>({date:r.date,pct:r.pct,grade:r.grade,total:r.total,denom:r.denom,next:r.next,remark:r.remark||'',secs:Object.fromEntries(SECS.map(x=>{const v=secPct(r,x);return [x.id,v==null?null:+v.toFixed(1)]}))}))});
}
const pinIcon=g=>L.divIcon({className:'',iconSize:[34,44],iconAnchor:[17,44],popupAnchor:[0,-40],html:`<svg viewBox="0 0 34 44" width="34" height="44" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))"><path d="M17 1C8 1 1 8 1 17c0 12 16 26 16 26s16-14 16-26C33 8 26 1 17 1z" fill="${G[g].col}" stroke="#fff" stroke-width="2"/><text x="17" y="23" text-anchor="middle" font-size="16" font-weight="700" fill="#fff" font-family="Arial">${g}</text></svg>`});


/* ---- QR sticker (title + QR + shop name) ---- */
const STK_T1='Food Safety Inspection',STK_T2='H800 (Food Safety Grading)';
function stickerCanvas(name,url,code){
 const W=600,SH=780,H=code?960:780,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
 x.fillStyle='#fff';x.fillRect(0,0,W,H);
 x.strokeStyle='#0f766e';x.lineWidth=8;x.strokeRect(14,14,W-28,SH-28);
 x.fillStyle='#0f766e';x.fillRect(14,14,W-28,150);
 x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';
 x.font='bold 44px Arial';x.fillText(STK_T1,W/2,72);
 x.font='bold 30px Arial';x.fillText(STK_T2,W/2,124);
 const d=document.createElement('div');new QRCode(d,{text:url,width:400,height:400,correctLevel:QRCode.CorrectLevel.M});
 const q=d.querySelector('canvas');x.imageSmoothingEnabled=false;x.drawImage(q,100,190,400,400);
 x.fillStyle='#0f172a';x.font='bold 36px Arial';
 const words=String(name).split(' '),lines=[];let cur='';
 words.forEach(w=>{const t=cur?cur+' '+w:w;if(x.measureText(t).width>W-80&&cur){lines.push(cur);cur=w}else cur=t});lines.push(cur);
 lines.slice(0,2).forEach((l,i)=>x.fillText(l,W/2,636+i*44));
 x.fillStyle='#475569';x.font='24px Arial';x.fillText('Scan to see the grade',W/2,SH-50);
 if(code){
  x.strokeStyle='#64748b';x.lineWidth=2;x.setLineDash([10,8]);x.beginPath();x.moveTo(14,SH+22);x.lineTo(W-14,SH+22);x.stroke();
  x.setLineDash([]);x.font='20px Arial';const ct='\u2702  cut here – lower part is for the shop owner',cw=x.measureText(ct).width;
  x.fillStyle='#fff';x.fillRect(W/2-cw/2-10,SH+8,cw+20,28);x.fillStyle='#64748b';x.fillText(ct,W/2,SH+23);
  x.fillStyle='#fff';
  x.strokeStyle='#0f766e';x.lineWidth=4;x.strokeRect(40,SH+52,W-80,110);
  x.fillStyle='#0f172a';x.font='bold 24px Arial';x.fillText('Shop owner login code',W/2,SH+82);
  x.font='bold 54px Courier New';if('letterSpacing' in x)x.letterSpacing='8px';x.fillText(code,W/2+4,SH+130);if('letterSpacing' in x)x.letterSpacing='0px';
  x.fillStyle='#475569';x.font='18px Arial';x.fillText('Scan the QR \u2192 “Shop owner” box → enter this code. Keep it private.',W/2,SH+185);
 }
 return c;
}
const fileSafe=s=>String(s).replace(/[^\w\-]+/g,'_').slice(0,40);

/* ---- Nav ---- */
function nav(a){
 const L=[['index.html','🏠','Dashboard','d'],['inspection.html','➕','Inspect','i'],['map.html','🗺️','Map','m'],['qrsheet.html','🔲','QR','q'],['setup.html','⚙️','Setup','s']],S=window.H800_SET||{};
 const so=FB_ON?`<button onclick="auth.signOut().then(()=>location.reload())" class="px-3 py-1.5 rounded-lg bg-white/15 text-sm">Sign out</button>`:'';
 $('nav').innerHTML=`<header class="hdr sticky top-0 z-[1000] shadow"><div class="max-w-[1920px] lg:px-6 mx-auto px-3 py-2.5 flex items-center justify-between gap-2">
 <div class="flex items-center gap-2"><span class="text-2xl">🍽️</span><div class="leading-tight"><b>H800 Food Premises Grading</b><div class="text-[11px] opacity-80">${esc(S.office||'Open Setup to set your area')}</div></div></div>
 <nav class="dnav flex gap-1 text-sm items-center">${L.map(l=>`<a href="${l[0]}" class="px-3 py-1.5 rounded-lg ${a===l[3]?'bg-white/25 font-semibold':'hover:bg-white/10'}">${l[1]} ${l[2]}</a>`).join('')}${so}</nav>
 <div class="md:hidden">${so}</div></div></header>
 <div class="bnav">${L.map(l=>`<a href="${l[0]}" class="${a===l[3]?'on':''}"><span>${l[1]}</span>${l[2]}</a>`).join('')}</div>`;
}
