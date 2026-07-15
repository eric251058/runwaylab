import { NextResponse } from "next/server";

type ApiErrorOptions = {
  retryAfter?: number;
};

export function apiError(message: string, status: number, options: ApiErrorOptions = {}) {
  const headers = new Headers();

  if (options.retryAfter && options.retryAfter > 0) {
    headers.set("Retry-After", String(Math.ceil(options.retryAfter)));
  }

  return NextResponse.json({ message }, { status, headers });
}

export function unauthenticated(message = "请先登录后再继续。") {
  return apiError(message, 401);
}

export function forbidden(message = "没有权限进行此操作。") {
  return apiError(message, 403);
}

export function tooManyRequests(message: string, retryAfter: number) {
  return apiError(message, 429, { retryAfter });
}

export function badRequest(message: string) {
  return apiError(message, 400);
}

export function temporaryFailure(message = "操作暂时失败，请稍后再试。") {
  return apiError(message, 500);
}
