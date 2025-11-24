import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rain - Meditation App",
  description: "Quit smoking and find peace with AI-guided meditation.",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Rain" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className="antialiased font-sans"
      >
        {process.env.NODE_ENV === 'production' && (
          <script
            id="pwa-register"
            dangerouslySetInnerHTML={{
              __html: `if ('serviceWorker' in navigator) {window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})})}`,
            }}
          />
        )}
        {children}
      </body>
    </html>
  );
}
