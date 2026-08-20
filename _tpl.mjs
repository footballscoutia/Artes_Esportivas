import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(".env.local","utf8").split(/\r?\n/)
  .filter(l=>l.includes("=")&&!l.trim().startsWith("#"))
  .map(l=>[l.slice(0,l.indexOf("=")).trim(), l.slice(l.indexOf("=")+1).trim()]));
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const c = await (await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`,
  { headers:{ Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}` }})).json();
for (const k of Object.keys(c).filter(k=>/recovery|mailer/.test(k)))
  console.log(k, "=", JSON.stringify(c[k])?.slice(0,260));
