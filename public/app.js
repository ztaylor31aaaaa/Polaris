const PAGE_NAMES={home:"Home",play:"Game player",browser:"Web browser",discover:"Discover",library:"My library",toolkit:"Toolkit",ai:"AI workspace",changelog:"Changelog",feedback:"Feedback",settings:"Settings"};
const PAGE_ICONS={discover:"⌕",library:"▦",toolkit:"⌘",ai:"✧",changelog:"◷",feedback:"✉",settings:"⚙"};
const WISP_SERVERS=[
 "wss://girlspreples.org/wi/",
 "wss://boxcasa.net/wi/",
 "wss://shop.kristenblackburnvolleyballcamps.com/wi/",
 "wss://learn.southpadreislandkiteboarding.com/wi/",
 "wss://bananadogstore.com/socket/",
 "wss://aplusmartialarts-templehills.com/socket/",
 "wss://actingoutdoor.com/socket/",
 "wss://restorecounselingcenter.org/socket/"
];
const DEFAULT_SETTINGS={transport:"epoxy",loadTimeout:20000,restoreTabs:true,reducedMotion:false,showFullUrls:true,confirmClose:false};
function getSettings(){try{return {...DEFAULT_SETTINGS,...JSON.parse(localStorage.getItem("polaris-settings")||"{}")}}catch{return {...DEFAULT_SETTINGS}}}
let settings=getSettings();
const state={games:[],version:null,scramjet:null,bareMux:null,scramjetFrame:null,scramjetReady:false,browserUrl:"",activeWisp:"",tabs:[],activeTabId:null,settingsCategory:"browser"};
const root=document.querySelector("#page-content");
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function api(path,options={}){const headers={...(options.body instanceof FormData?{}:{"Content-Type":"application/json"}),...(options.headers||{})};const res=await fetch(path,{...options,headers});const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||"API request failed ("+res.status+")");return data}
function header(title,desc){return '<header class="page-heading"><p class="eyebrow">POLARIS WORKSPACE</p><h1>'+title+'</h1><p>'+desc+'</p></header>'}
function card(title,desc,meta=""){return '<article class="content-card"><h3>'+title+'</h3><p>'+desc+'</p>'+(meta?'<p class="muted">'+meta+'</p>':"")+'</article>'}
function toast(msg){const el=document.createElement("div");el.className="toast";el.textContent=msg;document.querySelector("#toast-area").append(el);setTimeout(()=>el.remove(),3200)}
function readLibrary(){try{return JSON.parse(localStorage.getItem("polaris-library")||"[]")}catch{return []}}
function shortcut(page,icon,label){return '<a class="shortcut" href="#'+page+'"><span class="shortcut-icon">'+icon+'</span><span>'+label+'</span></a>'}
function updateClock(){const now=new Date(),time=document.querySelector("#clock-time"),date=document.querySelector("#clock-date");if(!time||!date)return;time.textContent=now.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});date.textContent=now.toLocaleDateString([],{weekday:"long",day:"numeric",month:"long"})}
async function render(page){root.classList.remove("page-enter");root.innerHTML='<div class="loading">Loading '+esc(PAGE_NAMES[page])+'…</div>';try{const views={home,browser,discover,library,toolkit,ai,changelog,feedback,settings};root.innerHTML=await views[page]();requestAnimationFrame(()=>root.classList.add("page-enter"));bind(page);revealCards()}catch(e){root.innerHTML=header(PAGE_NAMES[page],"Something went wrong.")+'<div class="empty-state">'+esc(e.message)+'</div>'}}
function navigate(){
 const raw=location.hash.slice(1)||"home",key=raw.startsWith("play?")?"play":raw.startsWith("browser?")?"browser":(PAGE_NAMES[raw]?raw:"home");
 document.querySelectorAll(".rail-link").forEach(a=>a.classList.toggle("active",a.dataset.page===key));
 document.querySelector(".rail-home").classList.toggle("active",key==="home");
 const params=new URLSearchParams(raw.includes("?")?raw.slice(raw.indexOf("?")+1):"");
 const addressInput=document.querySelector("#global-address");
 if(key==="browser"&&params.get("url")){
  const url=params.get("url");
  let tab=state.tabs.find(t=>t.url===url);
  if(!tab){tab={id:crypto.randomUUID(),title:hostFromUrl(url),url,frameObj:null,loaded:false};state.tabs.push(tab)}
  state.activeTabId=tab.id;
  if(addressInput)addressInput.value=url;
 }else if(addressInput)addressInput.value="";
 document.querySelector("#sidebar").classList.remove("open");
 renderBrowserTabs();
 if(key==="play")renderGameViewer(params.get("url")||"",params.get("name")||"Game");
 else if(key==="browser"&&params.get("url"))renderBrowser(params.get("url"));
 else render(key)
}
async function home(){let status={status:"Checking"},stats={totalPlays:0},games={games:[]};try{[status,stats,games]=await Promise.all([api("/api/status"),api("/api/stats"),api("/api/games")])}catch{}state.games=games.games||[];const saved=readLibrary();return '<div class="home-page"><section class="home-hero"><h1 class="home-brand">polaris</h1><p class="home-tagline">your space, your tools, your games.</p><form class="home-search-wrap" id="home-search-form" autocomplete="off"><span class="search-symbol">⌕</span><input class="home-search" id="home-search" placeholder="Search Polaris or jump to a page…" aria-label="Search Polaris"><button class="search-submit" aria-label="Search">→</button><div class="search-results" id="search-results" hidden></div></form><div class="shortcut-row">'+shortcut("discover","⌕","Discover")+shortcut("library","▦","Library")+shortcut("toolkit","⌘","Toolkit")+shortcut("ai","✧","AI Workspace")+shortcut("feedback","✉","Feedback")+shortcut("settings","⚙","Settings")+'</div><div class="home-meta"><span class="meta-chip">● <strong>'+esc(status.status||"Online")+'</strong> · Polaris API</span><span class="meta-chip">▦ <strong>'+saved.length+'</strong> saved games</span><span class="meta-chip">↗ <strong>'+Number(stats.totalPlays||0)+'</strong> plays tracked</span></div><div class="clock-card"><div class="clock-time" id="clock-time">--:--</div><div class="clock-date" id="clock-date">Loading date…</div></div></section><section class="home-lower"><div class="home-widget"><div class="widget-head"><h2>Recently added</h2><a href="#library">Open library ↗</a></div>'+(saved.length?saved.slice(-3).reverse().map(g=>'<div class="recent-item"><span class="recent-icon">▣</span><strong>'+esc(g.name)+'</strong><small>Personal library</small></div>').join(""):'<div class="widget-empty">Your library is empty. Import an HTML game through Toolkit and it will appear here.</div>')+'</div><div class="home-widget"><div class="widget-head"><h2>Polaris services</h2><a href="#changelog">What’s new ↗</a></div><div class="recent-item"><span class="recent-icon">✦</span><strong>Core application</strong><small>'+esc(status.version||"v0.1.0")+'</small></div><div class="recent-item"><span class="recent-icon">⌘</span><strong>Game toolkit</strong><small>Local imports ready</small></div><div class="recent-item"><span class="recent-icon">✧</span><strong>AI workspace</strong><small>Setup pending</small></div></div></section></div>'}
const searchablePages=[["Web browser","browser","Open websites inside Polaris"],["Discover","discover","Browse the game catalogue"],["My library","library","Your saved games"],["Toolkit","toolkit","Import HTML games"],["AI workspace","ai","AI providers and tools"],["Changelog","changelog","Latest Polaris updates"],["Feedback","feedback","Send feedback"],["Settings","settings","Application preferences"]];
function renderGameViewer(rawUrl,name){
 let gameUrl;
 try{gameUrl=new URL(rawUrl,window.location.origin);if(!["http:","https:"].includes(gameUrl.protocol))throw Error("Unsupported game URL")}
 catch{root.innerHTML=header("Cannot open game","The game URL is invalid or unsupported.")+'<button class="button" id="return-discover">Back to Discover</button>';document.querySelector("#return-discover").addEventListener("click",()=>location.hash="discover");return}
 root.classList.remove("page-enter");
 root.innerHTML='<section class="game-player"><div class="game-player-toolbar"><button class="game-player-back" id="game-back" type="button">← <span>Discover</span></button><div class="game-player-title"><span class="game-player-live"></span><strong>'+esc(name)+'</strong><small>Running inside Polaris</small></div><div class="game-player-actions"><button class="game-player-action" id="game-reload" type="button" title="Reload game">↻</button><button class="game-player-action" id="game-fullscreen" type="button" title="Fullscreen">⛶</button></div></div><div class="game-frame-wrap"><iframe id="game-frame" class="game-frame" src="'+esc(gameUrl.href)+'" title="'+esc(name)+'" allow="fullscreen; autoplay; gamepad; clipboard-read; clipboard-write" allowfullscreen loading="eager"></iframe></div><p class="game-player-note">This game is embedded in Polaris. Some external sites may block iframe embedding.</p></section>';
 root.classList.add("page-enter");
 document.querySelector("#game-back").addEventListener("click",()=>location.hash="discover");
 document.querySelector("#game-reload").addEventListener("click",()=>{const frame=document.querySelector("#game-frame");frame.src=frame.src});
 document.querySelector("#game-fullscreen").addEventListener("click",()=>{const frame=document.querySelector("#game-frame");if(frame.requestFullscreen)frame.requestFullscreen().catch(()=>toast("Fullscreen was blocked by the browser."))});
}
function searchResults(q){const pages=searchablePages.filter(x=>(x[0]+" "+x[2]).toLowerCase().includes(q));const games=state.games.filter(g=>String(g.name||"").toLowerCase().includes(q)).slice(0,4);return [...pages.map(x=>({label:x[0],detail:x[2],href:"#"+x[1],icon:PAGE_ICONS[x[1]]})),...games.map(g=>({label:g.name,detail:g.category||"Game",href:"#discover",icon:"▣"}))].slice(0,7)}
const GAME_DATA_URL="https://sme-library.global.ssl.fastly.net/data/games.json";
function resolveGameUrl(src){
  if(typeof src!=="string"||!src.trim())return "";
  src=src.trim();
  if(/^https?:\/\//i.test(src)||src.startsWith("proxy"))return src;
  if(src.startsWith("/"))src=src.slice(1);
  src=src.replace(/^(apps|app)\//i,"");
  if(src.startsWith("slime/"))return window.location.origin+"/"+(src.endsWith("/")?src:src+"/");
  const isDirectory=!src.endsWith("/")&&!src.includes("#")&&!src.includes("?")&&!src.includes(".");
  return "https://sme-library.global.ssl.fastly.net/"+(isDirectory?src+"/":src);
}
function isCatalogueGame(game){
  const src=String(game.src||game.url||"");
  return Boolean(game&&game.name&&src&&!/(^|\/)signin\.html(?:[?#]|$)/i.test(src));
}
async function loadGameCatalogue(){
  const response=await fetch(GAME_DATA_URL+"?t="+Date.now(),{cache:"no-store"});
  if(!response.ok)throw new Error("Game catalogue returned "+response.status);
  const data=await response.json();
  if(!Array.isArray(data))throw new Error("Game catalogue format was invalid");
  return data.filter(isCatalogueGame).map((game,index)=>({
    id:game.id??index,
    name:String(game.name),
    description:String(game.description||game.category||"HTML game"),
    category:String(game.category||game.type||"Game"),
    image:game.image||game.cover||game.thumb||"",
    href:resolveGameUrl(game.src||game.url)
  })).filter(game=>game.href);
}
async function discover(){
  let catalogue=[];
  let catalogueError="";
  try{catalogue=await loadGameCatalogue()}catch(error){catalogueError=error.message}
  const localGames=[
    {name:"Locked Quiz",description:"Launch the Locked Quiz game.",category:"Snubby game",href:"/locked-quiz.html",icon:"LQ"},
    {name:"Math Lesson 1",description:"Open Math Lesson 1.",category:"Snubby game",href:"/games/snubby/snubby/mathlesson1.html",icon:"M1"}
  ];
  const seen=new Set(catalogue.map(g=>g.href));
  const games=[...catalogue,...localGames.filter(g=>!seen.has(g.href))];
  const tiles=games.map(g=>{
    const image=g.image?'<img class="game-tile-image" src="'+esc(/^https?:\/\//i.test(g.image)?g.image:"https://sme-library.global.ssl.fastly.net/data/app-icons/"+String(g.image).replace(/^\/?(?:data\/)?app-icons\//i,"").replace(/^appicon\//i,""))+'" alt="" loading="lazy">':'<span class="game-tile-icon">'+esc(g.icon||(g.name.slice(0,2).toUpperCase()))+'</span>';
    return '<button class="game-tile" type="button" data-game-url="'+esc(g.href)+'" data-game-name="'+esc(g.name)+'" data-game-search="'+esc((g.name+" "+g.description+" "+g.category).toLowerCase())+'" aria-label="Play '+esc(g.name)+'">'+image+'<span class="game-tile-name">'+esc(g.name)+'</span></button>';
  }).join("");
  state.games=games.map(g=>({name:g.name,category:g.category,url:g.href,description:g.description}));
  return header("Discover","Browse and launch games from the Polaris library.")+
    '<section class="section"><div class="section-heading-row"><h2 class="section-title">Game library</h2><span class="muted">'+games.length+' games</span></div>'+
    '<div class="toolbar"><input class="input" id="game-search" placeholder="Search games…" aria-label="Search games"></div>'+
    '<div class="game-library-grid" id="snubby-game-grid">'+(tiles||'<div class="empty-state">No HTML games were found in the catalogue.</div>')+'</div>'+
    (catalogueError?'<p class="muted">Online catalogue could not load ('+esc(catalogueError)+'). Showing locally included games.</p>':'')+
    '</section>';
}

function normaliseBrowseInput(value){
 const raw=String(value||"").trim();if(!raw)return "";
 if(/^https?:\/\//i.test(raw))return raw;
 if(/^localhost(?::\d+)?(?:\/|$)/i.test(raw))return "http://"+raw;
 if(/^[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?(?:\/.*)?$/i.test(raw))return "https://"+raw;
 return "https://duckduckgo.com/?q="+encodeURIComponent(raw);
}
async function browser(){return '<section class="polaris-browser browser-start"><div class="web-browser-empty"><div class="web-browser-mark">⌕</div><h2>Browse from Polaris</h2><p>Use the <strong>polaris://web</strong> bar above to search or enter a website address.</p><div class="web-browser-shortcuts"><button type="button" data-web-url="https://www.wikipedia.org/">Wikipedia</button><button type="button" data-web-url="https://www.mozilla.org/">Mozilla</button><button type="button" data-web-url="https://www.openstreetmap.org/">OpenStreetMap</button></div></div></section>'}
function hostFromUrl(value){try{return new URL(value).hostname.replace(/^www\./,"")}catch{return "New tab"}}
function activeTab(){return state.tabs.find(t=>t.id===state.activeTabId)||null}
function renderBrowserTabs(){
 const strip=document.querySelector("#browser-tab-strip");if(!strip)return;
 strip.innerHTML=state.tabs.map(tab=>'<button type="button" class="browser-tab '+(tab.id===state.activeTabId?"active":"")+'" data-tab-id="'+esc(tab.id)+'" title="'+esc(tab.title||"New tab")+'"><span class="browser-tab-favicon">◉</span><span class="browser-tab-title">'+esc(tab.title||"New tab")+'</span><span class="browser-tab-close" data-close-tab="'+esc(tab.id)+'" aria-label="Close tab">×</span></button>').join("")+'<button type="button" class="browser-new-tab" id="browser-new-tab" title="New tab" aria-label="New tab">+</button>';
 strip.querySelectorAll("[data-tab-id]").forEach(button=>button.addEventListener("click",e=>{if(e.target.closest("[data-close-tab]"))return;const tab=state.tabs.find(t=>t.id===button.dataset.tabId);if(tab){state.activeTabId=tab.id;location.hash=tab.url?"browser?url="+encodeURIComponent(tab.url):"browser"}}));
 strip.querySelectorAll("[data-close-tab]").forEach(button=>button.addEventListener("click",e=>{e.stopPropagation();closeBrowserTab(button.dataset.closeTab)}));
 strip.querySelector("#browser-new-tab")?.addEventListener("click",()=>createBrowserTab());
}
function createBrowserTab(url=""){
 const tab={id:crypto.randomUUID(),title:url?hostFromUrl(url):"New tab",url,frameObj:null,loaded:false};
 state.tabs.push(tab);state.activeTabId=tab.id;renderBrowserTabs();
 if(url)location.hash="browser?url="+encodeURIComponent(url);else location.hash="browser";
}
function closeBrowserTab(id){
 const index=state.tabs.findIndex(t=>t.id===id);if(index<0)return;
 const wasActive=state.activeTabId===id;state.tabs.splice(index,1);
 if(!state.tabs.length){createBrowserTab();return}
 if(wasActive){const next=state.tabs[Math.min(index,state.tabs.length-1)];state.activeTabId=next.id;location.hash=next.url?"browser?url="+encodeURIComponent(next.url):"browser"}
 else renderBrowserTabs();
}
function saveTabUrl(url){
 let tab=activeTab();
 if(!tab){tab={id:crypto.randomUUID(),title:hostFromUrl(url),url,frameObj:null,loaded:false};state.tabs.push(tab);state.activeTabId=tab.id}
 tab.url=url;tab.title=hostFromUrl(url);tab.loaded=false;renderBrowserTabs();
}
async function ensureScramjet(){
 if(state.scramjetReady&&state.scramjet&&state.bareMux)return;
 if(!("serviceWorker" in navigator))throw new Error("This browser does not support service workers, which Scramjet requires.");
 if(typeof window.$scramjetLoadController!=="function")throw new Error("Scramjet's browser runtime did not load. Check the proxy assets build.");
 if(!window.BareMux?.BareMuxConnection)throw new Error("BareMux did not load. Check the proxy assets build.");
 await navigator.serviceWorker.register("/sw.js",{scope:"/"});
 await navigator.serviceWorker.ready;
 const {ScramjetController}=window.$scramjetLoadController();
 const controller=new ScramjetController({files:{wasm:"/scram/scramjet.wasm.wasm",all:"/scram/scramjet.all.js",sync:"/scram/scramjet.sync.js"}});
 await controller.init();
 const connection=new window.BareMux.BareMuxConnection("/baremux/worker.js");
 state.scramjet=controller;state.bareMux=connection;state.scramjetReady=true;
}
async function renderBrowser(rawUrl){
 let target;
 try{target=new URL(rawUrl);if(!["http:","https:"].includes(target.protocol))throw Error()}
 catch{root.innerHTML='<div class="empty-state">That address is not valid. Enter a website address or search term in the polaris://web bar.</div>';return}
 state.browserUrl=target.href;saveTabUrl(target.href);
 root.classList.remove("page-enter");
 root.innerHTML='<section class="polaris-browser is-open"><div class="web-browser-frame-wrap"><div class="web-frame-loading" id="web-frame-loading"><span class="orbit-spinner"></span><span id="web-frame-loading-text">Connecting to a Wisp server…</span><small id="web-server-status"></small></div><div id="web-scramjet-host" class="web-scramjet-host" aria-label="Website content"></div></div></section>';
 const host=document.querySelector("#web-scramjet-host"),loading=document.querySelector("#web-frame-loading");
 if(!host||!loading)return;
 try{
  await ensureScramjet();
  const tab=activeTab();
  if(tab?.frameObj&&tab.loaded){host.replaceChildren(tab.frameObj.frame);state.scramjetFrame=tab.frameObj;loading.classList.add("is-hidden");return}
  const failures=[];
  for(let i=0;i<WISP_SERVERS.length;i++){
   const server=WISP_SERVERS[i];
   loading.querySelector("#web-frame-loading-text").textContent="Trying connection "+(i+1)+" of "+WISP_SERVERS.length+"…";
   loading.querySelector("#web-server-status").textContent=server;
   let frame=null;
   try{
    await state.bareMux.setTransport("/epoxy/index.mjs",[{wisp:server}]);
    frame=state.scramjet.createFrame();
    frame.frame.className="web-scramjet-frame";
    frame.frame.setAttribute("title","Polaris web browser");
    frame.frame.setAttribute("allow","fullscreen; autoplay; clipboard-read; clipboard-write");
    frame.frame.setAttribute("allowfullscreen","");
    host.replaceChildren(frame.frame);
    const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error("Page connection timed out")),settings.loadTimeout));
    await Promise.race([frame.go(target.href),timeout]);
    state.scramjetFrame=frame;state.activeWisp=server;
    const current=activeTab();if(current){current.frameObj=frame;current.loaded=true;current.url=target.href;current.title=hostFromUrl(target.href)}
    loading.classList.add("is-hidden");renderBrowserTabs();root.classList.add("page-enter");
    if(i>0)toast("Connected using backup server "+(i+1)+".");
    return;
   }catch(error){
    failures.push(server+": "+(error?.message||String(error)));
    try{frame?.frame?.remove()}catch{}
   }
  }
  throw new Error("Every configured Wisp server failed. "+failures.join(" | "));
 }catch(error){
  loading.classList.add("load-error");
  loading.innerHTML='<strong>Polaris could not load this page</strong><span>'+esc(error?.message||String(error))+'</span><button class="button" id="scramjet-retry" type="button">Try all servers again</button>';
  document.querySelector("#scramjet-retry")?.addEventListener("click",()=>{const tab=activeTab();if(tab)tab.loaded=false;renderBrowser(target.href)});
 }
}
async function library(){const items=readLibrary();return header("My library","Your personal collection of imported games.")+'<div class="panel"><p class="muted">Personal imports are stored in this browser. They are not published or shared with other users.</p></div><section class="section"><div class="list">'+(items.length?items.map(x=>'<div class="list-row"><div><strong>'+esc(x.name)+'</strong><br><small>'+esc(x.filename)+'</small></div><small>Added '+new Date(x.addedAt).toLocaleDateString()+'</small></div>').join(""):'<div class="empty-state">Your library is empty. Import a game using the Toolkit.</div>')+'</div></section>'}
async function toolkit(){return header("Toolkit","Import HTML games into your personal library and manage your local files.")+'<div class="panel"><h2 class="section-title">Import a game</h2><form id="import-form" class="form-stack"><label class="form-label">Game name<input class="input" name="name" required maxlength="80" placeholder="Enter a game name"></label><label class="form-label">HTML game file<input class="input" name="file" type="file" accept=".html,.htm,text/html" required></label><button class="button">Import to my library</button></form><p class="muted">Local imports are limited to 20 MB and stay in this browser.</p></div><section class="section"><h2 class="section-title">Shared games</h2><div id="published-games" class="empty-state">Checking storage availability…</div></section>'}
async function ai(){return header("AI workspace","A dedicated place for connected AI providers and tools.")+'<div class="panel"><h2 class="section-title">AI services</h2><p class="muted">The workspace is scaffolded. Provider connections, model selection and secure server-side API key handling are planned as a separate feature. API keys must never be stored in public frontend code.</p></div>'}
async function changelog(){const v=state.version||await api("/api/version");return header("Changelog","A record of Polaris development and releases.")+'<div class="list"><div class="list-row"><div><strong>Polaris interface redesign</strong><br><small>New browser-inspired navigation, compact icon rail and redesigned home workspace.</small></div><small>'+esc(v.version||"0.1.0")+'</small></div><div class="list-row"><div><strong>Polaris foundation created</strong><br><small>Application shell, cold-blue interface, navigation and Worker API foundation.</small></div><small>0.1.0</small></div></div>'}
async function feedback(){return header("Feedback","Send suggestions and report issues with Polaris.")+'<div class="panel"><form id="feedback-form" class="form-stack"><label class="form-label">Category<select class="select" name="type"><option>Suggestion</option><option>Bug report</option><option>Other</option></select></label><label class="form-label">Message<textarea class="textarea" name="message" maxlength="4000" required placeholder="Describe your feedback…"></textarea></label><button class="button">Submit feedback</button></form><p class="muted">The feedback destination is not configured yet. This form will not pretend to send successfully.</p></div>'}
async function settings(){
 const cats=[["browser","Browser","Tabs, startup and navigation"],["connection","Connection","Proxy transport and Wisp failover"],["appearance","Appearance","Motion and interface options"],["performance","Performance","Loading and resource options"],["privacy","Privacy","Local data and privacy controls"]];
 const cat=state.settingsCategory||"browser";
 const nav=cats.map(([id,label,desc])=>'<button type="button" class="settings-category '+(cat===id?"active":"")+'" data-settings-category="'+id+'"><strong>'+label+'</strong><small>'+desc+'</small></button>').join("");
 let body="";
 if(cat==="connection")body='<div class="setting-row"><div><strong>Proxy transport</strong><small>Epoxy is the currently installed and supported transport.</small></div><select class="select setting-control" id="setting-transport"><option value="epoxy">Epoxy (default)</option></select></div><div class="setting-row"><div><strong>Automatic Wisp failover</strong><small>Try the next server if a connection or initial page load fails.</small></div><span class="setting-pill">Enabled</span></div><div class="setting-row"><div><strong>Wisp server list</strong><small>'+WISP_SERVERS.length+' configured endpoints · tried in order</small></div><button class="button" id="test-wisp">Test servers</button></div>';
 if(cat==="browser")body='<div class="setting-row"><div><strong>Restore tabs on startup</strong><small>Keep your open tab list in this browser.</small></div><input type="checkbox" class="setting-control" id="setting-restore" '+(settings.restoreTabs?"checked":"")+'></div><div class="setting-row"><div><strong>Show full website addresses</strong><small>Display the full URL in the address bar.</small></div><input type="checkbox" class="setting-control" id="setting-full-urls" '+(settings.showFullUrls?"checked":"")+'></div><div class="setting-row"><div><strong>Confirm before closing tabs</strong><small>Ask before closing the final open tab.</small></div><input type="checkbox" class="setting-control" id="setting-confirm-close" '+(settings.confirmClose?"checked":"")+'></div>';
 if(cat==="appearance")body='<div class="setting-row"><div><strong>Reduce animations</strong><small>Use fewer transitions and animated effects.</small></div><input type="checkbox" class="setting-control" id="setting-motion" '+(settings.reducedMotion?"checked":"")+'></div><div class="setting-row"><div><strong>Colour theme</strong><small>Polaris navy, blue and cyan theme.</small></div><span class="setting-pill">Polaris</span></div>';
 if(cat==="performance")body='<div class="setting-row"><div><strong>Initial load timeout</strong><small>Time before a server is marked as failed.</small></div><select class="select setting-control" id="setting-timeout"><option value="12000" '+(settings.loadTimeout===12000?"selected":"")+'>12 seconds</option><option value="20000" '+(settings.loadTimeout===20000?"selected":"")+'>20 seconds</option><option value="30000" '+(settings.loadTimeout===30000?"selected":"")+'>30 seconds</option></select></div><div class="setting-row"><div><strong>Reuse Scramjet runtime</strong><small>Keep the controller initialised between tabs to reduce startup work.</small></div><span class="setting-pill">Enabled</span></div>';
 if(cat==="privacy")body='<div class="setting-row"><div><strong>Local library data</strong><small>Remove games imported into this browser.</small></div><button class="button" id="clear-library">Clear library</button></div><div class="setting-row"><div><strong>Tab data</strong><small>Open tabs and preferences are stored locally in this browser.</small></div><span class="setting-pill">Local only</span></div>';
 return header("Settings","Manage Polaris browser preferences.")+'<div class="settings-layout"><nav class="settings-categories" aria-label="Settings categories">'+nav+'</nav><section class="panel settings-content"><div class="settings-section-heading"><h2>'+cats.find(x=>x[0]===cat)[1]+'</h2><p>'+cats.find(x=>x[0]===cat)[2]+'</p></div>'+body+'</section></div>';
}
function revealCards(){const items=root.querySelectorAll(".content-card,.stat-card,.panel,.home-widget,.list-row,.page-heading");items.forEach((el,i)=>{el.classList.add("reveal-item");el.style.setProperty("--reveal-delay",Math.min(i,10)*45+"ms")});if(!("IntersectionObserver" in window)){items.forEach(el=>el.classList.add("is-visible"));return}const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("is-visible");observer.unobserve(entry.target)}}),{threshold:.08});items.forEach(el=>observer.observe(el))}
function openPalette(){let palette=document.querySelector("#command-palette");if(!palette){palette=document.createElement("div");palette.id="command-palette";palette.className="palette-backdrop";palette.innerHTML='<section class="command-palette" role="dialog" aria-modal="true" aria-label="Quick navigation"><div class="palette-input-row"><span>⌕</span><input id="palette-input" autocomplete="off" placeholder="Search pages and actions…"><kbd>ESC</kbd></div><div class="palette-hint">QUICK NAVIGATION</div><div id="palette-items" class="palette-items"></div><div class="palette-footer"><span>↑ ↓ to navigate</span><span>ENTER to open</span><span>CTRL K to toggle</span></div></section>';document.body.append(palette);palette.addEventListener("mousedown",e=>{if(e.target===palette)closePalette()});palette.querySelector("#palette-input").addEventListener("input",renderPaletteItems);palette.querySelector("#palette-input").addEventListener("keydown",e=>{const rows=[...palette.querySelectorAll(".palette-option")];let index=rows.findIndex(x=>x.classList.contains("selected"));if(e.key==="ArrowDown"){e.preventDefault();rows.forEach(x=>x.classList.remove("selected"));rows[(index+1+rows.length)%rows.length]?.classList.add("selected")}if(e.key==="ArrowUp"){e.preventDefault();rows.forEach(x=>x.classList.remove("selected"));rows[(index-1+rows.length)%rows.length]?.classList.add("selected")}if(e.key==="Enter"){e.preventDefault();(rows[index>=0?index:0])?.click()}})}palette.classList.add("visible");palette.querySelector("#palette-input").value="";renderPaletteItems();setTimeout(()=>palette.querySelector("#palette-input").focus(),30)}
function closePalette(){document.querySelector("#command-palette")?.classList.remove("visible")}
function renderPaletteItems(){const input=document.querySelector("#palette-input"),list=document.querySelector("#palette-items");if(!input||!list)return;const q=input.value.trim().toLowerCase();const actions=[...searchablePages.map(x=>({name:x[0],desc:x[2],icon:PAGE_ICONS[x[1]],run:()=>location.hash=x[1]})),{name:"Go to Home",desc:"Return to the Polaris home screen",icon:"⌂",run:()=>location.hash="home"},{name:"Refresh page",desc:"Reload the current Polaris page",icon:"↻",run:()=>location.reload()},{name:"Clear search",desc:"Clear the current search field",icon:"×",run:()=>{const s=document.querySelector("#home-search");if(s)s.value="";toast("Search cleared.")}}];const filtered=actions.filter(x=>(x.name+" "+x.desc).toLowerCase().includes(q));list.innerHTML=filtered.length?filtered.map((x,i)=>'<button class="palette-option '+(i===0?"selected":"")+'" data-index="'+i+'"><span class="palette-option-icon">'+x.icon+'</span><span><strong>'+esc(x.name)+'</strong><small>'+esc(x.desc)+'</small></span><kbd>↵</kbd></button>').join(""):'<div class="palette-no-results">No matching commands.</div>';[...list.querySelectorAll(".palette-option")].forEach((el,i)=>el.addEventListener("click",()=>{closePalette();filtered[i].run()}))}
function bind(page){if(page==="browser"){document.querySelectorAll("[data-web-url]").forEach(b=>b.addEventListener("click",()=>openBrowserAddress(b.dataset.webUrl)))}if(page==="home"){updateClock();if(window.polarisClock)clearInterval(window.polarisClock);window.polarisClock=setInterval(updateClock,1000);const input=document.querySelector("#home-search"),results=document.querySelector("#search-results");input.addEventListener("input",()=>{const q=input.value.trim().toLowerCase();if(!q){results.hidden=true;return}const matches=searchResults(q);results.innerHTML=matches.length?matches.map(x=>'<a class="search-result" href="'+x.href+'"><span>'+x.icon+'</span><strong>'+esc(x.label)+'</strong><small>'+esc(x.detail)+'</small></a>').join(""):'<div class="search-result">No matching pages or games.</div>';results.hidden=false});document.querySelector("#home-search-form").addEventListener("submit",e=>{e.preventDefault();const first=searchResults(input.value.trim().toLowerCase())[0];if(first)location.hash=first.href.slice(1);else if(input.value.trim())location.hash="discover"});document.addEventListener("click",e=>{if(!e.target.closest(".home-search-wrap"))results.hidden=true},{once:true})}if(page==="discover"){document.querySelector("#game-search").addEventListener("input",e=>{const q=e.target.value.trim().toLowerCase();document.querySelectorAll("#snubby-game-grid [data-game-search],#game-grid [data-game-search]").forEach(el=>{el.hidden=!el.dataset.gameSearch.includes(q)});});document.querySelector("#snubby-game-grid").addEventListener("click",e=>{const tile=e.target.closest("[data-game-url]");if(!tile)return;location.hash="play?url="+encodeURIComponent(tile.dataset.gameUrl)+"&name="+encodeURIComponent(tile.dataset.gameName)})}if(page==="toolkit"){api("/api/shared-games").then(d=>{const el=document.querySelector("#published-games");if(!el)return;el.textContent=d.storageConfigured?(d.games.length?d.games.map(g=>g.name).join(", "):"No shared games yet."):"Shared storage is currently disabled. Local imports still work normally."}).catch(e=>{const el=document.querySelector("#published-games");if(el)el.textContent=e.message});document.querySelector("#import-form").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget),file=f.get("file");if(!file||file.size>20*1024*1024)return toast("Choose an HTML file smaller than 20 MB.");const html=await file.text();if(!/<!doctype|<html/i.test(html))return toast("The selected file does not look like an HTML page.");const saved=readLibrary();saved.push({id:crypto.randomUUID(),name:f.get("name"),filename:file.name,html,addedAt:new Date().toISOString()});try{localStorage.setItem("polaris-library",JSON.stringify(saved));e.currentTarget.reset();toast("Game imported successfully.")}catch{toast("Browser storage is full. The game could not be saved.")}})}if(page==="feedback")document.querySelector("#feedback-form").addEventListener("submit",e=>{e.preventDefault();toast("Feedback API endpoint has not been configured yet.")});if(page==="settings"){document.querySelectorAll("[data-settings-category]").forEach(b=>b.addEventListener("click",()=>{state.settingsCategory=b.dataset.settingsCategory;render("settings")}));const save=(key,value)=>{settings[key]=value;localStorage.setItem("polaris-settings",JSON.stringify(settings));toast("Setting saved.")};document.querySelector("#setting-transport")?.addEventListener("change",e=>save("transport",e.target.value));document.querySelector("#setting-restore")?.addEventListener("change",e=>save("restoreTabs",e.target.checked));document.querySelector("#setting-full-urls")?.addEventListener("change",e=>save("showFullUrls",e.target.checked));document.querySelector("#setting-confirm-close")?.addEventListener("change",e=>save("confirmClose",e.target.checked));document.querySelector("#setting-motion")?.addEventListener("change",e=>{save("reducedMotion",e.target.checked);document.documentElement.classList.toggle("reduce-motion",e.target.checked)});document.querySelector("#setting-timeout")?.addEventListener("change",e=>save("loadTimeout",Number(e.target.value)));document.querySelector("#clear-library")?.addEventListener("click",()=>{if(confirm("Clear all locally imported games?")){localStorage.removeItem("polaris-library");toast("Personal library cleared.")}});document.querySelector("#test-wisp")?.addEventListener("click",async()=>{toast("Testing configured Wisp servers…");let ok=0;for(const url of WISP_SERVERS){try{await new Promise((resolve,reject)=>{const ws=new WebSocket(url),timer=setTimeout(()=>{ws.close();reject(Error("timeout"))},5000);ws.onopen=()=>{clearTimeout(timer);ws.close();resolve()};ws.onerror=()=>{clearTimeout(timer);reject(Error("failed"))}});ok++}catch{}}toast(ok+" of "+WISP_SERVERS.length+" WebSocket handshakes opened.")})}}
function openBrowserAddress(value,newTab=false){const next=normaliseBrowseInput(value);if(!next)return;if(newTab||!activeTab())createBrowserTab(next);else{const tab=activeTab();tab.url=next;tab.title=hostFromUrl(next);tab.loaded=false;tab.frameObj=null;renderBrowserTabs();const hash="browser?url="+encodeURIComponent(next);if(location.hash.slice(1)===hash)renderBrowser(next);else location.hash=hash}}
function setupGlobalAddressBar(){const form=document.querySelector("#global-address-form"),input=document.querySelector("#global-address");form.addEventListener("submit",e=>{e.preventDefault();openBrowserAddress(input.value)});document.querySelector("#web-back").addEventListener("click",()=>{const f=state.scramjetFrame?.frame;if(f)try{f.contentWindow.history.back()}catch{}});document.querySelector("#web-forward").addEventListener("click",()=>{const f=state.scramjetFrame?.frame;if(f)try{f.contentWindow.history.forward()}catch{}});document.querySelector("#web-reload").addEventListener("click",()=>{const tab=activeTab();if(tab){tab.loaded=false;tab.frameObj=null;renderBrowser(tab.url)}else if(location.hash.slice(1)==="browser")render("browser")});document.querySelector("#browser-new-tab")?.addEventListener("click",()=>createBrowserTab());}
async function init(){openPaletteSetup();setupGlobalAddressBar();document.querySelector("#menu-toggle").addEventListener("click",()=>document.querySelector("#sidebar").classList.toggle("open"));window.addEventListener("hashchange",navigate);document.documentElement.classList.toggle("reduce-motion",settings.reducedMotion);if(settings.restoreTabs){try{state.tabs=JSON.parse(localStorage.getItem("polaris-tabs")||"[]").filter(t=>t&&typeof t.id==="string").map(t=>({...t,frameObj:null,loaded:false}))}catch{state.tabs=[]}}if(!state.tabs.length)state.tabs=[{id:crypto.randomUUID(),title:"New tab",url:"",frameObj:null,loaded:false}];state.activeTabId=state.tabs[0].id;renderBrowserTabs();try{const [health,version]=await Promise.all([api("/api/health"),api("/api/version")]);state.version=version;document.querySelector("#status-dot").classList.add("online");document.querySelector("#api-pill").textContent="API online";document.querySelector("#footer-version").textContent="Version "+(version.version||"unknown")+" · "+(version.buildId||"development")}catch{document.querySelector("#status-dot").classList.add("offline");document.querySelector("#api-pill").textContent="API offline";document.querySelector("#footer-version").textContent="Could not connect to API"}navigate();setInterval(()=>{if(settings.restoreTabs)localStorage.setItem("polaris-tabs",JSON.stringify(state.tabs.map(({id,title,url})=>({id,title,url}))))},2500)}
function openPaletteSetup(){document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();const p=document.querySelector("#command-palette");p?.classList.contains("visible")?closePalette():openPalette()}if(e.key==="Escape")closePalette();if(e.key==="/"&&!["INPUT","TEXTAREA"].includes(document.activeElement.tagName)&&!e.ctrlKey&&!e.metaKey){e.preventDefault();openPalette()}});document.querySelectorAll(".browser-home,.shortcut,.button,.rail-link").forEach(el=>el.addEventListener("click",()=>{el.classList.remove("tap-pop");void el.offsetWidth;el.classList.add("tap-pop")}))}
init();