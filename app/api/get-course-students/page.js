// pages/api/get-course-students.js
import { Client, Databases, Query } from 'appwrite';

const client = new Client()
  .setEndpoint("https://nyc.cloud.appwrite.io/v1")
  .setProject("68e83bca0016577d1322");

const databases = new Databases(client);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { courseCode } = req.body;

    const registrations = await databases.listDocuments(
      "68e84359003dccd0b700",
      "courseregistration",
      [
        Query.equal('courseCode', courseCode),
        Query.equal('isActive', true),
        Query.equal('status', 'Approved')
      ]
    );

    const studentsWithDetails = await Promise.all(
      registrations.documents.map(async (reg) => {
        try {
          const studentResponse = await databases.listDocuments(
            "68e84359003dccd0b700",
            "student",
            [Query.equal('matricNumber', reg.matricNumber)]
          );

          return {
            ...reg,
            studentDetails: studentResponse.documents[0] || null
          };
        } catch (error) {
          return { ...reg, studentDetails: null };
        }
      })
    );

    return res.status(200).json({ success: true, data: studentsWithDetails });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch students' });
  }
}