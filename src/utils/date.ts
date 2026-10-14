export function formatDate(dateValue: string): string {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(
    new Date(dateValue),
  );
}
