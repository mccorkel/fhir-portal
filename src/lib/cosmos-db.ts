import { CosmosClient } from "@azure/cosmos";

// Initialize the Cosmos client
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT || "",
  key: process.env.COSMOS_KEY || "",
});

// Get the database and container
const database = client.database(process.env.COSMOS_DATABASE || "");
const container = database.container(process.env.COSMOS_CONTAINER || "");

// Define the User type
export interface User {
  id: string;
  username: string;
  avatarUri?: string;
}

// Get a user by ID
export async function getUser(userId: string): Promise<User | null> {
  try {
    const { resource } = await container.item(userId, userId).read();
    return resource as User;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
}

// Create or update a user
export async function upsertUser(user: User): Promise<User> {
  try {
    const { resource } = await container.items.upsert(user);
    // First cast to unknown, then to User to safely handle the type conversion
    return resource as unknown as User;
  } catch (error) {
    console.error("Error upserting user:", error);
    throw error;
  }
}

// Update user's avatar URI
export async function updateUserAvatar(userId: string, avatarUri: string): Promise<User | null> {
  try {
    const user = await getUser(userId);
    if (!user) return null;

    user.avatarUri = avatarUri;
    return await upsertUser(user);
  } catch (error) {
    console.error("Error updating user avatar:", error);
    return null;
  }
} 