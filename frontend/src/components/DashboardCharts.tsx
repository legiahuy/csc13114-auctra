import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import apiClient from "../api/client";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import Loading from "./Loading";

interface DashboardChartsProps {
  period: "today" | "week" | "month" | "year";
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export default function DashboardCharts({ period }: DashboardChartsProps) {
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [auctionsData, setAuctionsData] = useState<any[]>([]);
  const [userDistribution, setUserDistribution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, [period]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      const [revenueRes, auctionsRes, distributionRes] = await Promise.all([
        apiClient.get("/admin/charts/revenue", { params: { period } }),
        apiClient.get("/admin/charts/auctions", { params: { period } }),
        apiClient.get("/admin/charts/user-distribution"),
      ]);

      setRevenueData(revenueRes.data.data || []);
      setAuctionsData(auctionsRes.data.data || []);
      setUserDistribution(distributionRes.data.data || []);
    } catch (error) {
      console.error("Error fetching chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6">
          <Loading />
        </Card>
        <Card className="p-6">
          <Loading />
        </Card>
        <Card className="p-6">
          <Loading />
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Revenue Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  color: "#fff",
                }}
                formatter={(value: any) => [
                  `${parseFloat(value).toLocaleString("vi-VN")} VNĐ`,
                  "Revenue"
                ]}
                labelFormatter={(label) => {
                  const date = new Date(label);
                  return `Date: ${date.toLocaleDateString("vi-VN")}`;
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Auctions Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">New Auctions</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={auctionsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  color: "#fff",
                }}
                formatter={(value: any) => [
                  `${value} auction${value !== 1 ? 's' : ''}`,
                  "New Auctions"
                ]}
                labelFormatter={(label) => {
                  const date = new Date(label);
                  return `Date: ${date.toLocaleDateString("vi-VN")}`;
                }}
              />
              <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* User Distribution Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">User Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={userDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ role, percent }: any) =>
                  `${role}: ${((percent || 0) * 100).toFixed(0)}%`
                }
                outerRadius={60}
                fill="#8884d8"
                dataKey="count"
              >
                {userDistribution.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 12px",
                }}
                labelStyle={{ color: "#fff" }}
                itemStyle={{ color: "#fff" }}
                formatter={(value: any, _name: any, props: any) => {
                  const total = userDistribution.reduce((sum: number, item: any) => sum + item.count, 0);
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                  return [
                    `${value} users (${percentage}%)`,
                    props.payload.role.charAt(0).toUpperCase() + props.payload.role.slice(1)
                  ];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
