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
- `sw.js` é um service worker com cache do "shell" (constante `C`, hoje `financas-v2`). **Incremente a versão de `C` sempre que mudar `index.html`, `empresa.html` ou a lista `SHELL`**, senão o celular continua mostrando a versão antiga.
- PWA: `manifest.webmanifest`, `icon.svg`, `icon-192.png`.
- Tudo é HTML, CSS e JS num arquivo só por página, sem build e sem framework. Mantenha assim.
- Para testar sem Supabase, `empresa.html?demo` usa localStorage (chaves `demo-emp-*`).

## Preferências visuais (importante)
- Fundo azul-marinho escuro (`--bg:#0a2540`), com tema claro opcional. A chave `financas-tema` no localStorage é compartilhada entre as duas páginas.
- Fonte Hanken Grotesk. Números grandes em peso 300.
- **Destaques só em etiquetas coloridas (badges: pago, pendente, atrasado etc.). Nada de faixas ou barras coloridas**: ele acha poluído.
- Precisa funcionar bem no celular.

## Lado Pessoal (`index.html`)
- Contas: MP Oseias, MP Tainá, cofrinhos (Olívia, Mary Kay, Projetos Tainá) e Caixa Preta (dinheiro físico).
- Ele gosta de deixar previsões de gastos recorrentes nos meses futuros, que vão sendo abatidas pelos gastos reais.
- O pró-labore da FarmaTécnica cai na conta **MP Oseias**.
- O menu tem o link `Empresa ↗` apontando para `empresa.html`.

## Lado Empresa (`empresa.html`)

### Negócio
Venda de infoprodutos com funil simples: anúncio (Meta Ads), página de vendas e checkout.
- **FarmaTécnica**: ME no **Simples Nacional** (CNPJ do Oseias). Produtos: Manual de Fórmulas FarmaTécnica e Documentos Operacionais FarmaTécnica (principais); Dominando os Cálculos na Manipulação Magistral, Guia de Preparação para Fiscalização Sanitária, Guia de Excipientes para Cápsulas e RDC 1000 Descomplicada (order bumps, mas às vezes ele faz tráfego direto para eles).
- **Tainá (MEI)**: produto Flex, pausado, com vendas esporádicas e planos de retomar. DAS MEI fixo de R$ 86 por mês. Vende pela Hotmart, e o dinheiro cai na conta MP Tainá.
- **Testes de produto**: de vez em quando ele testa produtos novos (ex.: Cardápio de Páscoa, pela Kiwify). No app são produtos com `status: "teste"`, mostrados à parte no painel.
- Ele preferiu tudo junto num app só, **separado por CNPJ** (filtro no topo).

### Plataformas, contas e cartões
- Greenn: taxa de **4,99% + R$ 1,00 por venda**. Checkout principal da FarmaTécnica.
- Hotmart: **9,9% + R$ 2,49**. Kiwify: **8,99% + R$ 2,49** (em vendas baratas, abaixo de uns R$ 20, a Kiwify não cobra o fixo). Conferido nos relatórios de vendas em 24/11/2026.
- Ele tem conta na Hotmart e na Kiwify tanto no nome dele (FarmaTécnica) quanto no da Tainá. A Kiwify do Oseias também vende produtos da Tainá (Guia de Alongamento, SouFlex).
- Contas: **Nubank PJ** (recebe os saques das plataformas), Greenn, Hotmart, Kiwify (saldos dentro das plataformas) e MP Tainá.
- Cartões de crédito da empresa: **Nubank PJ** (fecha dia 7, vence dia 14) e **Cora** (fecha dia 22, vence dia 27; o banco empurra para o dia útil seguinte). Confirmado em 24/11/2026. Ele reveza entre os dois para pagar a Meta. **Digio** e **Clickcard** são cartões pessoais que ele usava antes; ainda há parcelas da empresa neles.
- "MEI Oseias" na planilha antiga é um MEI dele já baixado (taxas finais).

### Tráfego e impostos escondidos (o foco do app)
- Contas de anúncio **em real**: desde jan/2026 a Meta repassa PIS/Cofins (9,25%) e ISS (2,9%). Do valor cobrado no cartão, **12,15% são impostos** (R$ 100 de mídia viram R$ 113,83 cobrados).
- Contas **em dólar** (são duas, as que menos gastam): +**3,5% de IOF** sobre o valor convertido. Ele pensa em migrar contas para dólar mais para frente.
- Ferramentas pagas em dólar (ex.: Claude): +3,5% de IOF, marcado como "compra internacional".
- DAS do Simples: calculado pela alíquota efetiva (Anexo III, ou V), com base no faturamento bruto dos 12 meses anteriores (RBT12). Existe a opção de "alíquota fixa %" em Configurar. Vence dia 20 do mês seguinte. **Pendente:** na planilha antiga o DAS pago era bem menor que 6% do faturamento. Ele vai confirmar com o contador a alíquota e a base de cálculo.

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
Painel (resultado do mês, impostos escondidos, tráfego real com ROAS real e ROAS mínimo, vencimentos, saldos, testes, ano), Lançamentos, Produtos, Contas e cartões (saldos, faturas, pagar fatura, ajustar saldo), Impostos e Configurar.

### Resultado do mês (DRE)
Faturamento bruto − reembolsos − taxas das plataformas − taxas de saque − DAS previsto = **receita líquida**; − anúncios (mídia + impostos + IOF) − outros canais de tráfego = **margem de contribuição**; − estrutura fixa = **lucro operacional**; + outras entradas − pró-labore − INSS = **sobra na empresa**. A categoria "DAS (pagamento)" não entra no DRE, porque o DAS já foi previsto por competência.

## Pendências e próximos passos
1. Feito em 24/11/2026: **importar vendas por CSV** (Greenn, Hotmart e Kiwify), botão “Importar vendas (CSV)” em Lançamentos. A Greenn não tem código de transação no CSV; o id é montado com data, produto, valor e data de pagamento.
2. Confirmar com ele: a alíquota do DAS e a base com o contador, os saldos iniciais das contas e os nomes reais das contas de anúncio.
1b. Feito em 24/11/2026: botão “Importar lançamentos preparados” (Configurar › Copiar ou restaurar) lê um JSON `{kind:"emp-import", titulo, cards, contaAlias, quitarAte, txs}`; pula ids que já existem e marca como pagas as faturas que vencem até `quitarAte`. A planilha “CONTROLE FINANCEIRO EMPRESA 26.xlsx” (jan a ago/2026) foi convertida para `planilha-empresa-2026.json` nos arquivos do projeto. 
2b. Faltam os arquivos `icon-192.png` e `icon-512.png` (o manifest e o apple-touch-icon apontam para eles).
3. Ideia: o pró-labore pago no lado Empresa virar uma entrada automática na conta MP Oseias do lado Pessoal (requer escrever no formato de dados do `index.html`, com cuidado).
4. Depois: avaliar a migração das contas de anúncio para dólar (comparar 12,15% de impostos com 3,5% de IOF + câmbio).
5. Os meses antigos da planilha (2026) não foram importados. Ele disse que serviam só para entender o fluxo de gastos.
