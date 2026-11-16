"use client";

import {
  flexRender,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useLegacyTable,
} from "@tanstack/react-table/legacy";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AdminTableColumn<TData extends object> = ColumnDef<any, TData, unknown>;

export interface DataTableProps<TData extends object> {
  data: TData[];
  columns: AdminTableColumn<TData>[];
  searchPlaceholder?: string;
  searchPredicate?: (row: TData, query: string) => boolean;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: React.ReactNode;
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  pageSize?: number;
  serverTotalCount?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export function DataTable<TData extends object>({
  data,
  columns,
  searchPlaceholder = "Rechercher...",
  searchPredicate,
  emptyTitle,
  emptyDescription,
  emptyAction,
  isLoading = false,
  errorMessage = null,
  onRetry,
  pageSize = 15,
  serverTotalCount,
  currentPage,
  onPageChange,
}: DataTableProps<TData>) {
  const [search, setSearch] = React.useState("");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  const filteredData = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    if (searchPredicate) {
      return data.filter((row) => searchPredicate(row, q));
    }
    return data.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [data, search, searchPredicate]);

  const table = useLegacyTable<TData>({
    data: filteredData,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <ErrorState
        title="Chargement impossible"
        description={errorMessage}
        retryLabel={onRetry ? "Réessayer" : undefined}
        onRetry={onRetry}
      />
    );
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  const rows = table.getRowModel().rows;
  const pageCount = Math.max(1, table.getPageCount());
  const activePage = currentPage ?? pagination.pageIndex + 1;
  const totalLabel = serverTotalCount ?? filteredData.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-muted"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="pl-9"
          />
        </div>
        <p className="text-xs font-medium text-fg-muted">
          {totalLabel} {totalLabel > 1 ? "éléments" : "élément"}
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1.5 text-left font-semibold text-fg-muted hover:text-fg"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {(pageCount > 1 || (onPageChange && serverTotalCount && serverTotalCount > pageSize)) && (
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs text-fg-muted">
            Page {activePage} / {pageCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={onPageChange ? activePage <= 1 : !table.getCanPreviousPage()}
              onClick={() => (onPageChange ? onPageChange(activePage - 1) : table.previousPage())}
            >
              Précédent
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={onPageChange ? activePage >= pageCount : !table.getCanNextPage()}
              onClick={() => (onPageChange ? onPageChange(activePage + 1) : table.nextPage())}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
