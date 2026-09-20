# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
COPY src ./src
# La caché del repositorio Maven se reutiliza entre construcciones, así que no hay que volver a
# descargar las dependencias cada vez. Los tests se ejecutan en CI (necesitan Docker para
# Testcontainers), no al construir la imagen.
RUN --mount=type=cache,target=/root/.m2 mvn -B -q clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN apk add --no-cache curl && adduser -D -u 1001 appuser
COPY --from=build /build/target/platform-0.1.0.jar app.jar
RUN mkdir -p /app/data/storage && chown -R appuser:appuser /app
USER appuser

EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=60s --retries=10 \
    CMD curl -fsS http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
