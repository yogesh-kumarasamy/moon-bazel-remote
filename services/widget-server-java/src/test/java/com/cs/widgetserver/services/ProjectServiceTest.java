package com.cs.widgetserver.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class ProjectServiceTest {

  private final ProjectService service = new ProjectService();

  @Test
  void findsSeededProject() {
    assertEquals("Demo Project", service.findById("demo").orElseThrow().name());
  }

  @Test
  void returnsEmptyForUnknownProject() {
    assertTrue(service.findById("missing").isEmpty());
  }
}
