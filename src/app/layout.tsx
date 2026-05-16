import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Webinar Q&A Timer",
  description: "세미나/워크숍 Q&A 운영 대시보드",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
