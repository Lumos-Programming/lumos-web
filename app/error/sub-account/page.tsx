import ErrorPage, { type ErrorPageConfig } from "@/components/error-page";

const config: ErrorPageConfig = {
  lines: [
    { text: "Hold on!", delay: 0.3 },
    { text: "This one is", delay: 0.6 },
    { text: "your sub account", delay: 0.9 },
  ],
  showLumos: true,
  description:
    "サブアカウントでは\nログインできません\nメインアカウントで\nログインしましょう",
  redirectTo: "/",
  redirectSeconds: 10,
};

export default function SubAccountErrorPage() {
  return <ErrorPage config={config} />;
}
