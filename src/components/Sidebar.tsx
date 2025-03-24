import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '@/store/slices/authSlice';
import { RootState } from '@/store';
import {
  LayoutDashboard,
  Users,
  Gamepad2,
  FileText,
  Receipt,
  Package,
  Wrench,
  DollarSign,
  BarChart,
  Map,
  Settings,
  LogOut,
  MonitorPlay,
  Wallet,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

const Sidebar = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { profile } = useSelector((state: RootState) => state.companyProfile);

  const handleLogout = () => {
    dispatch(logout());
  };

  const navItems = [
    {
      label: 'Panel',
      path: '/',
      icon: <LayoutDashboard size={20} />,
    },
    {
      label: 'Clientes',
      path: '/clients',
      icon: <Users size={20} />,
    },
    {
      label: 'Máquinas',
      path: '/machines',
      icon: <MonitorPlay size={20} />,
    },
    {
      label: 'Recaudaciones',
      path: '/collections',
      icon: <Wallet size={20} />,
    },
    {
      label: 'Gastos',
      path: '/expenses',
      icon: <Receipt size={20} />,
    },
    {
      label: 'Mantenimiento',
      path: '/maintenance',
      icon: <Wrench size={20} />,
    },
    {
      label: 'Ubicaciones',
      path: '/locations',
      icon: <MapPin size={20} />,
    },
    {
      label: 'Ajustes',
      path: '/settings',
      icon: <Settings size={20} />,
    },
  ];

  return (
    <aside className="w-64 bg-card border-r border-border h-full flex flex-col">
      <div className="h-16 border-b border-border flex items-center justify-center p-4">
        {profile?.logo ? (
          <img
            src={profile.logo}
            alt={profile.name || 'Rekreativ@'}
            className="h-10 w-10 object-contain rounded border border-gray-100 shadow-sm"
          />
        ) : (
          <div className="font-bold text-xl">
            <span className="text-brand">Rekreativ</span>
            <span className="text-brand-accent">@</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-md group',
                location.pathname === item.path
                  ? 'bg-brand text-white'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex items-center px-3 py-2 text-sm font-medium text-foreground">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Conectado como</p>
            <p className="font-medium">{user?.name}</p>
            <p className="text-xs text-muted-foreground">
              {user?.role === 'admin' ? 'Administrador' : 'Técnico'}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="ml-auto">
            <LogOut size={18} />
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
