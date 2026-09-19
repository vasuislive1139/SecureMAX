import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { RegisterKYCPage } from "./pages/RegisterKYCPage";
import { CryptoLoginPage } from "./pages/CryptoLoginPage";
import { UserDashboardPage } from "./pages/UserDashboardPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { ManagerDashboardPage } from "./pages/ManagerDashboardPage";
import { AuditorDashboardPage } from "./pages/AuditorDashboardPage";
import { BlockchainHeroAnimation } from "./components/BlockchainHeroAnimation";

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>("login");
  // Show hero animation only once on initial load, before login
  const [showAnimation, setShowAnimation] = useState<boolean>(true);

  // Full-screen hero plays first, before any login UI
  if (!isAuthenticated && showAnimation) {
    return (
      <BlockchainHeroAnimation onComplete={() => setShowAnimation(false)} />
    );
  }

  const renderContent = () => {
    if (!isAuthenticated) {
      if (currentPage === "register") {
        return <RegisterKYCPage onSuccess={() => setCurrentPage("login")} />;
      }
      return (
        <CryptoLoginPage
          onSuccess={(role) => {
            if (role === "ADMIN") setCurrentPage("admin-dashboard");
            else if (role === "MANAGER") setCurrentPage("manager-dashboard");
            else if (role === "AUDITOR") setCurrentPage("auditor-dashboard");
            else setCurrentPage("dashboard");
          }}
        />
      );
    }

    switch (currentPage) {
      case "admin-dashboard":
        return <AdminDashboardPage />;
      case "manager-dashboard":
        return <ManagerDashboardPage />;
      case "auditor-dashboard":
        return <AuditorDashboardPage />;
      case "dashboard":
      default:
        return <UserDashboardPage />;
    }
  };

  return (
    <DashboardLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderContent()}
    </DashboardLayout>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
