import React from 'react';

type Datum = Record<string, string | number>;

function toNumber(value: string | number | undefined) {
  return typeof value === 'number' ? value : Number(value || 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function ChartFrame({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="h-72">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">{title}</h3>
      <div className="flex h-[14.5rem] flex-col">{children}</div>
    </div>
  );
}

export function LineChart({
  data,
  xKey,
  lines
}: {
  data: Datum[];
  xKey: string;
  lines: Array<{ key: string; label: string; color: string }>;
}) {
  const width = 640;
  const height = 220;
  const padding = 24;
  const allValues = data.flatMap((item) => lines.map((line) => toNumber(item[line.key])));
  const maxValue = Math.max(...allValues, 1);

  const pathFor = (lineKey: string) =>
    data
      .map((item, index) => {
        const x =
          data.length <= 1
            ? width / 2
            : padding + ((width - padding * 2) * index) / Math.max(data.length - 1, 1);
        const y = height - padding - ((height - padding * 2) * toNumber(item[lineKey])) / maxValue;
        return `${index === 0 ? 'M' : 'L'} ${x} ${clamp(y, padding, height - padding)}`;
      })
      .join(' ');

  return (
    <div className="flex h-full flex-col justify-between">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible">
        {[0, 1, 2, 3].map((step) => {
          const y = padding + ((height - padding * 2) * step) / 3;
          return <line key={step} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />;
        })}
        {lines.map((line) => (
          <path key={line.key} d={pathFor(line.key)} fill="none" stroke={line.color} strokeWidth="3" strokeLinecap="round" />
        ))}
        {data.map((item, index) => {
          const x =
            data.length <= 1
              ? width / 2
              : padding + ((width - padding * 2) * index) / Math.max(data.length - 1, 1);
          return (
            <text key={`${xKey}-${index}`} x={x} y={height - 4} textAnchor="middle" fontSize="10" fill="#64748b">
              {String(item[xKey])}
            </text>
          );
        })}
      </svg>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
        {lines.map((line) => (
          <span key={line.key} className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: line.color }} />
            {line.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function HorizontalBarChart({
  data,
  labelKey,
  valueKey,
  color,
  suffix = '',
  maxItems = 10
}: {
  data: Datum[];
  labelKey: string;
  valueKey: string;
  color: string;
  suffix?: string;
  maxItems?: number;
}) {
  const rows = data.slice(0, maxItems);
  const maxValue = Math.max(...rows.map((item) => toNumber(item[valueKey])), 1);

  return (
    <div className="space-y-3 overflow-auto pr-1">
      {rows.map((item, index) => {
        const value = toNumber(item[valueKey]);
        const formatted = Number.isInteger(value) ? String(value) : value.toFixed(2);
        return (
          <div key={`${labelKey}-${index}`} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-slate-700">{String(item[labelKey])}</span>
              <span className="whitespace-nowrap font-semibold text-slate-900">
                {formatted}
                {suffix}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${(value / maxValue) * 100}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function VerticalBarChart({
  data,
  labelKey,
  valueKey,
  color,
  suffix = ''
}: {
  data: Datum[];
  labelKey: string;
  valueKey: string;
  color: string;
  suffix?: string;
}) {
  const maxValue = Math.max(...data.map((item) => toNumber(item[valueKey])), 1);

  return (
    <div className="flex h-full items-end gap-3 overflow-x-auto pb-6">
      {data.map((item, index) => {
        const value = toNumber(item[valueKey]);
        const formatted = Number.isInteger(value) ? String(value) : value.toFixed(2);
        return (
          <div key={`${labelKey}-${index}`} className="flex min-w-[4.5rem] flex-1 flex-col items-center justify-end gap-2">
            <span className="text-xs font-semibold text-slate-700">
              {formatted}
              {suffix}
            </span>
            <div className="flex h-40 w-full items-end rounded-t-xl bg-slate-100 px-2">
              <div
                className="w-full rounded-t-lg"
                style={{ height: `${(value / maxValue) * 100}%`, backgroundColor: color }}
              />
            </div>
            <span className="line-clamp-2 text-center text-xs text-slate-600">{String(item[labelKey])}</span>
          </div>
        );
      })}
    </div>
  );
}

export function DonutChart({
  data,
  labelKey,
  valueKey,
  colors
}: {
  data: Datum[];
  labelKey: string;
  valueKey: string;
  colors: string[];
}) {
  const total = data.reduce((sum, item) => sum + toNumber(item[valueKey]), 0);
  let current = 0;
  const segments = data.map((item, index) => {
    const value = toNumber(item[valueKey]);
    const start = total === 0 ? 0 : (current / total) * 360;
    current += value;
    const end = total === 0 ? 0 : (current / total) * 360;
    return `${colors[index % colors.length]} ${start}deg ${end}deg`;
  });

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 md:flex-row">
      <div
        className="relative h-44 w-44 rounded-full"
        style={{ background: segments.length ? `conic-gradient(${segments.join(', ')})` : '#e2e8f0' }}
      >
        <div className="absolute inset-7 rounded-full bg-white" />
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <div>
            <div className="text-2xl font-bold text-slate-900">{total}</div>
            <div className="text-xs text-slate-500">합계</div>
          </div>
        </div>
      </div>
      <div className="w-full space-y-2 text-sm">
        {data.map((item, index) => (
          <div key={`${labelKey}-${index}`} className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-slate-700">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
              {String(item[labelKey])}
            </span>
            <span className="font-semibold text-slate-900">{toNumber(item[valueKey])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
