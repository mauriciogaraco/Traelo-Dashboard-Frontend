import { useEffect, useRef } from 'react';
import {
  ColorType,
  createChart,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from 'lightweight-charts';
import type { OrdersTrendGranularity, OrdersTrendPointDTO } from '@/lib/types';
import { formatTrendLabel, labelToTime, timeToLabelKey } from './ordersTrendTime';

interface OrdersTrendBarChartProps {
  data: OrdersTrendPointDTO[];
  granularity: OrdersTrendGranularity;
}

// Serie única (volumen de pedidos, no identidad) → mismo acento de marca que el resto de los
// gráficos de una sola serie en la página; no necesita leyenda.
const BAR_COLOR = '#f0501a';

function formatCUP(value: number): string {
  return `${Math.round(value).toLocaleString('es')} CUP`;
}

function describePoint(point: OrdersTrendPointDTO, granularity: OrdersTrendGranularity): string {
  return `${formatTrendLabel(point.label, granularity)} — ${point.orderCount} pedido${point.orderCount === 1 ? '' : 's'} (${formatCUP(point.businessSalesGross)})`;
}

export function OrdersTrendBarChart({ data, granularity }: OrdersTrendBarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLParagraphElement>(null);
  const dataRef = useRef(data);
  // La granularidad puede cambiar sin desmontar el chart (el usuario cambia de pestaña de
  // rango) — se lee vía ref en los callbacks para no quedar con el valor de cuando se montó.
  const granularityRef = useRef(granularity);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

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
      timeScale: {
        borderVisible: false,
        tickMarkFormatter: (time: Time) =>
          formatTrendLabel(timeToLabelKey(time, granularityRef.current), granularityRef.current),
      },
      localization: {
        timeFormatter: (time: Time) =>
          formatTrendLabel(timeToLabelKey(time, granularityRef.current), granularityRef.current),
      },
    });

    const series = chart.addSeries(HistogramSeries, {
      color: BAR_COLOR,
      priceFormat: { type: 'volume', precision: 0 },
    });
    seriesRef.current = series;
    chartRef.current = chart;

    chart.subscribeCrosshairMove((param) => {
      const el = readoutRef.current;
      if (!el) return;
      const time = param.time as Time | undefined;
      const point = time
        ? dataRef.current.find((p) => p.label === timeToLabelKey(time, granularityRef.current))
        : dataRef.current[dataRef.current.length - 1];
      el.textContent = point ? describePoint(point, granularityRef.current) : '';
    });

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    granularityRef.current = granularity;
    dataRef.current = data;
    seriesRef.current?.setData(
      data.map((p) => ({ time: labelToTime(p.label, granularity), value: p.orderCount })),
    );
    chartRef.current?.timeScale().fitContent();
    const last = data[data.length - 1];
    if (readoutRef.current) readoutRef.current.textContent = last ? describePoint(last, granularity) : '';
  }, [data, granularity]);

  return (
    <div>
      <p ref={readoutRef} className="mb-2 h-4 text-xs text-slate-500" />
      <div ref={containerRef} className="h-48 w-full" />
    </div>
  );
}
