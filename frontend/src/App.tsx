import { Routes, Route } from "react-router-dom";
import RequireAuth from "@/components/RequireAuth";
import AppShell from "@/components/AppShell";
import Dashboard from "@/pages/Dashboard";
import Lapak from "@/pages/Lapak";
import Login from "@/pages/Login";
import Pembayaran from "@/pages/Pembayaran";
import Pengaturan from "@/pages/Pengaturan";
import Riwayat from "@/pages/Riwayat";
import ScanQr from "@/pages/ScanQr";
import Tunggakan from "@/pages/Tunggakan";
import { Toaster } from "@/components/ui/sonner";

// /login berdiri sendiri di luar shell; semua route lain dilindungi sesi pengelola.
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Protected />} />
      </Routes>
      <Toaster />
    </>
  );
}

function Protected() {
  return (
    <RequireAuth>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/lapak" element={<Lapak />} />
          <Route path="/pembayaran" element={<Pembayaran />} />
          <Route path="/tunggakan" element={<Tunggakan />} />
          <Route path="/scan-qr" element={<ScanQr />} />
          <Route path="/riwayat" element={<Riwayat />} />
          <Route path="/pengaturan" element={<Pengaturan />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </AppShell>
    </RequireAuth>
  );
}
