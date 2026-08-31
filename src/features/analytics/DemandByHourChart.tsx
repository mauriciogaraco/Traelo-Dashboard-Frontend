import type { DemandByHourDTO } from '@/lib/types';

interface DemandByHourChartProps {
  data: DemandByHourDTO[];
  selectedHour: number | null;
  onSelectHour: (hour: number) => void;
}

const WIDTH = 760;
const HEIGHT = 220;
const PADDING_LEFT = 36;
const PADDING_BOTTOM = 20;
const PADDING_TOP = 12;
const CHART_HEIGHT = HEIGHT - PADDING_BOTTOM - PADDING_TOP;
const CHART_WIDTH = WIDTH - PADDING_LEFT;

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

export function DemandByHourChart({ data, selectedHour, onSelectHour }: DemandByHourChartProps) {
  const maxCount = Math.max(...data.map((d) => d.orderCount), 1);
  const slotWidth = CHART_WIDTH / data.length;
  const barWidth = Math.min(24, slotWidth * 0.6);

  // Grillas de referencia: 0%, 33%, 66%, 100% del máximo, redondeadas a números limpios.
  const gridSteps = [0, 1 / 3, 2 / 3, 1].map((fraction) => Math.round(maxCount * fraction));

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-56 w-full" role="img" aria-label="Pedidos por hora del día">
      {gridSteps.map((value) => {
        const y = PADDING_TOP + CHART_HEIGHT - (value / maxCount) * CHART_HEIGHT;
        return (
          <g key={value}>
            <line x1={PADDING_LEFT} x2={WIDTH} y1={y} y2={y} stroke="#e2e8f0" strokeWidth={1} />
            <text x={PADDING_LEFT - 6} y={y} textAnchor="end" dominantBaseline="middle" className="fill-slate-400 text-[9px]">
              {value}
            </text>
          </g>
        );
      })}

      {data.map((entry, index) => {
        const barHeight = (entry.orderCount / maxCount) * CHART_HEIGHT;
        const x = PADDING_LEFT + index * slotWidth + (slotWidth - barWidth) / 2;
        const y = PADDING_TOP + CHART_HEIGHT - barHeight;
        const isPeak = entry.orderCount > 0 && entry.orderCount === maxCount;
        const isSelected = selectedHour === entry.hour;

        return (
          <g
            key={entry.hour}
            role="button"
            tabIndex={0}
            onClick={() => onSelectHour(entry.hour)}
            onKeyDown={(e) => e.key === 'Enter' && onSelectHour(entry.hour)}
            className="cursor-pointer outline-none"
          >
            <title>{`${formatHour(entry.hour)} — ${entry.orderCount} pedido${entry.orderCount === 1 ? '' : 's'}`}</title>
            {/* Hit area más grande que la barra, para que sea fácil de tocar/clickear */}
            <rect x={PADDING_LEFT + index * slotWidth} y={PADDING_TOP} width={slotWidth} height={CHART_HEIGHT} fill="transparent" />
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, 1)}
              rx={4}
              className={
                isSelected
                  ? 'fill-brand-700'
                  : isPeak
                    ? 'fill-brand-600'
                    : 'fill-brand-300 transition-colors hover:fill-brand-500'
              }
            />
            {isSelected && (
              <rect
                x={x - 2}
                y={y - 2}
                width={barWidth + 4}
                height={barHeight + 4}
                rx={5}
                fill="none"
                stroke="var(--color-brand-700)"
                strokeWidth={1.5}
              />
            )}
            {(index % 2 === 0 || data.length <= 12) && (
              <text
                x={PADDING_LEFT + index * slotWidth + slotWidth / 2}
                y={HEIGHT - 4}
                textAnchor="middle"
                className="fill-slate-400 text-[9px]"
              >
                {entry.hour}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
