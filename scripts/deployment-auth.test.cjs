const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");

// Read-only release checks. Account and booking writes belong to the isolated E2E suite.
const deployment = new URL(process.env.COMPASSO_DEPLOYMENT_URL);
const publicOrigin = new URL(process.env.COMPASSO_PUBLIC_ORIGIN);
for (const url of [deployment, publicOrigin]) {
  assert.equal(url.protocol, "https:");
  assert.ok(url.hostname.endsWith(".vercel.app"));
  assert.equal(url.username + url.password + url.search + url.hash, "");
  assert.equal(url.pathname, "/");
}

function request(path, extra = []) {
  const output = execFileSync(
    "vercel",
    [
      "curl",
      new URL(path, deployment).href,
      "--",
      "--silent",
      "--show-error",
      "--max-time",
      "50",
      "--header",
      `Origin: ${publicOrigin.origin}`,
      ...extra,
      "--write-out",
      "\n%{http_code}",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const boundary = output.lastIndexOf("\n");
  return {
    body: output.slice(0, boundary),
    status: Number(output.slice(boundary + 1)),
  };
}

test("deployed authentication accepts the canonical public origin and issues CSRF JSON", () => {
  const csrf = request("/api/auth/csrf");
  assert.equal(
    csrf.status,
    200,
    `CSRF returned ${csrf.status}: ${csrf.body.slice(0, 100)}`,
  );
  const data = JSON.parse(csrf.body);
  assert.equal(data.headerName, "X-XSRF-TOKEN");
  assert.equal(data.parameterName, "_csrf");
  assert.equal(typeof data.token, "string");
  assert.ok(data.token.length > 0);
});

test("deployed registration and login allow credentialed POST preflights from the public origin", () => {
  for (const path of ["/api/auth/register", "/api/auth/login"]) {
    const response = request(path, [
      "--request",
      "OPTIONS",
      "--header",
      "Access-Control-Request-Method: POST",
      "--header",
      "Access-Control-Request-Headers: content-type,x-xsrf-token",
      "--include",
    ]);
    assert.equal(
      response.status,
      200,
      `${path} preflight returned ${response.status}`,
    );
    assert.match(
      response.body,
      new RegExp(
        `access-control-allow-origin: ${publicOrigin.origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
        "i",
      ),
    );
    assert.match(response.body, /access-control-allow-credentials: true/i);
  }
});
