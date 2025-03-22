import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

const accountName = process.env.STORAGE_ACCOUNT_NAME || "";
const blobEndpoint = `https://${accountName}.blob.core.windows.net`;

// Initialize the Blob Service Client with DefaultAzureCredential
const credential = new DefaultAzureCredential();
const blobServiceClient = new BlobServiceClient(blobEndpoint, credential);

// Get the container client with the correct name 'avatars'
const containerClient = blobServiceClient.getContainerClient("avatars");

// Upload a file to blob storage
export async function uploadAvatar(
  userId: string,
  file: Buffer,
  contentType: string
): Promise<string | null> {
  try {
    // Create a unique blob name
    const blobName = `${userId}-${Date.now()}.${contentType.split("/")[1]}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload the file
    await blockBlobClient.upload(file, file.length, {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
    });

    // Return the URL of the uploaded blob
    return blockBlobClient.url;
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return null;
  }
}

// Delete a blob from storage
export async function deleteAvatar(blobUrl: string): Promise<boolean> {
  try {
    // Extract blob name from URL
    const blobName = blobUrl.split("/").pop();
    if (!blobName) return false;

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.delete();
    return true;
  } catch (error) {
    console.error("Error deleting avatar:", error);
    return false;
  }
} 