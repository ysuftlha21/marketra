"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function Sparkline({
  values,
  color,
  className = "",
}: {
  values: number[];
  color: string;
  className?: string;
}) {
  const data = values.map((value, index) => ({ index, value }));
  return (
    <div className={className} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.35}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OpportunitiesAreaChart({ values }: { values: number[] }) {
  const months = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const data = values.map((value, index) => ({
    index,
    value,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 5, bottom: 2, left: -26 }}>
        <defs>
          <linearGradient id="opportunityArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.36} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,.05)" />
        <XAxis
          dataKey="index"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#52525b", fontSize: 7 }}
          interval={3}
          tickFormatter={(index: number) =>
            months[Math.min(months.length - 1, Math.floor(index / 4.2))] ?? ""
          }
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#52525b", fontSize: 7 }}
          tickFormatter={(value: number) => (value > 75 ? "2M" : value > 35 ? "1M" : "0")}
        />
        <Tooltip
          cursor={{ stroke: "rgba(167,139,250,.25)" }}
          contentStyle={{
            background: "#0b0f19",
            border: "1px solid rgba(167,139,250,.25)",
            borderRadius: 7,
            color: "#f4f4f5",
            fontSize: 10,
          }}
          formatter={(value) => [`$${((Number(value) / 108) * 1.8).toFixed(2)}M`, "Est. ARR"]}
          labelFormatter={() => ""}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#8b5cf6"
          strokeWidth={1.7}
          fill="url(#opportunityArea)"
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
