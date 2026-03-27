export interface ApiMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  statusCode: number;
  message: string;
  data?: T | null;
  meta?: ApiMeta;
  errorCode?: string;
  errors?: { field: string; message: string }[] | null;
  stack?: string;
}
