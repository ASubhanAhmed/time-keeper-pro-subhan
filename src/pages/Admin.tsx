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
import { Users, BarChart3, Clock, ArrowLeft, Search, Trash2, Shield, Activity, CalendarDays } from 'lucide-react';
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
  activeToday: number;
}

async function adminFetch(action: string, method = 'GET', body?: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/admin-users?action=${action}${
    action === 'user-entries' && body?.user_id ? `&user_id=${body.user_id}` : ''
  }`;

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

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
      console.error('Set role error:', err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await adminFetch('delete-user', 'POST', { user_id: userId });
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      console.error('Delete user error:', err.message);
    }
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
            <ThemeToggle />
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-6">
          {/* Stats */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
          ) : stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="border-none glass rounded-2xl shadow-md">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none glass rounded-2xl shadow-md">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <CalendarDays className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Entries</p>
                    <p className="text-2xl font-bold">{stats.totalEntries}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none glass rounded-2xl shadow-md">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Hours</p>
                    <p className="text-2xl font-bold">{stats.totalWorkHours}h</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none glass rounded-2xl shadow-md">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Active Today</p>
                    <p className="text-2xl font-bold">{stats.activeToday}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Users Table */}
          <Card className="border-none glass rounded-2xl shadow-md overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" /> All Users
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
                  {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Entries</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Sign In</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-medium">{u.email || '—'}</td>
                          <td className="px-4 py-3">
                            <Select
                              value={u.role}
                              onValueChange={v => handleSetRole(u.id, v)}
                              disabled={u.id === user?.id}
                            >
                              <SelectTrigger className="w-28 h-8 rounded-lg text-xs">
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
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="px-4 py-3 text-right">
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
    </div>
  );
};

export default Admin;