import type { ReactNode } from "react";

export const metadata = {
  title: "Mend demo site",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/analytics.js"></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
