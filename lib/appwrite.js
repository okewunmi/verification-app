// lib/appwrite.js
import { Account,
  Avatars,
  Client,
  Databases,
  Functions,
  ID,
  Query,
  Storage,} from 'appwrite';

  export const config = {
  endpoint: "https://cloud.appwrite.io/v1",
  platform: "com.company.VoxifyApp",
  projectId: "6781ffea00354ecae5ca",
  databaseId: "678225de0029c6d82768",
 
};


const {
  endpoint,
  platform,
  projectId,
  databaseId,
  usersCollectionId,
  documentCollectionId,
  webCollectionId,
  storageId,
} = config;

const client = new Client();

client
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  

const account = new Account(client);
const storage = new Storage(client);
const avatars = new Avatars(client);
const databases = new Databases(client);
const functions = new Functions(client);


export const login = async (email, password) => {
  try {
    const session = await account.createEmailSession(email, password);
    return { success: true, user: session };
  } catch (error) {
    throw new Error(error.message || 'Login failed');
  }
};