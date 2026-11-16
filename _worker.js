const VERSION="0.1.0";
const BUILD="polaris-foundation";
const HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store","access-control-allow-origin":"*","access-control-allow-methods":"GET, POST, OPTIONS","access-control-allow-headers":"Content-Type, Authorization, X-Upload-Token"};
function reply(data,status=200){return new Response(JSON.stringify(data),{status,headers:HEADERS})}
function clean(value){return String(value||"game").replace(/[^a-z0-9._-]/gi,"-").slice(0,80)}
function authorised(request,token){const supplied=request.headers.get("Authorization")?.replace(/^Bearer\s+/i,"")||request.headers.get("X-Discord-Token");return Boolean(token&&supplied===token)}
async function route(request,env){const u=new URL(request.url),p=u.pathname;if(request.method==="OPTIONS")return new Response(null,{status:204,headers:HEADERS});
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
 const upstream=await fetch("https://raw.githubusercontent.com/ztaylor31aaaaa/Polaris-Games/main/"+path,{cf:{cacheTtl:60,cacheEverything:true}});
 if(!upstream.ok)return new Response("Community game asset not found.",{status:404,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}});
 const ext=path.split(".").pop().toLowerCase(),types={html:"text/html; charset=utf-8",htm:"text/html; charset=utf-8",js:"text/javascript; charset=utf-8",css:"text/css; charset=utf-8",json:"application/json; charset=utf-8",svg:"image/svg+xml",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",webp:"image/webp",gif:"image/gif",mp3:"audio/mpeg",ogg:"audio/ogg",wav:"audio/wav",mp4:"video/mp4",woff:"font/woff",woff2:"font/woff2"};
 const headers=new Headers(upstream.headers);headers.set("content-type",types[ext]||"application/octet-stream");headers.set("cache-control","public, max-age=60");headers.set("x-content-type-options","nosniff");headers.set("access-control-allow-origin","*");
 return new Response(upstream.body,{status:200,headers});
}

if(p==="/api/ai/models"||p==="/api/ai/chat"){
 if(request.method!==(p.endsWith("/models")?"POST":"POST"))return reply({error:"Method not allowed."},405);
 const key=request.headers.get("Authorization")?.replace(/^Bearer\s+/i,"");
 if(!key)return reply({error:"An API key is required."},401);
 let body;try{body=await request.json()}catch{return reply({error:"Invalid JSON request."},400)}
 let base;try{base=new URL(String(body.baseUrl||""))}catch{return reply({error:"Invalid provider endpoint."},400)}
 const allowed=["api.openai.com","generativelanguage.googleapis.com","integrate.api.nvidia.com"];
 if(base.protocol!=="https:"||!allowed.includes(base.hostname)||base.username||base.password)return reply({error:"This provider endpoint is not supported by the Polaris relay. Use OpenAI, Gemini, or NVIDIA's official API endpoint."},400);
 const endpoint=new URL((p.endsWith("/models")?"models":"chat/completions"),base.href.replace(/\/$/,"")+"/");
 const headers={Authorization:"Bearer "+key};
 const init={method:p.endsWith("/models")?"GET":"POST",headers};
 if(init.method==="POST"){headers["Content-Type"]="application/json";const {baseUrl,...payload}=body;init.body=JSON.stringify(payload)}
 try{const upstream=await fetch(endpoint.href,init);return new Response(upstream.body,{status:upstream.status,headers:{"Content-Type":upstream.headers.get("Content-Type")||"application/json","Cache-Control":"no-store","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type, Authorization","Access-Control-Allow-Methods":"GET, POST, OPTIONS"}})}catch{return reply({error:"Could not connect to the AI provider. Check your connection and provider endpoint."},502)}
}
if(request.method==="GET"&&p==="/api")return reply({name:"Polaris API",version:VERSION,endpoints:["/api/health","/api/status","/api/version","/api/games","/api/shared-games","/api/stats","/api/discord-presence","/api/bot/status","/api/bot/games","/api/bot/stats"]});
if(request.method==="GET"&&p==="/api/health")return reply({ok:true,service:"polaris-api",timestamp:new Date().toISOString()});
if(request.method==="GET"&&p==="/api/status"){const m=env.CF_VERSION_METADATA||{};return reply({status:"online",version:VERSION,buildId:m.id||BUILD,timestamp:new Date().toISOString()})}
if(request.method==="GET"&&p==="/api/version"){const m=env.CF_VERSION_METADATA||{};return reply({name:"Polaris",version:VERSION,buildId:m.id||BUILD,deployedAt:m.timestamp||null})}
if(request.method==="GET"&&p==="/api/games")return reply({games:[]});
if(request.method==="GET"&&p==="/api/stats")return reply({totalPlays:0,publishedGames:0,online:0});
if(request.method==="GET"&&p==="/api/discord-presence")return reply({online:0,source:"polaris-api"});
if(p.startsWith("/api/bot/")){if(request.method!=="GET")return reply({error:"Method not allowed."},405);if(!authorised(request,env.DISCORD_API_TOKEN))return reply({error:"Unauthorised. Provide a valid bot token."},401);if(p==="/api/bot/status")return reply({status:"online",service:"Polaris",version:VERSION,timestamp:new Date().toISOString()});if(p==="/api/bot/games")return reply({games:[]});if(p==="/api/bot/stats")return reply({totalPlays:0,publishedGames:0,online:0});}
if(request.method==="GET"&&p==="/api/shared-games"){if(!env.GAMES_BUCKET)return reply({games:[],storageConfigured:false});const listed=await env.GAMES_BUCKET.list({limit:100});return reply({storageConfigured:true,games:listed.objects.map(o=>({id:o.key,name:o.customMetadata?.name||o.key,size:o.size,uploadedAt:o.uploaded}))})}
if(request.method==="POST"&&p==="/api/shared-games"){const token=env.GAME_UPLOAD_TOKEN,supplied=request.headers.get("X-Upload-Token")||request.headers.get("Authorization")?.replace(/^Bearer\s+/i,"");if(!token||supplied!==token)return reply({error:"Unauthorised upload."},401);if(!env.GAMES_BUCKET)return reply({error:"Game storage is not configured."},503);const form=await request.formData(),file=form.get("file"),name=String(form.get("name")||"Game").slice(0,80);if(!(file instanceof File))return reply({error:"A file is required."},400);if(file.size>20*1024*1024)return reply({error:"Maximum upload size is 20 MB."},413);if(!/\.html?$/i.test(file.name))return reply({error:"Only HTML files are accepted."},400);const key=Date.now()+"-"+clean(file.name);await env.GAMES_BUCKET.put(key,file.stream(),{httpMetadata:{contentType:"text/html; charset=utf-8"},customMetadata:{name}});return reply({ok:true,id:key,name},201)}
return reply({error:"API route not found",path:p},404)}
export default{async fetch(request,env){const path=new URL(request.url).pathname;if(path==="/api"||path.startsWith("/api/")||path.startsWith("/community-games/"))return route(request,env);const response=await env.ASSETS.fetch(request);const headers=new Headers(response.headers);headers.set("Cross-Origin-Opener-Policy","same-origin");headers.set("Cross-Origin-Embedder-Policy","require-corp");return new Response(response.body,{status:response.status,statusText:response.statusText,headers})}};