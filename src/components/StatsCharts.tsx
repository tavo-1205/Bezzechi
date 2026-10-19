/**
 * StatsCharts — evolución de puntos de la temporada.
 *
 * Gráfica Recharts: área con gradiente de Bezzecchi + línea del líder,
 * tooltip personalizado con `.glass`, eje X con `shortName` y eje Y oculto.
 * `compact` reduce la altura y oculta la leyenda. Respeta `prefers-reduced-motion`
 * (sin animaciones de entrada) y ofrece un estado vacío amable.
 */
import { useId } from 'react';
import type { ReactElement } from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type { EvolutionPoint } from '../data/api';

const ACCENT = '#ff4d00';
const MIST = '#f6f6f8';
const ASH = '#9a9aa4';

function ChartTooltip({ active, payload, label }: TooltipContentProps): ReactElement | null {
  if (!active || payload.length === 0) return null;

  const rawName = payload[0]?.payload?.name;
  const roundName = typeof rawName === 'string' ? rawName : null;

  return (
    <div className="glass rounded-lg px-3 py-2 shadow-xl">
      <p className="font-cond text-[11px] tracking-[0.2em] text-ash uppercase">
        {roundName ?? String(label ?? '')}
        {roundName !== null && label !== undefined && label !== roundName ? (
          <span className="ml-1.5 text-mist">· {label}</span>
        ) : null}
      </p>
      <ul className="mt-1.5 space-y-1">
        {payload.map((entry, index) => {
          const value =
            typeof entry.value === 'number'
              ? entry.value.toLocaleString('es-ES')
              : String(entry.value ?? '—');
          return (
            <li key={index} className="flex items-center gap-2 text-xs">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: entry.color ?? ASH }}
              />
              <span className="text-mist">{entry.name}</span>
              <span className="num ml-auto font-semibold" style={{ color: entry.color ?? MIST }}>
                {value}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function StatsCharts({
  evolution,
  bezzecchiName = 'Marco Bezzecchi',
  leaderName = 'Líder',
  compact = false,
}: {
  evolution: EvolutionPoint[];
  bezzecchiName?: string;
  leaderName?: string;
  compact?: boolean;
}): ReactElement {
  const reduced = useReducedMotion() === true;
  const fillId = `bz-area-${useId().replace(/:/g, '')}`;

  if (evolution.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <p className="font-cond text-xs tracking-[0.3em] text-accent uppercase">
          Aún sin evolución
        </p>
        <p className="mt-3 text-sm text-ash">
          La curva de puntos aparecerá en cuanto haya resultados que comparar temporada a temporada.
        </p>
      </div>
    );
  }

  const last = evolution[evolution.length - 1];
  const height = compact ? 220 : 320;
  const ariaLabel =
    `Evolución de puntos: ${bezzecchiName} frente a ${leaderName} a lo largo de ` +
    `${evolution.length} ${evolution.length === 1 ? 'ronda' : 'rondas'}. Última ronda ` +
    `(${last.name}): ${last.points} puntos de ${bezzecchiName} y ${last.leaderPoints} de ${leaderName}.`;

  return (
    <div
      className={`rounded-2xl border border-line/60 bg-carbon/40 ${compact ? 'p-2' : 'p-4 md:p-5'}`}
    >
      <div role="img" aria-label={ariaLabel} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={evolution} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT} stopOpacity={0.45} />
                <stop offset="95%" stopColor={ACCENT} stopOpacity={0.04} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} stroke="rgba(246,246,248,0.07)" strokeDasharray="4 8" />
            <XAxis
              dataKey="shortName"
              tickLine={false}
              axisLine={false}
              tick={{ fill: ASH, fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={14}
            />
            <YAxis hide />

            <Tooltip
              content={ChartTooltip}
              cursor={{ stroke: 'rgba(246,246,248,0.25)', strokeDasharray: '4 4' }}
            />

            <Area
              type="monotone"
              dataKey="points"
              name={bezzecchiName}
              stroke={ACCENT}
              strokeWidth={2.5}
              fill={`url(#${fillId})`}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#08080a', fill: ACCENT }}
              isAnimationActive={!reduced}
              animationDuration={900}
            />
            <Line
              type="monotone"
              dataKey="leaderPoints"
              name={leaderName}
              stroke={MIST}
              strokeWidth={1.75}
              strokeDasharray="6 5"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#08080a', fill: MIST }}
              isAnimationActive={!reduced}
              animationDuration={900}
            />

            {compact ? null : (
              <Legend
                height={30}
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="font-cond text-[11px] tracking-[0.15em] text-ash uppercase">
                    {value}
                  </span>
                )}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
