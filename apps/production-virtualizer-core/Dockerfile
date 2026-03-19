FROM eclipse-temurin:21-jdk AS builder
WORKDIR /workspace

COPY gradlew gradlew
COPY gradle gradle
COPY build.gradle settings.gradle ./
COPY src src

RUN chmod +x gradlew && ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app

ENV SPRING_PROFILES_ACTIVE=dev
ENV SCADA_DB_URL=jdbc:h2:file:/app/data/scada;MODE=LEGACY;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE

COPY --from=builder /workspace/build/libs/*.jar app.jar

EXPOSE 8902

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
