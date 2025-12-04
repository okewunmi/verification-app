// ============================================
// PROPER DIGITALPERSONA FINGERPRINT IMPLEMENTATION
// Using PNG Image Format for Better Compatibility
// FIXED: Strips data URL prefix from base64 strings
// ============================================

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

  async isAvailable() {
    try {
      const check = this.checkSDKAvailability();
      if (!check.available) {
        return { available: false, error: check.error };
      }

      if (!this.isInitialized) {
        const init = await this.initialize();
        if (!init.success) {
          return { available: false, error: init.error };
        }
      }

      return { 
        available: true, 
        reader: this.reader,
        message: 'Fingerprint reader is available' 
      };

    } catch (error) {
      return { 
        available: false, 
        error: error.message || 'Fingerprint reader check failed' 
      };
    }
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

  /**
   * Capture fingerprint as PNG image
   * ⭐ FIXED: Returns PURE base64 string (no data URL prefix)
   * This is the PROPER way for client-side capture
   */
  async capturePNG(fingerName = 'Finger') {
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
      console.log(`\n💡 === CAPTURING PNG IMAGE: ${fingerName} ===`);
      
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

      const onSamplesAcquired = async (event) => {
        if (resolved) return;
        
        console.log("⚡ FINGERPRINT IMAGE CAPTURED");

        try {
          const samples = event.samples;
          
          // Extract PNG image data
          let pngData;
          if (typeof samples === 'string') {
            pngData = samples;
          } else if (Array.isArray(samples) && samples.length > 0) {
            // samples array might contain objects with Data property
            pngData = samples[0].Data || samples[0];
          } else {
            throw new Error('Invalid sample format');
          }

          console.log("✅ PNG Data captured, length:", pngData.length);
          console.log("✅ First 100 chars:", pngData.substring(0, 100));

          // ⭐ FIX: Strip data URL prefix if present
          let cleanBase64 = pngData;
          
          if (pngData.includes('data:image')) {
            console.log("🔧 Removing data URL prefix...");
            const parts = pngData.split(',');
            if (parts.length === 2) {
              cleanBase64 = parts[1];
              console.log("✂️ Data URL prefix removed");
            }
          }
          
          // Remove any whitespace or newlines
          cleanBase64 = cleanBase64.replace(/\s/g, '');
          
          console.log("✅ Clean base64 length:", cleanBase64.length);

          // Calculate quality based on data size
          const quality = this.calculateImageQuality(cleanBase64);
          console.log("🎯 Image Quality:", quality + "%");

          if (quality < 30) {
            await safeResolve({
              success: false,
              error: "Image quality too low. Please press harder and center your finger.",
              quality
            });
            return;
          }

          await safeResolve({
            success: true,
            imageData: cleanBase64, // ⭐ Returns PURE base64 without prefix
            format: 'PNG',
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

      const onQualityReported = (event) => {
        console.log("📊 Quality feedback:", event.quality);
      };

      this.sdk.onSamplesAcquired = onSamplesAcquired;
      this.sdk.onErrorOccurred = onErrorOccurred;
      this.sdk.onQualityReported = onQualityReported;
      console.log("✅ Handlers attached");

      console.log("🚀 Starting PNG capture...");
      // 🔑 KEY: Use PngImage format
      this.sdk.startAcquisition(
        window.Fingerprint.SampleFormat.PngImage,
        this.reader
      ).then(() => {
        console.log("✅ Active - place finger on sensor\n");

        captureTimeout = setTimeout(async () => {
          if (!resolved) {
            console.error("⏱️ Timeout - no finger detected");
            await safeResolve({ 
              success: false, 
              error: "Timeout. Please try again." 
            });
          }
        }, 30000);

      }).catch(async (err) => {
        console.error("❌ Start failed:", err);
        await safeResolve({ 
          success: false, 
          error: "Could not start capture: " + err.message 
        });
      });
    });
  }

  async stop() {
    return await this.stopAcquisition();
  }

  async stopAcquisition() {
    await this._cleanup();
    return { success: true, message: 'Acquisition stopped' };
  }

  calculateImageQuality(base64Image) {
    if (!base64Image) return 0;
    
    // PNG images are larger than templates
    const len = base64Image.length;
    
    if (len < 5000) return 20;
    if (len < 15000) return 45;
    if (len < 30000) return 65;
    if (len < 50000) return 80;
    return 90;
  }

  /**
   * Compare two PNG fingerprint images
   * For production: Use server-side DigitalPersona SDK or third-party matching engine
   */
  async compareImages(image1, image2) {
    console.log('\n🔍 === COMPARING FINGERPRINT IMAGES ===');
    
    if (!image1 || !image2) {
      return {
        success: false,
        matched: false,
        error: "Invalid images"
      };
    }

    try {
      console.log(`📏 Image 1 size: ${image1.length} bytes`);
      console.log(`📏 Image 2 size: ${image2.length} bytes`);

      // Exact match check (for testing if same capture used twice)
      if (image1 === image2) {
        console.log('✅ EXACT MATCH - Same capture used');
        return {
          success: true,
          matched: true,
          similarity: 100,
          confidence: 100,
          note: 'Exact match'
        };
      }

      // ⚠️ IMPORTANT: For production, you should:
      // 1. Send images to your backend server
      // 2. Use DigitalPersona Server SDK for matching
      // 3. Or use a third-party biometric matching engine
      
      console.warn('⚠️ CLIENT-SIDE IMAGE COMPARISON IS FOR DEMO ONLY');
      console.warn('⚠️ Use server-side matching for production');

      // Simple pixel-based comparison (NOT secure, for demo only)
      const similarity = await this.compareImageData(image1, image2);
      
      const MATCH_THRESHOLD = 85; // Higher threshold for images
      const isMatch = similarity >= MATCH_THRESHOLD;
      
      console.log(`🔍 Similarity: ${similarity.toFixed(1)}% ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
      
      return {
        success: true,
        matched: isMatch,
        similarity: Math.round(similarity),
        confidence: Math.round(similarity),
        threshold: MATCH_THRESHOLD,
        warning: 'Demo comparison only - use server matching for production'
      };

    } catch (error) {
      console.error('❌ Comparison error:', error);
      return {
        success: false,
        matched: false,
        error: error.message
      };
    }
  }

  /**
   * Simple image comparison using Canvas API
   * For DEMO purposes only!
   * ⭐ FIXED: Now handles both pure base64 and data URLs
   */
  async compareImageData(base64_1, base64_2) {
    return new Promise((resolve, reject) => {
      try {
        const img1 = new Image();
        const img2 = new Image();
        
        let loaded = 0;
        const checkLoaded = () => {
          loaded++;
          if (loaded === 2) {
            const similarity = this.calculateImageSimilarity(img1, img2);
            resolve(similarity);
          }
        };

        img1.onload = checkLoaded;
        img2.onload = checkLoaded;
        
        img1.onerror = () => reject(new Error('Failed to load image 1'));
        img2.onerror = () => reject(new Error('Failed to load image 2'));
        
        // ⭐ FIX: Ensure data URL format for Image src
        const formatDataURL = (base64) => {
          if (base64.startsWith('data:image')) {
            return base64; // Already has prefix
          }
          return 'data:image/png;base64,' + base64; // Add prefix
        };
        
        img1.src = formatDataURL(base64_1);
        img2.src = formatDataURL(base64_2);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  calculateImageSimilarity(img1, img2) {
    const canvas1 = document.createElement('canvas');
    const canvas2 = document.createElement('canvas');
    
    const ctx1 = canvas1.getContext('2d');
    const ctx2 = canvas2.getContext('2d');
    
    // Resize to same dimensions for comparison
    canvas1.width = canvas2.width = 200;
    canvas1.height = canvas2.height = 200;
    
    ctx1.drawImage(img1, 0, 0, 200, 200);
    ctx2.drawImage(img2, 0, 0, 200, 200);
    
    const data1 = ctx1.getImageData(0, 0, 200, 200).data;
    const data2 = ctx2.getImageData(0, 0, 200, 200).data;
    
    let matches = 0;
    const total = data1.length;
    const threshold = 30; // Allow some pixel difference
    
    for (let i = 0; i < total; i += 4) {
      const diff = Math.abs(data1[i] - data2[i]) +
                   Math.abs(data1[i+1] - data2[i+1]) +
                   Math.abs(data1[i+2] - data2[i+2]);
      
      if (diff < threshold) matches += 4;
    }
    
    return (matches / total) * 100;
  }

  async checkForDuplicates(newImage, existingFingerprints, threshold = 85) {
    console.log(`\n🔍 DUPLICATE CHECK - Checking ${existingFingerprints.length} fingerprints`);

    try {
      if (!newImage) throw new Error('Invalid image');
      if (!Array.isArray(existingFingerprints)) throw new Error('Invalid fingerprints array');
      
      if (existingFingerprints.length === 0) {
        console.log('✅ No existing fingerprints\n');
        return {
          success: true,
          hasDuplicates: false,
          duplicates: [],
          message: 'No existing fingerprints'
        };
      }

      const duplicates = [];

      for (const existing of existingFingerprints) {
        if (!existing.imageData) continue;

        const comparison = await this.compareImages(newImage, existing.imageData);
        
        if (comparison.success && comparison.matched) {
          console.log(`🚨 DUPLICATE: ${existing.matricNumber} (${existing.fingerName})`);
          duplicates.push({
            studentId: existing.studentId,
            matricNumber: existing.matricNumber,
            fingerName: existing.fingerName,
            studentName: existing.studentName,
            similarity: comparison.similarity
          });
        }
      }

      const hasDuplicates = duplicates.length > 0;
      
      console.log(hasDuplicates ? '❌ DUPLICATE FOUND\n' : '✅ UNIQUE\n');

      return {
        success: true,
        hasDuplicates,
        duplicates,
        totalChecked: existingFingerprints.length,
        message: hasDuplicates 
          ? `Already registered to: ${duplicates[0].studentName}`
          : 'Unique fingerprint'
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
      message: "Scanner ready for PNG capture",
      reader: this.reader,
      format: "PNG Image"
    };
  }
}

// Export singleton
const fingerprintScanner = new DigitalPersonaFingerprint();

if (typeof window !== 'undefined') {
  window.debugFingerprint = fingerprintScanner;
  
  console.log('\n📘 DIGITALPERSONA PNG IMPLEMENTATION (FIXED)');
  console.log('=============================================');
  console.log('✅ Uses PNG image format for captures');
  console.log('✅ Returns pure base64 (no data URL prefix)');
  console.log('✅ Better compatibility and portability');
  console.log('⚠️  Client-side matching is for DEMO only');
  console.log('');
  console.log('📖 For Production:');
  console.log('   1. Capture as PNG (✓)');
  console.log('   2. Store images in your backend');
  console.log('   3. Use server-side matching engine');
  console.log('   4. Options: DigitalPersona Server SDK');
  console.log('      or third-party biometric SDK');
  console.log('=============================================\n');
}

export default fingerprintScanner;