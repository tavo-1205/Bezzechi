/**
 * StatsCharts — evolución de puntos de temporada, con acabado de telemetría.
 *
 * Gráfica Recharts: área con gradiente de Bezzecchi + línea del líder,
 * riel de lectura superior (cifras `.num` + etiquetas `.font-cond`), ejes con
 * tipografía HUD y tooltip sólido y legible (contraste AA sobre carbono).
 * `compact` reduce la altura y oculta el riel de lectura. Respeta
 * `prefers-reduced-motion` (sin animaciones de entrada) y ofrece un estado
 * vacío amable. Las props públicas NO cambian (CONTRACTS §5).
 */
import { useId } from 'react';
import type { ReactElement } from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipContentProps, XAxisTickContentProps, YAxisTickContentProps } from 'recharts';
import type { EvolutionPoint } from '../data/api';

const ACCENT = '#ff4d00';
const MIST = '#f6f6f8';
const ASH = '#9a9aa4';

/** Etiqueta de eje estilo HUD: Barlow Condensed + cifras tabulares (`.num`). */
const AXIS_TICK_CLS = 'fill-ash font-cond num text-[11px] tracking-[0.04em]';

function XAxisTick(props: XAxisTickContentProps): ReactElement {
  const value = props.payload?.value ?? '';
  return (
    <text x={props.x} y={props.y} dy={8} textAnchor={props.textAnchor} className={AXIS_TICK_CLS}>
      {String(value)}
    </text>
  );
}

function YAxisTick(props: YAxisTickContentProps): ReactElement {
  const value = props.payload?.value ?? '';
  return (
    <text x={props.x} y={props.y} dy={3} textAnchor={props.textAnchor} className={AXIS_TICK_CLS}>
      {String(value)}
    </text>
  );
}

function ChartTooltip({ active, payload, label }: TooltipContentProps): ReactElement | null {
  if (!active || payload.length === 0) return null;

  const rawName = payload[0]?.payload?.name;
  const roundName = typeof rawName === 'string' ? rawName : null;

  return (
    /* Superficie sólida (ink 95 %) para garantizar AA sobre cualquier fondo */
    <div
      aria-hidden="true"
      className="glass min-w-[9.5rem] rounded-lg border border-line/80 bg-ink/95 px-3 py-2 shadow-xl"
    >
      <p className="font-cond text-[11px] tracking-[0.2em] text-ash uppercase">
        {roundName ?? String(label ?? '')}
        {roundName !== null && label !== undefined && label !== roundName ? (
          <span className="ml-1.5 text-mist">· {String(label)}</span>
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
      <div className="glass rounded-2xl p-8 text-center" role="status">
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

  const gap = last.leaderPoints - last.points;
  const gapText =
    gap > 0
      ? `−${gap} pts vs líder`
      : gap < 0
        ? `+${Math.abs(gap)} pts sobre el líder`
        : 'igualado con el líder';

  const ariaLabel =
    `Evolución de puntos: ${bezzecchiName} frente a ${leaderName} a lo largo de ` +
    `${evolution.length} ${evolution.length === 1 ? 'ronda' : 'rondas'}. Última ronda ` +
    `(${last.name}): ${last.points} puntos de ${bezzecchiName} y ${last.leaderPoints} de ${leaderName}` +
    `${gap !== 0 ? `, ${gapText}` : ''}.`;

  return (
    <div
      className={`rounded-2xl border border-line/60 bg-carbon/40 ${compact ? 'p-2' : 'p-4 md:p-5'}`}
    >
      {/* Riel de lectura: leyenda + últimas cifras (telemetría) */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1 pb-2">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: ACCENT }}
            />
            <span className="font-cond text-[11px] tracking-[0.15em] text-mist uppercase">
              {bezzecchiName}
            </span>
            <span className="num font-display text-sm text-accent">{last.points}</span>
          </li>
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-0.5 w-4 shrink-0 rounded-full"
              style={{ background: MIST }}
            />
            <span className="font-cond text-[11px] tracking-[0.15em] text-ash uppercase">
              {leaderName}
            </span>
            <span className="num font-display text-sm text-mist">{last.leaderPoints}</span>
          </li>
        </ul>

        {compact ? null : (
          <p className="font-cond num text-[11px] tracking-[0.16em] text-ash uppercase">
            Ronda <span className="text-mist">{last.round}</span> ·{' '}
            <span className={gap > 0 ? 'text-accent' : 'text-mist'}>{gapText}</span>
          </p>
        )}
      </div>

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
              tick={XAxisTick}
              interval="preserveStartEnd"
              minTickGap={14}
            />
            <YAxis
              width={44}
              tickLine={false}
              axisLine={false}
              tick={YAxisTick}
              tickMargin={6}
              allowDecimals={false}
            />

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
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="font-cond num px-1 pt-1 text-[10px] tracking-[0.18em] text-ash uppercase">
        Puntos por ronda · eje Y en pts
      </p>
    </div>
  );
}
