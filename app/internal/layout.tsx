import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // 退会済みユーザーはポータルへのアクセスを拒否
  if (session.user.optedOut) {
    redirect("/optout/completed");
  }

  return <div className="internal-area">{children}</div>;
}
