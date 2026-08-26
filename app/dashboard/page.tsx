import { DashboardPage } from "../../components/dashboard-page";

type DashboardRouteProps = {
  searchParams: Promise<{ site?: string }>;
};

export default async function DashboardRoute({
  searchParams,
}: DashboardRouteProps) {
  const { site } = await searchParams;
  return <DashboardPage initialSiteUrl={site ?? "https://demo.mend.local/"} />;
}
