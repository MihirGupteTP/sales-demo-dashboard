import Link from "next/link";
import { Suspense } from "react";
import { MeetingsTable } from "@/components/MeetingsTable";
import { TimeFilter } from "@/components/TimeFilter";
import { BarChart3, TableProperties } from "lucide-react";

export default function MeetingsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="size-5 text-primary" />
              <h1 className="text-base font-semibold">Sales Demo Dashboard</h1>
            </div>
            <nav className="flex items-center gap-1">
              <Link
                href="/"
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <BarChart3 className="size-3.5" />
                Dashboard
              </Link>
              <Link
                href="/meetings"
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium bg-muted text-foreground"
              >
                <TableProperties className="size-3.5" />
                All Meetings
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">All Meetings</h2>
            <p className="text-sm text-muted-foreground">
              Full drill-down view — click any row for details
            </p>
          </div>
          <TimeFilter />
        </div>

        <Suspense>
          <MeetingsTable />
        </Suspense>
      </main>
    </div>
  );
}
