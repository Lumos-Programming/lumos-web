import ErrorPage, { type ErrorPageConfig } from "@/components/error-page";
import { loginErrorView } from "@/lib/auth-error";

export default async function LoginErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const { error } = await searchParams;
  const config: ErrorPageConfig = {
    lines: [
      { text: "Oops!", delay: 0.3 },
      { text: "The spell", delay: 0.6 },
      { text: "didn't work", delay: 0.9 },
    ],
    description: loginErrorView(error).description,
    action: { label: "もう一度ログインする", href: "/login" },
  };
  return <ErrorPage config={config} />;
}
