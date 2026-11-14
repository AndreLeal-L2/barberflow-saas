# Compasso — direção de produto

## Feedback aplicado em 23 de outubro de 2026

O cliente pediu menos informação por ecrã, uma agenda fácil de operar e uma página pública rápida, sem instalação. As imagens fornecidas serviram de referência de interação: horários numa grelha, períodos bloqueados, navegação por data e acesso ao link de marcação.

### Identidade

**Compasso** é a proposta de nome implementada: remete para tempo, ritmo e organização, sem prender o produto a uma profissão. A identidade usa um símbolo próprio, verdes discretos, superfícies claras e uma tipografia simples; inclui modo escuro. A apresentação, o registo, os títulos e os e-mails passam a usar esta marca. A escolha não implica disponibilidade comercial, de domínio ou de registo de marca.

Os identificadores técnicos `barberflow`, variáveis de ambiente, tabelas, sessão, preferências guardadas e URLs públicos mantêm compatibilidade. Um remetente de e-mail definido explicitamente em `BARBERFLOW_MAIL_FROM` continua a prevalecer sobre o nome de apresentação por defeito.

### Organização do trabalho

- `/dashboard` abre a agenda. `/dashboard/bookings` continua a funcionar como ligação antiga.
- `/dashboard/overview` mantém o resumo, estatísticas e configuração inicial.
- Serviços, disponibilidade e página pública têm destinos próprios.
- A disponibilidade separa **Horário semanal** de **Indisponibilidades**.
- A página pública separa **Publicação** de **Informação pública**. Alternar não apaga edições por guardar.

### Agenda

É possível navegar por data, regressar a hoje, alternar entre calendário e lista e atualizar os dados. Clicar num período livre abre uma marcação com a data e hora pretendidas. A seleção só avança depois de a API confirmar que esse horário está livre para o serviço escolhido.

Clicar numa marcação abre os dados, contacto e ações de estado. Uma marcação cancelada permanece no histórico e liberta a grelha. Os detalhes curtos continuam legíveis em eventos de 30 minutos. Os atalhos **Copiar link** e **Ver página** estão disponíveis também no telemóvel, com alternativa de cópia manual quando o navegador recusa acesso à área de transferência.

### Experiência do cliente

O fluxo público mostra uma tarefa de cada vez: **Serviço → Horário → Dados**. Mantém preços, duração, escolha de outra data, resumo e confirmação. Pode-se voltar a etapas anteriores sem perder os contactos introduzidos. Uma reserva em curso bloqueia mudanças da seleção; um conflito devolve o cliente aos horários e preserva os dados.

A marcação não exige conta do cliente nem aplicação instalada. Os percursos de publicação, reserva, cancelamento, sessão e CSRF continuam a usar a API e PostgreSQL reais.

## Limites desta alteração

A marcação manual reutiliza a API pública existente e, por isso, requer uma página publicada e um horário futuro disponível nos próximos 60 dias. Não contorna pausas, bloqueios ou conflitos. O backend continua a atribuir as novas reservas ao profissional predefinido; esta alteração não acrescenta gestão de equipas, recursos ou escolha de profissional. A linguagem passa a servir pequenos negócios de serviços, sem introduzir funções específicas de outros setores.

As referências a notificações nas imagens não se transformaram num painel com dados fictícios. Mantém-se o envio de e-mails já existente; esta alteração não acrescenta SMS nem notificações em tempo real. A verificação local usa entrega por log, sem enviar mensagens externas.

Não foi feita publicação no ambiente de produção. Os testes e capturas usam apenas contas sintéticas e a base temporária descrita em [TESTING.md](TESTING.md).

## Personalização por barbearia — 24 de outubro de 2026

Em **Página pública → Personalização**, o profissional pode escolher uma imagem de fundo e o logo da sua barbearia. A imagem de fundo aparece no cabeçalho da página de marcação; o logo aparece nessa página e junto ao nome do negócio no dashboard. É possível substituir ou remover cada imagem separadamente. As imagens são guardadas assim que são escolhidas; alterar a descrição ou morada continua a usar o botão de guardar do formulário próprio.

São aceites PNG e JPEG até 5 MB e 16 milhões de píxeis. O servidor valida o conteúdo, remove metadados ao voltar a codificar e reduz a dimensão máxima a 512 px para logos ou 1600 px para fundos. As imagens ficam numa tabela própria em PostgreSQL, com migração Flyway V13, RLS e sem acesso direto pelos papéis públicos da Data API. Os endpoints de escrita exigem sessão e CSRF. O acesso público às imagens exige que a página esteja publicada e a subscrição permita reservas; no dashboard, o proprietário consegue vê-las mesmo antes de publicar.

As versões das imagens mudam em cada substituição. Guardar o perfil noutra aba não apaga uma imagem nova; respostas de uma página já abandonada não repõem imagens de uma sessão anterior. O limite de upload no Nginx foi aumentado apenas na rota de imagens, mantendo o limite anterior nos restantes pedidos.

As quatro propostas iniciais de logo Compasso foram apresentadas como rascunhos vetoriais; nessa altura, o utilizador preferiu manter o logo anterior e criar o seu próprio mais tarde. Esta decisão é independente do upload do logo de cada barbearia.

## Identidade provisória — 25 de outubro de 2026

Após duas novas séries de estudos minimalistas, o utilizador escolheu **09 · Passo** como logo provisório do Compasso. O símbolo de duas formas diagonais substitui o favicon anterior; o lettering em maiúsculas aparece no cabeçalho público, no painel, nas páginas de conta, no rodapé e na prévia da agenda. Há versões escuras e claras para os dois temas. A alteração foi publicada em `https://barberflow-saas-delta.vercel.app/` e os SVGs foram conferidos nesse domínio. O logo carregado por cada negócio continua independente desta identidade do produto.

## Nova identidade Ritmo — 28 de outubro de 2026

Após rejeitar a proposta sálvia com tipografia editorial, o utilizador pediu uma identidade nova e criativa com Hallmark. A direção **Ritmo** introduz coral, grafite e branco quente, lettering minúsculo e um símbolo C aberto. Substitui visualmente o logo provisório Passo, cujos ficheiros anteriores permanecem no repositório. As fontes Rethink Sans e Figtree são locais. A identidade de cada negócio carregada pelo proprietário continua independente da marca Compasso. Ver [a identidade](IDENTIDADE_RITMO.md) e o [sistema visual](../design.md).

## Ajuste institucional — 28 de outubro de 2026

O utilizador pediu uma aparência mais séria e institucional. A proposta passou de coral/grafite para azul-marinho, cinzentos frios e branco, mantendo as mesmas fontes locais com tamanhos, pesos e espaçamento mais contidos. O lettering passou a **Compasso**, com inicial maiúscula; o símbolo recebeu um traço mais fino e alinhamento mais regular. Hero, preço, formulários, painel e rodapé partilham superfícies discretas e cantos menores. As capturas da agenda foram novamente obtidas no ambiente de testes com a aparência atual.

A alteração é visual: conteúdos, rotas, formulários, handlers e regras de marcação mantêm-se. O sistema atual está em [`design.md`](../design.md). A proposta Ritmo anterior permanece documentada como histórico. Não houve deployment.

Verificação local deste ajuste: 98 testes unitários do frontend e 19 cenários de navegador passaram, incluindo sessão, publicação, reserva, cancelamento, responsividade, idiomas, modo escuro e contraste do foco. Build de produção e tipos E2E passaram. Os cenários usaram a API real e a base E2E isolada; os testes existentes não foram alterados.

## Nova logo institucional — 29 de outubro de 2026

Após o utilizador rejeitar o símbolo C, a marca passou a um compasso de desenho estilizado, com articulação circular, hastes e ponte curva. O nome Compasso mantém a inicial maiúscula, com lettering vetorial em Rethink Sans 580. As versões clara, escura e o favicon partilham o mesmo desenho. As aplicações existentes no cabeçalho, páginas de conta, painel e rodapé usam os mesmos caminhos de ficheiro. A identidade carregada pelo proprietário de cada negócio continua independente.

Validação desta alteração: 98 testes unitários e 15 testes de navegador públicos passaram, além do build de produção. Logo revista no cabeçalho em computador e telemóvel, no rodapé e na página de entrada em tema escuro. Sem publicação.

## Publicação institucional — 29 de outubro de 2026

A identidade institucional e a nova logo foram publicadas em **https://compasso-pt.vercel.app/**, deployment `dpl_FPDMewUa7B4a1Wi4ivkUDYeoMhif`, em estado READY. A configuração de origem e de URL pública de produção foi alinhada com o domínio verificado, depois de os testes de CSRF e preflight reproduzirem HTTP 403 na versão preparada. Os mesmos testes passaram após a correção. Os percursos de registo e login foram validados com a API e PostgreSQL reais no ambiente E2E e em Chromium/WebKit; as verificações do domínio público foram apenas de leitura. Os detalhes RED/GREEN e da publicação estão no registo de regressões.

## Otimização móvel — 30 de outubro de 2026

Publicada em **https://compasso-pt.vercel.app/**, deployment `dpl_Ako25B9GuRSfZBTQKP7zjMCD8D3w`. Cabeçalhos de conta compactos, inputs legíveis de 16 px/48 px, controlos de toque de pelo menos 44 px, calendário com navegação de data em duas linhas e ações de partilha por ícone com nomes acessíveis preservados. O cabeçalho público foi corrigido a 320 px; a navegação inferior e os diálogos respeitam a área segura. Foram aprovados 24 testes completos, 4 testes WebKit em emulação iPhone, 99 verificações unitárias do frontend, tipos e build. As verificações de autenticação e API da versão publicada também passaram. O sistema institucional e a logo mantêm-se.

## Abertura sem demonstração — 30 de outubro de 2026

A pedido do utilizador, a agenda ilustrativa foi retirada da hero. A abertura passa a ter fotografia de fundo, título, explicação e ações, numa coluna. O espaçamento foi ajustado em desktop e mobile; a apresentação do produto continua na secção seguinte. Publicado em `https://compasso-pt.vercel.app/`, deployment `dpl_6doHRYwQCJR7euut17DPWd7tFwyD`. Regressões de remoção a 390/1440 px, 21 testes públicos, 99 verificações unitárias, build e tipos aprovados; API e autenticação verificadas antes da promoção.

## Fotografia mais visível — 30 de outubro de 2026

A pedido do utilizador, a fotografia da abertura ficou mais presente: sombreado concentrado junto ao título e na base, área mais transparente sobre o motivo da fotografia e saturação próxima da original. No mobile, o gradiente é vertical para acompanhar o texto no topo. Não houve alteração do ficheiro da imagem, corte, geometria ou ações da página.

Publicado em `https://compasso-pt.vercel.app/`, deployment `dpl_6ALZm6nur4YijxAZ1vizBAyT5bVN`. Passaram os 21 testes públicos existentes, 4 testes WebKit em emulação móvel e o build. As duas verificações de autenticação passaram antes da promoção. Os bundles públicos de home e CSS coincidem com os artefactos verificados em staging; API UP e 0 registos de erro/fatal na consulta do novo deployment.
