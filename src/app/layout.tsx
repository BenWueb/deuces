import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

// Poppins has no variable version on Google Fonts, so the weights the UI
// actually uses are listed explicitly: normal, medium, semibold and bold.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Deuces — Find Tennis Courts",
    template: "%s | Deuces",
  },
  description:
    "Discover tennis courts near you. Rate courts, share photos, and find your next match.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Browser extensions inject attributes on html/body before hydration.
    <html
      lang="en"
      className={`${poppins.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full bg-background text-foreground"
        suppressHydrationWarning
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
