// lib/face-recognition-browser.js
import * as faceapi from 'face-api.js';

class FaceRecognitionBrowser {
  constructor() {
    this.modelsLoaded = false;
    this.modelPath = '/models';
    this.MATCH_THRESHOLD = 0.5;
    console.log('🔧 FaceRecognitionBrowser initialized');
  }

  isReady() {
    return this.modelsLoaded;
  }

  /**
   * Check whether the loaded nets still have valid internal params.
   * After a Next.js Fast Refresh, the singleton survives but TensorFlow.js
   * disposes all tensors — the nets' params become null/undefined.
   * Running inference against them causes:
   *   "Cannot read properties of undefined (reading 'backend')"
   */
  _areModelsStale() {
    try {
      // Each net exposes a `params` property once loaded.
      // If params is falsy after we previously set modelsLoaded = true,
      // the tensors were disposed (e.g. by hot-reload).
      const ssd = faceapi.nets.ssdMobilenetv1;
      const landmark = faceapi.nets.faceLandmark68Net;
      const recognition = faceapi.nets.faceRecognitionNet;

      if (!ssd.params || !landmark.params || !recognition.params) {
        console.warn('⚠️  Model tensors are stale (disposed after hot-reload). Will reload.');
        return true;
      }
      return false;
    } catch (e) {
      // If accessing .params itself throws, treat as stale
      console.warn('⚠️  Could not check model params, treating as stale:', e.message);
      return true;
    }
  }

  /**
   * Ensure models are loaded and their tensors are still valid.
   * Call this before any inference operation.
   */
  async _ensureModels() {
    if (this.modelsLoaded && this._areModelsStale()) {
      console.log('🔄 Reloading models after hot-refresh...');
      this.modelsLoaded = false;
    }
    if (!this.modelsLoaded) {
      const result = await this.loadModels();
      if (!result.success) {
        throw new Error(result.error || 'Failed to load models');
      }
    }
  }

  /**
   * Load face-api.js models.
   * face-api.js automatically initializes TensorFlow.js backend internally.
   */
  async loadModels() {
    try {
      if (this.modelsLoaded && !this._areModelsStale()) {
        console.log('✅ Models already loaded');
        return { success: true, message: 'Models already loaded' };
      }

      // If we get here with modelsLoaded=true, it means tensors are stale
      this.modelsLoaded = false;

      console.log('📦 Loading face recognition models from:', this.modelPath);
      console.log('   This may take 10-30 seconds on first load...');

      const startTime = Date.now();

      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(this.modelPath),
        faceapi.nets.faceLandmark68Net.loadFromUri(this.modelPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(this.modelPath)
      ]);

      const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
      this.modelsLoaded = true;
      console.log(`✅ All models loaded successfully in ${loadTime}s`);

      return {
        success: true,
        message: 'Models loaded successfully',
        loadTime: parseFloat(loadTime)
      };

    } catch (error) {
      console.error('❌ Error loading models:', error);

      let errorMessage = error.message;
      if (error.message.includes('404')) {
        errorMessage = 'Model files not found. Ensure /public/models/ directory contains face-api.js models';
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Extract face descriptor from an image
   */
  async extractDescriptor(imageSource) {
    try {
      // ✅ Guard: reload models if tensors were disposed
      await this._ensureModels();

      console.log('📸 Extracting face descriptor from image...');

      const img = await faceapi.fetchImage(imageSource);

      const detection = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        return {
          success: false,
          error: 'NO_FACE_DETECTED',
          message: 'No face detected in image. Ensure good lighting and face is clearly visible.'
        };
      }

      const confidence = Math.round(detection.detection.score * 100);
      console.log(`✅ Face detected with ${confidence}% confidence`);

      return {
        success: true,
        descriptor: Array.from(detection.descriptor),
        confidence: confidence,
        detection: detection
      };

    } catch (error) {
      console.error('❌ Error extracting descriptor:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to extract face descriptor: ' + error.message
      };
    }
  }

  /**
   * Verify using manual Euclidean distance loop
   */
  async verifyFace(queryDescriptor, storedDescriptors) {
    try {
      await this._ensureModels();

      console.log(`🔍 Comparing against ${storedDescriptors.length} stored faces...`);

      const queryFloat32 = queryDescriptor instanceof Float32Array
        ? queryDescriptor
        : new Float32Array(queryDescriptor);

      let bestMatch = null;
      let bestDistance = Infinity;

      for (let i = 0; i < storedDescriptors.length; i++) {
        const stored = storedDescriptors[i];

        const storedFloat32 = stored.descriptor instanceof Float32Array
          ? stored.descriptor
          : new Float32Array(stored.descriptor);

        const distance = faceapi.euclideanDistance(queryFloat32, storedFloat32);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = {
            student: stored,
            distance: distance,
            confidence: Math.round((1 - distance) * 100)
          };
        }
      }

      console.log(`📊 Best match distance: ${bestDistance.toFixed(3)} (threshold: ${this.MATCH_THRESHOLD})`);

      if (bestDistance <= this.MATCH_THRESHOLD && bestMatch) {
        console.log(`✅ MATCH FOUND: ${bestMatch.student.firstName} ${bestMatch.student.surname}`);
        return {
          success: true,
          matched: true,
          student: bestMatch.student,
          confidence: bestMatch.confidence,
          distance: bestDistance,
          message: 'Face matched successfully'
        };
      } else {
        console.log(`❌ NO MATCH: Best distance ${bestDistance.toFixed(3)} exceeds threshold ${this.MATCH_THRESHOLD}`);
        return {
          success: true,
          matched: false,
          bestDistance: bestDistance,
          message: `No matching face found. Best distance: ${bestDistance.toFixed(3)} (threshold: ${this.MATCH_THRESHOLD})`
        };
      }

    } catch (error) {
      console.error('❌ Error during verification:', error);
      return { success: false, matched: false, error: error.message, message: 'Verification failed' };
    }
  }

  /**
   * Verify using face-api.js FaceMatcher (more accurate)
   */
  async verifyFaceWithMatcher(queryDescriptor, storedDescriptors) {
    try {
      await this._ensureModels();

      console.log(`🔍 Using FaceMatcher to compare against ${storedDescriptors.length} faces...`);

      const labeledDescriptors = storedDescriptors.map(stored => {
        const label = `${stored.matricNumber}|${stored.firstName}|${stored.surname}|${stored.studentId}`;
        const descriptor = stored.descriptor instanceof Float32Array
          ? stored.descriptor
          : new Float32Array(stored.descriptor);
        return new faceapi.LabeledFaceDescriptors(label, [descriptor]);
      });

      const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, this.MATCH_THRESHOLD);

      const queryFloat32 = queryDescriptor instanceof Float32Array
        ? queryDescriptor
        : new Float32Array(queryDescriptor);

      const bestMatch = faceMatcher.findBestMatch(queryFloat32);

      console.log(`📊 Best match: ${bestMatch.toString()}`);
      console.log(`   Distance: ${bestMatch.distance.toFixed(3)}, Threshold: ${this.MATCH_THRESHOLD}`);

      if (bestMatch.label !== 'unknown' && bestMatch.distance <= this.MATCH_THRESHOLD) {
        const [matricNumber, firstName, surname, studentId] = bestMatch.label.split('|');
        const studentData = storedDescriptors.find(s => s.studentId === studentId);

        console.log(`✅ MATCH FOUND: ${firstName} ${surname}`);

        return {
          success: true,
          matched: true,
          student: studentData || { matricNumber, firstName, surname, studentId },
          confidence: Math.round((1 - bestMatch.distance) * 100),
          distance: bestMatch.distance,
          message: 'Face matched successfully'
        };
      } else {
        console.log(`❌ NO MATCH: Distance ${bestMatch.distance.toFixed(3)} exceeds threshold`);
        return {
          success: true,
          matched: false,
          bestDistance: bestMatch.distance,
          message: `No matching face found. Distance: ${bestMatch.distance.toFixed(3)}`
        };
      }

    } catch (error) {
      console.error('❌ Error during FaceMatcher verification:', error);
      return { success: false, matched: false, error: error.message, message: 'Verification failed' };
    }
  }

  setThreshold(newThreshold) {
    console.log(`🔧 Threshold changed: ${this.MATCH_THRESHOLD} → ${newThreshold}`);
    this.MATCH_THRESHOLD = newThreshold;
  }

  getThreshold() {
    return this.MATCH_THRESHOLD;
  }
}

const faceRecognitionBrowser = new FaceRecognitionBrowser();
export default faceRecognitionBrowser;