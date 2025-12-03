// lib/fingerprint-digitalpersona.js - FINAL PRODUCTION VERSION
// Based on official HID DigitalPersona patterns


class DigitalPersonaFingerprint {
  constructor() {
    this.sdk = null;
    this.reader = null;
    this.isInitialized = false;
    this.isAcquiring = false;
  }

  checkSDKAvailability() {
    if (typeof window === 'undefined') {
      return { available: false, error: 'Not in browser environment' };
    }

    const isAvailable = 
      typeof window.Fingerprint !== 'undefined' &&
      typeof window.Fingerprint.WebApi !== 'undefined';

    return { 
      available: isAvailable, 
      error: isAvailable ? null : 'DigitalPersona SDK scripts not loaded' 
    };
  }

  async initialize() {
    try {
      console.log('\n🔧 === INITIALIZING DIGITALPERSONA SDK ===');

      if (this.isInitialized && this.sdk) {
        console.log('ℹ️ SDK already initialized');
        return { success: true, message: 'SDK already initialized' };
      }

      const check = this.checkSDKAvailability();
      if (!check.available) {
        throw new Error(check.error || 'DigitalPersona SDK failed to load.');
      }

      // eslint-disable-next-line no-undef
      this.sdk = new window.Fingerprint.WebApi();
      console.log('✅ WebApi instance created');

      console.log('🔍 Detecting fingerprint scanner...');
      const devices = await this.sdk.enumerateDevices();
      
      if (!devices || devices.length === 0) {
        throw new Error('No fingerprint scanner detected. Please connect DigitalPersona reader.');
      }

      this.reader = devices[0];
      this.isInitialized = true;

      console.log('✅ INITIALIZATION SUCCESSFUL');
      console.log('📱 Active Scanner:', this.reader);
      console.log('=====================================\n');

      return { success: true, reader: this.reader, message: 'Scanner initialized and ready' };

    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async _cleanup() {
    console.log('🧹 Cleanup starting...');
    
    try {
      if (this.sdk && this.reader && this.isAcquiring) {
        await this.sdk.stopAcquisition(this.reader);
        console.log('✓ Acquisition stopped');
      }
    } catch (e) {
      console.log('✓ Acquisition already stopped');
    }

    if (this.sdk) {
      this.sdk.onSamplesAcquired = null;
      this.sdk.onErrorOccurred = null;
      this.sdk.onQualityReported = null;
      console.log('✓ Event handlers cleared');
    }

    this.isAcquiring = false;
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('✅ Cleanup complete\n');
  }

  async capture(fingerName = 'Finger') {
    if (!this.isInitialized) {
      const init = await this.initialize();
      if (!init.success) return init;
    }

    if (this.isAcquiring) {
      console.warn('⚠️ Capture already in progress');
      return { success: false, error: 'Capture already in progress' };
    }

    await this._cleanup();

    return new Promise((resolve, reject) => {
      console.log(`\n💡 === CAPTURING: ${fingerName} ===`);
      
      this.isAcquiring = true;
      let resolved = false;
      let captureTimeout = null;

      const safeResolve = async (result) => {
        if (resolved) return;
        resolved = true;
        
        if (captureTimeout) clearTimeout(captureTimeout);
        
        console.log('🔒 Resolving...');
        await this._cleanup();
        resolve(result);
      };

      // const onSamplesAcquired = async (event) => {
      //   if (resolved) return;
        
      //   console.log("⚡ CAPTURED");

      //   try {
      //     const samples = event.samples;
      //     let imageData;
          
      //     if (typeof samples === 'string') {
      //       try {
      //         const parsed = JSON.parse(samples);
      //         imageData = Array.isArray(parsed) ? parsed[0] : samples;
      //       } catch (e) {
      //         imageData = samples;
      //       }
      //     } else if (Array.isArray(samples)) {
      //       imageData = samples[0];
      //     } else {
      //       imageData = samples;
      //     }

      //     if (!imageData) {
      //       throw new Error("No fingerprint data");
      //     }

      //     console.log("✅ Data length:", imageData.length);

      //     const quality = this.calculateQuality(imageData);
      //     console.log("🎯 Quality:", quality + "%");

      //     if (quality < 40) {
      //       await safeResolve({
      //         success: false,
      //         error: "Quality too low. Press harder.",
      //         quality
      //       });
      //       return;
      //     }

      //     await safeResolve({
      //       success: true,
      //       template: imageData,
      //       quality,
      //       capturedAt: new Date().toISOString()
      //     });

      //   } catch (error) {
      //     console.error("❌ Error:", error.message);
      //     await safeResolve({ 
      //       success: false, 
      //       error: `Capture failed: ${error.message}` 
      //     });
      //   }
      // };
const onSamplesAcquired = async (event) => {
  if (resolved) return;
  
  console.log("⚡ CAPTURED");

  try {
    const samples = event.samples;
    let imageData;
    
    // Extract string data from various possible formats
    if (typeof samples === 'string') {
      // samples is already a string
      imageData = samples;
    } else if (Array.isArray(samples)) {
      // samples is an array - get first element
      const firstSample = samples[0];
      
      // Check if first element is string or needs extraction
      if (typeof firstSample === 'string') {
        imageData = firstSample;
      } else if (firstSample && typeof firstSample === 'object') {
        // First element is an object - try to extract Data or similar property
        imageData = firstSample.Data || firstSample.data || JSON.stringify(firstSample);
      } else {
        imageData = String(firstSample);
      }
    } else if (samples && typeof samples === 'object') {
      // samples is an object - try to extract Data property
      imageData = samples.Data || samples.data || JSON.stringify(samples);
    } else {
      // Fallback - convert to string
      imageData = String(samples);
    }

    // Ensure imageData is a string
    if (typeof imageData !== 'string') {
      console.warn("⚠️ imageData is not a string, converting...");
      imageData = JSON.stringify(imageData);
    }

    if (!imageData || imageData.trim() === '') {
      throw new Error("No fingerprint data");
    }

    console.log("✅ Data type:", typeof imageData);
    console.log("✅ Data length:", imageData.length);

    const quality = this.calculateQuality(imageData);
    console.log("🎯 Quality:", quality + "%");

    if (quality < 20) {
      await safeResolve({
        success: false,
        error: "Quality too low. Press harder.",
        quality
      });
      return;
    }

    await safeResolve({
      success: true,
      template: imageData, // Now guaranteed to be a string
      quality,
      capturedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
    await safeResolve({ 
      success: false, 
      error: `Capture failed: ${error.message}` 
    });
  }
};
      const onErrorOccurred = async (error) => {
        console.error("❌ Hardware error:", error);
        await safeResolve({ 
          success: false, 
          error: error.message || "Device error" 
        });
      };

      this.sdk.onSamplesAcquired = onSamplesAcquired;
      this.sdk.onErrorOccurred = onErrorOccurred;
      console.log("✅ Handlers attached");

      console.log("🚀 Starting...");
      this.sdk.startAcquisition(
        // eslint-disable-next-line no-undef
        // window.Fingerprint.SampleFormat.PngImage,
          window.Fingerprint.SampleFormat.Intermediate,
        this.reader
      ).then(() => {
        console.log("✅ Active - place finger\n");

        captureTimeout = setTimeout(async () => {
          if (!resolved) {
            console.error("⏱️ Timeout");
            await safeResolve({ 
              success: false, 
              error: "Timeout. Try again." 
            });
          }
        }, 30000);

      }).catch(async (err) => {
        console.error("❌ Start failed:", err);
        await safeResolve({ 
          success: false, 
          error: "Could not start: " + err.message 
        });
      });
    });
  }

  async stopAcquisition() {
    await this._cleanup();
  }

  calculateQuality(base64) {
    if (!base64) return 0;
    const len = base64.length;
    if (len < 1000) return 20;
    if (len < 5000) return 45;
    if (len < 10000) return 65;
    if (len < 20000) return 80;
    return 90;
  }
  
  /**
   * CORRECTED: Only check for EXACT duplicates (reused images)
   * NOTE: Proper biometric matching requires server-side DigitalPersona matching engine
   */
  async compareTemplates(t1, t2) {
    if (!t1 || !t2) {
      return {
        success: false,
        matched: false,
        error: "Invalid templates"
      };
    }

    try {
      // Only match if images are EXACTLY the same (byte-for-byte)
      // This prevents reusing the same captured image multiple times
      const exactMatch = (t1 === t2);
      
      return {
        success: true,
        matched: exactMatch,
        similarity: exactMatch ? 100 : 0,
        confidence: exactMatch ? 100 : 0,
        threshold: 100 // Only exact matches count
      };

    } catch (error) {
      return {
        success: false,
        matched: false,
        error: error.message
      };
    }
  }

  /**
   * Check for EXACT duplicate images (not biometric duplicates)
   * This prevents someone from using the same captured image for multiple fingers
   */
  async checkForDuplicates(newTemplate, existingTemplates, threshold = 100) {
    console.log(`\n🔍 DUPLICATE CHECK (Exact match only)`);
    console.log(`📋 Checking ${existingTemplates.length} templates`);

    try {
      if (!newTemplate) throw new Error('Invalid template');
      if (!Array.isArray(existingTemplates)) throw new Error('Invalid templates array');
      
      if (existingTemplates.length === 0) {
        console.log('✅ No templates to check\n');
        return {
          success: true,
          hasDuplicates: false,
          duplicates: [],
          message: 'No templates'
        };
      }

      const duplicates = [];

      for (const existing of existingTemplates) {
        if (!existing.template) continue;

        // Check for EXACT match only
        const comparison = await this.compareTemplates(newTemplate, existing.template);
        if (!comparison.success) continue;

        if (comparison.matched) {
          console.log(`🚨 EXACT MATCH: ${existing.matricNumber} (${existing.fingerName})`);
          duplicates.push({
            studentId: existing.studentId,
            matricNumber: existing.matricNumber,
            fingerName: existing.fingerName,
            studentName: existing.studentName,
            similarity: '100'
          });
        }
      }

      const hasDuplicates = duplicates.length > 0;
      
      if (hasDuplicates) {
        console.log('❌ DUPLICATE FOUND (Same image reused)\n');
      } else {
        console.log('✅ UNIQUE IMAGE\n');
      }

      return {
        success: true,
        hasDuplicates,
        duplicates,
        totalChecked: existingTemplates.length,
        message: hasDuplicates 
          ? `Same image already used for: ${duplicates[0].studentName} (${duplicates[0].fingerName})`
          : 'Unique capture'
      };

    } catch (error) {
      console.error('❌ Check error:', error);
      return {
        success: false,
        hasDuplicates: false,
        duplicates: [],
        error: error.message
      };
    }
  }

  async testScanner() {
    const init = await this.initialize();
    if (!init.success) return init;

    return {
      success: true,
      message: "Scanner ready",
      reader: this.reader
    };
  }
}

// Export singleton
const fingerprintScanner = new DigitalPersonaFingerprint();

if (typeof window !== 'undefined') {
  window.debugFingerprint = fingerprintScanner;
  console.log('\n⚠️  IMPORTANT NOTE:');
  console.log('This library only checks for EXACT duplicate images.');
  console.log('Proper biometric matching requires DigitalPersona server-side engine.');
  console.log('For production: https://hidglobal.github.io/digitalpersona-devices/\n');
}

export default fingerprintScanner;







/**
 * DigitalPersona Fingerprint SDK Wrapper
 * Production-ready implementation with proper biometric template handling
 *
 * KEY FEATURES:
 * - Captures Intermediate format templates (NOT PNG) for biometric matching
 * - Uses device-reported quality scores (not file size heuristics)
 * - Supports dual capture: Intermediate (for matching) + PNG (for display)
 * - Provides SDK-based comparison when available, with fallback heuristics
 *
 * COMPARISON METHODS (in order of preference):
 * 1. DigitalPersona SDK compare() - True biometric matching (if available)
 * 2. Server-side matching engine - Production recommended
 * 3. Client-side heuristic - Fallback for development/basic duplicate detection
 *
 * For production deployment, implement server-side matching via:
 * - DigitalPersona U.are" Authentication Server
 * - HID Global DigitalPersona matching engine
 * - Or integrate with certified biometric matching service
 */
// fingerprint-digitalpersona.js
// export class DigitalPersonaFingerprint {
//   constructor() {
//     this.sdk = null;
//     this.reader = null;
//     this.isInitialized = false;
//     this.isAcquiring = false;
//     this.lastReportedQuality = 0;
//     this.hasNativeCompare = false;
//   }

//   /**
//    * Check if DigitalPersona SDK is loaded
//    */
//   checkSDKAvailability() {
//     if (typeof window === "undefined") {
//       return { available: false, error: "Not in browser environment" };
//     }

//     const isAvailable =
//       typeof window.Fingerprint !== "undefined" &&
//       typeof window.Fingerprint.WebApi !== "undefined";

//     return {
//       available: isAvailable,
//       error: isAvailable
//         ? null
//         : 'DigitalPersona SDK not loaded. Include the SDK scripts in your HTML:\n<script src="https://cdn.jsdelivr.net/npm/@nicecode/nicefinger@1.0.0/dist/nicefinger.min.js"></script>',
//     };
//   }

//   /**
//    * Initialize the fingerprint scanner
//    * Detects available readers and sets up event handlers
//    */
//   async initialize() {
//     try {
//       console.log("\n🔧 === INITIALIZING DIGITALPERSONA SDK ===");

//       if (this.isInitialized && this.sdk) {
//         console.log("ℹ️ SDK already initialized");
//         return {
//           success: true,
//           reader: this.reader || undefined,
//           message: "SDK already initialized",
//           hasCompareMethod: this.hasNativeCompare,
//         };
//       }

//       const check = this.checkSDKAvailability();
//       if (!check.available) {
//         throw new Error(check.error || "DigitalPersona SDK failed to load.");
//       }

//       this.sdk = new window.Fingerprint.WebApi();
//       console.log("✅ WebApi instance created");

//       this.hasNativeCompare = typeof this.sdk.compare === "function";
//       if (this.hasNativeCompare) {
//         console.log(
//           "✅ SDK native compare() method available - will use for biometric matching",
//         );
//       } else {
//         console.log(
//           "⚠️ SDK compare() not available - using heuristic comparison (for production, use server-side matching)",
//         );
//       }

//       this.sdk.onReaderConnected = (event) => {
//         console.log("📱 Reader connected:", event.deviceId);
//       };

//       this.sdk.onReaderDisconnected = (event) => {
//         console.log("📱 Reader disconnected:", event.deviceId);
//         if (this.reader === event.deviceId) {
//           this.reader = null;
//           this.isInitialized = false;
//         }
//       };

//       console.log("🔍 Detecting fingerprint scanner...");
//       const devices = await this.sdk.enumerateDevices();

//       if (!devices || devices.length === 0) {
//         throw new Error(
//           "No fingerprint scanner detected. Please connect a DigitalPersona reader and refresh.",
//         );
//       }

//       this.reader = devices[0];
//       this.isInitialized = true;

//       console.log("✅ INITIALIZATION SUCCESSFUL");
//       console.log("📱 Active Scanner:", this.reader);
//       console.log("=====================================\n");

//       return {
//         success: true,
//         reader: this.reader,
//         message: "Scanner initialized and ready",
//         hasCompareMethod: this.hasNativeCompare,
//       };
//     } catch (error) {
//       const errorMessage =
//         error instanceof Error ? error.message : "Unknown initialization error";
//       console.error("❌ Initialization failed:", errorMessage);
//       return { success: false, error: errorMessage };
//     }
//   }

//   /**
//    * Clean up resources and reset state
//    */
//   async cleanup() {
//     console.log("🧹 Cleanup starting...");

//     try {
//       if (this.sdk && this.reader && this.isAcquiring) {
//         await this.sdk.stopAcquisition(this.reader);
//         console.log("✓ Acquisition stopped");
//       }
//     } catch {
//       console.log("✓ Acquisition already stopped");
//     }

//     if (this.sdk) {
//       this.sdk.onSamplesAcquired = null;
//       this.sdk.onErrorOccurred = null;
//       this.sdk.onQualityReported = null;
//       console.log("✓ Event handlers cleared");
//     }

//     this.isAcquiring = false;
//     this.lastReportedQuality = 0;
//     await new Promise((resolve) => setTimeout(resolve, 300));
//     console.log("✅ Cleanup complete\n");
//   }

//   /**
//    * Extract template data from samples
//    * Fixes the issue where templateData might be an object or array
//    */
//   extractTemplateData(samples) {
//     let templateData = "";
    
//     if (!samples) {
//       return templateData;
//     }

//     // If samples is a string, try to parse it
//     if (typeof samples === "string") {
//       try {
//         const parsed = JSON.parse(samples);
//         if (Array.isArray(parsed) && parsed.length > 0) {
//           templateData = typeof parsed[0] === "string" ? parsed[0] : JSON.stringify(parsed[0]);
//         } else if (parsed && typeof parsed === "object") {
//           templateData = JSON.stringify(parsed);
//         } else {
//           templateData = samples;
//         }
//       } catch {
//         // If parsing fails, use the string as-is
//         templateData = samples;
//       }
//     }
//     // If samples is an array
//     else if (Array.isArray(samples) && samples.length > 0) {
//       templateData = typeof samples[0] === "string" ? samples[0] : JSON.stringify(samples[0]);
//     }
//     // If samples is an object
//     else if (samples && typeof samples === "object") {
//       templateData = JSON.stringify(samples);
//     }
//     // For any other case, convert to string
//     else {
//       templateData = String(samples);
//     }

//     return templateData;
//   }

//   /**
//    * Check if template data is PNG format
//    */
//   isPngFormat(templateData) {
//     if (!templateData || typeof templateData !== "string") {
//       return false;
//     }
    
//     // PNG base64 starts with "iVBOR"
//     // JPEG base64 starts with "/9j/"
//     return templateData.startsWith("iVBOR") || templateData.startsWith("/9j/");
//   }

//   /**
//    * Capture a fingerprint
//    */
//   async capture(fingerName = "Finger", captureMode = "intermediate") {
//     if (!this.isInitialized) {
//       const init = await this.initialize();
//       if (!init.success) return { success: false, error: init.error };
//     }

//     if (this.isAcquiring) {
//       console.warn("⚠️ Capture already in progress");
//       return {
//         success: false,
//         error: "Capture already in progress. Please wait.",
//       };
//     }

//     await this.cleanup();

//     return new Promise((resolve) => {
//       console.log(`\n💡 === CAPTURING: ${fingerName} ===`);
//       console.log(`📋 Mode: ${captureMode.toUpperCase()}`);

//       if (captureMode === "png") {
//         console.log(
//           "⚠️ WARNING: PNG mode captures images only - NOT suitable for biometric matching",
//         );
//       }

//       this.isAcquiring = true;
//       this.lastReportedQuality = 0;

//       let resolved = false;
//       let captureTimeout = null;

//       const safeResolve = async (result) => {
//         if (resolved) return;
//         resolved = true;

//         if (captureTimeout) clearTimeout(captureTimeout);

//         console.log("🔒 Resolving capture...");
//         await this.cleanup();
//         resolve(result);
//       };

//       const onQualityReported = (event) => {
//         this.lastReportedQuality = event.quality;
//         console.log(`🎯 Device Quality Report: ${event.quality}%`);

//         if (event.quality < 40) {
//           console.log("⚠️ Low quality detected - please press finger firmly");
//         }
//       };

//       const onSamplesAcquired = async (event) => {
//         if (resolved) return;

//         console.log("⚡ FINGERPRINT CAPTURED");

//         try {
//           const templateData = this.extractTemplateData(event.samples);
//           console.log("✅ Template data extracted");

//           if (!templateData) {
//             throw new Error("No fingerprint data received from scanner");
//           }

//           console.log("✅ Template data length:", templateData.length, "chars");
//           console.log("✅ Template data type:", typeof templateData);
//           console.log("✅ Template data first 100 chars:", templateData.substring(0, 100));

//           const deviceQuality = event.quality || this.lastReportedQuality;
//           const estimatedQuality = this.estimateQualityFromData(
//             templateData,
//             captureMode,
//           );
//           const quality = deviceQuality > 0 ? deviceQuality : estimatedQuality;

//           console.log(
//             `🎯 Quality: ${quality}% (device: ${deviceQuality}%, estimated: ${estimatedQuality}%)`,
//           );

//           if (quality < 40) {
//             console.log("❌ Quality too low - rejecting capture");
//             await safeResolve({
//               success: false,
//               error: `Quality too low (${quality}%). Please press finger firmly and hold still.`,
//               quality,
//               deviceQuality,
//             });
//             return;
//           }

//           const isPng = this.isPngFormat(templateData);

//           await safeResolve({
//             success: true,
//             template: captureMode !== "png" ? templateData : undefined,
//             pngImage: captureMode === "png" || isPng ? templateData : undefined,
//             quality,
//             deviceQuality,
//             capturedAt: new Date().toISOString(),
//             format: isPng ? "png" : "intermediate",
//           });
//         } catch (error) {
//           const errorMessage =
//             error instanceof Error
//               ? error.message
//               : "Capture processing failed";
//           console.error("❌ Capture error:", errorMessage);
//           console.error("❌ Full error:", error);
//           await safeResolve({
//             success: false,
//             error: `Capture failed: ${errorMessage}`,
//           });
//         }
//       };

//       const onErrorOccurred = async (error) => {
//         const errorMessage =
//           error.message || error.error || "Device error occurred";
//         console.error("❌ Hardware error:", errorMessage);
//         await safeResolve({
//           success: false,
//           error: `Scanner error: ${errorMessage}`,
//         });
//       };

//       if (!this.sdk || !this.reader) {
//         safeResolve({
//           success: false,
//           error: "Scanner not initialized. Call initialize() first.",
//         });
//         return;
//       }

//       this.sdk.onSamplesAcquired = onSamplesAcquired;
//       this.sdk.onErrorOccurred = onErrorOccurred;
//       this.sdk.onQualityReported = onQualityReported;
//       console.log("✅ Event handlers attached");

//       const startCapture = async () => {
//         if (!this.sdk || !this.reader) return;

//         console.log("🚀 Starting acquisition...");

//         try {
//           const format =
//             captureMode === "png"
//               ? window.Fingerprint.SampleFormat.PngImage
//               : window.Fingerprint.SampleFormat.Intermediate;

//           console.log(
//             `📋 Using format: ${captureMode === "png" ? "PngImage" : "Intermediate"}`,
//           );

//           await this.sdk.startAcquisition(format, this.reader);
//           console.log("✅ Scanner active - place finger on reader\n");

//           captureTimeout = setTimeout(async () => {
//             if (!resolved) {
//               console.error("⏱️ Capture timeout (30s)");
//               await safeResolve({
//                 success: false,
//                 error:
//                   "Capture timeout. Please try again and place finger within 30 seconds.",
//               });
//             }
//           }, 30000);
//         } catch (err) {
//           const errorMessage =
//             err instanceof Error ? err.message : "Failed to start acquisition";
//           console.error("❌ Start failed:", errorMessage);
//           await safeResolve({
//             success: false,
//             error: "Could not start capture: " + errorMessage,
//           });
//         }
//       };

//       startCapture();
//     });
//   }

//   /**
//    * Capture fingerprint with both template (for matching) and PNG image (for display)
//    * This requires two separate captures
//    */
//   async captureWithPreview(fingerName = "Finger") {
//     if (!this.isInitialized) {
//       const init = await this.initialize();
//       if (!init.success) return { success: false, error: init.error };
//     }

//     console.log(`\n📷 Dual capture for ${fingerName}: Template + PNG preview`);

//     const templateResult = await this.capture(fingerName, "intermediate");
//     if (!templateResult.success) {
//       return templateResult;
//     }

//     console.log("✅ Template captured, now capturing PNG for display...");
//     await new Promise((resolve) => setTimeout(resolve, 500));

//     const pngResult = await this.capture(fingerName, "png");

//     return {
//       success: true,
//       template: templateResult.template,
//       pngImage: pngResult.success ? pngResult.pngImage : undefined,
//       quality: templateResult.quality,
//       deviceQuality: templateResult.deviceQuality,
//       capturedAt: templateResult.capturedAt,
//       format: "intermediate",
//     };
//   }

//   /**
//    * Stop any ongoing capture operation
//    */
//   async stopAcquisition() {
//     await this.cleanup();
//   }

//   /**
//    * Estimate quality from template data when device doesn't report it
//    * This is a FALLBACK - device-reported quality is always preferred
//    */
//   estimateQualityFromData(data, mode) {
//     if (!data || typeof data !== "string") return 0;

//     const len = data.length;

//     if (mode === "png") {
//       if (len < 5000) return 25;
//       if (len < 10000) return 45;
//       if (len < 20000) return 60;
//       if (len < 40000) return 75;
//       return 85;
//     } else {
//       if (len < 500) return 20;
//       if (len < 1500) return 40;
//       if (len < 4000) return 60;
//       if (len < 8000) return 75;
//       if (len < 15000) return 85;
//       return 90;
//     }
//   }

//   /**
//    * Compare two fingerprint templates
//    */
//   async compareTemplates(template1, template2) {
//     if (!template1 || !template2) {
//       return {
//         success: false,
//         matched: false,
//         error: "Invalid templates provided - both templates are required",
//       };
//     }

//     try {
//       if (template1 === template2) {
//         console.log(
//           "🔴 EXACT MATCH: Same template data (possible reuse detected)",
//         );
//         return {
//           success: true,
//           matched: true,
//           similarity: 100,
//           confidence: 100,
//           threshold: 100,
//           method: "heuristic",
//         };
//       }

//       if (
//         this.hasNativeCompare &&
//         this.sdk &&
//         typeof this.sdk.compare === "function"
//       ) {
//         try {
//           console.log(
//             "🔬 Using SDK native compare() for biometric matching...",
//           );
//           const result = await this.sdk.compare(template1, template2);

//           console.log(
//             `✅ SDK Compare: matched=${result.match}, score=${result.score}`,
//           );

//           return {
//             success: true,
//             matched: result.match,
//             similarity: result.score,
//             confidence: result.score,
//             threshold: 50,
//             method: "sdk",
//           };
//         } catch (sdkError) {
//           console.warn(
//             "⚠️ SDK compare() failed, falling back to heuristic:",
//             sdkError,
//           );
//         }
//       }

//       const isPng1 = this.isPngFormat(template1);
//       const isPng2 = this.isPngFormat(template2);

//       if (isPng1 || isPng2) {
//         console.log("⚠️ PNG image detected - using basic byte comparison");
//         console.log(
//           "⚠️ PNG comparison CANNOT detect same finger from different scans!",
//         );
//         console.log(
//           "⚠️ For biometric matching, use Intermediate format templates",
//         );
//         return this.comparePngImages(template1, template2);
//       }

//       console.log("📊 Using heuristic template comparison (fallback mode)");
//       console.log(
//         "ℹ️ Note: For production biometric matching, use server-side DigitalPersona matching engine",
//       );

//       const similarity = this.calculateTemplateSimilarity(template1, template2);
//       const threshold = 65;
//       const matched = similarity >= threshold;

//       console.log(
//         `🔍 Heuristic result: ${similarity.toFixed(1)}% similarity (threshold: ${threshold}%)`,
//       );

//       if (!matched && similarity > 40) {
//         console.log(
//           "ℹ️ Moderate similarity - could be same finger with different scan quality",
//         );
//       }

//       return {
//         success: true,
//         matched,
//         similarity,
//         confidence: matched ? similarity : Math.min(similarity, 30),
//         threshold,
//         method: "heuristic",
//       };
//     } catch (error) {
//       const errorMessage =
//         error instanceof Error ? error.message : "Comparison failed";
//       console.error("❌ Compare error:", errorMessage);
//       return {
//         success: false,
//         matched: false,
//         error: errorMessage,
//       };
//     }
//   }

//   /**
//    * Compare PNG images (very limited - only catches exact or near-exact matches)
//    */
//   comparePngImages(img1, img2) {
//     if (typeof img1 !== "string" || typeof img2 !== "string") {
//       return {
//         success: true,
//         matched: false,
//         similarity: 0,
//         confidence: 0,
//         threshold: 98,
//         method: "heuristic",
//       };
//     }

//     if (img1 === img2) {
//       return {
//         success: true,
//         matched: true,
//         similarity: 100,
//         confidence: 100,
//         threshold: 100,
//         method: "heuristic",
//       };
//     }

//     const len1 = img1.length;
//     const len2 = img2.length;
//     const sizeDiff = Math.abs(len1 - len2) / Math.max(len1, len2);

//     let matchingChars = 0;
//     const sampleSize = Math.min(1000, Math.min(len1, len2));
//     const step = Math.floor(Math.min(len1, len2) / sampleSize) || 1;

//     for (let i = 0; i < sampleSize; i++) {
//       const idx = i * step;
//       if (idx < len1 && idx < len2 && img1[idx] === img2[idx]) {
//         matchingChars++;
//       }
//     }

//     const charSimilarity = sampleSize > 0 ? (matchingChars / sampleSize) * 100 : 0;
//     const sizeSimilarity = (1 - sizeDiff) * 100;
//     const overallSimilarity = charSimilarity * 0.7 + sizeSimilarity * 0.3;

//     console.log(`📊 PNG byte comparison: ${overallSimilarity.toFixed(1)}%`);
//     console.log(
//       `   (char match: ${charSimilarity.toFixed(1)}%, size match: ${sizeSimilarity.toFixed(1)}%)`,
//     );

//     return {
//       success: true,
//       matched: overallSimilarity >= 98,
//       similarity: overallSimilarity,
//       confidence: overallSimilarity >= 98 ? overallSimilarity : 0,
//       threshold: 98,
//       method: "heuristic",
//     };
//   }

//   /**
//    * Calculate similarity between two Intermediate format templates
//    * This is a HEURISTIC method - not true biometric matching
//    */
//   calculateTemplateSimilarity(t1, t2) {
//     if (typeof t1 !== "string" || typeof t2 !== "string") {
//       return 0;
//     }

//     const len1 = t1.length;
//     const len2 = t2.length;

//     const sizeDiff = Math.abs(len1 - len2) / Math.max(len1, len2);

//     if (sizeDiff > 0.5) {
//       return 10;
//     }

//     let matchScore = 0;
//     const minLen = Math.min(len1, len2);

//     const blockSize = 64;
//     const numBlocks = Math.floor(minLen / blockSize);

//     if (numBlocks === 0) {
//       return 15;
//     }

//     for (let i = 0; i < numBlocks; i++) {
//       const start = i * blockSize;
//       const block1 = t1.substring(start, start + blockSize);
//       const block2 = t2.substring(start, start + blockSize);

//       let blockMatch = 0;
//       for (let j = 0; j < blockSize; j++) {
//         if (block1[j] === block2[j]) {
//           blockMatch++;
//         }
//       }

//       matchScore += blockMatch / blockSize;
//     }

//     const rawSimilarity = (matchScore / numBlocks) * 100;
//     const sizePenalty = sizeDiff * 25;
//     const finalSimilarity = Math.max(
//       0,
//       Math.min(100, rawSimilarity - sizePenalty),
//     );

//     return finalSimilarity;
//   }

//   /**
//    * Check a new fingerprint template against a list of existing templates
//    * Returns any duplicates found above the similarity threshold
//    */
//   async checkForDuplicates(newTemplate, existingTemplates, threshold = 65) {
//     console.log(`\n🔍 === DUPLICATE CHECK ===`);
//     console.log(`📋 Threshold: ${threshold}%`);
//     console.log(`📋 Templates to check: ${existingTemplates.length}`);

//     try {
//       if (!newTemplate) {
//         throw new Error("No template provided for duplicate check");
//       }

//       if (!Array.isArray(existingTemplates)) {
//         throw new Error("existingTemplates must be an array");
//       }

//       if (existingTemplates.length === 0) {
//         console.log("✅ No existing templates - fingerprint is unique\n");
//         return {
//           success: true,
//           hasDuplicates: false,
//           duplicates: [],
//           totalChecked: 0,
//           message: "No existing templates to compare against",
//         };
//       }

//       const duplicates = [];
//       let checkedCount = 0;
//       let errorCount = 0;

//       for (const existing of existingTemplates) {
//         if (!existing.template) {
//           console.warn(
//             `⚠️ Skipping ${existing.matricNumber} - no template data`,
//           );
//           continue;
//         }

//         checkedCount++;

//         try {
//           const comparison = await this.compareTemplates(
//             newTemplate,
//             existing.template,
//           );

//           if (!comparison.success) {
//             errorCount++;
//             console.warn(
//               `⚠️ Comparison failed for ${existing.matricNumber}: ${comparison.error}`,
//             );
//             continue;
//           }

//           const similarity = comparison.similarity || 0;

//           if (similarity >= threshold) {
//             console.log(
//               `🚨 DUPLICATE FOUND: ${existing.studentName} (${existing.fingerName})`,
//             );
//             console.log(
//               `   Similarity: ${similarity.toFixed(1)}% (threshold: ${threshold}%)`,
//             );

//             duplicates.push({
//               studentId: existing.studentId,
//               matricNumber: existing.matricNumber,
//               fingerName: existing.fingerName,
//               studentName: existing.studentName,
//               similarity: similarity.toFixed(1),
//             });
//           }
//         } catch (err) {
//           errorCount++;
//           console.warn(
//             `⚠️ Error comparing with ${existing.matricNumber}:`,
//             err,
//           );
//         }
//       }

//       const hasDuplicates = duplicates.length > 0;

//       console.log(`\n📊 DUPLICATE CHECK RESULTS:`);
//       console.log(`   Checked: ${checkedCount} templates`);
//       console.log(`   Errors: ${errorCount}`);
//       console.log(`   Duplicates: ${duplicates.length}`);

//       if (hasDuplicates) {
//         console.log(`❌ DUPLICATES FOUND - Cannot enroll\n`);
//       } else {
//         console.log(`✅ NO DUPLICATES - Safe to enroll\n`);
//       }

//       return {
//         success: true,
//         hasDuplicates,
//         duplicates,
//         totalChecked: checkedCount,
//         message: hasDuplicates
//           ? `Fingerprint matches ${duplicates[0].studentName}'s ${duplicates[0].fingerName} (${duplicates[0].similarity}% similarity)`
//           : "Fingerprint is unique - no duplicates found",
//       };
//     } catch (error) {
//       const errorMessage =
//         error instanceof Error ? error.message : "Duplicate check failed";
//       console.error("❌ Duplicate check error:", errorMessage);
//       return {
//         success: false,
//         hasDuplicates: false,
//         duplicates: [],
//         totalChecked: 0,
//         error: errorMessage,
//       };
//     }
//   }

//   /**
//    * Test scanner connectivity and readiness
//    */
//   async testScanner() {
//     console.log("\n🧪 Testing scanner...");

//     const init = await this.initialize();
//     if (!init.success) {
//       return { success: false, error: init.error };
//     }

//     return {
//       success: true,
//       message: `Scanner "${this.reader}" is ready. ${this.hasNativeCompare ? "SDK matching available." : "Using heuristic matching."}`,
//       reader: this.reader || undefined,
//     };
//   }

//   /**
//    * Get current scanner status
//    */
//   getStatus() {
//     return {
//       initialized: this.isInitialized,
//       acquiring: this.isAcquiring,
//       reader: this.reader,
//       hasNativeCompare: this.hasNativeCompare,
//       lastQuality: this.lastReportedQuality,
//     };
//   }

//   /**
//    * Full reset - clears SDK instance and all state
//    */
//   async reset() {
//     console.log("🔄 Full scanner reset...");
//     await this.cleanup();
//     this.sdk = null;
//     this.reader = null;
//     this.isInitialized = false;
//     this.hasNativeCompare = false;
//     this.lastReportedQuality = 0;
//     console.log("✅ Scanner reset complete\n");
//   }
// }

// const fingerprintScanner = new DigitalPersonaFingerprint();

// if (typeof window !== "undefined") {
//   window.debugFingerprint = fingerprintScanner;
//   console.log("\n📋 DigitalPersona Fingerprint Scanner Module Loaded");
//   console.log("💡 Access via window.debugFingerprint for debugging");
//   console.log("📚 Documentation: See FINGERPRINT_README.md\n");
// }

// export default fingerprintScanner;
// export { DigitalPersonaFingerprint };

