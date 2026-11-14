# Compasso — direção institucional

Atualização de 29 de outubro de 2026: identidade institucional com novo símbolo, após o utilizador rejeitar a logo anterior. O nome Compasso, os conteúdos, as rotas e os fluxos do produto mantêm-se.

## Identidade

Azul-marinho, cinzentos frios e branco. Superfícies neutras, linhas discretas e cantos de 6 a 8 px. O destaque da marca usa um azul moderado. A logo usa agora um compasso de desenho estilizado: articulação circular, duas hastes e ponte curva de ajuste. A assimetria da ponta de desenho distingue o instrumento. O lettering **Compasso**, com inicial maiúscula, usa Rethink Sans em peso 580 convertido em contornos vetoriais. O símbolo azul acompanha o nome azul-marinho; em fundos escuros usa azul claro e branco. O favicon apresenta o mesmo símbolo sobre uma base azul-marinho.

SVGs nativos em `frontend/public/images/compasso-institucional-{wordmark,wordmark-light,symbol}.svg`; favicon correspondente. Os logos anteriores permanecem como histórico. A identidade carregada pelo proprietário de cada negócio continua independente.

## Tipografia e apresentação

Mantêm-se as fontes locais Rethink Sans e Figtree, com as licenças OFL. Títulos em peso 600, menores, com menos compressão e espaçamento mais regular. A abertura apresenta apenas título, explicação e ações, sobre a fotografia. A pré-visualização da agenda foi removida da hero a pedido do utilizador; a apresentação do produto permanece na secção seguinte. No telemóvel, a ação mantém-se no primeiro ecrã.

O preço da beta mantém-se, com menor destaque gráfico. Numeração dos passos, botões, formulários e rodapé recebem o mesmo tratamento contido. O container público continua limitado a 1160 px. A fotografia existente tem presença visível, com um gradiente azul-marinho concentrado junto ao texto e ao rodapé da hero. No telemóvel, o gradiente acompanha a disposição vertical do conteúdo.

## Sistema e verificação

Tokens em `frontend/src/tokens.css`; associações aos nomes semânticos existentes e elementos partilhados em `_hallmark.scss`. Modo escuro com superfícies e foco próprios. Verde e vermelho mantêm apenas o significado de sucesso e erro.

Preservar estados de carregamento, vazio, erro, pendente e sucesso. Foco imediato com contraste mínimo 3:1 e alvos táteis existentes. Capturas reais com API e PostgreSQL locais, contas `example.test` e `barberflow_e2e` em 5433; confirmar os eventos e a ausência de carregamento antes de capturar. Não inventar métricas ou testemunhos.

Esta alteração é visual. Correções de defeitos continuam sujeitas ao RED/GREEN de AGENTS.md. Manter os testes de regressão permanentemente e os relatórios gerados fora dos commits.

## Ergonomia móvel

Até 700 px, cabeçalho das páginas de conta em uma linha, campos de 16 px com altura de 48 px e controlos de toque com pelo menos 44 px. A agenda usa ações de partilha por ícone com o nome acessível preservado e controlos de data em duas linhas compactas. A 320 px, a ação de nova marcação ocupa uma linha própria. Preservar a área segura inferior da navegação e dos diálogos. A hero mantém a altura estável durante scroll, e o cabeçalho público mantém os 132 px existentes. Verificar também os limites reais dos elementos: ocultar overflow não deve mascarar controlos fora do ecrã.
