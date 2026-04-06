import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserPlus, Building2 } from 'lucide-react';

type Branch = { id: string; name: string; location: string | null };
type UserWithRole = {
  id: string;
  user_id: string;
  role: string;
  branch_id: string | null;
  created_at: string;
};

export default function Admin() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);

  // New user form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('branch_manager');
  const [branchId, setBranchId] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  // New branch form
  const [branchName, setBranchName] = useState('');
  const [branchLocation, setBranchLocation] = useState('');
  const [creatingBranch, setCreatingBranch] = useState(false);

  const fetchData = async () => {
    const [{ data: b }, { data: u }] = await Promise.all([
      supabase.from('branches').select('*').order('name'),
      supabase.from('user_roles').select('*').order('created_at', { ascending: false }),
    ]);
    if (b) setBranches(b);
    if (u) setUsers(u);
  };

  useEffect(() => { fetchData(); }, []);

  const createUser = async () => {
    if (!email || !password) return;
    setCreatingUser(true);

    // Use Supabase admin signup (auto-confirm is on)
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) {
      toast.error('Kullanıcı oluşturulamadı: ' + (error?.message || 'Bilinmeyen hata'));
      setCreatingUser(false);
      return;
    }

    const { error: roleError } = await supabase.from('user_roles').insert({
      user_id: data.user.id,
      role: role as any,
      branch_id: role === 'branch_manager' ? branchId || null : null,
    });

    if (roleError) {
      toast.error('Rol atanamadı: ' + roleError.message);
    } else {
      toast.success('Kullanıcı oluşturuldu!');
      setEmail('');
      setPassword('');
      fetchData();
    }
    setCreatingUser(false);
  };

  const createBranch = async () => {
    if (!branchName) return;
    setCreatingBranch(true);
    const { error } = await supabase.from('branches').insert({ name: branchName, location: branchLocation || null });
    if (error) {
      toast.error('Şube oluşturulamadı: ' + error.message);
    } else {
      toast.success('Şube oluşturuldu!');
      setBranchName('');
      setBranchLocation('');
      fetchData();
    }
    setCreatingBranch(false);
  };

  const roleBadge = (r: string) => {
    const colors: Record<string, string> = { owner: 'destructive', gm: 'secondary', branch_manager: 'default' };
    const labels: Record<string, string> = { owner: 'Sahip', gm: 'Genel Müdür', branch_manager: 'Şube Müdürü' };
    return <Badge variant={colors[r] as any}>{labels[r] || r}</Badge>;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">Yönetim Paneli</h1>

      {/* Create Branch */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Yeni Şube
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Şube Adı</Label>
              <Input value={branchName} onChange={e => setBranchName(e.target.value)} placeholder="Şube adı" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Konum</Label>
              <Input value={branchLocation} onChange={e => setBranchLocation(e.target.value)} placeholder="İstanbul, Kadıköy" />
            </div>
          </div>
          <Button onClick={createBranch} disabled={creatingBranch || !branchName} size="sm">
            {creatingBranch ? 'Oluşturuluyor...' : 'Şube Oluştur'}
          </Button>
        </CardContent>
      </Card>

      {/* Create User */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Yeni Kullanıcı
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">E-posta</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="ornek@cafe.com" type="email" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Şifre</Label>
              <Input value={password} onChange={e => setPassword(e.target.value)} type="password" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Rol</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="branch_manager">Şube Müdürü</SelectItem>
                  <SelectItem value="gm">Genel Müdür</SelectItem>
                  <SelectItem value="owner">Sahip</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role === 'branch_manager' && (
              <div className="space-y-1">
                <Label className="text-xs">Şube</Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger><SelectValue placeholder="Şube seçin" /></SelectTrigger>
                  <SelectContent>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <Button onClick={createUser} disabled={creatingUser || !email || !password} size="sm">
            {creatingUser ? 'Oluşturuluyor...' : 'Kullanıcı Oluştur'}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Users */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Kullanıcılar</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kullanıcı ID</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Şube</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="text-xs font-mono">{u.user_id.slice(0, 8)}...</TableCell>
                  <TableCell>{roleBadge(u.role)}</TableCell>
                  <TableCell className="text-sm">{branches.find(b => b.id === u.branch_id)?.name || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Branches List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Şubeler</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad</TableHead>
                <TableHead>Konum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="text-muted-foreground">{b.location || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
