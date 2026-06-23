import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, Plus, Trash2, Save, Shield, KeyRound, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCompanySettings } from "@/lib/company-settings";
import { REPORTING_TIMEZONE_OPTIONS } from "@/lib/timezone-options";
import { formatSaleDateTime } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { AppRole } from "@/lib/auth";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

interface UserRow {
  id: string;
  display_name: string;
  team_id: string | null;
  role: AppRole;
}
interface TeamRow {
  id: string;
  name: string;
  manager_ids: string[];
}
interface NamedRow {
  id: string;
  name: string;
  active: boolean;
}
interface ProductRow extends NamedRow {
  carrier_id: string | null;
}

function SettingsPage() {
  const { roles, loading: authLoading } = useAuth();
  const isAdmin = roles.includes("admin");

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <KeyRound className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your password.</p>
          </div>
        </div>
        <Tabs defaultValue="password" className="space-y-4">
          <TabsList>
            <TabsTrigger value="password">Password</TabsTrigger>
          </TabsList>
          <TabsContent value="password"><PasswordPanel /></TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage users, teams, carriers, and products.
          </p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex sm:grid-cols-none">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="carriers">Carriers</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="addons">Add-ons</TabsTrigger>
          <TabsTrigger value="lead_sources">Lead Sources</TabsTrigger>
          <TabsTrigger value="targets">Targets</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>

        <TabsContent value="users"><UsersPanel /></TabsContent>
        <TabsContent value="teams"><TeamsPanel /></TabsContent>
        <TabsContent value="carriers"><CarriersPanel /></TabsContent>
        <TabsContent value="products"><ProductsPanel /></TabsContent>
        <TabsContent value="addons"><NamedListPanel table="add_ons" label="Add-on" /></TabsContent>
        <TabsContent value="lead_sources"><NamedListPanel table="lead_sources" label="Lead Source" /></TabsContent>
        <TabsContent value="targets"><TargetsPanel /></TabsContent>
        <TabsContent value="general"><ReportingTimezonePanel /></TabsContent>
        <TabsContent value="password"><PasswordPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Reporting timezone ---------------- */
function ReportingTimezonePanel() {
  const { reportingTimezone, updateReportingTimezone } = useCompanySettings();
  const [selected, setSelected] = useState(reportingTimezone);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected(reportingTimezone);
  }, [reportingTimezone]);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateReportingTimezone(selected);
      toast.success("Reporting timezone updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save timezone");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Reporting timezone
        </CardTitle>
        <CardDescription>
          All sales, dashboards, and leaderboards use this timezone for date boundaries and display.
          Times are stored in UTC and converted for reporting.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSave} className="max-w-md space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reporting_timezone">Company timezone</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger id="reporting_timezone">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {REPORTING_TIMEZONE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Current time: {formatSaleDateTime(new Date())}
          </p>
          <Button type="submit" disabled={saving || selected === reportingTimezone}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save timezone
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/* ---------------- Password ---------------- */
function PasswordPanel() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    if (password === "P!nnacl3Adm!n#W3lln3ss") {
      toast.error("Choose a password different from the default.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ must_change_password: false }).eq("id", user.id);
    }
    setPassword("");
    setConfirm("");
    setSubmitting(false);
    toast.success("Password updated.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>Set a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="max-w-md space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/* ---------------- Users ---------------- */
function UsersPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<UserRow>>>({});
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q && !u.display_name.toLowerCase().includes(q)) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (teamFilter === "none" && u.team_id !== null) return false;
      if (teamFilter !== "all" && teamFilter !== "none" && u.team_id !== teamFilter) return false;
      return true;
    });
  }, [users, search, roleFilter, teamFilter]);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roleRows }, { data: teamData }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, team_id"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("teams").select("id, name").order("name"),
    ]);
    const roleMap = new Map<string, AppRole>();
    (roleRows ?? []).forEach((r) => {
      const cur = roleMap.get(r.user_id);
      const rank = (x: AppRole) => (x === "admin" ? 3 : x === "manager" ? 2 : 1);
      if (!cur || rank(r.role as AppRole) > rank(cur)) roleMap.set(r.user_id, r.role as AppRole);
    });
    setUsers(
      (profiles ?? []).map((p) => ({
        id: p.id,
        display_name: p.display_name,
        team_id: p.team_id,
        role: roleMap.get(p.id) ?? "agent",
      })),
    );
    setTeams((teamData ?? []).map((t) => ({ id: t.id, name: t.name, manager_ids: [] })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setEdit = (id: string, patch: Partial<UserRow>) => {
    setEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } }));
  };

  const [bulkSaving, setBulkSaving] = useState(false);

  const saveOne = async (u: UserRow) => {
    const patch = edits[u.id];
    if (!patch) return;
    const newName = patch.display_name ?? u.display_name;
    const newTeam = patch.team_id !== undefined ? patch.team_id : u.team_id;
    const newRole = patch.role ?? u.role;

    const { error: pErr } = await supabase
      .from("profiles")
      .update({ display_name: newName, team_id: newTeam })
      .eq("id", u.id);
    if (pErr) throw pErr;

    if (newRole !== u.role) {
      await supabase.from("user_roles").delete().eq("user_id", u.id);
      const { error: rErr } = await supabase
        .from("user_roles")
        .insert({ user_id: u.id, role: newRole });
      if (rErr) throw rErr;
    }
  };

  const save = async (u: UserRow) => {
    if (!edits[u.id]) return;
    setSavingId(u.id);
    try {
      await saveOne(u);
      toast.success("User updated");
      setEdits((e) => { const c = { ...e }; delete c[u.id]; return c; });
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingId(null);
    }
  };

  const saveAll = async () => {
    const dirtyUsers = users.filter((u) => edits[u.id]);
    if (dirtyUsers.length === 0) return;
    setBulkSaving(true);
    const results = await Promise.allSettled(dirtyUsers.map((u) => saveOne(u)));
    const failed = results.filter((r) => r.status === "rejected");
    const succeededIds = dirtyUsers
      .filter((_, i) => results[i].status === "fulfilled")
      .map((u) => u.id);
    if (succeededIds.length > 0) {
      setEdits((e) => {
        const c = { ...e };
        succeededIds.forEach((id) => delete c[id]);
        return c;
      });
    }
    setBulkSaving(false);
    if (failed.length === 0) {
      toast.success(`Updated ${succeededIds.length} user${succeededIds.length === 1 ? "" : "s"}`);
    } else {
      toast.error(
        `${succeededIds.length} updated, ${failed.length} failed: ${(failed[0] as PromiseRejectedResult).reason?.message ?? "error"}`,
      );
    }
    load();
  };

  const dirtyCount = Object.keys(edits).length;

  const removeUser = async (u: UserRow) => {
    const { error } = await supabase.from("profiles").delete().eq("id", u.id);
    if (error) return toast.error(error.message);
    toast.success("User profile removed");
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Users</CardTitle>
          <CardDescription>Edit display names, assign teams, and change roles.</CardDescription>
        </div>
        <Button
          size="sm"
          onClick={saveAll}
          disabled={dirtyCount === 0 || bulkSaving}
        >
          {bulkSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save all{dirtyCount > 0 ? ` (${dirtyCount})` : ""}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
            className="max-w-xs"
          />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="agent">agent</SelectItem>
              <SelectItem value="manager">manager</SelectItem>
              <SelectItem value="admin">admin</SelectItem>
            </SelectContent>
          </Select>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Team" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              <SelectItem value="none">— No team —</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(search || roleFilter !== "all" || teamFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(""); setRoleFilter("all"); setTeamFilter("all"); }}
            >
              Clear
            </Button>
          )}
          <div className="ml-auto text-sm text-muted-foreground self-center">
            {filteredUsers.length} of {users.length}
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-[180px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => {
                  const e = edits[u.id] ?? {};
                  const dirty = Object.keys(e).length > 0;
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <Input
                          value={e.display_name ?? u.display_name}
                          onChange={(ev) => setEdit(u.id, { display_name: ev.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={(e.team_id !== undefined ? e.team_id : u.team_id) ?? "none"}
                          onValueChange={(v) => setEdit(u.id, { team_id: v === "none" ? null : v })}
                        >
                          <SelectTrigger className="min-w-[160px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— None —</SelectItem>
                            {teams.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={e.role ?? u.role}
                          onValueChange={(v) => setEdit(u.id, { role: v as AppRole })}
                        >
                          <SelectTrigger className="min-w-[130px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="agent">agent</SelectItem>
                            <SelectItem value="manager">manager</SelectItem>
                            <SelectItem value="admin">admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant={dirty ? "default" : "secondary"}
                          disabled={!dirty || savingId === u.id}
                          onClick={() => save(u)}
                        >
                          {savingId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Save
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove user profile?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This removes the profile and roles. The auth account is not deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => removeUser(u)}>Remove</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Teams ---------------- */
function TeamsPanel() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [users, setUsers] = useState<{ id: string; display_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data: p }, { data: tm }] = await Promise.all([
      supabase.from("teams").select("id, name").order("name"),
      supabase.from("profiles").select("id, display_name").order("display_name"),
      supabase.from("team_managers").select("team_id, user_id"),
    ]);
    const managersByTeam = new Map<string, string[]>();
    (tm ?? []).forEach((row) => {
      const arr = managersByTeam.get(row.team_id) ?? [];
      arr.push(row.user_id);
      managersByTeam.set(row.team_id, arr);
    });
    setTeams((t ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      manager_ids: managersByTeam.get(row.id) ?? [],
    })));
    setUsers(p ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addTeam = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const { error } = await supabase.from("teams").insert({ name: newName.trim() });
    setAdding(false);
    if (error) return toast.error(error.message);
    setNewName("");
    toast.success("Team created");
    load();
  };

  const setManagers = async (teamId: string, managerIds: string[]) => {
    const { error: delErr } = await supabase.from("team_managers").delete().eq("team_id", teamId);
    if (delErr) return toast.error(delErr.message);
    if (managerIds.length > 0) {
      const rows = managerIds.map((uid) => ({ team_id: teamId, user_id: uid }));
      const { error: insErr } = await supabase.from("team_managers").insert(rows);
      if (insErr) return toast.error(insErr.message);
    }
    // Keep legacy single manager_id roughly in sync (first selected, or null)
    await supabase.from("teams").update({ manager_id: managerIds[0] ?? null }).eq("id", teamId);
    toast.success("Managers updated");
    load();
  };

  const renameTeam = async (teamId: string, name: string) => {
    const { error } = await supabase.from("teams").update({ name }).eq("id", teamId);
    if (error) return toast.error(error.message);
    toast.success("Team renamed");
    load();
  };

  const deleteTeam = async (teamId: string) => {
    const { error } = await supabase.from("teams").delete().eq("id", teamId);
    if (error) return toast.error(error.message);
    toast.success("Team deleted");
    load();
  };

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u.display_name])), [users]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Teams</CardTitle>
        <CardDescription>Create teams and assign one or more managers.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="New team name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Button onClick={addTeam} disabled={adding || !newName.trim()}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Managers</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((t) => (
                <TeamRowEditor
                  key={t.id}
                  team={t}
                  users={users}
                  userMap={userMap}
                  onRename={(n) => renameTeam(t.id, n)}
                  onSetManagers={(m) => setManagers(t.id, m)}
                  onDelete={() => deleteTeam(t.id)}
                />
              ))}
              {teams.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No teams yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function TeamRowEditor({
  team, users, userMap, onRename, onSetManagers, onDelete,
}: {
  team: TeamRow;
  users: { id: string; display_name: string }[];
  userMap: Map<string, string>;
  onRename: (name: string) => void;
  onSetManagers: (managerIds: string[]) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(team.name);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(team.manager_ids);
  const dirty = name !== team.name;

  useEffect(() => { setDraft(team.manager_ids); }, [team.manager_ids]);

  const toggle = (uid: string) => {
    setDraft((d) => d.includes(uid) ? d.filter((x) => x !== uid) : [...d, uid]);
  };

  const summary = team.manager_ids.length === 0
    ? "— None —"
    : team.manager_ids.map((id) => userMap.get(id) ?? "Unknown").join(", ");

  return (
    <TableRow>
      <TableCell>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          {dirty && <Button size="sm" onClick={() => onRename(name)}><Save className="h-4 w-4" /></Button>}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1">
            {team.manager_ids.length === 0 && (
              <span className="text-xs text-muted-foreground">No managers assigned</span>
            )}
            {team.manager_ids.map((id) => (
              <Badge key={id} variant="secondary">{userMap.get(id) ?? "Unknown"}</Badge>
            ))}
          </div>
          {!open ? (
            <Button size="sm" variant="outline" onClick={() => { setDraft(team.manager_ids); setOpen(true); }}>
              Edit managers
            </Button>
          ) : (
            <div className="rounded-md border border-border p-2 space-y-2">
              <div className="max-h-48 overflow-y-auto space-y-1">
                {users.map((u) => {
                  const checked = draft.includes(u.id);
                  return (
                    <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer rounded px-2 py-1 hover:bg-muted/50">
                      <Checkbox checked={checked} onCheckedChange={() => toggle(u.id)} />
                      <span>{u.display_name}</span>
                    </label>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={() => { onSetManagers(draft); setOpen(false); }}>
                  <Save className="h-4 w-4" /> Save
                </Button>
              </div>
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete team?</AlertDialogTitle>
              <AlertDialogDescription>Members will be unassigned from this team.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

/* ---------------- Carriers / Products ---------------- */
function NamedListPanel({ table, label }: { table: "carriers" | "products" | "add_ons" | "lead_sources"; label: string }) {
  const [rows, setRows] = useState<NamedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from(table).select("id, name, active").order("name");
    setRows((data ?? []) as NamedRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [table]);

  const add = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const { error } = await supabase.from(table).insert({ name: newName.trim() });
    setAdding(false);
    if (error) return toast.error(error.message);
    setNewName("");
    toast.success(`${label} added`);
    load();
  };

  const toggle = async (row: NamedRow) => {
    const { error } = await supabase.from(table).update({ active: !row.active }).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  const rename = async (id: string, name: string) => {
    const { error } = await supabase.from(table).update({ name }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Renamed");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`${label} removed`);
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}s</CardTitle>
        <CardDescription>Manage available {label.toLowerCase()}s for sales entry.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder={`New ${label.toLowerCase()} name`} value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Button onClick={add} disabled={adding || !newName.trim()}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[120px]">Active</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <NamedRowEditor key={r.id} row={r} onRename={(n) => rename(r.id, n)} onToggle={() => toggle(r)} onDelete={() => remove(r.id)} />
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">None yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function NamedRowEditor({
  row, onRename, onToggle, onDelete,
}: {
  row: NamedRow;
  onRename: (name: string) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(row.name);
  const dirty = name !== row.name;
  return (
    <TableRow>
      <TableCell>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          {dirty && <Button size="sm" onClick={() => onRename(name)}><Save className="h-4 w-4" /></Button>}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch checked={row.active} onCheckedChange={onToggle} />
          <Badge variant={row.active ? "default" : "secondary"}>{row.active ? "Active" : "Inactive"}</Badge>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

/* ---------------- Products (carrier-scoped) ---------------- */
function ProductsPanel() {
  const [carriers, setCarriers] = useState<NamedRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCarrier, setSelectedCarrier] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from("carriers").select("id, name, active").order("name"),
      supabase.from("products").select("id, name, active, carrier_id").order("name"),
    ]);
    setCarriers((c ?? []) as NamedRow[]);
    setProducts((p ?? []) as ProductRow[]);
    if (!selectedCarrier && c && c.length > 0) setSelectedCarrier(c[0].id);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const visible = useMemo(
    () => products.filter((p) => p.carrier_id === selectedCarrier),
    [products, selectedCarrier],
  );
  const carrierMap = useMemo(() => new Map(carriers.map((c) => [c.id, c.name])), [carriers]);

  const add = async () => {
    if (!newName.trim() || !selectedCarrier) return;
    setAdding(true);
    const { error } = await supabase
      .from("products")
      .insert({ name: newName.trim(), carrier_id: selectedCarrier });
    setAdding(false);
    if (error) return toast.error(error.message);
    setNewName("");
    toast.success("Product added");
    load();
  };

  const toggle = async (row: ProductRow) => {
    const { error } = await supabase.from("products").update({ active: !row.active }).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };
  const rename = async (id: string, name: string) => {
    const { error } = await supabase.from("products").update({ name }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Renamed");
    load();
  };
  const reassign = async (id: string, carrier_id: string) => {
    const { error } = await supabase.from("products").update({ carrier_id }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Carrier updated");
    load();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Product removed");
    load();
  };

  const orphans = products.filter((p) => !p.carrier_id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Products</CardTitle>
        <CardDescription>Products are scoped to a carrier. Pick a carrier to manage its products.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[220px]">
            <div className="mb-1 text-xs text-muted-foreground">Carrier</div>
            <Select value={selectedCarrier} onValueChange={setSelectedCarrier}>
              <SelectTrigger><SelectValue placeholder="Select carrier" /></SelectTrigger>
              <SelectContent>
                {carriers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder="New product name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 min-w-[200px]"
          />
          <Button onClick={add} disabled={adding || !newName.trim() || !selectedCarrier}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>

        {orphans.length > 0 && (
          <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
            <div className="font-medium mb-2">{orphans.length} product(s) have no carrier assigned:</div>
            <div className="space-y-2">
              {orphans.map((o) => (
                <div key={o.id} className="flex items-center gap-2">
                  <span className="flex-1">{o.name}</span>
                  <Select onValueChange={(v) => reassign(o.id, v)}>
                    <SelectTrigger className="w-[200px]"><SelectValue placeholder="Assign carrier" /></SelectTrigger>
                    <SelectContent>
                      {carriers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[180px]">Carrier</TableHead>
                <TableHead className="w-[120px]">Active</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((r) => (
                <ProductRowEditor
                  key={r.id}
                  row={r}
                  carriers={carriers}
                  carrierMap={carrierMap}
                  onRename={(n) => rename(r.id, n)}
                  onReassign={(cid) => reassign(r.id, cid)}
                  onToggle={() => toggle(r)}
                  onDelete={() => remove(r.id)}
                />
              ))}
              {visible.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No products for this carrier</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ProductRowEditor({
  row, carriers, carrierMap, onRename, onReassign, onToggle, onDelete,
}: {
  row: ProductRow;
  carriers: NamedRow[];
  carrierMap: Map<string, string>;
  onRename: (name: string) => void;
  onReassign: (carrierId: string) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(row.name);
  const dirty = name !== row.name;
  return (
    <TableRow>
      <TableCell>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          {dirty && <Button size="sm" onClick={() => onRename(name)}><Save className="h-4 w-4" /></Button>}
        </div>
      </TableCell>
      <TableCell>
        <Select value={row.carrier_id ?? ""} onValueChange={onReassign}>
          <SelectTrigger><SelectValue>{row.carrier_id ? carrierMap.get(row.carrier_id) : "—"}</SelectValue></SelectTrigger>
          <SelectContent>
            {carriers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch checked={row.active} onCheckedChange={onToggle} />
          <Badge variant={row.active ? "default" : "secondary"}>{row.active ? "Active" : "Inactive"}</Badge>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

/* ---------------- Carriers (with type) ---------------- */
type CarrierType = "health" | "life";
interface CarrierRow extends NamedRow {
  carrier_type: CarrierType;
}

function CarriersPanel() {
  const [rows, setRows] = useState<CarrierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<CarrierType>("health");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("carriers")
      .select("id, name, active, carrier_type")
      .order("name");
    setRows((data ?? []) as CarrierRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const { error } = await supabase
      .from("carriers")
      .insert({ name: newName.trim(), carrier_type: newType });
    setAdding(false);
    if (error) return toast.error(error.message);
    setNewName("");
    toast.success("Carrier added");
    load();
  };

  const toggle = async (row: CarrierRow) => {
    const { error } = await supabase.from("carriers").update({ active: !row.active }).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };
  const rename = async (id: string, name: string) => {
    const { error } = await supabase.from("carriers").update({ name }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Renamed");
    load();
  };
  const setType = async (id: string, carrier_type: CarrierType) => {
    const { error } = await supabase.from("carriers").update({ carrier_type }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Type updated");
    load();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("carriers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Carrier removed");
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Carriers</CardTitle>
        <CardDescription>Manage carriers and their insurance type.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <Input
            placeholder="New carrier name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 min-w-[200px]"
          />
          <div className="min-w-[180px]">
            <Select value={newType} onValueChange={(v) => setNewType(v as CarrierType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="health">Health Insurance</SelectItem>
                <SelectItem value="life">Life Insurance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={add} disabled={adding || !newName.trim()}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[200px]">Type</TableHead>
                <TableHead className="w-[120px]">Active</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <CarrierRowEditor
                  key={r.id}
                  row={r}
                  onRename={(n) => rename(r.id, n)}
                  onSetType={(t) => setType(r.id, t)}
                  onToggle={() => toggle(r)}
                  onDelete={() => remove(r.id)}
                />
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No carriers yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function CarrierRowEditor({
  row, onRename, onSetType, onToggle, onDelete,
}: {
  row: CarrierRow;
  onRename: (name: string) => void;
  onSetType: (t: CarrierType) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(row.name);
  const dirty = name !== row.name;
  return (
    <TableRow>
      <TableCell>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          {dirty && <Button size="sm" onClick={() => onRename(name)}><Save className="h-4 w-4" /></Button>}
        </div>
      </TableCell>
      <TableCell>
        <Select value={row.carrier_type} onValueChange={(v) => onSetType(v as CarrierType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="health">Health Insurance</SelectItem>
            <SelectItem value="life">Life Insurance</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch checked={row.active} onCheckedChange={onToggle} />
          <Badge variant={row.active ? "default" : "secondary"}>{row.active ? "Active" : "Inactive"}</Badge>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

/* ---------------- Targets ---------------- */
interface TargetRow {
  id?: string;
  scope: "company" | "agent";
  agent_id: string | null;
  life_revenue_target: number;
  health_revenue_target: number;
  addon_revenue_target: number;
  life_attach_ratio_target: number;
  health_attach_ratio_target: number;
  addon_attach_ratio_target: number;
}

const EMPTY_TARGET: Omit<TargetRow, "scope" | "agent_id"> = {
  life_revenue_target: 0,
  health_revenue_target: 0,
  addon_revenue_target: 0,
  life_attach_ratio_target: 0,
  health_attach_ratio_target: 0,
  addon_attach_ratio_target: 0,
};

function TargetsPanel() {
  const [agents, setAgents] = useState<{ id: string; display_name: string }[]>([]);
  const [company, setCompany] = useState<TargetRow>({ scope: "company", agent_id: null, ...EMPTY_TARGET });
  const [agentTargets, setAgentTargets] = useState<Record<string, TargetRow>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: targets }] = await Promise.all([
      supabase.from("profiles").select("id, display_name").order("display_name"),
      supabase.from("targets").select("*"),
    ]);
    setAgents(profiles ?? []);
    const comp = (targets ?? []).find((t: any) => t.scope === "company");
    if (comp) setCompany(comp as TargetRow);
    else setCompany({ scope: "company", agent_id: null, ...EMPTY_TARGET });
    const map: Record<string, TargetRow> = {};
    (targets ?? []).forEach((t: any) => {
      if (t.scope === "agent" && t.agent_id) map[t.agent_id] = t as TargetRow;
    });
    setAgentTargets(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveCompany = async () => {
    setSavingKey("company");
    const payload = {
      scope: "company" as const,
      agent_id: null,
      life_revenue_target: Number(company.life_revenue_target) || 0,
      health_revenue_target: Number(company.health_revenue_target) || 0,
      addon_revenue_target: Number(company.addon_revenue_target) || 0,
      life_attach_ratio_target: Number(company.life_attach_ratio_target) || 0,
      health_attach_ratio_target: Number(company.health_attach_ratio_target) || 0,
      addon_attach_ratio_target: Number(company.addon_attach_ratio_target) || 0,
    };
    const { error } = company.id
      ? await supabase.from("targets").update(payload).eq("id", company.id)
      : await supabase.from("targets").insert(payload);
    setSavingKey(null);
    if (error) return toast.error(error.message);
    toast.success("Company targets saved");
    load();
  };

  const getAgentDraft = (agentId: string): TargetRow =>
    agentTargets[agentId] ?? { scope: "agent", agent_id: agentId, ...EMPTY_TARGET };

  const updateAgentDraft = (agentId: string, patch: Partial<TargetRow>) => {
    setAgentTargets((prev) => ({
      ...prev,
      [agentId]: { ...getAgentDraft(agentId), ...patch },
    }));
  };

  const saveAgent = async (agentId: string) => {
    const draft = getAgentDraft(agentId);
    setSavingKey(agentId);
    const payload = {
      scope: "agent" as const,
      agent_id: agentId,
      life_revenue_target: Number(draft.life_revenue_target) || 0,
      health_revenue_target: Number(draft.health_revenue_target) || 0,
      addon_revenue_target: Number(draft.addon_revenue_target) || 0,
      life_attach_ratio_target: Number(draft.life_attach_ratio_target) || 0,
      health_attach_ratio_target: Number(draft.health_attach_ratio_target) || 0,
      addon_attach_ratio_target: Number(draft.addon_attach_ratio_target) || 0,
    };
    const { error } = draft.id
      ? await supabase.from("targets").update(payload).eq("id", draft.id)
      : await supabase.from("targets").insert(payload);
    setSavingKey(null);
    if (error) return toast.error(error.message);
    toast.success("Agent targets saved");
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  const selectedDraft = selectedAgent ? getAgentDraft(selectedAgent) : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Targets</CardTitle>
          <CardDescription>Goals applied to the company as a whole.</CardDescription>
        </CardHeader>
        <CardContent>
          <TargetFields
            value={company}
            onChange={(patch) => setCompany((c) => ({ ...c, ...patch }))}
          />
          <div className="mt-4 flex justify-end">
            <Button onClick={saveCompany} disabled={savingKey === "company"}>
              {savingKey === "company" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save company targets
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agent Targets</CardTitle>
          <CardDescription>Override goals for a specific agent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Agent</Label>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="max-w-md"><SelectValue placeholder="Select an agent" /></SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.display_name}{agentTargets[a.id] ? " ✓" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAgent && selectedDraft && (
            <>
              <TargetFields
                value={selectedDraft}
                onChange={(patch) => updateAgentDraft(selectedAgent, patch)}
              />
              <div className="flex justify-end">
                <Button onClick={() => saveAgent(selectedAgent)} disabled={savingKey === selectedAgent}>
                  {savingKey === selectedAgent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save agent targets
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TargetFields({
  value, onChange,
}: {
  value: TargetRow;
  onChange: (patch: Partial<TargetRow>) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <Label>Life Insurance revenue ($)</Label>
        <Input
          type="number" min={0} step="0.01"
          value={value.life_revenue_target}
          onChange={(e) => onChange({ life_revenue_target: Number(e.target.value) })}
        />
      </div>
      <div>
        <Label>Health Insurance revenue ($)</Label>
        <Input
          type="number" min={0} step="0.01"
          value={value.health_revenue_target}
          onChange={(e) => onChange({ health_revenue_target: Number(e.target.value) })}
        />
      </div>
      <div>
        <Label>Add-on revenue ($)</Label>
        <Input
          type="number" min={0} step="0.01"
          value={value.addon_revenue_target}
          onChange={(e) => onChange({ addon_revenue_target: Number(e.target.value) })}
        />
      </div>
      <div>
        <Label>Life attach ratio (%)</Label>
        <Input
          type="number" min={0} max={100} step="0.1"
          value={value.life_attach_ratio_target}
          onChange={(e) => onChange({ life_attach_ratio_target: Number(e.target.value) })}
        />
      </div>
      <div>
        <Label>Health attach ratio (%)</Label>
        <Input
          type="number" min={0} max={100} step="0.1"
          value={value.health_attach_ratio_target}
          onChange={(e) => onChange({ health_attach_ratio_target: Number(e.target.value) })}
        />
      </div>
      <div>
        <Label>Add-on attach ratio (%)</Label>
        <Input
          type="number" min={0} max={100} step="0.1"
          value={value.addon_attach_ratio_target}
          onChange={(e) => onChange({ addon_attach_ratio_target: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}
