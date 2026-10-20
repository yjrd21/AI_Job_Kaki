// Shorten long text for previews while preserving complete values below the limit.
export const preview = (value: string, limit = 115) =>
  value.length > limit ? `${value.slice(0, limit).trim()}…` : value;

// Convert multiline input into trimmed, nonempty list entries.
export const listFromLines = (text: string) =>
  text
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

// Convert a saved list into the multiline text expected by profile forms.
export const linesFromList = (list?: string[]) => list?.join("\n") || "";
