// Browser events are latched, then consumed on simulation ticks. Shot staging lives elsewhere.
export function createInput(canvas,onLockChange){
  const state={keys:new Set(),pressed:new Set(),locked:false,firing:false,lookX:0,lookY:0};
  window.addEventListener('keydown',e=>{if(!e.repeat)state.pressed.add(e.code);state.keys.add(e.code);if(['Space','Tab','ControlLeft','ControlRight'].includes(e.code))e.preventDefault();});
  window.addEventListener('keyup',e=>state.keys.delete(e.code));
  window.addEventListener('blur',()=>{state.keys.clear();state.pressed.clear();state.firing=false;});
  window.addEventListener('mousemove',e=>{if(state.locked){state.lookX+=e.movementX;state.lookY+=e.movementY;}});
  window.addEventListener('mousedown',e=>{if(state.locked&&e.button===0)state.firing=true;});
  window.addEventListener('mouseup',e=>{if(e.button===0)state.firing=false;});
  document.addEventListener('pointerlockchange',()=>{state.locked=document.pointerLockElement===canvas;if(!state.locked){state.keys.clear();state.firing=false;}onLockChange(state.locked);});
  return {state,requestLock(){try{const promise=canvas.requestPointerLock();promise?.catch(()=>{});}catch{}},release(){if(document.pointerLockElement)document.exitPointerLock();}};
}
