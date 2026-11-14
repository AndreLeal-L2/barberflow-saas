# Redesign Compasso com Hallmark

> Proposta anterior. Substituída pela [identidade Ritmo](IDENTIDADE_RITMO.md), por pedido explícito do utilizador em 28 de outubro de 2026.


28 de outubro de 2026. A direção visual partilhada está em [`design.md`](../design.md).

## Resultado

A página inicial passa a ter uma composição editorial: texto sobre papel sálvia, fotografia existente em grande formato, captura real da agenda a toda a largura, configuração em linhas e uma chamada final para o registo na beta. O logo Passo e o verde Compasso mantêm-se. Georgia é usada apenas nos títulos públicos; a aplicação, os formulários e os controlos continuam com a fonte de sistema. Não são carregadas fontes externas.

O preço e os ecrãs de conta partilham esta direção. A agenda e o fluxo de reserva recebem as mesmas superfícies, contraste e controlos. Não foram alterados handlers, endpoints, modelos, rotas, identificadores de testes ou textos legais. Foram retiradas legendas de secção redundantes antes dos títulos; datas, condições e estados não foram retirados. As alterações que já existiam na árvore de trabalho foram preservadas.

## Material

A fotografia de mehdi pezhvak e o seu crédito existente mantêm-se. Não foram criadas métricas, testemunhos ou logos de clientes.

As duas imagens `compasso-agenda-desktop.webp` e `compasso-agenda-mobile.webp` são capturas do produto em execução com API e PostgreSQL reais, numa base `barberflow_e2e` em `127.0.0.1:5433`. Usam apenas contas sintéticas `example.test` e dados ilustrativos. Substituem a antiga agenda desenhada em HTML, conservando a identificação de demonstração no elemento `figure` e na legenda. Os dois ficheiros somam cerca de 58 KB. Não contêm credenciais ou dados de clientes.

## Verificação

- Backend: `./mvnw --batch-mode --no-transfer-progress verify`, 62 testes passaram.
- Frontend: `pnpm test:unit`, 98 testes passaram; `pnpm build` e `pnpm test:e2e:types` passaram.
- Navegador: primeira bateria, 17 testes passaram. Verificação final com a regressão do cabeçalho: **18 testes passaram** em 1,6 minutos, sem retries.
- A regressão nova do cabeçalho teve RED por asserção antes da correção e GREEN com o teste inalterado. A evidência está em [`REGRESSION_LOG.md`](REGRESSION_LOG.md).
- Uma revisão independente identificou e confirmou a resolução de três pontos: quebra do título, contraste da ligação secundária no hero móvel e contenção dos controlos no cabeçalho móvel.

A auditoria Hallmark através do URL da página inicial terminou com **0 FAIL, 0 REFLEX abertos, 1 dispensa justificada e 3 avisos de comparação**. A dispensa é o enquadramento Poster: a fotografia ocupa o ecrã inteiro, embora o texto termine antes. Os avisos correspondem aos números da antiga prévia agora contidos na captura e à comparação inicial de templates Angular como ficheiros HTML isolados. Não representam verificações de integração substituídas por mocks. A auditoria final usa a aplicação renderizada, não esses templates isolados. Não se declara uma análise estática completa de todos os estilos legados sem avisos.

Relatórios e capturas ficam em `.hallmark/` e `frontend/test-results/`, ignorados pelo Git. `.hallmark/compare.html` permite comparar a página inicial antes e depois. Os novos testes públicos verificam 320, 390, 700, 1280, 1440 e 1920 px, foco visível, imagens carregadas, navegação, idioma e modo escuro. O percurso completo mantém API e base de dados reais. Não houve deployment nesta alteração.
