// lib/face-enrollment.js
// Helper functions for enrolling student faces

import faceRecognition from '@/lib/face-recognition-browser';
import { databases, config } from '@/lib/appwrite';


/**
 * Enroll a single student's face from their profile picture URL
 */
export async function enrollStudentFace(student) {
  try {
    if (!student.profilePictureUrl) {
      return {
        success: false,
        error: 'NO_PHOTO',
        message: 'Student has no profile picture'
      };
    }

    console.log(`📸 Enrolling face for ${student.firstName} ${student.surname}...`);

    // Ensure models are loaded
    if (!faceRecognition.isReady()) {
      await faceRecognition.loadModels();
    }

    // Extract face descriptor from profile picture
    const extractResult = await faceRecognition.extractDescriptor(student.profilePictureUrl);

    if (!extractResult.success) {
      return {
        success: false,
        error: extractResult.error,
        message: extractResult.message
      };
    }

    // Save descriptor to database
    await databases.updateDocument(
      config.databaseId,
      config.studentsCollectionId,
      student.$id,
      {
        faceDescriptor: JSON.stringify(extractResult.descriptor),
        faceCaptured: true,
        faceCapturedAt: new Date().toISOString()
      }
    );

    console.log(`✅ Face enrolled (confidence: ${extractResult.confidence}%)`);

    return {
      success: true,
      confidence: extractResult.confidence,
      message: 'Face enrolled successfully'
    };

  } catch (error) {
    console.error('Enrollment error:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to enroll face'
    };
  }
}

/**
 * Batch enroll all students with profile pictures
 * Run this once to migrate existing students
 */
export async function batchEnrollAllFaces() {
  try {
    console.log('🔄 Starting batch face enrollment...');

    // Ensure models are loaded
    if (!faceRecognition.isReady()) {
      console.log('📦 Loading face recognition models...');
      const loadResult = await faceRecognition.loadModels();
      if (!loadResult.success) {
        throw new Error('Failed to load models: ' + loadResult.error);
      }
    }

    // Get all students with profile pictures
    const { Query } = await import('appwrite');
    const response = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [
        Query.equal('isActive', true),
        Query.isNotNull('profilePictureUrl'),
        Query.limit(1000)
      ]
    );

    const studentsWithPhotos = response.documents.filter(
      s => s.profilePictureUrl && s.profilePictureUrl.trim() !== ''
    );

    console.log(`📋 Found ${studentsWithPhotos.length} students with profile pictures`);

    if (studentsWithPhotos.length === 0) {
      return {
        success: true,
        enrolled: 0,
        failed: 0,
        message: 'No students to enroll'
      };
    }

    const results = {
      enrolled: 0,
      failed: 0,
      errors: []
    };

    // Process each student
    for (let i = 0; i < studentsWithPhotos.length; i++) {
      const student = studentsWithPhotos[i];
      
      console.log(`\n[${i + 1}/${studentsWithPhotos.length}] Processing ${student.firstName} ${student.surname}...`);

      try {
        const enrollResult = await enrollStudentFace(student);

        if (enrollResult.success) {
          results.enrolled++;
          console.log(`  ✅ Enrolled successfully (${enrollResult.confidence}% confidence)`);
        } else {
          results.failed++;
          results.errors.push({
            student: `${student.firstName} ${student.surname}`,
            matricNumber: student.matricNumber,
            error: enrollResult.message
          });
          console.log(`  ❌ Failed: ${enrollResult.message}`);
        }

        // Small delay to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        results.failed++;
        results.errors.push({
          student: `${student.firstName} ${student.surname}`,
          matricNumber: student.matricNumber,
          error: error.message
        });
        console.error(`  ❌ Error:`, error.message);
      }
    }

    console.log('\n=== ENROLLMENT COMPLETE ===');
    console.log(`✅ Successfully enrolled: ${results.enrolled}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log('===========================\n');

    return {
      success: true,
      enrolled: results.enrolled,
      failed: results.failed,
      total: studentsWithPhotos.length,
      errors: results.errors,
      message: `Enrolled ${results.enrolled}/${studentsWithPhotos.length} students`
    };

  } catch (error) {
    console.error('Batch enrollment error:', error);
    return {
      success: false,
      error: error.message,
      enrolled: 0,
      failed: 0
    };
  }
}