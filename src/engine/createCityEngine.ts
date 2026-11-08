// @ts-nocheck — процедурна модель міста перенесена з оригінального nasha-mapa.html без змін; типізовано лише публічний API (див. ./index.ts і ../types)
/*
 * 3D-рушій мапи «наша»: процедурне місто (Львів) + позначки + ходіння пішки.
 * Код моделі міста перенесено без змін з оригінального nasha-mapa.html;
 * нижче додано публічний API для React (setMarkers, startWalk, ...).
 */
import '../vendor/three.js';
import '../vendor/OrbitControls.js';
import { OSM_B, OSM_R, OSM_W, OSM_ROUTE } from '../data/osm';

const THREE = globalThis.THREE;

export function buildCityEngine({ stage, labelsEl, needleEl, on = {} }) {
  const MOBILE=Math.min(innerWidth,innerHeight)<700||/iPhone|iPad|Android/i.test(navigator.userAgent);

/* ---------- seeded randomness so the city is the same every visit ---------- */
let seed=20260930;
function rnd(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}
const R=(a,b)=>a+(b-a)*rnd();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ---------- coordinates: 1 unit = 1 m, origin = Ратуша, -z = північ ---------- */
const LAT0=49.8418, LON0=24.0316;
const toLatLon=(x,z)=>[LAT0 - z/111000, LON0 + x/71700];
const X_MIN=-1650, X_MAX=950, Z_MIN=-1050, Z_MAX=2850;

/* ---------- geometry buffers (one merged mesh for the whole city) ---------- */
const P=[],N=[],BID=[],L=[];
const bld=[];              // building records: {ranges, top, x, z}
const trees=[];            // [x,y,z,scale]
const lmLabels=[];         // landmark name labels
const lmByName={};

function newId(top,x,z){bld.push({ranges:[],top,x,z});return bld.length-1}
function mark(id,start){ if(id>=0) bld[id].ranges.push([start,P.length/3-start]); }
function tri(a,b,c,n,id){ P.push(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2]); for(let i=0;i<3;i++){N.push(n[0],n[1],n[2]);BID.push(id)} }
function quad(a,b,c,d,n,id){
  const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
  const cx=uy*vz-uz*vy,cy=uz*vx-ux*vz,cz=ux*vy-uy*vx;
  if(cx*n[0]+cy*n[1]+cz*n[2]>=0){tri(a,b,c,n,id);tri(a,c,d,n,id)}else{tri(a,c,b,n,id);tri(a,d,c,n,id)}
}
function edge(a,b){L.push(a[0],a[1],a[2],b[0],b[1],b[2])}
function addBox(x0,z0,x1,z1,y0,y1,id,edges){
  const start=P.length/3;
  const A=[x0,y0,z0],B=[x1,y0,z0],C=[x1,y0,z1],D=[x0,y0,z1],E=[x0,y1,z0],F=[x1,y1,z0],G=[x1,y1,z1],H=[x0,y1,z1];
  quad(E,H,G,F,[0,1,0],id);
  quad(A,B,F,E,[0,0,-1],id);
  quad(D,C,G,H,[0,0,1],id);
  quad(A,D,H,E,[-1,0,0],id);
  quad(B,C,G,F,[1,0,0],id);
  mark(id,start);
  if(edges){edge(E,F);edge(F,G);edge(G,H);edge(H,E);edge(A,E);edge(B,F);edge(C,G);edge(D,H);edge(A,B);edge(B,C);edge(C,D);edge(D,A)}
}
function addGeom(g,m,id,edgeAngle){
  let gg=g.index?g.toNonIndexed():g.clone();
  gg.applyMatrix4(m);
  if(!gg.attributes.normal) gg.computeVertexNormals();
  const p=gg.attributes.position.array,n=gg.attributes.normal.array,start=P.length/3;
  for(let i=0;i<p.length;i++){P.push(p[i]);N.push(n[i])}
  for(let i=0;i<p.length/3;i++) BID.push(id);
  mark(id,start);
  if(edgeAngle){const e=new THREE.EdgesGeometry(gg,edgeAngle).attributes.position.array;for(let i=0;i<e.length;i++)L.push(e[i])}
}
const mat4=(x,y,z,ry)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,ry||0,0)),new THREE.Vector3(1,1,1));

/* primitive shapes, all standing on y=0 */
const G={
  box:(w,h,d)=>new THREE.BoxGeometry(w,h,d).translate(0,h/2,0),
  cyl:(r,h,s)=>new THREE.CylinderGeometry(r,r,h,s||24).translate(0,h/2,0),
  cone:(r,h,s)=>new THREE.ConeGeometry(r,h,s||24).translate(0,h/2,0),
  pyr:(r,h)=>new THREE.ConeGeometry(r,h,4).rotateY(Math.PI/4).translate(0,h/2,0),
  dome:(r)=>new THREE.SphereGeometry(r,20,10,0,Math.PI*2,0,Math.PI/2),
  gable:(w,len,h,rh)=>{const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h);s.lineTo(0,h+rh);s.lineTo(-w/2,h);s.closePath();return new THREE.ExtrudeGeometry(s,{depth:len,bevelEnabled:false}).translate(0,0,-len/2)},
  slope:(w,len,h1,h2)=>{const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h2);s.lineTo(-w/2,h1);s.closePath();return new THREE.ExtrudeGeometry(s,{depth:len,bevelEnabled:false}).translate(0,0,-len/2)}
};

/* ---------- exclusion zones (landmarks, parks, hill) ---------- */
const zones=[];
const BLV_A=[-387+Math.sin(0.411)*62,-255+Math.cos(0.411)*62], BLV_B=[-160,266];
function segDist(px,pz,a,b){const dx=b[0]-a[0],dz=b[1]-a[1];const t=clamp(((px-a[0])*dx+(pz-a[1])*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(px-a[0]-t*dx,pz-a[1]-t*dz)}
function polyDist(x,z,pts){let d=1e9;for(let i=0;i<pts.length-1;i++)d=Math.min(d,segDist(x,z,pts[i],pts[i+1]));return d}

/* Маршрут: Ринок → площа Митна → вул. Личаківська → ліс → Винники (наближені координати) */
/* Маршрут: Ринок → площа Митна → вул. Личаківська → ліс → Винники (реальна траса з OpenStreetMap) */
const ROUTE=[[75,-15,0],[200,20,0],[330,110,0]].concat(OSM_ROUTE.map(p=>[p[0],p[1],p[2]?1:(p[0]<6250?2:3)]));
ROUTE[3][2]=0;
const SEGS=[];
for(let i=0;i<ROUTE.length-1;i++){const part=ROUTE[i+1][2];SEGS.push({a:ROUTE[i],b:ROUTE[i+1],half:[6,9,7,7][part],part})}
const PART_NAMES=['Від Ринку до площі Митної','Вулиця Личаківська','Через Винниківський ліс','Винники'];
const LYCH=ROUTE.filter(p=>p[2]===1&&p[0]<3900), VYN=[7068,2833];
const OSM_X0=3900;
function inArea(x,z){
  if(x>=X_MIN&&x<=X_MAX&&z>=Z_MIN&&z<=Z_MAX)return true;
  return x<OSM_X0-50&&polyDist(x,z,LYCH)<420;
}
function areaMode(x,z){
  if(x>2700)return'house';
  return'city';
}
function freeRect(x0,z0,x1,z1){
  for(const z of zones){const cx=clamp(z.x,x0,x1),cz=clamp(z.z,z0,z1);if(Math.hypot(cx-z.x,cz-z.z)<z.r)return false}
  const mx=(x0+x1)/2,mz=(z0+z1)/2,hd=Math.hypot(x1-x0,z1-z0)/2;
  if(segDist(mx,mz,BLV_A,BLV_B)-hd*0.75<30)return false;
  for(const s of SEGS)if(segDist(mx,mz,s.a,s.b)-hd*0.75<s.half+3)return false;
  return true;
}

/* ---------- landmarks ---------- */
function landmark(name,x,z,ry,r,top,build,label=true){
  zones.push({x,z,r,kind:'lm'});
  const id=newId(top,x,z); lmByName[name]=id; bld[id].r=r;
  const M=mat4(x,0,z,ry);
  const add=(g,lx,ly,lz,lry,ang)=>addGeom(g,M.clone().multiply(mat4(lx||0,ly||0,lz||0,lry||0)),id,ang===undefined?24:ang);
  build(add);
  if(label) lmLabels.push({name,x,y:top+6,z});
  return id;
}

landmark('Ратуша',0,0,0,42,72,add=>{
  add(G.box(46,18,38));
  add(G.box(13,34,13),0,18,0);
  add(G.cyl(6.5,8,8),0,52,0);
  add(G.dome(6.5),0,60,0,0,40);
  add(G.cyl(.5,6,6),0,66,0);
});
landmark('Латинський собор',-43,67,Math.PI/2,36,50,add=>{
  add(G.gable(24,58,19,11));
  add(G.box(10,38,10),0,0,-31);
  add(G.pyr(7.5,12),0,38,-31);
});
landmark('Домініканський собор',165,-144,0,36,46,add=>{
  add(G.box(34,20,48));
  add(G.cyl(13,8,24),0,20,-2);
  add(G.dome(13),0,28,-2,0,40);
  add(G.cyl(2.5,5,10),0,41,-2);
  add(G.box(8,26,8),-13,0,22); add(G.dome(4),-13,26,22,0,40);
  add(G.box(8,26,8),13,0,22);  add(G.dome(4),13,26,22,0,40);
});
landmark('Успенська церква',244,-67,Math.PI/2,32,60,add=>{
  add(G.gable(15,30,13,7),0,0,6);
  add(G.dome(3.5),0,20,6,0,40);
  add(G.box(10,46,10),0,0,-18);
  add(G.cyl(4.5,6,8),0,46,-18);
  add(G.cone(4.5,8,8),0,52,-18);
});
landmark('Вірменський собор',-93,-189,.2,22,26,add=>{
  add(G.gable(11,26,10,6));
  add(G.box(6,20,6),8,0,-10);
  add(G.pyr(4.5,6),8,20,-10);
});
landmark('Порохова вежа',323,-33,.1,17,16,add=>{
  add(G.box(22,13,15));
  add(G.pyr(9,4),0,13,0);
});
landmark('Оперний театр',-387,-255,.411,72,55,add=>{
  add(G.box(66,24,96),0,0,-4);
  add(G.box(52,30,14),0,0,48);
  add(G.cyl(17,8,28),0,24,-8);
  add(G.dome(17),0,32,-8,0,40);
  add(G.cyl(3,6,10),0,49,-8);
  add(G.dome(6),-20,30,48,0,40);
  add(G.dome(6),20,30,48,0,40);
});
landmark('Університет Франка',-652,133,0,64,32,add=>{
  add(G.box(112,22,34));
  add(G.box(36,27,40),0,0,4);
  add(G.gable(8,36,.01,7),0,27,22,Math.PI/2);
});
landmark('Собор Святого Юра',-1312,389,-.15,96,52,add=>{
  add(G.box(150,7,120));
  add(G.box(34,20,34),0,7,-10);
  add(G.cyl(9,9,16),0,27,-10);
  add(G.dome(10),0,36,-10,0,40);
  add(G.cyl(2,6,8),0,46,-10);
  add(G.box(8,24,8),42,7,-34);
  add(G.dome(4),42,31,-34,0,40);
  add(G.box(90,10,14),-10,7,42);
});
landmark('Високий Замок',552,-721,0,300,97,add=>{
  for(let i=0;i<10;i++){ add(G.cyl(285-i*25,7,56),-i*5,i*7,i*3,0,24); }
  add(G.cone(34,18,40),-45,70,27,0,40);
  add(G.cyl(.5,9,6),-45,88,27);
  for(let i=0;i<9;i++){const r0=285-(i+1)*25,r1=285-i*25;const cnt=Math.round((r1*r1-r0*r0)/260);
    for(let k=0;k<cnt;k++){const a=rnd()*Math.PI*2,rr=R(r0+4,r1-3);trees.push([552-i*5+Math.cos(a)*rr,(i+1)*7,-721+i*3+Math.sin(a)*rr,R(.8,1.25)])}}
});
landmark('Кампус УКУ',-631,2586,-.05,150,24,add=>{
  add(G.slope(64,26,12,22),-20,0,-30);
  add(G.box(96,15,16),30,0,40);
  add(G.gable(12,24,10,9),-70,0,40);
  add(G.box(18,24,18),60,0,-40);
  add(G.box(40,9,22),-78,0,-48);
});

/* Проспект Свободи — central alley between the Opera and Mickiewicz monument */
(function(){
  const dx=BLV_B[0]-BLV_A[0],dz=BLV_B[1]-BLV_A[1],len=Math.hypot(dx,dz),ang=Math.atan2(dx,dz);
  const mx=(BLV_A[0]+BLV_B[0])/2,mz=(BLV_A[1]+BLV_B[1])/2;
  addGeom(G.box(30,.6,len),mat4(mx,0,mz,ang),-1,24);
  const ux=dx/len,uz=dz/len,nx=uz,nz=-ux;
  for(let t=8;t<len-6;t+=11){for(const s of[-11,11,-22,22]){trees.push([BLV_A[0]+ux*t+nx*s,.6,BLV_A[1]+uz*t+nz*s,Math.abs(s)>15?.85:1.05])}}
  const id=newId(34,BLV_B[0],BLV_B[1]);
  addGeom(G.box(5,4,5),mat4(BLV_B[0],0,BLV_B[1],ang),id,24);
  addGeom(G.cyl(1.4,28,10),mat4(BLV_B[0],4,BLV_B[1]),id,24);
  lmLabels.push({name:'Проспект Свободи',x:mx,y:10,z:mz});
})();

/* parks */
function park(name,x,z,r,density){
  zones.push({x,z,r,kind:'park'});
  const cnt=Math.round(r*r/density);
  for(let k=0;k<cnt;k++){const a=rnd()*Math.PI*2,rr=Math.sqrt(rnd())*(r-6);trees.push([x+Math.cos(a)*rr,0,z+Math.sin(a)*rr,R(.8,1.35)])}
  lmLabels.push({name,x,y:14,z});
}
park('Парк Франка',-724,444,140,330);
park('Стрийський парк',-545,1865,280,360);
park('Личаківський цвинтар',1656,1010,230,150);

/* площа Митна */
zones.push({x:470,z:175,r:34,kind:'plaza'});
addGeom(G.cyl(34,.5,40),mat4(470,0,175),-1,30);
lmLabels.push({name:'Площа Митна',x:470,y:8,z:175,d:9000});
lmLabels.push({name:'вул. Личаківська',x:1749,y:14,z:755,d:9000});

lmLabels.push({name:'Винниківський ліс',x:5330,y:34,z:1950,d:9000});
lmLabels.push({name:'Винники',x:7060,y:26,z:2790,d:9000});
lmLabels.push({name:'Винниківське озеро',x:5975,y:6,z:3110,d:6000});

/* single-family house template (гострий дах), reused hundreds of times */
const TPL=(()=>{const g=G.gable(1,1,.6,.4);const gg=g.index?g.toNonIndexed():g;return{p:gg.attributes.position.array,n:gg.attributes.normal.array,e:new THREE.EdgesGeometry(gg,24).attributes.position.array}})();
const _v=new THREE.Vector3(),_nm=new THREE.Matrix3();
function addTpl(m,id){
  const start=P.length/3;_nm.getNormalMatrix(m);
  for(let i=0;i<TPL.p.length;i+=3){_v.set(TPL.p[i],TPL.p[i+1],TPL.p[i+2]).applyMatrix4(m);P.push(_v.x,_v.y,_v.z);_v.set(TPL.n[i],TPL.n[i+1],TPL.n[i+2]).applyMatrix3(_nm).normalize();N.push(_v.x,_v.y,_v.z);BID.push(id)}
  mark(id,start);
  for(let i=0;i<TPL.e.length;i+=3){_v.set(TPL.e[i],TPL.e[i+1],TPL.e[i+2]).applyMatrix4(m);L.push(_v.x,_v.y,_v.z)}
}
const _q=new THREE.Quaternion(),_e=new THREE.Euler(),_s=new THREE.Vector3(),_p=new THREE.Vector3();
function house(cx,cz,front,depth,alongX){
  const bb=alongX?[cx-front/2,cz-depth/2,cx+front/2,cz+depth/2]:[cx-depth/2,cz-front/2,cx+depth/2,cz+front/2];
  if(!freeRect(bb[0],bb[1],bb[2],bb[3]))return false;
  const sy=R(8.5,11.5),id=newId(sy,cx,cz);bld[id].bb=bb;
  _e.set(0,alongX?Math.PI/2:0,0);_q.setFromEuler(_e);
  addTpl(new THREE.Matrix4().compose(_p.set(cx,0,cz),_q,_s.set(depth,sy,front)),id);
  return true;
}
function houseBlock(x0,z0,x1,z1){
  const w=x1-x0,d=z1-z0,alongX=w>=d,rows=Math.min(w,d)>58?2:1;
  for(const[s,e]of splits(alongX?x0:z0,alongX?x1:z1,20,27)){
    for(let r=0;r<rows;r++){
      if(rnd()<.16)continue;
      const mid=(s+e)/2,front=Math.min(e-s-5,R(9,13)),depth=R(10,13);
      let cx,cz;
      if(alongX){cx=mid;cz=r===0?z0+5+depth/2:z1-5-depth/2}else{cz=mid;cx=r===0?x0+5+depth/2:x1-5-depth/2}
      if(front<6)continue;
      if(house(cx,cz,front,depth,alongX)&&rnd()<.5){
        const back=depth/2+8;const tx=alongX?cx+R(-4,4):cx+(r===0?back:-back),tz=alongX?cz+(r===0?back:-back):cz+R(-4,4);
        if(freeRect(tx-2,tz-2,tx+2,tz+2))trees.push([tx,.45,tz,R(.8,1.2)]);
      }
    }
  }
}

/* ---------- street grid ---------- */
function step(v){return R(86,116)+Math.min(Math.abs(v)/1400,1)*55}
function mkLines(a,b,lo,hi){const out=[a,b];let v=b;while(v<hi){v+=step(v);out.push(v)}v=a;while(v>lo){v-=step(v);out.unshift(v)}return out}
const xs=mkLines(-75,75,X_MIN,OSM_X0), zs=mkLines(-70,70,Z_MIN,1900);
const wx=xs.map(v=>Math.abs(v)===75?14:(rnd()<.22?22:12)), wz=zs.map(v=>Math.abs(v)===70?14:(rnd()<.22?22:12));

function splits(a,b,lo,hi){const out=[];let s=a;while(s<b-.5){let e=Math.min(s+R(lo,hi),b);if(b-e<lo*.6)e=b;out.push([s,e]);s=e}return out}
function building(x0,z0,x1,z1,h){
  if(x1-x0<5||z1-z0<5||!freeRect(x0,z0,x1,z1))return;
  const id=newId(h,(x0+x1)/2,(z0+z1)/2);bld[id].bb=[x0,z0,x1,z1];
  addBox(x0,z0,x1,z1,0,h,id,true);
  if(rnd()<.14&&x1-x0>10&&z1-z0>10){const cx=R(x0+3,x1-8),cz=R(z0+3,z1-8);addBox(cx,cz,cx+5,cz+5,h,h+3.2,id,true);bld[id].top=h+3.2}
}
function block(x0,z0,x1,z1,r,mode){
  const w=x1-x0,d=z1-z0; if(w<10||d<10)return;
  if(mode==='house'){houseBlock(x0,z0,x1,z1);return}
  const vc=mode==='vcenter';
  const old=r<430&&!vc, far=r>1300&&!vc;
  const hr=old?[14,23]:vc?[8,15]:far?[9,21]:[13,27];
  const sg=old?[9,16]:vc?[12,22]:[14,30];
  const base=R(hr[0],hr[1]);
  const H=()=>clamp(base+R(-3.5,3.5),hr[0]-2,hr[1]+3);
  const roll=rnd();
  if(!old&&roll<.05){ for(let k=0;k<w*d/500;k++)trees.push([R(x0+4,x1-4),.45,R(z0+4,z1-4),R(.8,1.2)]); return; }
  if(!old&&!vc&&roll<.22&&w>50&&d>50){
    const alongX=w>=d, n=(alongX?d:w)>90?3:2, span=alongX?d:w;
    for(let k=0;k<n;k++){const c=(k+.5)/n*span, t=6.5, hh=R(15,36);
      if(alongX)building(x0+5,z0+c-t,x1-5,z0+c+t,hh); else building(x0+c-t,z0+5,x0+c+t,z1-5,hh);}
    return;
  }
  const dp=R(12,16);
  if(Math.min(w,d)<2*dp+10){
    if(w>=d) for(const[s,e]of splits(x0,x1,sg[0],sg[1])) building(s,z0,e,z1,H());
    else for(const[s,e]of splits(z0,z1,sg[0],sg[1])) building(x0,s,x1,e,H());
    return;
  }
  const gap=()=>rnd()<(old?.02:.08);
  for(const[s,e]of splits(x0,x1,sg[0],sg[1])){ if(!gap())building(s,z0,e,z0+dp,H()); if(!gap())building(s,z1-dp,e,z1,H()); }
  for(const[s,e]of splits(z0+dp,z1-dp,sg[0],sg[1])){ if(!gap())building(x0,s,x0+dp,e,H()); if(!gap())building(x1-dp,s,x1,e,H()); }
  const iw=w-2*dp-12,id=d-2*dp-12;
  if(iw>22&&id>22){
    if(rnd()<.35){const bw=Math.min(iw,R(14,30)),bd=Math.min(id,R(12,24));const cx=R(x0+dp+6,x1-dp-6-bw),cz=R(z0+dp+6,z1-dp-6-bd);building(cx,cz,cx+bw,cz+bd,R(6,10))}
    else if(!old&&rnd()<.5){for(let k=0;k<3;k++)trees.push([R(x0+dp+5,x1-dp-5),0,R(z0+dp+5,z1-dp-5),R(.7,1.1)])}
  }
}

for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){
  const x0=xs[i]+wx[i]/2,x1=xs[i+1]-wx[i+1]/2,z0=zs[j]+wz[j]/2,z1=zs[j+1]-wz[j+1]/2;
  if(xs[i]===-75&&zs[j]===-70){ // Площа Ринок
    addBox(x0,z0,x1,z1,0,.35,-1,true);
    for(const[fx,fz]of[[-52,-48],[52,-48],[-52,48],[52,48]])addGeom(G.cyl(3.2,1.3,16),mat4(fx,.35,fz),-1,30);
    lmLabels.push({name:'Площа Ринок',x:-52,y:6,z:-58});
    continue;
  }
  const cx=(x0+x1)/2,cz=(z0+z1)/2;
  if(!inArea(cx,cz))continue;
  addBox(x0,z0,x1,z1,0,.45,-1,true);
  block(x0+2.5,z0+2.5,x1-2.5,z1-2.5,Math.hypot(cx,cz),areaMode(cx,cz));
  const r=Math.hypot(cx,cz);
  if(r>300){ // street trees on the wide avenues
    const put=(x,z)=>{if(freeRect(x-2,z-2,x+2,z+2))trees.push([x,0,z,R(.75,1.05)])};
    if(wx[i]>=20)for(let z=z0+7;z<z1-5;z+=13)put(x0-4,z);
    if(wx[i+1]>=20)for(let z=z0+7;z<z1-5;z+=13)put(x1+4,z);
    if(wz[j]>=20)for(let x=x0+7;x<x1-5;x+=13)put(x,z0-4);
    if(wz[j+1]>=20)for(let x=x0+7;x<x1-5;x+=13)put(x,z1+4);
  }
}

/* dashed centre lines */
const D=[];
for(const x of xs)for(let z=Z_MIN;z<1900;z+=10){ if(Math.abs(x)<76&&z>-72&&z<72)continue; if(inArea(x,z)&&freeRect(x-1,z,x+1,z+4))D.push(x,.08,z,x,.08,z+4); }
for(const z of zs)for(let x=X_MIN;x<OSM_X0;x+=10){ if(Math.abs(z)<71&&x>-77&&x<77)continue; if(inArea(x,z)&&freeRect(x,z-1,x+4,z+1))D.push(x,.08,z,x+4,.08,z); }

/* the route itself: road surface, kerbs and an ink centre line */
const RoadP=[],RoadN=[],Curb=[],RouteD=[];
function pushGeo(g,m){const gg=(g.index?g.toNonIndexed():g).clone();gg.applyMatrix4(m);const p=gg.attributes.position.array,n=gg.attributes.normal.array;for(let i=0;i<p.length;i++){RoadP.push(p[i]);RoadN.push(n[i])}}
const ROUTE_LEN=[0];
SEGS.forEach((sg,i)=>{
  const dx=sg.b[0]-sg.a[0],dz=sg.b[1]-sg.a[1],len=Math.hypot(dx,dz),ang=Math.atan2(dx,dz),ux=dx/len,uz=dz/len,nx=uz,nz=-ux;
  ROUTE_LEN.push(ROUTE_LEN[i]+len);
  pushGeo(new THREE.BoxGeometry(sg.half*2,.2,len).translate(0,.52,0),mat4((sg.a[0]+sg.b[0])/2,0,(sg.a[1]+sg.b[1])/2,ang));
  pushGeo(new THREE.CylinderGeometry(sg.half,sg.half,.2,20).translate(0,.52,0),mat4(sg.a[0],0,sg.a[1]));
  for(const sd of[-1,1])Curb.push(sg.a[0]+nx*sg.half*sd,.64,sg.a[1]+nz*sg.half*sd,sg.b[0]+nx*sg.half*sd,.64,sg.b[1]+nz*sg.half*sd);
  for(let t=0;t<len-4;t+=12)RouteD.push(sg.a[0]+ux*t,.7,sg.a[1]+uz*t,sg.a[0]+ux*(t+6),.7,sg.a[1]+uz*(t+6));
});
function routeAt(s){s=clamp(s,0,ROUTE_LEN[ROUTE_LEN.length-1]-.01);let i=0;while(ROUTE_LEN[i+1]<s)i++;const sg=SEGS[i],k=(s-ROUTE_LEN[i])/(ROUTE_LEN[i+1]-ROUTE_LEN[i]);return{x:sg.a[0]+(sg.b[0]-sg.a[0])*k,z:sg.a[1]+(sg.b[1]-sg.a[1])*k,part:sg.part}}

/* ---------- Винники й околиці: реальні контури з OpenStreetMap ---------- */
function oBox(cx,cz,w,d,a,h,id){
  const c=Math.cos(a),sn=Math.sin(a),ux=c*w/2,uz=sn*w/2,vx=-sn*d/2,vz=c*d/2;
  const q=[[cx-ux-vx,cz-uz-vz],[cx+ux-vx,cz+uz-vz],[cx+ux+vx,cz+uz+vz],[cx-ux+vx,cz-uz+vz]];
  const start=P.length/3;
  const T=q.map(p=>[p[0],h,p[1]]),Bt=q.map(p=>[p[0],0,p[1]]);
  quad(T[0],T[1],T[2],T[3],[0,1,0],id);
  for(let i=0;i<4;i++){const j=(i+1)%4,ex=q[j][0]-q[i][0],ez=q[j][1]-q[i][1],l=Math.hypot(ex,ez)||1,n=[ez/l,0,-ex/l];
    const mx=(q[i][0]+q[j][0])/2-cx,mz=(q[i][1]+q[j][1])/2-cz;if(n[0]*mx+n[2]*mz<0){n[0]=-n[0];n[2]=-n[2]}
    quad(Bt[i],Bt[j],T[j],T[i],n,id);edge(T[i],T[j]);edge(Bt[i],T[i]);}
  mark(id,start);
  return q;
}
const OSM_BLD=[];
for(const r of OSM_B.split(';')){
  const v=r.split(',').map(Number);const[cx,cz,w,d,deg,h0]=v,church=v[6]===1;
  const a=deg*Math.PI/180,h=Math.max(3,h0),id=newId(h,cx,cz);
  const c=Math.cos(a),sn=Math.sin(a),ex=(Math.abs(c)*w+Math.abs(sn)*d)/2,ez=(Math.abs(sn)*w+Math.abs(c)*d)/2;
  bld[id].bb=[cx-ex,cz-ez,cx+ex,cz+ez];OSM_BLD.push([cx,cz,Math.max(w,d)]);
  if(church){
    oBox(cx,cz,w,d,a,Math.max(h,11),id);
    const tw=Math.min(w,d)*.45,top=Math.max(h,11);
    addGeom(G.box(tw,top*.9,tw),mat4(cx,top,cz,-a),id,24);
    addGeom(G.pyr(tw*.72,tw*1.3),mat4(cx,top*1.9,cz,-a),id,24);
    bld[id].top=top*1.9+tw*1.3;
  }else if(h<=10&&w*d<260&&Math.min(w,d)>4){
    const sy=h+2.2,long=Math.max(w,d),short=Math.min(w,d);
    const th=w>=d?Math.PI/2-a:-a;
    _e.set(0,th,0);_q.setFromEuler(_e);
    addTpl(new THREE.Matrix4().compose(_p.set(cx,0,cz),_q,_s.set(short,sy,long)),id);
    bld[id].top=sy;
  }else oBox(cx,cz,w,d,a,h,id);
}
/* streets */
const OSM_ROADPTS=[];
for(const r of OSM_R.split(';')){
  const v=r.split(',').map(Number),hw=Math.max(v[0]/2,3.2);
  for(let i=1;i+3<v.length;i+=2){
    const ax=v[i],az=v[i+1],bx=v[i+2],bz=v[i+3],len=Math.hypot(bx-ax,bz-az);if(len<.5)continue;
    const ang=Math.atan2(bx-ax,bz-az);
    pushGeo(new THREE.BoxGeometry(hw*2,.16,len+hw*.6).translate(0,.3,0),mat4((ax+bx)/2,0,(az+bz)/2,ang));
    const ux=(bx-ax)/len,uz=(bz-az)/len,nx=uz,nz=-ux;
    for(const sd of[-1,1])Curb.push(ax+nx*hw*sd,.42,az+nz*hw*sd,bx+nx*hw*sd,.42,bz+nz*hw*sd);
    for(let t=0;t<len;t+=8)OSM_ROADPTS.push(ax+ux*t,az+uz*t);
  }
}
/* forest: fill open ground along the route and around the town, away from houses and streets */
(function(){
  const cell=40,hash=new Map(),k=(x,z)=>Math.floor(x/cell)+'_'+Math.floor(z/cell);
  const put=(x,z,v)=>{const kk=k(x,z);if(!hash.has(kk))hash.set(kk,[]);hash.get(kk).push(v)};
  for(const b of OSM_BLD)put(b[0],b[1],[b[0],b[1],b[2]/2+24]);
  for(let i=0;i<OSM_ROADPTS.length;i+=2)put(OSM_ROADPTS[i],OSM_ROADPTS[i+1],[OSM_ROADPTS[i],OSM_ROADPTS[i+1],10]);
  const blocked=(x,z)=>{const cx=Math.floor(x/cell),cz=Math.floor(z/cell);for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const a=hash.get((cx+i)+'_'+(cz+j));if(a)for(const o of a)if(Math.hypot(o[0]-x,o[1]-z)<o[2])return true}return false};
  const polys=OSM_W.map(s=>{const v=s.split(',').map(Number),o=[];for(let i=0;i<v.length;i+=2)o.push([v[i],v[i+1]]);return o});
  const inWater=(x,z)=>polys.some(p=>{let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){if((p[i][1]>z)!==(p[j][1]>z)&&x<(p[j][0]-p[i][0])*(z-p[i][1])/(p[j][1]-p[i][1])+p[i][0])c=!c}return c});
  const RP=ROUTE.filter(p=>p[0]>4100);
  for(let x=4300;x<7800;x+=17)for(let z=900;z<3700;z+=17){
    const jx=x+R(-6,6),jz=z+R(-6,6);
    const dr=polyDist(jx,jz,RP);
    if(dr<14||dr>(jx<6250?620:420))continue;
    if(blocked(jx,jz)||inWater(jx,jz))continue;
    trees.push([jx,0,jz,R(1.05,1.6)]);
  }
})();

/* ---------- three.js scene ---------- */
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:!MOBILE||devicePixelRatio<2,powerPreference:MOBILE?'default':'high-performance'})}
catch(e){throw new Error('WEBGL_UNAVAILABLE')}
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,Math.min(innerWidth,innerHeight)<700?1.5:2));
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.25;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

const BG=0xebe9e5;
const scene=new THREE.Scene();
scene.background=new THREE.Color(BG);
scene.fog=new THREE.Fog(BG,4500,15000);

const camera=new THREE.PerspectiveCamera(30,1,5,90000);
const controls=new THREE.OrbitControls(camera,renderer.domElement);
controls.enableDamping=true; controls.dampingFactor=.08;
controls.screenSpacePanning=false;
controls.maxPolarAngle=Math.PI/2-.015; controls.minDistance=20; controls.maxDistance=30000;
controls.target.set(60,0,-40);
camera.position.set(60+430,520,-40+600);

scene.add(new THREE.HemisphereLight(0xffffff,0xb7b1a7,.95));
const sun=new THREE.DirectionalLight(0xffffff,1.65);
const SUN_DIR=new THREE.Vector3(-.62,1.05,.38).normalize();
sun.castShadow=true;
sun.shadow.mapSize.set(MOBILE?1024:4096,MOBILE?1024:4096);
sun.shadow.bias=-.0004; sun.shadow.normalBias=.6;
sun.shadow.camera.near=10; sun.shadow.camera.far=4200;
scene.add(sun,sun.target);

/* ground */
const ground=new THREE.Mesh(new THREE.PlaneGeometry(120000,120000),new THREE.MeshStandardMaterial({color:0xdfdcd6,roughness:1}));
ground.rotation.x=-Math.PI/2; ground.position.set(2800,0,1300); ground.receiveShadow=true;
scene.add(ground);

/* city mesh with warm "lit ground floor" glow driven by a per-vertex attribute */
const cityGeo=new THREE.BufferGeometry();
cityGeo.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
cityGeo.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));
const glowArr=new Float32Array(P.length/3);
const glowAttr=new THREE.BufferAttribute(glowArr,1); glowAttr.setUsage(THREE.DynamicDrawUsage);
cityGeo.setAttribute('glow',glowAttr);
const bidArr=Int32Array.from(BID);
const cityMat=new THREE.MeshStandardMaterial({color:0xf3f2ef,roughness:.93,metalness:0});
cityMat.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float glow;\nvarying float vGlow;\nvarying float vWy;\nvarying float vNy;')
    .replace('#include <begin_vertex>','#include <begin_vertex>\nvGlow=glow;vWy=position.y;vNy=normal.y;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying float vGlow;\nvarying float vWy;\nvarying float vNy;')
    .replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=(1.0-0.32*vGlow);')
    .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nfloat gf=vGlow*(smoothstep(7.5,1.0,vWy)*(1.0-abs(vNy))*2.4+0.06);\ntotalEmissiveRadiance+=vec3(1.0,0.64,0.24)*gf;');
};
const city=new THREE.Mesh(cityGeo,cityMat);
city.castShadow=true; city.receiveShadow=true;
scene.add(city);

const lineGeo=new THREE.BufferGeometry(); lineGeo.setAttribute('position',new THREE.Float32BufferAttribute(L,3));
scene.add(new THREE.LineSegments(lineGeo,new THREE.LineBasicMaterial({color:0x2d2b28,transparent:true,opacity:.3})));
const dashGeo=new THREE.BufferGeometry(); dashGeo.setAttribute('position',new THREE.Float32BufferAttribute(D,3));
scene.add(new THREE.LineSegments(dashGeo,new THREE.LineBasicMaterial({color:0x6d6962,transparent:true,opacity:.35})));
(function(){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(RoadP,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(RoadN,3));
  const road=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0xdcd9d3,roughness:1}));road.receiveShadow=true;scene.add(road);
  const cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.Float32BufferAttribute(Curb,3));
  scene.add(new THREE.LineSegments(cg,new THREE.LineBasicMaterial({color:0x2d2b28,transparent:true,opacity:.35})));
  const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.Float32BufferAttribute(RouteD,3));
  scene.add(new THREE.LineSegments(rg,new THREE.LineBasicMaterial({color:0x2d2b28,transparent:true,opacity:.8})));
  const wm=new THREE.MeshStandardMaterial({color:0xc9cfd1,roughness:.35,metalness:.05});
  for(const str of OSM_W){const v=str.split(',').map(Number);const sh=new THREE.Shape();sh.moveTo(v[0],-v[1]);for(let i=2;i<v.length;i+=2)sh.lineTo(v[i],-v[i+1]);
    const g=new THREE.ShapeGeometry(sh);g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,wm);m.position.y=.35;m.receiveShadow=true;scene.add(m);
    const lp=[];for(let i=0;i<v.length;i+=2)lp.push(new THREE.Vector3(v[i],.4,v[i+1]));
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(lp),new THREE.LineBasicMaterial({color:0x2d2b28,transparent:true,opacity:.35})));}
})();

/* trees: clustered low-poly crowns */
(function(){
  const crownG=new THREE.IcosahedronGeometry(1,1), trunkG=new THREE.CylinderGeometry(.18,.25,1,5).translate(0,.5,0);
  const cm=new THREE.MeshStandardMaterial({color:0xd6d5d1,roughness:1,flatShading:true});
  const tm=new THREE.MeshStandardMaterial({color:0x8b877f,roughness:1});
  const n=trees.length;
  const crowns=new THREE.InstancedMesh(crownG,cm,n*2), trunks=new THREE.InstancedMesh(trunkG,tm,n);
  const m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler();
  trees.forEach((t,k)=>{const s=t[3];
    m.compose(new THREE.Vector3(t[0],t[1],t[2]),q.identity(),new THREE.Vector3(s*1.2,s*6,s*1.2)); trunks.setMatrixAt(k,m);
    e.set(0,rnd()*6,0); q.setFromEuler(e);
    m.compose(new THREE.Vector3(t[0],t[1]+s*8,t[2]),q,new THREE.Vector3(s*4.6,s*4.2,s*4.6)); crowns.setMatrixAt(k*2,m);
    m.compose(new THREE.Vector3(t[0]+s*1.8,t[1]+s*6.2,t[2]-s*1.2),q,new THREE.Vector3(s*3.2,s*3,s*3.2)); crowns.setMatrixAt(k*2+1,m);
  });
  crowns.castShadow=trunks.castShadow=true; crowns.receiveShadow=true;
  scene.add(crowns,trunks);
})();

/* warm lights (pooled) and ground light pools */
const LIGHTS=6, pool=[];
for(let i=0;i<LIGHTS;i++){const pl=new THREE.PointLight(0xffb657,0,120,1.6);scene.add(pl);pool.push(pl)}
const poolTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,190,90,0.85)');gr.addColorStop(.35,'rgba(255,184,80,0.45)');gr.addColorStop(1,'rgba(255,184,80,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t})();
const poolMat=new THREE.MeshBasicMaterial({map:poolTex,transparent:true,depthWrite:false,toneMapped:false});
const poolGeo=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);



  /* ====================================================================
     Місця (маркери), ходіння та публічний API рушія
     ==================================================================== */
  const emit=(name,...a)=>{ if(on[name]) on[name](...a) };
  const recs=new Map();                 // id -> {data, el, pad}
  let selected=null, placing=false, showNames=true, canEdit=false;
  let tour=null, fly=null, walk=null, raf=0, destroyed=false;
  const pv=new THREE.Vector3();
  const EYE=1.7;

  function resolveBid(x,z){
    for(const n in lmByName){const id=lmByName[n],b=bld[id];if(Math.hypot(b.x-x,b.z-z)<b.r*.8)return id}
    let best=-1,bd=8;
    for(let i=0;i<bld.length;i++){const bb=bld[i].bb;if(!bb)continue;const d=Math.hypot(Math.max(bb[0]-x,0,x-bb[2]),Math.max(bb[1]-z,0,z-bb[3]));if(d<bd){bd=d;best=i}}
    return best;
  }
  /* bid у збережених даних — лише прапорець (1 = прив'язано до будівлі), індекс будівлі знаходимо за координатами */
  function attach(m,prev){
    const o=Object.assign({},m);
    if(o.bid>=0){
      if(prev&&prev.x===o.x&&prev.z===o.z&&prev.bid>=0){o.bid=prev.bid;o.top=prev.top}
      else{const b=resolveBid(o.x,o.z);o.bid=b;if(b>=0)o.top=bld[b].top}
    }
    return o;
  }
  function esc(s){return String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
  function pinHtml(m){
    return `<div class="card">${m.date?`<div class="date">${esc(m.date)}${m.example?'<span class="tag">приклад</span>':''}</div>`:(m.example?'<span class="tag">приклад</span>':'')}<div class="title">${esc(m.title)||'<span class="font-medium text-muted">Без підпису</span>'}</div>${m.text?`<div class="text">${esc(m.text)}</div>`:''}</div><div class="stem"></div><div class="dot"></div>`;
  }
  function createPin(r){
    const el=document.createElement('div');el.className='pin';
    el.addEventListener('pointerdown',e=>e.stopPropagation());
    el.addEventListener('click',e=>{e.stopPropagation();emit('pinClick',r.data.id)});
    labelsEl.appendChild(el);
    const pad=new THREE.Mesh(poolGeo,poolMat);pad.renderOrder=2;scene.add(pad);
    r.el=el;r.pad=pad;
  }
  function renderPin(r){
    const m=r.data;
    r.el.innerHTML=pinHtml(m);
    r.el.classList.toggle('active',selected===m.id);
    r.el.classList.toggle('ro',!canEdit&&!m.text);
    r.pad.position.set(m.lx,.7,m.lz);
    r.pad.scale.setScalar(m.bid>=0?78:58);
  }
  function removePin(r){r.el.remove();scene.remove(r.pad)}
  function refreshGlow(){
    glowArr.fill(0);
    for(const r of recs.values()){const m=r.data;if(m.bid>=0&&bld[m.bid])for(const[s,c]of bld[m.bid].ranges)glowArr.fill(1,s,s+c)}
    glowAttr.needsUpdate=true;
  }
  function setMarkers(list){
    const seen=new Set();
    for(const raw of list){
      seen.add(raw.id);
      let r=recs.get(raw.id);
      if(!r){r={data:attach(raw),el:null,pad:null};recs.set(raw.id,r);createPin(r)}
      else r.data=attach(raw,r.data);
      renderPin(r);
    }
    for(const[id,r]of[...recs])if(!seen.has(id)){removePin(r);recs.delete(id)}
    refreshGlow();
  }
  function setSelected(id){selected=id;for(const r of recs.values())r.el.classList.toggle('active',r.data.id===id)}
  function setCanEdit(v){canEdit=!!v;for(const r of recs.values())r.el.classList.toggle('ro',!canEdit&&!r.data.text)}
  function setPlacing(v){placing=!!v;stage.classList.toggle('placing',placing)}
  function setShowNames(v){showNames=!!v}

  /* ---------- камера ---------- */
  function flyTo(x,z){
    const off=camera.position.clone().sub(controls.target);
    const dist=clamp(off.length(),260,700); off.setLength(dist);
    fly={t0:performance.now(),ft:controls.target.clone(),fp:camera.position.clone(),tt:new THREE.Vector3(x,0,z)};
    fly.tp=fly.tt.clone().add(off);
  }

  /* ---------- екскурсія маршрутом ---------- */
  const TOUR_SPEED=900; // м/с (було 230)
  function startTour(){
    if(walk)stopWalk();
    fly=null;setPlacing(false);
    tour={t0:performance.now(),part:-1};
  }
  function stopTour(){if(!tour)return;tour=null;emit('tour',null)}

  /* ---------- ходіння: рух камери з поточного виду ----------
     Той самий вид, що й у скролу: камера разом із точкою погляду їде вперед/назад/вбік і вгору/вниз.
     Обертання мишею та масштаб колесом працюють як завжди. Керування: клавіші або екранні кнопки. */
  const keys=new Set();
  const mv={f:0,s:0,v:0};
  function startWalk(){if(walk)return;stopTour();fly=null;walk=true;emit('walk',true)}
  function stopWalk(){if(!walk)return;walk=false;keys.clear();mv.f=mv.s=mv.v=0;emit('walk',false)}
  function setJoystick(f,s,v){mv.f=f;mv.s=s;mv.v=v||0}
  function getFeet(){return{x:controls.target.x,z:controls.target.z}}

  /* нова позначка там, де зараз стоїть людина */
  function makeMarkerAt(x,z){
    const bid=resolveBid(x,z);
    return{id:newMarkId(),x,z,top:bid>=0?bld[bid].top:1,bid,lx:x,lz:z,ly:bid>=0?3.5:6,date:'',title:'',text:'',example:false};
  }
  const newMarkId=()=>'m'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);

  /* ---------- події миші/дотику/клавіатури ---------- */
  const el=renderer.domElement;
  let downX=0,downY=0,downT=0;
  el.addEventListener('pointerdown',e=>{
    downX=e.clientX;downY=e.clientY;downT=performance.now();
    if(tour)stopTour();
  });
  el.addEventListener('wheel',()=>{if(tour)stopTour()},{passive:true});

  const ray=new THREE.Raycaster(), ndc=new THREE.Vector2();
  el.addEventListener('pointerup',e=>{
    if(Math.hypot(e.clientX-downX,e.clientY-downY)>6||performance.now()-downT>600)return;
    if(!placing){emit('background');return}
    const r=el.getBoundingClientRect();
    ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
    ray.setFromCamera(ndc,camera);
    const hit=ray.intersectObjects([city,ground],false)[0];
    if(!hit)return;
    let bid=-1,top=1,lx=hit.point.x,lz=hit.point.z;
    if(hit.object===city){
      bid=bidArr[hit.faceIndex*3];
      if(bid>=0){top=bld[bid].top;const n=hit.face.normal;if(Math.abs(n.y)<.5){lx+=n.x*6;lz+=n.z*6}}
      else top=1;
    }
    const m={id:newMarkId(),x:hit.point.x,z:hit.point.z,top,bid,lx,lz,ly:bid>=0?3.5:6,date:'',title:'',text:'',example:false};
    setPlacing(false);
    emit('place',m);
  });

  const typing=e=>e.target&&e.target.closest&&e.target.closest('input,textarea,select,[contenteditable="true"]');
  const WALK_KEYS=['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Space','KeyC'];
  const onKey=(e,down)=>{
    if(!walk||typing(e)||e.ctrlKey||e.metaKey||e.altKey)return;
    if(WALK_KEYS.includes(e.code)){if(down)keys.add(e.code);else keys.delete(e.code);e.preventDefault()}
  };
  const kd=e=>onKey(e,true), ku=e=>onKey(e,false), onBlur=()=>keys.clear();
  addEventListener('keydown',kd);addEventListener('keyup',ku);addEventListener('blur',onBlur);

  /* ---------- підписи визначних місць ---------- */
  const lmEls=lmLabels.map(l=>{const d=document.createElement('div');d.className='lm';d.textContent=l.name;labelsEl.appendChild(d);return d});

  /* ---------- цикл кадрів ---------- */
  let W=1,H=1;
  function resize(){
    W=stage.clientWidth||innerWidth;H=stage.clientHeight||innerHeight;
    renderer.setSize(W,H);camera.aspect=W/H;
    camera.fov=camera.aspect<1?46:30;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize',resize);resize();

  let lastShadow=0, lastT=performance.now();
  function project(x,y,z){pv.set(x,y,z).project(camera);if(pv.z>1||pv.x<-1.25||pv.x>1.25||pv.y<-1.25||pv.y>1.4)return null;return[(pv.x+1)/2*W,(1-pv.y)/2*H,pv.z]}
  function setHidden(node,h){if(node.hidden!==h)node.hidden=h}

  function frame(now){
    if(destroyed)return;
    const dt=clamp((now-lastT)/1000,0,.1);lastT=now;

    if(fly){const k=clamp((now-fly.t0)/900,0,1),e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
      controls.target.lerpVectors(fly.ft,fly.tt,e);camera.position.lerpVectors(fly.fp,fly.tp,e);if(k>=1)fly=null}
    if(tour){
      const total=ROUTE_LEN[ROUTE_LEN.length-1],s=(now-tour.t0)/1000*TOUR_SPEED;
      if(s>total+250)stopTour();
      else{
        const a=routeAt(s),b=routeAt(s+160);let dx=b.x-a.x,dz=b.z-a.z;const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
        const tgt=new THREE.Vector3(a.x,0,a.z),des=new THREE.Vector3(a.x-dx*420+dz*150,320,a.z-dz*330-dx*150);
        controls.target.lerp(tgt,.2);camera.position.lerp(des,.12);
        if(tour.part!==a.part){tour.part=a.part;emit('tour',{part:a.part,parts:PART_NAMES.length,name:PART_NAMES[a.part],km:total/1000})}
      }
    }
    if(walk){
      const sh=keys.has('ShiftLeft')||keys.has('ShiftRight');
      const f=clamp((keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+mv.f,-1,1);
      const sd=clamp((keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+mv.s,-1,1);
      const up=clamp((keys.has('Space')?1:0)-(keys.has('KeyC')?1:0)+mv.v,-1,1);
      if(f||sd||up){
        const dist=camera.position.distanceTo(controls.target);
        const sp=clamp(dist*.7,25,4000)*(sh?3:1)*dt;
        let fx=controls.target.x-camera.position.x,fz=controls.target.z-camera.position.z;const fl=Math.hypot(fx,fz)||1;fx/=fl;fz/=fl;
        const dx=(fx*f-fz*sd)*sp,dz=(fz*f+fx*sd)*sp;
        const dy=clamp(controls.target.y+up*sp*.8,0,6000)-controls.target.y;
        camera.position.x+=dx;camera.position.z+=dz;camera.position.y+=dy;
        controls.target.x+=dx;controls.target.z+=dz;controls.target.y+=dy;
      }
    }
    controls.update();

    const dist=camera.position.distanceTo(controls.target);
    const fogK=Math.max(1,dist/6000);scene.fog.near=4500*fogK;scene.fog.far=15000*fogK;
    const sd=clamp(dist*.95,260,1900);
    if(Math.abs(sd-lastShadow)/sd>.04){const c=sun.shadow.camera;c.left=-sd;c.right=sd;c.top=sd;c.bottom=-sd;c.updateProjectionMatrix();lastShadow=sd}
    sun.position.copy(controls.target).addScaledVector(SUN_DIR,1800);sun.target.position.copy(controls.target);sun.target.updateMatrixWorld();

    // тепле світло — до найближчих до центру кадру позначок
    const t=controls.target;
    const near=[...recs.values()].map(r=>r.data).sort((a,b)=>Math.hypot(a.lx-t.x,a.lz-t.z)-Math.hypot(b.lx-t.x,b.lz-t.z));
    pool.forEach((pl,i)=>{const m=near[i];if(m){pl.position.set(m.lx,m.ly||4,m.lz);pl.intensity=2.6}else pl.intensity=0});

    for(const r of recs.values()){
      const m=r.data,p=project(m.x,m.top+1.5,m.z);
      if(!p){setHidden(r.el,true);continue}
      setHidden(r.el,false);
      const dc=camera.position.distanceTo(pv.set(m.x,m.top+1.5,m.z));
      const sc=m.id===selected?1:clamp(1400/dc,.3,1);
      r.el.style.transform=`translate(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px) translate(-50%,-100%) scale(${sc.toFixed(3)})`;
      r.el.style.zIndex=(m.id===selected?200000:0)+Math.round((1-p[2])*100000);
    }
    poi.forEach(o=>{
      if(!showNames){setHidden(o.el,true);return}
      const d=camera.position.distanceTo(pv.set(o.x,12,o.z));
      const p=d<o.d?project(o.x,12,o.z):null;
      if(!p){setHidden(o.el,true);return}
      setHidden(o.el,false);o.el.style.transform=`translate(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px) translate(-50%,-50%)`;
    });
    lmLabels.forEach((l,i)=>{const node=lmEls[i];
      if(!showNames){setHidden(node,true);return}
      const d=camera.position.distanceTo(pv.set(l.x,l.y,l.z));
      const p=d<(l.d||2300)?project(l.x,l.y,l.z):null;
      if(!p){setHidden(node,true);return}
      setHidden(node,false);node.style.transform=`translate(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px) translate(-50%,-50%)`;
    });
    if(needleEl){pv.copy(camera.position).sub(controls.target);needleEl.style.transform=`rotate(${(Math.atan2(pv.x,pv.z)*180/Math.PI).toFixed(1)}deg)`}

    renderer.render(scene,camera);
    raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);

  function destroy(){
    destroyed=true;cancelAnimationFrame(raf);
    removeEventListener('resize',resize);removeEventListener('keydown',kd);removeEventListener('keyup',ku);removeEventListener('blur',onBlur);
    labelsEl.replaceChildren();
    controls.dispose();
    renderer.dispose();
    try{renderer.forceContextLoss()}catch(_){}
    renderer.domElement.remove();
  }

  /* публічні місця (Політехніка, McDonald's…) — це назви на мапі, а не особисті мітки */
  const poi=[];
  function setPlaces(list){
    poi.forEach(o=>o.el.remove()); poi.length=0;
    for(const p of list){
      const el=document.createElement('div');
      el.className='lm poi '+(p.kind||'');
      el.textContent=p.label||p.name; el.title=p.name; labelsEl.appendChild(el);
      poi.push({x:p.x,z:p.z,d:p.d||4000,el});
    }
  }

  return{
    setPlaces,setMarkers,setSelected,setCanEdit,setPlacing,setShowNames,flyTo,
    startTour,stopTour,startWalk,stopWalk,setJoystick,getFeet,makeMarkerAt,
    toLatLon,destroy,
    isWalking:()=>!!walk,
  };
}
