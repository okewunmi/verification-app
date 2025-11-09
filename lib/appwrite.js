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
export { 
  client,
  account, 
  databases, 
  storage,
  Query,
  ID,
  Permission,
  Role
};
import bcrypt from 'bcryptjs';
import fingerprintScanner from './fingerprint-webauthn';

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
  attendanceCollectionId: "attendance",
  attendance_sessions: "attendance_sessions",
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
  courseRegistrationCollectionId,
  attendanceCollectionId,
  attendance_sessions
} = config;

export { config };
const client = new Client();

client
  .setEndpoint(config.endpoint)
  .setProject(config.projectId);

const account = new Account(client);
const storage = new Storage(client);
const databases = new Databases(client);

const FACEPP_API_KEY = 'AWhKUAQKTH1ln5knEx9nj5qbxMwJKwia';
const FACEPP_API_SECRET = '-TlT-r-l_YhIABwOvWqu-yxrAtMy-Ynr';
const FACESET_OUTER_ID = 'students';


// ========================================
// EMAIL NOTIFICATION FUNCTION
// ========================================

/**
 * Send welcome email via API route
 */
export const sendWelcomeEmail = async (studentData, matricNumber, defaultPassword) => {
  try {
    console.log('📧 Calling email API for:', studentData.email);

    const response = await fetch('/api/send-welcome-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentData,
        matricNumber,
        defaultPassword
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('❌ Email API error:', result.error);
      return {
        success: false,
        error: result.error || 'Failed to send email'
      };
    }

    console.log('✅ Email sent successfully');
    return {
      success: true,
      data: result.data,
      message: 'Welcome email sent successfully'
    };

  } catch (error) {
    console.error('❌ Error calling email API:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email'
    };
  }
};

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

    // Create authentication credentials
    const authResult = await createStudentAuthCredentials(
      matricNumber,
      studentData.surname,
      student.$id
    );

    if (!authResult.success) {
      await databases.deleteDocument(
        config.databaseId,
        config.studentsCollectionId,
        student.$id
      );
      return { success: false, error: 'Failed to create login credentials' };
    }

    // Send welcome email with credentials (non-blocking)
let emailResult = { success: false };
try {
  emailResult = await sendWelcomeEmail(
    studentData,
    matricNumber,
    studentData.surname
  );
  
  if (emailResult.success) {
    console.log('✅ Welcome email sent successfully');
  } else {
    console.warn('⚠️ Email failed but student created:', emailResult.error);
  }
} catch (emailError) {
  console.error('⚠️ Email error (non-critical):', emailError);
}

return {
  success: true,
  data: student,
  matricNumber,
  emailSent: emailResult.success,
  credentials: {
    username: matricNumber,
    defaultPassword: studentData.surname,
    message: emailResult.success 
      ? '✅ Login credentials sent to email' 
      : '⚠️ Student created (email not sent - please notify manually)'
  }
};
  } catch (error) {
    console.error('Error creating student:', error);
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


/**
 * Simple password hashing function with better error handling
 */
export const hashPassword = async (password) => {
  try {
    // Trim and convert to lowercase for consistency
    const cleanPassword = password.trim().toLowerCase();
    return await bcrypt.hash(cleanPassword, 10);
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
};

export const verifyPassword = async (inputPassword, hashedPassword) => {
  try {
    // Trim and convert to lowercase for consistency
    const cleanPassword = inputPassword.trim().toLowerCase();
    return await bcrypt.compare(cleanPassword, hashedPassword);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
};

/**
 * Change student password
 */
export const changeStudentPassword = async (matricNumber, currentPassword, newPassword) => {
  try {
    const cleanMatricNumber = matricNumber.trim();
    
    // Find auth record
    const response = await databases.listDocuments(
      config.databaseId,
      config.studentAuthCollectionId,
      [
        Query.equal('username', cleanMatricNumber),
        Query.equal('isActive', true)
      ]
    );

    if (response.documents.length === 0) {
      return { success: false, error: 'Student not found' };
    }

    const authRecord = response.documents[0];

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, authRecord.password);
    
    if (!isCurrentPasswordValid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Validate new password
    if (newPassword.trim().length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long' };
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    await databases.updateDocument(
      config.databaseId,
      config.studentAuthCollectionId,
      authRecord.$id,
      { 
        password: hashedNewPassword,
        passwordChangedAt: new Date().toISOString()
      }
    );

    return { success: true, message: 'Password changed successfully' };
  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, error: 'Failed to change password' };
  }
};

/**
 * Create student auth credentials with better error handling
 */
export const createStudentAuthCredentials = async (matricNumber, surname, studentDocId) => {
  try {
    // Trim matric number and surname
    const cleanMatricNumber = matricNumber.trim();
    const cleanSurname = surname.trim();

    console.log('Creating auth for:', { matricNumber: cleanMatricNumber, surname: cleanSurname });

    // Hash the password (surname) for security
    const hashedPassword = await hashPassword(cleanSurname);

    const authCredentials = await databases.createDocument(
      config.databaseId,
      config.studentAuthCollectionId,
      ID.unique(),
      {
        username: cleanMatricNumber,
        password: hashedPassword,
        studentDocId: studentDocId,
        lastLogin: '',
        isActive: true,
        createdAt: new Date().toISOString(),
        passwordChangedAt: ''
      }
    );

    console.log('Auth credentials created successfully');
    return { success: true, data: authCredentials };
  } catch (error) {
    console.error('Error creating student auth:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Student Login Function with better debugging
 */
export const studentLogin = async (matricNumber, password) => {
  try {
    // Clean inputs
    const cleanMatricNumber = matricNumber.trim();
    const cleanPassword = password.trim();

    console.log('Login attempt for:', cleanMatricNumber);

    // Find student auth by username (matric number)
    const response = await databases.listDocuments(
      config.databaseId,
      config.studentAuthCollectionId,
      [
        Query.equal('username', cleanMatricNumber),
        Query.equal('isActive', true)
      ]
    );

    console.log('Auth records found:', response.documents.length);

    if (response.documents.length === 0) {
      console.log('No auth record found for:', cleanMatricNumber);
      return {
        success: false,
        error: 'Invalid matric number or password'
      };
    }

    const authRecord = response.documents[0];
    console.log('Auth record found, verifying password...');

    // Verify password
    const isPasswordValid = await verifyPassword(cleanPassword, authRecord.password);

    console.log('Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('Password verification failed');
      return {
        success: false,
        error: 'Invalid matric number or password'
      };
    }

    // Get full student details
    const studentResult = await getStudentById(authRecord.studentDocId);

    if (!studentResult.success) {
      console.log('Student record not found for ID:', authRecord.studentDocId);
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

    console.log('Login successful for:', cleanMatricNumber);

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
// ENHANCED COURSE REGISTRATION FUNCTIONS
// FIXED: Better duplicate handling and error detection
// ========================================

/**
 * Check if a specific student has already registered for a specific course
 * This is the key function to prevent duplicates
 */
export const isStudentCourseRegistered = async (matricNumber, courseCode) => {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      [
        Query.equal('matricNumber', matricNumber),
        Query.equal('courseCode', courseCode),
        Query.equal('isActive', true),
        Query.limit(1)
      ]
    );

    return {
      success: true,
      isRegistered: response.documents.length > 0,
      registration: response.documents[0] || null
    };
  } catch (error) {
    console.error('Error checking course registration:', error);
    return { success: false, isRegistered: false, error: error.message };
  }
};

/**
 * Check multiple courses at once for a student
 * Returns array of course codes that are already registered
 */
export const checkMultipleCoursesRegistration = async (matricNumber, courseCodes) => {
  try {
    const registeredCourses = [];
    
    for (const courseCode of courseCodes) {
      const result = await isStudentCourseRegistered(matricNumber, courseCode);
      if (result.isRegistered) {
        registeredCourses.push(courseCode);
      }
    }

    return {
      success: true,
      registeredCourses: registeredCourses,
      hasRegistered: registeredCourses.length > 0
    };
  } catch (error) {
    console.error('Error checking multiple courses:', error);
    return { success: false, registeredCourses: [], error: error.message };
  }
};

/**
 * Validate course registration before attempting to register
 * Checks units limit and existing registrations
 */
export const validateCourseRegistration = async (matricNumber, courses, maxUnits = 24) => {
  try {
    // Get current registrations
    const currentRegsResult = await getStudentRegisteredCourses(matricNumber);
    const currentRegistrations = currentRegsResult.success ? currentRegsResult.data : [];
    
    // Calculate current units
    const currentUnits = currentRegistrations.reduce((sum, r) => sum + r.courseUnit, 0);
    
    // Calculate new units
    const newUnits = courses.reduce((sum, c) => sum + c.courseUnit, 0);
    
    // Check if would exceed max units
    if (currentUnits + newUnits > maxUnits) {
      return {
        success: false,
        error: `Total units (${currentUnits + newUnits}) would exceed maximum of ${maxUnits}`,
        currentUnits,
        newUnits,
        totalUnits: currentUnits + newUnits
      };
    }

    // Check for duplicate course codes in the new courses array
    const courseCodesSet = new Set();
    const duplicatesInSelection = [];
    
    courses.forEach(course => {
      if (courseCodesSet.has(course.courseCode)) {
        duplicatesInSelection.push(course.courseCode);
      } else {
        courseCodesSet.add(course.courseCode);
      }
    });

    if (duplicatesInSelection.length > 0) {
      return {
        success: false,
        error: `Duplicate courses in selection: ${duplicatesInSelection.join(', ')}`
      };
    }

    // Check which courses are already registered
    const alreadyRegistered = [];
    for (const course of courses) {
      const checkResult = await isStudentCourseRegistered(matricNumber, course.courseCode);
      if (checkResult.isRegistered) {
        alreadyRegistered.push(course.courseCode);
      }
    }

    if (alreadyRegistered.length > 0) {
      return {
        success: false,
        error: `Already registered: ${alreadyRegistered.join(', ')}`,
        alreadyRegistered
      };
    }

    return {
      success: true,
      currentUnits,
      newUnits,
      totalUnits: currentUnits + newUnits,
      message: 'Validation passed'
    };
  } catch (error) {
    console.error('Error validating registration:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Register student courses - FIXED VERSION WITH RELATIONSHIPS
 * Uses relationship fields: 'student' and 'course'
 * Allows multiple students to register for the same course
 * Each student-course combination gets its own unique registration document
 */
export const registerStudentCourses = async (
  studentId, 
  matricNumber, 
  courses, 
  academicYear = '2024/2025', 
  semester = 'First'
) => {
  console.log('\n🎓 === COURSE REGISTRATION STARTED ===');
  console.log(`👤 Student ID: ${studentId}`);
  console.log(`👤 Matric Number: ${matricNumber}`);
  console.log(`📚 Courses to register: ${courses.length}`);
  console.log(`📅 Academic Year: ${academicYear}, Semester: ${semester}\n`);

  const registrations = [];
  const errors = [];
  const skipped = [];

  // Validate before attempting registration
  console.log('🔍 Running validation...');
  const validation = await validateCourseRegistration(matricNumber, courses);
  
  if (!validation.success) {
    console.log('❌ Validation failed:', validation.error);
    
    // If validation failed because courses are already registered, return special response
    if (validation.alreadyRegistered && validation.alreadyRegistered.length > 0) {
      return {
        success: false,
        error: validation.error,
        data: [],
        skipped: validation.alreadyRegistered.map(code => ({
          course: code,
          reason: 'Already registered'
        })),
        errors: [],
        message: `${validation.alreadyRegistered.length} course(s) already registered`
      };
    }
    
    return {
      success: false,
      error: validation.error,
      data: [],
      skipped: [],
      errors: []
    };
  }

  console.log('✅ Validation passed\n');

  // Process each course individually
  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    const courseNum = `[${i + 1}/${courses.length}]`;
    
    console.log(`${courseNum} Processing: ${course.courseCode}...`);

    try {
      // Triple-check if already registered (safety check before database write)
      console.log(`  🔍 Final check for existing registration...`);
      const checkResult = await isStudentCourseRegistered(matricNumber, course.courseCode);
      
      if (checkResult.isRegistered) {
        console.log(`  ⏭️  SKIPPED: Already registered (found in final check)`);
        skipped.push({
          course: course.courseCode,
          reason: 'Already registered',
          existingId: checkResult.registration?.$id
        });
        continue;
      }

      // Create unique registration document with RELATIONSHIPS
      console.log(`  📝 Creating new registration document...`);
      
      const registrationData = {
        // RELATIONSHIP FIELDS (many-to-one)
        student: studentId,           // ✅ Relationship to student table
        course: course.$id,            // ✅ Relationship to courses table
        
        // REGULAR FIELDS (for quick queries and display)
        matricNumber: matricNumber,
        courseCode: course.courseCode,
        courseTitle: course.courseTitle,
        courseUnit: parseInt(course.courseUnit),
        semester: course.semester || semester,
        status: 'Pending',
        registeredAt: new Date().toISOString(),
        approvedAt: '',
        approvedBy: '',
        isActive: true
      };

      console.log(`  🔗 Creating with relationships: student=${studentId}, course=${course.$id}`);

      const registration = await databases.createDocument(
        config.databaseId,
        config.courseRegistrationCollectionId,
        ID.unique(), // Let Appwrite generate unique ID
        registrationData
      );

      registrations.push(registration);
      console.log(`  ✅ SUCCESS: ${course.courseCode} registered with ID: ${registration.$id}\n`);

    } catch (error) {
      console.error(`  ❌ ERROR: ${error.message}`);
      console.error(`  📋 Error details:`, {
        code: error.code,
        type: error.type,
        response: error.response
      });

      const errorMsg = error.message?.toLowerCase() || '';
      const errorCode = error.code;
      
      // Handle various error types with better detection
      if (
        errorMsg.includes('already exists') ||
        errorMsg.includes('duplicate') ||
        errorMsg.includes('unique') ||
        errorCode === 409 ||
        errorCode === 'document_already_exists'
      ) {
        console.log(`  ⏭️  SKIPPED: Duplicate detected by database\n`);
        skipped.push({
          course: course.courseCode,
          reason: 'Duplicate entry detected by database'
        });
      } else if (
        errorMsg.includes('relationship') ||
        errorMsg.includes('related document') ||
        errorMsg.includes('not found') ||
        errorCode === 404
      ) {
        console.log(`  💥 FAILED: Invalid relationship data\n`);
        errors.push({
          course: course.courseCode,
          courseTitle: course.courseTitle,
          error: 'Invalid student or course ID. Please refresh the page.'
        });
      } else if (
        errorMsg.includes('index') ||
        errorMsg.includes('constraint')
      ) {
        console.log(`  💥 FAILED: Database constraint violation\n`);
        errors.push({
          course: course.courseCode,
          courseTitle: course.courseTitle,
          error: 'Database constraint error. Course may already be registered.'
        });
        
        // Also add to skipped since this is likely a duplicate
        skipped.push({
          course: course.courseCode,
          reason: 'Constraint violation (possible duplicate)'
        });
      } else {
        console.log(`  💥 FAILED: ${error.message}\n`);
        errors.push({
          course: course.courseCode,
          courseTitle: course.courseTitle,
          error: error.message
        });
      }
    }

    // Small delay between registrations to prevent race conditions
    if (i < courses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  console.log('\n📊 === REGISTRATION SUMMARY ===');
  console.log(`✅ Successful: ${registrations.length}`);
  console.log(`⏭️  Skipped: ${skipped.length}`);
  console.log(`❌ Failed: ${errors.length}`);
  console.log('================================\n');

  // Build result message
  const messageParts = [];
  if (registrations.length > 0) messageParts.push(`${registrations.length} course(s) registered successfully`);
  if (skipped.length > 0) messageParts.push(`${skipped.length} already registered`);
  if (errors.length > 0) messageParts.push(`${errors.length} failed`);

  const finalMessage = messageParts.length > 0 
    ? messageParts.join(', ')
    : 'No courses processed';

  // Determine overall success
  // Success if at least one course registered, or if all were already registered (skipped)
  const isSuccess = registrations.length > 0 || (skipped.length === courses.length && errors.length === 0);

  return {
    success: isSuccess,
    data: registrations,
    errors: errors,
    skipped: skipped,
    message: finalMessage,
    totalProcessed: courses.length,
    stats: {
      successful: registrations.length,
      skipped: skipped.length,
      failed: errors.length
    }
  };
};

/**
 * Get all registrations for a specific course (see who registered)
 * Useful for admin to see all students who registered for a course
 */
export const getStudentsRegisteredForCourse = async (courseCode) => {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      [
        Query.equal('courseCode', courseCode),
        Query.equal('isActive', true),
        Query.orderDesc('$createdAt')
      ]
    );

    // Fetch student details for each registration (optional)
    const registrationsWithStudents = await Promise.all(
      response.documents.map(async (reg) => {
        try {
          const student = await databases.getDocument(
            config.databaseId,
            config.studentsCollectionId,
            reg.student // Using relationship ID
          );
          return { ...reg, studentDetails: student };
        } catch (error) {
          console.error('Error fetching student details:', error);
          return reg;
        }
      })
    );

    return {
      success: true,
      data: registrationsWithStudents,
      total: response.total,
      message: `${response.total} student(s) registered for ${courseCode}`
    };
  } catch (error) {
    console.error('Error fetching course registrations:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get registration statistics for a specific course
 */
export const getCourseRegistrationCount = async (courseCode) => {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      [
        Query.equal('courseCode', courseCode),
        Query.equal('isActive', true)
      ]
    );

    const approved = response.documents.filter(r => r.status === 'Approved').length;
    const pending = response.documents.filter(r => r.status === 'Pending').length;
    const rejected = response.documents.filter(r => r.status === 'Rejected').length;

    return {
      success: true,
      data: {
        total: response.total,
        approved,
        pending,
        rejected
      }
    };
  } catch (error) {
    console.error('Error fetching course stats:', error);
    return { 
      success: false, 
      error: error.message,
      data: { total: 0, approved: 0, pending: 0, rejected: 0 }
    };
  }
};

/**
 * Get student's registered courses with full course details via relationship
 */
export const getStudentRegisteredCoursesWithDetails = async (matricNumber, semester = null) => {
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

    // Fetch full course details using relationship
    const registrationsWithCourses = await Promise.all(
      response.documents.map(async (reg) => {
        try {
          const course = await databases.getDocument(
            config.databaseId,
            config.coursesCollectionId,
            reg.course // Using relationship ID
          );
          return { ...reg, courseDetails: course };
        } catch (error) {
          console.error('Error fetching course details:', error);
          return reg;
        }
      })
    );

    return { 
      success: true, 
      data: registrationsWithCourses,
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

// ========================================
// FACIAL RECOGNITION FUNCTIONS
// ========================================

/**
 * Save facial template to student record
 */
export const saveFaceTemplate = async (documentId, faceImageUrl, faceTemplateData = null) => {
  try {
    const updateData = {
      faceImageUrl: faceImageUrl,
      faceCaptured: true,
      faceCapturedAt: new Date().toISOString()
    };

    // If you have face template/embedding data from your Python service
    if (faceTemplateData) {
      updateData.faceTemplate = JSON.stringify(faceTemplateData);
    }

    const student = await databases.updateDocument(
      config.databaseId,
      config.studentsCollectionId,
      documentId,
      updateData
    );

    return { success: true, data: student };
  } catch (error) {
    console.error('Error saving face template:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verify face against stored images using facial recognition API
 */
export const verifyFaceRecognition = async (capturedImageFile) => {
  try {
    console.log('🔍 Starting face verification...');

    // Get all students with face images captured
    const response = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [
        Query.equal('faceCaptured', true),
        Query.equal('isActive', true)
      ]
    );

    console.log(`📋 Found ${response.documents.length} students with face images`);

    if (response.documents.length === 0) {
      return { 
        success: false, 
        matched: false,
        error: 'No registered face images found in database' 
      };
    }

    // Try to match against each student's face image
    for (const student of response.documents) {
      if (!student.faceImageUrl) continue;

      console.log(`🔄 Checking match for: ${student.firstName} ${student.surname} (${student.matricNumber})`);

      try {
        // Fetch the stored face image from Appwrite Storage
        const storedImageResponse = await fetch(student.faceImageUrl);
        const storedImageBlob = await storedImageResponse.blob();

        // Prepare FormData for facial recognition API
        const formData = new FormData();
        formData.append('referenceImage', storedImageBlob, 'reference.jpg');
        formData.append('targetImage', capturedImageFile, 'target.jpg');

        // Call your facial recognition API
        const verifyResponse = await fetch('/api/facial-recognition', {
          method: 'POST',
          body: formData,
        });

        const verifyResult = await verifyResponse.json();

        console.log(`📊 Verification result for ${student.matricNumber}:`, verifyResult);

        // Check if faces match (adjust threshold as needed)
        if (verifyResult.success && verifyResult.data?.match) {
          console.log(`✅ MATCH FOUND! Student: ${student.firstName} ${student.surname}`);
          
          return {
            success: true,
            matched: true,
            student: student,
            confidence: (verifyResult.data.similarityScore * 100).toFixed(1),
            matchTime: new Date().toLocaleTimeString(),
            verificationData: verifyResult.data
          };
        }
      } catch (matchError) {
        console.error(`❌ Error matching with student ${student.matricNumber}:`, matchError);
        // Continue to next student
        continue;
      }
    }

    console.log('❌ No matching face found');
    return { 
      success: true, 
      matched: false,
      message: 'No matching student found' 
    };

  } catch (error) {
    console.error('❌ Error in face verification:', error);
    return { 
      success: false, 
      matched: false,
      error: error.message 
    };
  }
};

/**
 * Save face image during student enrollment
 */
export const uploadFaceImage = async (imageFile) => {
  try {
    if (!imageFile) return null;

    const fileId = ID.unique();
    const response = await storage.createFile(
      config.bucketId,
      fileId,
      imageFile,
      [Permission.read(Role.any())]
    );

    const fileUrl = storage.getFileView(
      config.bucketId,
      response.$id
    );

    const finalUrl = fileUrl.href || fileUrl.toString();
    console.log('✅ Face image uploaded:', finalUrl);

    return {
      fileId: response.$id,
      fileUrl: finalUrl
    };
  } catch (error) {
    console.error('❌ Error uploading face image:', error);
    throw new Error('Failed to upload face image');
  }
};

/**
 * Update student with face image (use during enrollment)
 */
export const updateStudentWithFace = async (documentId, faceImageFile) => {
  try {
    // Upload face image
    const faceData = await uploadFaceImage(faceImageFile);

    if (!faceData) {
      return { success: false, error: 'Failed to upload face image' };
    }

    // Update student record
    const result = await saveFaceTemplate(documentId, faceData.fileUrl);

    return result;
  } catch (error) {
    console.error('Error updating student with face:', error);
    return { success: false, error: error.message };
  }
};

// ========================================
// ADD TO lib/appwrite.js - CLEAN FINGERPRINT FUNCTIONS
// ========================================

/**
 * Save fingerprint (WebAuthn credential) to student record
 */
export const saveFingerprints = async (studentId, fingerprintData) => {
  try {
    const student = await databases.updateDocument(
      config.databaseId,
      config.studentsCollectionId,
      studentId,
      {
        // Store WebAuthn credential in thumbTemplate
        thumbTemplate: fingerprintData.thumb || '',
        indexTemplate: fingerprintData.index || '',
        middleTemplate: fingerprintData.middle || '',
        ringTemplate: fingerprintData.ring || '',
        pinkyTemplate: fingerprintData.pinky || '',
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
 * Verify fingerprint using WebAuthn (Windows Hello)
 * Works with Microsoft Fingerprint Reader 4200
 */
export const verifyStudentFingerprint = async () => {
  try {
    console.log('🔍 Starting fingerprint verification...');

    // Get all students with fingerprints
    const studentsResponse = await databases.listDocuments(
      config.databaseId,
      config.studentsCollectionId,
      [
        Query.equal('fingerprintsCaptured', true),
        Query.equal('isActive', true),
        Query.limit(1000)
      ]
    );

    console.log(`📋 Found ${studentsResponse.documents.length} students with fingerprints`);

    if (studentsResponse.documents.length === 0) {
      return {
        success: true,
        matched: false,
        message: 'No registered fingerprints found in database'
      };
    }

    // Get all credential IDs
    const credentials = [];
    const studentMap = new Map();

    studentsResponse.documents.forEach(student => {
      const fingers = [
        { name: 'thumb', credential: student.thumbTemplate },
        { name: 'index', credential: student.indexTemplate },
        { name: 'middle', credential: student.middleTemplate },
        { name: 'ring', credential: student.ringTemplate },
        { name: 'pinky', credential: student.pinkyTemplate }
      ].filter(f => f.credential);

      fingers.forEach(finger => {
        credentials.push(finger.credential);
        studentMap.set(finger.credential, {
          student: student,
          fingerName: finger.name
        });
      });
    });

    if (credentials.length === 0) {
      return {
        success: true,
        matched: false,
        message: 'No valid fingerprint credentials found'
      };
    }

    console.log(`🔑 Verifying against ${credentials.length} stored credentials...`);

    // Verify using WebAuthn
    const verifyResult = await fingerprintScanner.verify(credentials);

    if (verifyResult.success && verifyResult.matched) {
      // Find which student matched
      const matchInfo = studentMap.get(verifyResult.credentialId);

      if (matchInfo) {
        console.log(`✅ MATCH FOUND! ${matchInfo.student.firstName} ${matchInfo.student.surname}`);

        return {
          success: true,
          matched: true,
          student: matchInfo.student,
          confidence: verifyResult.confidence,
          matchTime: new Date().toLocaleTimeString(),
          fingerUsed: matchInfo.fingerName
        };
      }
    }

    console.log('❌ No matching student found');
    return {
      success: true,
      matched: false,
      message: 'No matching student found'
    };

  } catch (error) {
    console.error('❌ Fingerprint verification error:', error);
    return {
      success: false,
      matched: false,
      error: error.message
    };
  }
};

// ========================================
// IMPROVED FACE++ API FUNCTIONS
// ========================================

/**
 * FIXED: Create or Update Face++ Faceset with all registered students
 * Now uses profilePictureUrl instead of requiring faceCaptured=true
 */
// export const syncStudentFacesToFacePlusPlus = async () => {
//   try {
//     console.log('🔄 Syncing student faces to Face++...');

//     // Step 1: Check if faceset exists, if not create it
//     console.log('📋 Checking if faceset exists...');
//     const facesetExists = await checkFacesetExists(FACESET_OUTER_ID);
    
//     if (!facesetExists) {
//       console.log('📝 Creating new faceset...');
//       await createFaceset(FACESET_OUTER_ID, 'Student Faces');
//       console.log('✅ Faceset created successfully');
//     } else {
//       console.log('✅ Faceset already exists');
//     }

//     // Step 2: Get all students with profile pictures (FIXED)
//     console.log('🔍 Fetching students with profile pictures...');
    
//     const studentsResponse = await databases.listDocuments(
//       config.databaseId,
//       config.studentsCollectionId,
//       [
//         Query.equal('isActive', true),
//         Query.limit(1000)
//       ]
//     );

//     // Filter students who have profilePictureUrl
//     const studentsWithPhotos = studentsResponse.documents.filter(
//       student => student.profilePictureUrl && student.profilePictureUrl.trim() !== ''
//     );

//     console.log(`📋 Found ${studentsWithPhotos.length} students with profile pictures out of ${studentsResponse.total} total students`);

//     if (studentsWithPhotos.length === 0) {
//       return { 
//         success: false, 
//         addedFaces: 0,
//         errors: [],
//         message: 'No students with profile pictures found. Please add students with photos first.' 
//       };
//     }

//     // Step 3: Add each student's face to the faceset
//     const addedFaces = [];
//     const errors = [];

//     for (let i = 0; i < studentsWithPhotos.length; i++) {
//       const student = studentsWithPhotos[i];
      
//       try {
//         console.log(`[${i + 1}/${studentsWithPhotos.length}] Processing ${student.firstName} ${student.surname} (${student.matricNumber})...`);

//         // Detect face and get face_token
//         const faceToken = await detectAndGetFaceToken(student.profilePictureUrl);
        
//         if (faceToken) {
//           // Add face to faceset with student matric number as user_id
//           await addFaceToFaceset(FACESET_OUTER_ID, faceToken, student.matricNumber);
          
//           // Update student record to mark face as captured
//           await databases.updateDocument(
//             config.databaseId,
//             config.studentsCollectionId,
//             student.$id,
//             {
//               faceTemplate: faceToken,
//               faceCaptured: true,
//               faceCapturedAt: new Date().toISOString()
//             }
//           );
          
//           addedFaces.push(student.matricNumber);
//           console.log(`  ✅ Added successfully`);
//         } else {
//           errors.push({ 
//             matricNumber: student.matricNumber, 
//             name: `${student.firstName} ${student.surname}`,
//             error: 'No face detected in profile picture' 
//           });
//           console.log(`  ⚠️ No face detected in image`);
//         }

//       } catch (error) {
//         console.error(`  ❌ Error: ${error.message}`);
//         errors.push({ 
//           matricNumber: student.matricNumber,
//           name: `${student.firstName} ${student.surname}`,
//           error: error.message 
//         });
//       }

//       // Add small delay to avoid rate limiting (500ms between requests)
//       if (i < studentsWithPhotos.length - 1) {
//         await new Promise(resolve => setTimeout(resolve, 500));
//       }
//     }

//     console.log('\n🎉 Sync completed!');
//     console.log(`✅ Successfully added: ${addedFaces.length}`);
//     console.log(`❌ Errors: ${errors.length}`);

//     return {
//       success: true,
//       addedFaces: addedFaces.length,
//       totalProcessed: studentsWithPhotos.length,
//       errors: errors,
//       message: `Successfully synced ${addedFaces.length} of ${studentsWithPhotos.length} student face${addedFaces.length !== 1 ? 's' : ''}`
//     };

//   } catch (error) {
//     console.error('Fatal error syncing faces:', error);
//     return { 
//       success: false, 
//       error: error.message,
//       addedFaces: 0,
//       errors: []
//     };
//   }
// };


/**
 * Check if a Face++ faceset exists
 */
// const checkFacesetExists = async (outerId) => {
//   try {
//     const formData = new FormData();
//     formData.append('api_key', FACEPP_API_KEY);
//     formData.append('api_secret', FACEPP_API_SECRET);
//     formData.append('outer_id', outerId);

//     const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/faceset/getdetail', {
//       method: 'POST',
//       body: formData
//     });

//     const result = await response.json();
    
//     // If no error_message, faceset exists
//     if (!result.error_message) {
//       console.log(`✅ Faceset "${outerId}" exists with ${result.face_count} faces`);
//       return true;
//     }
    
//     // If error is INVALID_OUTER_ID, faceset doesn't exist
//     if (result.error_message === 'INVALID_OUTER_ID') {
//       console.log(`ℹ️ Faceset "${outerId}" does not exist yet`);
//       return false;
//     }
    
//     // Other errors
//     console.error('Error checking faceset:', result.error_message);
//     return false;
//   } catch (error) {
//     console.error('Error checking faceset:', error);
//     return false;
//   }
// };

/**
 * Create a new Face++ faceset
 */
// const createFaceset = async (outerId, displayName) => {
//   try {
//     const formData = new FormData();
//     formData.append('api_key', FACEPP_API_KEY);
//     formData.append('api_secret', FACEPP_API_SECRET);
//     formData.append('outer_id', outerId);
//     formData.append('display_name', displayName);

//     const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/faceset/create', {
//       method: 'POST',
//       body: formData
//     });

//     const result = await response.json();
    
//     if (result.error_message) {
//       throw new Error(`Failed to create faceset: ${result.error_message}`);
//     }

//     console.log('✅ Faceset created:', result);
//     return result;
//   } catch (error) {
//     console.error('Error creating faceset:', error);
//     throw error;
//   }
// };

/**
 * Detect face in image and get face_token
 */
// const detectAndGetFaceToken = async (imageUrl) => {
//   try {
//     const formData = new FormData();
//     formData.append('api_key', FACEPP_API_KEY);
//     formData.append('api_secret', FACEPP_API_SECRET);
//     formData.append('image_url', imageUrl);

//     const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/detect', {
//       method: 'POST',
//       body: formData
//     });

//     const result = await response.json();

//     if (result.error_message) {
//       console.error('Face detection error:', result.error_message);
//       return null;
//     }

//     if (result.faces && result.faces.length > 0) {
//       console.log(`✅ Face detected, token: ${result.faces[0].face_token.substring(0, 20)}...`);
//       return result.faces[0].face_token;
//     }

//     console.log('⚠️ No face detected in image');
//     return null;
//   } catch (error) {
//     console.error('Error detecting face:', error);
//     return null;
//   }
// };

/**
 * Add face to faceset
 */
// const addFaceToFaceset = async (outerId, faceToken, userId) => {
//   try {
//     const formData = new FormData();
//     formData.append('api_key', FACEPP_API_KEY);
//     formData.append('api_secret', FACEPP_API_SECRET);
//     formData.append('outer_id', outerId);
//     formData.append('face_tokens', faceToken);
//     formData.append('user_id', userId);

//     const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/faceset/addface', {
//       method: 'POST',
//       body: formData
//     });

//     const result = await response.json();

//     if (result.error_message) {
//       throw new Error(`Failed to add face: ${result.error_message}`);
//     }

//     return result;
//   } catch (error) {
//     console.error('Error adding face to faceset:', error);
//     throw error;
//   }
// };

/**
 * Search for a matching student face using Face++ Search API
 */
// export const searchStudentByFace = async (capturedImageBase64) => {
//   try {
//     console.log('🔍 Searching for matching student face...');

//     // First, check if faceset exists
//     const facesetExists = await checkFacesetExists(FACESET_OUTER_ID);
    
//     if (!facesetExists) {
//       return {
//         success: false,
//         matched: false,
//         error: 'FACESET_NOT_INITIALIZED',
//         message: 'Face database not initialized. Please run the sync process first.'
//       };
//     }

//     // Extract base64 data
//     const base64Data = capturedImageBase64.includes(',') 
//       ? capturedImageBase64.split(',')[1] 
//       : capturedImageBase64;

//     // Prepare form data for Face++ Search API
//     const formData = new FormData();
//     formData.append('api_key', FACEPP_API_KEY);
//     formData.append('api_secret', FACEPP_API_SECRET);
//     formData.append('outer_id', FACESET_OUTER_ID);
//     formData.append('image_base64', base64Data);
//     formData.append('return_result_count', '5');

//     console.log('📤 Sending search request to Face++...');

//     // Call Face++ Search API
//     const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/search', {
//       method: 'POST',
//       body: formData
//     });

//     const result = await response.json();

//     console.log('📊 Face++ Search Result:', result);

//     // Handle errors
//     if (result.error_message) {
//       console.error('❌ Face++ Error:', result.error_message);
      
//       if (result.error_message === 'INVALID_OUTER_ID') {
//         return {
//           success: false,
//           matched: false,
//           error: result.error_message,
//           message: 'Face database not found. Please run the sync process first.'
//         };
//       }
      
//       return {
//         success: false,
//         matched: false,
//         error: result.error_message,
//         message: `Face search failed: ${result.error_message}`
//       };
//     }

//     // Check if face was detected
//     if (!result.faces || result.faces.length === 0) {
//       return {
//         success: false,
//         matched: false,
//         message: 'No face detected in the captured image. Please try again with better lighting.'
//       };
//     }

//     // Check if any matches were found
//     if (!result.results || result.results.length === 0) {
//       return {
//         success: true,
//         matched: false,
//         message: 'No matching student found in database'
//       };
//     }

//     // Get the best match
//     const bestMatch = result.results[0];
//     const confidence = bestMatch.confidence;

//     console.log(`📊 Best Match - Confidence: ${confidence}%, User ID: ${bestMatch.user_id}`);

//     // Check confidence threshold
//     const threshold = result.thresholds ? result.thresholds['1e-3'] : 70;

//     if (confidence < threshold) {
//       return {
//         success: true,
//         matched: false,
//         message: `Low confidence match (${confidence.toFixed(1)}%). Please try again with better lighting and face the camera directly.`,
//         confidence: confidence.toFixed(1)
//       };
//     }

//     // Fetch full student details using the user_id (matric number)
//     const studentResult = await getStudentByMatricNumber(bestMatch.user_id);

//     if (!studentResult.success) {
//       return {
//         success: false,
//         matched: false,
//         message: 'Student record not found in database'
//       };
//     }

//     console.log(`✅ MATCH FOUND! ${studentResult.data.firstName} ${studentResult.data.surname}`);

//     return {
//       success: true,
//       matched: true,
//       student: studentResult.data,
//       confidence: confidence.toFixed(1),
//       matchTime: new Date().toLocaleTimeString(),
//       faceToken: bestMatch.face_token,
//       allMatches: result.results.map(r => ({
//         matricNumber: r.user_id,
//         confidence: r.confidence.toFixed(1)
//       }))
//     };

//   } catch (error) {
//     console.error('❌ Face search error:', error);
//     return {
//       success: false,
//       matched: false,
//       error: error.message,
//       message: 'Face search failed. Please try again.'
//     };
//   }
// };

/**
 * Update student record with Face++ face_token after enrollment
 */
export const updateStudentWithFaceToken = async (studentId, faceImageUrl) => {
  try {
    // Ensure faceset exists
    const facesetExists = await checkFacesetExists(FACESET_OUTER_ID);
    if (!facesetExists) {
      await createFaceset(FACESET_OUTER_ID, 'Student Faces');
    }

    // Detect face and get face_token
    const faceToken = await detectAndGetFaceToken(faceImageUrl);
    
    if (!faceToken) {
      return { success: false, error: 'No face detected in image' };
    }

    // Get student record
    const studentResult = await getStudentById(studentId);
    
    if (!studentResult.success) {
      return { success: false, error: 'Student not found' };
    }

    const matricNumber = studentResult.data.matricNumber;

    // Add face to faceset
    await addFaceToFaceset(FACESET_OUTER_ID, faceToken, matricNumber);

    // Update student record
    await databases.updateDocument(
      config.databaseId,
      config.studentsCollectionId,
      studentId,
      {
        faceTemplate: faceToken,
        faceCaptured: true,
        faceCapturedAt: new Date().toISOString()
      }
    );

    console.log(`✅ Face enrolled for ${matricNumber}`);

    return {
      success: true,
      faceToken: faceToken,
      message: 'Face enrolled successfully'
    };

  } catch (error) {
    console.error('Error updating student with face token:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Remove student face from Face++ faceset
 */
export const removeStudentFaceFromFaceset = async (faceToken) => {
  try {
    const formData = new FormData();
    formData.append('api_key', FACEPP_API_KEY);
    formData.append('api_secret', FACEPP_API_SECRET);
    formData.append('outer_id', FACESET_OUTER_ID);
    formData.append('face_tokens', faceToken);

    const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/faceset/removeface', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.error_message) {
      throw new Error(result.error_message);
    }

    console.log('✅ Face removed from faceset');
    return { success: true };

  } catch (error) {
    console.error('Error removing face:', error);
    return { success: false, error: error.message };
  }
};

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Check if a Face++ faceset exists
 */
export const checkFacesetExists = async (outerId) => {
  try {
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('api_key', FACEPP_API_KEY);
    formData.append('api_secret', FACEPP_API_SECRET);
    formData.append('outer_id', outerId);

    const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/faceset/getdetail', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    const result = await response.json();
    
    if (!result.error_message) {
      console.log(`✅ Faceset "${outerId}" exists with ${result.face_count} faces`);
      return { exists: true, faceCount: result.face_count };
    }
    
    if (result.error_message === 'INVALID_OUTER_ID') {
      console.log(`ℹ️ Faceset "${outerId}" does not exist yet`);
      return { exists: false };
    }
    
    console.error('Error checking faceset:', result.error_message);
    return { exists: false, error: result.error_message };
  } catch (error) {
    console.error('Error checking faceset:', error);
    return { exists: false, error: error.message };
  }
};

/**
 * Create a new Face++ faceset
 */
export const createFaceset = async (outerId, displayName) => {
  try {
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('api_key', FACEPP_API_KEY);
    formData.append('api_secret', FACEPP_API_SECRET);
    formData.append('outer_id', outerId);
    formData.append('display_name', displayName);

    const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/faceset/create', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    const result = await response.json();
    
    if (result.error_message) {
      throw new Error(`Failed to create faceset: ${result.error_message}`);
    }

    console.log('✅ Faceset created:', result.faceset_token);
    return { success: true, faceset: result };
  } catch (error) {
    console.error('Error creating faceset:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Detect face in image and get face_token
 */
export const detectAndGetFaceToken = async (imageUrl) => {
  try {
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('api_key', FACEPP_API_KEY);
    formData.append('api_secret', FACEPP_API_SECRET);
    formData.append('image_url', imageUrl);

    const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/detect', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    const result = await response.json();

    if (result.error_message) {
      console.error('Face detection error:', result.error_message);
      return { success: false, error: result.error_message };
    }

    if (result.faces && result.faces.length > 0) {
      const faceToken = result.faces[0].face_token;
      console.log(`✅ Face detected, token: ${faceToken.substring(0, 20)}...`);
      return { success: true, faceToken: faceToken };
    }

    console.log('⚠️ No face detected in image');
    return { success: false, error: 'No face detected' };
  } catch (error) {
    console.error('Error detecting face:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Add face to faceset
 */
export const addFaceToFaceset = async (outerId, faceToken, userId) => {
  try {
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('api_key', FACEPP_API_KEY);
    formData.append('api_secret', FACEPP_API_SECRET);
    formData.append('outer_id', outerId);
    formData.append('face_tokens', faceToken);
    formData.append('user_id', userId);

    const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/faceset/addface', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    const result = await response.json();

    if (result.error_message) {
      throw new Error(`Failed to add face: ${result.error_message}`);
    }

    return { success: true, result };
  } catch (error) {
    console.error('Error adding face to faceset:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Remove student face from Face++ faceset
 */
export const removeFaceFromFaceset = async (outerId, faceToken) => {
  try {
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('api_key', FACEPP_API_KEY);
    formData.append('api_secret', FACEPP_API_SECRET);
    formData.append('outer_id', outerId);
    formData.append('face_tokens', faceToken);

    const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/faceset/removeface', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    const result = await response.json();

    if (result.error_message) {
      throw new Error(result.error_message);
    }

    console.log('✅ Face removed from faceset');
    return { success: true };
  } catch (error) {
    console.error('Error removing face:', error);
    return { success: false, error: error.message };
  }
};

// ========================================
// MAIN FUNCTIONS
// ========================================

/**
 * Sync all students with profile pictures to Face++ faceset
 * RUN THIS ONCE before using Search API
 */
export const syncStudentFacesToFacePlusPlus = async () => {
  try {
    console.log('🔄 Syncing student faces to Face++...');

    // Step 1: Check/Create faceset
    const facesetCheck = await checkFacesetExists(FACESET_OUTER_ID);
    
    if (!facesetCheck.exists) {
      console.log('📝 Creating new faceset...');
      const createResult = await createFaceset(FACESET_OUTER_ID, 'Student Faces');
      if (!createResult.success) {
        return { 
          success: false, 
          error: createResult.error,
          message: 'Failed to create faceset'
        };
      }
    }

    // Step 2: Get all students with profile pictures
    const studentsResponse = await databases.listDocuments(
      DATABASE_ID,
      STUDENT_COLLECTION_ID,
      [
        Query.equal('isActive', true),
        Query.limit(1000)
      ]
    );

    const studentsWithPhotos = studentsResponse.documents.filter(
      student => student.profilePictureUrl && student.profilePictureUrl.trim() !== ''
    );

    console.log(`📋 Found ${studentsWithPhotos.length} students with profile pictures`);

    if (studentsWithPhotos.length === 0) {
      return { 
        success: false, 
        addedFaces: 0,
        message: 'No students with profile pictures found'
      };
    }

    // Step 3: Add each student's face
    const addedFaces = [];
    const errors = [];

    for (let i = 0; i < studentsWithPhotos.length; i++) {
      const student = studentsWithPhotos[i];
      
      try {
        console.log(`[${i + 1}/${studentsWithPhotos.length}] Processing ${student.firstName} ${student.surname}...`);

        // Detect face
        const detectResult = await detectAndGetFaceToken(student.profilePictureUrl);
        
        if (!detectResult.success) {
          errors.push({ 
            matricNumber: student.matricNumber, 
            name: `${student.firstName} ${student.surname}`,
            error: detectResult.error
          });
          continue;
        }

        // Add to faceset
        const addResult = await addFaceToFaceset(
          FACESET_OUTER_ID, 
          detectResult.faceToken, 
          student.matricNumber
        );

        if (!addResult.success) {
          errors.push({ 
            matricNumber: student.matricNumber, 
            name: `${student.firstName} ${student.surname}`,
            error: addResult.error
          });
          continue;
        }

        // Update student record
        await databases.updateDocument(
          DATABASE_ID,
          STUDENT_COLLECTION_ID,
          student.$id,
          {
            faceTemplate: detectResult.faceToken,
            faceCaptured: true,
            faceCapturedAt: new Date().toISOString()
          }
        );
        
        addedFaces.push(student.matricNumber);
        console.log(`  ✅ Added successfully`);

      } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
        errors.push({ 
          matricNumber: student.matricNumber,
          name: `${student.firstName} ${student.surname}`,
          error: error.message 
        });
      }

      // Delay to avoid rate limiting
      if (i < studentsWithPhotos.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`✅ Successfully added: ${addedFaces.length}`);
    console.log(`❌ Errors: ${errors.length}`);

    return {
      success: true,
      addedFaces: addedFaces.length,
      totalProcessed: studentsWithPhotos.length,
      errors: errors,
      message: `Successfully synced ${addedFaces.length}/${studentsWithPhotos.length} students`
    };

  } catch (error) {
    console.error('Fatal error syncing faces:', error);
    return { 
      success: false, 
      error: error.message,
      addedFaces: 0
    };
  }
};

/**
 * Search for matching student using Face++ Search API (FAST)
 */
export const searchStudentByFace = async (capturedImageBase64) => {
  try {
    console.log('🔍 Searching for matching student...');

    // Check if faceset exists
    const facesetCheck = await checkFacesetExists(FACESET_OUTER_ID);
    if (!facesetCheck.exists) {
      return {
        success: false,
        matched: false,
        error: 'FACESET_NOT_INITIALIZED',
        message: 'Face database not initialized. Please sync students first.'
      };
    }

    // Extract base64 data
    const base64Data = capturedImageBase64.includes(',') 
      ? capturedImageBase64.split(',')[1] 
      : capturedImageBase64;

    // Search in faceset
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('api_key', FACEPP_API_KEY);
    formData.append('api_secret', FACEPP_API_SECRET);
    formData.append('outer_id', FACESET_OUTER_ID);
    formData.append('image_base64', base64Data);
    formData.append('return_result_count', '5');

    const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/search', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    const result = await response.json();

    if (result.error_message) {
      return {
        success: false,
        matched: false,
        error: result.error_message,
        message: `Face search failed: ${result.error_message}`
      };
    }

    if (!result.faces || result.faces.length === 0) {
      return {
        success: false,
        matched: false,
        message: 'No face detected. Please ensure good lighting and face the camera.'
      };
    }

    if (!result.results || result.results.length === 0) {
      return {
        success: true,
        matched: false,
        message: 'No matching student found in database'
      };
    }

    const bestMatch = result.results[0];
    const confidence = bestMatch.confidence;
    const threshold = result.thresholds ? result.thresholds['1e-3'] : 70;

    if (confidence < threshold) {
      return {
        success: true,
        matched: false,
        message: `Low confidence match (${confidence.toFixed(1)}%)`,
        confidence: confidence.toFixed(1)
      };
    }

    // Fetch student details
    const studentResponse = await databases.listDocuments(
      DATABASE_ID,
      STUDENT_COLLECTION_ID,
      [
        Query.equal('matricNumber', bestMatch.user_id),
        Query.equal('isActive', true),
        Query.limit(1)
      ]
    );

    if (studentResponse.documents.length === 0) {
      return {
        success: false,
        matched: false,
        message: 'Student record not found'
      };
    }

    return {
      success: true,
      matched: true,
      student: studentResponse.documents[0],
      confidence: confidence.toFixed(1),
      matchTime: new Date().toLocaleTimeString()
    };

  } catch (error) {
    console.error('❌ Face search error:', error);
    return {
      success: false,
      matched: false,
      error: error.message
    };
  }
};

/**
 * Compare face with all students (SLOW - Fallback only)
 */
export const compareWithAllStudents = async (capturedImageBase64) => {
  try {
    console.log('🔍 Comparing with all students...');

    const studentsResponse = await databases.listDocuments(
      DATABASE_ID,
      STUDENT_COLLECTION_ID,
      [
        Query.equal('isActive', true),
        Query.limit(1000)
      ]
    );

    const studentsWithPhotos = studentsResponse.documents.filter(
      student => student.profilePictureUrl && student.profilePictureUrl.trim() !== ''
    );

    if (studentsWithPhotos.length === 0) {
      return {
        success: false,
        matched: false,
        message: 'No registered students found'
      };
    }

    const base64Data = capturedImageBase64.includes(',') 
      ? capturedImageBase64.split(',')[1] 
      : capturedImageBase64;
    const capturedBuffer = Buffer.from(base64Data, 'base64');

    let bestMatch = null;
    let highestConfidence = 0;

    for (const student of studentsWithPhotos) {
      try {
        const storedImageResponse = await fetch(student.profilePictureUrl);
        const storedImageBuffer = Buffer.from(await storedImageResponse.arrayBuffer());

        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('api_key', FACEPP_API_KEY);
        formData.append('api_secret', FACEPP_API_SECRET);
        formData.append('image_file1', storedImageBuffer, {
          filename: 'stored.jpg',
          contentType: 'image/jpeg'
        });
        formData.append('image_file2', capturedBuffer, {
          filename: 'captured.jpg',
          contentType: 'image/jpeg'
        });

        const compareResponse = await fetch('https://api-us.faceplusplus.com/facepp/v3/compare', {
          method: 'POST',
          body: formData,
          headers: formData.getHeaders(),
        });

        const compareResult = await compareResponse.json();

        if (!compareResult.error_message) {
          const confidence = compareResult.confidence || 0;
          if (confidence > highestConfidence && confidence >= 70) {
            highestConfidence = confidence;
            bestMatch = student;
          }
        }

      } catch (error) {
        console.error(`Error comparing with ${student.matricNumber}:`, error.message);
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (!bestMatch) {
      return {
        success: true,
        matched: false,
        message: 'No matching student found'
      };
    }

    return {
      success: true,
      matched: true,
      student: bestMatch,
      confidence: highestConfidence.toFixed(1),
      matchTime: new Date().toLocaleTimeString()
    };

  } catch (error) {
    console.error('❌ Compare error:', error);
    return {
      success: false,
      matched: false,
      error: error.message
    };
  }
};
// ========================================
// ADMIN USER MANAGEMENT FUNCTIONS
// Add these to your lib/appwrite.js file
// ========================================

/**
 * Create a new admin user
 */
export const createAdminUser = async (userData) => {
  try {
    console.log('Creating admin user:', userData.email);

    // Check if email already exists
    const existingUser = await databases.listDocuments(
      config.databaseId,
      config.usersCollectionId,
      [Query.equal('email', userData.email)]
    );

    if (existingUser.documents.length > 0) {
      return {
        success: false,
        error: 'An account with this email already exists'
      };
    }

    // Check if username already exists
    const existingUsername = await databases.listDocuments(
      config.databaseId,
      config.usersCollectionId,
      [Query.equal('username', userData.username)]
    );

    if (existingUsername.documents.length > 0) {
      return {
        success: false,
        error: 'Username already taken'
      };
    }

    // Hash the password
    const hashedPassword = await hashPassword(userData.password);

    // Create admin user document
    const adminUser = await databases.createDocument(
      config.databaseId,
      config.usersCollectionId,
      ID.unique(),
      {
        username: userData.username.trim(),
        passwordHash: hashedPassword,
        email: userData.email.toLowerCase().trim(),
        isActive: true
      }
    );

    console.log('Admin user created successfully');

    return {
      success: true,
      data: {
        id: adminUser.$id,
        username: adminUser.username,
        email: adminUser.email,
        isActive: adminUser.isActive
      },
      message: 'Admin account created successfully'
    };

  } catch (error) {
    console.error('Error creating admin user:', error);
    return {
      success: false,
      error: error.message || 'Failed to create admin account'
    };
  }
};

/**
 * Admin login function
 */
export const adminLogin = async (email, password) => {
  try {
    console.log('Admin login attempt for:', email);

    // Clean inputs
    const cleanEmail = email.toLowerCase().trim();
    const cleanPassword = password.trim();

    // Find admin by email
    const response = await databases.listDocuments(
      config.databaseId,
      config.usersCollectionId,
      [
        Query.equal('email', cleanEmail),
        Query.equal('isActive', true)
      ]
    );

    if (response.documents.length === 0) {
      console.log('No admin account found for:', cleanEmail);
      return {
        success: false,
        error: 'Invalid email or password'
      };
    }

    const adminUser = response.documents[0];
    console.log('Admin account found, verifying password...');

    // Verify password
    const isPasswordValid = await verifyPassword(cleanPassword, adminUser.passwordHash);

    if (!isPasswordValid) {
      console.log('Password verification failed');
      return {
        success: false,
        error: 'Invalid email or password'
      };
    }

    console.log('Login successful for:', cleanEmail);

    return {
      success: true,
      user: {
        id: adminUser.$id,
        username: adminUser.username,
        email: adminUser.email,
        isActive: adminUser.isActive,
        createdAt: adminUser.$createdAt
      },
      message: 'Login successful'
    };

  } catch (error) {
    console.error('Error during admin login:', error);
    return {
      success: false,
      error: 'Login failed. Please try again.'
    };
  }
};

/**
 * Get all admin users (for management page)
 */
export const getAllAdminUsers = async () => {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.usersCollectionId,
      [Query.orderDesc('$createdAt')]
    );

    return {
      success: true,
      data: response.documents.map(user => ({
        id: user.$id,
        username: user.username,
        email: user.email,
        isActive: user.isActive,
        createdAt: user.$createdAt,
        updatedAt: user.$updatedAt
      })),
      total: response.total
    };
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * Update admin user status (activate/deactivate)
 */
export const updateAdminUserStatus = async (userId, isActive) => {
  try {
    const updatedUser = await databases.updateDocument(
      config.databaseId,
      config.usersCollectionId,
      userId,
      { isActive: isActive }
    );

    return {
      success: true,
      data: updatedUser,
      message: `Admin account ${isActive ? 'activated' : 'deactivated'} successfully`
    };
  } catch (error) {
    console.error('Error updating admin status:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Update admin password
 */
export const updateAdminPassword = async (userId, newPassword) => {
  try {
    const hashedPassword = await hashPassword(newPassword);

    await databases.updateDocument(
      config.databaseId,
      config.usersCollectionId,
      userId,
      { passwordHash: hashedPassword }
    );

    return {
      success: true,
      message: 'Password updated successfully'
    };
  } catch (error) {
    console.error('Error updating password:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Delete admin user
 */
export const deleteAdminUser = async (userId) => {
  try {
    await databases.deleteDocument(
      config.databaseId,
      config.usersCollectionId,
      userId
    );

    return {
      success: true,
      message: 'Admin account deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting admin user:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ========================================
// ADMIN-CONTROLLED ATTENDANCE FUNCTIONS
// Add these to your lib/appwrite.js file
// ========================================

/**
 * Create an attendance session (Admin initiates this)
 * This creates a session for a specific course on a specific date
 */
export const createAttendanceSession = async (courseCode, courseTitle, sessionType = 'signin') => {
  try {
    console.log('📝 Creating attendance session...');

    const today = new Date().toISOString().split('T')[0];
    
    // Check if session already exists for this course today
    const existingSession = await databases.listDocuments(
      config.databaseId,
      'attendance_sessions', // New collection for sessions
      [
        Query.equal('courseCode', courseCode),
        Query.equal('sessionDate', today),
        Query.equal('sessionType', sessionType),
        Query.equal('isActive', true),
        Query.limit(1)
      ]
    );

    if (existingSession.documents.length > 0) {
      return {
        success: true,
        data: existingSession.documents[0],
        message: 'Session already exists',
        existing: true
      };
    }

    // Get current semester and academic year
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    const semester = currentMonth >= 1 && currentMonth <= 6 ? 'First' : 'Second';
    const academicYear = currentMonth >= 9 
      ? `${currentYear}/${currentYear + 1}` 
      : `${currentYear - 1}/${currentYear}`;

    // Create attendance session
    const session = await databases.createDocument(
      config.databaseId,
      'attendance_sessions',
      ID.unique(),
      {
        courseCode: courseCode,
        courseTitle: courseTitle,
        sessionDate: today,
        sessionType: sessionType, // 'signin' or 'signout'
        sessionStartTime: new Date().toISOString(),
        semester: semester,
        academicYear: academicYear,
        totalStudentsMarked: 0,
        isActive: true,
        status: 'ongoing'
      }
    );

    console.log('✅ Attendance session created');

    return {
      success: true,
      data: session,
      message: `${sessionType === 'signin' ? 'Sign-in' : 'Sign-out'} session started`
    };

  } catch (error) {
    console.error('Error creating attendance session:', error);
    return {
      success: false,
      error: error.message || 'Failed to create attendance session'
    };
  }
};

/**
 * Admin marks student attendance using fingerprint
 */
export const adminMarkAttendance = async (sessionId, sessionType, fingerprintTemplate) => {
  try {
    console.log('🔍 Processing attendance marking...');

    // Verify fingerprint
    const verificationResult = await verifyFingerprintScanner(fingerprintTemplate);

    if (!verificationResult.success || !verificationResult.matched) {
      return {
        success: false,
        error: 'Fingerprint not recognized. Please try again.',
        matched: false
      };
    }

    const student = verificationResult.student;
    
    // Get session details
    const session = await databases.getDocument(
      config.databaseId,
      'attendance_sessions',
      sessionId
    );

    if (!session || session.status !== 'ongoing') {
      return {
        success: false,
        error: 'Invalid or closed session'
      };
    }

    // Check if student is registered for this course
    const registrationCheck = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      [
        Query.equal('matricNumber', student.matricNumber),
        Query.equal('courseCode', session.courseCode),
        Query.equal('status', 'Approved'),
        Query.equal('isActive', true),
        Query.limit(1)
      ]
    );

    if (registrationCheck.documents.length === 0) {
      return {
        success: false,
        error: `${student.firstName} ${student.surname} is not registered for ${session.courseCode}`,
        notRegistered: true,
        student: student
      };
    }

    const courseRegistration = registrationCheck.documents[0];
    
    // Get courseId from the registration (handle both field types)
    let courseId = courseRegistration.courseId;
    if (!courseId && courseRegistration.course) {
      courseId = typeof courseRegistration.course === 'string' 
        ? courseRegistration.course 
        : courseRegistration.course.$id;
    }
    
    const today = session.sessionDate;

    // Determine which finger was used
    const fingerUsed = determineFingerUsed(fingerprintTemplate, student);

    if (sessionType === 'signin') {
      // Check if student already signed in today for this course
      const existingAttendance = await databases.listDocuments(
        config.databaseId,
        config.attendanceCollectionId,
        [
          Query.equal('studentId', student.$id),
          Query.equal('courseCode', session.courseCode),
          Query.equal('attendanceDate', today),
          Query.equal('isActive', true),
          Query.limit(1)
        ]
      );

      if (existingAttendance.documents.length > 0) {
        const record = existingAttendance.documents[0];
        return {
          success: false,
          error: `${student.firstName} ${student.surname} already signed in at ${new Date(record.signInTime).toLocaleTimeString()}`,
          alreadyMarked: true,
          student: student,
          existingRecord: record
        };
      }

      // Create new attendance record
      const attendance = await databases.createDocument(
        config.databaseId,
        config.attendanceCollectionId,
        ID.unique(),
        {
          studentId: student.$id,
          matricNumber: student.matricNumber,
          courseId: courseId || session.courseCode, // Fallback to courseCode if no ID
          courseCode: session.courseCode,
          courseTitle: session.courseTitle,
          attendanceDate: today,
          signInTime: new Date().toISOString(),
          signInFingerUsed: fingerUsed,
          signInStatus: 'Present',
          semester: session.semester,
          academicYear: session.academicYear,
          sessionId: sessionId,
          isActive: true
        }
      );

      // Update session count
      await databases.updateDocument(
        config.databaseId,
        'attendance_sessions',
        sessionId,
        {
          totalStudentsMarked: session.totalStudentsMarked + 1
        }
      );

      console.log('✅ Sign-in marked successfully');

      return {
        success: true,
        data: attendance,
        student: student,
        fingerUsed: fingerUsed,
        action: 'signin',
        message: `${student.firstName} ${student.surname} signed in successfully`
      };

    } else {
      // Sign-out
      // Find today's attendance record
      const attendanceRecords = await databases.listDocuments(
        config.databaseId,
        config.attendanceCollectionId,
        [
          Query.equal('matricNumber', student.matricNumber),
          Query.equal('courseCode', session.courseCode),
          Query.equal('attendanceDate', today),
          Query.equal('isActive', true),
          Query.limit(1)
        ]
      );

      if (attendanceRecords.documents.length === 0) {
        return {
          success: false,
          error: `${student.firstName} ${student.surname} has not signed in yet`,
          notSignedIn: true,
          student: student
        };
      }

      const attendanceRecord = attendanceRecords.documents[0];

      // Check if already signed out
      if (attendanceRecord.signOutTime) {
        return {
          success: false,
          error: `${student.firstName} ${student.surname} already signed out at ${new Date(attendanceRecord.signOutTime).toLocaleTimeString()}`,
          alreadyMarked: true,
          student: student,
          existingRecord: attendanceRecord
        };
      }

      const signOutTime = new Date();
      const signInTime = new Date(attendanceRecord.signInTime);
      
      // Calculate duration in minutes
      const durationMinutes = Math.floor((signOutTime - signInTime) / (1000 * 60));

      // Update attendance record
      const updatedAttendance = await databases.updateDocument(
        config.databaseId,
        config.attendanceCollectionId,
        attendanceRecord.$id,
        {
          signOutTime: signOutTime.toISOString(),
          signOutFingerUsed: fingerUsed,
          signOutStatus: 'Completed',
          totalDuration: durationMinutes
        }
      );

      console.log('✅ Sign-out marked successfully');

      return {
        success: true,
        data: updatedAttendance,
        student: student,
        fingerUsed: fingerUsed,
        duration: durationMinutes,
        action: 'signout',
        message: `${student.firstName} ${student.surname} signed out successfully (${formatDuration(durationMinutes)})`
      };
    }

  } catch (error) {
    console.error('Error marking attendance:', error);
    return {
      success: false,
      error: error.message || 'Failed to mark attendance'
    };
  }
};

/**
 * Close attendance session
 */
export const closeAttendanceSession = async (sessionId) => {
  try {
    await databases.updateDocument(
      config.databaseId,
      'attendance_sessions',
      sessionId,
      {
        status: 'closed',
        sessionEndTime: new Date().toISOString()
      }
    );

    return {
      success: true,
      message: 'Attendance session closed'
    };
  } catch (error) {
    console.error('Error closing session:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get active attendance sessions
 */
export const getActiveSessions = async () => {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      'attendance_sessions',
      [
        Query.equal('status', 'ongoing'),
        Query.equal('isActive', true),
        Query.orderDesc('sessionStartTime')
      ]
    );

    return {
      success: true,
      data: response.documents
    };
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * Get all courses with registered students (for admin to select)
 */
export const getCoursesWithRegisteredStudents = async () => {
  try {
    console.log('📚 Fetching courses with registered students...');
    
    // Get all approved course registrations
    const registrations = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      [
        Query.equal('status', 'Approved'),
        Query.equal('isActive', true),
        Query.limit(1000) // Increase limit
      ]
    );

    console.log(`Found ${registrations.documents.length} approved registrations`);

    if (registrations.documents.length === 0) {
      return {
        success: true,
        data: [],
        message: 'No approved course registrations found'
      };
    }

    // Group by course (using courseCode as unique key)
    const coursesMap = {};
    
    registrations.documents.forEach(reg => {
      const key = reg.courseCode;
      
      if (!coursesMap[key]) {
        coursesMap[key] = {
          courseCode: reg.courseCode,
          courseTitle: reg.courseTitle,
          courseId: reg.courseId || reg.course, // Handle both field names
          courseUnit: reg.courseUnit,
          semester: reg.semester,
          studentCount: 0,
          students: [],
          registrationIds: []
        };
      }
      
      // Only count unique students (avoid duplicates)
      if (!coursesMap[key].students.includes(reg.matricNumber)) {
        coursesMap[key].studentCount++;
        coursesMap[key].students.push(reg.matricNumber);
      }
      
      coursesMap[key].registrationIds.push(reg.$id);
    });

    const coursesList = Object.values(coursesMap);
    
    console.log(`✅ Grouped into ${coursesList.length} unique courses`);
    
    return {
      success: true,
      data: coursesList,
      total: coursesList.length
    };
  } catch (error) {
    console.error('❌ Error fetching courses:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * Get students registered for a specific course
 */
export const getStudentsForCourse = async (courseCode) => {
  try {
    console.log(`📚 Fetching students for course: ${courseCode}`);
    
    const registrations = await databases.listDocuments(
      config.databaseId,
      config.courseRegistrationCollectionId,
      [
        Query.equal('courseCode', courseCode),
        Query.equal('status', 'Approved'),
        Query.equal('isActive', true)
      ]
    );

    console.log(`Found ${registrations.documents.length} registrations for ${courseCode}`);

    // Fetch full student details
    const students = [];
    const seenMatricNumbers = new Set(); // Prevent duplicates
    const failedMatricNumbers = []; // Track failed lookups

    for (const reg of registrations.documents) {
      try {
        // Skip if we've already processed this student
        if (seenMatricNumbers.has(reg.matricNumber)) {
          console.log(`⏭️  Skipping duplicate: ${reg.matricNumber}`);
          continue;
        }

        console.log(`🔍 Processing registration for: ${reg.matricNumber}`);

        // Try multiple ways to get the student ID
        let studentDocId = null;
        
        // Method 1: Check if 'student' field exists (relationship field)
        if (reg.student) {
          studentDocId = typeof reg.student === 'string' ? reg.student : reg.student.$id;
          console.log(`  ✓ Found student ID from relationship: ${studentDocId}`);
        }
        
        // Method 2: Check if 'studentId' field exists
        if (!studentDocId && reg.studentId) {
          studentDocId = reg.studentId;
          console.log(`  ✓ Found student ID from field: ${studentDocId}`);
        }

        // Method 3: Query by matric number if ID not found
        if (!studentDocId) {
          console.log(`  ⚠️ No student ID found, querying by matric number...`);
          const studentResult = await getStudentByMatricNumber(reg.matricNumber);
          if (studentResult.success) {
            console.log(`  ✓ Found student via matric lookup: ${studentResult.data.firstName} ${studentResult.data.surname}`);
            students.push(studentResult.data);
            seenMatricNumbers.add(reg.matricNumber);
            continue;
          } else {
            console.warn(`  ⚠️ Student not found via matric lookup: ${reg.matricNumber}`);
            failedMatricNumbers.push(reg.matricNumber);
            continue;
          }
        }

        // Fetch student by document ID
        console.log(`  📝 Fetching student document: ${studentDocId}`);
        const student = await databases.getDocument(
          config.databaseId,
          config.studentsCollectionId,
          studentDocId
        );
        
        console.log(`  ✅ Successfully fetched: ${student.firstName} ${student.surname} (${student.matricNumber})`);
        students.push(student);
        seenMatricNumbers.add(reg.matricNumber);
        
      } catch (error) {
        console.error(`  ❌ Error fetching student for ${reg.matricNumber}:`, error.message);
        
        // Fallback: Try to get student by matric number
        try {
          console.log(`  🔄 Attempting fallback query by matric number...`);
          const studentResult = await getStudentByMatricNumber(reg.matricNumber);
          if (studentResult.success && !seenMatricNumbers.has(reg.matricNumber)) {
            console.log(`  ✅ Fallback successful: ${studentResult.data.firstName} ${studentResult.data.surname}`);
            students.push(studentResult.data);
            seenMatricNumbers.add(reg.matricNumber);
          } else {
            console.warn(`  ⚠️ Fallback failed for: ${reg.matricNumber}`);
            failedMatricNumbers.push(reg.matricNumber);
          }
        } catch (fallbackError) {
          console.error(`  ❌ Fallback also failed for ${reg.matricNumber}:`, fallbackError.message);
          failedMatricNumbers.push(reg.matricNumber);
        }
      }
    }

    console.log(`\n📊 Summary for ${courseCode}:`);
    console.log(`  ✅ Successfully fetched: ${students.length} students`);
    console.log(`  ❌ Failed to fetch: ${failedMatricNumbers.length} students`);
    
    if (failedMatricNumbers.length > 0) {
      console.warn(`  ⚠️ Failed matric numbers:`, failedMatricNumbers.join(', '));
      console.warn(`  💡 These students may have been deleted but their registrations remain.`);
    }

    return {
      success: true,
      data: students,
      total: students.length,
      failedLookups: failedMatricNumbers
    };
  } catch (error) {
    console.error('❌ Fatal error fetching students:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * Get attendance report for a session
 */
export const getSessionAttendanceReport = async (sessionId) => {
  try {
    console.log(`\n📊 === GENERATING ATTENDANCE REPORT ===`);
    console.log(`Session ID: ${sessionId}`);
    
    const session = await databases.getDocument(
      config.databaseId,
      'attendance_sessions',
      sessionId
    );

    console.log(`Course: ${session.courseCode} - ${session.courseTitle}`);
    console.log(`Date: ${session.sessionDate}`);
    console.log(`Session Type: ${session.sessionType}\n`);

    // Get all students registered for this course
    const studentsResult = await getStudentsForCourse(session.courseCode);
    
    if (!studentsResult.success) {
      return {
        success: false,
        error: 'Failed to fetch registered students'
      };
    }
    
    const allStudents = studentsResult.data;
    console.log(`\n✅ Found ${allStudents.length} registered students (active)`);
    
    if (studentsResult.failedLookups && studentsResult.failedLookups.length > 0) {
      console.warn(`⚠️ Warning: ${studentsResult.failedLookups.length} student(s) could not be found`);
      console.warn(`   These registrations exist but students may have been deleted:`);
      console.warn(`   ${studentsResult.failedLookups.join(', ')}`);
    }

    // Get attendance records for this session
    const attendanceRecords = await databases.listDocuments(
      config.databaseId,
      config.attendanceCollectionId,
      [
        Query.equal('courseCode', session.courseCode),
        Query.equal('attendanceDate', session.sessionDate),
        Query.equal('isActive', true)
      ]
    );

    console.log(`\n📝 Found ${attendanceRecords.documents.length} attendance records\n`);

    // Create attendance status for each student
    const report = allStudents.map(student => {
      const record = attendanceRecords.documents.find(
        r => r.matricNumber === student.matricNumber
      );

      const status = {
        student: student,
        attended: !!record,
        signedIn: !!record,
        signedOut: record ? !!record.signOutTime : false,
        signInTime: record ? record.signInTime : null,
        signOutTime: record ? record.signOutTime : null,
        duration: record ? record.totalDuration : null,
        fingerUsed: record ? record.signInFingerUsed : null
      };

      if (record) {
        console.log(`  ✅ ${student.matricNumber} - ${student.firstName} ${student.surname} - Present`);
      } else {
        console.log(`  ❌ ${student.matricNumber} - ${student.firstName} ${student.surname} - Absent`);
      }

      return status;
    });

    const presentStudents = report.filter(r => r.attended);
    const absentStudents = report.filter(r => !r.attended);
    const signedOutStudents = report.filter(r => r.signedOut);

    const stats = {
      totalStudents: allStudents.length,
      present: presentStudents.length,
      absent: absentStudents.length,
      signedOut: signedOutStudents.length,
      attendanceRate: allStudents.length > 0 
        ? ((presentStudents.length / allStudents.length) * 100).toFixed(1)
        : 0,
      missingStudents: studentsResult.failedLookups ? studentsResult.failedLookups.length : 0
    };

    console.log(`\n📊 === REPORT SUMMARY ===`);
    console.log(`Total Students (Active): ${stats.totalStudents}`);
    console.log(`Present: ${stats.present}`);
    console.log(`Absent: ${stats.absent}`);
    console.log(`Signed Out: ${stats.signedOut}`);
    console.log(`Attendance Rate: ${stats.attendanceRate}%`);
    if (stats.missingStudents > 0) {
      console.log(`⚠️ Missing Students: ${stats.missingStudents} (deleted but still registered)`);
    }
    console.log(`========================\n`);

    return {
      success: true,
      session: session,
      report: report,
      stats: stats,
      warnings: studentsResult.failedLookups && studentsResult.failedLookups.length > 0 
        ? [`${studentsResult.failedLookups.length} student(s) could not be found: ${studentsResult.failedLookups.join(', ')}`]
        : []
    };
  } catch (error) {
    console.error('❌ Fatal error generating report:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Helper function to determine which finger was used
 */
const determineFingerUsed = (capturedTemplate, student) => {
  const fingerprints = [
    { name: 'Thumb', template: student.thumbTemplate },
    { name: 'Index', template: student.indexTemplate },
    { name: 'Middle', template: student.middleTemplate },
    { name: 'Ring', template: student.ringTemplate },
    { name: 'Pinky', template: student.pinkyTemplate }
  ];

  for (const finger of fingerprints) {
    if (finger.template && finger.template === capturedTemplate) {
      return finger.name;
    }
  }

  return 'Unknown';
};

/**
 * Helper function to format duration
 */
const formatDuration = (minutes) => {
  if (!minutes) return 'N/A';
  
  if (minutes < 60) {
    return `${minutes} min${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  return `${hours}h ${mins}m`;
};