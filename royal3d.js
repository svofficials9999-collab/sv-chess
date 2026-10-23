/* ROYAL CHESS 3D view - Three.js r147, gold & obsidian, tap-to-move with orbit camera.
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
var boardGroup,pieceGroup,hlGroup;
var meshes={};           /* sq -> group */
var geoCache={},matCache={};
var cam={theta:0,phi:0.62,r:11.9,tTheta:0,tPhi:0.62,tR:11.9};
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
function lathe(pts,seg){return new THREE.LatheGeometry(pts.map(function(p){return new THREE.Vector2(p[0],p[1])}),seg||28)}
function pieceGeo(type){
  if(geoCache[type])return geoCache[type];
  var g=[],v=function(a,b,c){return new THREE.Vector3(a,b,c)};
  if(type==='p'){
    g.push(lathe([[0.001,0],[0.30,0],[0.30,0.045],[0.17,0.10],[0.135,0.28],[0.19,0.32],[0.19,0.36],[0.10,0.38]]));
    var h=new THREE.SphereGeometry(0.135,20,16);h.translate(0,0.485,0);g.push(h);
  }else if(type==='r'){
    g.push(lathe([[0.001,0],[0.315,0],[0.315,0.05],[0.20,0.12],[0.175,0.48],[0.235,0.53],[0.235,0.58],[0.30,0.58],[0.30,0.70],[0.001,0.70]]));
    for(var i=0;i<4;i++){var b=new THREE.BoxGeometry(0.12,0.09,0.10);var a=i*Math.PI/2;b.translate(Math.cos(a)*0.24,0.735,Math.sin(a)*0.24);g.push(b)}
  }else if(type==='b'){
    g.push(lathe([[0.001,0],[0.30,0],[0.30,0.05],[0.16,0.11],[0.13,0.40],[0.215,0.47],[0.15,0.54],[0.085,0.66],[0.015,0.75]]));
    var t=new THREE.SphereGeometry(0.07,14,12);t.translate(0,0.79,0);g.push(t);
  }else if(type==='q'){
    g.push(lathe([[0.001,0],[0.335,0],[0.335,0.05],[0.175,0.12],[0.155,0.48],[0.26,0.56],[0.19,0.62],[0.22,0.69],[0.26,0.75],[0.10,0.78],[0.001,0.78]]));
    for(var j=0;j<6;j++){var s=new THREE.SphereGeometry(0.05,10,8);var a2=j*Math.PI/3;s.translate(Math.cos(a2)*0.20,0.82,Math.sin(a2)*0.20);g.push(s)}
    var c=new THREE.SphereGeometry(0.085,14,12);c.translate(0,0.87,0);g.push(c);
  }else if(type==='k'){
    g.push(lathe([[0.001,0],[0.335,0],[0.335,0.05],[0.175,0.12],[0.155,0.50],[0.26,0.58],[0.185,0.64],[0.215,0.71],[0.25,0.77],[0.12,0.80],[0.001,0.80]]));
    var v1=new THREE.BoxGeometry(0.065,0.22,0.065);v1.translate(0,0.92,0);g.push(v1);
    var v2=new THREE.BoxGeometry(0.16,0.06,0.065);v2.translate(0,0.94,0);g.push(v2);
  }else if(type==='n'){
    g.push(lathe([[0.001,0],[0.31,0],[0.31,0.05],[0.195,0.12],[0.17,0.24],[0.235,0.30],[0.001,0.30]]));
    var s2=new THREE.Shape();
    s2.moveTo(-0.15,0.00);s2.lineTo(0.11,0.00);s2.lineTo(0.16,0.05);s2.lineTo(0.10,0.09);
    s2.lineTo(0.19,0.17);s2.lineTo(0.25,0.29);s2.lineTo(0.23,0.39);s2.lineTo(0.13,0.46);
    s2.lineTo(0.055,0.51);s2.lineTo(0.02,0.59);s2.lineTo(-0.03,0.51);s2.lineTo(-0.09,0.53);
    s2.lineTo(-0.15,0.43);s2.lineTo(-0.11,0.29);s2.lineTo(-0.15,0.15);s2.closePath();
    var ex=new THREE.ExtrudeGeometry(s2,{depth:0.16,bevelEnabled:true,bevelThickness:0.02,bevelSize:0.02,bevelSegments:2});
    ex.translate(0,0.28,-0.10);
    g.push(ex);
  }
  geoCache[type]=g;
  return g;
}
function mats(color){
  if(matCache[color])return matCache[color];
  var m=color==='w'
    ?new THREE.MeshStandardMaterial({color:0xd8b64a,metalness:0.85,roughness:0.30,emissive:0x241a02})
    :new THREE.MeshStandardMaterial({color:0x2b2b36,metalness:0.5,roughness:0.32,emissive:0x0b0b14});
  matCache[color]=m;return m;
}
function createPiece(type,color){
  var grp=new THREE.Group();
  pieceGeo(type).forEach(function(g){
    var mesh=new THREE.Mesh(g,mats(color));
    mesh.castShadow=true;mesh.receiveShadow=false;
    grp.add(mesh);
  });
  if(type==='n')grp.rotation.y=(color==='w'?Math.PI/2:-Math.PI/2);
  grp.userData={type:type,color:color};
  return grp;
}

/* ---------- scene ---------- */
function init(){
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x0b0b10);
  scene.fog=new THREE.Fog(0x0b0b10,16,30);
  camera=new THREE.PerspectiveCamera(40,1,0.1,100);
  raycaster=new THREE.Raycaster();
  planeY0=new THREE.Plane(new THREE.Vector3(0,1,0),0);

  var hemi=new THREE.HemisphereLight(0xfff3dd,0x1a1208,0.72);scene.add(hemi);
  var dir=new THREE.DirectionalLight(0xffe9c0,1.15);
  dir.position.set(4.5,9,2.5);dir.castShadow=true;
  dir.shadow.mapSize.set(1024,1024);
  dir.shadow.camera.left=-6;dir.shadow.camera.right=6;dir.shadow.camera.top=6;dir.shadow.camera.bottom=-6;
  dir.shadow.camera.far=24;dir.shadow.bias=-0.0004;
  scene.add(dir);
  var accent=new THREE.PointLight(0xd4af37,0.5,40);accent.position.set(-6,3.5,-6);scene.add(accent);

  boardGroup=new THREE.Group();pieceGroup=new THREE.Group();hlGroup=new THREE.Group();
  scene.add(boardGroup);scene.add(pieceGroup);scene.add(hlGroup);

  /* board squares */
  var lMat=new THREE.MeshStandardMaterial({color:0xe9dfc9,roughness:0.5,metalness:0.08});
  var dMat=new THREE.MeshStandardMaterial({color:0x3a2417,roughness:0.55,metalness:0.15});
  var sqGeo=new THREE.BoxGeometry(1,0.14,1);
  for(var f=0;f<8;f++)for(var r=0;r<8;r++){
    var sqm=new THREE.Mesh(sqGeo,((f+r)%2===1)?dMat:lMat);
    sqm.position.set(f-3.5,-0.07,3.5-r);
    sqm.receiveShadow=true;
    boardGroup.add(sqm);
  }
  /* gold frame + base */
  var gold=new THREE.MeshStandardMaterial({color:0xc9a227,metalness:0.9,roughness:0.28});
  var rim1=new THREE.BoxGeometry(9.3,0.16,0.4),rim2=new THREE.BoxGeometry(0.4,0.16,9.3);
  [[0,-0.02,4.35,rim1],[0,-0.02,-4.35,rim1],[4.35,-0.02,0,rim2],[-4.35,-0.02,0,rim2]].forEach(function(d){
    var m=new THREE.Mesh(d[3],gold);m.position.set(d[0],d[1],d[2]);m.receiveShadow=true;boardGroup.add(m);
  });
  var base=new THREE.Mesh(new THREE.BoxGeometry(10.4,0.5,10.4),new THREE.MeshStandardMaterial({color:0x0e0c08,roughness:0.6,metalness:0.3}));
  base.position.y=-0.34;base.receiveShadow=true;boardGroup.add(base);
  /* floor */
  var floor=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshStandardMaterial({color:0x0b0b10,roughness:1}));
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
  renderer.domElement.addEventListener('dblclick',function(){cam.tPhi=0.62;cam.tR=fitRadius();cam.tTheta=(orient==='w'?0:Math.PI)});
  window.addEventListener('resize',resize);
  resize();
  RV3.ready=true;
}
function resize(){
  if(!renderer||!containerEl)return;
  var w=containerEl.clientWidth||300,h=containerEl.clientHeight||300;
  renderer.setSize(w,h,false);
  camera.aspect=w/h;camera.updateProjectionMatrix();
  cam.tR=Math.max(cam.tR,fitRadius());
}

/* ---------- input ---------- */
function onDown(e){
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===1)tapInfo={x:e.clientX,y:e.clientY,t:Date.now(),moved:false};
  else tapInfo=null;
}
function onMove(e){
  var p=pointers.get(e.pointerId);if(!p)return;
  var dx=e.clientX-p.x,dy=e.clientY-p.y;
  if(pointers.size===1){
    if(tapInfo&&(Math.abs(e.clientX-tapInfo.x)+Math.abs(e.clientY-tapInfo.y)>12))tapInfo.moved=true;
    if(!tapInfo||tapInfo.moved){cam.tTheta+=dx*0.0062;cam.tPhi=Math.min(1.25,Math.max(0.55,cam.tPhi-dy*0.005))}
  }else if(pointers.size===2){
    var arr=[].slice.call(pointers.values());
    var other=arr[0]===p?arr[1]:arr[0];
    var dPrev=Math.hypot(p.x-other.x,p.y-other.y);
    p.x=e.clientX;p.y=e.clientY;
    var dNew=Math.hypot(p.x-other.x,p.y-other.y);
    if(dPrev>0)cam.tR=Math.min(15,Math.max(6,cam.tR*dPrev/dNew));
  }
  p.x=e.clientX;p.y=e.clientY;
}
function onUp(e){
  var p=pointers.get(e.pointerId);pointers.delete(e.pointerId);
  if(tapInfo&&!tapInfo.moved&&Date.now()-tapInfo.t<400&&p){
    var rect=renderer.domElement.getBoundingClientRect();
    var ndc=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
    raycaster.setFromCamera(ndc,camera);
    var hit=new THREE.Vector3();
    if(raycaster.ray.intersectPlane(planeY0,hit)){
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
      placeAt(m,sq);pieceGroup.add(m);meshes[sq]=m;
    }else if(meshes[sq].userData.sq!==sq){
      placeAt(meshes[sq],sq);
    }
  });
}

RV3.sync=function(st){
  lastState=st;
  if(!RV3.ready)return;
  if(st.orient&&st.orient!==orient){orient=st.orient;cam.tTheta+=Math.PI}
  drawHighlights(st);
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
    anims.push({m:m,from:from,to:to,t:0,dur:0.24,glide:true,done:function(){
      if(mv.promotion){removeMesh(m);delete meshes[mv.to];reconcile(want)}
      else reconcile(want);
    }});
    if(captured)anims.push({m:captured,t:0,dur:0.20,shrink:true,done:function(){removeMesh(captured)}});
  }else{
    reconcile(want);
    if(Object.keys(meshes).length>=32){var i=0;Object.keys(meshes).forEach(function(sq){var m=meshes[sq];m.scale.set(0.01,0.01,0.01);anims.push({m:m,t:-(i++*0.012),dur:0.22,pop:true})})}
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

/* ---------- main loop ---------- */
function loop(t){
  if(!RV3.active)return;
  rafId=requestAnimationFrame(loop);
  var dt=Math.min(0.1,(t-lastT)/1000||0.016);lastT=t;
  if(dt>0){var f=1/dt;fpsAvg=fpsAvg*0.95+f*0.05}
  if(fpsAvg<26&&shadowsOn){lowFrames++;if(lowFrames>90){renderer.shadowMap.enabled=false;shadowsOn=false;dir_light_off();}}
  var fr=fitRadius();
  if(cam.tR<fr)cam.tR=fr;
  if(cam.tR>18)cam.tR=18;
  cam.theta+=(cam.tTheta-cam.theta)*Math.min(1,dt*9);
  cam.phi+=(cam.tPhi-cam.phi)*Math.min(1,dt*9);
  cam.r+=(cam.tR-cam.r)*Math.min(1,dt*9);
  camera.position.set(Math.sin(cam.theta)*Math.sin(cam.phi)*cam.r,Math.cos(cam.phi)*cam.r,Math.cos(cam.theta)*Math.sin(cam.phi)*cam.r);
  camera.lookAt(0,0,0);
  stepAnims(dt);
  renderer.render(scene,camera);
}
function dir_light_off(){ /* called once on sustained low fps */
  scene.traverse(function(o){if(o.isDirectionalLight)o.castShadow=false});
}

function fitRadius(){
  if(!camera)return 11.9;
  var tanV=Math.tan(camera.fov*Math.PI/360),tanH=tanV*camera.aspect;
  var dir=new THREE.Vector3(Math.sin(cam.theta)*Math.sin(cam.phi),Math.cos(cam.phi),Math.cos(cam.theta)*Math.sin(cam.phi));
  var right=new THREE.Vector3().crossVectors(dir,new THREE.Vector3(0,1,0)).normalize();
  var up=new THREE.Vector3().crossVectors(right,dir).normalize();
  var need=6,i,p,pd,pr,pu;
  var C=[[-4.6,0,-4.6],[4.6,0,-4.6],[-4.6,0,4.6],[4.6,0,4.6],[-4.6,1.35,-4.6],[4.6,1.35,-4.6],[-4.6,1.35,4.6],[4.6,1.35,4.6]];
  for(i=0;i<8;i++){
    p=new THREE.Vector3(C[i][0],C[i][1],C[i][2]);
    pd=p.dot(dir);pr=Math.abs(p.dot(right));pu=Math.abs(p.dot(up));
    need=Math.max(need,pd+pr/(0.985*tanH),pd+pu/(0.985*tanV));
  }
  return Math.min(need,18);
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
RV3.project=function(sq){if(!camera||!renderer)return null;var p=sqPos(sq);var v=new THREE.Vector3(p.x,0,p.z).project(camera);var r=renderer.domElement.getBoundingClientRect();return{x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height}};
RV3.stats=function(){return{fps:Math.round(fpsAvg),pieces:Object.keys(meshes).length,tris:renderer?renderer.info.render.triangles:0,shadows:shadowsOn,r:+cam.r.toFixed(2),phi:+cam.phi.toFixed(2),aspect:+camera.aspect.toFixed(3),need:+fitRadius().toFixed(2)}};
})();
if(window.__rvApplyView)window.__rvApplyView();
