const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('brain',{
  get:()=>ipcRenderer.invoke('state'),
  action:(type,payload)=>ipcRenderer.invoke('action',type,payload),
  system:(type)=>ipcRenderer.invoke('system',type),
  onState:callback=>{const handler=(_,state)=>callback(state);ipcRenderer.on('state',handler);return()=>ipcRenderer.removeListener('state',handler);},
  listApps:()=>ipcRenderer.invoke('listApps'),
  overlay:(choice)=>ipcRenderer.send('overlay',choice),
  onOverlay:callback=>{const handler=(_,state)=>callback(state);ipcRenderer.on('overlay',handler);return()=>ipcRenderer.removeListener('overlay',handler);}
});
