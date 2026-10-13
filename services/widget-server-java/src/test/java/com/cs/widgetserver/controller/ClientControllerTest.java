package com.cs.widgetserver.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.cs.widgetserver.WidgetServerApplication;
import com.sun.net.httpserver.HttpServer;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class ClientControllerTest {

  private static HttpServer server;
  private static final HttpClient CLIENT = HttpClient.newHttpClient();

  @BeforeAll
  static void startServer() throws Exception {
    server = WidgetServerApplication.start(0);
  }

  @AfterAll
  static void stopServer() {
    server.stop(0);
  }

  private static HttpResponse<String> get(String path) throws Exception {
    URI uri = URI.create("http://localhost:" + server.getAddress().getPort() + path);
    return CLIENT.send(HttpRequest.newBuilder(uri).build(), HttpResponse.BodyHandlers.ofString());
  }

  @Test
  void servesLoaderScriptForKnownProject() throws Exception {
    HttpResponse<String> response = get("/api/client/get/script/demo");
    assertEquals(200, response.statusCode());
    assertTrue(response.headers().firstValue("Content-Type").orElseThrow().startsWith("application/javascript"));
    assertTrue(response.body().contains("projectId: \"demo\""));
  }

  @Test
  void legacyPathServesSameScript() throws Exception {
    assertEquals(200, get("/client/get/script/acme").statusCode());
  }

  @Test
  void unknownProjectReturns404() throws Exception {
    HttpResponse<String> response = get("/api/client/get/script/nope");
    assertEquals(404, response.statusCode());
    assertTrue(response.body().contains("unknown project nope"));
  }

  @Test
  void servesHomePage() throws Exception {
    HttpResponse<String> response = get("/");
    assertEquals(200, response.statusCode());
    assertTrue(response.body().contains("Widget Server (Java)"));
  }
}
