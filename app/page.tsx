import Link from "next/link";
import { KPICards } from "@/components/KPICards";
import { KPIDrillDown } from "@/components/KPIDrillDown";
import { Leaderboard } from "@/components/Leaderboard";
import { CalendarView } from "@/components/CalendarView";
import { TimeFilter } from "@/components/TimeFilter";
import { BarChart3, TableProperties } from "lucide-react";

export default function Home() {
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
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium bg-muted text-foreground"
              >
                <BarChart3 className="size-3.5" />
                Dashboard
              </Link>
              <Link
                href="/meetings"
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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
        {/* Page title + filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Overview</h2>
            <p className="text-sm text-muted-foreground">Demo meeting performance across the team</p>
          </div>
          <TimeFilter />
        </div>

        {/* KPI Cards */}
        <KPICards />

        {/* Drill-down — appears when a card is clicked */}
        <KPIDrillDown />

        {/* Leaderboard + Calendar */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
          <Leaderboard />
          <CalendarView />
        </div>
      </main>
    </div>
  );
}
