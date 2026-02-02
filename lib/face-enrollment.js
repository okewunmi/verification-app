// lib/face-enrollment.js
// Face enrollment utilities for batch processing

/**
 * Enroll a student's face from their profile picture
 * Extracts face descriptor and saves to database
 */
export const enrollStudentFace = async (student) => {
  try {
    console.log(`📸 Enrolling face for ${student.firstName} ${student.surname}...`);

    // Import libraries
    const faceRecognition = (await import('@/lib/face-recognition-browser')).default;
    const { updateStudentFaceDescriptor } = await import('@/lib/appwrite');

    // Ensure models are loaded (face-recognition-browser handles this internally)
    if (!faceRecognition.modelsLoaded) {
      console.log('Loading models...');
      const loadResult = await faceRecognition.loadModels();
      if (!loadResult.success) {
        throw new Error('Failed to load face recognition models');
      }
    }

    // Validate profile picture URL
    if (!student.profilePictureUrl || student.profilePictureUrl.trim() === '') {
      return {
        success: false,
        message: 'No profile picture available'
      };
    }

    console.log(`Loading image from: ${student.profilePictureUrl}`);

    // Load image
    const img = await loadImageFromUrl(student.profilePictureUrl, 30000); // 30 second timeout
    
    if (!img) {
      return {
        success: false,
        message: 'Failed to load profile picture'
      };
    }

    console.log(`Image loaded: ${img.width}x${img.height}`);

    // Extract face descriptor
    console.log('Extracting face descriptor...');
    const extractResult = await faceRecognition.extractDescriptorFromElement(img);

    if (!extractResult.success) {
      return {
        success: false,
        message: extractResult.message || 'Failed to detect face in profile picture'
      };
    }

    console.log(`Face detected with ${extractResult.confidence}% confidence`);

    // Validate descriptor
    if (!Array.isArray(extractResult.descriptor) || extractResult.descriptor.length !== 128) {
      return {
        success: false,
        message: 'Invalid face descriptor extracted'
      };
    }

    // Save to database
    console.log('Saving face descriptor to database...');
    const saveResult = await updateStudentFaceDescriptor(
      student.$id,
      extractResult.descriptor,
      extractResult.confidence
    );

    if (!saveResult.success) {
      return {
        success: false,
        message: saveResult.error || 'Failed to save face descriptor'
      };
    }

    console.log(`✅ Face enrolled successfully for ${student.firstName} ${student.surname}`);

    return {
      success: true,
      confidence: extractResult.confidence,
      message: 'Face enrolled successfully'
    };

  } catch (error) {
    console.error('Enrollment error:', error);
    return {
      success: false,
      message: error.message || 'Failed to enroll face'
    };
  }
};

/**
 * Load image from URL (handles CORS and creates HTMLImageElement)
 * ⭐ THIS FUNCTION WAS MISSING - NOW ADDED
 */
const loadImageFromUrl = (url, timeout = 30000) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let timeoutId;
    
    // Enable CORS
    img.crossOrigin = 'anonymous';
    
    // Clear timeout on success
    img.onload = () => {
      clearTimeout(timeoutId);
      console.log(`✅ Image loaded successfully: ${img.width}x${img.height}`);
      resolve(img);
    };
    
    // Clear timeout on error
    img.onerror = (error) => {
      clearTimeout(timeoutId);
      console.error('❌ Failed to load image:', error);
      console.error('URL:', url);
      reject(new Error('Failed to load image. Possible CORS issue or invalid URL.'));
    };
    
    // Add timestamp to bypass cache
    const urlWithTimestamp = url.includes('?') 
      ? `${url}&t=${Date.now()}` 
      : `${url}?t=${Date.now()}`;
    
    img.src = urlWithTimestamp;
    
    // Set timeout - only reject if image hasn't loaded
    timeoutId = setTimeout(() => {
      if (!img.complete) {
        reject(new Error(`Image load timeout after ${timeout}ms`));
      }
    }, timeout);
  });
};

/**
 * Validate that a descriptor is properly formatted
 */
export const validateDescriptor = (descriptor) => {
  if (!Array.isArray(descriptor)) {
    return { valid: false, error: 'Descriptor is not an array' };
  }
  
  if (descriptor.length !== 128) {
    return { valid: false, error: `Invalid length: ${descriptor.length} (expected 128)` };
  }
  
  const allNumbers = descriptor.every(val => typeof val === 'number' && !isNaN(val));
  if (!allNumbers) {
    return { valid: false, error: 'Descriptor contains non-numeric values' };
  }
  
  return { valid: true };
};