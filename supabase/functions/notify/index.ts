import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const VAPID_PUBLIC = "BDx3c0Q43ojna_3bd94U8MN8o2IERDUQgaa0nu2_cWRE5ORoTPdGmpx_5B901eStkwQrpmlfge2aqRX0dQZVRnU";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SB_URL = Deno.env.get("SB_URL")!;
const SB_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY")!;

webpush.setVapidDetails("mailto:m4theusnoronha@gmail.com", VAPID_PUBLIC, VAPID_PRIVATE);

Deno.serve(async () => {
  const supabase = createClient(SB_URL, SB_KEY);

  const { data: row } = await supabase
    .from("financas").select("data").eq("id", "noronha_v2").single();
  const S = row?.data;
  if (!S) return new Response("sem dados", { status: 200 });

  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  const diaAmanha = amanha.getDate();

  const vencendo = (S.recorrentes || []).filter((r: any) => r.ativo && r.dia === diaAmanha);
  if (vencendo.length === 0) return new Response("nada vence amanha", { status: 200 });

  const linhas = vencendo
    .map((r: any) => `• ${r.desc} — R$ ${Number(r.valor).toFixed(2).replace(".", ",")}`)
    .join("\n");

  const payload = JSON.stringify({
    title: "💰 Casal Noronha · Finanças",
    body: `Vence amanhã:\n${linhas}`,
  });

  const { data: subs } = await supabase.from("push_subscriptions").select("subscription");
  if (!subs?.length) return new Response("sem assinantes", { status: 200 });

  const results = await Promise.allSettled(
    subs.map((s: any) => webpush.sendNotification(s.subscription, payload))
  );

  const ok = results.filter(r => r.status === "fulfilled").length;
  return new Response(`Enviado para ${ok}/${subs.length}`, { status: 200 });
});
