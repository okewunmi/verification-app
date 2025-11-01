// pages/api/mark-attendance.js
import { Client, Databases, Query, ID } from 'appwrite';

const client = new Client()
  .setEndpoint("https://nyc.cloud.appwrite.io/v1")
  .setProject("68e83bca0016577d1322");

const databases = new Databases(client);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { studentId, matricNumber, courseCode, courseTitle, type, timestamp, date } = req.body;

    const existingRecords = await databases.listDocuments(
      "68e84359003dccd0b700",
      "attendance",
      [
        Query.equal('matricNumber', matricNumber),
        Query.equal('courseCode', courseCode),
        Query.equal('date', date)
      ]
    );

    if (existingRecords.documents.length > 0) {
      const record = existingRecords.documents[0];
      
      if (type === 'out' && !record.timeOut) {
        await databases.updateDocument(
          "68e84359003dccd0b700",
          "attendance",
          record.$id,
          { timeOut: timestamp }
        );
      }
    } else {
      if (type === 'in') {
        await databases.createDocument(
          "68e84359003dccd0b700",
          "attendance",
          ID.unique(),
          {
            studentId,
            matricNumber,
            courseCode,
            courseTitle,
            timeIn: timestamp,
            timeOut: '',
            date,
            isActive: true
          }
        );
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to mark attendance' });
  }
}