/* ATELIER / PRISM — independent geometric-optics core.
   SI-adjacent dimensions: geometric units arbitrary; wavelength in nm.
   Planar Snell tracing, exact unpolarized Fresnel, Sellmeier glass dispersion. */
export const MATERIALS = {
  bk7: {name:'N-BK7 crown', type:'sellmeier', B:[1.03961212,0.231792344,1.01046945], C:[0.00600069867,0.0200179144,103.560653]},
  sf11: {name:'N-SF11 flint', type:'sellmeier', B:[1.73759695,0.313747346,1.89878101], C:[0.013188707,0.0623068142,155.23629]},
  silica: {name:'Fused silica', type:'sellmeier', B:[0.6961663,0.4079426,0.8974794], C:[0.00467914826,0.0135120631,97.9340025]}
};
export const LOCAL_PRISM = [ [-2.08,-1.38], [2.08,-1.38], [0,2.2] ];
export const RAD = Math.PI/180;
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]];
const mul=(a,s)=>[a[0]*s,a[1]*s];
const unit=a=>{const l=Math.hypot(a[0],a[1]); return l>1e-9?[a[0]/l,a[1]/l]:[1,0];};
export function indexOfRefraction(wavelengthNm, material='bk7'){
  const g=MATERIALS[material]||MATERIALS.bk7;
  const l=wavelengthNm/1000, l2=l*l;
  const n2=1+g.B.reduce((s,B,i)=>s+B*l2/(l2-g.C[i]),0);
  return Math.sqrt(n2);
}
export function prismPolygon(rotationDeg=0){
 const a=rotationDeg*RAD,c=Math.cos(a),s=Math.sin(a);
 return LOCAL_PRISM.map(p=>[p[0]*c-p[1]*s,p[0]*s+p[1]*c]);
}
function intersectRaySegment(origin,direction,a,b){
 const v=sub(b,a), den=cross(direction,v);
 if(Math.abs(den)<1e-10)return null;
 const ap=sub(a,origin),t=cross(ap,v)/den,u=cross(ap,direction)/den;
 return t>1e-5&&u>=-1e-8&&u<=1+1e-8?{t,p:add(origin,mul(direction,t))}:null;
}
export function boundaryHit(origin,direction,polygon){
 let found=null;
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length];
  const hit=intersectRaySegment(origin,direction,a,b);
  if(!hit||found&&hit.t>=found.t)continue;
  const edge=sub(b,a);
  found={...hit,edge:i,outward:unit([edge[1],-edge[0]])}; // CCW polygon
 }
 return found;
}
export function snell(direction,normalAgainstRay,n1,n2){
 const d=unit(direction),n=unit(normalAgainstRay);
 const ci=Math.max(0,Math.min(1,-dot(d,n)));
 const eta=n1/n2, sin2=eta*eta*(1-ci*ci);
 if(sin2>=1-1e-12)return {tir:true,dir:unit(add(d,mul(n,2*ci))),reflectance:1,cosIncident:ci};
 const ct=Math.sqrt(Math.max(0,1-sin2));
 const out=unit(add(mul(d,eta),mul(n,eta*ci-ct)));
 const rs=((n1*ci-n2*ct)/(n1*ci+n2*ct))**2;
 const rp=((n1*ct-n2*ci)/(n1*ct+n2*ci))**2;
 return {tir:false,dir:out,reflectance:(rs+rp)*.5,cosIncident:ci,cosTransmitted:ct};
}
export function tracePrism(wavelengthNm,opts={}){
 const material=opts.material||'bk7';
 const rotationDeg=opts.rotation||0, incidentDeg=opts.incidence||0;
 const polygon=prismPolygon(rotationDeg), n=indexOfRefraction(wavelengthNm,material);
 const aim=add(mul(polygon[0],.48),mul(polygon[2],.52));
 const source=[-8.6,aim[1]+(-8.6-aim[0])*Math.tan(incidentDeg*RAD)];
 const dir=[Math.cos(incidentDeg*RAD),Math.sin(incidentDeg*RAD)];
 const entry=boundaryHit(source,dir,polygon);
 if(!entry)return {miss:true,source,dir,index:n,polygon,segments:[],incident:[]};
 const first=snell(dir,entry.outward,1,n);
 if(first.tir)return {miss:true,source,dir,index:n,polygon,segments:[],incident:[source,entry.p]};
 const segments=[];
 let pos=add(entry.p,mul(first.dir,0.00018)),travel=first.dir;
 let throughput=1-first.reflectance,exit=null,internalReflections=0;
 for(let i=0;i<8;i++){
  const hit=boundaryHit(pos,travel,polygon);
  if(!hit)break;
  segments.push([sub(pos,mul(travel,.00018)),hit.p]);
  const out=snell(travel,mul(hit.outward,-1),n,1);
  if(out.tir){internalReflections++; pos=add(hit.p,mul(out.dir,.00018));travel=out.dir;continue;}
  throughput*=1-out.reflectance;
  exit={position:hit.p,dir:out.dir,throughput,faceIndex:hit.edge,exitAngleDeg:Math.atan2(out.dir[1],out.dir[0])/RAD};
  break;
 }
 return {miss:false,source,dir,index:n,polygon,incident:[source,entry.p],entry:entry.p,segments,exit,internalReflections,entryReflectance:first.reflectance};
}
export function spectralRGB(nm){
  // Approximate visible CIE chromaticities for explanatory beam colors;
  // optical directions themselves come from measured Sellmeier coefficients.
  let r=0,g=0,b=0;
  if(nm<440){r=-(nm-440)/60;b=1;}
  else if(nm<490){g=(nm-440)/50;b=1;}
  else if(nm<510){g=1;b=-(nm-510)/20;}
  else if(nm<580){r=(nm-510)/70;g=1;}
  else if(nm<645){r=1;g=-(nm-645)/65;}
  else r=1;
  const attenuation=nm<420?.3+.7*(nm-380)/40:nm>700?.3+.7*(780-nm)/80:1;
  return [r,g,b].map(v=>Math.max(0,Math.min(1,Math.pow(Math.max(0,v*attenuation),.8))));
}
export function diagnostics(opts={}){
 const blue=tracePrism(420,opts),red=tracePrism(680,opts),green=tracePrism(550,opts);
 return {blue,red,green,spreadDeg:red.exit&&blue.exit?Math.abs(red.exit.exitAngleDeg-blue.exit.exitAngleDeg):0,
   avgTransmission:green.exit?green.exit.throughput:0,criticalDeg:Math.asin(1/indexOfRefraction(550,opts.material||'bk7'))/RAD};
}
