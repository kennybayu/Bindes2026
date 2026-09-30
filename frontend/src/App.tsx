import { Routes, Route } from "react-router-dom";
import AppShell from "@/components/AppShell";
import Dashboard from "@/pages/Dashboard";
import Lapak from "@/pages/Lapak";
import Pembayaran from "@/pages/Pembayaran";
import ScanQr from "@/pages/ScanQr";
import { Toaster } from "@/components/ui/sonner";

// Satu <Route> per halaman di src/pages; BrowserRouter sudah membungkus di main.tsx.
export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/lapak" element={<Lapak />} />
        <Route path="/pembayaran" element={<Pembayaran />} />
        <Route path="/scan-qr" element={<ScanQr />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
      <Toaster />
    </AppShell>
  );
}
