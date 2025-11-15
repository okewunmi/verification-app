// import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
//  import "./globals.css";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

// export const metadata: Metadata = {
//   title: 'FTP Attendance System',
//   description: 'Student Attendance Management',
// };

// export default function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode;
// }>) {
//   return (
//     <html lang="en">
//       <head>  
        
//         <script src="https://unpkg.com/@digitalpersona/fingerprint/dist/fingerprint.sdk.js" ></script>
        
//       </head>
//       <body
//         className={`${geistSans.variable} ${geistMono.variable} antialiased`}
//       >
//         {children}
//       </body>
//     </html>
//   );
// }
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
  title: 'FTP Attendance System',
  description: 'Student Attendance Management',
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
          CRITICAL: Load WebSDK FIRST (required dependency)
          Fingerprint SDK depends on WebSDK
        */}
        <script 
          src="https://unpkg.com/@digitalpersona/websdk/dist/websdk.client.ui.js"
        />
        
        {/* 
          THEN load Fingerprint SDK
          This must come AFTER WebSDK
        */}
        <script 
          src="https://unpkg.com/@digitalpersona/fingerprint/dist/fingerprint.sdk.js"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
