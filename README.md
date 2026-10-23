# Elite das Cartas

Site sem framework, servido pelo servidor padrão do Python. O SQLite guarda
cache de respostas e snapshots de preços observados; não contém dados de cartas
inventados nem é preenchido automaticamente com todo o catálogo.

## Iniciar

1. Instale Python 3.10 ou superior.
2. Copie `.env.example` para `.env` e configure as variáveis no ambiente do
   processo. Nunca coloque credenciais em JavaScript, HTML ou em repositório
   público.
3. Inicie o servidor com `python3 server.py`.
4. Abra `http://127.0.0.1:8000`.

As moedas USD, EUR e JPY são convertidas para reais usando a taxa de referência
mais recente do BCE, com a data e a moeda original exibidas. O catálogo tenta
consultar a rota local e usa o BCE diretamente como alternativa, inclusive ao
abrir por `file://`. Essa conversão é indicativa e não representa um preço
praticado no Brasil. A Scrydex e o histórico continuam exigindo o servidor Python.
Os filtros de idioma, variante e condição só retornam cartas quando a fonte
identifica essa informação para os dados carregados. Uma condição sem cotação
na fonte não é estimada nem preenchida com valores fictícios.
O filtro BRL aceita preços nativos em reais e preços com conversão cambial
disponível; selecionar outra moeda restringe pela moeda original da cotação.
Os filtros são aplicados em conjunto sobre a mesma carta/impressão.
As coleções são ordenadas do lançamento mais recente para o mais antigo quando
a fonte fornece datas ou uma ordem de publicação; datas ausentes não são
estimadas. Se a API principal de Pokémon estiver indisponível, o catálogo usa
o TCGdex para coleções e cartas compatíveis. Esse fallback não inventa preços
ou raridades. IDs que não existam na fonte alternativa ainda podem falhar ao
carregar, mas a busca direta é tentada mesmo quando o ID não aparece na lista.

Para configurar a Scrydex, crie uma conta, equipe, plano e chave na própria
Scrydex. O servidor exige `SCRYDEX_API_KEY` e `SCRYDEX_TEAM_ID`, enviados como
os cabeçalhos `X-Api-Key` e `X-Team-ID`. A API pode gerar cobrança por créditos;
acompanhe o uso no painel do fornecedor.

O servidor acessa endpoints Scrydex para Pokémon, Magic: The Gathering,
One Piece e Lorcana. Marvel / Upper Deck e Yu-Gi-Oh! não estão cobertos pela
Scrydex. Yu-Gi-Oh! mantém o provedor público existente; Marvel não tem fonte
autorizada conectada. Não há credenciais Scrydex no projeto.

## Fontes e limitações

- Scrydex: catálogo, imagens, idiomas, variantes, preços raw, preços graded e
  histórico quando oferecidos pelo jogo e pelo plano. Os preços dependem do
  mercado/moeda de origem; equivalentes em BRL são conversões indicativas
  de USD, EUR e JPY calculadas a partir das taxas de referência publicadas pelo
  Banco Central Europeu (BCE), não preços observados no Brasil. A moeda e o
  valor originais continuam visíveis no catálogo.
- População PSA: a documentação Scrydex consultada informa suporte a Pokémon
  em inglês. A disponibilidade é específica por carta/variante.
- Scrydex informa que as imagens continuam pertencendo aos titulares de direitos;
  a aplicação usa URLs da fonte e não reivindica direitos sobre a arte.
- Imagens/versões/idiomas não são presumidos quando a fonte não os descreve.
- A tabela `price_snapshots` guarda observações obtidas durante consultas de
  páginas de cartas. Não há tarefa em segundo plano agendada neste projeto
  estático; para coleta recorrente, configure um agendador no ambiente em que o
  servidor for implantado e respeite plano, cache e limites da API.

O endpoint `/api/health` mostra se o servidor recebeu as duas variáveis
Scrydex, sem revelar os valores.
