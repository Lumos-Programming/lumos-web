import { auth } from "@/lib/auth";
import { getMember, isOnboardingComplete } from "@/lib/members";
import { redirect } from "next/navigation";
import OnboardingForm from "@/components/onboarding-form";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/internal/onboarding");

  const params = await searchParams;
  const isDevPreview =
    process.env.NODE_ENV === "development" && params.preview !== undefined;

  const member = await getMember(session.user.id);
  if (member && isOnboardingComplete(member) && !isDevPreview) {
    redirect("/internal");
  }

  return <OnboardingForm />;
}
