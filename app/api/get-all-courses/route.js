// pages/api/get-all-courses.js
import { Client, Databases, Query } from 'appwrite';

const client = new Client()
  .setEndpoint("https://nyc.cloud.appwrite.io/v1")
  .setProject("68e83bca0016577d1322");

const databases = new Databases(client);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const response = await databases.listDocuments(
      "68e84359003dccd0b700",
      "courses",
      [Query.equal('isActive', true), Query.orderAsc('courseCode')]
    );

    return res.status(200).json({ success: true, data: response.documents });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch courses' });
  }
}