package com.cs.widgetserver.common;

import com.sun.net.httpserver.HttpExchange;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public final class Utils {

  private Utils() {}

  public static String env(String name, String fallback) {
    String value = System.getenv(name);
    return value == null || value.isBlank() ? fallback : value;
  }

  /** Last non-empty path segment: "/api/client/get/script/abc" -> "abc". */
  public static String lastPathSegment(String path) {
    String trimmed = path.endsWith("/") ? path.substring(0, path.length() - 1) : path;
    int slash = trimmed.lastIndexOf('/');
    return slash < 0 ? trimmed : trimmed.substring(slash + 1);
  }

  /** Escapes a value for use inside a double-quoted JavaScript string literal. */
  public static String escapeJs(String value) {
    StringBuilder out = new StringBuilder(value.length());
    for (char c : value.toCharArray()) {
      switch (c) {
        case '"' -> out.append("\\\"");
        case '\\' -> out.append("\\\\");
        case '\n' -> out.append("\\n");
        case '\r' -> out.append("\\r");
        case '<' -> out.append("\\u003c");
        default -> out.append(c);
      }
    }
    return out.toString();
  }

  public static void send(HttpExchange exchange, int status, String contentType, String body)
      throws IOException {
    send(exchange, status, contentType, body.getBytes(StandardCharsets.UTF_8));
  }

  public static void send(HttpExchange exchange, int status, String contentType, byte[] body)
      throws IOException {
    exchange.getResponseHeaders().set("Content-Type", contentType);
    exchange.sendResponseHeaders(status, body.length);
    try (OutputStream out = exchange.getResponseBody()) {
      out.write(body);
    }
  }
}
