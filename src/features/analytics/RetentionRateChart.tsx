import { useEffect, useRef } from 'react';
import {
  ColorType,
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { CustomerTrendPointDTO } from '@/lib/types';

interface RetentionRateChartProps {
  data: CustomerTrendPointDTO[];
}

// Serie única (una magnitud/salud, no una identidad) → mismo acento de marca que el resto de
// los gráficos de una sola serie en la app; no necesita leyenda, el título ya la nombra.
const LINE_COLOR = '#f0501a';

// Ver el comentario en CustomerTrendChart.tsx: un time-string "yyyy-mm-dd" se convierte
// internamente a BusinessDay y ya no matchea por String(time) — usamos UTCTimestamp.
function dateToTime(dateStr: string): UTCTimestamp {
  return (Date.parse(`${dateStr}T00:00:00Z`) / 1000) as UTCTimestamp;
}

function timeToDate(time: Time): string {
  return new Date(Number(time) * 1000).toISOString().slice(0, 10);
}

function describePoint(point: CustomerTrendPointDTO): string {
  return `${point.date} — ${point.retentionRate.toFixed(0)}% recurrentes`;
}

export function RetentionRateChart({ data }: RetentionRateChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLParagraphElement>(null);
  const dataRef = useRef(data);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart: IChartApi = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
        fontFamily: 'inherit',
        fontSize: 11,
      },
      grid: {
        horzLines: { color: '#e2e8f0' },
        vertLines: { visible: false },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      localization: { timeFormatter: (time: Time) => timeToDate(time) },
    });

    const series = chart.addSeries(LineSeries, {
      color: LINE_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: { type: 'custom', formatter: (value: number) => `${value.toFixed(0)}%` },
    });
    seriesRef.current = series;
    chartRef.current = chart;

    chart.subscribeCrosshairMove((param) => {
      const el = readoutRef.current;
      if (!el) return;
      const time = param.time as Time | undefined;
      const point = time
        ? dataRef.current.find((p) => p.date === timeToDate(time))
        : dataRef.current[dataRef.current.length - 1];
      el.textContent = point ? describePoint(point) : '';
    });

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    dataRef.current = data;
    seriesRef.current?.setData(
      data.map((p) => ({ time: dateToTime(p.date), value: p.retentionRate })),
    );
    chartRef.current?.timeScale().fitContent();
    const last = data[data.length - 1];
    if (readoutRef.current) readoutRef.current.textContent = last ? describePoint(last) : '';
  }, [data]);

  return (
    <div>
      <p ref={readoutRef} className="mb-2 h-4 text-xs text-slate-500" />
      <div ref={containerRef} className="h-40 w-full" />
    </div>
  );
}
