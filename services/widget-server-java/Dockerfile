# Runtime image for widget-server-java.
# The jar is built (or restored from the moon remote cache) before docker runs:
#   moon run widget-server-java:image
# or by hand:
#   moon run widget-server-java:build
#   docker build -t widget-server-java services/widget-server-java
FROM gcr.io/distroless/java25-debian13

WORKDIR /app

COPY build/libs/widget-server-java.jar app.jar

USER nonroot

# Cloud Run sets PORT (default 8080); the server reads PORT.
EXPOSE 8080

# distroless java images use `java` as the entrypoint.
CMD ["app.jar"]
