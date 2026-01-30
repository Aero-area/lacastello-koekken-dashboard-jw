import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Dashboard } from "@/pages/Dashboard";
import { Login } from "@/pages/Login";
import { Settings } from "@/pages/Settings";
import { History } from "@/pages/History";
import { Delivery } from "@/pages/Delivery";
import { Menu } from "@/pages/Menu";
import { Customers } from "@/pages/Customers";
import { AuthGuard } from "@/components/AuthGuard";
import NotFound from "@/pages/NotFound";

const App = () => (
  <div className="h-full">
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/settings" element={
          <AuthGuard>
            <Settings />
          </AuthGuard>
        } />
        <Route path="/history" element={
          <AuthGuard>
            <History />
          </AuthGuard>
        } />
        <Route path="/delivery" element={
          <AuthGuard>
            <div className="h-screen">
              <Delivery />
            </div>
          </AuthGuard>
        } />
        <Route path="/menu" element={
          <AuthGuard>
            <Menu />
          </AuthGuard>
        } />
        <Route path="/customers" element={
          <AuthGuard>
            <Customers />
          </AuthGuard>
        } />
        <Route path="/" element={
          <AuthGuard>
            <Dashboard />
          </AuthGuard>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </div>
);

export default App;
