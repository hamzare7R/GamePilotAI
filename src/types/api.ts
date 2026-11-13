export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type ApiMeta = {
  requestId?: string;
  pagination?: PaginationMeta;
};

export type ApiResponse<T> = {
  data: T;
  meta?: ApiMeta;
};

export type ApiErrorPayload = {
  message: string;
  code?: string;
  details?: unknown;
};

export type ApiResult<T> =
  | { ok: true; data: T; meta?: ApiMeta }
  | { ok: false; error: ApiErrorPayload };

export type Paginated<T> = {
  items: T[];
  pagination: PaginationMeta;
};

export type RequestQuery = Record<string, string | number | boolean | null | undefined>;
