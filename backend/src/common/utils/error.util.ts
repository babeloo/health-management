/**
 * 错误处理工具函数
 */

/**
 * 从 unknown 类型的错误中提取错误消息
 * @param error 未知类型的错误
 * @returns 错误消息字符串
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '未知错误';
}

/**
 * 从 unknown 类型的错误中提取堆栈跟踪
 * @param error 未知类型的错误
 * @returns 堆栈跟踪字符串或 undefined
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}

/**
 * 检查是否为 Error 实例
 * @param error 未知类型的错误
 * @returns 是否为 Error 实例
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}
