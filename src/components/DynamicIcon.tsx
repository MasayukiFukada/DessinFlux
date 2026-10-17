import React from 'react';
import {
  Laptop,
  Server,
  Database,
  Key,
  Lock,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Smartphone,
  Send,
  Check,
  X,
  Sparkles,
  Cpu,
  Globe,
  User,
  FileCode,
  Layers,
  HelpCircle
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  laptop: Laptop,
  server: Server,
  database: Database,
  key: Key,
  lock: Lock,
  shield: Shield,
  'shield-check': ShieldCheck,
  'alert-triangle': AlertTriangle,
  smartphone: Smartphone,
  send: Send,
  check: Check,
  x: X,
  sparkles: Sparkles,
  cpu: Cpu,
  globe: Globe,
  user: User,
  'file-code': FileCode,
  layers: Layers,
};

interface DynamicIconProps {
  name?: string;
  className?: string;
  size?: number;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({ name, className = '', size = 20 }) => {
  if (!name) return <Layers className={className} size={size} />;
  const IconComponent = iconMap[name.toLowerCase()] || HelpCircle;
  return <IconComponent className={className} size={size} />;
};
