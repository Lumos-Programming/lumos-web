/**
 * Auth.js のログインエラー画面（pages.error）に出す文言（#210）。
 * Auth.js は失敗の種類を ?error=<コード> で渡してくる。
 * https://authjs.dev/guides/pages/error
 */

export type LoginErrorView = {
  description: string;
};

const LOGIN_ERROR_VIEWS: Record<string, LoginErrorView> = {
  // サーバー側の設定や、PKCE・state の検証失敗（ログイン途中でタブを開き直した等）
  Configuration: {
    description:
      "ログインの途中で問題が起きました\nもう一度ログインしてください\n繰り返す場合は運営に連絡してください",
  },
  // signIn コールバックが false を返した（Discord のサーバー情報を取得できなかった等）
  AccessDenied: {
    description:
      "ログインが許可されませんでした\nLumos の Discord サーバーに\n参加しているアカウントか確認してください",
  },
};

const DEFAULT_LOGIN_ERROR_VIEW: LoginErrorView = {
  description:
    "ログインに失敗しました\nもう一度ログインしてください\n繰り返す場合は運営に連絡してください",
};

/** エラーコードから表示内容を決める。未知のコードやコードなしは汎用の文言にする */
export function loginErrorView(
  code: string | string[] | undefined,
): LoginErrorView {
  const key = Array.isArray(code) ? code[0] : code;
  if (key && Object.hasOwn(LOGIN_ERROR_VIEWS, key))
    return LOGIN_ERROR_VIEWS[key];
  return DEFAULT_LOGIN_ERROR_VIEW;
}
