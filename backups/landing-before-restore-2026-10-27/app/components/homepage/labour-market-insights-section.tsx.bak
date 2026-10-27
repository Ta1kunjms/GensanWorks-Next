"use client";

import React, { useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, BarChart3, Building2, Download, Info, Lightbulb, Table2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { formatCount, formatPeso } from "@/lib/utils";
import {
  buildCsv,
  buildInsightTables,
  csvFileName,
  formatUpdatedAt,
  keyFindings,
  sortInsightRows,
  type InsightCell,
  type InsightColumn,
  type InsightTable,
  type LaborMarketResponse,
} from "@/lib/labor-market";
import { DataUnavailable } from "./landing-shared";

// Labour Market Snapshot: one tabbed hub replacing the separate sector, skills,
// skill-gap, salary, work-setup and city sections. Every chart, table, summary,
// finding and CSV comes from the same server-loaded aggregates. Charts are hidden
// from screen readers; the summary sentence and the data table carry the numbers.

// Bar colours with at least 3:1 contrast on white: blue-700 (about 6.7:1) and amber-700 (about 5:1).
const SERIES_COLORS = ["#1d4ed8", "#b45309"];
const CHART_LIMIT = 10;

type SortState = { key: string; direction: "ascending" | "descending" } | null;

function formatCell(column: InsightColumn | undefined, value: InsightCell): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return column?.peso ? formatPeso(value).replace(/\.00$/, "") : formatCount(value);
  return value;
}

function truncate(text: string, max = 26): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function InsightChart({ table }: { table: InsightTable }) {
  const data = table.rows.slice(0, CHART_LIMIT);
  const peso = table.columns.find((column) => column.key === table.chart.series[0]?.key)?.peso;
  const format = (value: unknown) => {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return "";
    return peso ? formatPeso(n).replace(/\.00$/, "") : formatCount(n);
  };

  if (data.length === 0) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-600">
        No data to chart yet.
      </div>
    );
  }

  return (
    <div aria-hidden="true" className="h-[420px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 8 }} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#475569" }} tickFormatter={format} />
          <YAxis
            type="category"
            dataKey={table.chart.categoryKey}
            width={180}
            interval={0}
            tick={{ fontSize: 12, fill: "#334155" }}
            tickFormatter={(value: string) => truncate(String(value))}
          />
          <Tooltip formatter={(value: number, name: string) => [format(value), name]} />
          {table.chart.series.length > 1 ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null}
          {table.chart.series.map((series, index) => (
            <Bar key={series.key} dataKey={series.key} name={series.name} fill={SERIES_COLORS[index % SERIES_COLORS.length]} radius={[0, 6, 6, 0]}>
              <LabelList dataKey={series.key} position="right" formatter={format} fill="#0f172a" fontSize={12} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function downloadCsv(table: InsightTable, rows: InsightTable["rows"]) {
  const csv = buildCsv(table.columns, rows);
  // BOM so spreadsheet apps read the file as UTF-8.
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = csvFileName(table.id, new Date());
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function SortableTable({
  table,
  rows,
  sort,
  onSort,
  tableId,
}: {
  table: InsightTable;
  rows: InsightTable["rows"];
  sort: SortState;
  onSort: (key: string) => void;
  tableId: string;
}) {
  if (table.rows.length === 0) {
    return <p className="text-sm text-slate-600">No rows to show yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table id={tableId} className="w-full text-left text-sm">
        <caption className="sr-only">{table.caption}. Column headers are buttons that sort the table.</caption>
        <thead>
          <tr className="border-b border-slate-200 text-slate-700">
            {table.columns.map((column) => {
              const ariaSort = sort && sort.key === column.key ? sort.direction : "none";
              const Icon = ariaSort === "none" ? ArrowUpDown : ariaSort === "ascending" ? ArrowUp : ArrowDown;
              return (
                <th key={column.key} scope="col" aria-sort={ariaSort} className={`py-1 ${column.numeric ? "text-right" : ""}`}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onSort(column.key)}
                    className={`h-8 px-2 font-semibold text-slate-800 ${column.numeric ? "ml-auto" : "-ml-2"}`}
                  >
                    {column.label}
                    <Icon className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${String(row[table.columns[0]!.key])}-${index}`} className="border-b border-slate-100">
              {table.columns.map((column, columnIndex) =>
                columnIndex === 0 ? (
                  <th key={column.key} scope="row" className="py-2 pr-3 font-medium text-slate-900">
                    {formatCell(column, row[column.key] ?? null)}
                  </th>
                ) : (
                  <td key={column.key} className="py-2 pr-2 text-right tabular-nums text-slate-800">
                    {formatCell(column, row[column.key] ?? null)}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LabourMarketInsightsSection({ market }: { market: LaborMarketResponse | null }) {
  const tables = useMemo(() => buildInsightTables(market), [market]);
  const findings = useMemo(() => keyFindings(market), [market]);
  const updatedAt = formatUpdatedAt(market?.asOf);
  const employersHiring = market?.employersHiringNow ?? [];

  const [active, setActive] = useState(0);
  const [showTable, setShowTable] = useState(true);
  const [sorts, setSorts] = useState<Record<string, SortState>>({});
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const current = tables[active]!;
  const sort = sorts[current.id] ?? null;
  const rows = sort ? sortInsightRows(current.rows, sort.key, sort.direction) : current.rows;

  const selectTab = (index: number) => {
    const next = (index + tables.length) % tables.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") selectTab(index + 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") selectTab(index - 1);
    else if (event.key === "Home") selectTab(0);
    else if (event.key === "End") selectTab(tables.length - 1);
    else return;
    event.preventDefault();
  };

  const onSort = (key: string) => {
    setSorts((previous) => {
      const existing = previous[current.id];
      const column = current.columns.find((entry) => entry.key === key);
      const direction: "ascending" | "descending" =
        existing?.key === key
          ? existing.direction === "ascending" ? "descending" : "ascending"
          : column?.numeric ? "descending" : "ascending";
      return { ...previous, [current.id]: { key, direction } };
    });
  };

  const tableId = `lm-table-${current.id}`;

  return (
    <section id="labour-market" aria-labelledby="labour-market-heading" className="w-full scroll-mt-24 bg-slate-50 py-32 relative overflow-hidden">
      <div aria-hidden="true" className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-blue-700 text-xs font-bold tracking-widest uppercase mb-6 shadow-sm">
            <BarChart3 className="w-4 h-4" aria-hidden="true" />
            Labour Market Insights
          </div>
          <h2 id="labour-market-heading" className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Labour Market <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Snapshot</span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Open vacancies, skills, pay and locations from GensanWorks job posts and jobseeker profiles.
            {updatedAt ? <> Updated <time dateTime={market?.asOf}>{updatedAt}</time>.</> : null}
          </p>
        </div>

        {!market ? (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60">
            <DataUnavailable />
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* Tabs, chart, table */}
            <div className="min-w-0 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/60">
              <div role="tablist" aria-label="Labour market views" className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
                {tables.map((table, index) => {
                  const selected = index === active;
                  return (
                    <Button
                      key={table.id}
                      ref={(element) => {
                        tabRefs.current[index] = element;
                      }}
                      id={`lm-tab-${table.id}`}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-controls={`lm-panel-${table.id}`}
                      tabIndex={selected ? 0 : -1}
                      variant="ghost"
                      size="sm"
                      onClick={() => setActive(index)}
                      onKeyDown={(event) => onTabKeyDown(event, index)}
                      className={`rounded-full px-4 font-semibold ${
                        selected ? "bg-blue-700 text-white hover:bg-blue-800 hover:text-white" : "bg-slate-100 text-slate-800 hover:bg-blue-50 hover:text-blue-800"
                      }`}
                    >
                      {table.label}
                    </Button>
                  );
                })}
              </div>

              {tables.map((table, index) => {
                const selected = index === active;
                return (
                  <div
                    key={table.id}
                    id={`lm-panel-${table.id}`}
                    role="tabpanel"
                    aria-labelledby={`lm-tab-${table.id}`}
                    tabIndex={0}
                    hidden={!selected}
                    className="min-h-[560px] pt-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
                  >
                    {selected ? (
                      <>
                        <h3 className="text-xl font-bold text-slate-900">{table.title}</h3>
                        <p className="mt-1 mb-6 text-sm text-slate-700">{table.summary}</p>
                        <InsightChart table={table} />
                        {table.rows.length > CHART_LIMIT ? (
                          <p className="mt-2 text-xs text-slate-600">
                            Chart shows the top {CHART_LIMIT} of {table.rows.length}; the table lists all.
                          </p>
                        ) : null}

                        <div className="mt-6 flex flex-wrap items-center gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-expanded={showTable}
                            aria-controls={tableId}
                            onClick={() => setShowTable((value) => !value)}
                            className="font-semibold text-slate-900"
                          >
                            <Table2 className="mr-2 h-4 w-4" aria-hidden="true" />
                            {showTable ? "Hide data table" : "Show data table"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={table.rows.length === 0}
                            onClick={() => downloadCsv(table, rows)}
                            className="font-semibold text-slate-900"
                          >
                            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                            Download data (CSV)
                          </Button>
                        </div>

                        <div className="mt-4" hidden={!showTable}>
                          <SortableTable table={table} rows={rows} sort={sort} onSort={onSort} tableId={tableId} />
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Key findings and employers hiring now */}
            <div className="space-y-8">
              <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
                <div aria-hidden="true" className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div aria-hidden="true" className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                      <Lightbulb className="w-5 h-5 text-amber-300" />
                    </div>
                    <h3 className="text-xl font-bold">Key findings</h3>
                  </div>
                  {findings.length === 0 ? (
                    <p className="text-sm text-white/90">Not enough data yet to summarise.</p>
                  ) : (
                    <ul className="space-y-4">
                      {findings.map((finding) => (
                        <li key={finding} className="flex gap-3 text-sm leading-relaxed text-white/90">
                          <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-300" />
                          <span>{finding}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-6 text-xs text-white/80">Calculated directly from the figures in this section.</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60">
                <div className="flex items-center gap-3 mb-6">
                  <div aria-hidden="true" className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                    <Building2 className="w-5 h-5 text-blue-700" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Employers hiring now</h3>
                </div>
                {employersHiring.length === 0 ? (
                  <p className="text-sm text-slate-600">No approved employer has open posts right now.</p>
                ) : (
                  <ol className="space-y-4">
                    {employersHiring.map((employer) => (
                      <li key={employer.name} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{employer.name}</p>
                          <p className="text-xs text-slate-600 truncate">
                            {[employer.industry, employer.city].filter(Boolean).join(" · ") || "Details not listed"}
                          </p>
                        </div>
                        <p className="shrink-0 text-right text-sm tabular-nums">
                          <span className="block font-bold text-slate-900">{formatCount(employer.openVacancies)} {employer.openVacancies === 1 ? "vacancy" : "vacancies"}</span>
                          <span className="block text-xs text-slate-600">{formatCount(employer.openJobs)} {employer.openJobs === 1 ? "post" : "posts"}</span>
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </div>
        )}

        {/* About this data */}
        <details className="mt-10 bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
          <summary className="cursor-pointer font-semibold text-blue-800 inline-flex items-center gap-2">
            <Info className="h-4 w-4" aria-hidden="true" />
            About this data
          </summary>
          <div className="mt-4 grid gap-6 text-sm text-slate-700 md:grid-cols-2">
            <div className="space-y-3">
              <p>
                <span className="font-semibold text-slate-900">Sources:</span> open job posts from PESO-reviewed employers,
                jobseeker profiles (skills, including skills from listed trainings), and recorded referrals and applications on GensanWorks.
              </p>
              <p>
                <span className="font-semibold text-slate-900">Updated:</span>{" "}
                {updatedAt ? <time dateTime={market?.asOf}>{updatedAt}</time> : "not available"}. Figures refresh every 5 minutes.
              </p>
              <p className="font-semibold text-slate-900">Totals only — no personal data is shown.</p>
            </div>
            <dl className="space-y-3">
              <div>
                <dt className="font-semibold text-slate-900">Placement rate</dt>
                <dd>Referrals marked hired ÷ all referrals.</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900">Application success</dt>
                <dd>Applications marked hired ÷ all applications.</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900">Median monthly pay</dt>
                <dd>
                  Median of each post&apos;s salary_min/salary_max midpoint. Daily rates × 26 working days; weekly × 52 ÷ 12;
                  hourly × 8 hours × 26 days. Posts without a salary are left out.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900">Supply</dt>
                <dd>Active jobseekers who gave consent, are looking for work, and list the skill.</dd>
              </div>
            </dl>
          </div>
        </details>
      </div>
    </section>
  );
}
