import { DashboardPage } from "../../components/dashboard-page";
import { getAuditErrorMessage } from "../../lib/audit/errors";
import { runAuditForUrl } from "../../lib/audit/scanner";
import type { Audit } from "../../lib/types";

type DashboardRouteProps = {
  searchParams: Promise<{ site?: string }>;
};

export default async function DashboardRoute({
  searchParams,
}: DashboardRouteProps) {
  const { site } = await searchParams;
  const initialSiteUrl = site ?? "https://demo.mend.local/";
  let initialAudit: Audit | null = null;
  let initialError = "";

  try {
    initialAudit = await runAuditForUrl(initialSiteUrl);
  } catch (error) {
    initialError = getAuditErrorMessage(error);
  }

  return (
    <DashboardPage
      initialAudit={initialAudit}
      initialError={initialError}
      initialSiteUrl={initialSiteUrl}
    />
  );
}
