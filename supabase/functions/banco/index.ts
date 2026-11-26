// Função "banco" do Supabase: busca no Pluggy (Meu Pluggy, Open Finance) as contas e transações dos bancos conectados
// e, se pedido, sugere a categoria com a IA. O app nunca fala direto com o Pluggy.
// Segredos (Supabase > Edge Functions > Secrets): PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET (do dashboard.pluggy.ai).
// Os Item IDs (um por banco conectado) ficam no app, em Bancos > Conexões.
// A IA usa o mesmo segredo ANTHROPIC_API_KEY da função "voz".
// Segurança: só responde para quem está logado no app E está no segredo BANCO_USUARIOS; só o site do app pode chamar
// pelo navegador (CORS); só faz leituras no Pluggy (GET), nunca pagamento ou transferência; não grava nada no banco de dados.
import Anthropic from "npm:@anthropic-ai/sdk";

// Só o site do app pode chamar a função pelo navegador.
const ORIGENS = ["https://oseiasoc9-droid.github.io"];
let CORS: Record<string, string> = {};
const cors = (req: Request) => {
  const o = req.headers.get("Origin") || "";
  CORS = {
    "Access-Control-Allow-Origin": ORIGENS.includes(o) ? o : ORIGENS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });

const API = "https://api.pluggy.ai";
let chave = "", chaveAte = 0;
async function pluggyKey(): Promise<string> {
  if (chave && Date.now() < chaveAte) return chave;
  const clientId = Deno.env.get("PLUGGY_CLIENT_ID"), clientSecret = Deno.env.get("PLUGGY_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("sem chave do Pluggy");
  const r = await fetch(`${API}/auth`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId, clientSecret }) });
  if (!r.ok) throw new Error(`Pluggy recusou a chave (${r.status})`);
  const d = await r.json();
  chave = d.apiKey;
  chaveAte = Date.now() + 90 * 60_000; // a chave do Pluggy vale 2 horas
  return chave;
}
async function get(path: string) {
  const r = await fetch(API + path, { headers: { "X-API-KEY": await pluggyKey() } });
  if (!r.ok) { console.error("Pluggy", path.split("?")[0], r.status, (await r.text()).slice(0, 300)); throw new Error(`o Pluggy respondeu ${r.status}`); }
  return r.json();
}
const dia = (s: unknown) => (typeof s === "string" ? s.slice(0, 10) : "");
const ehId = (s: string) => /^[0-9a-f-]{20,40}$/i.test(s);

async function buscar(itens: string[], desde: string) {
  const conexoes: unknown[] = [], contas: unknown[] = [], txs: unknown[] = [], erros: string[] = [];
  for (const item of itens) {
    try {
      const it = await get(`/items/${item}`);
      conexoes.push({ id: item, banco: it.connector?.name || "", status: it.status || "", erro: it.error?.message || it.statusDetail?.message || "", atualizado: it.lastUpdatedAt || it.updatedAt || "" });
      const ac = await get(`/accounts?itemId=${item}`);
      for (const a of ac.results || []) {
        contas.push({
          id: a.id, item, tipo: a.type, sub: a.subtype, nome: a.marketingName || a.name || "", num: a.number || "",
          dono: a.owner || "", doc: a.taxNumber || "", saldo: typeof a.balance === "number" ? a.balance : null,
          banco: it.connector?.name || "",
        });
        let next = `?accountId=${a.id}&dateFrom=${desde}`;
        for (let pag = 0; next && pag < 20; pag++) {
          const q = next.startsWith("?") ? next : "?" + next;
          const r = await get(`/v2/transactions${q}${q.includes("dateFrom=") ? "" : `&dateFrom=${desde}`}`);
          for (const t of r.results || []) {
            const cc = t.creditCardMetadata || {};
            txs.push({
              id: t.id, acc: a.id, data: dia(t.date), desc: t.description || "", raw: t.descriptionRaw || "",
              valor: t.amount, tipo: t.type || "", cat: t.category || "", st: t.status || "",
              loja: t.merchant?.businessName || t.merchant?.name || "",
              parc: cc.totalInstallments || 0, nparc: cc.installmentNumber || 0, compra: dia(cc.purchaseDate),
            });
          }
          next = r.next || "";
        }
      }
    } catch (e) {
      erros.push(`${item.slice(0, 8)}…: ${(e as Error).message}`);
    }
  }
  return { conexoes, contas, txs, erros };
}

const SYSTEM = `Você classifica transações bancárias de um app de finanças brasileiro (família do Oseias e da Tainá, e as empresas dele de infoprodutos).
Para cada transação, devolva:
- desc: descrição CURTA e clara, de 1 a 4 palavras, com inicial maiúscula (ex.: "Posto de gasolina", "Padaria", "Assinatura Netflix", "Pix para Maria"). Tire códigos, asteriscos e cidades.
- cat: EXATAMENTE uma das categorias do tipo certo (saída = categorias de despesa, entrada = categorias de receita), ou vazio se não der para saber.
Use os exemplos de lançamentos anteriores para seguir o jeito da família classificar.`;

async function categorizar(b: Record<string, unknown>) {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return { erro: "sem chave da IA" };
  const lista = (v: unknown, n: number, m = 120) => (Array.isArray(v) ? v.slice(0, n).map((x) => String(x).slice(0, m)) : []);
  const itens = (Array.isArray(b.itens) ? b.itens : []).slice(0, 80).map((x: Record<string, unknown>, i: number) =>
    `${i}. ${x.saida ? "saída" : "entrada"} R$ ${Number(x.valor || 0).toFixed(2)} · ${String(x.desc || "").slice(0, 120)}${x.loja ? " · loja: " + String(x.loja).slice(0, 60) : ""}${x.catBanco ? " · categoria do banco: " + String(x.catBanco).slice(0, 40) : ""}`);
  if (!itens.length) return { itens: [] };
  const schema = {
    type: "object",
    properties: { itens: { type: "array", items: { type: "object", properties: { i: { type: "integer" }, desc: { type: "string" }, cat: { type: "string" } }, required: ["i", "desc", "cat"], additionalProperties: false } } },
    required: ["itens"], additionalProperties: false,
  };
  const ctx = [
    `Lado do app: ${b.lado === "e" ? "Empresa (despesas e entradas da empresa)" : "Pessoal (família)"}`,
    `Categorias de despesa: ${lista(b.catsD, 80).join(" | ")}`,
    `Categorias de receita: ${lista(b.catsR, 40).join(" | ")}`,
    `Lançamentos anteriores (descrição → categoria):\n${lista(b.recentes, 60).join("\n")}`,
  ].join("\n");
  const client = new Anthropic({ apiKey: key, maxRetries: 1, timeout: 40_000 });
  const r = await client.messages.create({
    model: "claude-haiku-5-5",
    max_tokens: 6000,
    system: SYSTEM,
    output_config: { effort: "low", format: { type: "json_schema", schema } },
    messages: [{ role: "user", content: `${ctx}\n\nTransações:\n${itens.join("\n")}` }],
  } as Anthropic.MessageCreateParamsNonStreaming);
  const t = r.content.find((c) => c.type === "text");
  if (!t || t.type !== "text") return { erro: "sem resposta" };
  return JSON.parse(t.text);
}

Deno.serve(async (req) => {
  cors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "use POST" }, 405);
  // 1) precisa estar logado no app: o Supabase confere o token da sessão (sem token ou com token falso, para aqui)
  const auth = req.headers.get("Authorization") || "";
  const apikey = req.headers.get("apikey") || "";
  const sbUrl = Deno.env.get("SUPABASE_URL");
  if (!auth.startsWith("Bearer ") || !sbUrl) return json({ erro: "sem login" }, 401);
  const u = await fetch(`${sbUrl}/auth/v1/user`, { headers: { Authorization: auth, apikey } });
  if (!u.ok) return json({ erro: "sem login" }, 401);
  // 2) e precisa ser a conta liberada no segredo BANCO_USUARIOS (id ou e-mail do login). Sem o segredo, ninguém usa.
  const quem = await u.json().catch(() => ({}));
  const liberados = (Deno.env.get("BANCO_USUARIOS") || "").toLowerCase().split(/[\s,;]+/).filter(Boolean);
  if (!liberados.length || !(liberados.includes(String(quem.id || "").toLowerCase()) || liberados.includes(String(quem.email || "").toLowerCase())))
    return json({ erro: "conta não liberada" }, 403);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ erro: "corpo inválido" }, 400); }
  try {
    if (b.acao === "categorizar") return json(await categorizar(b));
    if (b.acao === "buscar") {
      if (!Deno.env.get("PLUGGY_CLIENT_ID") || !Deno.env.get("PLUGGY_CLIENT_SECRET")) return json({ erro: "sem chave do Pluggy" }, 503);
      const itens = [...new Set((Array.isArray(b.itens) ? b.itens : []).map((s) => String(s).trim()).filter(ehId))].slice(0, 12);
      if (!itens.length) return json({ erro: "nenhuma conexão cadastrada" }, 400);
      const desde = /^\d{4}-\d{2}-\d{2}$/.test(String(b.desde)) ? String(b.desde) : new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
      return json(await buscar(itens, desde));
    }
    return json({ erro: "ação desconhecida" }, 400);
  } catch (e) {
    console.error(e);
    return json({ erro: (e as Error).message || "falha" }, 502);
  }
});
