import { isAdmin } from "@/lib/auth";
import { ShieldAlert } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await isAdmin();

  if (!admin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">アクセス拒否</h1>
        <p className="text-muted-foreground">
          このページは管理者のみアクセスできます。
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
