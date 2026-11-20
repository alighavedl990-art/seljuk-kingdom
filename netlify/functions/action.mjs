import { getStore } from "@netlify/blobs";
const store=getStore("seljuk-kingdom");
const initial={population:10,food:100,gold:50,happiness:80,buildings:["🏠","🌾","🏘️"]};
export default async (req)=>{
 if(req.method!=="POST") return new Response("Method not allowed",{status:405});
 const body=await req.json(); const a=body.action;
 let s=await store.get("state",{type:"json"})||initial;
 const key=Netlify.env.get("KING_KEY");
 if(a!=="like" && (!key || req.headers.get("x-king-key")!==key))
   return Response.json({error:"کلید پادشاه نادرست است."},{status:403});
 if(a==="like") s.food+=5;
 else if(a==="farm" && s.gold>=20){s.gold-=20;s.buildings.push("🌾")}
 else if(a==="house" && s.gold>=15){s.gold-=15;s.buildings.push("🏠")}
 else if(a==="market" && s.gold>=30){s.gold-=30;s.buildings.push("🏬")}
 else if(a==="invite" && s.food>=20){s.food-=20;s.population+=10;s.buildings.push("🏘️")}
 else if(a==="tax") s.gold+=10;
 else return Response.json({error:"منابع کافی نیست یا فرمان نامعتبر است."},{status:400});
 await store.setJSON("state",s);
 return Response.json(s);
};
