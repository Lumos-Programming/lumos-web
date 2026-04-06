import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import OnboardingLogin from "@/components/onboarding-login";

export default async function OnboardingEntryPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/internal/onboarding");
  }

  return <OnboardingLogin />;
}
