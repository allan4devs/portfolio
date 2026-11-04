const { app, BrowserWindow } = require('electron');

const url = process.env.LOCAL_URL || process.argv[2] || 'http://localhost:3000/comp';

app.whenReady().then(() => {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Local Website Preview',
    autoHideMenuBar: true,
  });

  const requests = new Map();
  window.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r'))) {
      event.preventDefault();
      window.webContents.reload();
    }
  });
  const send = (event, details) => {
    const request = requests.get(details.id);
    if (!request) return;
    requests.delete(details.id);
    if (request.url.includes('/__nextjs_') || request.url.includes('/_next/webpack-hmr') || /\/_next\/static\/webpack\//.test(request.url)) return;
    const entry = { ...request, duration: Date.now() - request.start, status: details.statusCode || details.error };
    window.webContents.executeJavaScript(`window.__localViewerAdd(${JSON.stringify(entry)})`).catch(() => {});
  };

  window.webContents.session.webRequest.onBeforeRequest((details, callback) => {
    requests.set(details.id, { start: Date.now(), url: details.url, type: details.resourceType });
    callback({});
  });
  window.webContents.session.webRequest.onCompleted((details) => send('complete', details));
  window.webContents.session.webRequest.onErrorOccurred((details) => send('error', details));

  window.webContents.on('did-finish-load', () => {
    window.webContents.executeJavaScript(`(() => {
      if (document.getElementById('__local-viewer')) return;
      const bar = document.createElement('aside'); bar.id = '__local-viewer';
      bar.style.cssText = 'position:fixed;z-index:2147483647;top:0;left:0;right:0;height:34px;background:#111827;color:#e5e7eb;font:12px Segoe UI,Arial;display:flex;align-items:center;padding:0 10px;gap:10px;box-shadow:0 2px 8px #0006';
      bar.innerHTML = '<button id="__lv_toggle">Hide</button><button id="__lv_clear">Clear</button><button id="__lv_mongo">Mongo: load 1,000 jobs</button><b>Page load</b><span id="__lv_stats">Waiting for requests…</span><span id="__lv_mongo_result" style="margin-left:auto;color:#a7f3d0"></span>';
      const panel = document.createElement('div'); panel.id='__lv_panel';
      panel.style.cssText='position:fixed;z-index:2147483646;top:34px;left:0;right:0;height:150px;overflow:auto;background:#111827;color:#e5e7eb;font:12px Segoe UI,Arial;padding:5px 10px';
      document.documentElement.append(bar,panel);
      const style=document.createElement('style');style.textContent='#__local-viewer button{background:#374151;color:white;border:0;border-radius:4px;padding:4px 8px;cursor:pointer}';document.head.append(style);
      let count=0,total=0; window.__localViewerAdd=(r)=>{count++;total+=r.duration;const row=document.createElement('div');row.style.cssText='display:grid;grid-template-columns:65px 55px 1fr 75px;border-bottom:1px solid #293241;padding:3px 0;gap:8px';[r.type,r.status,r.url,r.duration+' ms'].forEach(v=>{const s=document.createElement('span');s.textContent=v;s.title=v;s.style.overflow='hidden';s.style.textOverflow='ellipsis';row.append(s)});panel.prepend(row);document.getElementById('__lv_stats').textContent=count+' page requests · '+total+' ms cumulative'};
      document.getElementById('__lv_toggle').onclick=()=>{const hidden=panel.hidden=!panel.hidden;bar.style.height=hidden?'34px':'34px';document.getElementById('__lv_toggle').textContent=hidden?'Show':'Hide'};
      document.getElementById('__lv_clear').onclick=()=>{panel.replaceChildren();count=0;total=0;document.getElementById('__lv_stats').textContent='Cleared'};
      document.getElementById('__lv_mongo').onclick=async()=>{const out=document.getElementById('__lv_mongo_result');out.textContent='Loading…';try{const start=performance.now();const response=await fetch('/api/comp/benchmark',{cache:'no-store'});const result=await response.json();if(!response.ok)throw Error(result.error||response.status);out.textContent='MongoDB: '+result.count+'/1,000 jobs · query '+result.elapsedMs+' ms · total '+Math.round(performance.now()-start)+' ms'}catch(error){out.textContent='MongoDB test failed: '+error.message}};
    })()`);
  });

  window.loadURL(url);
});

app.on('window-all-closed', () => app.quit());
