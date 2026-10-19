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

O resultado GREEN desta regressão e da bateria completa é registado depois da execução final do CI.
