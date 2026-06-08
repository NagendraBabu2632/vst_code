import "./KpiCard.css";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

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

const KpiCard = ({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  trend,
  accentColor = "primary",
  onClick,
}: KpiCardProps) => {
  const cardClass = [
    "kpi-card",
    onClick ? "kpi-card--clickable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const iconWrapClass = `kpi-card__icon-wrap kpi-card__icon-wrap--${accentColor}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={cardClass}
    >
      <div className="kpi-card__header">
        <span className="kpi-card__title">{title}</span>
        <div className={iconWrapClass}>
          <Icon />
        </div>
      </div>

      <div className="kpi-card__value-row">
        <span className="kpi-card__value">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {unit && <span className="kpi-card__unit">{unit}</span>}
      </div>

      {subtitle && <p className="kpi-card__subtitle">{subtitle}</p>}

      {trend && (
        <div className="kpi-card__trend">
          <span
            className={`kpi-card__trend-value ${
              trend.value >= 0 ? "kpi-card__trend-value--up" : "kpi-card__trend-value--down"
            }`}
          >
            {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
          <span className="kpi-card__trend-label">{trend.label}</span>
        </div>
      )}
    </motion.div>
  );
};

export default KpiCard;
