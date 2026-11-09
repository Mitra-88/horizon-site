// Numbers on the benchmarks page, for the server page and its client widgets alike. English keeps
// toFixed's output exactly; other languages swap in their decimal comma.
export function benchNumbers(numberLocale: string) {
  const comma = (1.5).toLocaleString(numberLocale).includes(",");
  return {
    /** A whole number with the language's grouping: 1,234 or 1234. */
    int: (n: number) => Math.round(n).toLocaleString(numberLocale),
    /** One decimal: 1.5 or 1,5. */
    dec: (n: number) => (comma ? n.toFixed(1).replace(".", ",") : n.toFixed(1)),
    /** A number as written in the data, with the language's decimal mark: 12.7 or 12,7. */
    plain: (n: number) => (comma ? String(n).replace(".", ",") : String(n)),
  };
}
