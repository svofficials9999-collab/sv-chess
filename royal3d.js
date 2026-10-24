/* ROYAL CHESS 3D view - Three.js r147. Straight full-frame board: orthographic top camera
   with an oblique shear, so the board grid stays a perfect rectangle flush to the phone
   frame while pieces stand up showing full physical profiles. Tap-to-move, pinch zoom.
   2D remains the fallback; this module only renders and forwards taps via window.__rvTap. */
(function(){
'use strict';
var RV3={active:false,supported:false,ready:false};
window.RV3=RV3;

/* capture move data for glide animations */
if(typeof Chess!=='undefined'&&Chess.prototype&&!Chess.prototype.__rvPatched){
  var om=Chess.prototype.move, ou=Chess.prototype.undo;
  Chess.prototype.move=function(){var r=om.apply(this,arguments);if(r)window.__rvMove={from:r.from,to:r.to,flags:r.flags||'',captured:r.captured||null,piece:r.piece,promotion:r.promotion||null};return r};
  Chess.prototype.undo=function(){var r=ou.apply(this,arguments);if(r)window.__rvJump=true;return r};
  Chess.prototype.__rvPatched=true;
}

/* webgl support probe */
try{
  var testC=document.createElement('canvas');
  RV3.supported=!!window.THREE&&!!(testC.getContext('webgl2')||testC.getContext('webgl'));
}catch(e){RV3.supported=false}
if(!RV3.supported)return;

var renderer,scene,camera,raycaster,planeY0,containerEl;
var boardGroup,pieceGroup,hlGroup,fxGroup;
var meshes={};           /* sq -> group */
var geoCache={},matCache={},themeKey='walnut',boardLight,boardDark,frameMat,floorMat,mainLight,ambientLight;
var dragFrom=null,pieceStyle='staunton';
var PALETTES={gold:{w:0xffe1a0,b:0x393126,l:0xe5d4a0,d:0x4b3821,r:0xb78c36,bg:0x17120c,metal:.50},marble:{w:0xe9edf2,b:0x323943,l:0xcdd2d9,d:0x242a35,r:0x8e99aa,bg:0x0b1018,metal:.30},walnut:{w:0xe2d0a6,b:0x241f1a,l:0xecd6ab,d:0x8a5a34,r:0x8a6d1a,bg:0x17110b,wood:true},crystal:{w:0xb8edf7,b:0x324368,l:0xd8e7ef,d:0x384b69,r:0x9bbfd1,bg:0x0b1828,metal:.20},neon:{w:0x9be9de,b:0x574280,l:0x758fa0,d:0x192638,r:0x35acba,bg:0x081822,metal:.35},indian:{w:0xf4dbb3,b:0x583b30,l:0xe4c99e,d:0x744735,r:0xbf8838,bg:0x25120e,metal:.25}};
var zoom={z:1,t:1};
var orient='w';
var anims=[];
var pointers=new Map();
var tapInfo=null;
var fpsAvg=60,lowFrames=0,shadowsOn=true;
var lastT=0,rafId=0,lastState=null;
var SQ=1;

function sqPos(sq){var f=sq.charCodeAt(0)-97,r=sq.charCodeAt(1)-49;return{x:f-3.5,z:3.5-r}}
function sqFromPoint(p){var f=Math.round(p.x+3.5),r=Math.round(3.5-p.z);if(f<0||f>7||r<0||r>7)return null;return 'abcdefgh'[f]+(r+1)}

/* ---------- geometry ---------- */
function lathe(pts,seg){return new THREE.LatheGeometry(pts.map(function(p){return new THREE.Vector2(p[0],p[1])}),seg||40)}
function pieceGeo(type){
  if(geoCache[pieceStyle+type])return geoCache[pieceStyle+type];
  var g=[];
  if(type==='p'){ /* short pawn, big round head */
    g.push(lathe([[0.001,0],[0.30,0],[0.30,0.05],[0.17,0.10],[0.14,0.24],[0.20,0.28],[0.20,0.32],[0.12,0.35]]));
    var h=new THREE.SphereGeometry(0.15,20,16);h.translate(0,0.48,0);g.push(h);
  }else if(type==='r'){ /* crenellated tower */
    g.push(lathe([[0.001,0],[0.32,0],[0.32,0.05],[0.20,0.12],[0.18,0.50],[0.24,0.56],[0.24,0.62],[0.30,0.62],[0.30,0.74],[0.001,0.74]]));
    for(var i=0;i<4;i++){var b=new THREE.BoxGeometry(0.13,0.12,0.11);var a=i*Math.PI/2;b.translate(Math.cos(a)*0.235,0.79,Math.sin(a)*0.235);g.push(b)}
  }else if(type==='b'){ /* tall bishop, pointed mitre with slash nick */
    g.push(lathe([[0.001,0],[0.30,0],[0.30,0.05],[0.16,0.11],[0.13,0.46],[0.22,0.52],[0.155,0.60],[0.09,0.76],[0.015,0.86]]));
    var t=new THREE.SphereGeometry(0.075,14,12);t.translate(0,0.91,0);g.push(t);
    var sl=new THREE.BoxGeometry(0.03,0.18,0.12);sl.rotateZ(0.6);sl.translate(0.05,0.82,0);g.push(sl);
  }else if(type==='q'){ /* queen: coronet of spikes */
    g.push(lathe([[0.001,0],[0.335,0],[0.335,0.05],[0.175,0.12],[0.155,0.52],[0.26,0.60],[0.19,0.66],[0.22,0.74],[0.26,0.80],[0.10,0.83],[0.001,0.83]]));
    for(var j=0;j<8;j++){var cn=new THREE.ConeGeometry(0.05,0.16,8);var a2=j*Math.PI/4;cn.translate(Math.cos(a2)*0.21,0.94,Math.sin(a2)*0.21);g.push(cn)}
    var c=new THREE.SphereGeometry(0.085,14,12);c.translate(0,1.02,0);g.push(c);
  }else if(type==='k'){ /* king: tallest, bold cross */
    g.push(lathe([[0.001,0],[0.335,0],[0.335,0.05],[0.175,0.12],[0.155,0.54],[0.26,0.62],[0.185,0.68],[0.215,0.76],[0.25,0.82],[0.12,0.85],[0.001,0.85]]));
    var v1=new THREE.BoxGeometry(0.10,0.30,0.10);v1.translate(0,1.00,0);g.push(v1);
    var v2=new THREE.BoxGeometry(0.26,0.095,0.10);v2.translate(0,1.03,0);g.push(v2);
  }else if(type==='n'){ /* knight: horse head profile */
    g.push(lathe([[0.001,0],[0.31,0],[0.31,0.05],[0.195,0.12],[0.175,0.26],[0.235,0.32],[0.001,0.32]]));
    var s2=new THREE.Shape();
    s2.moveTo(-0.17,0.00);s2.lineTo(0.13,0.00);s2.lineTo(0.18,0.08);s2.lineTo(0.22,0.18);
    s2.lineTo(0.25,0.30);s2.lineTo(0.22,0.40);s2.lineTo(0.16,0.47);s2.lineTo(0.13,0.57);
    s2.lineTo(0.07,0.50);s2.lineTo(-0.02,0.53);s2.lineTo(-0.10,0.50);s2.lineTo(-0.155,0.43);
    s2.lineTo(-0.13,0.30);s2.lineTo(-0.17,0.14);s2.closePath();
    var ex=new THREE.ExtrudeGeometry(s2,{depth:0.20,bevelEnabled:true,bevelThickness:0.02,bevelSize:0.02,bevelSegments:2});
    ex.translate(0,0.30,-0.10);
    g.push(ex);
  }
  if(pieceStyle==='royal'){var collar=new THREE.CylinderGeometry(.35,.37,.07,32);collar.translate(0,.075,0);g.push(collar)}
  g.forEach(function(geo){geo.scale(pieceStyle==='modern'?1.10:1.20,pieceStyle==='modern'?1.22:1.14,pieceStyle==='modern'?1.10:1.20)});
  geoCache[pieceStyle+type]=g;
  return g;
}
var studioEnv=null;
function reflectionEnv(){if(studioEnv)return studioEnv;var c=document.createElement('canvas');c.width=256;c.height=128;var x=c.getContext('2d'),gr=x.createLinearGradient(0,0,0,128);gr.addColorStop(0,'#a5a8b4');gr.addColorStop(.46,'#222936');gr.addColorStop(1,'#15120c');x.fillStyle=gr;x.fillRect(0,0,256,128);x.fillStyle='#e7dec5';x.fillRect(22,12,17,65);x.fillRect(152,15,32,50);x.fillStyle='#748ca5';x.fillRect(225,28,10,45);studioEnv=new THREE.CanvasTexture(c);studioEnv.mapping=THREE.EquirectangularReflectionMapping;return studioEnv}
var woodTexCache={};
function woodTex(base,grain, streaks){
  var c=document.createElement('canvas');c.width=c.height=256;
  var x=c.getContext('2d');
  x.fillStyle=base;x.fillRect(0,0,256,256);
  var i,px,py,y,a;
  for(i=0;i<70;i++){
    y=Math.random()*256;a=0.05+Math.random()*0.09;
    x.strokeStyle='rgba('+grain+','+a.toFixed(3)+')';
    x.lineWidth=0.7+Math.random()*2.0;
    x.beginPath();
    for(px=-10;px<=266;px+=14){
      py=y+Math.sin((px*0.7+i*53)*0.045)*3.5;
      if(px===-10)x.moveTo(px,py);else x.lineTo(px,py);
    }
    x.stroke();
  }
  for(i=0;i<(streaks||14);i++){
    y=Math.random()*256;a=0.05+Math.random()*0.07;
    x.strokeStyle='rgba('+grain+','+(a+0.06).toFixed(3)+')';
    x.lineWidth=2.5+Math.random()*4;
    x.beginPath();x.moveTo(-10,y);x.lineTo(266,y+(Math.random()-0.5)*22);x.stroke();
  }
  var t=new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  return t;
}
function woodPair(base,grain,streaks){
  if(woodTexCache[base])return woodTexCache[base];
  var tex=woodTex(base,grain,streaks);
  var pair={map:tex,bump:tex};
  woodTexCache[base]=pair;return pair;
}
function mats(color){
 var key=themeKey+color;if(matCache[key])return matCache[key];var p=PALETTES[themeKey]||PALETTES.walnut;
 var opts={envMap:reflectionEnv(),envMapIntensity:.35,color:color==='w'?p.w:p.b,metalness:p.metal||.08,roughness:themeKey==='crystal'?.18:.40,clearcoat:.45};
 if(p.wood){var tx=woodPair(color==='w'?'#e2d0a6':'#241f1a',color==='w'?'122,96,58':'105,84,60',color==='w'?10:18);opts.color=0xffffff;opts.map=tx.map;opts.bumpMap=tx.bump;opts.bumpScale=.012}
 if(themeKey==='crystal'){opts.transmission=.25;opts.thickness=.6;opts.roughness=.10;opts.ior=1.45}
 return matCache[key]=new THREE.MeshPhysicalMaterial(opts);
}
function applyTheme(k){
 k=k||'gold';if(!PALETTES[k])k='walnut';if(themeKey===k&&boardLight)return;themeKey=k;var p=PALETTES[k];
 if(!boardLight)return;
 [[boardLight,p.l],[boardDark,p.d]].forEach(function(v){var m=v[0];m.map=p.wood?(v[1]===p.l?woodPair('#ecd6ab','150,118,72',8).map:woodPair('#8a5a34','58,36,18',16).map):null;m.bumpMap=null;m.color.setHex(p.wood?0xffffff:v[1]);m.roughness=k==='marble'?.25:.5;m.needsUpdate=true});
 frameMat.color.setHex(p.r);floorMat.color.setHex(p.bg);scene.background.setHex(p.bg);scene.fog.color.setHex(p.bg);
 Object.keys(meshes).forEach(function(sq){var m=meshes[sq];m.children.forEach(function(ch){ch.material=mats(m.userData.color)})});
}
RV3.setTheme=applyTheme;
function createPiece(type,color){
  var grp=new THREE.Group();
  pieceGeo(type).forEach(function(g){
    var mesh=new THREE.Mesh(g,mats(color));
    mesh.castShadow=true;mesh.receiveShadow=false;
    grp.add(mesh);
  });
  grp.userData={type:type,color:color};
  return grp;
}

/* ---------- scene ---------- */
function init(){
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x0b0b10);
  scene.fog=new THREE.Fog(0x0b0b10,16,30);
  var S=4.60,camH=12; /* half-extent: gold rim flush to the frame; camera height */
  camera=new THREE.OrthographicCamera(-S,S,S,-S,0.1,60);
  camera.up.set(0,0,-1);
  camera.position.set(0,camH,0);
  camera.lookAt(0,0,0);
  window.__rvS=S;
  raycaster=new THREE.Raycaster();
  planeY0=new THREE.Plane(new THREE.Vector3(0,1,0),0);

  var hemi=ambientLight=new THREE.HemisphereLight(0xfff3dd,0x1a1208,0.45);scene.add(hemi);
  var dir=mainLight=new THREE.DirectionalLight(0xffe9c0,1.1);
  dir.position.set(4.5,9,2.5);dir.castShadow=true;
  dir.shadow.mapSize.set(2048,2048);
  dir.shadow.camera.left=-6;dir.shadow.camera.right=6;dir.shadow.camera.top=6;dir.shadow.camera.bottom=-6;
  dir.shadow.camera.far=24;dir.shadow.bias=-0.0004;
  scene.add(dir);
  var accent=new THREE.PointLight(0xd4af37,0.28,40);accent.position.set(-6,3.5,-6);scene.add(accent);
  var fill=new THREE.DirectionalLight(0xbfd4ff,0.16);fill.position.set(-4.5,7,-5);scene.add(fill);

  boardGroup=new THREE.Group();pieceGroup=new THREE.Group();hlGroup=new THREE.Group();fxGroup=new THREE.Group();
  scene.add(boardGroup);scene.add(pieceGroup);scene.add(hlGroup);scene.add(fxGroup);

  /* board squares */
  var lw=woodPair('#ecd6ab','150,118,72',8),dw=woodPair('#8a5a34','58,36,18',16);
  var lMat=new THREE.MeshPhysicalMaterial({color:0xffffff,map:lw.map,bumpMap:lw.bump,bumpScale:0.008,roughness:0.52,metalness:0.04,clearcoat:0.12,clearcoatRoughness:0.4});
  var dMat=new THREE.MeshPhysicalMaterial({color:0xffffff,map:dw.map,bumpMap:dw.bump,bumpScale:0.008,roughness:0.58,metalness:0.04,clearcoat:0.12,clearcoatRoughness:0.4});
  boardLight=lMat;boardDark=dMat;
  var sqGeo=new THREE.BoxGeometry(1,0.14,1);
  for(var f=0;f<8;f++)for(var r=0;r<8;r++){
    var sqm=new THREE.Mesh(sqGeo,((f+r)%2===1)?dMat:lMat);
    sqm.position.set(f-3.5,-0.07,3.5-r);
    sqm.receiveShadow=true;
    boardGroup.add(sqm);
  }
  /* gold frame + base */
  var gold=frameMat=new THREE.MeshStandardMaterial({color:0x8a6d1a,metalness:0.25,roughness:0.62});
  var rim1=new THREE.BoxGeometry(9.3,0.16,0.4),rim2=new THREE.BoxGeometry(0.4,0.16,9.3);
  [[0,-0.02,4.35,rim1],[0,-0.02,-4.35,rim1],[4.35,-0.02,0,rim2],[-4.35,-0.02,0,rim2]].forEach(function(d){
    var m=new THREE.Mesh(d[3],gold);m.position.set(d[0],d[1],d[2]);m.receiveShadow=true;boardGroup.add(m);
  });
  var base=new THREE.Mesh(new THREE.BoxGeometry(10.4,0.5,10.4),new THREE.MeshStandardMaterial({color:0x0e0c08,roughness:0.6,metalness:0.3}));
  base.position.y=-0.34;base.receiveShadow=true;boardGroup.add(base);
  /* floor */
  var floor=new THREE.Mesh(new THREE.PlaneGeometry(60,60),(floorMat=new THREE.MeshStandardMaterial({color:0x0b0b10,roughness:1})));
  floor.rotation.x=-Math.PI/2;floor.position.y=-0.6;floor.receiveShadow=true;scene.add(floor);

  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  containerEl.appendChild(renderer.domElement);

  renderer.domElement.addEventListener('pointerdown',onDown);
  renderer.domElement.addEventListener('pointermove',onMove);
  renderer.domElement.addEventListener('pointerup',onUp);
  renderer.domElement.addEventListener('pointercancel',onUp);
  renderer.domElement.addEventListener('dblclick',function(){zoom.t=1});
  window.addEventListener('resize',resize);
  resize();
  RV3.ready=true;if(window.RCSettings)RV3.settings(window.RCSettings);
}
var obliqueM=null;
function applyProj(){
  if(!obliqueM){var b=0.52,h=12;obliqueM=new THREE.Matrix4().set(1,0,0,0, 0,1,b,h*b, 0,0,1,0, 0,0,0,1)}
  camera.updateProjectionMatrix();
  camera.projectionMatrix.multiply(obliqueM);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
}
function resize(){
  if(!renderer||!containerEl)return;
  var w=containerEl.clientWidth||300,h=containerEl.clientHeight||300;
  renderer.setSize(w,h,false);
  var S=window.__rvS||4.60,a=w/h;
  camera.left=-S*a;camera.right=S*a;camera.top=S;camera.bottom=-S;
  applyProj();
}
function applyOrient(){
  var r=orient==='b'?Math.PI:0;
  if(boardGroup)boardGroup.rotation.y=r;
  if(pieceGroup)pieceGroup.rotation.y=r;
  if(hlGroup)hlGroup.rotation.y=r;
  if(fxGroup)fxGroup.rotation.y=r;
}

/* ---------- input ---------- */
function pickSquare(e,pieceFirst){
 var rect=renderer.domElement.getBoundingClientRect();var nx=((e.clientX-rect.left)/rect.width)*2-1,ny=-((e.clientY-rect.top)/rect.height)*2+1;
 var p1=new THREE.Vector3(nx,ny,-1).unproject(camera),p2=new THREE.Vector3(nx,ny,1).unproject(camera);raycaster.set(p1,p2.sub(p1).normalize());
 if(pieceFirst){var pm=pieceGroup?raycaster.intersectObjects(pieceGroup.children,true)[0]:null;if(pm){var o=pm.object;while(o&&!(o.userData&&o.userData.type))o=o.parent;if(o)return o.userData.sq}}
 var hit=new THREE.Vector3();if(raycaster.ray.intersectPlane(planeY0,hit)){if(orient==='b'){hit.x=-hit.x;hit.z=-hit.z}return sqFromPoint(hit)}return null;
}
function onDown(e){
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===1){dragFrom=pickSquare(e,true);try{e.target.setPointerCapture(e.pointerId)}catch(x){}}else dragFrom=null;
  if(pointers.size===1)tapInfo={x:e.clientX,y:e.clientY,t:Date.now(),moved:false};
  else tapInfo=null;
}
function onMove(e){
  var p=pointers.get(e.pointerId);if(!p)return;
  var dx=e.clientX-p.x,dy=e.clientY-p.y;
  if(pointers.size===1){
    if(tapInfo&&(Math.abs(e.clientX-tapInfo.x)+Math.abs(e.clientY-tapInfo.y)>12))tapInfo.moved=true;
    /* straight view: one-finger drag does not tilt the board */
  }else if(pointers.size===2){
    var arr=[].slice.call(pointers.values());
    var other=arr[0]===p?arr[1]:arr[0];
    var dPrev=Math.hypot(p.x-other.x,p.y-other.y);
    p.x=e.clientX;p.y=e.clientY;
    var dNew=Math.hypot(p.x-other.x,p.y-other.y);
    if(dPrev>0)zoom.t=Math.min(1.6,Math.max(0.72,zoom.t*dNew/dPrev));
  }
  p.x=e.clientX;p.y=e.clientY;
}
function onUp(e){
  if(e.type==='pointercancel'){pointers.delete(e.pointerId);tapInfo=null;dragFrom=null;return;}
  if(tapInfo&&tapInfo.moved&&pointers.size===1&&dragFrom){var to=pickSquare(e,false);if(to&&to!==dragFrom&&window.__rvDrag)window.__rvDrag(dragFrom,to);pointers.delete(e.pointerId);tapInfo=null;dragFrom=null;return;}
  var p=pointers.get(e.pointerId);pointers.delete(e.pointerId);
  if(tapInfo&&!tapInfo.moved&&Date.now()-tapInfo.t<400&&p){
    var rect=renderer.domElement.getBoundingClientRect();
    var nx=((e.clientX-rect.left)/rect.width)*2-1,ny=-((e.clientY-rect.top)/rect.height)*2+1;
    var p1=new THREE.Vector3(nx,ny,-1).unproject(camera);
    var p2=new THREE.Vector3(nx,ny,1).unproject(camera);
    raycaster.set(p1,p2.sub(p1).normalize());
    var pm=pieceGroup?raycaster.intersectObjects(pieceGroup.children,true)[0]:null;
    if(pm){
      var o=pm.object;while(o&&!(o.userData&&o.userData.type))o=o.parent;
      if(o){var sq2=sqFromPoint(o.position);if(sq2&&window.__rvTap){window.__rvTap(sq2);tapInfo=null;return}}
    }
    var hit=new THREE.Vector3();
    if(raycaster.ray.intersectPlane(planeY0,hit)){
      if(orient==='b'){hit.x=-hit.x;hit.z=-hit.z}
      var sq=sqFromPoint(hit);
      if(sq&&window.__rvTap)window.__rvTap(sq);
    }
  }
  tapInfo=null;
}

/* ---------- highlights ---------- */
var hlMats={
  sel:new THREE.MeshBasicMaterial({color:0xffd94a,transparent:true,opacity:0.6,depthWrite:false}),
  last:new THREE.MeshBasicMaterial({color:0xffd94a,transparent:true,opacity:0.22,depthWrite:false}),
  check:new THREE.MeshBasicMaterial({color:0xff3344,transparent:true,opacity:0.55,depthWrite:false}),
  dot:new THREE.MeshBasicMaterial({color:0x18e88a,transparent:true,opacity:0.95,depthWrite:false}),
  cap:new THREE.MeshBasicMaterial({color:0xff5533,transparent:true,opacity:0.85,depthWrite:false,side:THREE.DoubleSide})
};
function flat(geo,mat,sq,y){
  var m=new THREE.Mesh(geo,mat);var p=sqPos(sq);
  m.rotation.x=-Math.PI/2;m.position.set(p.x,y||0.012,p.z);
  return m;
}
var hlGeoSq=new THREE.PlaneGeometry(1,1),hlGeoDot=new THREE.CircleGeometry(0.17,24),hlGeoRing=new THREE.RingGeometry(0.38,0.5,28);
function drawHighlights(st){
  while(hlGroup.children.length)hlGroup.remove(hlGroup.children[0]);
  if(st.last){hlGroup.add(flat(hlGeoSq,hlMats.last,st.last.from,0.011));hlGroup.add(flat(hlGeoSq,hlMats.last,st.last.to,0.011))}
  if(st.check)hlGroup.add(flat(hlGeoSq,hlMats.check,st.check,0.013));
  if(st.selected)hlGroup.add(flat(hlGeoSq,hlMats.sel,st.selected,0.012));
  (st.legal||[]).forEach(function(m){
    hlGroup.add(flat(m.cap?hlGeoRing:hlGeoDot,m.cap?hlMats.cap:hlMats.dot,m.to,0.014));
  });
}

/* ---------- sync & animation ---------- */
function removeMesh(m){pieceGroup.remove(m)}
function placeAt(m,sq){var p=sqPos(sq);m.position.set(p.x,0,p.z);m.userData.sq=sq}
function spawnPop(m){m.scale.set(0.01,0.01,0.01);anims.push({m:m,t:0,dur:0.22,pop:true})}

function reconcile(want){
  /* remove meshes for squares no longer occupied or whose piece changed */
  Object.keys(meshes).forEach(function(sq){
    var m=meshes[sq],w=want[sq];
    if(!w||w.type!==m.userData.type||w.color!==m.userData.color){removeMesh(m);delete meshes[sq]}
  });
  /* add/align meshes for wanted squares */
  Object.keys(want).forEach(function(sq){
    var w=want[sq];
    if(!meshes[sq]){
      var m=createPiece(w.type,w.color);
      placeAt(m,sq);pieceGroup.add(m);meshes[sq]=m;spawnPop(m);
    }else if(meshes[sq].userData.sq!==sq){
      placeAt(meshes[sq],sq);
    }
  });
}

RV3.sync=function(st){
  lastState=st;
  if(RV3.ready)applyTheme(st.theme);
  if(!RV3.ready)return;
  if(st.orient&&st.orient!==orient){orient=st.orient;applyOrient()}
  drawHighlights(st);
  Object.keys(meshes).forEach(function(sq){var m=meshes[sq];if((m.userData.type==='k'||m.userData.type==='q')&&sq===st.selected){hlGroup.add(flat(new THREE.RingGeometry(.35,.43,32),hlMats.sel,sq,.025))}});
  if(!pieceGroup)return;
  var want={};
  st.board.forEach(function(row){row.forEach(function(c){if(c)want[c.square]={type:c.type,color:c.color}})});
  var mv=window.__rvMove;window.__rvMove=null;
  var jump=window.__rvJump;window.__rvJump=false;

  if(mv&&!jump&&meshes[mv.from]&&want[mv.to]&&meshes[mv.from].userData.type===(mv.promotion?'p':want[mv.to].type)&&meshes[mv.from].userData.color===want[mv.to].color){
    /* glide the mover */
    var m=meshes[mv.from];
    delete meshes[mv.from];
    var captured=meshes[mv.to]||null;
    if(mv.flags.indexOf('e')>=0){ /* en passant: pawn sits beside 'to' */
      var epSq=mv.to[0]+mv.from[1];
      if(meshes[epSq]){captured=meshes[epSq];delete meshes[epSq]}
    }else if(meshes[mv.to]){delete meshes[mv.to]}
    meshes[mv.to]=m;m.userData.sq=mv.to;
    var from=m.position.clone(),to=new THREE.Vector3(sqPos(mv.to).x,0,sqPos(mv.to).z);
    anims.push({m:m,from:from,to:to,t:0,dur:window.RCSettings?.motion==='swift'?.12:window.RCSettings?.motion==='calm'?.38:.24,glide:true,done:function(){
      if(mv.promotion){RV3.fx('blast',mv.to);removeMesh(m);delete meshes[mv.to];reconcile(want)}
      else reconcile(want);
    }});
    if(captured)anims.push({m:captured,t:0,dur:0.20,shrink:true,done:function(){removeMesh(captured)}});
  }else{
    reconcile(want);
  }
};

function stepAnims(dt){
  for(var i=anims.length-1;i>=0;i--){
    var a=anims[i];
    a.t+=dt;
    if(a.t<0)continue;
    var k=Math.min(1,a.t/a.dur);
    if(a.glide){
      var e=k<0.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
      a.m.position.lerpVectors(a.from,a.to,e);
      a.m.position.y=Math.sin(Math.PI*e)*0.45;
    }else if(a.shrink){
      var s=Math.max(0.001,1-k);a.m.scale.set(s,s,s);
    }else if(a.pop){
      var s2=0.01+0.99*k;a.m.scale.set(s2,s2,s2);
    }
    if(k>=1){if(a.glide)a.m.position.copy(a.to);anims.splice(i,1);if(a.done)a.done()}
  }
}

/* ---------- fx: capture blast + win celebration ---------- */
var fxParts=[];
function addFx(m,vx,vy,vz,rx,ry,dur,grav,fade){fxParts.push({m:m,vx:vx,vy:vy,vz:vz,rx:rx||0,ry:ry||0,t:0,dur:dur,grav:grav===undefined?-9:grav,fade:fade!==false,s0:m.scale.x});fxGroup.add(m)}
function stepFx(dt){
  for(var i=fxParts.length-1;i>=0;i--){
    var p=fxParts[i];p.t+=dt;var k=Math.min(1,p.t/p.dur);
    p.m.position.x+=p.vx*dt;p.m.position.y+=p.vy*dt;p.m.position.z+=p.vz*dt;
    p.vy+=p.grav*dt;
    p.m.rotation.x+=p.rx*dt;p.m.rotation.y+=p.ry*dt;
    if(p.grow){var g=1+3.2*k;p.m.scale.set(g,g,g);p.m.material.opacity=Math.max(0,0.95*(1-k))}
    else if(p.fade){var s=Math.max(0.001,p.s0*(1-k));p.m.scale.set(s,s,s)}
    if(k>=1){fxGroup.remove(p.m);if(p.m.geometry)p.m.geometry.dispose();if(p.m.material)p.m.material.dispose();fxParts.splice(i,1)}
  }
}
RV3.fxCount=function(){return fxParts.length};
RV3.fx=function(kind,sq){
  if(!RV3.ready)return;
  var i;
  if(kind==='blast'&&sq){
    var sp=sqPos(sq);
    for(i=0;i<30;i++){
      var sz=0.16+Math.random()*0.10;
      var m=new THREE.Mesh(new THREE.BoxGeometry(sz,sz,sz),new THREE.MeshBasicMaterial({color:i%3?0xffb547:0xfff2c8}));
      m.position.set(sp.x,0.3,sp.z);
      var a=Math.random()*Math.PI*2,v=1.6+Math.random()*2.6;
      addFx(m,Math.cos(a)*v,2.6+Math.random()*2.6,Math.sin(a)*v,(Math.random()-0.5)*9,(Math.random()-0.5)*9,0.8+Math.random()*0.25);
    }
    var ring=new THREE.Mesh(new THREE.RingGeometry(0.22,0.42,28),new THREE.MeshBasicMaterial({color:0xffd54a,side:THREE.DoubleSide,transparent:true,opacity:0.95,depthWrite:false}));
    ring.rotation.x=-Math.PI/2;ring.position.set(sp.x,0.1,sp.z);
    fxParts.push({m:ring,vx:0,vy:0,vz:0,rx:0,ry:0,t:0,dur:0.5,grav:0,fade:false,grow:true,s0:1});fxGroup.add(ring);
  }else if(kind==='celebrate'){
    var cols=[0xffd54a,0x18e88a,0xff6b8a,0x59b7ff,0xffffff];
    for(i=0;i<50;i++){
      var c=new THREE.Mesh(new THREE.PlaneGeometry(0.16,0.22),new THREE.MeshBasicMaterial({color:cols[i%5],side:THREE.DoubleSide}));
      c.position.set((Math.random()-0.5)*8.6,4.6+Math.random()*3.4,(Math.random()-0.5)*8.6);
      c.rotation.set(Math.random()*3,Math.random()*3,0);
      addFx(c,(Math.random()-0.5)*0.6,-1.6-Math.random()*1.1,(Math.random()-0.5)*0.6,(Math.random()-0.5)*6,(Math.random()-0.5)*6,3.2+Math.random()*0.8,0,false);
    }
  }
};

/* ---------- main loop ---------- */
function loop(t){
  if(!RV3.active)return;
  rafId=requestAnimationFrame(loop);
  var dt=Math.min(0.1,(t-lastT)/1000||0.016);lastT=t;
  if(dt>0){var f=1/dt;fpsAvg=fpsAvg*0.95+f*0.05}
  if(fpsAvg<26&&shadowsOn){lowFrames++;if(lowFrames>90){renderer.shadowMap.enabled=false;shadowsOn=false;dir_light_off();}}
  if(Math.abs(zoom.z-zoom.t)>0.0004){zoom.z+=(zoom.t-zoom.z)*Math.min(1,dt*9);camera.zoom=zoom.z;applyProj()}
  stepAnims(dt);
  stepFx(dt);
  renderer.render(scene,camera);
}
function dir_light_off(){ /* called once on sustained low fps */
  scene.traverse(function(o){if(o.isDirectionalLight)o.castShadow=false});
}


RV3.attach=function(el){
  containerEl=el;
  if(!renderer)init();
  else if(renderer.domElement.parentNode!==el){el.appendChild(renderer.domElement);resize()}
};
RV3.setActive=function(on){
  RV3.active=!!on;
  if(RV3.active&&renderer){resize();lastT=performance.now();cancelAnimationFrame(rafId);rafId=requestAnimationFrame(loop)}
  else cancelAnimationFrame(rafId);
};
RV3.project=function(sq){if(!camera||!renderer)return null;var p=sqPos(sq);var v=new THREE.Vector3(p.x,0,p.z);if(pieceGroup)v=pieceGroup.localToWorld(v);v.project(camera);var r=renderer.domElement.getBoundingClientRect();return{x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height}};
RV3.settings=function(o){if(o.pieces&&pieceStyle!==o.pieces){pieceStyle=o.pieces;Object.keys(meshes).forEach(function(sq){removeMesh(meshes[sq])});meshes={};if(lastState)RV3.sync(lastState)}if(mainLight){mainLight.intensity=o.light==='soft'?.75:o.light==='bright'?1.4:1.1;ambientLight.intensity=o.light==='soft'?.65:.45}};
RV3.stats=function(){return{theme:themeKey,fps:Math.round(fpsAvg),pieces:Object.keys(meshes).length,tris:renderer?renderer.info.render.triangles:0,shadows:shadowsOn,zoom:+zoom.z.toFixed(2),proj:'oblique'}};
})();
if(window.__rvApplyView)window.__rvApplyView();
