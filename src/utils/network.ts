export type CapturedJsonResponse = {
  url: string;
  status: number;
  contentType: string;
  body: unknown;
  section?: string;
};

export function isJsonContentType(contentType: string | undefined): boolean {
  return !!contentType && contentType.toLowerCase().includes('application/json');
}

export function collectKeys(value: unknown, out: Set<string>, prefix = '') {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectKeys(item, out, prefix);
    }
    return;
  }

  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      out.add(fullKey);
      collectKeys(child, out, fullKey);
    }
  }
}

export function findObjectArrays(value: unknown): Record<string, unknown>[][] {
  const results: Record<string, unknown>[][] = [];

  function walk(node: unknown) {
    if (Array.isArray(node)) {
      if (
        node.length > 0 &&
        node.every((item) => item && typeof item === 'object' && !Array.isArray(item))
      ) {
        results.push(node as Record<string, unknown>[]);
      }

      for (const item of node) {
        walk(item);
      }
      return;
    }

    if (node && typeof node === 'object') {
      for (const child of Object.values(node)) {
        walk(child);
      }
    }
  }

  walk(value);
  return results;
}

export function looksLikeUsefulContentRecord(item: Record<string, unknown>): boolean {
  const title = item.title ?? item.name ?? item.headline;
  const body = item.body ?? item.content ?? item.description ?? item.html;
  const slug = item.slug ?? item.path ?? item.url;

  return Boolean(title || body || slug);
}
