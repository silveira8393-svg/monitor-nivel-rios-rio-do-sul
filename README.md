# Monitoramento dos Rios de Rio do Sul

Painel React/TypeScript para acompanhar medições de três estações, consultar o histórico hidrológico e identificar leituras antigas ou falhas de comunicação.

## Desenvolvimento local

Recomendado: Node.js 24, como no projeto Vercel existente.

```sh
npm ci
npm run dev
```

O frontend usa `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, conforme os nomes documentados em `.env.example`. Configure-as somente em seu ambiente local autorizado. Nunca use a chave `service_role` no navegador. Sem configuração, a aplicação mostra a indisponibilidade de acesso; não apresenta dados fictícios.

Não é necessária uma chave Gemini para o monitoramento. As referências antigas ao AI Studio não representam uma integração usada pelo painel.

## Verificações locais

```sh
npm run lint
npm test
npm run build
```

`lint` verifica os tipos do frontend e dos testes. A suíte usa Node Test Runner, tsx e jsdom, com fixtures separadas em `tests/`; não consulta nem modifica Supabase remoto. Os lockfiles npm e Bun foram mantidos para compatibilidade com o checkout existente. A validação desta implementação utiliza npm.

Para revisão visual manual com medições simuladas, inicie o servidor de desenvolvimento e acesse `/tests/preview.html`. Essa entrada identifica explicitamente os dados de teste e não é incluída no build de produção.

## Histórico e confiabilidade

O botão **Ver histórico** abre gráfico e tabela filtrados por período e intervalo. Os padrões são últimas 24 horas e **1 hora**. Cada faixa conserva a última leitura válida e seu horário original; lacunas permanecem visíveis e interrompem a linha.

O limite padrão de atraso é **120 minutos**, configurável globalmente e por estação em `src/config/monitoring.ts`. É uma regra visual de atualidade, independente da frequência do coletor e da classificação de risco. Consulte a política completa, limites e detalhes de validação em [docs/HISTORICO_HIDROLOGICO.md](docs/HISTORICO_HIDROLOGICO.md).

## Infraestrutura preservada

- Vercel hospeda o frontend Vite, com saída em `dist/`.
- Supabase mantém as tabelas e o canal Realtime existentes.
- A Edge Function `sync-defesa-civil` mantém a coleta existente.
- Esta implementação não altera schema, migrações, coletor, agendamento, credenciais ou configurações remotas.
- `vercel.json` desativa deploys automáticos exclusivamente para `feat/historico-hidrologico`, permitindo revisar a branch sem preview automático. As demais branches mantêm seu comportamento. Não foi feito deploy nem merge.
