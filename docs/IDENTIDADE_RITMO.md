# Compasso — Ritmo

> Proposta anterior, ajustada a pedido do utilizador para uma direção mais institucional. Consultar o [sistema atual](../design.md).

Nova identidade criada com Hallmark em 28 de outubro de 2026, após o pedido de substituir a proposta anterior.

## Direção

Coral vivo, grafite quente e branco. O símbolo C aberto e o lettering minúsculo substituem a marca provisória Passo. Os títulos usam Rethink Sans e o corpo usa Figtree. O sistema completo está em [`design.md`](../design.md).

A primeira composição mantém a fotografia real como contexto do ofício, dá escala ao título e mostra a agenda real no primeiro ecrã, incluindo mobile. O mesmo sistema passa para o painel, os formulários, o preço, o registo e as restantes páginas. A beta gratuita mantém as condições reais; o valor de 0 € na apresentação vem do preço já existente na aplicação.

## Ficheiros de marca

- `frontend/public/images/compasso-ritmo-wordmark.svg`: versão escura.
- `frontend/public/images/compasso-ritmo-wordmark-light.svg`: versão clara.
- `frontend/public/images/compasso-ritmo-symbol.svg`: símbolo.
- `frontend/public/favicon.svg`: favicon atualizado.
- `frontend/public/fonts/`: duas fontes variáveis WOFF2 locais e as licenças OFL.

As letras dos logos estão convertidas em contornos vetoriais. Não é preciso instalar as fontes para os SVGs renderizarem corretamente. As fontes da interface totalizam cerca de 59 KB. Os assets anteriores permanecem no projeto como histórico.

## Conteúdo e capturas

Rotas, links, handlers, formulários, IDs e test hooks foram preservados. O nome Compasso e os textos legais mantêm-se. A descrição do hero foi encurtada, preservando o significado e adicionando a tradução inglesa correspondente:

- Antes: «Uma agenda clara para si. Uma marcação simples para os seus clientes. Tudo começa com um link.»
- Agora: «A sua agenda e as marcações dos seus clientes, num link.»

Foram recapturados o ecrã completo e o detalhe da agenda, em desktop e mobile, com API e PostgreSQL reais no ambiente isolado `127.0.0.1:5433/barberflow_e2e` e contas `example.test`. O processo confirmou os quatro eventos e a ausência do estado «A carregar marcações» antes de guardar as imagens. As capturas são identificadas como dados ilustrativos e não contêm credenciais.

## Revisões e verificações

A revisão independente do hero terminou com `ship`, após corrigir a ausência do produto no primeiro ecrã mobile, o recorte da toolbar, a composição e a captura com a identidade anterior. A revisão final exigiu recapturar um asset desktop em carregamento; o asset foi substituído por uma captura carregada, verificado visualmente e a revisão final terminou com `ship`.

A auditoria Hallmark da página inicial renderizada terminou com **0 FAIL, 0 WARN e 0 REFLEX abertos**. Há uma dispensa justificada: o campo coral é uma superfície intencional da marca, declarado com a sua tinta própria. A comparação preserva **7/7 links e 10/10 headings**. Capturas e comparação antes/depois ficam em `.hallmark/`, ignorado pelo Git. Não se declara uma análise estática integral de todos os estilos legados sem avisos.

O contraste do foco nas superfícies coral e grafite foi coberto por regressão permanente: RED por asserção a 2,62:1, correção por tokens de superfície e GREEN sem alterar as asserções. Ver [`REGRESSION_LOG.md`](REGRESSION_LOG.md).

- Backend: 62 testes passaram.
- Frontend: 98 testes passaram.
- Build e tipos E2E: passaram.
- Bateria final de navegador: **19 testes passaram** em 1,6 minutos, sem retries, com API e base E2E reais.

Esta alteração é local; não inclui deployment.
