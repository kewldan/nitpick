import { getLocale, t } from '../i18n/index.ts';
import type {
  Comment,
  PublishResult,
  Review,
  ReviewInput,
  ReviewStatus,
} from '../../shared/types.ts';

export class ApiError extends Error {
  status: number;
  expired: boolean;
  constructor(status: number, message: string, expired = false) {
    super(message);
    this.status = status;
    this.expired = expired;
  }
}

async function call<T>(
  method: string,
  path: string,
  body?: unknown,
  key?: string,
): Promise<T> {
  const headers: Record<string, string> = { 'X-Lang': getLocale() };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (key) headers['X-Edit-Key'] = key;
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, t().common.noConnection);
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    expired?: boolean;
  };
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data.error ?? t().common.requestFailed(res.status),
      !!data.expired,
    );
  }
  return data as T;
}

export const api = {
  publish: (input: ReviewInput) =>
    call<PublishResult>('POST', '/api/reviews', input),
  get: (id: string) => call<Review>('GET', `/api/reviews/${id}`),
  checkKey: (id: string, key: string) =>
    call<{ ok: true }>('GET', `/api/reviews/${id}/access`, undefined, key),
  update: (id: string, key: string, input: ReviewInput) =>
    call<Review>('PUT', `/api/reviews/${id}`, input, key),
  remove: (id: string, key: string) =>
    call<void>('DELETE', `/api/reviews/${id}`, undefined, key),
  resolve: (id: string, cid: string, resolved: boolean, key?: string) =>
    call<Comment>(
      'POST',
      `/api/reviews/${id}/comments/${cid}/resolve`,
      { resolved },
      key,
    ),
  reply: (id: string, cid: string, text: string, key?: string) =>
    call<Comment>(
      'POST',
      `/api/reviews/${id}/comments/${cid}/replies`,
      { text },
      key,
    ),
  status: (ids: string[]) =>
    call<ReviewStatus[]>('POST', '/api/reviews/status', { ids }),
};
