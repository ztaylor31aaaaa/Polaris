const VERSION="0.1.0";
const BUILD="polaris-foundation";
const HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer","vary":"Origin","access-control-allow-methods":"GET, POST, OPTIONS","access-control-allow-headers":"Content-Type, Authorization, X-Upload-Token, X-Discord-Token"};
function reply(data,status=200){return new Response(JSON.stringify(data),{status,headers:HEADERS})}
function clean(value){return String(value||"game").replace(/[^a-z0-9._-]/gi,"-").slice(0,80)}
function constantTimeEqual(a,b){if(typeof a!=="string"||typeof b!=="string"||a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}
function authorised(request,token){const supplied=request.headers.get("Authorization")?.replace(/^Bearer\s+/i,"")||request.headers.get("X-Discord-Token");return Boolean(token&&constantTimeEqual(supplied,token))}
async function enforceRateLimit(env,ip,category,limit){if(!env.POLARIS_STATE)return false;try{const id=env.POLARIS_STATE.idFromName("rate:"+category+":"+ip);const stub=env.POLARIS_STATE.get(id);const response=await stub.fetch("https://polaris-state/rate?limit="+limit+"&window=60000",{method:"POST"});if(!response.ok)return false;return Boolean((await response.json()).allowed)}catch{return false}}
async function presenceCount(env){if(!env.POLARIS_STATE)return 0;try{const id=env.POLARIS_STATE.idFromName("presence");const response=await env.POLARIS_STATE.get(id).fetch("https://polaris-state/presence/count");if(!response.ok)return 0;return Number((await response.json()).online)||0}catch{return 0}}
async function route(request,env){const u=new URL(request.url),p=u.pathname;const origin=request.headers.get("Origin");if(origin&&origin!==u.origin)return reply({error:"Cross-origin API access is disabled."},403);if(request.method==="OPTIONS")return new Response(null,{status:204,headers:HEADERS});if(!["GET","POST"].includes(request.method))return reply({error:"Method not allowed."},405);if(p.startsWith("/api/")){const ip=request.headers.get("CF-Connecting-IP")||"unknown";const category=p.startsWith("/api/ai/")?"ai":p==="/api/shared-games"?"uploads":p==="/api/presence/heartbeat"||p==="/api/presence/leave"?"presence":"api";const limits={ai:30,uploads:6,presence:30,api:120};if(!await enforceRateLimit(env,ip,category,limits[category]))return reply({error:"Rate limit reached or API protection is unavailable. Try again shortly."},429);}
if(request.method==="GET"&&p==="/api/community-games"){
 const upstream=await fetch("https://raw.githubusercontent.com/ztaylor31aaaaa/Polaris-Games/main/catalogue.json",{cf:{cacheTtl:30,cacheEverything:true}});
 if(!upstream.ok)return reply({error:"Community game catalogue unavailable."},502);
 const text=await upstream.text();let data;
 try{data=JSON.parse(text)}catch{return reply({error:"Community game catalogue is invalid JSON."},502)}
 if(!Array.isArray(data))return reply({error:"Community game catalogue must be an array."},502);
 return new Response(JSON.stringify(data),{status:200,headers:{...HEADERS,"cache-control":"public, max-age=30"}});
}
if(request.method==="GET"&&p.startsWith("/community-games/")){
 const path=p.slice("/community-games/".length),parts=path.split("/");
 if(!path||parts.some(part=>!part||part==="."||part===".."||! /^[a-zA-Z0-9._-]+$/.test(part)))return reply({error:"Invalid community game asset path."},400);
 const upstream=await fetch("https://raw.githubusercontent.com/ztaylor31aaaaa/Polaris-Games/main/"+path,{cache:"no-store"});
 if(!upstream.ok)return new Response("Community game asset not found.",{status:404,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}});
 const ext=path.split(".").pop().toLowerCase(),types={
 html:"text/html; charset=utf-8",htm:"text/html; charset=utf-8",js:"text/javascript; charset=utf-8",mjs:"text/javascript; charset=utf-8",css:"text/css; charset=utf-8",json:"application/json; charset=utf-8",map:"application/json; charset=utf-8",webmanifest:"application/manifest+json; charset=utf-8",xml:"application/xml; charset=utf-8",txt:"text/plain; charset=utf-8",csv:"text/csv; charset=utf-8",wasm:"application/wasm",bin:"application/octet-stream",
 svg:"image/svg+xml",png:"image/png",apng:"image/apng",jpg:"image/jpeg",jpeg:"image/jpeg",webp:"image/webp",gif:"image/gif",avif:"image/avif",bmp:"image/bmp",ico:"image/x-icon",
 mp3:"audio/mpeg",ogg:"audio/ogg",oga:"audio/ogg",wav:"audio/wav",m4a:"audio/mp4",aac:"audio/aac",flac:"audio/flac",mp4:"video/mp4",m4v:"video/mp4",webm:"video/webm",mov:"video/quicktime",
 woff:"font/woff",woff2:"font/woff2",ttf:"font/ttf",otf:"font/otf",eot:"application/vnd.ms-fontobject",glb:"model/gltf-binary",gltf:"model/gltf+json",obj:"text/plain; charset=utf-8",mtl:"text/plain; charset=utf-8",ktx:"image/ktx",ktx2:"image/ktx2",basis:"application/octet-stream",hdr:"image/vnd.radiance",exr:"image/aces"
 };
 const headers=new Headers(upstream.headers);headers.set("content-type",types[ext]||upstream.headers.get("content-type")||"application/octet-stream");headers.set("cache-control",ext==="html"||ext==="htm"?"no-cache":"public, max-age=300");headers.set("x-content-type-options","nosniff");headers.set("x-polaris-community-asset",path);headers.delete("content-disposition");
 return new Response(upstream.body,{status:200,headers});
}

if(p==="/api/ai/models"||p==="/api/ai/chat"){
 if(request.method!=="POST")return reply({error:"Method not allowed."},405);
 const length=Number(request.headers.get("Content-Length")||0);if(length>1048576)return reply({error:"AI request exceeds the 1 MB limit."},413);
 const key=request.headers.get("Authorization")?.replace(/^Bearer\s+/i,"");
 if(!key||key.length>512||/[\r\n]/.test(key))return reply({error:"A valid API key is required."},401);
 let body;try{body=await request.json()}catch{return reply({error:"Invalid JSON request."},400)}
 let base;try{base=new URL(String(body.baseUrl||""))}catch{return reply({error:"Invalid provider endpoint."},400)}
 const allowed=["api.openai.com","generativelanguage.googleapis.com","integrate.api.nvidia.com"];
 if(base.protocol!=="https:"||!allowed.includes(base.hostname)||base.username||base.password||(base.port&&base.port!=="443"))return reply({error:"This provider endpoint is not supported by the Polaris relay. Use OpenAI, Gemini, or NVIDIA's official API endpoint."},400);
 const endpoint=new URL((p.endsWith("/models")?"models":"chat/completions"),base.href.replace(/\/$/,"")+"/");
 const headers={Authorization:"Bearer "+key};
 const init={method:p.endsWith("/models")?"GET":"POST",headers};
 if(init.method==="POST"){headers["Content-Type"]="application/json";const {baseUrl,...payload}=body;const payloadText=JSON.stringify(payload);if(payloadText.length>1048576)return reply({error:"AI request exceeds the 1 MB limit."},413);init.body=payloadText}
 try{const upstream=await fetch(endpoint.href,init);return new Response(upstream.body,{status:upstream.status,headers:{"Content-Type":upstream.headers.get("Content-Type")||"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"}})}catch{return reply({error:"Could not connect to the AI provider. Check your connection and provider endpoint."},502)}
}
if(request.method==="GET"&&p==="/api")return reply({name:"Polaris API",version:VERSION,endpoints:["/api/health","/api/status","/api/version","/api/games","/api/shared-games","/api/stats","/api/presence/count","/api/presence/heartbeat","/api/presence/leave","/api/discord-presence","/api/bot/status","/api/bot/games","/api/bot/stats"]});
if(request.method==="GET"&&p==="/api/health")return reply({ok:true,service:"polaris-api",timestamp:new Date().toISOString()});
if(request.method==="POST"&&p==="/api/presence/heartbeat"){const length=Number(request.headers.get("Content-Length")||0);if(length>1024)return reply({error:"Presence request is too large."},413);let body;try{body=await request.json()}catch{return reply({error:"Invalid JSON request."},400)}const sessionId=String(body.sessionId||"");if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId))return reply({error:"A valid session ID is required."},400);const id=env.POLARIS_STATE.idFromName("presence");return env.POLARIS_STATE.get(id).fetch("https://polaris-state/presence/heartbeat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sessionId})})}
if(request.method==="POST"&&p==="/api/presence/leave"){const length=Number(request.headers.get("Content-Length")||0);if(length>1024)return reply({error:"Presence request is too large."},413);let body;try{body=await request.json()}catch{return reply({error:"Invalid JSON request."},400)}const sessionId=String(body.sessionId||"");if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId))return reply({error:"A valid session ID is required."},400);const id=env.POLARIS_STATE.idFromName("presence");return env.POLARIS_STATE.get(id).fetch("https://polaris-state/presence/leave",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sessionId})})}
if(request.method==="GET"&&p==="/api/presence/count")return reply({online:await presenceCount(env),unit:"sessions",ttlSeconds:60});
if(request.method==="GET"&&p==="/api/status"){const m=env.CF_VERSION_METADATA||{};return reply({status:"online",version:VERSION,buildId:m.id||BUILD,timestamp:new Date().toISOString()})}
if(request.method==="GET"&&p==="/api/version"){const m=env.CF_VERSION_METADATA||{};return reply({name:"Polaris",version:VERSION,buildId:m.id||BUILD,deployedAt:m.timestamp||null})}
if(request.method==="GET"&&p==="/api/games")return reply({games:[]});
if(request.method==="GET"&&p==="/api/stats")return reply({totalPlays:0,publishedGames:0,online:await presenceCount(env)});
if(request.method==="GET"&&p==="/api/discord-presence")return reply({online:await presenceCount(env),source:"polaris-presence",unit:"sessions"});
if(p.startsWith("/api/bot/")){if(request.method!=="GET")return reply({error:"Method not allowed."},405);if(!authorised(request,env.DISCORD_API_TOKEN))return reply({error:"Unauthorised. Provide a valid bot token."},401);if(p==="/api/bot/status")return reply({status:"online",service:"Polaris",version:VERSION,timestamp:new Date().toISOString()});if(p==="/api/bot/games")return reply({games:[]});if(p==="/api/bot/stats")return reply({totalPlays:0,publishedGames:0,online:await presenceCount(env)});}
if(request.method==="GET"&&p==="/api/shared-games"){if(!env.GAMES_BUCKET)return reply({games:[],storageConfigured:false});const listed=await env.GAMES_BUCKET.list({limit:100});return reply({storageConfigured:true,games:listed.objects.map(o=>({id:o.key,name:o.customMetadata?.name||o.key,size:o.size,uploadedAt:o.uploaded}))})}
if(request.method==="POST"&&p==="/api/shared-games"){const token=env.GAME_UPLOAD_TOKEN,supplied=request.headers.get("X-Upload-Token")||request.headers.get("Authorization")?.replace(/^Bearer\s+/i,"");if(!token||!constantTimeEqual(supplied,token))return reply({error:"Unauthorised upload."},401);const contentLength=Number(request.headers.get("Content-Length")||0);if(contentLength>21*1024*1024)return reply({error:"Maximum upload request size is 21 MB."},413);if(!env.GAMES_BUCKET)return reply({error:"Game storage is not configured."},503);const form=await request.formData(),file=form.get("file"),name=String(form.get("name")||"Game").slice(0,80);if(!(file instanceof File))return reply({error:"A file is required."},400);if(file.size>20*1024*1024)return reply({error:"Maximum upload size is 20 MB."},413);if(!/\.html?$/i.test(file.name))return reply({error:"Only HTML files are accepted."},400);const key=Date.now()+"-"+clean(file.name);await env.GAMES_BUCKET.put(key,file.stream(),{httpMetadata:{contentType:"text/html; charset=utf-8"},customMetadata:{name}});return reply({ok:true,id:key,name},201)}
return reply({error:"API route not found",path:p},404)}
export class PolarisState {
 constructor(ctx){this.ctx=ctx;this.storage=ctx.storage}
 async fetch(request){
  const url=new URL(request.url),now=Date.now();
  if(url.pathname==="/rate"&&request.method==="POST"){
   const limit=Math.max(1,Math.min(1000,Number(url.searchParams.get("limit"))||60));
   const windowMs=Math.max(1000,Math.min(3600000,Number(url.searchParams.get("window"))||60000));
   const windowStart=Math.floor(now/windowMs)*windowMs,record=await this.storage.get("rate"),count=record?.windowStart===windowStart?record.count:0;
   if(count>=limit)return new Response(JSON.stringify({allowed:false,remaining:0}),{status:200,headers:HEADERS});
   await this.storage.put("rate",{windowStart,count:count+1});
   return new Response(JSON.stringify({allowed:true,remaining:limit-count-1}),{status:200,headers:HEADERS});
  }
  if(url.pathname==="/presence/heartbeat"&&request.method==="POST"){
   let body;try{body=await request.json()}catch{return new Response(JSON.stringify({error:"Invalid request."}),{status:400,headers:HEADERS})}
   const sessionId=String(body.sessionId||"");
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId))return new Response(JSON.stringify({error:"Invalid session."}),{status:400,headers:HEADERS});
   await this.storage.put("presence:"+sessionId,{lastSeen:now});return this.presenceResponse();
  }
  if(url.pathname==="/presence/leave"&&request.method==="POST"){
   let body;try{body=await request.json()}catch{return new Response(JSON.stringify({error:"Invalid request."}),{status:400,headers:HEADERS})}
   const sessionId=String(body.sessionId||"");if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId))return new Response(JSON.stringify({error:"Invalid session."}),{status:400,headers:HEADERS});
   await this.storage.delete("presence:"+sessionId);return this.presenceResponse();
  }
  if(url.pathname==="/presence/count"&&request.method==="GET")return this.presenceResponse();
  return new Response(JSON.stringify({error:"Not found."}),{status:404,headers:HEADERS});
 }
 async presenceResponse(){
  const now=Date.now(),entries=await this.storage.list({prefix:"presence:",limit:1000});let online=0;const expired=[];
  for(const [key,value] of entries){if(!value||now-Number(value.lastSeen||0)>60000)expired.push(key);else online++}
  if(expired.length)await this.storage.delete(expired);
  return new Response(JSON.stringify({online,unit:"sessions",ttlSeconds:60,updatedAt:new Date(now).toISOString()}),{status:200,headers:HEADERS});
 }
}
export default{async fetch(request,env){const path=new URL(request.url).pathname;if(path==="/api"||path.startsWith("/api/")||path.startsWith("/community-games/"))return route(request,env);const response=await env.ASSETS.fetch(request);const headers=new Headers(response.headers);headers.set("Cross-Origin-Opener-Policy","same-origin");headers.delete("Cross-Origin-Embedder-Policy");headers.set("X-Content-Type-Options","nosniff");headers.set("Referrer-Policy","strict-origin-when-cross-origin");return new Response(response.body,{status:response.status,statusText:response.statusText,headers})}};