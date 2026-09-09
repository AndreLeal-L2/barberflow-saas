FROM maven:3-eclipse-temurin-21 AS build

WORKDIR /workspace
COPY pom.xml .
RUN --mount=type=cache,id=barberflow-maven,target=/root/.m2 \
    mvn dependency:go-offline

COPY src ./src
RUN --mount=type=cache,id=barberflow-maven,target=/root/.m2 \
    mvn package -DskipTests

FROM eclipse-temurin:21-jre-noble

WORKDIR /app
COPY --from=build /workspace/target/backend-*.jar app.jar

EXPOSE 8080
USER 10001:10001
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
