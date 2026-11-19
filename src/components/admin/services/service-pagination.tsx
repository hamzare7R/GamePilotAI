import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/format";

export function ServicePagination({
  page,
  pageCount,
  total,
  pageSize,
  start,
  end,
  hrefForPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  start: number;
  end: number;
  hrefForPage: (page: number) => string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Showing {formatCount(start)}–{formatCount(end)} of {formatCount(total)} · {pageSize} per page
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefForPage(page - 1)}>
              <ChevronLeft aria-hidden="true" />
              Previous
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft aria-hidden="true" />
            Previous
          </Button>
        )}
        <span className="font-mono text-[11px] text-muted-foreground">
          Page {page} / {pageCount}
        </span>
        {page < pageCount ? (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefForPage(page + 1)}>
              Next
              <ChevronRight aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next
            <ChevronRight aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}
