export function createFileDiff(path: string, original: string, proposed: string) {
  const before = original.split("\n");
  const after = proposed.split("\n");
  let prefix = 0;

  while (
    prefix < before.length &&
    prefix < after.length &&
    before[prefix] === after[prefix]
  ) {
    prefix += 1;
  }

  let suffix = 0;

  while (
    suffix < before.length - prefix &&
    suffix < after.length - prefix &&
    before[before.length - suffix - 1] === after[after.length - suffix - 1]
  ) {
    suffix += 1;
  }

  const beforeChangedEnd = before.length - suffix;
  const afterChangedEnd = after.length - suffix;
  const context = 2;
  const beforeContextStart = Math.max(0, prefix - context);
  const afterContextStart = Math.max(0, prefix - context);
  const beforeContextEnd = Math.min(before.length, beforeChangedEnd + context);
  const afterContextEnd = Math.min(after.length, afterChangedEnd + context);
  const lines = [
    "--- a/" + path,
    "+++ b/" + path,
    "@@ -" +
      (beforeContextStart + 1) +
      "," +
      (beforeContextEnd - beforeContextStart) +
      " +" +
      (afterContextStart + 1) +
      "," +
      (afterContextEnd - afterContextStart) +
      " @@",
  ];

  for (let index = beforeContextStart; index < prefix; index += 1) {
    lines.push(" " + before[index]);
  }

  for (let index = prefix; index < beforeChangedEnd; index += 1) {
    lines.push("-" + before[index]);
  }

  for (let index = prefix; index < afterChangedEnd; index += 1) {
    lines.push("+" + after[index]);
  }

  for (let index = beforeChangedEnd; index < beforeContextEnd; index += 1) {
    lines.push(" " + before[index]);
  }

  return {
    diff: lines.join("\n"),
    additions: Math.max(0, afterChangedEnd - prefix),
    deletions: Math.max(0, beforeChangedEnd - prefix),
  };
}
