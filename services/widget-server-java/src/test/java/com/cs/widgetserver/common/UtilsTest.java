package com.cs.widgetserver.common;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class UtilsTest {

  @Test
  void lastPathSegmentReturnsTrailingSegment() {
    assertEquals("abc", Utils.lastPathSegment("/api/client/get/script/abc"));
    assertEquals("abc", Utils.lastPathSegment("/api/client/get/script/abc/"));
    assertEquals("abc", Utils.lastPathSegment("abc"));
  }

  @Test
  void escapeJsNeutralisesQuotesAndScriptTags() {
    assertEquals("a\\\"b\\\\c\\u003c/script>", Utils.escapeJs("a\"b\\c</script>"));
  }
}
