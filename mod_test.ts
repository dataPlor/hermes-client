import { assertEquals } from "@std/assert";
import { add, greet } from "./mod.ts";

Deno.test("greet function", () => {
  assertEquals(greet("World"), "Hello, World!");
  assertEquals(greet("Deno"), "Hello, Deno!");
});

Deno.test("add function", () => {
  assertEquals(add(2, 3), 5);
  assertEquals(add(-1, 1), 0);
  assertEquals(add(0, 0), 0);
});
