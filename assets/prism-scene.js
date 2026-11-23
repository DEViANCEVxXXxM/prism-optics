import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {MATERIALS,LOCAL_PRISM,indexOfRefraction,tracePrism,diagnostics,spectralRGB,RAD} from './prism-physics.js';

// PRISM / SPECTRAL OPTICS LABORATORY
// Ray directions and Fresnel losses are derived from the optics module.
// The luminous ribbons, volumetric haze and spectrum on the bench are
// visualization devices, NOT claims of wave-optics path tracing.
const $=id=>document.getElementById(id);
const STATE={material:'bk7',incidence:18,rotation:0,separation:1,glow:1.15,speed:.85,dust:38,glass:38,
  guides:false,internal:true,detector:true,bench:true,photons:false,volume:true,paused:false,time:0};
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x060915);
scene.fog=new THREE.FogExp2(0x060915,0.0068);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.38;
$('canvas-container').appendChild(renderer.domElement);
const camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.1,150);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.065;
controls.enablePan=true;controls.minDistance=4.5;controls.maxDistance=43;
controls.minPolarAngle=.22;controls.maxPolarAngle=2.5;
controls.target.set(1.5,-.15,0);
// Four deliberately different photographic compositions: front, macro, elevated, reverse.
const PRESETS=[
 {name:'Spectrum',pos:[3.6,3.0,24.5],target:[2.8,-.65,0],title:'Light, separated.',detail:'White light becomes a spectrum as every wavelength takes a different path.'},
 {name:'Glass Macro',pos:[-2.9,1.2,7.45],target:[-.05,.28,0],title:'Inside the glass.',detail:'Study the entry point, refracted path, and illuminated glass edges.'},
 {name:'Bench Survey',pos:[8.9,14.4,11.7],target:[2,-1.4,0],title:'The optical bench.',detail:'A high three-quarter view reveals the emitter, prism, detector and light spread.'},
 {name:'Spectral Fan',pos:[15.0,3.6,-11.8],target:[3.0,-.9,0],title:'Follow the rays.',detail:'A reverse perspective puts you inside the outgoing fan of colored light.'}
];
let currentPreset=0;
camera.position.set(...PRESETS[0].pos);controls.target.set(...PRESETS[0].target);controls.update();
let transition=null;
function selectPreset(i,immediate=false){
 currentPreset=i;
 document.querySelectorAll('.dock-btn').forEach((b,j)=>b.classList.toggle('active',j===i));
 $('statView').textContent=PRESETS[i].name;
 const heading=$('sceneViewTitle'), description=$('sceneViewDescription'), index=$('sceneViewIndex');
 if(heading)heading.textContent=PRESETS[i].title;
 if(description)description.textContent=PRESETS[i].detail;
 if(index)index.textContent=String(i+1).padStart(2,'0')+' / 04';
 if(immediate){camera.position.set(...PRESETS[i].pos);controls.target.set(...PRESETS[i].target);controls.update();transition=null;return;}
 transition={fromPos:camera.position.clone(),fromTarget:controls.target.clone(),toPos:new THREE.Vector3(...PRESETS[i].pos),toTarget:new THREE.Vector3(...PRESETS[i].target),t:0};
}
controls.addEventListener('start',()=>transition=null);
// Frame the optical apparatus in the unobstructed stage, not beneath the inspector.
let lastStageSignature="";
function frameForInterface(){
 const inspector=$('inspectorDrawer');
 const reserved=innerWidth>1030 && inspector && !inspector.classList.contains('collapsed')
   ? Math.min(185,Math.max(115,innerWidth*.118)) : 0;
 const signature=[innerWidth,innerHeight,reserved].join(":");
 if(signature===lastStageSignature)return;
 lastStageSignature=signature;
 if(reserved)camera.setViewOffset(innerWidth,innerHeight,reserved,0,innerWidth,innerHeight);
 else camera.clearViewOffset();
 camera.updateProjectionMatrix();
}

// Studio lighting — the glass gets genuine light transport material behavior,
// while rendered beams show the path predicted by planar geometric optics.
scene.add(new THREE.AmbientLight(0xb5d0ff,1.24));
const key=new THREE.DirectionalLight(0xf6f5ff,3.4);key.position.set(-8,10,9);scene.add(key);
const fill=new THREE.PointLight(0x82a5ff,55,19);fill.position.set(0,4,6);scene.add(fill);
const rim=new THREE.PointLight(0xffb477,44,21);rim.position.set(4,3,-4);scene.add(rim);
const cool=new THREE.PointLight(0x4c7dff,40,14);cool.position.set(-3,-.5,4);scene.add(cool);

// Textured charcoal optical bench; no downloaded image assets.
const grainCanvas=document.createElement('canvas');grainCanvas.width=512;grainCanvas.height=512;
const gctx=grainCanvas.getContext('2d');
gctx.fillStyle='#40434b';gctx.fillRect(0,0,512,512);
let seed=87712;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
for(let i=0;i<24500;i++){
 const v=Math.round(55+rand()*85);const alpha=.06+rand()*.22;
 gctx.fillStyle=`rgba(${v},${v},${v+3},${alpha})`;
 gctx.fillRect(rand()*512,rand()*512,.4+rand()*1.8,.4+rand()*1.8);
}
for(let i=0;i<48;i++){gctx.strokeStyle=`rgba(185,184,191,${.014+rand()*.018})`;gctx.beginPath();gctx.moveTo(rand()*512,rand()*512);gctx.lineTo(rand()*512,rand()*512);gctx.stroke();}
const floorTexture=new THREE.CanvasTexture(grainCanvas);floorTexture.wrapS=floorTexture.wrapT=THREE.RepeatWrapping;floorTexture.repeat.set(2.3,1.4);floorTexture.colorSpace=THREE.SRGBColorSpace;
const benchGroup=new THREE.Group();scene.add(benchGroup);
const bench=new THREE.Mesh(new THREE.PlaneGeometry(48,29),new THREE.MeshStandardMaterial({map:floorTexture,color:0x6c6974,roughness:.94,metalness:.05,side:THREE.DoubleSide}));
bench.rotation.x=-Math.PI/2;bench.position.y=-3.64;benchGroup.add(bench);
const platform=new THREE.Mesh(new THREE.CylinderGeometry(2.0,2.2,.25,6),new THREE.MeshStandardMaterial({color:0x161e2a,metalness:.69,roughness:.27}));
platform.rotation.y=Math.PI/6;platform.position.set(0,-3.50,0);benchGroup.add(platform);
const stem=new THREE.Mesh(new THREE.CylinderGeometry(.11,.17,1.55,12),new THREE.MeshStandardMaterial({color:0x5c7082,metalness:.75,roughness:.25}));
stem.position.set(0,-2.56,0);benchGroup.add(stem);
const holder=new THREE.Mesh(new THREE.BoxGeometry(2.48,.20,.58),new THREE.MeshStandardMaterial({color:0x1b2733,metalness:.7,roughness:.29}));
holder.position.set(0,-1.54,0);benchGroup.add(holder);

// Instrument detail: turntable rim, engraved scale ticks, lens barrel & machined fasteners.
// These are real 3D objects, kept behind the ray-tracing plane.
const machinedDark=new THREE.MeshStandardMaterial({color:0x161f2b,roughness:.31,metalness:.79});
const machinedSilver=new THREE.MeshStandardMaterial({color:0x8eacbf,roughness:.32,metalness:.76});
const etchedInk=new THREE.LineBasicMaterial({color:0x9daec2,transparent:true,opacity:.48});
const dialBase=new THREE.Mesh(new THREE.TorusGeometry(2.11,.037,6,80),machinedSilver);
dialBase.rotation.x=Math.PI/2;dialBase.position.set(0,-3.354,0);benchGroup.add(dialBase);
for(let i=0;i<72;i++){
 const a=i*Math.PI/36,r0=i%6===0?2.13:2.17,r1=2.30;
 const pts=[new THREE.Vector3(Math.cos(a)*r0,-3.343,Math.sin(a)*r0),new THREE.Vector3(Math.cos(a)*r1,-3.343,Math.sin(a)*r1)];
 benchGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),etchedInk));
}
for(const x of [-.96,.96])for(const z of [-.20,.20]){
 const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,.038,10),machinedSilver);
 bolt.position.set(x,-1.415,z);benchGroup.add(bolt);
}
const benchMats=[new THREE.MeshStandardMaterial({color:0x1a2432,roughness:.54,metalness:.62}),machinedSilver];
for(const z of [-6.0,6.0]){
 const rail=new THREE.Mesh(new THREE.BoxGeometry(30,.045,.085),benchMats[0]);rail.position.set(0,-3.585,z);benchGroup.add(rail);
}
// Etched wavelength scale is a reference legend on the bench, not a detector measurement.
function textLabel(text,color='#b4cde6'){
 const c=document.createElement('canvas');c.width=256;c.height=64;
 const ctx=c.getContext('2d');ctx.clearRect(0,0,256,64);
 ctx.font='600 25px ui-monospace, Consolas, monospace';ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(text,128,38);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2.4,.60),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
 mesh.rotation.x=-Math.PI/2;return mesh;
}
for(const [x,word] of [[6.6,'OPTICAL BENCH'],[10.6,'VISIBLE / 400–700 nm']]){
 const label=textLabel(word,'#798ca3');label.position.set(x,-3.589,-4.9);benchGroup.add(label);
}
// Four engraved optical bench lines recede into perspective.
const gridMat=new THREE.LineBasicMaterial({color:0x48667d,transparent:true,opacity:.12});
for(const zz of [-7,-3,0,3,7]){
 const v=[new THREE.Vector3(-17,-3.62,zz),new THREE.Vector3(17,-3.62,zz)];
 benchGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(v),gridMat));
}
// Soft shadow under prism.
function radialTexture(){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');const grad=ctx.createRadialGradient(64,64,2,64,64,64);grad.addColorStop(0,'rgba(255,255,255,1)');grad.addColorStop(.22,'rgba(255,255,255,.67)');grad.addColorStop(.67,'rgba(255,255,255,.10)');grad.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
const glowTex=radialTexture();
function glowSprite(color,size,opacity=.7){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color,opacity,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false}));s.scale.set(size,size,1);return s;}
const shadow=new THREE.Mesh(new THREE.PlaneGeometry(5.7,3.5),new THREE.MeshBasicMaterial({map:glowTex,color:0x010306,transparent:true,opacity:.62,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(0,-3.61,0);benchGroup.add(shadow);
const beamSourceGroup=new THREE.Group();scene.add(beamSourceGroup);
const sourceHead=new THREE.Mesh(new THREE.CylinderGeometry(.28,.33,.85,16),new THREE.MeshStandardMaterial({color:0x212e3c,metalness:.73,roughness:.3}));
sourceHead.rotation.z=-Math.PI/2;beamSourceGroup.add(sourceHead);
const sourceLens=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.04,20),new THREE.MeshBasicMaterial({color:0xcaf3ff}));
sourceLens.rotation.z=-Math.PI/2;sourceLens.position.x=.45;beamSourceGroup.add(sourceLens);
const lensRing=new THREE.Mesh(new THREE.TorusGeometry(.28,.043,8,20),machinedSilver);
lensRing.rotation.y=Math.PI/2;lensRing.position.x=.47;beamSourceGroup.add(lensRing);
const lensBarrel=new THREE.Mesh(new THREE.CylinderGeometry(.32,.34,.66,20,1,true),machinedDark);
lensBarrel.rotation.z=-Math.PI/2;lensBarrel.position.x=-.07;beamSourceGroup.add(lensBarrel);
const sourceHalo=glowSprite(0xe1f7ff,2.9,.3);sourceHalo.position.x=.49;beamSourceGroup.add(sourceHalo);

// Glass prism, physically shaded and layered with subtle front-face tint and
// explicit bright edge highlights (these are optical presentation aids).
const prismGroup=new THREE.Group();scene.add(prismGroup);
const shape=new THREE.Shape();shape.moveTo(...LOCAL_PRISM[0]);shape.lineTo(...LOCAL_PRISM[1]);shape.lineTo(...LOCAL_PRISM[2]);shape.closePath();
const glassGeo=new THREE.ExtrudeGeometry(shape,{steps:1,depth:1.78,bevelEnabled:true,bevelThickness:.035,bevelSize:.026,bevelSegments:2,curveSegments:1});
glassGeo.translate(0,0,-.89);glassGeo.computeVertexNormals();
const glassMat=new THREE.MeshPhysicalMaterial({color:0xd5eeff,metalness:0,roughness:.035,transmission:.88,thickness:1.8,ior:1.5168,clearcoat:.65,clearcoatRoughness:.08,transparent:false,side:THREE.DoubleSide});
const prismMesh=new THREE.Mesh(glassGeo,glassMat);prismMesh.renderOrder=3;prismGroup.add(prismMesh);
const triGeo=new THREE.ShapeGeometry(shape);
const frontTint=new THREE.Mesh(triGeo,new THREE.MeshBasicMaterial({color:0x8bc9f5,transparent:true,opacity:.062,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
frontTint.position.z=.951;frontTint.renderOrder=10;prismGroup.add(frontTint);
const insideReflection=new THREE.Mesh(new THREE.PlaneGeometry(1.25,2.68),new THREE.MeshBasicMaterial({color:0xc0eaff,transparent:true,opacity:.014,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));insideReflection.rotation.z=-.33;insideReflection.position.set(-.19,.3,.985);prismGroup.add(insideReflection);
const edgePositions=[];
for(let j=0;j<2;j++){for(let i=0;i<3;i++){let a=LOCAL_PRISM[i],b=LOCAL_PRISM[(i+1)%3],z=j===0?-.925:.925;edgePositions.push(a[0],a[1],z,b[0],b[1],z)}}
for(let i=0;i<3;i++){let p=LOCAL_PRISM[i];edgePositions.push(p[0],p[1],-.925,p[0],p[1],.925)}
const edgeGeom=new THREE.BufferGeometry();edgeGeom.setAttribute('position',new THREE.Float32BufferAttribute(edgePositions,3));
const edges=new THREE.LineSegments(edgeGeom,new THREE.LineBasicMaterial({color:0xd4f2ff,transparent:true,opacity:.74,depthTest:true,depthWrite:false}));edges.renderOrder=15;prismGroup.add(edges);
const rimGlow=new THREE.LineSegments(edgeGeom,new THREE.LineBasicMaterial({color:0x7aaeff,transparent:true,opacity:.12,depthTest:true,depthWrite:false,blending:THREE.AdditiveBlending}));rimGlow.renderOrder=14;prismGroup.add(rimGlow);

// Screen-aligned luminous ribbons in the actual X/Y ray-tracing plane.
const beamCoreGroup=new THREE.Group(),beamGlowGroup=new THREE.Group(),guideGroup=new THREE.Group(),detectorGroup=new THREE.Group();
scene.add(beamCoreGroup,beamGlowGroup,guideGroup,detectorGroup);
const beamShader={
 vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform vec3 uColor;uniform float uStrength;uniform float uClock;varying vec2 vUv;void main(){float profile=pow(max(0.,1.-abs(vUv.y-.5)*2.),1.65);float fade=smoothstep(0.,.10,vUv.x)*(1.-.34*smoothstep(.82,1.,vUv.x));float pulse=1.+.11*sin(uClock*3.-vUv.x*22.);gl_FragColor=vec4(uColor*profile*uStrength*pulse,profile*fade*min(.88,uStrength*.61));}`
};
const ribbonMaterials=[];
function ribbon(group,start,end,color,w0,w1,strength,z=1.03){
 let a=new THREE.Vector3(start[0],start[1],z),b=new THREE.Vector3(end[0],end[1],z);
 let d=b.clone().sub(a);if(d.length()<.03)return null;let normal=new THREE.Vector3(-d.y,d.x,0).normalize();
 const corners=[a.clone().addScaledVector(normal,w0/2),a.clone().addScaledVector(normal,-w0/2),
  b.clone().addScaledVector(normal,w1/2),b.clone().addScaledVector(normal,-w1/2)];
 const positions=corners.flatMap(p=>[p.x,p.y,p.z]);
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute([0,1,0,0,1,1,1,0],2));geo.setIndex([0,1,2,1,3,2]);geo.computeVertexNormals();
 const mat=new THREE.ShaderMaterial({uniforms:{uColor:{value:new THREE.Color(...color)},uStrength:{value:strength},uClock:{value:0}},...beamShader,transparent:true,blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
 let mesh=new THREE.Mesh(geo,mat);mesh.renderOrder=19;group.add(mesh);ribbonMaterials.push({mat,base:strength});
 // A second orthogonal scattering plane gives each light volume a readable
 // profile from above and behind. The centerline remains the traced XY ray.
 if(group===beamGlowGroup && Math.max(w0,w1)>.13){
   const broad0=w0*.56,broad1=w1*.56;
   const crossPositions=[
     a.x,a.y,z+broad0/2,a.x,a.y,z-broad0/2,
     b.x,b.y,z+broad1/2,b.x,b.y,z-broad1/2
   ];
   const crossGeo=new THREE.BufferGeometry();
   crossGeo.setAttribute('position',new THREE.Float32BufferAttribute(crossPositions,3));
   crossGeo.setAttribute('uv',new THREE.Float32BufferAttribute([0,1,0,0,1,1,1,0],2));
   crossGeo.setIndex([0,1,2,1,3,2]);
   const crossMat=mat.clone();crossMat.uniforms.uStrength.value=strength*.51;
   const crossMesh=new THREE.Mesh(crossGeo,crossMat);crossMesh.renderOrder=18;
   group.add(crossMesh);ribbonMaterials.push({mat:crossMat,base:strength*.51});
 }
 return mesh;
}
function clearGroup(group){for(const child of [...group.children]){group.remove(child);child.traverse?.(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&!Array.isArray(o.material))o.material.dispose()})}}
function smallNormal(point,n,color=0x8fbbff){
 const a=new THREE.Vector3(point[0]-n[0]*.85,point[1]-n[1]*.85,1.24),b=new THREE.Vector3(point[0]+n[0]*.85,point[1]+n[1]*.85,1.24);
 let geo=new THREE.BufferGeometry().setFromPoints([a,b]);const m=new THREE.Line(geo,new THREE.LineDashedMaterial({color,transparent:true,opacity:.58,dashSize:.11,gapSize:.09,depthTest:false}));m.computeLineDistances();guideGroup.add(m);
}
const photonGroup=new THREE.Group();scene.add(photonGroup);let photonPaths=[];
const photonGeo=new THREE.SphereGeometry(.026,8,6);
const photonColors=[];
const FLOOR_Y=-3.60;
function beamLimit(start,dir){
 let t=20;
 if(dir[0]>.01)t=Math.min(t,(16.8-start[0])/dir[0]);
 if(dir[0]<-.01)t=Math.min(t,(-15-start[0])/dir[0]);
 if(dir[1]<-.01)t=Math.min(t,(FLOOR_Y-start[1])/dir[1]);
 if(dir[1]>.01)t=Math.min(t,(7.2-start[1])/dir[1]);
 return [start[0]+dir[0]*Math.max(.1,t),start[1]+dir[1]*Math.max(.1,t)];
}
function vecDistance(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1]);}
function photonPath(a,b,color,amount=1){if(vecDistance(a,b)<.2)return;const mesh=new THREE.Mesh(photonGeo,new THREE.MeshBasicMaterial({color:new THREE.Color(...color),transparent:true,opacity:.62,blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false}));photonGroup.add(mesh);photonPaths.push({mesh,a,b,phase:rand(),amount});}
function caustic(x,color,opacity=.35){
 const glow=new THREE.Mesh(new THREE.PlaneGeometry(.38,2.3),new THREE.MeshBasicMaterial({map:glowTex,color:new THREE.Color(...color),transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,side:THREE.DoubleSide}));
 glow.rotation.x=-Math.PI/2;glow.position.set(x,-3.60,.2);detectorGroup.add(glow);
}
const ephemeralGlows=[];
function rebuild(){
 clearGroup(beamCoreGroup);clearGroup(beamGlowGroup);clearGroup(guideGroup);clearGroup(detectorGroup);clearGroup(photonGroup);photonPaths=[];ribbonMaterials.length=0;
 prismGroup.rotation.z=STATE.rotation*RAD;
 glassMat.ior=indexOfRefraction(550,STATE.material);
 frontTint.material.opacity=.035+STATE.glass/100*.12;
 glassMat.transmission=.93-STATE.glass/100*.12;
 const d=diagnostics(STATE);
 const wavelengths=[];const sampleStep=innerWidth<=650?15:10;
 for(let nm=400;nm<=700;nm+=sampleStep)wavelengths.push(nm);
 const green=d.green;
 const ordinarySpread=!!(d.blue.exit&&d.red.exit&&
      d.blue.internalReflections===d.red.internalReflections &&
      d.blue.exit.faceIndex===d.red.exit.faceIndex &&
      d.blue.exit.position[1]>-1.3 && d.red.exit.position[1]>-1.3);
 const spreadDisplay=ordinarySpread?d.spreadDeg.toFixed(2)+'°':'MULTI-PATH';
 $('statusBadge').textContent=`${STATE.material.toUpperCase()} · ${d.green.miss?'NO ENTRY':d.green.exit?'LIVE':'TIR'}`;
 $('hudGlass').textContent=MATERIALS[STATE.material].name;
 $('hudIndex').textContent=d.green.index.toFixed(4);
 $('hudSpread').textContent=spreadDisplay;
 $('hudTransmission').textContent=Math.round(100*d.avgTransmission)+'%';
 $('hudBehavior').textContent=d.green.miss?'NO ENTRY':!d.green.exit?'TRAPPED / TIR':
    d.green.internalReflections>0?'REFLECTED + REFRACTED':'REFRACTION';
 const explainer=$('liveExplanation');
 if(explainer)explainer.textContent=!d.green.exit?'The current angle does not produce an exiting green ray. Adjust incidence or rotate the prism.':
   !ordinarySpread?'Different wavelengths are leaving along distinct internal paths; a single dispersion angle is not meaningful here.':
   `Measured angular spread ${d.spreadDeg.toFixed(2)}°. ${STATE.separation>1.01?'The displayed beam fan is exaggerated; the measurement is not.':'Visible rays follow their calculated directions at 1×.'}`;
 const measured=STATE.separation<=1.01;
 $('btnMeasured')?.classList.toggle('active',measured);
 $('btnShowcase')?.classList.toggle('active',!measured);
 $('btnMeasured')?.setAttribute('aria-pressed',String(measured));
 $('btnShowcase')?.setAttribute('aria-pressed',String(!measured));
 const mode=$('physicsModeText');if(mode)mode.textContent=measured?'MEASURED · 1×':'PRESENTATION · '+STATE.separation.toFixed(2)+'×';
 $('statDispersion').textContent=ordinarySpread?d.spreadDeg.toFixed(3)+'°':'Multiple exit paths';
 $('statCritical').textContent=d.criticalDeg.toFixed(2)+'°';
 $('statRays').textContent=wavelengths.length+' samples';
 const tg=$('tGuides'), tp=$('tPhotons');
 if(tg) tg.checked=STATE.guides;
 if(tp) tp.checked=STATE.photons;
 $('btnGuides')?.classList.toggle('active',STATE.guides);
 let rays=0;
 if(green.entry){
   const white=[1,1,1];
   ribbon(beamCoreGroup,green.source,green.entry,white,.035,.035,.69,1.17);
   ribbon(beamGlowGroup,green.source,green.entry,[.73,.85,1],.34,.23,.28,1.16);
   ribbon(beamGlowGroup,green.source,green.entry,[.52,.68,1],.95,.64,.074,1.14);
   if(STATE.photons) photonPath(green.source,green.entry,[.9,.95,1]);
   beamSourceGroup.position.set(green.source[0],green.source[1],0);
   beamSourceGroup.rotation.z=STATE.incidence*RAD;
 }else{
   beamSourceGroup.position.set(green.source[0],green.source[1],0);beamSourceGroup.rotation.z=STATE.incidence*RAD;
   const far=beamLimit(green.source,green.dir);
   ribbon(beamCoreGroup,green.source,far,[1,1,1],.045,.045,.5,1.14);
   ribbon(beamGlowGroup,green.source,far,[.8,.86,1],.36,.24,.12,1.13);
 }
 let exits=[];
 for(const nm of wavelengths){
   const tr=tracePrism(nm,STATE);
   const rgb=spectralRGB(nm);const visible=(.65+.35*Math.sin((nm-400)/300*Math.PI));
   for(const [a,b] of tr.segments){
     ribbon(beamCoreGroup,a,b,rgb,.017,.017,.085*visible,1.14);
     if(STATE.internal)ribbon(beamGlowGroup,a,b,rgb,.19,.20,.022*visible,1.12);
   }
   if(!tr.exit)continue;
   rays++;
   const e=tr.exit.position;
   const calculatedAngle=Math.atan2(tr.exit.dir[1],tr.exit.dir[0]);
   const greenAngle=green.exit?Math.atan2(green.exit.dir[1],green.exit.dir[0]):calculatedAngle;
   const displayAngle=greenAngle+(calculatedAngle-greenAngle)*STATE.separation;
   const out=[Math.cos(displayAngle),Math.sin(displayAngle)];
   const end=beamLimit(e,out);
   exits.push([e,end,rgb,nm]);
   const alpha=.48+tr.exit.throughput*.65;
   ribbon(beamCoreGroup,e,end,rgb,.022,.083,.21*alpha*visible,1.24);
   ribbon(beamGlowGroup,e,end,rgb,.15,.32,.09*alpha*visible,1.22);
   ribbon(beamGlowGroup,e,end,rgb,.40,.60,.023*alpha*visible,1.20);
   if(STATE.photons && nm%30===0)photonPath(e,end,rgb);
   if(end[1]<=FLOOR_Y+.003 && STATE.detector && nm%20===0)caustic(end[0],rgb,.16*alpha);
 }
 if(STATE.detector){
   const detectorOutline=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(3.3,-3.57,1.75),new THREE.Vector3(13.5,-3.57,1.75)]),new THREE.LineBasicMaterial({color:0x44647b,transparent:true,opacity:.22}));
   detectorGroup.add(detectorOutline);
 }
 beamGlowGroup.visible=STATE.volume;
 photonGroup.visible=STATE.photons;
 guideGroup.visible=STATE.guides;
 detectorGroup.visible=STATE.detector;
 $('statRays').textContent=`${rays} / ${wavelengths.length}`;
 // Normal vectors, incident / refracted guide segments and points of contact.
 if(green.entry&&STATE.guides){
   const p=green.entry,polygon=green.polygon;
   let face=polygon.findIndex((a,i)=>Math.hypot(p[0]-a[0],p[1]-a[1]) + Math.hypot(p[0]-polygon[(i+1)%3][0],p[1]-polygon[(i+1)%3][1]) - Math.hypot(a[0]-polygon[(i+1)%3][0],a[1]-polygon[(i+1)%3][1]) < .0001);
   if(face>=0){const a=polygon[face],b=polygon[(face+1)%3],v=[b[0]-a[0],b[1]-a[1]],n=[v[1]/Math.hypot(...v),-v[0]/Math.hypot(...v)];smallNormal(p,n);}
   if(green.exit){smallNormal(green.exit.position,[Math.sin(green.exit.exitAngleDeg*RAD),-Math.cos(green.exit.exitAngleDeg*RAD)],0xe7bdff);}
 }
 // Entry / exit glints are subtle; no unrelated floating objects.
 clearGroup(glintGroup);
 if(green.entry){const s=glowSprite(0xe5f6ff,1.15,.32);s.position.set(green.entry[0],green.entry[1],1.40);glintGroup.add(s);}
 if(green.exit){const s=glowSprite(0xffd4e8,1.45,.27);s.position.set(green.exit.position[0],green.exit.position[1],1.42);glintGroup.add(s);}
 updateLightStrength();
}
const glintGroup=new THREE.Group();scene.add(glintGroup);
function updateLightStrength(){for(const row of ribbonMaterials)row.mat.uniforms.uStrength.value=row.base*STATE.glow;}

// Suspended scattering particles help explain why the path is visible in air.
const dustCount=720;
const dustGeo=new THREE.BufferGeometry();const dustPos=new Float32Array(dustCount*3);
for(let i=0;i<dustCount;i++){
 dustPos[i*3]=-11+rand()*24;dustPos[i*3+1]=-3.35+rand()*8.8;dustPos[i*3+2]=-3+rand()*6;
}
dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));
const dustMat=new THREE.PointsMaterial({color:0xe0d6e6,size:.055,opacity:.18,transparent:true,depthWrite:false,sizeAttenuation:true});
const dustPoints=new THREE.Points(dustGeo,dustMat);scene.add(dustPoints);

// Event binding — all controls in the three inspector tabs are functional.
function slider(id,key,out,format,rerender=true){
 const input=$(id); input.addEventListener('input',()=>{STATE[key]=Number(input.value);$(out).textContent=format(STATE[key]);if(rerender)rebuild();});
}
slider('sIncident','incidence','vIncident',v=>(v>=0?'+':'')+v.toFixed(1)+'°');
slider('sRotation','rotation','vRotation',v=>v.toFixed(1)+'°');
slider('sSeparation','separation','vSeparation',v=>v.toFixed(2)+'×');
function setPresentationScale(v){
 $('sSeparation').value=String(v);$('sSeparation').dispatchEvent(new Event('input',{bubbles:true}));
}
$('btnMeasured')?.addEventListener('click',()=>setPresentationScale(1));
$('btnShowcase')?.addEventListener('click',()=>setPresentationScale(2.5));
slider('sGlow','glow','vGlow',v=>v.toFixed(2)+'×',false);
slider('sSpeed','speed','vSpeed',v=>v.toFixed(2)+'×',false);
slider('sDust','dust','vDust',v=>v.toFixed(0)+'%',false);
slider('sGlass','glass','vGlass',v=>v.toFixed(0)+'%');
$('sMaterial').addEventListener('change',()=>{
 STATE.material=$('sMaterial').value;
 // Dense flint requires a higher incidence to transmit through the far face.
 if(STATE.material==='sf11'&&STATE.incidence<31){STATE.incidence=36;$('sIncident').value=36;$('vIncident').textContent='+36.0°';}
 rebuild();
});
for(const [id,key,rerender] of [['tGuides','guides',false],['tInternal','internal',true],['tDetector','detector',false],['tBench','bench',false],['tPhotons','photons',false],['tVolume','volume',false]]){
 $(id).addEventListener('change',()=>{STATE[key]=$(id).checked;if(rerender)rebuild();else{guideGroup.visible=STATE.guides;detectorGroup.visible=STATE.detector;benchGroup.visible=STATE.bench;photonGroup.visible=STATE.photons;beamGlowGroup.visible=STATE.volume;}});
}
$('btnGuides').addEventListener('click',()=>{$('tGuides').checked=!$('tGuides').checked;$('tGuides').dispatchEvent(new Event('change'));$(`btnGuides`).classList.toggle('active',STATE.guides);});
$('btnPause').addEventListener('click',()=>{STATE.paused=!STATE.paused;$('btnPause').classList.toggle('active',STATE.paused);$('btnPause').title=STATE.paused?'Resume [Space]':'Pause [Space]';});
function reset(){
 for(const [k,v] of Object.entries({material:'bk7',incidence:18,rotation:0,separation:1,glow:1.15,speed:.85,dust:38,glass:38,guides:false,internal:true,detector:true,bench:true,photons:false,volume:true}))STATE[k]=v;
 const inputs={sIncident:18,sRotation:0,sSeparation:1,sGlow:1.15,sSpeed:.85,sDust:38,sGlass:38};
 for(let [id,v] of Object.entries(inputs)){$(id).value=v;$(id).dispatchEvent(new Event('input'));}
 $('sMaterial').value='bk7';for(const [id,key] of [['tGuides','guides'],['tInternal','internal'],['tDetector','detector'],['tBench','bench'],['tPhotons','photons'],['tVolume','volume']]){$(id).checked=STATE[key];}
 $('btnGuides').classList.add('active');selectPreset(0);rebuild();
}
$('btnReset').addEventListener('click',reset);
$('btnDrawer').addEventListener('click',()=>{$('inspectorDrawer').classList.toggle('collapsed');});
$('btnCapture').addEventListener('click',()=>{renderer.render(scene,camera);const link=document.createElement('a');link.href=renderer.domElement.toDataURL('image/png');link.download='prism-optics-capture.png';link.click();});
$('btnFullscreen').addEventListener('click',()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.();});
document.querySelectorAll('.dock-btn').forEach((b,i)=>b.addEventListener('click',()=>selectPreset(i)));
document.querySelectorAll('.tab-btn').forEach(button=>button.addEventListener('click',()=>{
 document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b===button));
 document.querySelectorAll('.tab-content').forEach(p=>p.classList.toggle('active',p.id===button.dataset.tab));
}));
window.addEventListener('keydown',e=>{
 if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
 if(e.code==='Space'){e.preventDefault();$('btnPause').click();}
 else if(e.code==='KeyG')$('btnGuides').click();
 else if(e.code==='KeyM')setPresentationScale(STATE.separation>1.01?1:2.5);
 else if(e.code==='KeyR')$('btnReset').click();
 else if(e.code==='KeyH')$('btnDrawer').click();
 else if(e.code==='KeyP')$('btnCapture').click();
 else if(e.code==='KeyF')$('btnFullscreen').click();
 else if(e.key>='1'&&e.key<='4')selectPreset(Number(e.key)-1);
});
let lastSampleMode=innerWidth<=650;
window.addEventListener('resize',()=>{
 camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));
 const compact=innerWidth<=650;
 if(compact!==lastSampleMode){lastSampleMode=compact;rebuild();}
});

rebuild();
let last=performance.now(),frame=0,statTime=0;
function animate(now){
 requestAnimationFrame(animate);
 const dt=Math.min(.06,Math.max(0,(now-last)/1000));last=now;frame++;statTime+=dt;
 if(statTime>.65){$('statFps').textContent=Math.round(frame/statTime)+' FPS';statTime=0;frame=0;}
 if(transition){transition.t=Math.min(1,transition.t+dt*1.45);const t=transition.t*transition.t*(3-2*transition.t);camera.position.lerpVectors(transition.fromPos,transition.toPos,t);controls.target.lerpVectors(transition.fromTarget,transition.toTarget,t);if(transition.t>=1)transition=null;}
 frameForInterface();
 controls.update();
 if(!STATE.paused){
  STATE.time+=dt*STATE.speed;
  for(const {mat} of ribbonMaterials)mat.uniforms.uClock.value=STATE.time;
  for(let i=0;i<photonPaths.length;i++){
    const p=photonPaths[i];const t=(STATE.time*.25+p.phase+i*.093)%1;
    p.mesh.position.set(p.a[0]+(p.b[0]-p.a[0])*t,p.a[1]+(p.b[1]-p.a[1])*t,1.36);
    p.mesh.material.opacity=.38+.5*Math.sin(t*Math.PI);
  }
  dustPoints.rotation.y=Math.sin(STATE.time*.065)*.015;
 }
 beamGlowGroup.visible=STATE.volume;
 photonGroup.visible=STATE.photons;
 dustMat.opacity=.33*STATE.dust/100;
 updateLightStrength();
 renderer.render(scene,camera);
}
selectPreset(0,true);
requestAnimationFrame(animate);
