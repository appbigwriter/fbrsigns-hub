import { SalesChart } from "@/components/charts/SalesChart";
import { MetricCard } from "@/components/ui/metric-card";
import { 
  useDashboardMetrics, 
  useRecentOrders,
  useOrderStats 
} from "@/hooks/useQuery";
import { TrendingUp, Users, ShoppingCart, DollarSign } from "lucide-react";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickActions } from "@/components/dashboard/QuickActions";

export default function Dashboard() {
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to FBRSigns Admin Dashboard
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Orders"
          value={metrics?.totalOrders || 0}
          change={{ value: 12, type: 'increase' }}
          icon={ShoppingCart}
          variant="default"
        />
        <MetricCard
          title="Revenue"
          value={`$ ${(metrics?.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          change={{ value: 8, type: 'increase' }}
          icon={DollarSign}
          variant="success"
        />
        <MetricCard
          title="Customers"
          value={metrics?.totalCustomers || 0}
          change={{ value: 15, type: 'increase' }}
          icon={Users}
          variant="info"
        />
        <MetricCard
          title="Monthly Revenue"
          value={`$ ${(metrics?.monthlyRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          change={{ value: 3, type: 'increase' }}
          icon={TrendingUp}
          variant="warning"
        />
      </div>

      {/* Sales Chart */}
      <SalesChart />

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity />
        <QuickActions />
      </div>
    </div>
  );
}