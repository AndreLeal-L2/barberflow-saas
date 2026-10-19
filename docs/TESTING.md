# Testes e regressões

Cada bug deve seguir **RED → correção → GREEN**: criar o teste, verificar que falha pelo motivo esperado, corrigir o código e executar novamente o mesmo teste. A regra permanente está em [AGENTS.md](../AGENTS.md); a evidência dos casos corrigidos fica no [registo de regressões](REGRESSION_LOG.md).

## Bateria completa

Requisitos: Java 21, Node.js 24, pnpm, Docker com o daemon em execução. Não é necessário configurar credenciais de produção.

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
