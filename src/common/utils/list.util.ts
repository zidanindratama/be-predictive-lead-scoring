export type SortDir = 'asc' | 'desc';
export type ListParams = {
  page: number;
  limit: number;
  sortBy?: string;
  sortDir?: SortDir;
  q?: string;
  from?: Date;
  to?: Date;
  [key: string]: any;
};

export function makeSearchWhere(q: string | undefined, fields: string[]) {
  if (!q) return undefined;
  return {
    OR: fields.map((f) => ({
      [f]: { contains: q, mode: 'insensitive' as const },
    })),
  };
}

export function buildDateRange(from?: Date, to?: Date) {
  if (!from && !to) return undefined;
  const range: any = {};
  if (from) range.gte = from;
  if (to) range.lte = to;
  return range;
}

export function resolveSort(
  sortBy: string | undefined,
  sortDir: SortDir,
  allowed: string[],
  fallback: { [k: string]: SortDir },
) {
  if (!sortBy || !allowed.includes(sortBy)) return fallback;
  return { [sortBy]: sortDir } as Record<string, SortDir>;
}

export function paginate(skipPage: number, limit: number) {
  const page = Math.max(1, skipPage || 1);
  const take = Math.max(1, Math.min(100, limit || 20));
  const skip = (page - 1) * take;
  return { page, take, skip };
}

export function meta(total: number, page: number, limit: number) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return { total, page, limit, pages };
}
