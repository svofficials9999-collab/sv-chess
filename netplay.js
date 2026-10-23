/* ROYAL CHESS remote play - WebRTC DataChannel, manual code exchange.
   No server, no account: codes are copied/pasted by the two players themselves.
   Optional STUN (Google public) only for different-network play; game data never leaves the two phones. */
(function(){
'use strict';
var pc=null,dc=null,role=null,myColor=null;
var NET={connected:false};
window.RVNET=NET;
var STUN=[{urls:'stun:stun.l.google.com:19302'}];

function $(id){return document.getElementById(id)}
function b64(s){return btoa(unescape(encodeURIComponent(s)))}
function ub64(s){return decodeURIComponent(escape(atob(s.replace(/\s+/g,''))))}
function setStatus(id,msg){var e=$(id);if(e)e.textContent=msg}

function waitIce(pc){
  return new Promise(function(res){
    if(pc.iceGatheringState==='complete')return res();
    var to=setTimeout(res,4000);
    pc.addEventListener('icegatheringstatechange',function(){
      if(pc.iceGatheringState==='complete'){clearTimeout(to);res()}
    });
  });
}
function useStun(){var c=$('net-stun');return !c||c.checked}

NET.create=function(){
  cleanup();
  role='host';myColor='w';
  pc=new RTCPeerConnection({iceServers:useStun()?STUN:[]});
  dc=pc.createDataChannel('chess');
  bindChannel();
  setStatus('net-status',t2('Creating game code...'));
  pc.createOffer().then(function(o){return pc.setLocalDescription(o)}).then(function(){return waitIce(pc)}).then(function(){
    $('net-offer').value=b64(JSON.stringify(pc.localDescription));
    setStatus('net-status',t2('Send this code to your friend (WhatsApp). Then paste their reply code below.'));
    showNetStep('host');
  }).catch(function(e){setStatus('net-status','Error: '+e.message)});
};
NET.join=function(){
  var code=$('net-paste-offer').value.trim();
  if(!code){setStatus('net-status',t2('Paste the code from your friend first.'));return}
  cleanup();
  role='guest';myColor='b';
  pc=new RTCPeerConnection({iceServers:useStun()?STUN:[]});
  pc.ondatachannel=function(ev){dc=ev.channel;bindChannel()};
  var desc;
  try{desc=JSON.parse(ub64(code))}catch(e){setStatus('net-status',t2('That code is not valid.'));return}
  setStatus('net-status',t2('Making reply code...'));
  pc.setRemoteDescription(desc).then(function(){return pc.createAnswer()}).then(function(a){return pc.setLocalDescription(a)}).then(function(){return waitIce(pc)}).then(function(){
    $('net-answer').value=b64(JSON.stringify(pc.localDescription));
    setStatus('net-status',t2('Send this reply code back to your friend.'));
    showNetStep('guest');
  }).catch(function(e){setStatus('net-status','Error: '+e.message)});
};
NET.accept=function(){
  var code=$('net-paste-answer').value.trim();
  if(!code){setStatus('net-status',t2('Paste the reply code first.'));return}
  var desc;
  try{desc=JSON.parse(ub64(code))}catch(e){setStatus('net-status',t2('That code is not valid.'));return}
  pc.setRemoteDescription(desc).catch(function(e){setStatus('net-status','Error: '+e.message)});
};
function showNetStep(s){
  $('net-step-host').style.display=s==='host'?'block':'none';
  $('net-step-guest').style.display=s==='guest'?'block':'none';
}
function bindChannel(){
  dc.onopen=function(){
    NET.connected=true;
    setStatus('net-status',t2('Connected! Starting game...'));
    if(role==='host')send({t:'start'});
    setTimeout(function(){startNetGame(myColor)},600);
  };
  dc.onmessage=function(ev){
    var m;try{m=JSON.parse(ev.data)}catch(e){return}
    if(window.__rvNetMsg)window.__rvNetMsg(m);
  };
  dc.onclose=function(){NET.connected=false;if(window.__rvNetClosed)window.__rvNetClosed()};
}
function send(o){if(dc&&dc.readyState==='open')dc.send(JSON.stringify(o))}
NET.send=send;
NET.myColor=function(){return myColor};
NET.isActive=function(){return NET.connected&&!!dc&&dc.readyState==='open'};
function startNetGame(color){if(window.__rvNetStart)window.__rvNetStart(color)}
function cleanup(){
  NET.connected=false;
  try{if(dc)dc.close()}catch(e){}
  try{if(pc)pc.close()}catch(e){}
  pc=null;dc=null;
}
NET.leave=function(){cleanup();setStatus('net-status',t2('Left the game.'))};
NET.debug=function(){return pc?{cs:pc.connectionState,ice:pc.iceConnectionState,gather:pc.iceGatheringState,sig:pc.signalingState,dc:dc?dc.readyState:null}:null};
function t2(s){return (window.RVI18N&&RVI18N.t)?RVI18N.t(s):s}
})();
