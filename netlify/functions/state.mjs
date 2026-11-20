import { getStore } from "@netlify/blobs";
const store = getStore("seljuk-kingdom");
const initial = { population:10, food:100, gold:50, happiness:80, buildings:["🏠","🌾","🏘️"] };
export default async () => {
  let state = await store.get("state", { type:"json" });
  if (!state) { state=initial; await store.setJSON("state",state); }
  return new Response(JSON.stringify(state), {headers:{"content-type":"application/json","access-control-allow-origin":"*"}});
};
