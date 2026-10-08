import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { AppBackdrop } from "@/components/layout/app-backdrop";

export const metadata: Metadata = {
  title: "Furniche — Engineer Project Documentation",
  description: "Document furnishing progress and share real-time updates with clients.",
  icons: { icon: "/logo.png" },
};

export const viewport: Viewport = {
  themeColor: "#faf8f5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppBackdrop />
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
