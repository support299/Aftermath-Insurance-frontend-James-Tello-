import { useCallback, useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  fetchManagerRedemptions,
  reviewManagerRedemption,
} from "@/lib/gamification-manager";
import type { AdminRedemption } from "@/lib/gamification-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export function ManagerRedemptionsPanel() {
  const { session } = useAuth();
  const [rows, setRows] = useState<AdminRedemption[]>([]);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchManagerRedemptions(filter, session?.access_token));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load redemptions");
    } finally {
      setLoading(false);
    }
  }, [filter, session?.access_token]);

  useEffect(() => { load(); }, [load]);

  const review = async (id: string, status: AdminRedemption["status"]) => {
    setActing(id);
    try {
      await reviewManagerRedemption(id, status, notes[id] ?? "", session?.access_token);
      toast.success(`Redemption ${status}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActing(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Team reward redemptions
        </CardTitle>
        <CardDescription>
          Approve or reject redemptions for team rewards you manage. Rejected requests refund points.
          Company-wide rewards are handled by admins.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={filter} onValueChange={(v) => setFilter(v as "pending" | "all")}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending only</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
          </SelectContent>
        </Select>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No team redemptions in this view.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Reward</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="text-sm font-medium">{r.agent_name || r.agent_email || r.agent_id}</div>
                    <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                    {r.team_name && (
                      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {r.team_name}
                      </div>
                    )}
                    {r.agent_note && (
                      <div className="mt-1 text-xs italic text-muted-foreground">"{r.agent_note}"</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="mr-1">{r.reward_icon}</span>
                    {r.reward_name}
                  </TableCell>
                  <TableCell>{r.points_cost.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "pending" ? "secondary" : "default"}>{r.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {r.status === "pending" ? (
                      <Input
                        placeholder="Note (optional)"
                        value={notes[r.id] ?? ""}
                        onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">{r.admin_note || "—"}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "pending" && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" disabled={acting === r.id} onClick={() => review(r.id, "rejected")}>
                          Reject
                        </Button>
                        <Button size="sm" disabled={acting === r.id} onClick={() => review(r.id, "approved")}>
                          Approve
                        </Button>
                      </div>
                    )}
                    {r.status === "approved" && (
                      <Button size="sm" variant="secondary" disabled={acting === r.id} onClick={() => review(r.id, "fulfilled")}>
                        Mark fulfilled
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
