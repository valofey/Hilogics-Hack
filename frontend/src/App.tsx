import { useCallback, useState } from "react";

import { LandingHero } from "@/components/landing/LandingHero";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { api } from "@/lib/api";
import type { DashboardData, OrganizationInfo } from "@/types/dashboard";

type ViewState = "landing" | "dashboard";

type ProductFormValues = {
  productName: string;
  tnVedCode: string;
};

const fallbackOrganization: OrganizationInfo = {
  name: "АО «Компания»",
  inn: null
};

const DEFAULT_PRODUCT_NAME = "Товар для проверки";

function App() {
  const [view, setView] = useState<ViewState>("landing");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleCreateDashboard = useCallback(async (values: ProductFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const organization = dashboardData?.organization ?? fallbackOrganization;
      const sanitizedCode = values.tnVedCode.replace(/\s+/g, "");
      const productName = values.productName.trim() || DEFAULT_PRODUCT_NAME;
      const response = await api.createDashboard({
        product: { name: productName, code: sanitizedCode },
        organization
      });
      setDashboardData(response.dashboard);
      setView("dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сформировать отчёт");
    } finally {
      setLoading(false);
    }
  }, [dashboardData?.organization]);

  const handleOrganizationUpdate = useCallback(
    async (organization: OrganizationInfo) => {
      if (!dashboardData) {
        return null;
      }
      setProcessing(true);
      try {
        const response = await api.createDashboard({
          product: dashboardData.product,
          organization
        });
        setDashboardData(response.dashboard);
        return response.dashboard;
      } finally {
        setProcessing(false);
      }
    },
    [dashboardData]
  );

  const isLanding = view === "landing" || !dashboardData;

  const mainContent = isLanding ? (
    <LandingHero loading={loading} onSubmit={handleCreateDashboard} error={error} />
  ) : (
    <DashboardView
      data={dashboardData!}
      onRequestOrganizationUpdate={handleOrganizationUpdate}
      processing={processing}
      onReset={() => {
        setDashboardData(null);
        setView("landing");
      }}
    />
  );

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <SiteHeader />
      <main className="flex-1 bg-white">{mainContent}</main>
    </div>
  );
}

export default App;