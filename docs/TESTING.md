# Testes e regressões

Cada bug deve seguir **RED → correção → GREEN**: criar o teste, verificar que falha pelo motivo esperado, corrigir o código e executar novamente o mesmo teste. A regra permanente está em [AGENTS.md](../AGENTS.md); a evidência dos casos corrigidos fica no [registo de regressões](REGRESSION_LOG.md).

## Bateria completa

Requisitos: Java 21, Node.js 24, pnpm, Python 3, Docker com o daemon em execução. Não é necessário configurar credenciais de produção.

```bash
./scripts/test-all.sh
```

O comando instala as dependências bloqueadas, executa testes Java e Angular, compila a aplicação, valida os tipos dos testes de navegador, cria uma base PostgreSQL temporária e executa o Playwright. A base temporária é removida no fim, mesmo se um teste falhar. As portas 4200, 8080 e 5433 devem estar livres.

## Comandos por camada

```bash
# Backend: JUnit, Mockito e integração com PostgreSQL/Testcontainers
cd backend
./mvnw --batch-mode --no-transfer-progress verify

# Frontend: componentes, sessão, formulários, CSRF e respostas assíncronas
cd ../frontend
pnpm install --frozen-lockfile
pnpm test:unit
pnpm build

# Apenas um teste durante o ciclo RED/GREEN
pnpm test --watch=false --include='src/app/pages/login/login.spec.ts'
```

Para executar os testes de navegador separadamente, a partir da raiz:

```bash
cd backend && ./mvnw --batch-mode --no-transfer-progress package -DskipTests && cd ..
docker compose -f docker-compose.e2e.yml up -d --wait
cd frontend
pnpm exec playwright install chromium
pnpm test:e2e:types
pnpm test:e2e
pnpm exec playwright show-report
cd ..
docker compose -f docker-compose.e2e.yml down
```

O Playwright inicia e termina a API e o Angular. Não reutiliza servidores já em execução. Os URLs e a ligação à base são fixos para o ambiente local de testes: `http://127.0.0.1:4200`, API na porta 8080 e `barberflow_e2e` na porta 5433. As credenciais desse banco são apenas dados locais descartáveis. A configuração não aceita um URL de produção. Nenhum e-mail externo é enviado.

Para verificar apenas o enquadramento visual da página inicial, sem Java ou PostgreSQL, execute em `frontend`:

```bash
pnpm exec playwright test --config playwright.visual.config.ts
```

Esta configuração inicia apenas o Angular em `127.0.0.1:4200` e executa `hero-background.spec.ts`, `responsive.spec.ts` e `public-design.spec.ts`. As capturas e falhas ficam em `frontend/test-results/`. Os mesmos cenários continuam incluídos na configuração Playwright completa para as verificações antes de merge ou deployment.

`hero-background.spec.ts` também verifica um gesto de touch scroll e alterações controladas apenas na altura do viewport móvel, mantendo o tamanho da fotografia, além da adaptação quando a largura muda. A alteração de altura simula as barras do navegador; o Chromium automatizado não apresenta uma barra de endereços móvel real. Para executar só esta regressão, acrescentar `--grep 'keeps the photograph size'` ao comando acima.

`pnpm test:all`, na pasta `frontend`, executa os testes do frontend, os tipos E2E e o navegador; pressupõe que o JAR Java já foi compilado e que a base E2E está iniciada. Para incluir também os testes Java e a gestão da base temporária, usar o script da raiz.

## Cobertura dos percursos principais

- Registo válido e duplicado; erros por campo; login inválido e normalização do e-mail.
- Sessão após recarregar, logout, rotas privadas, CSRF e respostas de sessão fora de ordem.
- Serviços, horários, operações pendentes e preservação dos dados após falhas.
- Publicação com requisitos, confirmação de e-mail, subscrição e pausa.
- Página pública num navegador anónimo; marcação real; presença na agenda; cancelamento persistido.
- Conflitos de horário, respostas antigas de disponibilidade e proteção contra submissões repetidas.
- Isolamento entre barbearias e rejeição de pedidos sem autorização no backend.
- Enquadramento da primeira secção e ausência de overflow em ecrãs pequenos e grandes.

## CI e diagnóstico

O workflow [CI](../.github/workflows/ci.yml) executa os testes em cada pull request e push para `main` ou `codex/**`. O job de navegador só avança depois de os testes Java e frontend passarem. Usa PostgreSQL temporário, o JAR validado no job Java e Chromium.

Não há retries automáticos nos testes de navegador: uma falha não fica escondida por uma segunda tentativa. O CI guarda durante sete dias os relatórios Java, relatório HTML/JUnit do Playwright, screenshots, vídeo e traces dos testes que falharam. Os artefactos usam dados sintéticos e não devem conter credenciais de produção. O comando `pnpm exec playwright show-trace caminho/trace.zip` abre uma trace descarregada do CI.

Os testes unitários têm respostas controladas para reproduzir falhas específicas. Os percursos E2E usam a API e a base de dados reais, sem interceptar respostas com dados simulados. Referências: [servidores de teste](https://playwright.dev/docs/test-webserver), [isolamento da API de testes](https://playwright.dev/docs/api/class-apirequestcontext) e [relatórios do Playwright](https://playwright.dev/docs/test-reporters).

## Verificação da experiência Compasso

A agenda principal, a reserva por etapas e a separação de tarefas têm testes em `agenda-entry.spec.ts`, `bookings.spec.ts`, `public-booking.spec.ts` e `availability.spec.ts`. O cenário `agenda-workspace.spec.ts` verifica no navegador os ecrãs de 1440 e 390 px, uma marcação manual num horário livre, um bloqueio real, cancelamento persistido, legibilidade dos cartões e navegação entre secções. O percurso `owner-booking.spec.ts` reserva através de um navegador anónimo a 390 px. As capturas de cada percurso ficam em `frontend/test-results/`, fora dos commits.

Se outro serviço ocupar a porta 8080, a API de testes pode usar outra porta **local**, por exemplo:

```bash
cd frontend
BARBERFLOW_E2E_API_PORT=8082 pnpm test:e2e
```

O proxy do Angular acompanha essa porta. O endereço continua limitado a `127.0.0.1`, o frontend continua em 4200 e a base continua a ser `barberflow_e2e` em 5433. Não são permitidos URLs externos na configuração. O comando completo também aceita a variável: `BARBERFLOW_E2E_API_PORT=8082 ./scripts/test-all.sh`.

Cada bateria deve começar com a base E2E descartável vazia. Depois de uma execução manual interrompida, terminar e voltar a criar **apenas** o projeto de testes com `docker compose -f docker-compose.e2e.yml down` e `docker compose -f docker-compose.e2e.yml up -d --wait`. Os limites reais de registo e de reserva mantêm-se ativos; não usar retries, alterar limites ou reutilizar contas reais para contornar falhas.

A personalização de imagens está coberta por `BarbershopBrandingIntegrationTests` (PostgreSQL real, sessão, CSRF, publicação, validação de imagem e concorrência) e por `shop-appearance.service.spec.ts`, `profile.spec.ts` e `public-booking.spec.ts`. O percurso público em `owner-booking.spec.ts` inclui upload, substituição, remoção e persistência do logo e do fundo, sem criar mais contas de teste. As capturas de personalização ficam no relatório Playwright, fora dos commits.

`public-design.spec.ts` verifica a ação de registo entre 320 e 1920 px, foco visível, carregamento das capturas reais da agenda e persistência de idioma e modo escuro na navegação pública.

O teste de contraste criado na identidade Ritmo mantém-se ativo no sistema institucional: o navegador exige no mínimo 3:1 entre o outline e o fundo real da chamada final e do rodapé. Executar com `--grep 'keeps keyboard focus at accessible contrast'` na configuração visual.

## Proxy da prévia de desenvolvimento

`pnpm test:unit` e `pnpm test:unit:report` também executam `tests/dev-proxy.test.cjs`, usando o proxy registado em `angular.json` para confirmar que `BARBERFLOW_API_PORT` determina o destino local de autenticação e health. A regressão passa a integrar o CI existente.

No ambiente local `compasso-local`, iniciar a prévia com `BARBERFLOW_API_PORT=8091 pnpm start --host 127.0.0.1 --port 4200`. A API deste ambiente aceita explicitamente essa origem. As contas locais são independentes das contas do site publicado. Não executar testes de escrita contra esta base em 5434: a bateria Playwright continua exclusivamente em `barberflow_e2e:5433`, com contas `example.test` e o proxy E2E próprio.

O percurso `registers in English, restores the session, rejects duplicates and accepts a normalized login` começa pelo formulário de registo em inglês, verifica a sessão depois de recarregar, termina sessão e valida duplicados e login inválido/válido em português. Usa a API e PostgreSQL reais. Foi também executado em WebKit, numa bateria de autenticação isolada. Para comparar vários motores, usar uma base E2E vazia por bateria: os limites de registo reais mantêm-se ativos.

## Verificação de autenticação antes de promover um deployment

Com a Vercel CLI 65.7.0 autenticada no projeto correto e no PATH, executar contra o URL único do deployment preparado (diferente do domínio público):

```bash
COMPASSO_DEPLOYMENT_URL=https://URL-DO-DEPLOYMENT.vercel.app \
COMPASSO_PUBLIC_ORIGIN=https://compasso-pt.vercel.app \
node --test scripts/deployment-auth.test.cjs
```

O script usa `vercel curl` para a proteção do deployment e apenas GET/OPTIONS. Exige CSRF JSON 200 e preflights de POST para registo/login com origem canónica e credenciais permitidas. Não envia POSTs, credenciais de utilizador nem escreve na base de produção. A configuração de produção deve ter `BARBERFLOW_ALLOWED_ORIGINS` e `BARBERFLOW_PUBLIC_BASE_URL` apontadas para o domínio verificado atual. Manter Preview num escopo separado. Os testes de escrita continuam exclusivamente no ambiente E2E isolado.

## Ergonomia móvel

`mobile-ergonomics.spec.ts` verifica login, registo e recuperação a 320/390 px: cabeçalho até 88 px, alvos de toque de 44 px, campos com texto de 16 px e botão de entrada visível a 740 px de altura. `mobile-touch.spec.ts` ativa touch real no navegador e verifica que os controlos públicos permanecem dentro do cabeçalho e do ecrã, também a 320 px. Estes testes integram a bateria visual e a bateria completa.

A agenda real é percorrida a 1440, 390 e 320 px, com controlos de data compactos, áreas de toque e tamanho do input verificados. A reserva pública verifica os inputs de data e de cliente no percurso completo de marcação. Executar cada bateria de escrita com a base E2E vazia; os limites reais mantêm-se ativos.

Na verificação móvel de 30 de outubro, os quatro cenários de `mobile-ergonomics.spec.ts` e `mobile-touch.spec.ts` passaram também com o projeto Playwright `iPhone 13` (WebKit, emulação). Isto verifica o motor e o layout; não equivale a um teste manual num dispositivo físico. As capturas foram revistas a 320/390 px.


## Regressões de desempenho

O comando completo também compila `backend/Dockerfile.vercel` e executa o teste de arranque antes da bateria de navegador. O CI tem um job separado `Container startup regression`. Para executar apenas esta verificação, na raiz, com Docker e Python 3:

```bash
docker compose -f docker-compose.e2e.yml up -d --wait
docker build -f backend/Dockerfile.vercel -t compasso-startup-test backend
COMPASSO_STARTUP_IMAGE=compasso-startup-test python3 scripts/test-container-startup.py
docker compose -f docker-compose.e2e.yml down
```

A base deve ser a E2E descartável, sem outra bateria de escrita em execução. O teste inicia um container novo com uma CPU e 2 GiB, verifica JSON CSRF com token até seis segundos e remove apenas esse container no fim. A espera pela abertura do servidor não repete asserções nem relaxa o limite. A ligação à base usa a rede dedicada do Compose; o serviço E2E continua publicado em `127.0.0.1:5433`. Não aceita uma URL de base externa. O build treina o arquivo CDS offline; não necessita de contas ou segredos de produção.

As regressões de pedidos partilhados, preparação do login e intervalos/páginas estão em `booking-api.service.spec.ts`, `login-preparation.spec.ts`, `bookings.spec.ts`, `dashboard.spec.ts` e `dashboard-layout.spec.ts`. Os testes `BookingReadPerformanceIntegrationTests` usam PostgreSQL real para verificar sobreposição, limites, ordenação, histórico e isolamento dos resultados. `BackendReadinessIntegrationTests` confirma que o primeiro GET de preparação não inicializa controladores depois de a aplicação anunciar prontidão.

O percurso real `agenda-workspace.spec.ts` verifica que a entrada na agenda envia um pedido do estabelecimento e um pedido de marcações limitado por datas nas três larguras testadas. As consultas de listas enviam `view=upcoming|history`, `page` e `size`; recebem até `size+1` registos, mostrando os primeiros `size` e usando o adicional para disponibilizar Carregar mais. A visão geral usa `view=next&size=5`.

O teste do container também cria uma conta sintética, valida login até dois segundos após a preparação, exige rotação da sessão e confirma `/me` e a agenda através da mesma imagem de produção e da base real de testes. Mantém o limite original de seis segundos para arranque. Não executar este teste em paralelo com outra bateria que recrie a base E2E.

## Tema inicial e preferência guardada

`theme.service.spec.ts` verifica tema escuro sem preferência, armazenamento indisponível e valor inválido, preservando escolhas explícitas claras/escuras e a chave antiga. `theme-default.spec.ts` verifica primeira visita com preferência do sistema clara, HTML escuro antes do JavaScript e persistência da alternância entre páginas e recarregamentos. Integra a configuração visual e a bateria E2E completa; não escreve em contas nem dados de produção.
