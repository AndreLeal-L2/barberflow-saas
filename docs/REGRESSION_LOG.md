# Registo de regressões

Cada entrada documenta uma falha de comportamento observada num teste antes da correção. Os testes permanecem na bateria automática. Erros de configuração/compilação de testes não contam como RED.

## 2026-10-19 — Sessão e login

**RED:** 3 falhas e 7 testes aprovados antes de alterar a implementação.

```bash
cd frontend
pnpm test --watch=false --include='src/app/core/auth.service.spec.ts' --include='src/app/pages/login/login.spec.ts'
```

| Teste que falhou | Evidência antes da correção | Correção |
| --- | --- | --- |
| `does not restore a logged-out user when an older refresh completes after logout` | Depois do logout, o utilizador voltou a existir: `expected { id: 'owner-id', … } to be null`. | Respostas de `/me` antigas não podem sobrepor uma sessão mais recente. |
| `does not clear a new login when a refresh from the previous session returns unauthorized` | Uma resposta 401 antiga apagou o login novo: `expected null to deeply equal { id: 'another-owner-id', … }`. | A atualização só altera a versão de sessão que a iniciou. |
| `accepts a pasted email with surrounding spaces while preserving the exact password` | A autenticação devia ser chamada uma vez, mas foi chamada zero vezes. | Normalizar o e-mail antes da validação, preservando a palavra-passe exata. |

**GREEN:** o mesmo comando passou os 10 testes. Depois de acrescentar cenários adicionais de sessão e o contrato CSRF com os providers reais da aplicação, passaram **17/17 testes** em `auth.service.spec.ts`, `csrf.service.spec.ts` e `login.spec.ts`.

## 2026-10-19 — Marcações públicas e gestão de serviços

**RED:** 10 falhas e 9 testes aprovados antes de alterar componentes de produção.

```bash
cd frontend
pnpm test --watch=false \
  --include='src/app/pages/public-booking/public-booking.spec.ts' \
  --include='src/app/pages/services/services.spec.ts' \
  --include='src/app/pages/cancel-booking/cancel-booking.spec.ts'
```

| Regressão demonstrada | Evidência antes da correção | Correção |
| --- | --- | --- |
| Limpar a data preservava a seleção antiga | `selectedDate` e o horário selecionado continuavam preenchidos. | Limpar data/horário e invalidar respostas pendentes. |
| Resposta antiga após limpar a data | O pedido tardio voltava a preencher os horários. | Ignorar respostas de pedidos anteriores à alteração. |
| Nome/telefone só com espaços | O formulário aceitava uma marcação sem dados visíveis. | Validar conteúdo não vazio após espaços. |
| Vaga ocupada por outro cliente | Depois de `BOOKING_SLOT_UNAVAILABLE`, a vaga inválida continuava selecionada. | Limpar a vaga, atualizar a disponibilidade e preservar os dados do cliente. |
| Guardar serviço antes do carregamento | Um GET tardio podia substituir a lista já atualizada. | Bloquear alterações até terminar o carregamento inicial. |
| Eliminação repetida | Dois pedidos DELETE enviados enquanto o primeiro estava pendente. | Serializar as alterações e impedir repetição. |
| Mudar/cancelar edição enquanto guarda | A resposta da gravação anterior limpava o novo estado do editor. | Manter a edição estável durante a operação. |
| Gravar e eliminar em simultâneo | PUT e DELETE podiam sobrepor-se e alterar confirmações pendentes. | Serializar gravação/eliminação e restaurar os controlos em erro. |
| Nome de serviço só com espaços | O serviço sem nome visível era enviado à API. | Rejeitar nomes sem conteúdo. |

**GREEN:** os mesmos 19 testes passaram após as correções. A bateria ampliada passou **28/28 testes**: 14 de marcação pública, 11 de serviços e 3 de cancelamento. A cobertura adicional inclui respostas fora de ordem, falha e retry, submissão dupla, reset da marcação e CRUD. Cancelamento não precisou de alteração de produção.

## Regressões anteriores mantidas

Os testes já existentes continuam a proteger validação do registo, confirmação de e-mail noutro separador, publicação/pausa no Perfil, preservação de edições, horário ainda não carregado e falhas parciais do painel. Esses problemas tinham sido corrigidos antes desta regra RED → GREEN; não são apresentados aqui como novos ciclos RED comprovados.

## 2026-10-19 — Confirmação de e-mail e resposta antiga de sessão

**RED:** um teste novo falhou e nove passaram antes da alteração: depois de confirmar o e-mail, a resposta antiga de `/me` substituía `emailVerified: true` por `false`.

```bash
cd frontend
pnpm test --watch=false --include='src/app/core/auth.service.spec.ts'
```

**Correção:** a confirmação bem-sucedida também avança a versão da sessão. **GREEN:** o mesmo teste passou, juntamente com os outros nove cenários de sessão, sem alterar a sua expectativa.

## 2026-10-19 — Horário não oferecido aceite pela API

**RED comprovado no CI:** [Backend, execução 39326779566](https://github.com/AndreLeal-L2/barberflow-saas/actions/runs/39326779566/job/118314564528), commit `32ed382b`. O comando `mvn --batch-mode --no-transfer-progress verify` executou 45 testes: **1 falhou, 44 passaram, 0 erros e 0 ignorados**.

```text
BookingSecurityIntegrationTests.rejectsBookingWithSecondsThatWasNeverOfferedAsAnAvailableSlot
Status expected:<409> but was:<201>
```

O teste consulta os horários realmente oferecidos, confirma que `09:00:01` não existe nessa lista, tenta marcar esse início e exige rejeição sem criar uma marcação. A implementação convertia o desvio em minutos e truncava os segundos.

**Correção:** validar o desvio completo, incluindo segundos e nanossegundos, relativamente à abertura configurada. O teste RED original foi mantido sem alterações. Acrescentada cobertura para frações de segundo e para a aceitação do horário exato oferecido quando a abertura tem segundos.

**GREEN comprovado no CI:** [Backend, execução 39327199114](https://github.com/AndreLeal-L2/barberflow-saas/actions/runs/39327199114/job/118316000780), commit `ec5e014e`: **47 testes passaram, 0 falhas, 0 erros e 0 ignorados**, incluindo os 12 testes de segurança/regressão de marcações. O teste RED original passou sem alterar a sua expectativa.

## 2026-10-21 — Reforço de segurança da API e da base de dados

**RED comprovado no CI:** [Backend, execução 39593186563](https://github.com/AndreLeal-L2/barberflow-saas/actions/runs/39593186563/job/119198969410), commit `762f69c`. Comando `mvn --batch-mode --no-transfer-progress verify`: **53 testes executados, 6 falhas de asserção, 0 erros**.

| Teste | Falha observada antes da correção | Correção |
| --- | --- | --- |
| `BookingSecurityIntegrationTests.rejectsOneOfTwoConcurrentOwnerStatusChangesAfterBothReadConfirmed` | As duas alterações simultâneas foram gravadas; só uma devia ser aceite. | Versão otimista em `bookings` e resposta HTTP 409 para conflito. |
| `CreateBookingRequestValidationTest.rejectsControlCharactersAndMalformedCustomerPhoneNumbers` | Nome com controlo e telefone inválido não produziram violações de validação. | Restrições de formato na entrada da API. |
| `DistributedRateLimiterIntegrationTests.sharesAccountLimitsAcrossIndependentApplicationInstances` | A segunda instância não bloqueou uma conta já limitada pela primeira. | Baldes de rate limit partilhados e atualizados atomicamente no PostgreSQL. |
| `MaintenanceJobSecurityIntegrationTests.acceptsTheConfiguredCronSecretWithoutAUserSession` | O cron com segredo válido recebeu 401 em vez de 204. | Passagem pela cadeia de segurança até à verificação do segredo no controller. |
| `SupabaseDefaultPrivilegesIntegrationTests.futureApplicationTablesDoNotBecomePublicThroughSupabaseDefaults` | Uma tabela futura herdou acesso do papel `anon`. | Revogação de privilégios por omissão para papéis públicos do Supabase. |
| `LoggingNotificationSenderTest.doesNotWriteRecipientsOrActionTokensToApplicationLogs` | Destinatário e token apareceram no log. | Registo apenas de tipo e ID da notificação. |

**GREEN comprovado no CI:** [Backend, execução 39593817722](https://github.com/AndreLeal-L2/barberflow-saas/actions/runs/39593817722/job/119201090426), commit `01740ddd`: **53 testes passaram, 0 falhas, 0 erros e 0 ignorados**. A bateria do frontend e o build também passaram nessa execução.

**RED local do frontend:**

```bash
cd frontend
pnpm test --watch=false --include='src/app/pages/public-booking/public-booking.spec.ts'
```

Os dois casos `rejects malformed $field before submitting a booking` falharam com `expected false to be true`: o formulário aceitava nome com quebra de linha e telefone `call me maybe`. **GREEN:** o mesmo comando passou **16/16 testes** após alinhar a validação com a API.

## 2026-10-21 — Corrida com anonimização e detalhes sensíveis do fornecedor

**RED comprovado no CI:** [Backend, execução 39594256961](https://github.com/AndreLeal-L2/barberflow-saas/actions/runs/39594256961/job/119202542986), commit `263cd71`. Comando `mvn --batch-mode --no-transfer-progress verify`: **55 testes executados, 2 falhas de asserção, 0 erros**.

| Teste | Falha observada antes da correção | Correção |
| --- | --- | --- |
| `BookingSecurityIntegrationTests.rejectsAStaleBookingUpdateAfterPersonalDataWasAnonymized` | `Expecting code to raise a throwable.` A atualização antiga passou após a anonimização. | A operação em massa também avança a versão da marcação. |
| `NotificationDeliveryServiceTest.doesNotLogOrStoreSensitiveProviderErrorDetails` | Log continha `private-owner@example.test` e `synthetic-secret-token` vindos da exceção do fornecedor. | Mensagem genérica persistida e apenas classe da exceção no log. |

**GREEN comprovado no CI:** [Backend, execução 39594803717](https://github.com/AndreLeal-L2/barberflow-saas/actions/runs/39594803717/job/119204358707), commit `8aa67708`: **56 testes passaram, 0 falhas, 0 erros e 0 ignorados**, incluindo os mesmos dois testes sem alterar as expectativas.

## 2026-10-21 — Privilégios antigos do papel `service_role`

**RED comprovado no CI:** [Backend, execução 39594574877](https://github.com/AndreLeal-L2/barberflow-saas/actions/runs/39594574877/job/119203589924), commit `7246e09`. Comando `mvn --batch-mode --no-transfer-progress verify`: **56 testes executados, 3 falhas de asserção, 0 erros** (as duas regressões ainda não corrigidas acima e a nova).

```text
SupabaseDefaultPrivilegesIntegrationTests.existingApplicationTablesAreNotReadableThroughTheSupabaseServiceRole
Expecting value to be false but was true
```

O teste simula os privilégios por omissão do Supabase, consulta a tabela `bookings` após as migrações e confirma que o papel `service_role` não pode ler os dados. **Correção:** nova migração revoga privilégios antigos em todas as tabelas e sequências da aplicação para esse papel. **GREEN comprovado no CI:** [Backend, execução 39594803717](https://github.com/AndreLeal-L2/barberflow-saas/actions/runs/39594803717/job/119204358707), commit `8aa67708`: **56 testes passaram, 0 falhas, 0 erros e 0 ignorados**, incluindo o mesmo teste sem alteração.

## 2026-10-23 — Agenda principal e reserva por etapas (feedback do cliente)

Testes acrescentados e executados antes de alterar o comportamento correspondente:

| Teste | Comando, na pasta `frontend` | Evidência RED |
| --- | --- | --- |
| `PublicBooking > shows one booking task at a time and lets customers revise earlier choices` | `pnpm test --watch=false --include=src/app/pages/public-booking/public-booking.spec.ts` | `expected …(3) to have a length of 1 but got 3`: as três tarefas eram apresentadas simultaneamente. Os outros 16 testes passaram. |
| `Agenda entry > opens the daily agenda as the dashboard landing page` | `pnpm test --watch=false --include=src/app/agenda-entry.spec.ts --include=src/app/pages/availability/availability.spec.ts` | `expected [Function _Dashboard] to be [Function _Bookings]`: a entrada abria o resumo. |
| `Availability > separates weekly hours from one-off blocks` | Mesmo comando anterior | `expected false to be true`: as indisponibilidades não estavam numa secção separada. |
| `Daily agenda actions > releases cancelled appointments from the calendar while keeping their history` | `pnpm test --watch=false --include=src/app/pages/bookings/bookings.spec.ts` | `expected <article … class="calendar-event status-cancelled"> to be null`: a marcação cancelada continuava sobre o horário que devia ficar livre. |
| `Daily agenda actions > does not start overlapping calendar refreshes while a response is pending` | Mesmo comando anterior | `expected "vi.fn()" to be called 5 times, but got 6 times`: duas atualizações podiam concorrer. O teste usa uma resposta controlada com `Subject`. |

**GREEN:** os mesmos testes passaram sem alterar as suas asserções. A reserva mantém as etapas montadas para preservar os dados, mostrando apenas a etapa ativa; a entrada abre a agenda; semana e exceções têm seletores separados; canceladas ficam no histórico; atualizações simultâneas são impedidas.

### Regressões visuais e percurso real

`creates appointments from calendar slots and revisits their details on desktop and mobile` passou a verificar também a altura efetiva do nome do cliente e o atalho de cópia em desktop e a 390 px.

**RED:** `expected >= 14; received 3.328125` para o nome num evento de 30 minutos e `getByRole('button', { name: 'Copiar link', exact: true }): element(s) not found` no telemóvel. A correção usa cartões compactos e mantém os atalhos no cabeçalho móvel.

Comando inicial da reprodução: `pnpm exec playwright test --config=node_modules/.cache/compasso/playwright.config.cjs --grep='creates appointments'`. Essa configuração temporária apenas usava a API local em 8082 porque um serviço alheio ocupava 8080. O equivalente permanente é `BARBERFLOW_E2E_API_PORT=8082 pnpm exec playwright test --grep='creates appointments'`; não muda o host, a base de testes, os cenários, as asserções, os timeouts nem os retries.

O teste existente `registers, configures, publishes, accepts a customer booking, cancels and pauses` também reproduziu uma regressão introduzida no cabeçalho: `getByRole('status') resolved to 2 elements`, incluindo um estado de cópia vazio. O anúncio de cópia usa agora `aria-live`, sem criar um segundo estado operacional vazio. O teste existente e a sua asserção de confirmação do horário foram mantidos.

A primeira execução alargada também detetou que criar uma conta por dimensão de ecrã ultrapassava o limite real de cinco registos por IP/hora. O cenário novo passou a verificar as duas dimensões no mesmo percurso e conta; a base descartável é criada de novo antes de cada bateria. Não se alteraram nem desativaram os limites de segurança.

### Identidade dos e-mails

Comando, na raiz:

```bash
./backend/mvnw -f backend/pom.xml --batch-mode --no-transfer-progress \
  -Dtest=AccountSecurityBrandTest,BookingNotificationServiceTest test
```

**RED:** 5 testes executados, 2 falhas de asserção e 0 erros. `AccountSecurityBrandTest.accountMessagesUseCurrentBrandAndRetainActionLinks` esperava `Confirme o seu email no Compasso`, mas recebia o assunto com BarberFlow; `BookingNotificationServiceTest.ownerNotificationUsesCurrentProductBrand` esperava `Nova marcação no Compasso.`, mas o corpo mantinha BarberFlow.

**GREEN:** o mesmo comando passou os 5 testes. Os textos e o remetente por defeito acompanham a nova identidade; links, tokens, prazos e configuração explícita de envio são preservados.

Na validação relacionada, `BrevoNotificationSenderTest.shouldSendImmediateEmailWithoutSchedulingField` foi atualizado para exigir o novo nome por defeito, mantendo as verificações de envio e agendamento. Executado contra o fallback anterior, `./backend/mvnw -f backend/pom.xml --batch-mode --no-transfer-progress -Dtest=BrevoNotificationSenderTest test` confirmou RED: `JSON path "$.sender.name" expected:<Compasso> but was:<BarberFlow>`. O mesmo teste permanece a exigir Compasso após a correção; os cenários com remetente configurado continuam a exigir o nome explícito.

Outra resposta controlada reproduziu `keeps booking status changes locked until a calendar refresh finishes`: a API recebia `booking-1, CANCELLED` durante uma atualização pendente (`expected not to be called; called 1 times`). A correção impede a alteração de estado até terminar essa leitura. O teste inalterado passou com a bateria Angular completa de **88 testes**.

A revisão de erros acrescentou mais duas regressões antes das respetivas correções:

- `Public page shortcuts > clears a previous copy confirmation when a later copy fails`, com `pnpm test --watch=false --include=src/app/layouts/dashboard-layout/dashboard-layout.spec.ts`: RED `expected true to be false`. O estado de sucesso anterior é agora limpo antes de tentar copiar novamente; o mesmo teste passou.
- `PublicBooking > shows booking conflicts outside the hidden customer step`, com `pnpm test --watch=false --include=src/app/pages/public-booking/public-booking.spec.ts`: RED `expected <section class="booking-step" hidden> to be null`. O alerta estava dentro da etapa de dados que é escondida depois de um conflito. Passou para o formulário comum, mantendo a mensagem visível ao escolher outro horário e preservando os contactos introduzidos.

### Resultado final da alteração

| Verificação | Resultado |
| --- | --- |
| `./backend/mvnw -f backend/pom.xml --batch-mode --no-transfer-progress verify` | **58 testes**, 0 falhas, 0 erros, 0 ignorados; JAR compilado. |
| `pnpm test:unit` em `frontend` | **90 testes**, 15 ficheiros, todos aprovados. |
| `pnpm build` em `frontend` | Compilação de produção aprovada, dentro dos limites de tamanho, sem avisos de orçamento. |
| `pnpm test:e2e:types` em `frontend` | Tipos dos testes de navegador aprovados. |
| `BARBERFLOW_E2E_API_PORT=8082 pnpm test:e2e` em `frontend` | **7 testes aprovados**, 0 falhas, 0 instáveis, 0 ignorados. API e PostgreSQL reais, apenas loopback e base E2E. |

O relatório Playwright e os relatórios Surefire confirmam estes resultados. As capturas locais ficam em `output/compasso-preview/`, ignoradas pelo Git. Não se efetuou commit, merge nem deployment; as verificações de CI remoto não foram executadas nesta alteração local.

## 2026-10-24 — Imagem de fundo e logo por barbearia

Os cenários novos foram executados antes de implementar os comportamentos:

- `BarbershopBrandingIntegrationTests.shouldUploadPersistPublishAndRemoveTenantImages` e `rejectsInvalidOrOversizedImagesWithoutReplacingTheSavedLogo`, com `./backend/mvnw -f backend/pom.xml --batch-mode --no-transfer-progress -Dtest=BarbershopBrandingIntegrationTests test`: **RED**, 3 testes, 2 falhas de asserção, 0 erros. O upload esperado com `200` devolvia `404`, porque a funcionalidade ainda não existia. **GREEN:** os mesmos testes passaram depois da implementação, com autenticação, CSRF, PostgreSQL real, isolamento entre barbearias, publicação/pausa e remoção persistida.
- `Profile publication > offers image personalization and applies an uploaded shop logo immediately`, com `pnpm test --watch=false --include=src/app/pages/profile/profile.spec.ts` em `frontend`: **RED** `expected undefined to be defined` para a opção Personalização. **GREEN:** o mesmo teste passou com o seletor de ficheiro, upload e prévia da imagem devolvida pela API.

A verificação acrescentou e reproduziu estas falhas antes das respetivas correções:

| Teste | Evidência RED | Correção |
| --- | --- | --- |
| `BarbershopBrandingIntegrationTests.savingAnOlderProfileDoesNotEraseAnImageUploadedInAnotherTab` | Uma transação lê o perfil sem logo, outra envia o logo e a primeira guarda depois a descrição. O teste falhou em `No value at JSON path "$.logoUrl"`, embora o upload tivesse passado. Comando: o mesmo teste de integração acima. | `@DynamicUpdate` faz o perfil escrever apenas os campos alterados, preservando as versões de imagens guardadas entretanto. O mesmo teste controlado por latches passou; não foram alteradas as suas asserções. |
| `Profile publication > ignores an upload response after leaving the previous business session` | `expected { … logoUrl: '/old-session-logo.png' } to be null` depois de destruir a página e limpar a sessão. Comando: o mesmo teste de Profile acima. | As subscrições de perfil e imagens terminam com a destruição do componente. A resposta controlada por `Subject` já não repõe a imagem da sessão anterior. O mesmo teste passou. |

A bateria Java completa detetou ainda uma colisão entre os limites de registo de classes que partilhavam o mesmo contexto Spring e a mesma base: esperava `201`, recebia `429`. A nova classe de testes usa um contexto próprio e, por consequência, um contentor PostgreSQL próprio; os limites de segurança, as asserções e o comportamento de produção não foram alterados.

A cobertura adicional inclui ficheiros inválidos, SVG, tamanho superior a 5 MB, manutenção do logo anterior após erro, bloqueio de operações concorrentes, respostas de aparência antigas e elementos da página pública. O percurso de navegador existente foi alargado com upload de uma imagem superior a 64 KB, logo no dashboard, remoção/substituição, recarregamento e apresentação das duas imagens num navegador anónimo. Continua a usar apenas `127.0.0.1`, a base `barberflow_e2e` em 5433 e contas sintéticas.

A revisão visual acrescentou asserções de geometria ao percurso existente: a imagem do logo tem de ficar dentro da moldura da prévia em desktop e a 390 px. O teste foi executado antes da correção com `BARBERFLOW_E2E_API_PORT=8082 pnpm exec playwright test --grep='registers, configures, publishes'` em `frontend`. Depois de assegurar que os elementos já estavam visíveis (a medição inicial durante a renderização devolveu `null`, o que não foi considerado RED do defeito), a reprodução válida falhou: limite inferior esperado `<= 570.578125`, recebido `838.578125`. A grelha deixava a dimensão intrínseca da imagem ultrapassar a moldura. A alteração mínima foi usar alinhamento flexível no contentor da prévia. As mesmas asserções passaram sem alterações em ambas as dimensões.

**Validação final desta funcionalidade:** 62 testes Java, 98 testes Angular, compilação de produção e tipos E2E aprovados. Os 7 testes Playwright passaram com 0 retries, incluindo o percurso alargado com imagens e as verificações de enquadramento. Não foram utilizados serviços de produção nem credenciais reais nos testes. A atualização de execução aplica-se apenas à instância local `compasso-local` em 8090/8091, com PostgreSQL em 5434; os testes usaram exclusivamente a base E2E em 5433.

## 2026-10-25 — Fotografia a cobrir a hero inteira

O teste de navegador `the selected photograph fills the hero at 390px` e o equivalente a `1440px` foram adicionados em `frontend/e2e/hero-background.spec.ts`. Comando, na pasta `frontend`: `pnpm exec playwright test --config playwright.visual.config.ts`. Esta configuração inicia apenas o Angular em `127.0.0.1:4200`; a página inicial pública não precisa de API nem de base de dados.

**RED confirmado antes da correção:** ambos falharam numa asserção de geometria, `Expected: < 2; Received: 16` a 390 px e `Received: 817.765625` a 1440 px. A foto estava dentro do bloco visual lateral, deixando de cobrir a hero. Os testes também exigem que o ficheiro local carregue, que a imagem tenha as mesmas dimensões da hero e que use `object-fit: cover`.

**GREEN:** o mesmo teste, sem alterar as asserções, passou em ambas as dimensões após colocar a fotografia como fundo da secção. O mesmo comando, alargado aos três cenários existentes de `responsive.spec.ts`, passou os cinco testes: secção seguinte abaixo da primeira dobra e ausência de overflow a 390, 700 e 1440 px. `pnpm test:unit` passou os 98 testes Angular; `pnpm test:e2e:types` e `pnpm build` também passaram, sem avisos de orçamento.

## 2026-10-26 — Fundo móvel não muda de tamanho durante o scroll

**Teste permanente:** `mobile hero while scrolling > keeps the photograph size when scrolling changes only the visible height`, em `frontend/e2e/hero-background.spec.ts`.

**Comando RED/GREEN**, na pasta `frontend`:

```bash
pnpm exec playwright test --config playwright.visual.config.ts --grep 'keeps the photograph size'
```

**RED confirmado antes de alterar a implementação:** após um gesto real de touch scroll em Chromium móvel a 390 × 844, o teste reduz apenas a altura visível para 744. A asserção de geometria falhou com `Expected: 734; Received: 634` (diferença de 100 px). Playwright não apresenta a barra de endereços móvel: a alteração controlada da altura reproduz o efeito que esta tem no viewport, sem alterar a largura ou recarregar a página. O fundo seguia `100dvh`, reenquadrando a fotografia.

**Correção:** a hero móvel usa a altura capturada na entrada da página. Alterações apenas na altura, como as barras do navegador durante o scroll, não a recalculam; uma alteração da largura atualiza a medida para manter a adaptação do layout. O comportamento de altura do desktop é preservado.

**GREEN confirmado:** o mesmo teste passou sem alterações nas asserções, com alturas sucessivas de 744, 844, 924 e 844, mantendo as dimensões da fotografia. Também confirmou que mudar para 430 × 932 atualiza o enquadramento. Não foram aumentados timeouts nem adicionados retries.

**Validação de release:** `BARBERFLOW_E2E_API_PORT=8082 ./scripts/test-all.sh`, com Java 21 e Node 24, confirmou 62 testes Java, 98 testes Angular, build de produção e tipos E2E aprovados. A primeira execução de navegador sofreu suspensões do macOS, confirmadas por `pmset -g log` (`Clamshell Sleep` e `Maintenance Sleep`), e terminou com 4 falhas por espera/carregamento. Preservaram-se as traces locais. Depois de recriar a base E2E, `BARBERFLOW_E2E_API_PORT=8082 pnpm test:e2e` passou os **10 testes**, 0 falhas e 0 retries, em 1,2 minutos, com a API e PostgreSQL reais em loopback. O invólucro dessa repetição teve uma falha no caminho relativo de limpeza; o projeto Docker E2E foi terminado explicitamente a partir da raiz. Não se usaram contas nem operações de escrita em produção.

Os mesmos três cenários de `hero-background.spec.ts` também passaram contra a build estática de produção servida em `127.0.0.1:4200`, com uma configuração temporária de servidor estático. A Vercel compilou os mesmos bundles; o ficheiro publicado da página inicial foi comparado byte a byte com a build local validada.

**Deployment:** a primeira tentativa (`dpl_2SrHpoCb5C8bPYpbq1Um5EBLSwFt`) foi recusada pelo limite de 50 imagens do registo de containers. Foi guardada uma cópia local da imagem antiga `image_prFi9Tw8R3pzyqeyYFKWEgDTcg6Y` (tag `dcac6791a31c`, sem correspondência nos 46 deployments existentes), antes de remover apenas essa imagem e libertar uma vaga. A cópia está em `/tmp/compasso-vcr-orphan-dcac6791a31c.tar`; as imagens da produção atual e das versões anteriores existentes foram preservadas.

A versão `dpl_8J9JpsqPBb5ZPm28E2xXeUriGnNs` ficou `READY`, teve resposta `UP` em `/actuator/health` antes da promoção e foi promovida para `https://barberflow-saas-delta.vercel.app/`. O domínio foi confirmado a apontar para esse deployment, com homepage HTTP 200 e bundle corrigido idêntico ao validado localmente. Os pedidos de verificação em produção foram apenas GET.


## 2026-10-28 — Cabeçalho móvel no redesign Hallmark

- **Comportamento:** ao aumentar os alvos táteis para 44 px, os controlos de idioma e tema ultrapassavam a altura fixa de 110 px do cabeçalho público.
- **Teste permanente:** `public header with touch targets › contains its language and theme controls above the hero on touch screens`, em `frontend/e2e/public-design.spec.ts`.
- **RED confirmado antes da correção:** `pnpm --dir frontend exec playwright test --config ../.hallmark/header-regression.config.ts --grep 'contains its language and theme controls'`. A configuração temporária herda a configuração visual e usa o servidor local da bateria E2E já em execução, sem alterar os testes nem iniciar outro servidor. Falha de asserção: `Expected: <= 110`, `Received: 117`, no limite inferior de um controlo. Sem retries.
- **Comando reproduzível independente:** em `frontend`, `pnpm exec playwright test --config playwright.visual.config.ts --grep 'contains its language and theme controls'`.
- **Correção mínima:** reservar 132 px para as duas linhas do cabeçalho até 700 px e usar 8 px entre linhas. O hero desconta automaticamente a mesma variável de altura.
- **GREEN confirmado:** `pnpm --dir frontend exec playwright test --config playwright.visual.config.ts --grep 'contains its language and theme controls'`, 1 teste passou, com asserções inalteradas. Bateria final: `BARBERFLOW_E2E_API_PORT=8082 pnpm test:e2e`, 18 testes passaram em 1,6 minutos, com API real e base temporária recriada antes da execução. `pnpm test:unit`: 98 testes passaram; `pnpm build` e `pnpm test:e2e:types` passaram. A verificação Java desta alteração teve 62 testes sem falhas.

## 2026-10-28 — Contraste do foco na identidade Ritmo

- **Comportamento:** o foco genérico tinha contraste insuficiente nos novos fundos coral e grafite, embora os textos permanecessem legíveis.
- **Teste permanente:** `keeps keyboard focus at accessible contrast on coral and dark brand surfaces`, em `frontend/e2e/public-design.spec.ts`. O navegador calcula a luminância sRGB da cor real do outline e do fundo e exige pelo menos 3:1.
- **RED antes da correção:** `pnpm --dir frontend exec playwright test --config ../.hallmark/header-regression.config.ts --grep 'keeps keyboard focus at accessible contrast'`. Asserção falhou no botão final: `Expected: >= 3`, `Received: 2.623268973587705`. A configuração temporária usou o servidor local já iniciado; não houve mocks, retries nem alteração dos limites.
- **Correção:** outline em tinta escura sobre o coral e em tinta clara no rodapé grafite, usando os tokens da superfície.
- **GREEN:** o mesmo comando e teste, com asserções inalteradas, passou (1 teste). Para repetir de forma independente: em `frontend`, `pnpm exec playwright test --config playwright.visual.config.ts --grep 'keeps keyboard focus at accessible contrast'`.
- **Bateria final:** `BARBERFLOW_E2E_API_PORT=8082 pnpm test:e2e`, 19 testes passaram em 1,6 minutos, sem retries, com API real e base E2E recriada. `pnpm test:unit`: 98 testes passaram; `pnpm build` e `pnpm test:e2e:types` passaram; backend `./mvnw --batch-mode --no-transfer-progress verify`: 62 testes sem falhas.

## Login na prévia local: destino da API — 29 de outubro de 2026

- **Defeito:** a prévia Angular em `127.0.0.1:4200` usava o proxy fixo `localhost:8080`, ocupado por outro projeto. A API Compasso local está em 8091. O GET de diagnóstico de CSRF devolvia HTTP 301, em vez do JSON da API.
- **Regressão permanente:** `Angular development proxy routes authentication to the configured local API port`, em `frontend/tests/dev-proxy.test.cjs`. Comando RED: `node --test frontend/tests/dev-proxy.test.cjs`. Falha real de asserção antes da implementação: esperado `http://127.0.0.1:8082`, recebido `http://localhost:8080`. O teste resolve o proxy efetivamente registado em `angular.json` e continua integrado nos comandos unitários/CI.
- **Correção:** proxy de desenvolvimento com porta configurável por `BARBERFLOW_API_PORT`, host fixo em loopback e mesmo destino para `/api` e `/actuator`; mantida a porta 8080 por omissão. O Compose local passa a aceitar explicitamente as origens Angular em localhost/127.0.0.1:4200, além da origem do seu frontend. Sem alterar o perfil de produção nem o proxy E2E.
- **Integração permanente:** `serves the authentication API through the frontend proxy without redirects` verifica CSRF JSON e sessão anónima 401. Os percursos de registo, login, sessão e reserva usam exclusivamente `barberflow_e2e` em 5433 e contas `example.test`.

**GREEN e validação:** o mesmo teste de configuração passou com as mesmas asserções. Passaram também 98 testes Angular, os 62 testes Java, os tipos E2E, o build e os 20 testes de navegador com API/PostgreSQL reais, sem retries. A API local em 8091 respondeu HTTP 200 ao CSRF com a origem `http://127.0.0.1:4200`, após recriar apenas o serviço backend com a lista de origens atualizada e preservar os restantes valores de ambiente. A prévia foi reiniciada com `BARBERFLOW_API_PORT=8091`. A base local persistente e os seus utilizadores foram preservados; a base E2E descartável foi removida no fim. Sem deployment.

## Revalidação de registo/login e publicação — 29 de outubro de 2026

O utilizador voltou a reportar falhas. A cobertura existente foi ampliada no cenário de autenticação para iniciar o registo pelo formulário em inglês, recuperar a sessão após reload e sair antes de verificar duplicados e login normalizado em português. As mesmas asserções de duplicados, login inválido e login válido foram preservadas. A bateria passou em Chromium e WebKit; o login com a mesma conta sintética também chegou à agenda no navegador integrado, sem erros de consola. Não foi reproduzido um novo defeito de implementação na autenticação, pelo que não se alterou a lógica de sessão, as validações nem as proteções para fabricar uma correção. A regressão RED/GREEN do destino do proxy, da secção anterior, permanece ativa.

Uma primeira execução de dois conjuntos completos de autenticação na mesma base esgotou o limite real de cinco registos por hora e devolveu 429. Foi investigado e identificado como falta de isolamento entre baterias; não foi considerado RED de um defeito de autenticação. A bateria comparativa foi executada com a base E2E vazia e apenas o percurso relevante por motor, sem modificar limites, retries ou timeouts.

A inspeção do projeto Vercel confirmou que o domínio verificado atual é `compasso-pt.vercel.app`. O endereço histórico `barberflow-saas-delta.vercel.app` responde `DEPLOYMENT_NOT_FOUND`. Os links operacionais no README e runbook foram atualizados. A produção não recebeu testes de escrita: os percursos usam somente `barberflow_e2e` em 5433 e contas `example.test`.

### Origem canónica rejeitada na configuração de produção

Antes de promover o deployment `dpl_JCxjKB67HSravWdYVr8MkXE4XaCz`, a verificação com `Origin: https://compasso-pt.vercel.app` devolveu `403 Invalid CORS request`. As regressões permanentes em `scripts/deployment-auth.test.cjs` usam apenas GET e OPTIONS, sem criar contas, sessões autenticadas ou marcações em produção.

**RED confirmado antes da alteração de configuração:** `COMPASSO_DEPLOYMENT_URL=https://barberflow-saas-2yd5eo6p1-andrelealepg-9537.vercel.app COMPASSO_PUBLIC_ORIGIN=https://compasso-pt.vercel.app node --test scripts/deployment-auth.test.cjs`, com Vercel CLI 65.7.0 no PATH. `deployed authentication accepts the canonical public origin and issues CSRF JSON` falhou com `CSRF returned 403: Invalid CORS request` (`403 !== 200`). `deployed registration and login allow credentialed POST preflights from the public origin` falhou com `/api/auth/register preflight returned 403` (`403 !== 200`). Não foram erros de compilação nem de preparação.

A correção de configuração é definir `BARBERFLOW_ALLOWED_ORIGINS` e `BARBERFLOW_PUBLIC_BASE_URL` em produção para `https://compasso-pt.vercel.app`, mantendo os valores anteriores de Preview num escopo separado. Não alterar credenciais, base de dados, validações, CSRF, sessão nem Deployment Protection.

A primeira build com as variáveis corrigidas (`dpl_9aNuTyTo6Ud2NeCGFc9iHbuPdFhC`) foi recusada pelo limite de 50 imagens VCR; não chegou a ser promovida. Para libertar espaço foram guardadas e verificadas cópias Docker recuperáveis de duas imagens históricas sem correspondência com IDs/revisões dos deployments existentes: `image_LxkioN1lucHyTpMxrFAlVVKyjE38` (tag `c944c38e73f1`) e `image_xUsvJjP3Ksrd3TyHjSqe2kM0Wp5o` (tag `755e7ff8a670`). Os arquivos com SHA256 estão em `/tmp/compasso-vcr-archive-{tag}-20261029.tar` e `.sha256`. As imagens associadas aos deployments existentes foram preservadas.

**GREEN confirmado e publicação:** as mesmas duas regressões de `scripts/deployment-auth.test.cjs` passaram sem alterar as asserções no deployment `dpl_FPDMewUa7B4a1Wi4ivkUDYeoMhif`: CSRF 200 e preflights de registo/login 200, com a origem e as credenciais corretas. A API preparada respondeu `UP`. A versão foi promovida sem rebuild para **https://compasso-pt.vercel.app/**, e o projeto foi confirmado a apontar para esse deployment em estado `READY`.

Verificação pública após promoção, apenas leitura: health 200/UP, CSRF 200 JSON e cookie Secure/SameSite=Lax, sessão anónima 401, login e registo HTTP 200. O logo público coincide byte a byte com o SVG revisto. A página de entrada foi aberta no navegador integrado, sem erros de consola. A consulta dos logs de erro/fatal deste deployment devolveu 0 registos.

Validação de aplicação antes da publicação: 62 testes Java, 98 Angular e 1 regressão do proxy, build, tipos E2E e 20 testes de navegador aprovados; percurso de registo/login adicionalmente validado em Chromium e WebKit. Os testes de escrita usaram apenas PostgreSQL E2E em 5433 e contas sintéticas. O código da aplicação não mudou entre a bateria completa e a versão publicada; a correção final foi a configuração de produção. Base Git `322fc170`, com alterações locais preservadas, sem commit nem merge. O manifesto da release está em `/tmp/compasso-production-fixed-manifest.json`, fingerprint `24038bf4b312269c7407950e80fb791977074240da3b70d641c6b6b64882c6f2`.

## Ergonomia móvel — 29 de outubro de 2026

**RED antes de alterar estilos/templates:** `pnpm --dir frontend exec playwright test --config ../.hallmark/mobile-regression.config.ts`, com API local em 8082, base `barberflow_e2e` em 5433 e contas `example.test`. Os cenários permanentes `mobile-ergonomics.spec.ts` (320 e 390 px) e as asserções adicionais de `agenda-workspace.spec.ts` falharam por geometria real: controlos de cabeçalho de 32 px de altura/30 px de largura e botões de calendário de 36 px, abaixo dos 44 px exigidos para toque. A bateria exige também cabeçalhos de conta compactos, inputs de pelo menos 16 px, entrada disponível antes do scroll a 740 px de altura e controlos de data até 126 px de altura. Uma primeira tentativa, antes de o servidor arrancar, falhou por ligação recusada e não foi considerada RED. As asserções anteriores da agenda e dos percursos reais foram preservadas.

A regressão adicional `mobile-touch.spec.ts` foi executada com `hasTouch` e `isMobile` reais em 320/390 px. Antes da correção, os links de navegação mediam 36,80/38,39 px de altura, abaixo dos 44 px. Comando RED: `pnpm --dir frontend exec playwright test --config ../.hallmark/mobile-regression.config.ts mobile-touch.spec.ts`. A navegação pública passa a ter a mesma altura de toque dos restantes controlos.

A mesma bateria touch também reproduziu, a 320 px, um controlo com limite direito em 361 px (`Expected <= 320`). A grelha pública preservava a largura mínima intrínseca das duas colunas. A correção mínima usa `minmax(0, 1fr)` na primeira coluna, mantendo o cabeçalho de 132 px e o enquadramento da hero.

O percurso real `owner-booking.spec.ts` foi alargado para verificar dimensões e texto dos inputs da reserva pública. RED com `BARBERFLOW_E2E_API_PORT=8082 pnpm test:e2e --grep 'registers, configures, publishes'`: o seletor de data media 38 px, abaixo dos 44 px exigidos. O ajuste móvel mantém os inputs de data e de cliente com 48 px de altura e 16 px de texto.

Durante a iteração inicial, reutilizar a base após três reservas da bateria RED esgotou o limite real por telefone na sexta tentativa. A falha foi investigada (429), sem alterar limites nem testes. A validação GREEN usa novamente a base E2E vazia, conforme o procedimento de isolamento.

**GREEN e validação móvel:** as mesmas asserções passaram na bateria completa de 24 testes de navegador, com API real em 8082, PostgreSQL E2E em 5433 e base vazia. Passaram também os 98 testes Angular e a regressão Node do proxy (99 verificações), o build de produção e os tipos E2E. O percurso da agenda mantém desktop e verifica agora 390 e 320 px; o percurso público verifica os inputs reais da reserva. Quatro testes públicos adicionais passaram em WebKit com emulação iPhone a 320/390 px. Os cenários de fotografia, teclado/foco, idioma e tema mantiveram as asserções existentes. Não foram usados mocks nos percursos de conta, sessão ou marcação.

**Publicação móvel — 30 de outubro de 2026:** deployment `dpl_Ako25B9GuRSfZBTQKP7zjMCD8D3w`, promovido em estado READY para **https://compasso-pt.vercel.app/**. Antes da promoção, as duas verificações permanentes de autenticação passaram (CSRF e preflights de registo/login) e a API respondeu UP. Após a promoção, health, CSRF e stylesheet móvel devolveram 200; o CSS público `styles-NB5XINPK.css` coincide byte a byte com a build local validada. A consulta de erros/fatal do novo deployment devolveu 0 registos. Nenhum teste de escrita foi apontado à produção.

A release congelada está em `/Users/AndreLeal_1/Library/Caches/compasso-releases/mobile-20261030`; manifesto em `.hallmark/mobile-release/manifest.json`, fingerprint `4fdabce7332591398b0bccaae09afbdb36cad320f3363b11664d5b1f75cb174d`. Para libertar uma vaga no VCR foi arquivada, com digest e SHA256 verificados, a imagem `image_Q2TFg55oiI61jm7OEf3J2ix7v2Wp` (tag `81694ef08737`), sem correspondência com IDs/revisões dos 50 deployments existentes. Cópia persistente ignorada pelo Git em `backups/vcr/20261030/81694ef08737.tar` e `.sha256`. As imagens dos deployments existentes foram preservadas. Sem commit ou merge; alterações anteriores do utilizador preservadas.

Reexecução das regressões: `BARBERFLOW_E2E_API_PORT=8082 pnpm test:e2e` em `frontend`, com a base E2E vazia. Novos testes: `keeps account navigation touchable and the login form within a 320px mobile viewport` (e 390 px), `keeps public mobile header controls inside a 320px touch viewport` (e 390 px); a agenda e a reserva pública mantêm os nomes e as asserções anteriores, com as verificações geométricas adicionais.

## Remover a demonstração do início — 30 de outubro de 2026

A pedido do utilizador, remover apenas a pré-visualização da agenda da hero e reorganizar a abertura numa coluna, preservando fotografia, título, registo e ligação à apresentação do produto abaixo. Regressões permanentes em `public-design.spec.ts`: `keeps the opening hero focused on the message and signup without a demo at 390px` e a variante a 1440 px.

**RED antes da alteração:** `pnpm --dir frontend exec playwright test --config playwright.visual.config.ts --grep 'opening hero focused'`. Ambos falharam por asserção: esperado 0 elementos de demonstração na hero, recebidos 3 (`figure`, `picture`, `figcaption`). As asserções de fotografia, altura durante scroll, foco, ações e prévia da secção do produto foram mantidas.

**GREEN:** as mesmas duas regressões passaram, integradas nos 21 testes da interface pública (`pnpm --dir frontend exec playwright test --config playwright.visual.config.ts`). Também passaram as 99 verificações unitárias do frontend, build e tipos E2E. As capturas a 390 e 1440 px foram revistas. A prévia da secção `#produto` mantém-se, e a hero não contém figure, picture, legenda ou imagem de agenda. A altura da foto durante scroll e a apresentação do restante conteúdo continuam cobertas pelos testes anteriores, sem alterar as asserções.

**Publicação da abertura sem demonstração:** deployment `dpl_6doHRYwQCJR7euut17DPWd7tFwyD`, READY e promovido para **https://compasso-pt.vercel.app/** em 30 de outubro de 2026. As duas verificações de autenticação passaram antes da promoção, e a API respondeu UP. O bundle público `chunk-DXN4RjjH.js` coincide byte a byte com a build local validada e não contém os assets da demonstração da hero. Health e bundle públicos devolveram 200; consulta de erros/fatal com 0 registos. Testes de escrita não foram executados em produção.

A release está em `/Users/AndreLeal_1/Library/Caches/compasso-releases/hero-clean-20261030`, fingerprint `8be840b1a0edc5a1d8a5728959f55e53aa5b45ad67d24b748cd46e22ae4258e3`, manifesto em `.hallmark/hero-removal/manifest.json`. Uma imagem VCR sem deployment associado (`image_6vFO7uuanQLvmlhPEnyFZgbvTCYq`, tag `ce6c38911a25`) foi arquivada e verificada antes de libertar uma vaga. Cópia persistente ignorada pelo Git em `backups/vcr/20261030/ce6c38911a25.tar` e `.sha256`. Sem commit ou merge; restantes alterações preservadas.

## Verificação do ajuste visual da fotografia — 30 de outubro de 2026

Ajuste de apresentação solicitado pelo utilizador, com redução da camada escura da hero. As regressões existentes foram mantidas sem alterações: fotografia a preencher a hero, estabilidade durante scroll, foco e navegação, remoção da demonstração e controlos móveis. Comando: `pnpm --dir frontend exec playwright test --config playwright.visual.config.ts` — 21 aprovados. Build aprovado; quatro cenários móveis adicionais passaram em WebKit. Capturas revistas a 390 e 1440 px.

Publicação: `dpl_6ALZm6nur4YijxAZ1vizBAyT5bVN`, promovido para `https://compasso-pt.vercel.app/` após verificações de autenticação e API. Manifesto em `.hallmark/hero-light/manifest.json`, fingerprint `ab36ad304cf5ae9d1e40eef028c3fcdb70893c0db98d1b7a0837d6d010d62246`. Imagem histórica VCR sem deployment associado `image_M1oAd3hiHIbAO7BnuowvQY91GDmX` (tag `d2fd0222f12f`) arquivada com digest/SHA256 verificados em `backups/vcr/20261030/d2fd0222f12f.tar` e `.sha256`, antes de libertar espaço. Outras alterações e um documento de diagnóstico paralelo foram preservados no workspace e não acrescentados a esta release. Um build local foi regenerado durante a verificação posterior; a comparação pública usou os artefactos congelados e já verificados em staging, confirmando a versão exata publicada. Sem commit ou merge.


## 2026-10-30 — Login e carregamento da agenda

O diagnóstico está em `docs/DIAGNOSTICO_DESEMPENHO_2026-10-30.md`. As alterações abaixo foram feitas depois de confirmar RED por asserções, sem contar erros de ambiente ou preparação como reprodução válida.

### Pedidos duplicados e isolamento de sessão

- Teste: `Dashboard request sharing > shares one pending shop request between layout and page and refreshes after completion`.
- Comando em `frontend`: `pnpm test --watch=false --include='src/app/core/booking-api.service.spec.ts'`.
- RED: esperava um pedido de estabelecimento pendente, recebeu **dois**. A regressão de mudança de conta também encontrou um terceiro pedido indevido quando uma resposta antiga terminava.
- Correção: partilha apenas do pedido em curso, identificada pelo utilizador da sessão; remoção após conclusão/erro, sem cache permanente de dados do negócio. Uma resposta de outra sessão não limpa o pedido da sessão atual.
- Teste adicional: `Public page shortcuts > lets a page that loads the business own that request even when its chunk loads later`, comando `pnpm test --watch=false --include='src/app/layouts/dashboard-layout/dashboard-layout.spec.ts'`.
- RED: o layout chamou a API **uma vez**, apesar de a página ser responsável por carregar o estabelecimento. Correção: metadados de rota indicam essa responsabilidade; agenda, visão geral e perfil atualizam a aparência com a sua própria resposta. Isto remove a duplicação mesmo se o primeiro HTTP terminar antes de carregar o código da página.
- GREEN: as mesmas asserções passaram. O percurso real `agenda-workspace.spec.ts` exige **um** GET de estabelecimento e um GET de marcações com `from`/`to` em 1440, 390 e 320 px.

### Consultas limitadas, histórico e respostas fora de ordem

- Testes: `BookingReadPerformanceIntegrationTests.returnsOnlyBookingsOverlappingTheRequestedDay`, `boundsUpcomingReadsAndKeepsPagesDisjoint`, `readsOnlyHistoryAndLimitsTheOverview`, `rejectsUnboundedOrInvalidRangesAndPageSizes`.
- Comando em `backend`: `./mvnw --batch-mode --no-transfer-progress -Dtest=BookingReadPerformanceIntegrationTests test`.
- RED: o dia pedido devolveu **6 registos em vez de 4**; a primeira página devolveu **6 em vez de 3** (2 visíveis e 1 indicador de continuação); histórico devolveu **6 em vez de 2**; intervalo inválido devolveu **200 em vez de 400**. Quatro falhas de asserção, sem erros de preparação.
- Correção: filtragem de sobreposição por data e paginação no PostgreSQL, com isolamento por estabelecimento, ordenação estável e `join fetch` do profissional. As listas pedem no máximo o tamanho da página mais um registo para sinalizar continuação, sem query de contagem. Calendário aceita intervalos até 31 dias; páginas entre 1 e 100 registos. O contrato antigo sem parâmetros foi mantido para clientes existentes.
- Testes do frontend: `requests only the selected day instead of the complete booking history`, `replaces a pending day request when navigating and ignores its late response`, `loads bounded pages when switching to the history list` e `requests only the next five appointments for the overview`.
- Comando em `frontend`: `pnpm test --watch=false --include='src/app/pages/bookings/bookings.spec.ts' --include='src/app/pages/dashboard/dashboard.spec.ts' --include='src/app/pages/login/login-preparation.spec.ts'`.
- RED: chamadas sem os limites solicitados e resposta do dia antigo no lugar do dia novo. Correção: calendário consulta apenas o dia selecionado, cancela a leitura anterior ao mudar de data/vista, listas usam páginas de 50 e visão geral pede as próximas cinco. O botão Carregar mais preserva as páginas anteriores e permite continuar a consultar o histórico.
- Na suite completa, os novos testes chegaram ao limite real de registos por IP partilhado com outros casos (429 no setup). Foram isolados com endereços sintéticos próprios por fixture, mantendo limites e asserções. Essa falha de setup não foi contada como RED do defeito.
- GREEN: os quatro testes de PostgreSQL passaram sem alterar asserções; os testes de dia, corrida, páginas e visão geral também passaram. A preservação e continuação das páginas tem uma asserção adicional com 51 registos.

### Preparação do login e prontidão do backend

- Testes: `Login preparation > starts preparing the backend before submission and reuses that pending request` e `keeps the login form usable after background preparation fails`.
- RED: o formulário abria sem enviar o GET de preparação (`expected one matching request, found none`).
- Correção: a página de login começa a preparação ao abrir; a submissão reutiliza esse pedido uma vez. Falhas em segundo plano não bloqueiam o formulário e a tentativa seguinte obtém preparação nova. As regressões existentes continuam a exigir cookies, sessão e token CSRF correto em todas as escritas.
- Teste: `BackendReadinessIntegrationTests.firstLoginPreparationDoesNotInitializeControllersAfterReadiness`.
- Comando em `backend`: `./mvnw --batch-mode --no-transfer-progress -Dtest=BackendReadinessIntegrationTests test`.
- RED: o primeiro GET de preparação criou `authenticationController` após a aplicação anunciar prontidão. Correção: perfil Vercel prepara os componentes e repositórios antes de servir pedidos.
- Regressão de ciclo de vida: `does not restore the previous business from a response received after leaving the page`; comando `pnpm test --watch=false --include='src/app/pages/bookings/bookings.spec.ts'`.
- RED: uma resposta tardia restaurava `{id: previous-owner}` na aparência global depois de destruir a página. Correção: leituras são canceladas quando a página é destruída. GREEN com asserções inalteradas.

### Arranque do container

- Teste permanente: `ContainerStartupTest.test_first_csrf_response_within_six_seconds`, em `scripts/test-container-startup.py`.
- RED, antes de editar o Dockerfile: `COMPASSO_STARTUP_IMAGE=eclipse-temurin:21-jre-alpine COMPASSO_STARTUP_JAR=/tmp/compasso-performance-tools/backend-before.jar python3 scripts/test-container-startup.py`.
- Falha válida: **8,055 s > 6,000 s** até à primeira resposta JSON com CSRF, com container novo, uma CPU e 2 GiB. Uma primeira tentativa teve uma exceção de rede não tratada durante a espera pelo servidor e não foi considerada RED; o polling foi corrigido antes de alterar o container, sem mudar o limite de seis segundos.
- Correção: extração do JAR para o layout eficiente do Spring Boot, arquivo CDS produzido no build e JVM com `TieredStopAtLevel=1`. Treino offline sem credenciais reais, Flyway, validação SQL ou sessão JDBC; essas funcionalidades permanecem ativas na execução normal.
- GREEN: `docker build -f backend/Dockerfile.vercel -t compasso-performance:candidate backend` e `COMPASSO_STARTUP_IMAGE=compasso-performance:candidate python3 scripts/test-container-startup.py` — **2,474 s**, mesmo limite e mesmas asserções. Uma versão intermédia do treino também passou em 2,768 s.
- Ambiente: Docker Desktop, Linux ARM64, PostgreSQL E2E descartável, rede `barberflow-e2e_default`; o serviço de base continua publicado apenas em `127.0.0.1:5433`. Não é uma medição da Vercel e não elimina a possibilidade de redução de instâncias por parte da plataforma.
- O teste integra `scripts/test-all.sh` e o novo job `Container startup regression` do CI. Não foram adicionados retries nem aumentados timeouts para esconder falhas.

### Validação da aplicação

`./mvnw --batch-mode --no-transfer-progress verify`: **67 testes Java**, zero falhas/erros/skip. `pnpm test:unit`: **110 testes Angular** e a regressão Node do proxy aprovados. `pnpm build` e `pnpm test:e2e:types` aprovados. `BARBERFLOW_E2E_API_PORT=8082 pnpm test:e2e`: **26 testes de navegador aprovados**, zero retries, com API e PostgreSQL reais, incluindo login, sessão, imagens, publicação, marcação, cancelamento e as novas verificações de rede da agenda.

Os relatórios, imagens e medições brutas estão fora dos commits. Não foi criado PR, commit, merge nem deployment por esta tarefa. As alterações anteriores e o trabalho de apresentação paralelo foram preservados.


**Validação adicional da imagem final:** o teste de arranque passou também com **2,796 s** e foi alargado, mantendo a asserção original de seis segundos, para executar registo, login, rotação do identificador de sessão, `/me` e leitura limitada da agenda com PostgreSQL real. O login autenticado demorou **0,608 s**, abaixo do limite adicional de dois segundos. A imagem usa apenas contas `example.test` e a rede da base E2E. A tradução inglesa do botão Carregar mais passou os quatro testes de idioma; build final aprovado.

Numa comparação dirigida de logins na mesma base sintética e com uma CPU, a imagem anterior registou 0,499/0,255/0,241 s e a otimizada 0,669/0,279/0,278 s. A opção de compilação inicial da JVM favorece o arranque; não se afirma que todas as operações CPU-bound fiquem mais rápidas. A primeira leitura vazia da agenda passou de 0,298 s para 0,015 s nessa amostra. Estes valores são locais e não representam percentis nem desempenho em produção.


## Publicação das correções de desempenho — 30 de outubro de 2026

Deployment `dpl_4RcBGXuMRwciswao29XM78cUAVSF` construído pela Vercel e promovido para `https://compasso-pt.vercel.app/` após dois testes de autenticação de leitura aprovados e health UP no URL preparado. A imagem publicada inclui CDS, layout extraído e TieredStopAtLevel=1. Após promoção: HTML 200, CSRF JSON 200 (0,333 s nesta amostra com instância já preparada), health 200/UP (0,313 s) e sessão anónima 401 (esperado). Estes tempos não medem arranque a frio.

Foi acrescentado `.vercelignore` para excluir backups, relatórios e ficheiros locais do envio. A primeira construção atingiu o limite de imagens VCR. A imagem histórica `image_7IsJRSi6KA2jr3uztqikVlmwTqYH`, tag `9afbb97fcd0d`, foi copiada por digest e arquivada em `backups/vcr/20261030/9afbb97fcd0d.tar`, com SHA256, antes de libertar uma vaga. A imagem pública anterior foi preservada. Nenhum teste de escrita foi executado em produção.

## 2026-10-30 — Tema escuro na primeira visita

- Regressão permanente: `Site theme preference > uses dark for the first visit without a saved preference`, em `theme.service.spec.ts`. Comando em `frontend`: `pnpm test --watch=false --include='src/app/core/theme.service.spec.ts'`.
- RED antes da implementação: esperava `DARK`, recebeu `LIGHT`. O mesmo ocorreu nas regressões de preferência inválida e armazenamento bloqueado; quatro testes de preferência explícita já passavam.
- Navegador: `playwright test --config playwright.visual.config.ts theme-default.spec.ts`. Ambos os cenários falharam por asserção `data-theme`: esperava `dark`, recebeu `light`, incluindo HTML com JavaScript desativado. Os erros iniciais de invocação do pnpm local não contam como RED.
- Correção mínima: o serviço restaura `LIGHT` apenas quando explicitamente guardado; na ausência de preferência válida ou armazenamento disponível usa `DARK`. O HTML e a cor do navegador começam em escuro. As preferências explícitas, incluindo a chave antiga, continuam respeitadas.
- O teste de navegador verifica também um sistema configurado em claro, alternância manual, recarregamento e navegação para login. Os testes ficam integrados nas baterias unitária e E2E, sem retries nem alterações às asserções entre RED e GREEN.
- A primeira execução GREEN do cenário completo encontrou um erro no percurso recém-criado: tentou alternar o tema no login, onde não existe esse controlo. O teste passou a regressar ao início pelo link existente antes da alternância, mantendo todas as asserções originais. Esta falha de preparação não foi atribuída ao produto.
- GREEN: 7 testes de tema e toda a bateria unitária (117 Angular + 1 Node), 23 testes visuais públicos, build de produção, tipos E2E e 67 testes Java aprovados, sem falhas/skip. As três regressões unitárias e as duas asserções RED de tema passaram sem ser enfraquecidas.
- Bateria completa: `BARBERFLOW_E2E_API_PORT=8082 pnpm test:e2e` — **28 testes aprovados**, com API real e PostgreSQL descartável em `127.0.0.1:5433`, incluindo conta, sessão, publicação, marcação e a nova preferência visual. Zero retries. Nenhuma escrita em produção.
- Verificação adicional: os dois cenários de tema passaram em WebKit, emulação iPhone 13. Os artefactos locais ficam em `.hallmark/dark-default/` e fora dos commits.
- Publicação: `dpl_3veRg6hQ7o9AG1Z6E3ZCMfoKfy4R`, produção preparada e depois promovida sem rebuild para `https://compasso-pt.vercel.app/`. Fonte congelada em `~/Library/Caches/compasso-releases/dark-default-20261030`, fingerprint `78cce912e3c79b87799e50b0e7133cf84d71807a492bc04e871899915001e6e3`. Mantém as melhorias de desempenho já publicadas anteriormente.
- Antes da promoção: dois testes GET/OPTIONS de autenticação aprovados, health UP, HTML inicial escuro e ficheiros de entrada JS/CSS idênticos ao build local validado. Após promoção: mesmas verificações do HTML, bundles e health aprovadas no domínio público. Nenhum teste de escrita em produção.
- A quota VCR estava cheia. Foi arquivada por digest e verificada com SHA256 a imagem histórica sem referências `image_wni97bYdY2Fky9msJi2sfmPg2LcK` (`e492aa174448`) em `backups/vcr/20261030/e492aa174448.tar` antes de libertar uma vaga; imagens dos deployments existentes foram preservadas.
- Observabilidade: consulta dos últimos 10 minutos do deployment com `level:error OR level:fatal` devolveu zero registos após a publicação. A base E2E foi terminada no fim da bateria.

## 2026-11-13 — Auditoria funcional do Compasso

Comandos executados antes e depois das correções.

```bash
cd frontend
pnpm test --watch=false --include='src/app/pages/public-booking/public-booking.spec.ts'
pnpm test --watch=false --include='src/app/pages/dashboard/dashboard.spec.ts'
pnpm test --watch=false --include='src/app/pages/register/register.spec.ts'
```

```bash
cd backend
./mvnw --batch-mode --no-transfer-progress -Dtest=CreateBookingRequestValidationTest,BookingFlowIntegrationTests test
./mvnw --batch-mode --no-transfer-progress '-Dtest=BookingSecurityIntegrationTests#allowsCompletionOnlyAfterTheBookingHasStarted' test
./mvnw --batch-mode --no-transfer-progress '-Dtest=AuthenticationFlowIntegrationTests#rejectsAnOwnerPhoneNumberMadeOnlyOfPunctuation' test
```

| Teste | RED | Correção |
| --- | --- | --- |
| `lets the customer retry a failed availability request for the same date` | Após HTTP 503, o botão de repetição estava ausente. | Repetir a consulta com o serviço e a data atuais. |
| `rejects a phone number made only of punctuation before submitting` e `rejectsPhoneNumbersWithFewerThanSevenDigits` | O formulário e o validador aceitavam telefones com menos de sete dígitos. | Exigir pelo menos sete dígitos, mantendo a formatação de telefone aceite. |
| `rejects an owner phone number made only of punctuation` e `rejectsAnOwnerPhoneNumberMadeOnlyOfPunctuation` | O formulário enviou o pedido e a API devolveu HTTP 201 em vez de 400. | Reutilizar a mesma regra de telefone no registo e nas marcações. |
| `uses the booking calendar limits supplied by the shop` e `shouldConfigurePublishBookAndCancel` | A página usava a data do navegador e a resposta da API não incluía `bookingStartDate`. | Expor as datas do calendário do servidor e usar esses limites na página. |
| `keeps the booking link available to copy manually when clipboard access is missing` | A cópia lançou `TypeError` ao aceder a `writeText`. | Apresentar um campo selecionável e uma indicação de cópia manual. |
| `exposes the selected service, date and time to assistive technology` | O estado acessível da opção selecionada era `null`. | Expor a seleção com `aria-pressed`. |
| `allowsCompletionOnlyAfterTheBookingHasStarted` | Uma marcação futura passou a concluída com HTTP 200. | Aplicar na API a regra temporal do painel e devolver HTTP 409 antes do início. |

**GREEN.** Os testes de regressão passaram com as mesmas expectativas. O teste anterior do painel continua a confirmar a disponibilidade do link através do valor do novo campo selecionável.

## 2026-11-14 — Agenda resiliente, confirmação e calendário do negócio

Comandos RED e GREEN, na pasta `frontend`:

```bash
TZ=UTC pnpm test --watch=false --include='src/app/pages/bookings/bookings.spec.ts'
TZ=UTC pnpm test --watch=false --include='src/app/pages/availability/availability.spec.ts'
```

| Teste | Evidência RED | Correção |
| --- | --- | --- |
| `keeps appointments visible and hides unverified free slots if blocked times fail` | O evento esperado não foi renderizado quando o pedido de bloqueios falhou. | Preservar as marcações e apresentar o erro do pedido secundário, com vagas indisponíveis até confirmar o horário e os bloqueios. |
| `asks for confirmation before cancelling from the list` | Um único clique enviou `CANCELLED` à API, quando se esperavam zero pedidos. | Pedir confirmação na lista e nos detalhes, com opção de manter a marcação. |
| `uses the business day and time to classify appointments after midnight` | A agenda mostrou o dia do dispositivo em vez de `2030-05-11` às 23:15 UTC de 10 de maio. | Converter o relógio para o fuso da agenda e manter as horas civis da API. |
| `sets the initial block date from the business calendar after midnight` | O formulário ignorou que já era `2030-05-11` no fuso do negócio. | Reutilizar o calendário do negócio na data e no limite dos bloqueios. |

Os mesmos testes passaram. A bateria local incluiu 71 testes Java, 127 Angular, a regressão do proxy e 29 testes de navegador. A compilação, a verificação dos tipos E2E e o arranque da imagem Vercel também passaram.

### Navegador Linux e alojamento Vercel

- **RED no GitHub Actions.** [Teste de navegador](https://github.com/AndreLeal-L2/barberflow-saas/actions/runs/43636629362/job/132575128372) em `a3a63083`, 28 aprovados e uma falha em `keeps the photograph size when scrolling changes only the visible height`. Em Linux, o gesto CDP terminou sem deslocar a janela, com `scrollY = 0`.
- **Correção.** Deslocar a janela com a API do navegador e conservar as asserções de deslocação, altura estável e rotação. `pnpm exec playwright test --config playwright.visual.config.ts hero-background.spec.ts --grep='keeps the photograph size'` passou localmente.
- **Vercel.** A build com `8bce87b` falhou depois de compilar porque o repositório de imagens `backend` estava cheio. O mesmo projeto publicou a imagem de pré-visualização após encaminhar as mesmas rotas para o serviço `api`. A versão preparada com a configuração de produção respondeu 200 para HTML e saúde e passou os dois testes de leitura de autenticação de `scripts/deployment-auth.test.cjs`. Os testes de escrita decorreram em ambiente local.
