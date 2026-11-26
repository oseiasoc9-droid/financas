# Minhas Finanças: contexto para o Claude

App web de controle financeiro do Oseias (Vitória da Conquista, BA). Ele tem dois lados:
- **Pessoal** (`index.html`): finanças da família.
- **Empresa** (`empresa.html`): finanças dos CNPJs. Criado em 23/11/2026.

Converse sempre em **português**. O Oseias não é programador. Explique o que mudou em linguagem simples e evite jargão.

## Hospedagem e dados
- GitHub Pages, repositório **oseiasoc9-droid/financas** (público). Endereço: https://oseiasoc9-droid.github.io/financas/
- **Supabase pessoal** do Oseias. URL e chave publishable estão no topo do `<script>` de cada página.
- Tudo fica numa tabela `docs`, com as colunas `user_id`, `key`, `body` (jsonb), `rev` e `updated_at`, e RLS por usuário. Cada documento é um JSON.
- O login é feito com e-mail e senha (`signInWithPassword`). Os cadastros novos estão travados. Ele e a esposa (Tainá) usam o mesmo login, às vezes ao mesmo tempo. Por isso **toda gravação precisa ler o `rev` atual, aplicar a mudança e gravar com `.eq("rev", rev)`, tentando de novo em caso de conflito**. Nunca sobrescreva às cegas.
- `sw.js` é um service worker com cache do "shell" (constante `C`, hoje `financas-v25`). **Incremente a versão de `C` sempre que mudar `index.html`, `empresa.html` ou a lista `SHELL`**, senão o celular continua mostrando a versão antiga.
- PWA: `manifest.webmanifest`, `icon.svg`, `icon-192.png`.
- Tudo é HTML, CSS e JS num arquivo só por página, sem build e sem framework. Mantenha assim.
- Para testar sem Supabase, `empresa.html?demo` usa localStorage (chaves `demo-emp-*`).
- **Bloqueio do app (PIN e digital)**, desde 24/11/2026: bloco `TRAVA:INICIO … TRAVA:FIM` no `<head>` das duas páginas, **idêntico nas duas** (se mudar um, copie para o outro). O PIN fica só no aparelho (hash PBKDF2 em `financas-trava`, junto com o tempo `min`, padrão 5 minutos, e o id da digital `cred`, via WebAuthn com o leitor do próprio aparelho). A última atividade fica em `financas-trava-ativo`, compartilhada entre as páginas. Sempre pede o PIN quando o app é aberto de novo depois de fechado (marca `financas-trava-sessao` no sessionStorage, que sobrevive à troca Pessoal ↔ Empresa mas some ao fechar). Trocar de app e voltar só trava se passar o tempo configurado (ele confere banco em outro app e não quer travar). O botão 🔒 ao lado do tema abre as opções. A página avisa a trava chamando `Trava.logado()` depois do login e define `Trava.sair` (usado em “Esqueci o PIN”, que desliga a trava e pede e-mail e senha de novo). É uma trava de tela no aparelho; a segurança dos dados continua sendo o login do Supabase.

- **Lançar por voz/texto com IA** (lado Pessoal), desde 24/11/2026: o app manda a frase para a função `voz` do Supabase (`supabase/functions/voz/index.ts`), que chama o Claude Haiku (`claude-haiku-5-5`) e devolve descrição curta, categoria, observação, data, valor, conta, cartão e parcelas. A chave fica só no segredo `ANTHROPIC_API_KEY` do Supabase (nunca no site). Se a função falhar ou não existir, o app usa as regras locais (`parseVoz`). A função é publicada pelo painel do Supabase (Edge Functions), não pelo GitHub: se mudar o arquivo, cole de novo lá.

## Preferências visuais (importante)
- Fundo azul-marinho escuro (`--bg:#0a2540`), com tema claro opcional. A chave `financas-tema` no localStorage é compartilhada entre as duas páginas.
- Fonte Hanken Grotesk. Números grandes em peso 300.
- **Destaques só em etiquetas coloridas (badges: pago, pendente, atrasado etc.). Nada de faixas ou barras coloridas**: ele acha poluído.
- Precisa funcionar bem no celular.

## Lado Pessoal (`index.html`)
- Contas: MP Oseias, MP Tainá, cofrinhos (Olívia, Mary Kay, Projetos Tainá) e Caixa Preta (dinheiro físico).
- Ele gosta de deixar previsões de gastos recorrentes nos meses futuros, que vão sendo abatidas pelos gastos reais.
- O pró-labore da InfoPro Digital cai na conta **MP Oseias**.
- O menu tem o link `Empresa ↗` apontando para `empresa.html`.

## Lado Empresa (`empresa.html`)

### Negócio
Venda de infoprodutos com funil simples: anúncio (Meta Ads), página de vendas e checkout.
- **InfoPro Digital**: ME no **Simples Nacional** (CNPJ do Oseias). A empresa se chama InfoPro Digital; “FarmaTécnica” é só a marca de alguns produtos (não use como nome da empresa, categoria ou conta). Produtos: Manual de Fórmulas FarmaTécnica e Documentos Operacionais FarmaTécnica (principais); Dominando os Cálculos na Manipulação Magistral, Guia de Preparação para Fiscalização Sanitária, Guia de Excipientes para Cápsulas e RDC 1000 Descomplicada (order bumps, mas às vezes ele faz tráfego direto para eles).
- **Tainá (MEI)**: produto Flex, pausado, com vendas esporádicas e planos de retomar. DAS MEI fixo de R$ 86 por mês. Vende pela Hotmart, e o dinheiro cai na conta MP Tainá.
- **Testes de produto**: de vez em quando ele testa produtos novos (ex.: Cardápio de Páscoa, pela Kiwify). No app são produtos com `status: "teste"`, mostrados à parte no painel.
- Ele preferiu tudo junto num app só, **separado por CNPJ** (filtro no topo).

### Plataformas, contas e cartões
- Greenn: taxa de **4,99% + R$ 1,00 por venda**. Checkout principal da InfoPro Digital.
- Hotmart: **9,9% + R$ 2,49**. Kiwify: **8,99% + R$ 2,49** (em vendas baratas, abaixo de uns R$ 20, a Kiwify não cobra o fixo). Conferido nos relatórios de vendas em 24/11/2026.
- Ele tem conta na Hotmart e na Kiwify tanto no nome dele (InfoPro Digital) quanto no da Tainá. A Kiwify do Oseias também vende produtos da Tainá (Guia de Alongamento, SouFlex).
- Contas: **Nubank PJ** (recebe os saques das plataformas), Greenn, Hotmart, Kiwify (saldos dentro das plataformas) e MP Tainá.
- Cartões de crédito: **Nubank PJ** (fecha dia 1, vence dia 8) e **Cora** (fecha dia 5, vence dia 10; **datas a confirmar**). Ele reveza entre os dois para pagar a Meta.

### Tráfego e impostos escondidos (o foco do app)
- Contas de anúncio **em real**: desde jan/2026 a Meta repassa PIS/Cofins (9,25%) e ISS (2,9%). Do valor cobrado no cartão, **12,15% são impostos** (R$ 100 de mídia viram R$ 113,83 cobrados).
- Contas **em dólar** (são duas, as que menos gastam): +**3,5% de IOF** sobre o valor convertido. Ele pensa em migrar contas para dólar mais para frente.
- Ferramentas pagas em dólar (ex.: Claude): +3,5% de IOF, marcado como "compra internacional".
- DAS do Simples: a InfoPro está no **Anexo II** (conferido nas guias de set e out/2026: a guia só traz IRPJ, CSLL, Cofins, PIS e CPP, sem IPI e ICMS, que é 60,5% do DAS cheio; na faixa 1 dá 2,72% do faturamento). O app calcula pela alíquota efetiva do anexo (II, III ou V; no II multiplica por `SIMPLES_PARTE`), com base no faturamento bruto dos 12 meses anteriores (RBT12). Existe a opção de "alíquota fixa %" em Configurar. Vence dia 20 do mês seguinte. O INSS da guia separada (R$ 178,31) é os 11% descontados do pró-labore formal de R$ 1.621; a parte da empresa (CPP) já está dentro do DAS.

### Estrutura de dados (documentos na tabela `docs`)
- `emp-cfg`: `{cnpjs, prods, plats, ads, contas, cards, fixas, imap}`. Os padrões estão em `DEF_CFG`. `imap` guarda `{plat, nome, prod}`: qual produto do app corresponde a cada nome de produto nos CSVs (`prod: "-"` = não importar).
- `emp-m-AAAA-MM`: `{kind:"emp-month", txs:[...]}`. Tipos de transação (`k`):
  - `venda`: prod, plat, qtd, bruto, taxa, reemb. Vendas importadas de CSV têm também `ext` (`{idDaVenda: taxa}`) e `extR` (ids reembolsados); são somadas por dia, produto e plataforma, e o `ext` evita duplicar na reimportação.
  - `ads`: conta (id da conta de anúncio), cobrado, prod (opcional), pag
  - `desp`: desc, cat, valor, cnpj, pag, intl, pago, fix (id da despesa fixa)
  - `transf`: de, para, valor, taxa (taxa de saque)
  - `rec`: outras entradas
  - `pagfat`: card, due, valor, pag
  - `ajuste`: conta, valor
- `pag` vem como `"card:Nome"` ou `"conta:Nome"`. Contas e cartões são referenciados pelo nome; produtos, CNPJs e contas de anúncio, pelo id.

### Telas
Painel (resultado do mês, impostos escondidos, tráfego real com ROAS real e ROAS mínimo, vencimentos, saldos, testes, ano), **Panorama** (desde 24/11/2026: o ano inteiro em gráficos de entradas × saídas e sobra acumulada, um cartão por mês, DRE gerencial com os meses em colunas e indicadores (ticket médio, ROAS real, CPA, margens), botão no topo “Resultado: deu lucro?” / “Caixa: tem dinheiro?” que troca a aba inteira (resumo, gráficos, cartões dos meses, tabela e total geral) entre competência e regime de caixa (compras no cartão pelo vencimento da fatura, saques internos fora). Cores nas tabelas: azul = entrou, rosa (`--cout`, classe `outc`) = saiu, resultado do mês em etiqueta verde/vermelha e total geral desde o primeiro mês lançado). As compras no cartão continuam no mês da compra; ele não quer alinhar com o Pessoal. Desde 25/11/2026 a visão Caixa do ano atual começa pela posição de caixa: dinheiro hoje (banco + plataformas, `caixaHoje`), a pagar até o fim do mês e até 31/12 (`vencList`) e quanto fica em 31/12 sem vendas novas, com a agenda “Dinheiro em caixa × contas a pagar” (saldo depois de cada pagamento). Os cartões dos meses e a tabela mostram o dinheiro nas contas no início e no fim do mês (`saldoFim`: real nos meses passados, previsto nos outros); início + entrou − saiu + ajustes = fim. No caixa, fatura paga sai na data do pagamento (`pagfat`) e a que falta pagar, no vencimento; DAS a vencer entra no mês do vencimento. Lançamentos (com totais no topo: quantidade, entradas = vendas líquidas + outras entradas, saídas = anúncios + despesas; saques, faturas pagas e ajustes ficam fora), Produtos, Contas e cartões (saldos de hoje com total, bancos e plataformas; faturas que vencem no mês escolhido no topo, com total do mês e aviso das atrasadas de meses anteriores; pagar fatura, ajustar saldo), Impostos e Configurar.

### Resultado do mês (DRE)
Faturamento bruto − reembolsos − taxas das plataformas − taxas de saque − DAS previsto = **receita líquida**; − anúncios (mídia + impostos + IOF) − outros canais de tráfego = **margem de contribuição**; − estrutura fixa = **lucro operacional**; + outras entradas − pró-labore − INSS = **sobra na empresa**. A categoria "DAS (pagamento)" não entra no DRE, porque o DAS já foi previsto por competência. Quando o DAS de uma competência já foi pago (despesa "DAS (pagamento)" do mesmo CNPJ no mês seguinte), `dasMonth` usa o valor real pago no lugar da estimativa (DRE, vencimentos e Impostos). A estimativa pela alíquota só vale para meses ainda não pagos. Motivo: a estimativa dava bem mais que o DAS real e mostrava "atrasado" com tudo pago.

## Pendências e próximos passos
1. Feito em 24/11/2026: **importar vendas por CSV** (Greenn, Hotmart e Kiwify), botão “Importar vendas (CSV)” em Lançamentos. A Greenn não tem código de transação no CSV; o id é montado com data, produto, valor e data de pagamento.
2. Confirmar com ele: a alíquota do DAS e a base com o contador, as datas do Cora, os saldos iniciais das contas e os nomes reais das contas de anúncio.
1b. Feito em 24/11/2026: botão “Importar lançamentos preparados” (Configurar › Copiar ou restaurar) lê um JSON `{kind:"emp-import", titulo, cards, contaAlias, quitarAte, txs}`; pula ids que já existem e marca como pagas as faturas que vencem até `quitarAte`. A planilha “CONTROLE FINANCEIRO EMPRESA 26.xlsx” (jan a ago/2026) foi convertida para `planilha-empresa-2026.json` nos arquivos do projeto. Na planilha os cartões são Digio (vence 5), Nubank (vence 14) e Clickcard (vence 25); não aparece Cora.
2b. Faltam os arquivos `icon-192.png` e `icon-512.png` (o manifest e o apple-touch-icon apontam para eles).
3. Ideia: o pró-labore pago no lado Empresa virar uma entrada automática na conta MP Oseias do lado Pessoal (requer escrever no formato de dados do `index.html`, com cuidado).
4. Depois: avaliar a migração das contas de anúncio para dólar (comparar 12,15% de impostos com 3,5% de IOF + câmbio).
5. Os meses antigos da planilha (2026) não foram importados. Ele disse que serviam só para entender o fluxo de gastos.
6. Auditoria de 24/11/2026: o controle completo da Empresa começa em **dez/2025**. As vendas de 2021 a nov/2025 foram retiradas a pedido dele (sem custos lançados, mostravam lucro falso). Os saldos de 30/11/2025 ficaram como ajustes `saldoini-*` em 01/12/2025. Cópia de tudo na tabela `docs`, key `backup-emp-2026-11-24-auditoria`. Imposto da Meta (12,15%) só vale para cobranças a partir de `META_IMP_DESDE` (2026-01-01). DAS lançado como pendente (`pago:false`) não conta como pago. Despesas fixas: só as que saem da conta (contadora, INSS, DAS MEI); as de cartão vêm das faturas.
