import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Users, Clock, ArrowLeft, Search, Trash2, Shield, Activity, CalendarDays, Eye, Download, Coffee, TrendingUp, CheckSquare, ListTodo } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ShaderBackground } from '@/components/ShaderBackground';

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  role: string;
  entry_count: number;
}

interface AdminStats {
  totalUsers: number;
  totalEntries: number;
  totalWorkHours: number;
  totalBreakHours: number;
  netWorkHours: number;
  activeToday: number;
  activeThisWeek: number;
  avgEntriesPerUser: number;
}

interface UserDetail {
  user: { id: string; email: string; created_at: string; last_sign_in_at: string | null } | null;
  entries: any[];
  tasks: any[];
  stats: {
    totalWorkHours: number;
    totalBreakHours: number;
    netWorkHours: number;
    daysWorked: number;
    avgHoursPerDay: number;
    taskStats: { total: number; todo: number; inProgress: number; done: number };
  };
}

async function adminFetch(action: string, method = 'GET', body?: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const params = new URLSearchParams({ action });
  if (body?.user_id && method === 'GET') params.set('user_id', body.user_id);

  const url = `https://${projectId}.supabase.co/functions/v1/admin-users?${params}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }

  return res.json();
}

// ─── Stat Card ───
function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <Card className="border-none glass rounded-2xl shadow-md">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── User Detail Dialog ───
function UserDetailDialog({ userId, open, onClose }: { userId: string | null; open: boolean; onClose: () => void }) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || !open) return;
    setLoading(true);
    adminFetch('user-detail', 'GET', { user_id: userId })
      .then(setDetail)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId, open]);

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await adminFetch('delete-entry', 'POST', { entry_id: entryId });
      setDetail(prev => prev ? { ...prev, entries: prev.entries.filter(e => e.id !== entryId) } : prev);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            User Details
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : detail ? (
          <div className="space-y-4">
            {/* User info */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{detail.user?.email || '—'}</p>
                <p className="text-xs text-muted-foreground">
                  Joined {detail.user?.created_at ? new Date(detail.user.created_at).toLocaleDateString() : '—'}
                  {' · '}Last sign in {detail.user?.last_sign_in_at ? new Date(detail.user.last_sign_in_at).toLocaleDateString() : 'Never'}
                </p>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="p-3 rounded-xl bg-muted/20 text-center">
                <p className="text-xs text-muted-foreground">Net Work</p>
                <p className="text-lg font-bold">{detail.stats.netWorkHours}h</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/20 text-center">
                <p className="text-xs text-muted-foreground">Break</p>
                <p className="text-lg font-bold">{detail.stats.totalBreakHours}h</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/20 text-center">
                <p className="text-xs text-muted-foreground">Days Worked</p>
                <p className="text-lg font-bold">{detail.stats.daysWorked}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/20 text-center">
                <p className="text-xs text-muted-foreground">Avg/Day</p>
                <p className="text-lg font-bold">{detail.stats.avgHoursPerDay}h</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/20 text-center">
                <p className="text-xs text-muted-foreground">Tasks Done</p>
                <p className="text-lg font-bold">{detail.stats.taskStats.done}/{detail.stats.taskStats.total}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/20 text-center">
                <p className="text-xs text-muted-foreground">In Progress</p>
                <p className="text-lg font-bold">{detail.stats.taskStats.inProgress}</p>
              </div>
            </div>

            {/* Recent entries */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Recent Entries ({detail.entries.length})
              </h4>
              <div className="max-h-60 overflow-y-auto space-y-1.5">
                {detail.entries.slice(0, 30).map((entry: any) => {
                  const sessions = (entry.sessions || []) as any[];
                  const firstIn = sessions[0]?.clockIn || '—';
                  const lastOut = sessions[sessions.length - 1]?.clockOut || '—';
                  return (
                    <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/10 hover:bg-muted/20 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="shrink-0 text-xs rounded-md">
                          {entry.date}
                        </Badge>
                        <span className="text-muted-foreground truncate">
                          {firstIn} → {lastOut} ({sessions.length} session{sessions.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
                            <AlertDialogDescription>Delete the entry for {entry.date}? This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteEntry(entry.id)} className="rounded-xl bg-destructive">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  );
                })}
                {detail.entries.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No entries</p>
                )}
              </div>
            </div>

            {/* Tasks */}
            {detail.tasks.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <ListTodo className="h-4 w-4" /> Tasks ({detail.tasks.length})
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-1.5">
                  {detail.tasks.slice(0, 20).map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/10 text-sm">
                      <span className="truncate">{task.title}</span>
                      <Badge variant={task.status === 'done' ? 'default' : 'secondary'} className="text-xs rounded-md shrink-0 ml-2">
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">Failed to load user details</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Admin Page ───
const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
      .then(({ data }) => {
        if (data) {
          setIsAdmin(true);
          loadData();
        } else {
          setIsAdmin(false);
        }
      });
  }, [user]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        adminFetch('list-users'),
        adminFetch('stats'),
      ]);
      setUsers(usersRes.users || []);
      setStats(statsRes);
    } catch (err) {
      console.error('Admin load error:', err);
    }
    setLoading(false);
  }, []);

  const handleSetRole = async (userId: string, role: string) => {
    try {
      await adminFetch('set-role', 'POST', { user_id: userId, role });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to set role', variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await adminFetch('delete-user', 'POST', { user_id: userId });
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast({ title: 'User Deleted', description: 'User and all their data have been removed.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete user', variant: 'destructive' });
    }
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const data = await adminFetch('export-all');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timetrack-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: 'Export Failed', description: err.message || 'Could not export data', variant: 'destructive' });
    }
    setExporting(false);
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return u.email?.toLowerCase().includes(q) || u.role.includes(q);
  });

  if (isAdmin === false) {
    return (
      <div className="min-h-screen premium-gradient grain flex items-center justify-center p-4">
        <ShaderBackground />
        <Card className="glass border-none rounded-2xl shadow-xl relative z-10">
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">You don't have admin privileges.</p>
            <Button onClick={() => navigate('/')} className="rounded-xl">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen premium-gradient grain">
      <ShaderBackground />
      <div className="relative z-10">
        <header className="glass-strong sticky top-0 z-20 border-b border-border/30">
          <div className="container mx-auto flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="rounded-xl">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive shadow-md">
                <Shield className="h-5 w-5 text-destructive-foreground" />
              </div>
              <h1 className="text-lg font-bold text-foreground">Admin Portal</h1>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAll}
                disabled={exporting}
                className="rounded-xl text-xs"
              >
                <Download className="mr-1 h-4 w-4" />
                {exporting ? 'Exporting...' : 'Export All'}
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-6">
          {/* Stats */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
          ) : stats && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={Users} label="Total Users" value={stats.totalUsers} />
                <StatCard icon={CalendarDays} label="Total Entries" value={stats.totalEntries} sub={`${stats.avgEntriesPerUser} avg/user`} />
                <StatCard icon={Clock} label="Net Work Hours" value={`${stats.netWorkHours}h`} sub={`${stats.totalBreakHours}h break`} />
                <StatCard icon={Activity} label="Active Today" value={stats.activeToday} sub={`${stats.activeThisWeek} this week`} />
              </div>
            </>
          )}

          {/* Users Table */}
          <Card className="border-none glass rounded-2xl shadow-md overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" /> All Users ({filteredUsers.length})
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 w-full sm:w-[220px] rounded-xl"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Entries</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Joined</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Last Sign In</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-medium max-w-[200px] truncate">{u.email || '—'}</td>
                          <td className="px-4 py-3">
                            <Select
                              value={u.role}
                              onValueChange={v => handleSetRole(u.id, v)}
                              disabled={u.id === user?.id}
                            >
                              <SelectTrigger className="w-24 h-8 rounded-lg text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary" className="rounded-md text-xs">{u.entry_count}</Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                            {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                                onClick={() => setSelectedUserId(u.id)}
                                title="View details"
                              >
                                <Eye className="h-4 w-4 text-primary" />
                              </Button>
                              {u.id !== user?.id && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="rounded-2xl">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete User?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete {u.email} and all their data. This cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteUser(u.id)} className="rounded-xl bg-destructive">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No users found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      <UserDetailDialog
        userId={selectedUserId}
        open={!!selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </div>
  );
};

export default Admin;
