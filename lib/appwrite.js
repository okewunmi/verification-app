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
  endpoint: "https://nyc.cloud.appwrite.io/v1",
  platform: "com.company.5-fingerprint",
  projectId: "68e83bca0016577d1322",
  databaseId: "68e84359003dccd0b700",
  usersCollectionId: "user",

 
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
    const session = await account.createEmailPasswordSession(email, password);
    return { success: true, user: session };
  } catch (error) {
    throw new Error(error.message || 'Login failed');
  }
};

export const logOut = async (params) => {

  try {
    await account.deleteSession('current')
  } catch (error) {
    throw new Error(error.message); 
  }
}