# Diagnóstico de desempenho — 30 de outubro de 2026

## Conclusão

O maior atraso observado está no arranque do backend Java: um pedido necessário antes do login demorou **25,362 s**, enquanto a repetição imediata demorou **0,214 s**. Outra sequência voltou a apresentar **24,763 s** no mesmo endpoint. Os logs do deployment confirmam arranque do Tomcat durante o primeiro destes pedidos.

O carregamento das páginas acrescenta trabalho evitável: a entrada na agenda dispara cinco pedidos, dois deles iguais, e a lista de marcações devolve todo o histórico. A configuração de inicialização adiada do Spring transfere parte do custo de preparação para os primeiros pedidos. O pool JDBC tem um limite predefinido de duas ligações por instância, que pode tornar-se um ponto de espera quando vários pedidos chegam juntos.

O arranque lento está confirmado. O peso individual do pool, das consultas SQL e da renderização autenticada ainda precisa de medição específica. Não foi feita nenhuma correção nem alteração de infraestrutura neste diagnóstico.

## Âmbito e método

- Site: `https://compasso-pt.vercel.app`.
- Deployment inspecionado: `dpl_Ako25B9GuRSfZBTQKP7zjMCD8D3w`, `READY`, alvo `production`, criado em 30/10/2026 às 13:51:59 UTC; runtime container em `cdg1`, plano Hobby.
- Deployment identifica a revisão `322fc1709802c7c1d2b54f68b3c2eb4205cf5ad0` e `gitDirty=1`. Não se presume que todo o código local seja idêntico ao publicado.
- Os bundles JavaScript publicados foram consultados e confirmam o pré-pedido CSRF, os dois pedidos de estabelecimento na entrada da agenda e o carregamento dos restantes dados descritos abaixo.
- Medições HTTP sequenciais a partir desta máquina, com `urllib.request` e relógio monotónico. Os tempos incluem rede, ligação HTTPS, espera e leitura da resposta. Não são tempos exclusivos de SQL nem métricas de renderização no navegador.
- Só foram feitos pedidos GET públicos/sem sessão e consultas de leitura aos metadados e logs da Vercel. O slug de diagnóstico é inexistente. Não foram criadas contas, sessões autenticadas ou marcações em produção.
- Os logs históricos de pedidos autenticados foram apenas consultados. Não foi executado um login de produção para medir o percurso completo.

## Medições observadas

Primeira sequência, iniciada às 14:35 UTC:

| Pedido | Estado | Tempo total |
| --- | --- | ---: |
| `/` — HTML servido pelo cache da Vercel | 200 | 0,181 s |
| `/api/auth/csrf` — primeiro pedido da sequência | 200 | **25,362 s** |
| `/api/auth/csrf` — repetição imediata | 200 | **0,214 s** |
| `/api/auth/me` — sem sessão | 401 | 1,046 s |
| `/actuator/health` | 200 | 1,301 s |

Segunda sequência, iniciada às 14:36 UTC:

| Pedido | Primeira passagem | Segunda passagem | Terceira passagem |
| --- | ---: | ---: | ---: |
| `/api/auth/csrf` — 200 | **24,763 s** | 0,957 s | 1,055 s |
| `/api/auth/me` sem sessão — 401 | 0,223 s | 1,097 s | 0,188 s |
| `/api/public/barbershops/diagnostico-performance-inexistente` — 404 | **5,630 s** | 1,055 s | 0,257 s |
| `/actuator/health` — 200, `UP` | 0,316 s | 1,081 s | 1,013 s |

Esta é uma amostra pequena e dirigida ao diagnóstico; não permite calcular percentis representativos. O HTML de 0,181 s não representa o carregamento completo do frontend. O 401 em `/me` é esperado sem sessão e não mede validação de palavra-passe nem recuperação de sessão válida.

## 1. Arranque do backend no caminho do utilizador — confirmado

O pedido `/api/auth/csrf` começou às **14:35:33,044 UTC**. Nos logs desse pedido, o Tomcat só anunciou `Tomcat started on port 80` às **14:35:55,265 UTC**: cerca de **22,22 s** depois do início do pedido. A resposta completa chegou ao cliente em 25,362 s.

Há também mensagens de arranque da JVM associadas a pedidos históricos de `/api/auth/csrf` e das páginas privadas, bem como mensagens de encerramento gracioso. Portanto, o custo de inicializar a aplicação aparece durante utilização real, incluindo pedidos de dados.

A imagem executa Java 21 com Spring Boot, Hibernate, Flyway e Spring Session JDBC (`backend/Dockerfile.vercel`). A Vercel executa esta imagem como uma função que escala conforme a procura. A documentação oficial descreve redução de instâncias sem tráfego após cinco minutos em produção e trinta segundos em preview: [Container Runtime — scale in behavior](https://vercel.com/docs/functions/runtimes/container#scale-in-behavior).

**Limite da conclusão:** os dois pedidos lentos ocorreram com menos de cinco minutos entre si. Não é correto atribuir toda a recorrência apenas ao temporizador documentado de inatividade. A razão exata para reutilização insuficiente, criação e encerramento das instâncias precisa de investigação da plataforma. Os logs disponíveis não identificam de forma conclusiva esse motivo.

## 2. Login espera por um pedido preliminar — confirmado no código publicado

Fluxo atual:

```text
Clique em Entrar
  → GET /api/auth/csrf
  → POST /api/auth/login
  → navegação para /dashboard
  → pedidos de dados da agenda
```

`CsrfService.execute()` só inicia a operação depois de terminar o GET de CSRF (`frontend/src/app/core/csrf.service.ts:15`). `AuthService.login()` usa esse método (`frontend/src/app/core/auth.service.ts`). Assim, o utilizador pode esperar os 25 s medidos **antes de o pedido que valida a palavra-passe começar**.

O backend usa BCrypt com custo 12 (`backend/src/main/java/com/barberflow/config/SecurityConfig.java`) e persiste a sessão em PostgreSQL. São custos adicionais possíveis do POST, mas não foram medidos isoladamente. Não há evidência para atribuir os 25 s ao BCrypt nem para reduzir a sua segurança.

Num acesso direto ou recarregamento de uma rota privada, o guard também espera por `/api/auth/me` antes de abrir a página. Depois de um login bem-sucedido na mesma aplicação, o estado da sessão já fica memorizado e o guard pode reutilizá-lo; não se afirma que `/me` seja chamado a cada navegação.

## 3. Inicialização adiada acrescenta custo ao primeiro uso — confirmada

O perfil Vercel configura:

```yaml
spring.main.lazy-initialization: true
spring.data.jpa.repositories.bootstrap-mode: lazy
```

Referência: `backend/src/main/resources/application-vercel.yml:1`.

Os logs mostram configuração do `AuthenticationManager` em threads HTTP durante pedidos, inicialização do `DispatcherServlet` em pedidos de páginas privadas e preparação do parser HQL durante o primeiro pedido público que consulta um estabelecimento.

O GET público com slug inexistente demorou 5,630 s na primeira passagem e 0,257 s na terceira. Isso confirma custo adicional no primeiro acesso, mas não separa inicialização do Hibernate, obtenção de ligação e execução SQL. Esse resultado, sozinho, não demonstra uma consulta SQL de 5,630 s.

## 4. Pedidos duplicados e concorrência com pool pequeno

Na entrada da agenda, o código publicado faz:

1. `DashboardLayout.ngOnInit()` → `/api/dashboard/barbershop`.
2. `Bookings.reload()` → `/api/dashboard/barbershop` outra vez.
3. `Bookings.reload()` → `/api/dashboard/bookings`.
4. `Bookings.reload()` → `/api/dashboard/availability/blocks`.
5. `Bookings.reload()` → `/api/dashboard/availability`.

Referências: `frontend/src/app/layouts/dashboard-layout/dashboard-layout.ts:56`, `frontend/src/app/pages/bookings/bookings.ts:351`, `frontend/src/app/core/booking-api.service.ts`.

O serviço HTTP não partilha nem memoriza o resultado de `getBarbershop()`. Na visão geral também existe duplicação na entrada direta: layout e página pedem o estabelecimento. Ao navegar entre filhos com o layout já montado, o pedido inicial do layout não é necessariamente repetido.

No backend local, cada resposta de estabelecimento lê o registo e executa duas contagens de preparação (`BarbershopManager.get()` e `toResponse()`). A duplicação repete esse trabalho. Os pedidos autenticados também dependem das leituras e atualizações da sessão JDBC.

O perfil Vercel tem estes valores predefinidos por instância:

- `maximum-pool-size: 2`, alterável por variável de ambiente.
- `minimum-idle: 0`, alterável por variável de ambiente.
- `idle-timeout: 60000` e `max-lifetime: 300000`.
- `connection-timeout: 10000`: limite de espera por ligação; **não** significa que cada pedido demore dez segundos.

Cinco pedidos não implicam cinco ligações em uso simultâneo em todos os momentos. Contudo, quando vários precisam de acesso ao PostgreSQL, um pool de duas ligações pode introduzir espera. As chamadas duplicadas aumentam essa pressão.

**Estado da evidência:** duplicação confirmada nos bundles publicados; tamanho do pool é o valor predefinido do repositório, sem confirmação de eventual override em produção; saturação do pool ainda não foi medida. Aumentá-lo sem verificar os limites totais do PostgreSQL e o número de instâncias seria prematuro.

## 5. A agenda carrega todo o histórico — confirmado no código

`BookingManagementService.list()` usa `findAllByBarbershopIdOrderByStartAtAsc()` sem paginação ou intervalo de datas. A agenda filtra os dados no frontend. A visão geral também pede a lista completa para apresentar apenas as próximas cinco marcações.

Referências: `backend/src/main/java/com/barberflow/booking/BookingManagementService.java:25`, `backend/src/main/java/com/barberflow/booking/BookingRepository.java:24`, `frontend/src/app/pages/dashboard/dashboard.ts`.

Isto faz o volume transferido, a conversão dos registos e o trabalho do navegador crescerem com o histórico de cada estabelecimento. É um problema de escalabilidade concreto, mas o volume atual e a sua contribuição para a demora não foram quantificados.

A migração já cria um índice em `(barbershop_id, start_at)`. Não há base para concluir que a solução principal seja adicionar índices indiscriminadamente.

## Limitações de acesso e validação

- O conector Vercel recusou acesso à equipa. A CLI local, já autenticada, permitiu verificar o projeto correto e consultar deployment e logs. Não foi necessária alteração de permissões.
- O conector Supabase só apresentou um projeto `INACTIVE`, sem ligação demonstrada ao deployment atual. Não se atribui o incidente a esse projeto nem se conclui que o PostgreSQL usado pela aplicação esteja pausado. O endpoint público devolveu 404 e o health devolveu `UP` durante as medições.
- Faltam tempos internos por endpoint, espera no Hikari, estatísticas SQL do PostgreSQL correto e uma captura do percurso autenticado completo no ambiente isolado.
- Não foram executadas suites de regressão, build ou testes de escrita: o trabalho foi diagnóstico de leitura e documentação, sem correção de implementação. Java não está instalado no host; Docker está disponível. Não se afirma que testes tenham passado.

## Ordem recomendada para corrigir e verificar

1. **Investigar e reduzir os arranques repetidos do backend.** Correlacionar criação/encerramento de instâncias com pedidos e confirmar a política efetiva deste deployment. Avaliar a preparação do Spring e a adequação de manter este backend disponível continuamente. Esta é a maior oportunidade observada; remover apenas um pedido HTTP não elimina um arranque Java de 25 s.
2. **Partilhar a leitura do estabelecimento** entre layout e página, com invalidação após alterações e mudança de sessão. Manter a proteção CSRF e avaliar reutilização válida do token sem criar falhas de sessão.
3. **Limitar os dados ao que a página precisa.** Intervalo de datas na agenda, histórico paginado e consulta limitada para as próximas marcações.
4. **Medir antes de ajustar o pool e SQL.** Registar duração por endpoint, ligações ativas, pedidos à espera e custo das consultas. Confirmar região, capacidade e limites da base usada pelo deployment.
5. **Verificar cada correção com RED → GREEN.** Antes de editar a implementação, executar regressões que falhem pelo comportamento a corrigir; manter os testes e registar a evidência em `docs/REGRESSION_LOG.md`. Usar respostas controladas para duplicação/concorrência e o ambiente `127.0.0.1` com `barberflow_e2e` na porta 5433 para o percurso real de conta, sessão e páginas. Depois executar a suite relacionada, build e integrações relevantes, conforme `AGENTS.md` e `docs/TESTING.md`.

Para comparar resultados, separar sempre: primeiro acesso com nova instância, pedidos subsequentes à mesma instância, recarregamento com sessão válida e navegação entre páginas. Os valores desta amostra são a referência inicial, não uma promessa de tempo após correção.


## Implementação posterior ao diagnóstico

Em 30/10/2026 foram implementadas correções locais para os pontos identificados: remoção dos pedidos duplicados entre layout/página, preparação antecipada do login, cancelamento de respostas obsoletas, filtragem/paginação no PostgreSQL e otimização do arranque do container com layout extraído, CDS e preparação dos componentes antes de receber pedidos. O pool JDBC não foi aumentado sem evidência de saturação.

No teste isolado, a primeira resposta CSRF de um container novo passou de **8,055 s para 2,474 s**, com uma CPU e 2 GiB. Este resultado não substitui uma nova medição do site publicado. O motivo exato de criação e encerramento das instâncias da Vercel continua a depender da plataforma; a aplicação passou a reduzir o custo de cada arranque.

As reproduções RED, correções, comandos e resultados GREEN estão registados em `docs/REGRESSION_LOG.md`, na secção Login e carregamento da agenda. Esta tarefa não publicou alterações em produção.
