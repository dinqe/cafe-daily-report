import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import Login from "./pages/Login";
import Entry from "./pages/Entry";
import HistoryPage from "./pages/HistoryPage";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import AppLayout from "./components/AppLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowed }: { children: React.ReactNode; allowed: string[] }) {
  const { user, userRole, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Yükleniyor...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!userRole || !allowed.includes(userRole.role)) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function AuthRedirect() {
  const { user, userRole, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Yükleniyor...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (userRole?.role === 'branch_manager') return <Navigate to="/entry" replace />;
  return <Navigate to="/dashboard" replace />;
}

function LoginGuard() {
  const { user, userRole, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Yükleniyor...</div>;
  if (user && userRole) {
    if (userRole.role === 'branch_manager') return <Navigate to="/entry" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <Login />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginGuard />} />
            <Route path="/" element={<AuthRedirect />} />
            <Route path="/entry" element={<ProtectedRoute allowed={['branch_manager']}><Entry /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute allowed={['branch_manager']}><HistoryPage /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute allowed={['gm', 'owner']}><Dashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute allowed={['owner']}><Admin /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
