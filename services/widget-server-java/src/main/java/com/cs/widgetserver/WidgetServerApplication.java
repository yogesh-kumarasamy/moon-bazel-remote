package com.cs.widgetserver;

import com.cs.widgetserver.common.Constants;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.concurrent.Executors;
import java.util.logging.Logger;

/** Entry point, the Java counterpart of widget-server's server.ts. */
public final class WidgetServerApplication {

  private static final Logger LOG = Logger.getLogger(WidgetServerApplication.class.getName());

  private WidgetServerApplication() {}

  public static void main(String[] args) throws IOException {
    HttpServer server = start(resolvePort());
    LOG.info("Server listening at http://localhost:" + server.getAddress().getPort());
  }

  /** Starts the server on {@code port}; pass 0 for a random free port (tests). */
  public static HttpServer start(int port) throws IOException {
    HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
    server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
    Router.register(server);
    server.start();
    return server;
  }

  // Cloud Run injects PORT; WIDGET_SERVER_PORT mirrors the Node service.
  static int resolvePort() {
    String port = System.getenv("PORT");
    if (port == null || port.isBlank()) {
      port = System.getenv("WIDGET_SERVER_PORT");
    }
    return port == null || port.isBlank() ? Constants.DEFAULT_PORT : Integer.parseInt(port);
  }
}
