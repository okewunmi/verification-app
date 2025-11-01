// pages/api/get-attendance.js
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
    const { courseCode, date } = req.body;

    const response = await databases.listDocuments(
      "68e84359003dccd0b700",
      "attendance",
      [
        Query.equal('courseCode', courseCode),
        Query.equal('date', date),
        Query.equal('isActive', true)
      ]
    );

    return res.status(200).json({ success: true, data: response.documents });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch attendance' });
  }
}