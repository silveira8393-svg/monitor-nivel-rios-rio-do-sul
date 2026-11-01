# Dashboard hidrológico v2

## Escopo e base

Branch `feat/dashboard-hidrologico-v2`, criada a partir de `feat/historico-hidrologico` no commit `7c87efd`. A árvore de trabalho estava limpa. O layout segue a referência textual fornecida: fundo azul suave, superfícies brancas, bordas discretas, cantos arredondados, sombras leves e identidade Silveira Lab. Não foi fornecida uma imagem do layout aprovado.

Sem alterações nos IDs das estações, Supabase remoto, banco, credenciais, variáveis de ambiente, Edge Functions, coleta ou agendamento. Sem dependências adicionais. O modal homologado, o gráfico histórico e `hydrology.ts` permanecem inalterados.

## Regras dos indicadores

- Última consulta: registra o horário de início da última tentativa concluída, inclusive se a promessa for rejeitada. Durante uma consulta em andamento, o indicador mantém a tentativa anterior e informa o carregamento. Novas medições recebidas por Realtime não alteram esse horário.
- Estações: exibe o total cadastrado, quantas possuem leitura recente confirmada, quantas não possuem leitura válida e quantas têm registros antigos ou não confirmados.
- Extremos: maior e menor entre a última leitura de cada estação, desde que numérica, com timestamp válido, recente, não futuro, sem erro de consulta e sem carregamento inicial. Empates mantêm a ordem das estações cadastradas. Não são máximos/mínimos históricos nem uma classificação de risco.
- Atualidade: reutiliza `monitoringConfig`, inclusive exceções por estação. Uma leitura com 120 minutos já é antiga pela regra padrão existente. Um horário futuro em relação ao relógio do painel não confirma a atualidade.
- Situações: usa somente a classificação registrada pela fonte, na ordem Normal, Atenção, Alerta, Emergência. Não deriva situações de níveis ou variações. Se qualquer estação estiver sem classificação, antiga, ausente, pendente ou com falha na consulta de leitura, o destaque é “Resumo incompleto”; a situação mais crítica confirmada é contextualizada separadamente.
- A confirmação da situação depende da consulta das últimas leituras. Falhas na consulta histórica aparecem nos gráficos e na evolução; não apagam uma última leitura obtida com sucesso.

## Consulta compartilhada de 24 horas

`useDashboardHistory` reutiliza `riverService.getStationHistory`, com uma janela móvel de 24 horas e intervalo de uma hora. A agregação, a seleção da última medição válida por faixa e os cálculos do histórico não foram duplicados.

O resultado de cada estação alimenta seu minigráfico, a série do panorama e o resumo. As três consultas iniciais ocorrem em paralelo após a tentativa inicial das últimas leituras. Uma nova leitura altera somente a consulta histórica da estação correspondente. Resultados bem-sucedidos são reutilizados dentro da janela de cache de cinco minutos; a reconciliação existente permite renová-los. Consultas malsucedidas podem ser tentadas novamente pelo botão Atualizar. Esse cache limita somente consultas de apresentação: não altera a frequência da coleta.

Requisições substituídas são abortadas e respostas atrasadas são ignoradas. Desmontar a página cancela as pendências. Não há assinatura Realtime ou temporizador adicional para o dashboard. O recorte renderizado acompanha o relógio do painel e exclui medições fora das últimas 24 horas.

Carregamento, ausência de medições e erros históricos têm mensagens distintas. Séries com erro ou em atualização não são apresentadas como confirmadas; os dados anteriores mantidos em memória ficam ocultos até uma consulta bem-sucedida. Falhas em uma estação não ocultam as demais.

## Gráficos e resumo

Os SVGs usam os timestamps reais das medições, mantêm as faixas vazias e interrompem os caminhos nas lacunas. Pontos isolados continuam visíveis. O panorama identifica as séries por nome, cor e estilo de linha. A legenda informa disponibilidade por estação. O gráfico tem rolagem horizontal contida e foco por teclado em telas estreitas; o histórico continua oferecendo a tabela e a navegação detalhada acessível.

Minigráficos têm escala local; o panorama usa uma escala vertical compartilhada, em metros. Níveis negativos válidos continuam representáveis. Os horários usam `America/Sao_Paulo`. A comparação de alturas absolutas é acompanhada da ressalva de que as referências das estações são distintas.

A evolução é a diferença entre a primeira e a última medição agregada disponíveis na janela, com pelo menos dois timestamps distintos. Exibe os horários dos extremos e ressalva lacunas. Subida/descida descrevem a diferença líquida; igualdade é “Sem alteração entre extremos”, pois não prova estabilidade contínua. Não extrapola uma observação parcial para uma variação exata de 24 horas, nem apresenta projeções ou conclusões de risco coletivo.

## Validação e limitações

- Nove novos testes em `tests/dashboard.test.ts` e `tests/dashboard-interface.test.tsx`: indicadores e extremos, classificação independente de níveis, dados antigos/ausentes/inválidos/futuros, falhas e carregamento, recorte temporal, evolução e lacunas, consultas compartilhadas, StrictMode, atualização de cards e gráficos via Realtime, cancelamento/respostas atrasadas, cache, recuperação e horário de consulta em rejeições.
- Regressões anteriores mantidas, incluindo filtros e sincronização entre tabela e trechos do histórico.
- Comandos: `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build` e `git diff --check`.
- Resultado local: 31/31 testes passaram; TypeScript da aplicação e dos testes, build Vite e integridade do diff passaram.
- O servidor de desenvolvimento respondeu HTTP 200. O host de acesso automatizado ao navegador está indisponível neste ambiente; revisão visual em desktop/celular não foi concluída. Os testes de interface usam jsdom e dados simulados exclusivamente em `tests/`; não validam o layout renderizado pelo navegador ou a disponibilidade do Supabase remoto.
- Não foi usada uma imagem de referência, nem foram alteradas configurações remotas para obter acesso aos dados. A homologação visual e com dados reais deve ocorrer no Preview antes da aprovação.

Entrega por branch e PR Draft com base em `feat/historico-hidrologico`, sem merge ou publicação em produção.
