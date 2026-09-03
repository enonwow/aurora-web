const DEFAULT_NODE_HEAP_LIMIT_MB = 1024;

function buildResourceLimitedEnvironment(
  environment,
  heapLimitMb = DEFAULT_NODE_HEAP_LIMIT_MB,
) {
  if (!Number.isInteger(heapLimitMb) || heapLimitMb < 256) {
    throw new Error(`Invalid Node heap limit: ${heapLimitMb}`);
  }
  const existingOptions = String(environment?.NODE_OPTIONS ?? "")
    .replace(
      /(^|\s)--max[-_]old[-_]space[-_]size(?:=\d+|\s+\d+)(?=\s|$)/gu,
      " ",
    )
    .trim()
    .replace(/\s+/gu, " ");
  return {
    ...environment,
    NODE_OPTIONS: [existingOptions, `--max-old-space-size=${heapLimitMb}`]
      .filter(Boolean)
      .join(" "),
  };
}

module.exports = {
  DEFAULT_NODE_HEAP_LIMIT_MB,
  buildResourceLimitedEnvironment,
};
