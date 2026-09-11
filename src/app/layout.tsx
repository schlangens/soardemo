import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"], weight: ["300", "400", "500", "600"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["300", "400", "500"] });

const SITE = "https://soardemo.scottslab.io";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "SOAR Lab · Scott's Lab",
  description:
    "A SOAR layer between a Wazuh detection and a pfSense block: Shuffle enrichment, verdict rules, an n8n approve gate and DFIR-IRIS cases. Video, write-up and code.",
  openGraph: {
    title: "SOAR Lab: a SOAR layer between the SIEM detection and the firewall block",
    description: "Wazuh · Shuffle · n8n · DFIR-IRIS · pfSense. Built and tested end to end in a home lab.",
    url: SITE,
    siteName: "Scott's Lab",
    images: [{ url: "/media/soar-poster.jpg", width: 1280, height: 720 }],
    type: "website",
  },
  twitter: { card: "summary_large_image", site: "@scottslabio" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark ${grotesk.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <div className="bg-gradient" aria-hidden="true" />
        <div className="bg-grid" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
