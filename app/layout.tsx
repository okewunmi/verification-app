// // app/layout.tsx - FIXED VERSION
// import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
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
//           CRITICAL FIX: Use regular <script> tags instead of Next.js Script component
//           Next.js Script component can cause race conditions with SDK loading
//           Regular script tags with defer ensure proper sequential loading
//         */}
        
//         {/* Step 1: Load WebSDK FIRST */}
//         <script
//           src="https://unpkg.com/@digitalpersona/websdk@1.1.0/dist/websdk.client.ui.min.js"
//           defer
//         />
        
//         {/* Step 2: Load Fingerprint SDK SECOND (depends on WebSDK) */}
//         <script
//           src="https://unpkg.com/@digitalpersona/fingerprint@1.0.0/dist/fingerprint.sdk.min.js"
//           defer
//         />
//          {/* Option 2: Local files (if CDN fails)  */}
//         <script src="/sdk/websdk.client.ui.js" />
//         <script src="/sdk/fingerprint.sdk.js" />
      

//         {/* Step 3: Validation Script (runs after both SDKs load) */}
//         {process.env.NODE_ENV === 'development' && (
//           <script
//             dangerouslySetInnerHTML={{
//               __html: `
//                 window.addEventListener('load', function() {
//                   // Wait a bit to ensure SDKs are fully initialized
//                   setTimeout(function() {
//                     console.log('\\n🔍 === CHECKING DIGITALPERSONA SDK ===');
                    
//                     var checks = {
//                       'Window': typeof window !== 'undefined',
//                       'Fingerprint namespace': typeof Fingerprint !== 'undefined',
//                       'Fingerprint.WebApi': typeof Fingerprint !== 'undefined' && typeof Fingerprint.WebApi !== 'undefined',
//                       'Fingerprint.SampleFormat': typeof Fingerprint !== 'undefined' && typeof Fingerprint.SampleFormat !== 'undefined',
//                       'Fingerprint.FmdFormat': typeof Fingerprint !== 'undefined' && typeof Fingerprint.FmdFormat !== 'undefined',
//                       'SampleFormat.PngImage': typeof Fingerprint !== 'undefined' && Fingerprint.SampleFormat && typeof Fingerprint.SampleFormat.PngImage !== 'undefined',
//                       'FmdFormat.ANSI_378_2004': typeof Fingerprint !== 'undefined' && Fingerprint.FmdFormat && typeof Fingerprint.FmdFormat.ANSI_378_2004 !== 'undefined'
//                     };
                    
//                     console.table(checks);
                    
//                     var allLoaded = Object.keys(checks).every(function(key) {
//                       return checks[key] === true;
//                     });
                    
//                     if (allLoaded) {
//                       console.log('✅ DigitalPersona SDK fully loaded and ready');
                      
//                       // Test SDK instantiation
//                       try {
//                         var testSdk = new Fingerprint.WebApi();
//                         console.log('✅ SDK can be instantiated');
//                       } catch (e) {
//                         console.error('❌ SDK instantiation failed:', e);
//                       }
//                     } else {
//                       console.error('❌ DigitalPersona SDK loading incomplete');
//                       var missing = Object.keys(checks).filter(function(key) {
//                         return !checks[key];
//                       });
//                       console.log('Missing components:', missing);
//                     }
                    
//                     console.log('======================================\\n');
//                   }, 1000); // 1 second delay to ensure full initialization
//                 });
//               `
//             }}
//           />
//         )}
//       </head>
//       <body
//         className={`${geistSans.variable} ${geistMono.variable} antialiased`}
//       >
//         {children}
//       </body>
//     </html>
//   );
// }


// app/layout.tsx - PRODUCTION READY VERSION
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
          CRITICAL: Load DigitalPersona SDKs in correct order
          Using regular script tags with defer for proper sequencing
        */}
        
        {/* Step 1: WebSDK Client UI (Base SDK) */}
        <script
          src="https://unpkg.com/@digitalpersona/websdk@1.1.0/dist/websdk.client.ui.min.js"
          defer
        />
        
        {/* Step 2: Fingerprint SDK (Depends on WebSDK) */}
        <script
          src="https://unpkg.com/@digitalpersona/fingerprint@1.0.0/dist/fingerprint.sdk.min.js"
          defer
        />

        {/* 
          Fallback: Local SDK files (if CDN fails)
          Uncomment if you have SDK files in /public/sdk/
        */}
        {/* 
        <script src="/sdk/websdk.client.ui.js" defer />
        <script src="/sdk/fingerprint.sdk.js" defer />
        */}

        {/* Development: SDK Validation Script */}
        {process.env.NODE_ENV === 'development' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Wait for window to fully load
                window.addEventListener('load', function() {
                  // Give SDKs time to initialize
                  setTimeout(function() {
                    console.log('\\n🔍 === DIGITALPERSONA SDK STATUS CHECK ===');
                    
                    // Check SDK components
                    var checks = {
                      'Window Object': typeof window !== 'undefined',
                      'Fingerprint Namespace': typeof Fingerprint !== 'undefined',
                      'Fingerprint.WebApi': typeof Fingerprint !== 'undefined' && typeof Fingerprint.WebApi !== 'undefined',
                      'Fingerprint.SampleFormat': typeof Fingerprint !== 'undefined' && typeof Fingerprint.SampleFormat !== 'undefined',
                      'SampleFormat.PngImage': typeof Fingerprint !== 'undefined' && 
                                                Fingerprint.SampleFormat && 
                                                typeof Fingerprint.SampleFormat.PngImage !== 'undefined'
                    };
                    
                    // Display results
                    console.table(checks);
                    
                    // Check if all loaded
                    var allLoaded = Object.keys(checks).every(function(key) {
                      return checks[key] === true;
                    });
                    
                    if (allLoaded) {
                      console.log('✅ DigitalPersona SDK fully loaded and ready');
                      console.log('📦 Available components:');
                      console.log('   - Fingerprint.WebApi ✓');
                      console.log('   - Fingerprint.SampleFormat ✓');
                      console.log('   - Fingerprint.SampleFormat.PngImage ✓');
                      
                      // Test instantiation
                      try {
                        var testSdk = new Fingerprint.WebApi();
                        console.log('✅ SDK instantiation successful');
                        console.log('🎉 System ready for fingerprint operations');
                      } catch (error) {
                        console.error('❌ SDK instantiation failed:', error.message);
                        console.log('⚠️ Check DigitalPersona software installation');
                      }
                    } else {
                      console.error('❌ DigitalPersona SDK loading incomplete');
                      var missing = Object.keys(checks).filter(function(key) {
                        return !checks[key];
                      });
                      console.error('❌ Missing components:', missing);
                      console.log('\\n🔧 Troubleshooting steps:');
                      console.log('   1. Hard refresh page (Ctrl+Shift+R)');
                      console.log('   2. Clear browser cache completely');
                      console.log('   3. Check browser console for script errors');
                      console.log('   4. Verify SDK files are accessible');
                      console.log('   5. Check internet connection for CDN');
                    }
                    
                    console.log('==========================================\\n');
                  }, 1500); // 1.5 second delay for full initialization
                });

                // Error handler for script loading failures
                window.addEventListener('error', function(event) {
                  if (event.target && event.target.tagName === 'SCRIPT') {
                    console.error('❌ Script failed to load:', event.target.src);
                    console.log('⚠️ SDK may not be available. Check internet connection or use local files.');
                  }
                }, true);
              `
            }}
          />
        )}

        {/* Production: Silent error tracking */}
        {process.env.NODE_ENV === 'production' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.addEventListener('error', function(event) {
                  if (event.target && event.target.tagName === 'SCRIPT' && 
                      event.target.src && event.target.src.includes('digitalpersona')) {
                    // Log to monitoring service (add your error tracking here)
                    console.error('SDK Load Error:', event.target.src);
                  }
                }, true);
              `
            }}
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}