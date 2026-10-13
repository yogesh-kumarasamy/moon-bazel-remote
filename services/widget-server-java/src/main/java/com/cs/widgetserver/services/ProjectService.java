package com.cs.widgetserver.services;

import java.util.Map;
import java.util.Optional;

/**
 * Project lookup. widget-server reads projects from Datastore; this demo keeps a fixed in-memory
 * table so the service has no external dependencies.
 */
public class ProjectService {

  public record Project(String id, String name, String themeColor) {}

  private final Map<String, Project> projects;

  public ProjectService() {
    this(
        Map.of(
            "demo", new Project("demo", "Demo Project", "#4f46e5"),
            "acme", new Project("acme", "Acme Support", "#059669")));
  }

  public ProjectService(Map<String, Project> projects) {
    this.projects = Map.copyOf(projects);
  }

  public Optional<Project> findById(String projectId) {
    return Optional.ofNullable(projects.get(projectId));
  }
}
