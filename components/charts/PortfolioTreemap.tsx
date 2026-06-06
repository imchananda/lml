import React from 'react';
import { Treemap, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

type AssetType = 'STOCK' | 'ETF' | 'MUTUAL_FUND' | 'GOLD' | 'CRYPTO' | 'BOND' | 'REAL_ESTATE' | 'OTHER';

const assetColors: Record<string, string> = {
  STOCK: '#3b82f6', ETF: '#10b981', MUTUAL_FUND: '#8b5cf6',
  GOLD: '#f59e0b', CRYPTO: '#f97316', BOND: '#14b8a6',
  REAL_ESTATE: '#6366f1', OTHER: '#64748b'
};

const CustomizedContent = (props: any) => {
  const { x, y, width, height, name, value, root, depth, assetType } = props;

  // Don't render text if the box is too small
  const hideText = width < 50 || height < 30;
  
  // Use assetType color, fallback to default
  const fill = assetColors[assetType] || '#8884d8';

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: fill,
          stroke: 'rgba(255,255,255,0.2)',
          strokeWidth: 2,
          rx: 4,
          ry: 4,
          cursor: 'pointer'
        }}
      />
      {!hideText && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 4}
            textAnchor="middle"
            fill="#fff"
            fontSize={14}
            fontWeight="bold"
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 12}
            textAnchor="middle"
            fill="rgba(255,255,255,0.8)"
            fontSize={10}
          >
            {((value / root.value) * 100).toFixed(1)}%
          </text>
        </>
      )}
    </g>
  );
};

export function PortfolioTreemap({ data }: { data: any[] }) {
  // We don't group by depth for this simple Treemap, we just flatten it so each box is an asset
  const chartData = data
    .map(asset => {
      const avgCost = asset.quantity > 0 ? asset.costBasis / asset.quantity : 0;
      const currentPrice = asset.currentPrice || avgCost;
      const marketVal = currentPrice * asset.quantity;
      return {
        name: asset.ticker || asset.name,
        size: marketVal,
        value: marketVal, // For tooltip
        assetType: asset.assetType
      };
    })
    .filter(d => d.size > 0)
    .sort((a, b) => {
      if (a.assetType < b.assetType) return -1;
      if (a.assetType > b.assetType) return 1;
      return b.size - a.size;
    });

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        ยังไม่มีสินทรัพย์ในพอร์ตการลงทุน
      </div>
    );
  }

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={chartData}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="#fff"
          content={<CustomizedContent />}
        >
          <RechartsTooltip 
            contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.8)', color: '#fff' }}
            formatter={(value: any, name: any) => [`฿${Number(value).toLocaleString(undefined, {maximumFractionDigits:2})}`, 'Market Value']}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}
