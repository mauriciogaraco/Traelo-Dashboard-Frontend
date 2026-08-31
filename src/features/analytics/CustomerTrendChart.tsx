import { useEffect, useRef } from 'react';
import {
  AreaSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { CustomerTrendPointDTO } from '@/lib/types';

interface CustomerTrendChartProps {
  data: CustomerTrendPointDTO[];
}

// Naranja de marca (Nuevos) + azul del slot 1 categórico de la skill dataviz (Recurrentes) —
// dos identidades distintas, no dos tonos del mismo naranja. Par validado con
// validate_palette.js (ΔE 26.2 CVD / 35.4 normal-vision, muy por encima del piso de 8/15).
const NEW_COLOR = '#f0501a';
const RECURRING_COLOR = '#2a78d6';

// Un time pasado como string "yyyy-mm-dd" lightweight-charts lo convierte internamente a un
// objeto BusinessDay {year,month,day} — subscribeCrosshairMove devuelve ESE objeto, no el
// string original, así que buscarlo por String(time) nunca matchea. Usamos UTCTimestamp
// (número) en ambos sentidos para evitar esa conversión implícita.
function dateToTime(dateStr: string): UTCTimestamp {
  return (Date.parse(`${dateStr}T00:00:00Z`) / 1000) as UTCTimestamp;
}

function timeToDate(time: Time): string {
  return new Date(Number(time) * 1000).toISOString().slice(0, 10);
}

function formatCUP(value: number): string {
  return `${Math.round(value).toLocaleString('es')} CUP`;
}

function describePoint(point: CustomerTrendPointDTO): string {
  return `${point.date} — Nuevos: ${point.newCustomers} (${formatCUP(point.newRevenue)}) · Recurrentes: ${point.recurringCustomers} (${formatCUP(point.recurringRevenue)})`;
}

export function CustomerTrendChart({ data }: CustomerTrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLParagraphElement>(null);
  const dataRef = useRef(data);
  const chartRef = useRef<IChartApi | null>(null);
  const newSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const recurringSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);

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

    const newSeries = chart.addSeries(AreaSeries, {
      lineColor: NEW_COLOR,
      topColor: `${NEW_COLOR}1a`,
      bottomColor: `${NEW_COLOR}00`,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const recurringSeries = chart.addSeries(AreaSeries, {
      lineColor: RECURRING_COLOR,
      topColor: `${RECURRING_COLOR}1a`,
      bottomColor: `${RECURRING_COLOR}00`,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    newSeriesRef.current = newSeries;
    recurringSeriesRef.current = recurringSeries;
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
      newSeriesRef.current = null;
      recurringSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    dataRef.current = data;
    newSeriesRef.current?.setData(
      data.map((p) => ({ time: dateToTime(p.date), value: p.newCustomers })),
    );
    recurringSeriesRef.current?.setData(
      data.map((p) => ({ time: dateToTime(p.date), value: p.recurringCustomers })),
    );
    chartRef.current?.timeScale().fitContent();
    const last = data[data.length - 1];
    if (readoutRef.current) readoutRef.current.textContent = last ? describePoint(last) : '';
  }, [data]);

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: NEW_COLOR }} />
          Nuevos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: RECURRING_COLOR }} />
          Recurrentes
        </span>
      </div>
      <p ref={readoutRef} className="mb-2 h-4 text-xs text-slate-500" />
      <div ref={containerRef} className="h-56 w-full" />
    </div>
  );
}
