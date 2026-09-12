FROM maven:3-eclipse-temurin-26 AS build

WORKDIR /workspace
COPY pom.xml .
RUN --mount=type=cache,id=barberflow-maven,target=/root/.m2 \
    mvn dependency:go-offline

COPY src ./src
RUN --mount=type=cache,id=barberflow-maven,target=/root/.m2 \
    mvn package -DskipTests

FROM eclipse-temurin:21-jre-noble

WORKDIR /app
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd --gid 10001 barberflow && \
    useradd --uid 10001 --gid barberflow --no-create-home --shell /usr/sbin/nologin barberflow
COPY --chown=10001:10001 --from=build /workspace/target/backend-*.jar app.jar

EXPOSE 8080
USER 10001:10001
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
