import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  ScanLine,
  Store,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { endSession } from "@/lib/session";
import type { Payment } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/lapak", label: "Pendataan Lapak", icon: Store },
  { to: "/pembayaran", label: "Pembayaran", icon: ReceiptText, isPayments: true },
  { to: "/scan-qr", label: "Pindai QR", icon: ScanLine },
];

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-3 px-5" data-testid="brand-desa">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-900">
        <Landmark className="size-5" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-bold tracking-tight text-white">Desa Adat Jimbaran</span>
        <span className="text-xs text-slate-400">Lapak & Pembayaran</span>
      </span>
    </Link>
  );
}

function SidebarNav({
  pendingCount,
  onNavigate,
}: {
  pendingCount: number;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          data-testid={`nav-${item.to === "/" ? "dashboard" : item.to.slice(1)}`}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-slate-800 text-amber-400"
                : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
            )
          }
        >
          <item.icon className="size-4 shrink-0" />
          <span className="flex-1">{item.label}</span>
          {item.isPayments && pendingCount > 0 && (
            <span
              data-testid="badge-menunggu-konfirmasi"
              className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-slate-900"
            >
              {pendingCount}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

/** Jam pasar WITA (tampilan saja — tanggal bisnis tetap dari server). */
function ClockWita() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const time = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);
  const date = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  return (
    <div className="hidden text-right sm:block" data-testid="jam-wita">
      <div className="font-mono text-sm font-semibold tracking-wider text-foreground">
        {time} <span className="text-amber-600">WITA</span>
      </div>
      <div className="text-xs text-muted-foreground">{date}</div>
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const { data: pending } = useQuery({
    queryKey: ["payments", "pending"],
    queryFn: () => apiGet<Payment[]>("/payments?status=menunggu"),
    retry: false,
  });
  const pendingCount = pending?.length ?? 0;

  return (
    <Sheet open={navOpen} onOpenChange={setNavOpen}>
      <div className="min-h-svh bg-background">
        {/* Sidebar desktop */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-sidebar lg:flex">
          <div className="flex h-16 items-center border-b border-slate-800">
            <Brand />
          </div>
          <SidebarNav pendingCount={pendingCount} />
          <div className="mt-auto px-5 py-4 text-xs text-slate-500">
            Pasar Adat Jimbaran • v1.0
          </div>
        </aside>

        <div className="lg:pl-64">
          {/* Topbar */}
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
            <SheetTrigger
              data-testid="btn-menu-mobile"
              className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted lg:hidden"
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <span className="text-sm font-bold tracking-tight text-foreground lg:hidden">
              Desa Adat Jimbaran
            </span>
            <div className="ml-auto flex items-center gap-3">
              <ClockWita />
              <Link
                to="/scan-qr"
                data-testid="topbar-btn-scan-qr"
                className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}
              >
                <ScanLine data-icon="inline-start" className="size-4" />
                Pindai QR
              </Link>
              <Link
                to="/scan-qr"
                data-testid="btn-scan-mobile"
                className={cn(buttonVariants({ variant: "outline", size: "icon" }), "sm:hidden")}
              >
                <ScanLine className="size-4" />
              </Link>
              <span
                data-testid="avatar-pengelola"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-amber-400"
              >
                PA
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void endSession()}
                data-testid="btn-logout"
                title="Keluar"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
        </div>

        {/* Drawer mobile */}
        <SheetContent
          side="left"
          showCloseButton
          className="w-72 gap-0 border-slate-800 bg-sidebar p-0 text-slate-50"
        >
          <SheetHeader className="border-b border-slate-800 p-0">
            <div className="flex h-16 items-center">
              <Brand />
            </div>
            <SheetTitle className="sr-only">Navigasi</SheetTitle>
          </SheetHeader>
          <SidebarNav pendingCount={pendingCount} onNavigate={() => setNavOpen(false)} />
        </SheetContent>
      </div>
    </Sheet>
  );
}
