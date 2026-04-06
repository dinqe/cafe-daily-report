import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { LogOut, FileText, History, BarChart3, Settings } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { userRole, signOut, user } = useAuth();
  const location = useLocation();
  const role = userRole?.role;

  const navItems = [
    ...(role === 'branch_manager' ? [
      { to: '/entry', label: 'Rapor Giriş', icon: FileText },
      { to: '/history', label: 'Geçmiş', icon: History },
    ] : []),
    ...(role === 'gm' || role === 'owner' ? [
      { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    ] : []),
    ...(role === 'owner' ? [
      { to: '/admin', label: 'Yönetim', icon: Settings },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container flex h-14 items-center justify-between px-4">
          <nav className="flex items-center gap-1">
            {navItems.map(item => (
              <Link key={item.to} to={item.to}>
                <Button variant={location.pathname === item.to ? 'default' : 'ghost'} size="sm" className="gap-1.5">
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container px-4 py-6">{children}</main>
    </div>
  );
}
