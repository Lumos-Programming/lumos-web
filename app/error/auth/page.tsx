import ErrorPage, { type ErrorPageConfig } from "@/components/error-page";

const config: ErrorPageConfig = {
  lines: [
    { text: "Oops!", delay: 0.3 },
    { text: "Looks like", delay: 0.6 },
    { text: "invisible dragons", delay: 0.9 },
    { text: "ain't letting you in", delay: 1.2 },
  ],
  showLumos: true,
  description: "認証したアカウントが\nLumosに存在しているか\n確認しましょう",
  redirectTo: "/",
  redirectSeconds: 10,
};

export default function AuthErrorPage() {
  return <ErrorPage config={config} />;
}
