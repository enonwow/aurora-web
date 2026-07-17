export function normalizePlaceableTextureReference(value: string): string {
  const withoutQuery = value.trim().split(/[?#]/u, 1)[0] ?? "";
  const normalizedPath = withoutQuery.replace(/\\/gu, "/");
  const fileName = normalizedPath.split("/").pop() ?? normalizedPath;
  const extensionIndex = fileName.lastIndexOf(".");
  const basename = extensionIndex > 0 ? fileName.slice(0, extensionIndex) : fileName;
  return basename.trim().toLowerCase();
}
