// lib/appwrite.js
import {
  Account,
  Avatars,
  Client,
  Databases,
  Functions,
  ID,
  Query,
  Storage,
  Role,
  Permission
} from 'appwrite';
import bcrypt from 'bcryptjs';
// Use const instead of export const to avoid Next.js page config issues
const config = {
  endpoint: "https://nyc.cloud.appwrite.io/v1",
  platform: "5-fingerprint",
  projectId: "68e83bca0016577d1322",
  databaseId: "68e84359003dccd0b700",
  usersCollectionId: "user",
  studentsCollectionId: "student",
  studentAuthCollectionId: "studentauth",
  bucketId: "68ecda1b0032528659b2",
  coursesCollectionId: "courses",
  courseRegistrationCollectionId: "courseregistration",
};

const {
  endpoint,
  platform,
  projectId,
  databaseId,
  usersCollectionId,
  studentsCollectionId,
  coursesCollectionId,
  bucketId,
  courseRegistrationCollectionId
} = config;

const client = new Client();

client
  .setEndpoint(config.endpoint)
  .setProject(config.projectId);

const account = new Account(client);
const storage = new Storage(client);
const databases = new Databases(client);

// Login function
export const login = async (email, password) => {
  try {
    const session = await account.createEmailPasswordSession(email, password);
    return { success: true, user: session };
  } catch (error) {
    throw new Error(error.message || 'Login failed');
  }
};

// Logout function - Fixed to delete current session
export const logOut = async () => {
  try {
    // Delete the current session (pass 'current' as parameter)
    await account.deleteSession('current');
    return { success: true };
  } catch (error) {
    throw new Error(error.message || 'Logout failed');
  }
};

// Get current user
export const getCurrentUser = async () => {
  try {
    const currentAccount = await account.get();
    return currentAccount;
  } catch (error) {
    console.log('No user logged in:', error);
    return null;
  }
};

//  Generate department code from course name

export const generateDepartmentCode = (courseName) => {
  if (!courseName) return '';

  const words = courseName.trim()
    .split(/\s+/)
    .filter(word => word.toLowerCase() !== 'and');

  const code = words.map(word => word.charAt(0).toUpperCase()).join('');
  return code;
};

/**
 * Generate unique matric number
 * Format: FTP/CS/24/0000001
 */

export const generateMatricNumber = async (course) => {
  try {
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const deptCode = generateDepartmentCode(course);

    // Get count of students with same course code this year
    const currentYearPrefix = `FTP/${deptCode}/${currentYear}/`;

    // Use Query.search or Query.contains instead of startsWith
    const response = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [
        Query.orderDesc('$createdAt'),
        Query.limit(100) // Limit to prevent timeout
      ]
    );

    // Filter manually to count students with matching prefix
    const matchingStudents = response.documents.filter(doc =>
      doc.matricNumber && doc.matricNumber.startsWith(currentYearPrefix)
    );

    const count = matchingStudents.length;
    const serialNumber = String(count + 1).padStart(7, '0');

    return `FTP/${deptCode}/${currentYear}/${serialNumber}`;
  } catch (error) {
    console.error('Error generating matric number:', error);
    console.error('Error details:', error.message, error.code);
    throw new Error(`Failed to generate matric number: ${error.message}`);
  }
};

/**
 * Upload profile picture to Appwrite Storage
 */

export const uploadProfilePicture = async (file) => {
  try {
    if (!file) return null;

    const fileId = ID.unique();
    const response = await storage.createFile(
      config.bucketId,
      fileId,
      file,
      [
        Permission.read(Role.any()),  // Allow anyone to read
      ]
    );

    // Use getFileView instead of getFilePreview to avoid transformation restrictions
    const fileUrl = storage.getFileView(
      config.bucketId,
      response.$id
    );

    const finalUrl = fileUrl.href || fileUrl.toString();
    console.log('Uploaded file URL:', finalUrl);

    return {
      fileId: response.$id,
      fileUrl: finalUrl
    };
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    throw new Error('Failed to upload profile picture');
  }
};
/**
 * Delete profile picture from storage
 */
export const deleteProfilePicture = async (fileId) => {
  try {
    if (!fileId) return;
    await storage.deleteFile(config.bucketId, fileId);
  } catch (error) {
    console.error('Error deleting profile picture:', error);
  }
};

// ========================================
// STUDENT CRUD OPERATIONS
// ========================================

/**
 * Get all students with optional filters
 */
export const getAllStudents = async (filters = {}) => {
  try {
    const queries = [Query.equal('isActive', true)];

    if (filters.department) {
      queries.push(Query.equal('department', filters.department));
    }

    if (filters.level) {
      queries.push(Query.equal('level', filters.level));
    }

    if (filters.search) {
      queries.push(Query.search('matricNumber', filters.search));
    }

    const response = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      queries
    );

    return { success: true, data: response.documents, total: response.total };
  } catch (error) {
    console.error('Error fetching students:', error);
    return { success: false, error: error.message, data: [] };
  }
};
/**
 * Get student by matric number
 */
export const getStudentByMatricNumber = async (matricNumber) => {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [Query.equal('matricNumber', matricNumber)]
    );

    if (response.documents.length === 0) {
      return { success: false, error: 'Student not found' };
    }

    return { success: true, data: response.documents[0] };
  } catch (error) {
    console.error('Error fetching student:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get student by document ID
 */
export const getStudentById = async (documentId) => {
  try {
    const student = await databases.getDocument(
      config.databaseId,
      config.studentsCollectionId,
      documentId
    );

    return { success: true, data: student };
  } catch (error) {
    console.error('Error fetching student:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update student information
 */
export const updateStudent = async (documentId, updates, newProfilePicture = null) => {
  try {
    let pictureData = null;

    // Handle profile picture update
    if (newProfilePicture) {
      const student = await getStudentById(documentId);

      // Delete old picture if exists
      if (student.success && student.data.profilePictureId) {
        await deleteProfilePicture(student.data.profilePictureId);
      }

      // Upload new picture
      pictureData = await uploadProfilePicture(newProfilePicture);
    }

    const updateData = { ...updates };
    if (pictureData) {
      updateData.profilePictureId = pictureData.fileId;
      updateData.profilePictureUrl = pictureData.fileUrl;
    }

    const student = await databases.updateDocument(
      config.databaseId,
      config.studentsCollectionId,
      documentId,
      updateData
    );

    return { success: true, data: student };
  } catch (error) {
    console.error('Error updating student:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete student (soft delete)
 */
export const deleteStudent = async (documentId) => {
  try {
    // Soft delete - mark as inactive
    await databases.updateDocument(
      config.databaseId,
      config.studentsCollectionId,
      documentId,
      { isActive: false }
    );

    return { success: true };
  } catch (error) {
    console.error('Error deleting student:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Permanently delete student (hard delete)
 */
export const permanentlyDeleteStudent = async (documentId) => {
  try {
    const student = await getStudentById(documentId);

    // Delete profile picture from storage
    if (student.success && student.data.profilePictureId) {
      await deleteProfilePicture(student.data.profilePictureId);
    }

    // Delete document
    await databases.deleteDocument(
      config.databaseId,
      config.studentsCollectionId,
      documentId
    );

    return { success: true };
  } catch (error) {
    console.error('Error permanently deleting student:', error);
    return { success: false, error: error.message };
  }
};

// ========================================
// FINGERPRINT OPERATIONS
// ========================================

/**
 * Save fingerprints to student record
 */
export const saveFingerprints = async (documentId, fingerprintData) => {
  try {
    const student = await databases.updateDocument(
      config.databaseId,
      config.studentsCollectionId,
      documentId,
      {
        thumbTemplate: fingerprintData.thumb || '',
        indexTemplate: fingerprintData.index || '',
        middleTemplate: fingerprintData.middle || '',
        ringTemplate: fingerprintData.ring || '',
        pinkyTemplate: fingerprintData.pinky || '',
        // fingerprintQuality: JSON.stringify(fingerprintData.quality || {}),
        fingerprintsCapturedAt: new Date().toISOString(),
        fingerprintsCaptured: true
      }
    );

    return { success: true, data: student };
  } catch (error) {
    console.error('Error saving fingerprints:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get student fingerprints
 */
export const getFingerprints = async (documentId) => {
  try {
    const student = await databases.getDocument(
      config.databaseId,
      config.studentsCollectionId,
      documentId
    );

    if (!student.fingerprintsCaptured) {
      return { success: false, error: 'No fingerprints captured for this student' };
    }

    const fingerprints = {
      thumb: student.fingerprintThumb,
      index: student.fingerprintIndex,
      middle: student.fingerprintMiddle,
      ring: student.fingerprintRing,
      pinky: student.fingerprintPinky,
      quality: JSON.parse(student.fingerprintQuality || '{}'),
      capturedAt: student.fingerprintsCapturedAt
    };

    return { success: true, data: fingerprints };
  } catch (error) {
    console.error('Error fetching fingerprints:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verify fingerprint against stored templates
 */
export const verifyFingerprint = async (capturedTemplate) => {
  try {
    // Get all students with fingerprints
    const response = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [Query.equal('fingerprintsCaptured', true)]
    );

    // In production, use proper fingerprint matching algorithm
    // This is a simplified simulation
    for (const student of response.documents) {
      const fingerprints = [
        student.fingerprintThumb,
        student.fingerprintIndex,
        student.fingerprintMiddle,
        student.fingerprintRing,
        student.fingerprintPinky
      ];

      // Simulate matching (replace with actual fingerprint SDK)
      for (const storedTemplate of fingerprints) {
        if (storedTemplate && capturedTemplate === storedTemplate) {
          return {
            success: true,
            matched: true,
            student: student,
            confidence: 95
          };
        }
      }
    }

    return { success: true, matched: false };
  } catch (error) {
    console.error('Error verifying fingerprint:', error);
    return { success: false, error: error.message };
  }
};

// ========================================
// STATISTICS & REPORTS
// ========================================

/**
 * Get student statistics
 */

export const getStudentStats = async () => {
  try {
    const allStudents = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [Query.equal('isActive', true)]
    );

    const verified = allStudents.documents.filter(s => s.fingerprintsCaptured).length;
    const pending = allStudents.total - verified;

    const byDepartment = {};
    const byLevel = {};

    allStudents.documents.forEach(student => {
      byDepartment[student.department] = (byDepartment[student.department] || 0) + 1;
      byLevel[student.level] = (byLevel[student.level] || 0) + 1;
    });

    return {
      success: true,
      data: {
        total: allStudents.total,
        verified,
        pending,
        byDepartment,
        byLevel
      }
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return { success: false, error: error.message };
  }
};


// ========================================
// STUDENT AUTHENTICATION FUNCTIONS
// ========================================

/**
 * Create student auth credentials
 * Username: Matric Number
 * Password: Surname (hashed for security)
 */
export const createStudentAuthCredentials = async (matricNumber, surname, studentDocId) => {
  try {
    // Hash the password (surname) for security
    const hashedPassword = await hashPassword(surname);

    const authCredentials = await databases.createDocument(
      config.databaseId,
      config.studentAuthCollectionId,
      ID.unique(),
      {
        username: matricNumber, // Matric number as username
        password: hashedPassword, // Hashed surname as password
        studentDocId: studentDocId, // Link to student record
        lastLogin: '',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    );

    return { success: true, data: authCredentials };
  } catch (error) {
    console.error('Error creating student auth:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Simple password hashing function
 * In production, use bcrypt or similar library
 */

export const hashPassword = async (password) => {
  return await bcrypt.hash(password.toLowerCase(), 10);
};

export const verifyPassword = async (inputPassword, hashedPassword) => {
  return await bcrypt.compare(inputPassword.toLowerCase(), hashedPassword);
};


/**
 * Student Login Function
 */
export const studentLogin = async (matricNumber, password) => {
  try {
    // Find student auth by username (matric number)
    const response = await databases.listDocuments(
      config.databaseId,
      config.studentAuthCollectionId,
      [
        Query.equal('username', matricNumber),
        Query.equal('isActive', true)
      ]
    );

    if (response.documents.length === 0) {
      return {
        success: false,
        error: 'Invalid matric number or password'
      };
    }

    const authRecord = response.documents[0];

    // Verify password
    const isPasswordValid = await verifyPassword(password, authRecord.password);

    if (!isPasswordValid) {
      return {
        success: false,
        error: 'Invalid matric number or password'
      };
    }

    // Get full student details
    const studentResult = await getStudentById(authRecord.studentDocId);

    if (!studentResult.success) {
      return {
        success: false,
        error: 'Student record not found'
      };
    }

    // Update last login time
    await databases.updateDocument(
      config.databaseId,
      config.studentAuthCollectionId,
      authRecord.$id,
      { lastLogin: new Date().toISOString() }
    );

    return {
      success: true,
      user: studentResult.data,
      authId: authRecord.$id,
      message: 'Login successful'
    };

  } catch (error) {
    console.error('Error during student login:', error);
    return {
      success: false,
      error: 'Login failed. Please try again.'
    };
  }
};

/**
 * Change student password
 */
export const changeStudentPassword = async (matricNumber, oldPassword, newPassword) => {
  try {
    // Verify old password first
    const loginResult = await studentLogin(matricNumber, oldPassword);

    if (!loginResult.success) {
      return {
        success: false,
        error: 'Current password is incorrect'
      };
    }

    // Get auth record
    const response = await databases.listDocuments(
      config.databaseId,
      config.studentAuthCollectionId,
      [Query.equal('username', matricNumber)]
    );

    if (response.documents.length === 0) {
      return { success: false, error: 'Account not found' };
    }

    const authRecord = response.documents[0];
    const newHashedPassword = await hashPassword(newPassword);

    // Update password
    await databases.updateDocument(
      config.databaseId,
      config.studentAuthCollectionId,
      authRecord.$id,
      { password: newHashedPassword }
    );

    return {
      success: true,
      message: 'Password changed successfully'
    };

  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Reset student password (Admin only)
 */
export const resetStudentPassword = async (matricNumber) => {
  try {
    // Get student by matric number
    const studentResult = await getStudentByMatricNumber(matricNumber);

    if (!studentResult.success) {
      return { success: false, error: 'Student not found' };
    }

    const student = studentResult.data;

    // Reset password to surname
    const response = await databases.listDocuments(
      config.databaseId,
      config.studentAuthCollectionId,
      [Query.equal('username', matricNumber)]
    );

    if (response.documents.length === 0) {
      return { success: false, error: 'Auth record not found' };
    }

    const authRecord = response.documents[0];
    const resetPassword = await hashPassword(student.surname);

    await databases.updateDocument(
      config.databaseId,
      config.studentAuthCollectionId,
      authRecord.$id,
      { password: resetPassword }
    );

    return {
      success: true,
      message: 'Password reset to surname successfully',
      defaultPassword: student.surname
    };

  } catch (error) {
    console.error('Error resetting password:', error);
    return { success: false, error: error.message };
  }
};

// ========================================
// UPDATED CREATE STUDENT FUNCTION
// ========================================

/**
 * Create new student WITH authentication credentials
 */
export const createStudent = async (studentData, profilePictureFile = null) => {
  try {
    const matricNumber = await generateMatricNumber(studentData.course);

    let pictureData = { fileId: null, fileUrl: null };
    if (profilePictureFile) {
      pictureData = await uploadProfilePicture(profilePictureFile);
    }

    // Create student record
    const student = await databases.createDocument(
      config.databaseId,
      config.studentsCollectionId,
      ID.unique(),
      {
        matricNumber,
        surname: studentData.surname,
        firstName: studentData.firstName,
        middleName: studentData.middleName,
        age: parseInt(studentData.age),
        phoneNumber: studentData.phoneNumber,
        email: studentData.email,
        department: studentData.department,
        course: studentData.course,
        level: studentData.level,
        ...(pictureData.fileUrl && { profilePictureUrl: pictureData.fileUrl }),
        fingerprintsCaptured: false,
        thumbTemplate: '',
        indexTemplate: '',
        middleTemplate: '',
        ringTemplate: '',
        pinkyTemplate: '',
        fingerprintsCapturedAt: '',
        isActive: true,
      }
    );

    // Create authentication credentials automatically
    const authResult = await createStudentAuthCredentials(
      matricNumber,
      studentData.surname,
      student.$id
    );

    if (!authResult.success) {
      // Rollback: Delete student record if auth creation fails
      await databases.deleteDocument(
        config.databaseId,
        config.studentsCollectionId,
        student.$id
      );

      return {
        success: false,
        error: 'Failed to create login credentials'
      };
    }

    return {
      success: true,
      data: student,
      matricNumber,
      credentials: {
        username: matricNumber,
        defaultPassword: studentData.surname,
        message: 'Login credentials created. Username: Matric Number, Password: Surname'
      }
    };

  } catch (error) {
    console.error('Error creating student:', error);
    return { success: false, error: error.message };
  }
};

// ========================================
// COURSE MANAGEMENT FUNCTIONS
// ========================================

/**
 * Create single course
 */
export const createCourse = async (courseData) => {
  try {
    const course = await databases.createDocument(
      config.databaseId,
      config.coursesCollectionId,
      ID.unique(),
      {
        courseCode: courseData.courseCode.toUpperCase(),
        courseTitle: courseData.courseTitle,
        courseUnit: parseInt(courseData.courseUnit),
        semester: courseData.semester,
        level: courseData.level,
        department: courseData.department,
        description: courseData.description || '',
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: courseData.createdBy || 'admin'
      }
    );

    return { success: true, data: course };
  } catch (error) {
    console.error('Error creating course:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create multiple courses (bulk insert)
 */
export const createMultipleCourses = async (coursesArray) => {
  try {
    const results = [];
    const errors = [];

    for (const courseData of coursesArray) {
      const result = await createCourse(courseData);
      
      if (result.success) {
        results.push(result.data);
      } else {
        errors.push({
          course: courseData.courseCode,
          error: result.error
        });
      }
    }

    return {
      success: errors.length === 0,
      data: results,
      errors: errors,
      message: `${results.length} courses created successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`
    };
  } catch (error) {
    console.error('Error creating multiple courses:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all courses with optional filters
 */
export const getAllCourses = async (filters = {}) => {
  try {
    const queries = [Query.equal('isActive', true)];
    
    if (filters.department) {
      queries.push(Query.equal('department', filters.department));
    }
    
    if (filters.level) {
      queries.push(Query.equal('level', filters.level));
    }
    
    if (filters.semester) {
      queries.push(Query.equal('semester', filters.semester));
    }
    
    if (filters.search) {
      // Search in course code or title
      queries.push(Query.search('courseCode', filters.search));
    }

    queries.push(Query.orderDesc('$createdAt'));

    const response = await databases.listDocuments(
      config.databaseId,
      config.coursesCollectionId,
      queries
    );

    return { success: true, data: response.documents, total: response.total };
  } catch (error) {
    console.error('Error fetching courses:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get course by ID
 */
export const getCourseById = async (documentId) => {
  try {
    const course = await databases.getDocument(
      config.databaseId,
      config.coursesCollectionId,
      documentId
    );

    return { success: true, data: course };
  } catch (error) {
    console.error('Error fetching course:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get course by course code
 */
export const getCourseByCourseCode = async (courseCode) => {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.coursesCollectionId,
      [Query.equal('courseCode', courseCode.toUpperCase())]
    );

    if (response.documents.length === 0) {
      return { success: false, error: 'Course not found' };
    }

    return { success: true, data: response.documents[0] };
  } catch (error) {
    console.error('Error fetching course:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update course
 */
export const updateCourse = async (documentId, updates) => {
  try {
    const course = await databases.updateDocument(
      config.databaseId,
      config.coursesCollectionId,
      documentId,
      updates
    );

    return { success: true, data: course };
  } catch (error) {
    console.error('Error updating course:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete course (soft delete)
 */
export const deleteCourse = async (documentId) => {
  try {
    await databases.updateDocument(
      config.databaseId,
      config.coursesCollectionId,
      documentId,
      { isActive: false }
    );

    return { success: true };
  } catch (error) {
    console.error('Error deleting course:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Permanently delete course (hard delete)
 */
export const permanentlyDeleteCourse = async (documentId) => {
  try {
    await databases.deleteDocument(
      config.databaseId,
      config.coursesCollectionId,
      documentId
    );

    return { success: true };
  } catch (error) {
    console.error('Error permanently deleting course:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get courses by student level and department
 */
export const getCoursesByLevelAndDepartment = async (level, department) => {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.coursesCollectionId,
      [
        Query.equal('level', level),
        Query.equal('department', department),
        Query.equal('isActive', true),
        Query.orderAsc('courseCode')
      ]
    );

    return { success: true, data: response.documents };
  } catch (error) {
    console.error('Error fetching courses:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get course statistics
 */
export const getCourseStats = async () => {
  try {
    const allCourses = await databases.listDocuments(
      config.databaseId,
      config.coursesCollectionId,
      [Query.equal('isActive', true)]
    );

    const byDepartment = {};
    const byLevel = {};
    const bySemester = {};

    allCourses.documents.forEach(course => {
      byDepartment[course.department] = (byDepartment[course.department] || 0) + 1;
      byLevel[course.level] = (byLevel[course.level] || 0) + 1;
      bySemester[course.semester] = (bySemester[course.semester] || 0) + 1;
    });

    return {
      success: true,
      data: {
        total: allCourses.total,
        byDepartment,
        byLevel,
        bySemester
      }
    };
  } catch (error) {
    console.error('Error fetching course stats:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if course code exists
 */
export const courseCodeExists = async (courseCode) => {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.coursesCollectionId,
      [Query.equal('courseCode', courseCode.toUpperCase())]
    );

    return response.documents.length > 0;
  } catch (error) {
    console.error('Error checking course code:', error);
    return false;
  }
};

// ========================================
// DASHBOARD STATISTICS FUNCTIONS
// ========================================

/**
 * Get comprehensive dashboard statistics (UPDATED)
 */

export const getDashboardStats = async () => {
  try {
    // Get total students
    const studentsResponse = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [Query.equal('isActive', true)]
    );

    // Get verified students (with fingerprints captured)
    const verifiedStudents = studentsResponse.documents.filter(
      student => student.fingerprintsCaptured === true
    );

    // Get active courses
    const coursesResponse = await databases.listDocuments(
      config.databaseId,
      config.coursesCollectionId,
      [Query.equal('isActive', true)]
    );

    // Get pending course registrations
    const pendingRegistrations = await getPendingRegistrationsCount();

    return {
      success: true,
      data: {
        totalStudents: studentsResponse.total,
        activeCourses: coursesResponse.total,
        verifiedStudents: verifiedStudents.length,
        pendingRegistrations: pendingRegistrations.count
      }
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return { 
      success: false, 
      error: error.message,
      data: {
        totalStudents: 0,
        activeCourses: 0,
        verifiedStudents: 0,
        pendingRegistrations: 0
      }
    };
  }
};
/**
 * Get recent activity from the database
 */

export const getRecentActivity = async (limit = 10) => {
  try {
    const activities = [];

    // Get recent students (created in last 24 hours or most recent)
    const recentStudents = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [
        Query.equal('isActive', true),
        Query.orderDesc('$createdAt'),
        Query.limit(5)
      ]
    );

    // Add student creation activities
    recentStudents.documents.forEach(student => {
      activities.push({
        type: 'student_created',
        action: 'New student profile created',
        student: `${student.firstName} ${student.surname}`,
        time: formatTimeAgo(student.$createdAt),
        activityType: 'success',
        timestamp: new Date(student.$createdAt).getTime()
      });
    });

    // Get students who recently captured fingerprints
    const recentFingerprints = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [
        Query.equal('fingerprintsCaptured', true),
        Query.orderDesc('fingerprintsCapturedAt'),
        Query.limit(5)
      ]
    );

    recentFingerprints.documents.forEach(student => {
      if (student.fingerprintsCapturedAt) {
        activities.push({
          type: 'fingerprint_captured',
          action: 'Student fingerprints captured',
          student: `${student.firstName} ${student.surname}`,
          time: formatTimeAgo(student.fingerprintsCapturedAt),
          activityType: 'info',
          timestamp: new Date(student.fingerprintsCapturedAt).getTime()
        });
      }
    });

    // Get recent course registrations
    const recentRegistrations = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      [
        Query.equal('isActive', true),
        Query.orderDesc('$createdAt'),
        Query.limit(5)
      ]
    );

    recentRegistrations.documents.forEach(registration => {
      activities.push({
        type: 'course_registered',
        action: `Course registered: ${registration.courseCode}`,
        student: registration.matricNumber,
        time: formatTimeAgo(registration.registeredAt),
        activityType: 'info',
        timestamp: new Date(registration.registeredAt).getTime()
      });
    });

    // Get recent courses
    const recentCourses = await databases.listDocuments(
      config.databaseId,
      config.coursesCollectionId,
      [
        Query.equal('isActive', true),
        Query.orderDesc('$createdAt'),
        Query.limit(5)
      ]
    );

    recentCourses.documents.forEach(course => {
      activities.push({
        type: 'course_uploaded',
        action: `Course uploaded: ${course.courseCode}`,
        time: formatTimeAgo(course.$createdAt),
        activityType: 'success',
        timestamp: new Date(course.$createdAt).getTime()
      });
    });

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp - a.timestamp);

    // Return only the requested number of activities
    return {
      success: true,
      data: activities.slice(0, limit)
    };

  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return { 
      success: false, 
      error: error.message,
      data: []
    };
  }
};
/**
 * Helper function to format time ago
 */
const formatTimeAgo = (dateString) => {
  if (!dateString) return 'Recently';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  } else {
    return date.toLocaleDateString();
  }
};

/**
 * Get department-wise student count
 */
export const getDepartmentStats = async () => {
  try {
    const students = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [Query.equal('isActive', true)]
    );

    const departmentCount = {};
    students.documents.forEach(student => {
      const dept = student.department || 'Unassigned';
      departmentCount[dept] = (departmentCount[dept] || 0) + 1;
    });

    return {
      success: true,
      data: departmentCount
    };
  } catch (error) {
    console.error('Error fetching department stats:', error);
    return { success: false, error: error.message, data: {} };
  }
};

/**
 * Get level-wise student count
 */
export const getLevelStats = async () => {
  try {
    const students = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [Query.equal('isActive', true)]
    );

    const levelCount = {};
    students.documents.forEach(student => {
      const level = student.level || 'Unassigned';
      levelCount[level] = (levelCount[level] || 0) + 1;
    });

    return {
      success: true,
      data: levelCount
    };
  } catch (error) {
    console.error('Error fetching level stats:', error);
    return { success: false, error: error.message, data: {} };
  }
};

// ========================================
// STUDENT DASHBOARD FUNCTIONS
// ========================================

/**
 * Get student courses by level and department
 * Fetches available courses for course registration
 */
export const getAvailableCoursesForStudent = async (level, department) => {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.coursesCollectionId,
      [
        Query.equal('level', level),
        Query.equal('department', department),
        Query.equal('isActive', true),
        Query.orderAsc('courseCode')
      ]
    );

    return { 
      success: true, 
      data: response.documents 
    };
  } catch (error) {
    console.error('Error fetching available courses:', error);
    return { 
      success: false, 
      error: error.message, 
      data: [] 
    };
  }
};

/**
 * Get student by their authentication credentials
 */
export const getStudentByAuth = async (matricNumber) => {
  try {
    const studentResult = await getStudentByMatricNumber(matricNumber);
    
    if (!studentResult.success) {
      return { success: false, error: 'Student not found' };
    }

    return { success: true, data: studentResult.data };
  } catch (error) {
    console.error('Error fetching student by auth:', error);
    return { success: false, error: error.message };
  }
};

// ========================================
// COURSE REGISTRATION FUNCTIONS
// ========================================

/**
 * Create course registration collection document (FIXED)
 */
/**
 * Create course registration collection document (IMPROVED)
 */
export const registerStudentCourses = async (studentId, matricNumber, courses, academicYear, semester) => {
  try {
    const registrations = [];
    const errors = [];
    const skipped = [];

    for (const course of courses) {
      try {
        // Check if already registered first
        const alreadyRegistered = await isCourseRegistered(matricNumber, course.courseCode);
        
        if (alreadyRegistered) {
          skipped.push({
            course: course.courseCode,
            reason: 'Already registered'
          });
          continue;
        }

        const courseSemester = course.semester || semester;
        
        const registration = await databases.createDocument(
          config.databaseId,
          config.courseRegistrationCollectionId,
          ID.unique(),
          {
            studentId: studentId,
            matricNumber: matricNumber,
            courseId: course.$id,
            courseCode: course.courseCode,
            courseTitle: course.courseTitle,
            courseUnit: parseInt(course.courseUnit),
            semester: courseSemester,
            status: 'Pending',
            registeredAt: new Date().toISOString(),
            approvedAt: '',
            approvedBy: '',
            isActive: true
          }
        );
        
        registrations.push(registration);
        
      } catch (error) {
        console.error(`Error registering ${course.courseCode}:`, error);
        
        // Check if it's a duplicate key error
        if (error.message && error.message.includes('unique')) {
          skipped.push({
            course: course.courseCode,
            reason: 'Already registered'
          });
        } else {
          errors.push({
            course: course.courseCode,
            error: error.message,
            code: error.code
          });
        }
      }
    }

    if (errors.length > 0) {
      console.error('Registration errors:', errors);
    }

    if (skipped.length > 0) {
      console.log('Skipped courses:', skipped);
    }

    // Build response message
    let message = '';
    if (registrations.length > 0) {
      message = `${registrations.length} course(s) registered successfully`;
    }
    if (skipped.length > 0) {
      message += `. ${skipped.length} course(s) skipped (already registered)`;
    }
    if (errors.length > 0) {
      message += `. ${errors.length} course(s) failed`;
    }

    return {
      success: registrations.length > 0 && errors.length === 0,
      data: registrations,
      errors: errors,
      skipped: skipped,
      message: message || 'No courses registered'
    };
    
  } catch (error) {
    console.error('Error in registerStudentCourses:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to register courses',
      data: [],
      errors: [{ error: error.message }]
    };
  }
};

/**
 * Get student's registered courses
 */
export const getStudentRegisteredCourses = async (matricNumber, semester = null) => {
  try {
    const queries = [
      Query.equal('matricNumber', matricNumber),
      Query.equal('isActive', true),
      Query.orderDesc('$createdAt')
    ];

    if (semester) {
      queries.push(Query.equal('semester', semester));
    }

    const response = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      queries
    );

    return { 
      success: true, 
      data: response.documents,
      total: response.total 
    };
  } catch (error) {
    console.error('Error fetching registered courses:', error);
    return { 
      success: false, 
      error: error.message, 
      data: [] 
    };
  }
};

/**
 * Drop/Delete a course registration
 */
export const dropCourseRegistration = async (registrationId) => {
  try {
    // Check if registration is still pending
    const registration = await databases.getDocument(
      config.databaseId,
      config.courseRegistrationCollectionId,
      registrationId
    );

    if (registration.status !== 'Pending') {
      return { 
        success: false, 
        error: 'Cannot drop approved courses. Contact administrator.' 
      };
    }

    // Soft delete
    await databases.updateDocument(
      config.databaseId,
      config.courseRegistrationCollectionId,
      registrationId,
      { isActive: false }
    );

    return { success: true, message: 'Course dropped successfully' };
  } catch (error) {
    console.error('Error dropping course:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if course is already registered by student
 */
export const isCourseRegistered = async (matricNumber, courseCode) => {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      [
        Query.equal('matricNumber', matricNumber),
        Query.equal('courseCode', courseCode),
        Query.equal('isActive', true)
      ]
    );

    return response.documents.length > 0;
  } catch (error) {
    console.error('Error checking course registration:', error);
    return false;
  }
};

/**
 * Get student registration statistics
 */
export const getStudentRegistrationStats = async (matricNumber) => {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      [
        Query.equal('matricNumber', matricNumber),
        Query.equal('isActive', true)
      ]
    );

    const totalRegistered = response.documents.length;
    const approved = response.documents.filter(r => r.status === 'Approved').length;
    const pending = response.documents.filter(r => r.status === 'Pending').length;
    const totalUnits = response.documents.reduce((sum, r) => sum + r.courseUnit, 0);

    return {
      success: true,
      data: {
        totalRegistered,
        approved,
        pending,
        totalUnits
      }
    };
  } catch (error) {
    console.error('Error fetching registration stats:', error);
    return { 
      success: false, 
      error: error.message,
      data: {
        totalRegistered: 0,
        approved: 0,
        pending: 0,
        totalUnits: 0
      }
    };
  }
};

// ========================================
// ADMIN - COURSE REGISTRATION MANAGEMENT
// ========================================

/**
 * Get all course registrations (for admin)
 */
export const getAllCourseRegistrations = async (filters = {}) => {
  try {
    const queries = [Query.equal('isActive', true)];
    
    if (filters.status) {
      queries.push(Query.equal('status', filters.status));
    }
    
    if (filters.semester) {
      queries.push(Query.equal('semester', filters.semester));
    }
    
    if (filters.matricNumber) {
      queries.push(Query.equal('matricNumber', filters.matricNumber));
    }

    queries.push(Query.orderDesc('$createdAt'));

    const response = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      queries
    );

    return { success: true, data: response.documents, total: response.total };
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get pending course registrations count
 */
export const getPendingRegistrationsCount = async () => {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      [
        Query.equal('status', 'Pending'),
        Query.equal('isActive', true)
      ]
    );

    return { success: true, count: response.total };
  } catch (error) {
    console.error('Error fetching pending count:', error);
    return { success: false, count: 0 };
  }
};

/**
 * Approve course registration
 */
export const approveCourseRegistration = async (registrationId, adminId = 'admin') => {
  try {
    const registration = await databases.updateDocument(
      config.databaseId,
      config.courseRegistrationCollectionId,
      registrationId,
      {
        status: 'Approved',
        approvedAt: new Date().toISOString(),
        approvedBy: adminId
      }
    );

    return { success: true, data: registration };
  } catch (error) {
    console.error('Error approving registration:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Reject course registration
 */
export const rejectCourseRegistration = async (registrationId, adminId = 'admin') => {
  try {
    const registration = await databases.updateDocument(
      config.databaseId,
      config.courseRegistrationCollectionId,
      registrationId,
      {
        status: 'Rejected',
        approvedAt: new Date().toISOString(),
        approvedBy: adminId
      }
    );

    return { success: true, data: registration };
  } catch (error) {
    console.error('Error rejecting registration:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get course registration statistics for admin
 */
export const getCourseRegistrationStats = async () => {
  try {
    const allRegistrations = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      [Query.equal('isActive', true)]
    );

    const pending = allRegistrations.documents.filter(r => r.status === 'Pending').length;
    const approved = allRegistrations.documents.filter(r => r.status === 'Approved').length;
    const rejected = allRegistrations.documents.filter(r => r.status === 'Rejected').length;

    return {
      success: true,
      data: {
        total: allRegistrations.total,
        pending,
        approved,
        rejected
      }
    };
  } catch (error) {
    console.error('Error fetching registration stats:', error);
    return { 
      success: false, 
      error: error.message,
      data: {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
      }
    };
  }
};
// ========================================
// ENHANCED COURSE REGISTRATION FUNCTIONS
// ========================================

/**
 * Get all course registrations with student details (ENHANCED)
 */
export const getAllCourseRegistrationsWithStudents = async (filters = {}) => {
  try {
    const queries = [Query.equal('isActive', true)];
    
    if (filters.status) {
      queries.push(Query.equal('status', filters.status));
    }
    
    if (filters.semester) {
      queries.push(Query.equal('semester', filters.semester));
    }
    
    if (filters.matricNumber) {
      queries.push(Query.equal('matricNumber', filters.matricNumber));
    }

    queries.push(Query.orderDesc('$createdAt'));

    const response = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      queries
    );

    // Fetch student details for each unique matric number
    const uniqueMatricNumbers = [...new Set(response.documents.map(r => r.matricNumber))];
    const studentDetailsMap = {};

    for (const matricNumber of uniqueMatricNumbers) {
      const studentResult = await getStudentByMatricNumber(matricNumber);
      if (studentResult.success) {
        studentDetailsMap[matricNumber] = studentResult.data;
      }
    }

    // Enhance registrations with student details
    const enhancedRegistrations = response.documents.map(reg => ({
      ...reg,
      studentDetails: studentDetailsMap[reg.matricNumber] || null
    }));

    return { 
      success: true, 
      data: enhancedRegistrations, 
      total: response.total,
      studentDetailsMap: studentDetailsMap
    };
  } catch (error) {
    console.error('Error fetching registrations with students:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get registrations grouped by student
 */
export const getRegistrationsGroupedByStudent = async (filters = {}) => {
  try {
    const result = await getAllCourseRegistrations(filters);
    
    if (!result.success) {
      return result;
    }

    // Group registrations by matric number
    const grouped = result.data.reduce((acc, reg) => {
      if (!acc[reg.matricNumber]) {
        acc[reg.matricNumber] = {
          matricNumber: reg.matricNumber,
          registrations: [],
          totalCourses: 0,
          totalUnits: 0,
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0
        };
      }
      
      acc[reg.matricNumber].registrations.push(reg);
      acc[reg.matricNumber].totalCourses++;
      acc[reg.matricNumber].totalUnits += reg.courseUnit;
      
      if (reg.status === 'Pending') acc[reg.matricNumber].pendingCount++;
      if (reg.status === 'Approved') acc[reg.matricNumber].approvedCount++;
      if (reg.status === 'Rejected') acc[reg.matricNumber].rejectedCount++;
      
      return acc;
    }, {});

    return {
      success: true,
      data: grouped,
      totalStudents: Object.keys(grouped).length
    };
  } catch (error) {
    console.error('Error grouping registrations:', error);
    return { success: false, error: error.message, data: {} };
  }
};

/**
 * Bulk approve all pending registrations for a student
 */
export const bulkApproveCourses = async (matricNumber, adminId = 'admin') => {
  try {
    // Get all pending registrations for the student
    const response = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      [
        Query.equal('matricNumber', matricNumber),
        Query.equal('status', 'Pending'),
        Query.equal('isActive', true)
      ]
    );

    if (response.documents.length === 0) {
      return { 
        success: false, 
        error: 'No pending registrations found' 
      };
    }

    const approvedCount = [];
    const errors = [];

    for (const registration of response.documents) {
      try {
        await databases.updateDocument(
          config.databaseId,
          config.courseRegistrationCollectionId,
          registration.$id,
          {
            status: 'Approved',
            approvedAt: new Date().toISOString(),
            approvedBy: adminId
          }
        );
        approvedCount.push(registration);
      } catch (error) {
        errors.push({
          courseCode: registration.courseCode,
          error: error.message
        });
      }
    }

    return {
      success: errors.length === 0,
      approvedCount: approvedCount.length,
      totalPending: response.documents.length,
      errors: errors,
      message: `${approvedCount.length} of ${response.documents.length} courses approved`
    };
  } catch (error) {
    console.error('Error bulk approving courses:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Bulk reject all pending registrations for a student
 */
export const bulkRejectCourses = async (matricNumber, adminId = 'admin') => {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      [
        Query.equal('matricNumber', matricNumber),
        Query.equal('status', 'Pending'),
        Query.equal('isActive', true)
      ]
    );

    if (response.documents.length === 0) {
      return { 
        success: false, 
        error: 'No pending registrations found' 
      };
    }

    const rejectedCount = [];
    const errors = [];

    for (const registration of response.documents) {
      try {
        await databases.updateDocument(
          config.databaseId,
          config.courseRegistrationCollectionId,
          registration.$id,
          {
            status: 'Rejected',
            approvedAt: new Date().toISOString(),
            approvedBy: adminId
          }
        );
        rejectedCount.push(registration);
      } catch (error) {
        errors.push({
          courseCode: registration.courseCode,
          error: error.message
        });
      }
    }

    return {
      success: errors.length === 0,
      rejectedCount: rejectedCount.length,
      totalPending: response.documents.length,
      errors: errors,
      message: `${rejectedCount.length} of ${response.documents.length} courses rejected`
    };
  } catch (error) {
    console.error('Error bulk rejecting courses:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get registrations filtered by level and department
 */
export const getRegistrationsByLevelAndDepartment = async (level, department) => {
  try {
    // First get all active students from that level and department
    const studentsResponse = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [
        Query.equal('level', level),
        Query.equal('department', department),
        Query.equal('isActive', true)
      ]
    );

    if (studentsResponse.documents.length === 0) {
      return { success: true, data: [], total: 0 };
    }

    // Get matric numbers
    const matricNumbers = studentsResponse.documents.map(s => s.matricNumber);

    // Get all registrations for these students
    const allRegistrations = [];
    
    for (const matricNumber of matricNumbers) {
      const regResponse = await databases.listDocuments(
        config.databaseId,
        config.courseRegistrationCollectionId,
        [
          Query.equal('matricNumber', matricNumber),
          Query.equal('isActive', true)
        ]
      );
      
      allRegistrations.push(...regResponse.documents);
    }

    return {
      success: true,
      data: allRegistrations,
      total: allRegistrations.length
    };
  } catch (error) {
    console.error('Error fetching registrations by level/department:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Export registrations to CSV format (returns data array)
 */

export const exportRegistrationsData = async (filters = {}) => {
  try {
    const result = await getAllCourseRegistrations(filters);
    
    if (!result.success) {
      return result;
    }

    const csvData = result.data.map(reg => ({
      'Matric Number': reg.matricNumber,
      'Course Code': reg.courseCode,
      'Course Title': reg.courseTitle,
      'Units': reg.courseUnit,
      'Semester': reg.semester,
      'Status': reg.status,
      'Registered Date': new Date(reg.registeredAt).toLocaleDateString(),
      'Approved Date': reg.approvedAt ? new Date(reg.approvedAt).toLocaleDateString() : 'N/A',
      'Approved By': reg.approvedBy || 'N/A'
    }));

    return {
      success: true,
      data: csvData
    };
  } catch (error) {
    console.error('Error exporting registrations:', error);
    return { success: false, error: error.message };
  }
};

