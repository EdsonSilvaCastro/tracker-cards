import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  CreditCard,
  LogOut,
  Menu,
  X,
  User,
  CalendarDays,
  Calendar,
  BarChart3,
  PiggyBank,
  TrendingUp,
  Plus
} from 'lucide-react';
import QuickExpenseModal from './QuickExpenseModal';

const navigation = [
  { name: 'Monthly', href: '/monthly', icon: CalendarDays },
  { name: 'Due Dates', href: '/due-dates', icon: Calendar },
  { name: 'Compare', href: '/compare', icon: BarChart3 },
  { name: 'Savings', href: '/savings', icon: PiggyBank },
  { name: 'Annual', href: '/annual', icon: TrendingUp },
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Cards', href: '/cards', icon: CreditCard },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickExpenseOpen, setQuickExpenseOpen] = useState(false);
  const [savedMsg, setSavedMsg] = useState(null);
  const savedTimerRef = useRef(null);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSaved = (msg) => {
    setSavedMsg(msg || 'Gasto guardado.');
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSavedMsg(null), 3500);
  };

  useEffect(() => () => clearTimeout(savedTimerRef.current), []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const NavItem = ({ item, onClick }) => {
    const isActive = location.pathname === item.href;
    return (
      <Link
        key={item.name}
        to={item.href}
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium border-2 transition-all
          ${isActive
            ? 'bg-(--color-primary) border-black shadow-[3px_3px_0_0_#000] translate-y-0'
            : 'bg-white border-transparent hover:border-black hover:shadow-[2px_2px_0_0_#000] hover:-translate-y-0.5'
          }`}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {item.name}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r-2 border-black transform transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b-2 border-black">
          <span className="font-head text-lg font-bold">💳 CC Tracker</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 border-2 border-black hover:bg-(--color-primary) transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="mt-4 px-3 flex flex-col gap-1">
          {navigation.map((item) => (
            <NavItem key={item.name} item={item} onClick={() => setSidebarOpen(false)} />
          ))}
        </nav>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r-2 border-black">
          <div className="flex items-center h-16 px-5 border-b-2 border-black bg-(--color-primary)">
            <span className="font-head text-lg font-bold">💳 CC Tracker</span>
          </div>
          <nav className="flex-1 mt-4 px-3 flex flex-col gap-1">
            {navigation.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
          </nav>
          <div className="p-4 border-t-2 border-black">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 border-2 border-black bg-(--color-accent) flex items-center justify-center shrink-0">
                <User className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium truncate flex-1">{user?.email}</p>
              <button
                onClick={handleSignOut}
                className="p-1.5 border-2 border-black hover:bg-(--color-destructive) hover:text-white transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center h-14 bg-(--color-primary) border-b-2 border-black px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 border-2 border-black bg-white hover:bg-(--color-accent) transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-4 font-head text-base font-bold">💳 CC Tracker</span>
        </div>

        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* FAB — Quick Expense */}
      <button
        onClick={() => setQuickExpenseOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-black text-(--color-primary) border-2 border-black shadow-[4px_4px_0_0_#ffdb33] hover:shadow-[2px_2px_0_0_#ffdb33] hover:translate-y-1 hover:translate-x-0.5 transition-all flex items-center justify-center z-40"
        aria-label="Registrar gasto rápido"
      >
        <Plus className="w-6 h-6" />
      </button>

      {quickExpenseOpen && (
        <QuickExpenseModal
          onClose={() => setQuickExpenseOpen(false)}
          onSaved={(msg) => { handleSaved(msg); }}
        />
      )}

      {/* Toast de confirmación */}
      {savedMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-black text-(--color-primary) font-medium text-sm px-5 py-3 border-2 border-black shadow-[4px_4px_0_0_#000] max-w-sm text-center">
          {savedMsg}
        </div>
      )}
    </div>
  );
}


