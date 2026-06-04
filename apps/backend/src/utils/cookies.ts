import { Response } from 'express';

// const isProd = process.env.NODE_ENV === 'production';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === "true",
  sameSite: process.env.COOKIE_SAME_SITE as "none" | "lax" | "strict",
  path: "/",
  domain: process.env.NODE_ENV === "production" ? ".siryan.xyz" : undefined,
};
export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string | null,
  rememberMe = false
) => {
  res.cookie("access_token", accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  if (refreshToken) {
    res.cookie("refresh_token", refreshToken, {
      ...cookieOptions,
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
    });
  }
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie("access_token", cookieOptions);
  res.clearCookie("refresh_token", cookieOptions);
};