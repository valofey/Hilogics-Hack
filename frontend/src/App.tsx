import { useCallback, useState } from "react";

import { LandingHero } from "@/components/landing/LandingHero";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { api } from "@/lib/api";
import type { DashboardData, OrganizationInfo } from "@/types/dashboard";

type ViewState = "landing" | "dashboard";

type ProductFormValues = {
  productName: string;
  tnVedCode: string;
};

const fallbackOrganization: OrganizationInfo = {
  name: "\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u0430",
  inn: null
};

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
      const response = await api.createDashboard({
        product: { name: values.productName, code: values.tnVedCode },
        organization
      });
      setDashboardData(response.dashboard);
      setView("dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u0444\u043e\u0440\u043c\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043e\u0442\u0447\u0451\u0442");
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

  if (view === "landing" || !dashboardData) {
    return <LandingHero loading={loading} onSubmit={handleCreateDashboard} error={error} />;
  }

  return (
    <DashboardView
      data={dashboardData}
      onRequestOrganizationUpdate={handleOrganizationUpdate}
      processing={processing}
      onReset={() => {
        setDashboardData(null);
        setView("landing");
      }}
    />
  );
}

export default App;
