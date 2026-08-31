import { useEffect, useRef } from 'react';
import {
  ColorType,
  createChart,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { DemandByHourDTO } from '@/lib/types';

interface DemandByHourChartProps {
  data: DemandByHourDTO[];
  selectedHour: number | null;
  onSelectHour: (hour: number) => void;
}

const PEAK_COLOR = '#f0501a'; // --color-brand-600
const SELECTED_COLOR = '#c93d10'; // --color-brand-700
const DEFAULT_COLOR = '#ffa37d'; // --color-brand-300

// Las 24 horas no son una fecha real — se mapean a un día de referencia fijo (arbitrario, en
// UTC puro) solo para poder usar el eje de tiempo de lightweight-charts; hourToTime/timeToHour
// codifican y decodifican con métodos UTC en ambos sentidos, así que el resultado no depende
// de la zona horaria del navegador de quien lo mira.
const REFERENCE_DAY_MS = Date.UTC(2000, 0, 1);

function hourToTime(hour: number): UTCTimestamp {
  return ((REFERENCE_DAY_MS + hour * 3600_000) / 1000) as UTCTimestamp;
}

function timeToHour(time: Time): number {
  return Math.round((Number(time) * 1000 - REFERENCE_DAY_MS) / 3600_000);
}

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

function describeEntry(entry: DemandByHourDTO): string {
  return `${formatHour(entry.hour)} — ${entry.orderCount} pedido${entry.orderCount === 1 ? '' : 's'}`;
}

export function DemandByHourChart({ data, selectedHour, onSelectHour }: DemandByHourChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLParagraphElement>(null);
  const dataRef = useRef(data);
  const onSelectHourRef = useRef(onSelectHour);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  useEffect(() => {
    onSelectHourRef.current = onSelectHour;
  }, [onSelectHour]);

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
        tickMarkFormatter: (time: Time) => formatHour(timeToHour(time)),
      },
      localization: {
        timeFormatter: (time: Time) => formatHour(timeToHour(time)),
      },
    });

    const series = chart.addSeries(HistogramSeries, {
      color: DEFAULT_COLOR,
      priceLineVisible: false,
      lastValueVisible: false,
      base: 0,
    });
    seriesRef.current = series;
    chartRef.current = chart;

    chart.subscribeCrosshairMove((param) => {
      const el = readoutRef.current;
      if (!el) return;
      const time = param.time as Time | undefined;
      const entry = time
        ? dataRef.current.find((d) => d.hour === timeToHour(time))
        : dataRef.current[dataRef.current.length - 1];
      el.textContent = entry ? describeEntry(entry) : '';
    });

    chart.subscribeClick((param) => {
      if (!param.time) return;
      onSelectHourRef.current(timeToHour(param.time as Time));
    });

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    dataRef.current = data;
    const maxCount = Math.max(...data.map((d) => d.orderCount), 1);
    seriesRef.current?.setData(
      data.map((entry) => {
        const isPeak = entry.orderCount > 0 && entry.orderCount === maxCount;
        const isSelected = selectedHour === entry.hour;
        return {
          time: hourToTime(entry.hour),
          value: entry.orderCount,
          color: isSelected ? SELECTED_COLOR : isPeak ? PEAK_COLOR : DEFAULT_COLOR,
        };
      }),
    );
    const last = data[data.length - 1];
    if (readoutRef.current) readoutRef.current.textContent = last ? describeEntry(last) : '';
  }, [data, selectedHour]);

  // Encuadra las 24 horas completas solo cuando cambia el dataset (no en cada clic de
  // selectedHour, para no resetear el zoom/pan del usuario al elegir una hora).
  useEffect(() => {
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return (
    <div>
      <p ref={readoutRef} className="mb-2 h-4 text-xs text-slate-500" />
      <div ref={containerRef} className="h-56 w-full" role="img" aria-label="Pedidos por hora del día" />
    </div>
  );
}
