package com.cs.widgetserver;

import com.cs.widgetserver.common.Constants;
import com.cs.widgetserver.common.Utils;
import com.cs.widgetserver.controller.ClientController;
import com.cs.widgetserver.services.ProjectService;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.InputStream;

/** Route table, the Java counterpart of widget-server's src/router.ts. */
public final class Router {

  private Router() {}

  public static void register(HttpServer server) {
    ClientController clientController =
        new ClientController(new ProjectService(), Utils.env("WIDGET_ASSET_BASE_URL", ""));

    server.createContext("/api/client/get/script/", clientController::loadClientScript);
    server.createContext("/client/get/script/", clientController::loadClientScript);
    server.createContext(
        "/health", exchange -> Utils.send(exchange, 200, Constants.CONTENT_TYPE_TEXT, "ok"));
    server.createContext("/", Router::servePage);
  }

  // Static demo pages bundled into the jar under /pages (src/main/resources/pages).
  private static void servePage(HttpExchange exchange) throws IOException {
    String path = exchange.getRequestURI().getPath();
    String name = path.equals("/") ? "home.html" : path.substring(1);
    if (name.contains("..") || !name.endsWith(".html")) {
      Utils.send(exchange, 404, Constants.CONTENT_TYPE_TEXT, "Not found");
      return;
    }
    try (InputStream page = Router.class.getResourceAsStream("/pages/" + name)) {
      if (page == null) {
        Utils.send(exchange, 404, Constants.CONTENT_TYPE_TEXT, "Not found");
        return;
      }
      Utils.send(exchange, 200, Constants.CONTENT_TYPE_HTML, page.readAllBytes());
    }
  }
}
