import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'info';
  className?: string;
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  variant = 'default',
  className 
}: MetricCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'border-success/20 bg-success-muted';
      case 'warning':
        return 'border-warning/20 bg-warning-muted';
      case 'info':
        return 'border-info/20 bg-info-muted';
      default:
        return 'border-border bg-card';
    }
  };

  const getIconStyles = () => {
    switch (variant) {
      case 'success':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'info':
        return 'text-info';
      default:
        return 'text-primary';
    }
  };

  return (
    <Card className={cn(getVariantStyles(), className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn("h-4 w-4", getIconStyles())} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className={cn(
            "text-xs mt-1",
            change.type === 'increase' ? "text-success" : "text-destructive"
          )}>
            {change.type === 'increase' ? '+' : '-'}{Math.abs(change.value)}% from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
}