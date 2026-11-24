(() => {
"use strict";
const $ = id => document.getElementById(id);
const W=13,H=13, SAVE_KEY="seljuk-kingdom-save-v1";
const defs = {
  palace:{name:"قصر",emoji:"🏰",cost:0,desc:"مرکز فرمانروایی",color:"#c8a85e",workers:0},
  house:{name:"خانه",emoji:"🏠",cost:65,desc:"ظرفیت جمعیت +۱۰",color:"#b98b62",workers:0},
  farm:{name:"مزرعه",emoji:"🌾",cost:90,desc:"تولید خودکار غذا",color:"#83a957",workers:4},
  mine:{name:"معدن طلا",emoji:"⛏️",cost:125,desc:"تولید خودکار طلا",color:"#c69c42",workers:4},
  market:{name:"بازار",emoji:"🏪",cost:110,desc:"تجارت و رونق شهر",color:"#a96d53",workers:2},
  storage:{name:"انبار",emoji:"📦",cost:100,desc:"ظرفیت منابع +۵۰۰",color:"#9c825e",workers:1},
  barracks:{name:"پادگان",emoji:"⚔️",cost:150,desc:"آموزش و نگهداری سرباز",color:"#8c7770",workers:2}
};
const initial = () => ({food:650,gold:420,pop:32,soldiers:8,security:70,day:1,hour:8,paused:false,buildings:[{type:"palace",x:6,y:6},{type:"house",x:4,y:5},{type:"house",x:8,y:5},{type:"farm",x:3,y:8},{type:"mine",x:10,y:8},{type:"market",x:6,y:3},{type:"storage",x:9,y:3},{type:"barracks",x:3,y:3}],taxMood:0,likes:0});
let state = load();
let selected = null, zoom=1, toastTimer, soundOn=false;
const canvas=$("world"),ctx=canvas.getContext("2d");
const tileW=52,tileH=27;
function load(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY));if(s&&Array.isArray(s.buildings))return {...initial(),...s};}catch(e){}return initial();}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));$("saveLabel").textContent="ذخیره شد ✓";}catch(e){$("saveLabel").textContent="ذخیره‌سازی در دسترس نیست";}}
function fmt(n){return Math.floor(n).toLocaleString("fa-IR");}
function say(msg){$("log").textContent=msg;const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2200);}
function count(type){return state.buildings.filter(b=>b.type===type).length;}
function capacity(){return 30+count("house")*10;}
function workersNeeded(){return state.buildings.reduce((n,b)=>n+(defs[b.type]?.workers||0),0);}
function activeWorkers(){return Math.min(Math.max(0,state.pop-8),workersNeeded());}
function rates(){const farms=count("farm"),mines=count("mine"),workers=activeWorkers(),needed=workersNeeded();const ratio=needed?Math.min(1,workers/needed):0;return {food:farms*18*ratio,gold:mines*11*ratio};}
function updateUI(){
 if($("likesCount"))$("likesCount").textContent=fmt(state.likes||0);
 $("food").textContent=fmt(state.food);$("gold").textContent=fmt(state.gold);$("population").textContent=`${fmt(state.pop)} / ${fmt(capacity())}`;$("soldiers").textContent=fmt(state.soldiers);$("security").textContent=fmt(state.security)+"٪";
 const r=rates();$("foodRate").textContent=fmt(r.food)+" / دقیقه";$("goldRate").textContent=fmt(r.gold)+" / دقیقه";$("workers").textContent=fmt(activeWorkers())+" نفر";$("storage").textContent=fmt(1000+count("storage")*500);
 $("seasonLabel").textContent=(state.day<31?"بهار":state.day<61?"تابستان":state.day<91?"پاییز":"زمستان")+" · سال "+fmt(Math.floor((state.day-1)/120)+1);
 $("clockLabel").textContent=`روز ${fmt(state.day)} · ${String(state.hour).padStart(2,"0")}:۰۰`;$("pauseBtn").textContent=state.paused?"ادامه زمان":"توقف زمان";
}
function mapScale(){const r=canvas.getBoundingClientRect();return Math.min(1,r.width/660)*zoom;}
function drawDiamond(x,y,fill,stroke="#355340",s=mapScale()){ctx.beginPath();ctx.moveTo(x,y-tileH*s/2);ctx.lineTo(x+tileW*s/2,y);ctx.lineTo(x,y+tileH*s/2);ctx.lineTo(x-tileW*s/2,y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
function project(x,y){const rect=canvas.getBoundingClientRect(),sc=mapScale(),ox=rect.width/2,oy=rect.height*.46;return {x:ox+(x-y)*tileW*.48*sc,y:oy+(x+y-12)*tileH*.48*sc};}
function resize(){const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.floor(r.width*dpr);canvas.height=Math.floor(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
function drawBuilding(b){const p=project(b.x,b.y),scale=zoom;const type=defs[b.type];ctx.save();ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#0005";ctx.beginPath();ctx.ellipse(p.x+2,p.y+8*scale,19*scale,8*scale,0,0,Math.PI*2);ctx.fill();drawDiamond(p.x,p.y+3*scale,b.type==="palace"?"#a88b52":"#857451","#d0b879");ctx.font=`${b.type==="palace"?34:27} ${Math.round(28*scale)}px sans-serif`;ctx.shadowColor="#0008";ctx.shadowBlur=3;ctx.fillText(type.emoji,p.x,p.y-13*scale);ctx.shadowBlur=0;if(b.type==="palace"){ctx.fillStyle="#f0d88c";ctx.font=`bold ${Math.max(9,10*scale)}px sans-serif`;ctx.fillText("قصر",p.x,p.y-39*scale);}ctx.restore();}
function draw(){const r=canvas.getBoundingClientRect();if(!r.width)return;ctx.clearRect(0,0,canvas.width,canvas.height);const w=r.width,dpr=canvas.width/w;ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const p=project(x,y);drawDiamond(p.x,p.y,(x+y)%2?"#466343":"#4c6a47","#637d53");}for(let k=0;k<W;k++){let p=project(k,6);drawDiamond(p.x,p.y+1,"#9a906e","#aaa17d");p=project(6,k);drawDiamond(p.x,p.y+1,"#9a906e","#aaa17d");}for(const [x,y] of [[1,1],[2,10],[11,2],[11,11],[0,6],[12,6],[5,11],[8,1],[1,4],[12,9]]){const p=project(x,y);ctx.font=`${Math.round(21*zoom)}px sans-serif`;ctx.textAlign="center";ctx.fillText("🌳",p.x,p.y-8*zoom);}state.buildings.slice().sort((a,b)=>(a.x+a.y)-(b.x+b.y)).forEach(drawBuilding);if(selected){for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(state.buildings.some(b=>b.x===x&&b.y===y))continue;const p=project(x,y);drawDiamond(p.x,p.y,"#d9c77a33","#e6d48b66");}}ctx.restore();}
function renderBuildList(){const host=$("buildingList");host.innerHTML="";Object.entries(defs).filter(([k])=>k!=="palace").forEach(([key,d])=>{const btn=document.createElement("button");btn.className="building"+(selected===key?" selected":"");btn.innerHTML=`<span class="emoji">${d.emoji}</span><span><b>${d.name}</b><small>${d.cost} طلا · ${d.desc}</small></span>`;btn.onclick=()=>{selected=selected===key?null:key;renderBuildList();say(selected?`محل ساخت ${d.name} را روی نقشه انتخاب کنید`:"انتخاب لغو شد");draw();};host.appendChild(btn);});}
function hitTest(px,py){let best=null,dist=Infinity;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const p=project(x,y),d=((px-p.x)/(tileW*.48*mapScale()))**2+((py-p.y)/(tileH*.48*mapScale()))**2;if(d<1.1&&d<dist){best={x,y};dist=d;}}return best;}
canvas.addEventListener("click",e=>{const r=canvas.getBoundingClientRect(),pos=hitTest(e.clientX-r.left,e.clientY-r.top);if(!pos)return;const existing=state.buildings.find(b=>b.x===pos.x&&b.y===pos.y);if(existing){say(defs[existing.type].name+" · این ساختمان در شهر شماست");return;}if(!selected){say("ابتدا یک ساختمان از فهرست ساخت‌وساز انتخاب کنید");return;}const d=defs[selected];if(state.gold<d.cost){say("طلای کافی ندارید");return;}state.gold-=d.cost;state.buildings.push({type:selected,x:pos.x,y:pos.y});say(`${d.name} ساخته شد`);selected=null;renderBuildList();updateUI();save();draw();});
function like(){state.likes=(state.likes||0)+1;state.food=Math.min(1000+count("storage")*500,state.food+5);say("از پشتیبانی مردم سپاسگزاریم؛ ۵ واحد غذا دریافت شد");updateUI();save();}
function tax(){const amount=30+state.pop*2;state.gold+=amount;state.taxMood++;state.security=Math.max(25,state.security-2);say(`مالیات دریافت شد: ${fmt(amount)} طلا`);updateUI();save();}
function recruit(){if(count("barracks")<1){say("برای سربازگیری ابتدا پادگان بسازید");return;}if(state.gold<50||state.food<30){say("برای سربازگیری ۵۰ طلا و ۳۰ غذا لازم است");return;}if(state.pop-state.soldiers<5){say("جمعیت آزاد کافی نیست");return;}state.gold-=50;state.food-=30;state.soldiers++;state.security=Math.min(100,state.security+2);say("یک سرباز تازه به سپاه پیوست");updateUI();save();}
function defend(){if(state.gold<80){say("برای تقویت دفاع ۸۰ طلا لازم است");return;}state.gold-=80;state.security=Math.min(100,state.security+15);say("استحکامات شهر تقویت شد");updateUI();save();}
function trade(){if(state.gold>=40){state.gold-=40;state.food+=100;say("۱۰۰ واحد غذا در برابر ۴۰ طلا خریداری شد");}else if(state.food>=150){state.food-=150;state.gold+=40;say("۴۰ طلا در برابر ۱۵۰ غذا فروخته شد");}else say("برای تجارت، ۴۰ طلا یا ۱۵۰ غذا لازم است");updateUI();save();}
function tick(){if(state.paused)return;state.hour++;if(state.hour>=24){state.hour=0;state.day++;state.taxMood=0;}const r=rates();state.food=Math.min(1000+count("storage")*500,state.food+r.food/60);state.gold=Math.min(1000+count("storage")*500,state.gold+r.gold/60);if(state.hour%6===0){const upkeep=state.pop*.12+state.soldiers*.8;state.food=Math.max(0,state.food-upkeep);if(state.food<=0&&state.pop>8){state.pop=Math.max(8,state.pop-1);say("کمبود غذا باعث کاهش جمعیت شد");}if(state.pop<capacity()&&state.food>200&&state.gold>80&&state.hour===12)state.pop++;}if(state.hour===0&&state.day%7===0)state.security=Math.max(20,state.security-1);updateUI();if(state.hour%2===0)save();}
$("taxBtn").onclick=tax;$("likeBtn").onclick=like;$("recruitBtn").onclick=recruit;$("defendBtn").onclick=defend;$("marketBtn").onclick=trade;$("cancelBuild").onclick=()=>{selected=null;renderBuildList();draw();};$("pauseBtn").onclick=()=>{state.paused=!state.paused;updateUI();save();};$("zoomIn").onclick=()=>{zoom=Math.min(1.45,zoom+.1);draw();};$("zoomOut").onclick=()=>{zoom=Math.max(.7,zoom-.1);draw();};$("soundBtn").onclick=()=>{soundOn=!soundOn;$("soundBtn").textContent=soundOn?"♫":"♪";say(soundOn?"صدای بازی فعال شد":"صدای بازی خاموش شد");};$("resetBtn").onclick=()=>{if(confirm("همه پیشرفت ذخیره‌شده پاک شود و بازی از ابتدا آغاز شود؟")){state=initial();selected=null;save();renderBuildList();updateUI();draw();say("پادشاهی تازه‌ای آغاز شد");}};window.addEventListener("resize",resize);renderBuildList();updateUI();resize();setInterval(tick,1000);setInterval(save,15000);
})();