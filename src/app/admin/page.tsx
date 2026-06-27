import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { updateUserRole } from "@/lib/actions";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { RetriggerButton } from "./retrigger-button";

export const dynamic = "force-dynamic";

type EnrichStatus = "none" | "pending" | "complete" | "failed";

const STATUS_CONFIG: Record<
  EnrichStatus,
  { label: string; icon: typeof Clock; className: string }
> = {
  none: { label: "Not Started", icon: Clock, className: "text-muted-foreground" },
  pending: { label: "Pending", icon: Loader2, className: "text-yellow-500" },
  complete: { label: "Complete", icon: CheckCircle2, className: "text-green-500" },
  failed: { label: "Failed", icon: XCircle, className: "text-red-500" },
};

export default async function AdminPage() {
  await requireAdmin();

  const items = await prisma.item.findMany({
    select: {
      id: true,
      name: true,
      barcode: true,
      enrichStatus: true,
      marketPrice: true,
      priceSource: true,
      sourceUrl: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ enrichStatus: "asc" }, { updatedAt: "desc" }],
  });
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: [{ role: "asc" }, { email: "asc" }],
  });

  const counts = {
    none: items.filter((i) => i.enrichStatus === "none").length,
    pending: items.filter((i) => i.enrichStatus === "pending").length,
    complete: items.filter((i) => i.enrichStatus === "complete").length,
    failed: items.filter((i) => i.enrichStatus === "failed").length,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Enrichment Admin</h1>
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to catalog
        </Link>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(Object.entries(counts) as [EnrichStatus, number][]).map(([status, count]) => {
          const config = STATUS_CONFIG[status];
          const Icon = config.icon;
          return (
            <div
              key={status}
              className="rounded-xl border border-border bg-card p-4 flex items-center gap-3"
            >
              <Icon className={`w-5 h-5 ${config.className}`} />
              <div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{config.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold">User Access</h2>
          <p className="text-sm text-muted-foreground">
            Assign roles for catalog access and admin tools.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => {
                const updateRoleForUser = updateUserRole.bind(null, user.id);

                return (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{user.name || "Unnamed user"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.role}</td>
                    <td className="px-4 py-3">
                      <form action={updateRoleForUser} className="flex items-center gap-2">
                        <select
                          name="role"
                          defaultValue={user.role}
                          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="admin">admin</option>
                          <option value="editor">editor</option>
                          <option value="viewer">viewer</option>
                          <option value="owner">owner</option>
                        </select>
                        <button
                          type="submit"
                          className="rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-muted"
                        >
                          Save
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No users have signed in yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Items table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Item</th>
                <th className="text-left px-4 py-3 font-medium">Barcode</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Market Price</th>
                <th className="text-left px-4 py-3 font-medium">Source</th>
                <th className="text-left px-4 py-3 font-medium">Updated</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => {
                const config =
                  STATUS_CONFIG[item.enrichStatus as EnrichStatus] ?? STATUS_CONFIG.none;
                const Icon = config.icon;
                return (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/items/${item.id}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {item.barcode || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 ${config.className}`}>
                        <Icon
                          className={`w-3.5 h-3.5 ${item.enrichStatus === "pending" ? "animate-spin" : ""}`}
                        />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.marketPrice != null ? `$${item.marketPrice.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {item.sourceUrl ? (
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary transition-colors underline"
                        >
                          {item.priceSource || "Link"}
                        </a>
                      ) : (
                        item.priceSource || "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {(item.enrichStatus === "failed" || item.enrichStatus === "none") && (
                        <RetriggerButton itemId={item.id} />
                      )}
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No items in catalog yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
