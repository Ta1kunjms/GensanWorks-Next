import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Column<Row> = {
  header: string;
  render: (row: Row) => ReactNode;
};

type MiniTableProps<Row> = {
  title: string;
  rows: Row[];
  rowKey: (row: Row) => string;
  columns: Column<Row>[];
  emptyLabel?: string;
};

export function MiniTable<Row>({ title, rows, rowKey, columns, emptyLabel = "No records available." }: MiniTableProps<Row>) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">{emptyLabel}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  {columns.map((column) => (
                    <th key={column.header} className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={rowKey(row)} className="border-b border-slate-100 last:border-b-0">
                    {columns.map((column) => (
                      <td key={column.header} className="px-2 py-2 align-top text-slate-700">
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
