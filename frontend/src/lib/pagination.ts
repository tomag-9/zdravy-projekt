type ApiFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface PaginatedResponse<T> {
  results?: T[];
  next?: string | null;
}

/** Fetch every page from a DRF list endpoint, while also supporting plain arrays. */
export async function fetchAllPages<T>(apiFetch: ApiFetch, initialUrl: string): Promise<T[]> {
  const items: T[] = [];
  const visited = new Set<string>();
  let url: string | null = initialUrl;

  while (url) {
    if (visited.has(url)) throw new Error(`Pagination cycle detected at ${url}`);
    visited.add(url);

    const response = await apiFetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = (await response.json()) as T[] | PaginatedResponse<T>;
    if (Array.isArray(payload)) {
      items.push(...payload);
      break;
    }

    items.push(...(payload.results ?? []));
    url = payload.next ?? null;
  }

  return items;
}
