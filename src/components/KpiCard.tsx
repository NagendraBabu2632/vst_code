import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  accentColor?: string;
  onClick?: () => void;
}

const KpiCard = ({ title, value, unit, subtitle, icon: Icon, trend, accentColor = "primary", onClick }: KpiCardProps) => {
  const colorMap: Record<string, string> = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    critical: "text-critical",
    info: "text-info",
    solar: "text-chart-solar",
    diesel: "text-chart-diesel",
    grid: "text-chart-grid",
    moisture: "text-chart-moisture",
    humidity: "text-chart-humidity",
  };

  const bgMap: Record<string, string> = {
    primary: "bg-primary/10",
    success: "bg-success/10",
    warning: "bg-warning/10",
    critical: "bg-critical/10",
    info: "bg-info/10",
    solar: "bg-chart-solar/10",
    diesel: "bg-chart-diesel/10",
    grid: "bg-chart-grid/10",
    moisture: "bg-chart-moisture/10",
    humidity: "bg-chart-humidity/10",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`kpi-card ${onClick ? "cursor-pointer hover:border-primary/50 hover:shadow-md transition-all" : ""}`}
    >
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</span>
        <div className={`p-1.5 rounded-md ${bgMap[accentColor] || bgMap.primary}`}>
          <Icon className={`h-3.5 w-3.5 ${colorMap[accentColor] || colorMap.primary}`} />
        </div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-bold mono leading-tight">{typeof value === "number" ? value.toLocaleString() : value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5 italic">{subtitle}</p>}
      {trend && (
        <div className="mt-1 flex items-center gap-1">
          <span className={`text-xs font-medium ${trend.value >= 0 ? "text-success" : "text-critical"}`}>
            {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
          <span className="text-xs text-muted-foreground">{trend.label}</span>
        </div>
      )}
    </motion.div>
  );
};

export default KpiCard;
