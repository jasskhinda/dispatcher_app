import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import LoadingProvider from "./components/LoadingProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Compassionate Care Transportation Dispatcher",
  description: "Dispatch application for Compassionate Care Transportation",
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        {/* Google Maps Script - Load globally for all pages */}
        <Script
          id="google-maps"
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initGoogleMapsGlobal`}
          strategy="lazyOnload"
        />
        
        <Script id="google-maps-init" strategy="lazyOnload">
          {`
            window.initGoogleMapsGlobal = function() {
              console.log('🗺️ Google Maps global callback fired');
              window.dispatchEvent(new CustomEvent('googleMapsReady'));
            };
          `}
        </Script>
        
        <ThemeProvider>
          <AuthProvider>
            <LoadingProvider>
              {children}
            </LoadingProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
