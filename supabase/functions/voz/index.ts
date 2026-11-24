// Função "voz" do Supabase: recebe a frase falada ou digitada no app e devolve o lançamento preenchido.
// A chave da IA fica só aqui no servidor, no segredo ANTHROPIC_API_KEY (nunca no site, que é público).
// Só responde para quem está logado no app (a função confere o login no Supabase antes de chamar a IA).
import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SCHEMA = {
  type: "object",
  properties: {
    tipo: { type: "string", enum: ["d", "r"] },
    valor: { type: ["number", "null"] },
    data: { type: "string" },
    desc: { type: "string" },
    obs: { type: "string" },
    cat: { type: "string" },
    conta: { type: "string" },
    cartao: { type: "string" },
    parcelas: { type: "integer" },
  },
  required: ["tipo", "valor", "data", "desc", "obs", "cat", "conta", "cartao", "parcelas"],
  additionalProperties: false,
};

const SYSTEM = `Você preenche lançamentos de um app de finanças de uma família brasileira (Oseias e a esposa Tainá, de Vitória da Conquista, BA).
A pessoa fala ou digita livremente, às vezes com rodeios ("Claude, lança aí...", "né", "tipo"). Entenda o contexto e devolva só o JSON pedido.

Regras:
- tipo: "d" para despesa (compra, pagamento, gasto) e "r" para receita (recebeu, entrou, pró-labore, reembolso que entrou).
- valor: em reais, número com ponto decimal. null se não foi dito.
- data: a data da compra no formato AAAA-MM-DD. Use a data de hoje informada se nada for dito. Entenda "ontem", "anteontem", "sexta passada", "dia 20", "20 de novembro", "10/11" (dia/mês, sempre no passado ou hoje).
- desc: descrição CURTA do que foi comprado ou recebido, de 1 a 4 palavras, com inicial maiúscula (ex.: "Gasolina", "Pão e biscoito", "Hospedagem do site", "Conta de luz"). Nunca copie a frase inteira. Não use palavras como "nota", "compra" ou "pagamento" sozinhas.
- obs: observação curta (até 80 caracteres) com o contexto útil que não está na descrição: onde foi, para quê, para quem, detalhes (ex.: "Padaria Lisboa, café da manhã das meninas"). Não repita valor, data, conta, cartão nem a categoria. Vazio se não houver contexto.
- cat: escolha EXATAMENTE uma das categorias da lista do tipo certo. Se a pessoa disser o nome de uma categoria ("projeto Tainá", "categoria lazer"), use essa. Gastos de projeto (pagos com dinheiro pessoal e reembolsados depois) usam a categoria "Projeto ..." correspondente; se a pessoa falar de um projeto que não está na lista, use "Projeto " + o nome dele. Use os lançamentos recentes como exemplo de como a família costuma classificar. Vazio se não der para saber.
- conta: uma das contas da lista, ou vazio. "Pix", "débito" ou "transferência" saem de uma conta: "da Tainá" = conta da Tainá, "do Oseias"/"meu" = conta do Oseias, "dinheiro"/"espécie" = Caixa Preta.
- cartao: um dos cartões da lista se foi no crédito/cartão, senão vazio. Se tiver cartão, a conta fica vazia.
- parcelas: número de parcelas ("em 3x", "3 vezes"); 1 se não foi dito.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "use POST" }, 405);
  // confere o login: só quem entrou no app pode usar a IA
  const auth = req.headers.get("Authorization") || "";
  const apikey = req.headers.get("apikey") || "";
  const sbUrl = Deno.env.get("SUPABASE_URL");
  if (!auth.startsWith("Bearer ") || !sbUrl) return json({ erro: "sem login" }, 401);
  const u = await fetch(`${sbUrl}/auth/v1/user`, { headers: { Authorization: auth, apikey } });
  if (!u.ok) return json({ erro: "sem login" }, 401);
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ erro: "sem chave" }, 503);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ erro: "corpo inválido" }, 400); }
  const texto = String(b.texto || "").slice(0, 1500).trim();
  if (!texto) return json({ erro: "texto vazio" }, 400);
  const lista = (v: unknown, n: number) => (Array.isArray(v) ? v.slice(0, n).map((x) => String(x).slice(0, 120)) : []);
  const ctx = [
    `Hoje: ${String(b.hoje || "").slice(0, 10)} (${String(b.diaSemana || "").slice(0, 20)})`,
    `Categorias de despesa: ${lista(b.catsD, 80).join(" | ")}`,
    `Categorias de receita: ${lista(b.catsR, 40).join(" | ")}`,
    `Contas: ${lista(b.contas, 40).join(" | ")}`,
    `Cartões: ${lista(b.cartoes, 30).join(" | ")}`,
    `Lançamentos recentes (descrição → categoria; observação):\n${lista(b.recentes, 60).join("\n")}`,
  ].join("\n");

  const client = new Anthropic({ apiKey: key, maxRetries: 1, timeout: 20_000 });
  try {
    const r = await client.messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 2000,
      system: SYSTEM,
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: `${ctx}\n\nFrase da pessoa:\n"""${texto}"""` }],
    } as Anthropic.MessageCreateParamsNonStreaming);
    if (r.stop_reason === "refusal") return json({ erro: "recusado" }, 422);
    const t = r.content.find((c) => c.type === "text");
    if (!t || t.type !== "text") return json({ erro: "sem resposta" }, 502);
    return json(JSON.parse(t.text));
  } catch (e) {
    console.error(e);
    return json({ erro: "falha na IA" }, 502);
  }
});
