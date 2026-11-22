import {
  Activity,
  AlertTriangle,
  Bell,
  Car,
  Compass,
  Cpu,
  FileCheck2,
  FileSpreadsheet,
  Fuel,
  Gauge,
  Globe,
  Headphones,
  History,
  Home,
  LayoutDashboard,
  Link2,
  Map as MapIcon,
  MapPin,
  Megaphone,
  Navigation,
  Route,
  Settings,
  Shield,
  Sliders,
  Truck,
  User,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-react';
import { SCREEN_ICON_MAP, type NavIconKey } from '../../utils/roleDashboardConfig';

export function RoleNavIcon({
  iconKey,
  className = 'w-4 h-4 shrink-0',
}: {
  iconKey: NavIconKey;
  className?: string;
}) {
  switch (iconKey) {
    case 'dashboard':
      return <LayoutDashboard className={className} aria-hidden="true" />;
    case 'map':
      return <MapIcon className={className} aria-hidden="true" />;
    case 'admins':
      return <Shield className={className} aria-hidden="true" />;
    case 'accounts':
      return <Users className={className} aria-hidden="true" />;
    case 'vehicles':
      return <Truck className={className} aria-hidden="true" />;
    case 'devices':
      return <Cpu className={className} aria-hidden="true" />;
    case 'types':
      return <Car className={className} aria-hidden="true" />;
    case 'alerts':
      return <AlertTriangle className={className} aria-hidden="true" />;
    case 'reports':
      return <FileSpreadsheet className={className} aria-hidden="true" />;
    case 'apis':
      return <Link2 className={className} aria-hidden="true" />;
    case 'announcements':
      return <Megaphone className={className} aria-hidden="true" />;
    case 'support':
      return <Headphones className={className} aria-hidden="true" />;
    case 'settings':
      return <Settings className={className} aria-hidden="true" />;
    case 'clients':
      return <UserCheck className={className} aria-hidden="true" />;
    case 'assign':
      return <Wrench className={className} aria-hidden="true" />;
    case 'geofences':
      return <MapPin className={className} aria-hidden="true" />;
    case 'profile':
      return <User className={className} aria-hidden="true" />;
    case 'details':
      return <Gauge className={className} aria-hidden="true" />;
    case 'history':
      return <History className={className} aria-hidden="true" />;
    case 'routes':
      return <Route className={className} aria-hidden="true" />;
    case 'fuel':
      return <Fuel className={className} aria-hidden="true" />;
    case 'violations':
      return <Activity className={className} aria-hidden="true" />;
    case 'pods':
      return <FileCheck2 className={className} aria-hidden="true" />;
    case 'amenities':
      return <Compass className={className} aria-hidden="true" />;
    case 'customers':
      return <Globe className={className} aria-hidden="true" />;
    case 'home':
      return <Home className={className} aria-hidden="true" />;
    case 'track':
      return <Navigation className={className} aria-hidden="true" />;
    case 'info':
      return <Sliders className={className} aria-hidden="true" />;
    case 'trips':
      return <History className={className} aria-hidden="true" />;
    case 'notifications':
      return <Bell className={className} aria-hidden="true" />;
    default:
      return <LayoutDashboard className={className} aria-hidden="true" />;
  }
}

export function getScreenIconKey(screenId: string): NavIconKey {
  return SCREEN_ICON_MAP[screenId] ?? 'dashboard';
}
