const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('brain',{
  get:()=>ipcRenderer.invoke('state'),
  action:(type,payload)=>ipcRenderer.invoke('action',type,payload),
  system:(type,payload)=>ipcRenderer.invoke('system',type,payload),
  onState:callback=>{const handler=(_,state)=>callback(state);ipcRenderer.on('state',handler);return()=>ipcRenderer.removeListener('state',handler);},
  listApps:()=>ipcRenderer.invoke('listApps'),
  overlay:(choice)=>ipcRenderer.send('overlay',choice),
  onOverlay:callback=>{const handler=(_,state)=>callback(state);ipcRenderer.on('overlay',handler);return()=>ipcRenderer.removeListener('overlay',handler);},
  onActivation:callback=>{const handler=(_,r)=>callback(r);ipcRenderer.on('activation',handler);return()=>ipcRenderer.removeListener('activation',handler);}
});
