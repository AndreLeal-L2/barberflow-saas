# Repository instructions

## Regression tests are required before every bug fix

This workflow is an explicit user requirement and applies to all future work in this repository.

1. Reproduce the reported behavior with an automated regression test before editing the implementation. An existing failing regression test can be reused.
2. Run that test against the buggy implementation. Confirm an assertion fails for the behavior being fixed; compilation, environment and test-setup errors do not count as a RED result.
3. Record the test name, command and relevant failure in the PR and, for a new regression, in `docs/REGRESSION_LOG.md`.
4. Make the smallest implementation change that fixes the defect.
5. Run the same test unchanged and confirm GREEN. Then run the related suite, frontend build and relevant browser/API integration tests.
6. Keep the regression test permanently. Do not skip/delete it, weaken assertions, add retries or increase timeouts merely to hide a failure.

When Java/Docker or another dependency is unavailable locally, use the isolated CI environment to establish RED before making the implementation fix. Do not claim tests passed when they were only authored or collected.

Choose the lowest layer that reliably demonstrates the defect. Use controlled asynchronous responses to test races. Use real browser/API/database tests for cross-layer account, session, publication and booking journeys; do not replace those dependencies with mocks in the full-flow suite.

## Test isolation and release checks

- Browser tests use only `127.0.0.1`, the dedicated `barberflow_e2e` database on port 5433, and synthetic `example.test` accounts. Never point write tests at the deployed app or reuse production credentials.
- `docs/TESTING.md` documents commands, prerequisites and failure artifacts.
- Keep all backend, frontend and browser regression jobs green before merging or deploying changes.
- A failing test is a defect to investigate, not a reason to bypass CI.
- Preserve unrelated user changes and keep generated reports, screenshots and test credentials out of source commits.
