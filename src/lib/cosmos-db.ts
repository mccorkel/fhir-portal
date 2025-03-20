import { CosmosClient } from "@azure/cosmos";

// Initialize the Cosmos client
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT || "",
  key: process.env.COSMOS_KEY || "",
});

// Get the database and container
const database = client.database(process.env.COSMOS_DATABASE || "");
const container = database.container(process.env.COSMOS_CONTAINER || "");

// Define the FastenConnection type
export interface FastenConnection {
  orgConnectionId: string;
  platformType: string;
  portalId: string;
  createdAt: string;
  status: 'connected' | 'disconnected' | 'error';
  lastExport?: {
    taskId: string;
    status: 'pending' | 'completed' | 'error';
    downloadUrl?: string;
    exportedAt: string;
  };
}

// Define the User type
export interface User {
  id: string;
  username: string;
  avatarUri?: string;
  fastenConnections?: FastenConnection[];
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

// Add a Fasten connection to a user
export async function addFastenConnection(
  userId: string,
  connection: Omit<FastenConnection, 'createdAt' | 'status'>
): Promise<User | null> {
  try {
    const user = await getUser(userId);
    if (!user) return null;

    const fastenConnections = user.fastenConnections || [];
    fastenConnections.push({
      ...connection,
      createdAt: new Date().toISOString(),
      status: 'connected'
    });

    return await upsertUser({
      ...user,
      fastenConnections
    });
  } catch (error) {
    console.error("Error adding Fasten connection:", error);
    return null;
  }
}

// Update a Fasten connection's status
export async function updateFastenConnectionStatus(
  userId: string,
  orgConnectionId: string,
  status: FastenConnection['status']
): Promise<User | null> {
  try {
    const user = await getUser(userId);
    if (!user) return null;

    const fastenConnections = user.fastenConnections || [];
    const connectionIndex = fastenConnections.findIndex(
      conn => conn.orgConnectionId === orgConnectionId
    );

    if (connectionIndex === -1) return null;

    fastenConnections[connectionIndex].status = status;
    return await upsertUser({
      ...user,
      fastenConnections
    });
  } catch (error) {
    console.error("Error updating Fasten connection status:", error);
    return null;
  }
}

// Update a Fasten connection's export status
export async function updateFastenConnectionExport(
  userId: string,
  orgConnectionId: string,
  exportInfo: NonNullable<FastenConnection['lastExport']>
): Promise<User | null> {
  try {
    const user = await getUser(userId);
    if (!user) return null;

    const fastenConnections = user.fastenConnections || [];
    const connectionIndex = fastenConnections.findIndex(
      conn => conn.orgConnectionId === orgConnectionId
    );

    if (connectionIndex === -1) return null;

    fastenConnections[connectionIndex].lastExport = exportInfo;
    return await upsertUser({
      ...user,
      fastenConnections
    });
  } catch (error) {
    console.error("Error updating Fasten connection export:", error);
    return null;
  }
}

// Get all Fasten connections for a user
export async function getFastenConnections(
  userId: string
): Promise<FastenConnection[] | null> {
  try {
    const user = await getUser(userId);
    if (!user) return null;
    return user.fastenConnections || [];
  } catch (error) {
    console.error("Error getting Fasten connections:", error);
    return null;
  }
}

// Get a specific Fasten connection by orgConnectionId
export async function getFastenConnection(
  userId: string,
  orgConnectionId: string
): Promise<FastenConnection | null> {
  try {
    const user = await getUser(userId);
    if (!user) return null;

    const connection = user.fastenConnections?.find(
      conn => conn.orgConnectionId === orgConnectionId
    );
    return connection || null;
  } catch (error) {
    console.error("Error getting Fasten connection:", error);
    return null;
  }
} 