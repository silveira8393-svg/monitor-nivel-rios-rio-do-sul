# Histórico hidrológico e confiabilidade das leituras

## Escopo

Branch: `feat/historico-hidrologico`, criada a partir de `main` (`a311b2e`).

O trabalho evolui somente o frontend e a camada de consultas de leitura. Mantém os IDs das três estações, tabelas, canal Realtime e integrações de coleta. Não modifica `supabase/`, arquivos de ambiente, agendamento, credenciais ou configurações remotas. Nenhuma migração, chamada ao coletor, publicação ou merge faz parte desta entrega.

## Períodos e intervalos

- Padrão: últimas 24 horas e intervalo de **1 hora**.
- Períodos adicionais: sete dias, 30 dias e personalizado, com data e hora inicial/final.
- Intervalos: 15 minutos, 30 minutos, uma hora, duas horas e seis horas.
- Presets representam uma janela móvel ancorada ao momento da seleção. Datas personalizadas são interpretadas em `America/Sao_Paulo`, independentemente do fuso do visitante.
- O período personalizado é aplicado por formulário; trocar o intervalo não aplica datas ainda em edição. O cabeçalho sempre identifica o período efetivamente consultado.
- Cada faixa é alinhada ao relógio local: por exemplo, 06:00–12:00 no intervalo de seis horas. Há tratamento de mudanças históricas de horário de verão. Horários locais inexistentes são rejeitados; em horário ambíguo, é usada a primeira ocorrência.
- Os limites da consulta são inclusivos. Uma leitura exatamente no horário final pertence à faixa que começa naquele instante. A primeira e a última faixa podem ter cobertura parcial do período; apenas leituras dentro dos limites participam.
- É selecionada a última medição válida de cada faixa, preservando seu timestamp. Validade exige nível numérico finito e data reconhecível. Valores ausentes ou strings vazias não viram zero.
- A variação é recalculada entre medições efetivamente selecionadas, em ordem cronológica, mesmo quando existe uma lacuna entre elas. A primeira medição exibida do período não tem variação. Ela não representa necessariamente uma taxa por hora.

## Lacunas, gráfico e tabela

Faixas sem medições têm representação explícita na tabela e fundo âmbar no gráfico. A linha é interrompida nessas faixas: não há interpolação, preenchimento com zero ou criação de medições artificiais.

Gráfico SVG sem nova dependência de produção. O eixo vertical usa metros; os pontos usam horários reais. Cursor, toque ou setas do teclado permitem consultar nível, horário e variação. O gráfico acompanha a largura disponível sem reduzir os rótulos proporcionalmente em telas pequenas.

A tabela começa pela faixa mais recente e renderiza até 25 linhas por página dentro do trecho selecionado no gráfico. O gráfico renderiza até 240 faixas por trecho, com navegação para trechos anteriores. Ambos utilizam exatamente o mesmo conjunto agregado e a mesma seleção de trecho. Trocar o trecho reinicia a página da tabela; aplicar filtros reinicia ambos. As variações são calculadas sobre o período completo antes de selecionar o trecho, preservando a comparação nas fronteiras. Trechos do gráfico têm escala vertical própria; os valores do eixo indicam a escala vigente.

O histórico é uma consulta do período selecionado. Enquanto o modal estiver aberto, novas medições continuam chegando aos cards; o histórico é recarregado ao alterar os filtros, tentar novamente ou reabrir o modal. O cabeçalho mostra a medição mais recente conhecida entre o card e o período consultado.

## Consultas e limites de volume

As consultas usam exclusivamente `SELECT` sobre `river_readings`, filtrando estação e datas. A paginação usa `read_at` como cursor crescente, aproveitando a unicidade existente de `(station_id, read_at)`. Cada página pede até 500 registros. Páginas menores do que esse limite não encerram a consulta: ela prossegue até uma resposta vazia, evitando truncamento por limites menores da API.

Cada página é agregada imediatamente; não se mantém toda a série bruta em memória. Filtros alterados ou modal fechado abortam a consulta anterior, e resultados atrasados são ignorados. Falha intermediária invalida a consulta inteira; nenhum resultado parcial é apresentado como completo.

Limites explícitos de proteção do cliente:

- Até 366 dias por consulta personalizada; períodos maiores exigem dividir a consulta.
- Até 200 mil registros brutos processados por consulta; o limite gera erro visível, sem truncamento silencioso.
- Timeout de 20 segundos por requisição.
- Até cerca de 35 mil faixas agregadas no maior período/menor intervalo; somente 25 linhas e 240 faixas são renderizadas por vez.

O cliente não consegue distinguir ausência de registros causada pela fonte, por falha passada da coleta ou por retenção. “Sem medição” descreve somente os registros disponíveis na consulta. Consultas paginadas não constituem uma transação única/snapshot do banco; inserções históricas retroativas durante a leitura podem exigir nova consulta.

## Regra de atualidade

`src/config/monitoring.ts` centraliza:

- `staleAfterMinutes`: 120 minutos por padrão.
- `stationStaleAfterMinutes`: exceções por ID de estação, após confirmar a cadência da fonte.
- `reconciliationMs`: cinco minutos para recuperar o estado do painel enquanto a aba estiver visível.

A partir de 120 minutos sem nova medição, a leitura recebe o rótulo “Medição desatualizada”. Essa escolha é uma regra de apresentação configurável, não um diagnóstico de falha da coleta ou um limite hidrológico. Não presume que uma invocação da Edge Function produza uma medição nova.

O card informa data/hora completas, idade e situação **na medição**. Leituras antigas não são rotuladas como nível atual. A classificação registrada não é substituída por limites calculados no frontend. Uma classificação ausente permanece desconhecida.

O cabeçalho registra o horário da última consulta ao sistema, inclusive tentativas que retornaram erro por estação. Esse horário não é o timestamp da medição nem é atualizado apenas por receber um evento Realtime.

Em falhas temporárias, a última leitura válida é preservada e acompanhada de aviso. Eventos Realtime antigos, duplicados ou inválidos não substituem leituras mais recentes. A reconciliação ocorre na assinatura/reconexão Realtime, no evento `online`, ao voltar à aba e periodicamente. Comparações de timestamp também protegem contra respostas HTTP atrasadas em relação a eventos Realtime.

## Validação

- `npm run lint`: TypeScript do frontend e dos testes.
- `npm test`: 22 testes com dados inteiramente simulados, cobrindo agregação, última leitura válida, virada de dia, horário de verão histórico, lacunas, variação, ordenação, limites extensos, paginação da API, erros, cancelamento, filtros, paginação da tabela, segmentação do gráfico, teclado, respostas atrasadas, Realtime e recuperação após reconexão/retorno à aba. A regressão de sincronização compara datas, níveis, variações e lacunas entre tabela e trecho do gráfico, atravessa páginas e trechos (inclusive o mais antigo, parcial), exercita todos os intervalos e períodos e distingue datas personalizadas em edição do filtro aplicado.
- `npm run build`: build Vite local.
- `git diff --check`: integridade do diff.

Os comandos passaram na implementação. O executor tsx exigiu permissão fora da restrição de sandbox do Windows para consultar informações de usuário; os testes não acessam rede real nem Supabase remoto.

A página de QA `/tests/preview.html` é servida somente no desenvolvimento e está separada do ponto de entrada de produção. A inspeção visual no navegador Windows ficou pendente: a ferramenta de Computer Use interrompeu o acesso por não conseguir determinar a URL atual com segurança. Os testes de interface em jsdom validam comportamento e semântica, mas não substituem revisão visual em dispositivos reais.

## Publicação para revisão

`vercel.json` contém `git.deploymentEnabled` com `false` exclusivamente para `feat/historico-hidrologico`, conforme [a configuração oficial da Vercel](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled). Branches não especificadas permanecem habilitadas. Essa regra permite publicar a branch e abrir PR sem gerar deploy automático dela. Não altera as configurações remotas ou a branch de produção.

## Arquivos da implementação

- Aplicação: `src/App.tsx`, `src/components/Header.tsx`, `src/components/Footer.tsx`, `src/index.css`.
- Histórico: `src/components/StationHistoryModal.tsx`, `src/components/HistoryChart.tsx`.
- Cards e informações: `src/components/StationCard.tsx`, `src/components/SupabaseInfoModal.tsx`.
- Leituras e regras: `src/services/supabase.ts`, `src/services/riverRepository.ts`, `src/lib/hydrology.ts`, `src/config/monitoring.ts`.
- Hooks: `src/hooks/useRiverReadings.ts`, `src/hooks/useDialog.ts`.
- Testes: `tests/hydrology.test.ts`, `tests/repository.test.ts`, `tests/interface.test.tsx`, `tests/dom.ts`, `tests/preview.html`, `tests/preview.tsx`, `tsconfig.tests.json`.
- Dependências e execução: `package.json`, `package-lock.json`, `bun.lock` (tipos oficiais React/React DOM e jsdom somente em desenvolvimento).
- Documentação e revisão: `README.md`, `docs/HISTORICO_HIDROLOGICO.md`, `vercel.json`.

O relatório anterior `RELATORIO_CODEX.md` foi mantido como registro histórico da implementação precedente.
