import { RoleSyncPanel } from "@/components/admin/role-sync-panel";
import { ShieldCheck } from "lucide-react";

export default function AdminRoleSyncPage() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6" />
        <div>
          <p className="text-sm text-muted-foreground">Lumos 管理ツール</p>
          <h1 className="text-2xl font-bold">Discordロール同期/付与</h1>
        </div>
      </div>
      <RoleSyncPanel />
    </div>
  );
}
