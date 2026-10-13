package com.cs.widgetserver.controller;

import com.cs.widgetserver.common.Constants;
import com.cs.widgetserver.common.Utils;
import com.cs.widgetserver.services.ProjectService;
import com.cs.widgetserver.services.ProjectService.Project;
import com.sun.net.httpserver.HttpExchange;
import java.io.IOException;
import java.util.Optional;

/** Serves the widget loader script, like widget-server's ClientController.loadClientScript. */
public class ClientController {

  private final ProjectService projectService;
  private final String assetBaseUrl;

  public ClientController(ProjectService projectService, String assetBaseUrl) {
    this.projectService = projectService;
    this.assetBaseUrl = assetBaseUrl;
  }

  public void loadClientScript(HttpExchange exchange) throws IOException {
    if (!"GET".equals(exchange.getRequestMethod())) {
      Utils.send(exchange, 405, Constants.CONTENT_TYPE_TEXT, "Method not allowed");
      return;
    }
    String projectId = Utils.lastPathSegment(exchange.getRequestURI().getPath());
    Optional<Project> project = projectService.findById(projectId);
    if (project.isEmpty()) {
      Utils.send(
          exchange,
          404,
          Constants.CONTENT_TYPE_JS,
          "console.warn(\"ChatSupport: unknown project " + Utils.escapeJs(projectId) + "\");");
      return;
    }
    exchange.getResponseHeaders().set("Cache-Control", "no-store");
    Utils.send(exchange, 200, Constants.CONTENT_TYPE_JS, renderLoader(project.get()));
  }

  String renderLoader(Project project) {
    return """
        (function () {
          var config = { projectId: "%s", name: "%s", themeColor: "%s" };
          var host = document.createElement("div");
          host.id = "chatsupport-widget-host";
          host.attachShadow({ mode: "open" });
          document.body.appendChild(host);
          var script = document.createElement("script");
          script.src = "%s/widget.js";
          script.onload = function () { window.ChatSupport && window.ChatSupport.init(host, config); };
          document.head.appendChild(script);
        })();
        """
        .formatted(
            Utils.escapeJs(project.id()),
            Utils.escapeJs(project.name()),
            Utils.escapeJs(project.themeColor()),
            Utils.escapeJs(assetBaseUrl));
  }
}
