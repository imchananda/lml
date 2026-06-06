import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export function NetWorthAreaChart({ data }: { data: any[] }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!data || data.length === 0) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">ไม่มีข้อมูลเพียงพอ</div>;
  }

  if (!mounted) {
    return <div className="w-full h-[300px] bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse" />;
  }

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/30" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(v) => `฿${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
          <RechartsTooltip 
            contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.8)', color: '#fff' }}
            formatter={(value: any, name: any) => [
              `฿${Number(value).toLocaleString()}`, 
              name === 'assets' ? 'สินทรัพย์รวม (Assets)' : name === 'debt' ? 'หนี้สินรวม (Debt)' : 'ความมั่งคั่งสุทธิ (Net Worth)'
            ]}
          />
          {/* Overlapping areas: Assets in back, NetWorth in middle, Debt in front (if any) */}
          <Area type="monotone" dataKey="assets" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAssets)" name="assets" />
          <Area type="monotone" dataKey="netWorth" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorNetWorth)" name="netWorth" />
          <Area type="monotone" dataKey="debt" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorDebt)" name="debt" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
