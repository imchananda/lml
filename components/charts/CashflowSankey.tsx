import React from 'react';
import { Sankey, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

type SummaryData = {
  totalIncome: number;
  totalExpense: number;
  byCategory: { name: string; value: number; color: string }[];
};

export function CashflowSankey({ data }: { data: SummaryData }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!data || (data.totalIncome === 0 && data.byCategory.length === 0)) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        ยังไม่มีข้อมูลกระแสเงินสดในเดือนนี้
      </div>
    );
  }

  const totalIncome = data.totalIncome || 0;
  // Fallback if expenses exceed income (for visualization purposes, the source node must equal or exceed targets)
  // If expense > income, we add a "Debt/Deficit" node pointing to expenses.
  const totalExpense = data.totalExpense || 0;
  
  const nodes: { name: string; color: string }[] = [];
  const links: { source: number; target: number; value: number }[] = [];

  // Setup nodes
  nodes.push({ name: 'Income (รายรับ)', color: '#10b981' }); // Node 0

  let currentIdx = 1;
  const isDeficit = totalExpense > totalIncome;

  if (isDeficit) {
    nodes.push({ name: 'Deficit (เงินเก็บ/หนี้)', color: '#ef4444' }); // Node 1
    currentIdx++;
  }

  // Add category nodes
  data.byCategory.forEach((cat) => {
    nodes.push({ name: cat.name, color: cat.color });
  });

  // Calculate remaining
  const remaining = Math.max(0, totalIncome - totalExpense);
  if (remaining > 0) {
    nodes.push({ name: 'Savings (เงินเหลือ)', color: '#3b82f6' });
  }

  // Setup links
  let incomeRemaining = totalIncome;
  let deficitRemaining = isDeficit ? (totalExpense - totalIncome) : 0;

  data.byCategory.forEach((cat, idx) => {
    const targetNodeIdx = isDeficit ? 2 + idx : 1 + idx;
    let expenseVal = cat.value;

    // Fulfill from income first
    if (incomeRemaining > 0) {
      const takeFromIncome = Math.min(incomeRemaining, expenseVal);
      links.push({
        source: 0, // Income
        target: targetNodeIdx,
        value: takeFromIncome
      });
      incomeRemaining -= takeFromIncome;
      expenseVal -= takeFromIncome;
    }

    // Fulfill from deficit if needed
    if (expenseVal > 0 && isDeficit) {
      links.push({
        source: 1, // Deficit
        target: targetNodeIdx,
        value: expenseVal
      });
      deficitRemaining -= expenseVal;
    }
  });

  // Link remaining income to Savings
  if (remaining > 0) {
    links.push({
      source: 0,
      target: nodes.length - 1, // Last node is Savings
      value: remaining
    });
  }

  if (links.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        กำลังประมวลผลข้อมูล...
      </div>
    );
  }

  const chartData = { nodes, links };

  // Custom Node renderer to apply colors and labels
  const CustomNode = ({ x, y, width, height, index, payload, containerWidth }: any) => {
    const isOut = x + width + 30 > containerWidth;
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={payload.color || '#8884d8'}
          fillOpacity="0.9"
          rx={4}
        />
        <text
          x={isOut ? x - 6 : x + width + 6}
          y={y + height / 2}
          dy="0.35em"
          textAnchor={isOut ? 'end' : 'start'}
          fontSize={12}
          fontWeight="bold"
          fill="currentColor"
          className="text-foreground"
        >
          {payload.name} (฿{payload.value.toLocaleString()})
        </text>
      </g>
    );
  };

  if (!mounted) {
    return <div className="w-full h-[350px] bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse" />;
  }

  return (
    <div className="w-full h-[350px] overflow-hidden -ml-4">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <Sankey
          data={chartData}
          node={<CustomNode />}
          nodePadding={30}
          margin={{ left: 20, right: 100, top: 20, bottom: 20 }}
          link={{ stroke: '#a1a1aa', strokeOpacity: 0.15 }}
        >
          <RechartsTooltip 
             contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.8)', color: '#fff' }}
             formatter={(value: any, name: any, props: any) => [`฿${Number(value).toLocaleString()}`, 'จำนวนเงิน']}
          />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}
