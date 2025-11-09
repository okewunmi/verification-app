// lib/fingerprint-digitalpersona.js
// DigitalPersona U.are.U WebSDK Integration for Microsoft Fingerprint Reader 4200

/**
 * DigitalPersona Fingerprint Scanner Controller
 * Handles all fingerprint operations using the WebSDK
 */
class DigitalPersonaScanner {
  constructor() {
    this.sdk = null;
    this.currentReader = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the DigitalPersona SDK
   * Must be called before any fingerprint operations
   */
  async initialize() {
    try {
      // Check if SDK is loaded
      if (typeof Fingerprint === 'undefined') {
        throw new Error(
          'DigitalPersona SDK not loaded. Please install the DigitalPersona Client software from https://www.digitalpersona.com/'
        );
      }

      console.log('🔧 Initializing DigitalPersona SDK...');

      // Create SDK instance
      this.sdk = new Fingerprint.WebApi();

      // Start acquisition
      await this.sdk.startAcquisition(Fingerprint.SampleFormat.PngImage);

      this.isInitialized = true;
      console.log('✅ DigitalPersona SDK initialized successfully');

      return { success: true };

    } catch (error) {
      console.error('❌ SDK initialization failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to initialize fingerprint scanner'
      };
    }
  }

  /**
   * Capture fingerprint from scanner
   * Returns template string that can be stored/compared
   */
  async capture() {
    try {
      if (!this.isInitialized) {
        const initResult = await this.initialize();
        if (!initResult.success) {
          throw new Error(initResult.error);
        }
      }

      console.log('👆 Waiting for fingerprint...');

      // Wait for fingerprint sample (this will show device prompt)
      const samples = await this.sdk.getSamples();

      if (!samples || samples.length === 0) {
        throw new Error('No fingerprint detected. Please try again.');
      }

      const sample = samples[0];
      console.log('📸 Fingerprint sample captured');

      // Extract template from sample
      const template = await this.extractTemplate(sample);

      console.log('✅ Fingerprint template created');

      return {
        success: true,
        template: template, // String template for storage/comparison
        image: sample.Data, // Base64 PNG image (optional)
        quality: this.assessQuality(sample)
      };

    } catch (error) {
      console.error('❌ Capture failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to capture fingerprint'
      };
    }
  }

  /**
   * Extract feature template from fingerprint sample
   * This template is what we store in the database
   */
  async extractTemplate(sample) {
    try {
      const engine = new Fingerprint.FeaturesApi();
      
      // Create feature set (template)
      const featureSet = await engine.createFeatureSet(
        sample,
        Fingerprint.FingerprintType.Unknown
      );

      // Return template as string
      return featureSet.Data;

    } catch (error) {
      console.error('❌ Template extraction failed:', error);
      throw new Error('Failed to extract fingerprint template');
    }
  }

  /**
   * Compare two fingerprint templates
   * Returns match result with confidence score
   */
  async compare(template1, template2) {
    try {
      const engine = new Fingerprint.FeaturesApi();

      // Compare templates
      const result = await engine.compare(
        { Data: template1 },
        { Data: template2 }
      );

      // Calculate confidence score (0-100)
      // FAR (False Acceptance Rate): Lower is better match
      const confidence = (1 - result.FAR) * 100;

      console.log(`📊 Comparison - Matched: ${result.matched}, Confidence: ${confidence.toFixed(1)}%`);

      return {
        matched: result.matched,
        confidence: confidence.toFixed(1),
        far: result.FAR // For debugging
      };

    } catch (error) {
      console.error('❌ Comparison failed:', error);
      return {
        matched: false,
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Assess fingerprint quality
   */
  assessQuality(sample) {
    // DigitalPersona provides quality metrics
    // Values typically range from 0-100
    return sample.Quality || 'Unknown';
  }

  /**
   * Stop fingerprint acquisition
   */
  async stop() {
    try {
      if (this.sdk && this.isInitialized) {
        await this.sdk.stopAcquisition();
        this.isInitialized = false;
        console.log('🛑 Scanner stopped');
      }
    } catch (error) {
      console.error('Error stopping scanner:', error);
    }
  }

  /**
   * Get available fingerprint readers
   */
  async getReaders() {
    try {
      if (!this.sdk) {
        await this.initialize();
      }

      const readers = await this.sdk.enumerateDevices();
      console.log('📱 Available readers:', readers);
      return readers;

    } catch (error) {
      console.error('Error getting readers:', error);
      return [];
    }
  }
}

// Export singleton instance
export default new DigitalPersonaScanner();