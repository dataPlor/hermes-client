export function greet(name: string): string {
  return `Hello, ${name}!`;
}

export function add(a: number, b: number): number {
  return a + b;
}

if (import.meta.main) {
  console.log(greet("Deno"));
  console.log(`2 + 3 = ${add(2, 3)}`);
}
