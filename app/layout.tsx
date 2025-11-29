
// import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
// import Script from "next/script";
// import "./globals.css";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

// export const metadata: Metadata = {
//   title: 'FTP Authentication System',
//   description: 'Student Verification and Attendance Management',
// };

// export default function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode;
// }>) {
//   return (
//     <html lang="en">
//       <head>
//         {/* 
//           CRITICAL: Load WebSDK FIRST (required dependency)
//           Fingerprint SDK depends on WebSDK
//         */}
//         <script 
//           src="https://unpkg.com/@digitalpersona/websdk/dist/websdk.client.ui.js"
//         />
        
//         {/* 
//           THEN load Fingerprint SDK
//           This must come AFTER WebSDK
//         */}
//         <script 
//           src="https://unpkg.com/@digitalpersona/fingerprint/dist/fingerprint.sdk.js"
//         />
//       </head>
//       <body
//         className={`${geistSans.variable} ${geistMono.variable} antialiased`}
//       >
//         {children}
//       </body>
//     </html>
//   );
// }
// app/layout.tsx - PRODUCTION READY
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'FTP Authentication System',
  description: 'Student Verification and Attendance Management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* 
          CRITICAL: DigitalPersona SDK Loading Strategy
          
          The DigitalPersona SDK requires:
          1. WebSDK (base dependency)
          2. Fingerprint SDK
          
          Both must be loaded from the SAME source and version
        */}
        
        {/* Option 1: NPM CDN (RECOMMENDED) */}
        <Script
          src="https://unpkg.com/@digitalpersona/websdk@1.1.0/dist/websdk.client.ui.min.js"
          strategy="beforeInteractive"
          id="dp-websdk"
        />
        <Script
          src="https://unpkg.com/@digitalpersona/fingerprint@1.0.0/dist/fingerprint.sdk.min.js"
          strategy="beforeInteractive"
          id="dp-fingerprint"
        />

        {/* Option 2: Local files (if CDN fails) 
        <Script
          src="/js/websdk.client.ui.js"
          strategy="beforeInteractive"
          id="dp-websdk-local"
        />
        <Script
          src="/js/fingerprint.sdk.js"
          strategy="beforeInteractive"
          id="dp-fingerprint-local"
        />
        */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* SDK Loading Indicator (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <Script id="sdk-checker" strategy="afterInteractive">
            {`
              console.log('🔍 Checking DigitalPersona SDK...');
              
              function checkSDK() {
                const checks = {
                  'Window Object': typeof window !== 'undefined',
                  'Fingerprint Object': typeof Fingerprint !== 'undefined',
                  'Fingerprint.WebApi': typeof Fingerprint !== 'undefined' && typeof Fingerprint.WebApi !== 'undefined',
                  'Fingerprint.SampleFormat': typeof Fingerprint !== 'undefined' && typeof Fingerprint.SampleFormat !== 'undefined',
                  'Fingerprint.FmdFormat': typeof Fingerprint !== 'undefined' && typeof Fingerprint.FmdFormat !== 'undefined'
                };
                
                console.table(checks);
                
                const allLoaded = Object.values(checks).every(v => v === true);
                if (allLoaded) {
                  console.log('✅ DigitalPersona SDK fully loaded and ready');
                } else {
                  console.error('❌ DigitalPersona SDK loading incomplete');
                  console.log('Missing components:', Object.entries(checks).filter(([k,v]) => !v).map(([k]) => k));
                }
              }
              
              // Check immediately
              if (document.readyState === 'complete') {
                checkSDK();
              } else {
                window.addEventListener('load', checkSDK);
              }
            `}
          </Script>
        )}
        
        {children}
      </body>
    </html>
  );
}