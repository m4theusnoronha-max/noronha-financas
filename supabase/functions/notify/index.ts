import { createClient } from "npm:@supabase/supabase-js@2";

const VAPID_PUBLIC = "BDx3c0Q43ojna_3bd94U8MN8o2IERDUQgaa0nu2_cWRE5ORoTPdGmpx_5B901eStkwQrpmlfge2aqRX0dQZVRnU";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Web Push usando Web Crypto (sem dependência externa)
async function sendPush(subscription: any, payload: string) {
  const { default: webpush } = await import("npm:web-push@3");
  webpush.setVapidDetails("mailto:m4theusnoronha@gmail.com", VAPID_PUBLIC, VAPID_PRIVATE);
  return webpush.sendNotification(subscription, payload);
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Lê dados financeiros
  const { data: row } = await supabase
    .from("financas").select("data").eq("id", "noronha_v2").single();
  const S = row?.data;
  if (!S) return new Response("sem dados", { status: 200 });

  // Descobre quais recorrentes vencem amanhã
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  const diaAmanha = amanha.getDate();

  const vencendo = (S.recorrentes || []).filter((r: any) => r.ativo && r.dia === diaAmanha);

  if (vencendo.length === 0) return new Response("nada vence amanhã", { status: 200 });

  const linhas = vencendo
    .map((r: any) => `• ${r.desc} — R$ ${Number(r.valor).toFixed(2).replace(".", ",")}`)
    .join("\n");

  const payload = JSON.stringify({
    title: "💰 Casal Noronha · Finanças",
    body: `Vence amanhã:\n${linhas}`,
  });

  // Busca assinantes
  const { data: subs } = await supabase.from("push_subscriptions").select("subscription");
  if (!subs?.length) return new Response("sem assinantes", { status: 200 });

  // Envia para todos
  const results = await Promise.allSettled(
    subs.map((s: any) => sendPush(s.subscription, payload))
  );

  const ok = results.filter(r => r.status === "fulfilled").length;
  return new Response(`Enviado para ${ok}/${subs.length} dispositivos`, { status: 200 });
});
