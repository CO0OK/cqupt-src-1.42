type ApiErrorLike = {
  success?: boolean;
  code?: string;
  message?: string;
  details?: unknown;
};

const CODE_MESSAGE_MAP: Record<string, string> = {
  UNAUTHORIZED: '登录状态失效，请重新登录',
  FORBIDDEN: '权限不足，无法执行该操作',
  NOT_FOUND: '目标数据不存在或已被删除',
  BAD_REQUEST: '请求参数不合法，请检查后重试',
  CONFLICT: '操作冲突，请刷新后重试',
  INTERNAL_ERROR: '服务暂时不可用，请稍后再试',
};

export function getApiErrorMessage(
  payload: unknown,
  fallback: string,
  status?: number,
): string {
  const data = (payload ?? {}) as ApiErrorLike;
  if (typeof data.message === 'string' && data.message.trim()) {
    return data.message;
  }
  if (typeof data.code === 'string' && CODE_MESSAGE_MAP[data.code]) {
    return CODE_MESSAGE_MAP[data.code];
  }
  if (status === 401) return CODE_MESSAGE_MAP.UNAUTHORIZED;
  if (status === 403) return CODE_MESSAGE_MAP.FORBIDDEN;
  if (status === 404) return CODE_MESSAGE_MAP.NOT_FOUND;
  if (status === 409) return CODE_MESSAGE_MAP.CONFLICT;
  if (status && status >= 500) return CODE_MESSAGE_MAP.INTERNAL_ERROR;
  return fallback;
}
