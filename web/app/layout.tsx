import { constructMetadata, viewport } from "@/config/metadata";
import {
  geistSans,
  geistMono,
  jakarta,
  outfit,
  montserrat,
  inter,
  poppins,
  openSans,
  roboto,
} from "@/config/font";
import "@/config/globals.css";
import { ThemeProvider } from "@/config/theme-provider";
import { ThemeScript } from "@/config/theme-script";
import { AppProviders } from "@/components/providers";
import { AuditCredentialsProvider } from "@/components/audit-credentials-provider";

export const metadata = constructMetadata();
export { viewport };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const baseClasses = `${geistSans.variable} ${geistMono.variable} ${jakarta.variable} ${outfit.variable} ${montserrat.variable} ${inter.variable} ${roboto.variable} ${poppins.variable} ${openSans.variable}`;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${baseClasses} antialiased font-sans`}>
        <ThemeProvider>
          <AuditCredentialsProvider>
            <AppProviders>
              <div className="fixed inset-0">
                <div className="relative h-full overflow-auto">{children}</div>
              </div>
            </AppProviders>
          </AuditCredentialsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
