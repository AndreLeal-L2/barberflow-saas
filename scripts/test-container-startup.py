"""Cold-start budget against only the disposable PostgreSQL database on port 5433.

Build backend/Dockerfile.vercel first, then set COMPASSO_STARTUP_IMAGE to that image.
COMPASSO_STARTUP_JAR optionally tests an existing unoptimized JAR on a Java 21 image.
"""
import json
import http.client
import http.cookies
import os
import subprocess
import time
import unittest
import urllib.error
import urllib.request
import uuid
from urllib.parse import unquote


class ContainerStartupTest(unittest.TestCase):
    def test_first_csrf_response_within_six_seconds(self):
        name = "compasso-startup-test-" + uuid.uuid4().hex[:10]
        command = ["docker", "create", "--name", name, "--cpus=1", "--memory=2g",
                   "--network", "barberflow-e2e_default",
                   "-p", "127.0.0.1::8080"]
        environment = {
            "SPRING_PROFILES_ACTIVE": "prod,vercel", "PORT": "8080",
            "BARBERFLOW_DATABASE_URL": "jdbc:postgresql://database:5432/barberflow_e2e",
            "BARBERFLOW_DATABASE_USERNAME": "barberflow_e2e",
            "BARBERFLOW_DATABASE_PASSWORD": "barberflow_e2e",
            "BARBERFLOW_PUBLIC_BASE_URL": "http://127.0.0.1:4200",
            "BARBERFLOW_ALLOWED_ORIGINS": "http://127.0.0.1:4200",
            "BARBERFLOW_MAIL_DELIVERY": "log", "BARBERFLOW_MAIL_POLL_DELAY": "3600000",
        }
        for key, value in environment.items():
            command += ["-e", key + "=" + value]
        jar = os.environ.get("COMPASSO_STARTUP_JAR")
        if jar:
            command += ["-v", os.path.abspath(jar) + ":/app/app.jar:ro", "--entrypoint", "java"]
        command += [os.environ["COMPASSO_STARTUP_IMAGE"]]
        if jar:
            command += ["-jar", "/app/app.jar"]
        subprocess.run(command, check=True, capture_output=True)
        try:
            start = time.monotonic()
            subprocess.run(["docker", "start", name], check=True, capture_output=True)
            port = json.loads(subprocess.check_output(["docker", "inspect", name]))[0]["NetworkSettings"]["Ports"]["8080/tcp"][0]["HostPort"]
            response = None
            while time.monotonic() - start < 15:
                try:
                    with urllib.request.urlopen("http://127.0.0.1:" + port + "/api/auth/csrf", timeout=1) as result:
                        response = json.load(result)
                    break
                except (urllib.error.URLError, OSError, http.client.HTTPException):
                    time.sleep(0.05)
            elapsed = time.monotonic() - start
            self.assertIsNotNone(response, "The container did not return CSRF JSON")
            self.assertTrue(response.get("token"))
            print("Cold start to first CSRF JSON: %.3f seconds (1 CPU, 2 GiB)" % elapsed)
            self.assertLessEqual(elapsed, 6.0, "First login preparation exceeded the cold-start budget")
            self.verify_authentication("http://127.0.0.1:" + port)
        finally:
            subprocess.run(["docker", "rm", "--force", name], check=True, capture_output=True)

    def verify_authentication(self, base_url):
        cookies = {}

        def request(path, data=None):
            headers = {"Cookie": "; ".join(key + "=" + value for key, value in cookies.items())}
            if data is not None:
                headers.update({"Content-Type": "application/json", "Origin": "http://127.0.0.1:4200",
                                "X-XSRF-TOKEN": unquote(cookies["XSRF-TOKEN"])})
            started = time.monotonic()
            with urllib.request.urlopen(urllib.request.Request(base_url + path,
                    data=json.dumps(data).encode() if data is not None else None,
                    headers=headers), timeout=5) as result:
                body = json.load(result)
                for header in result.headers.get_all("Set-Cookie", []):
                    parsed = http.cookies.SimpleCookie()
                    parsed.load(header)
                    for key, value in parsed.items():
                        if value["max-age"] == "0":
                            cookies.pop(key, None)
                        else:
                            cookies[key] = value.value
                return body, time.monotonic() - started

        request("/api/auth/csrf")
        owner = {"ownerName": "Startup Test", "barbershopName": "Startup " + uuid.uuid4().hex[:8],
                 "email": "startup-" + uuid.uuid4().hex + "@example.test",
                 "phone": "+351 910 000 001", "password": "TesteSeguro2026!"}
        registered, _ = request("/api/auth/register", owner)
        previous_session = cookies["BARBERFLOW_SESSION"]
        request("/api/auth/csrf")
        logged_in, elapsed = request("/api/auth/login", {"email": owner["email"], "password": owner["password"]})
        self.assertEqual(logged_in["id"], registered["id"])
        self.assertNotEqual(cookies["BARBERFLOW_SESSION"], previous_session)
        self.assertLessEqual(elapsed, 2.0, "Password verification and session creation exceeded two seconds")
        current, _ = request("/api/auth/me")
        self.assertEqual(current["id"], registered["id"])
        bookings, _ = request("/api/dashboard/bookings?view=upcoming&page=0&size=5")
        self.assertEqual(bookings, [])
        print("Authenticated login in production container: %.3f seconds" % elapsed)


if __name__ == "__main__":
    unittest.main()
