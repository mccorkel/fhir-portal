import { NextRequest, NextResponse } from "next/server";
import { uploadAvatar, deleteAvatar } from "@/lib/blob-storage";
import { updateUserAvatar, getUser } from "@/lib/cosmos-db";

// POST /api/users/[userId]/avatar
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to blob storage
    const blobUrl = await uploadAvatar(
      params.userId,
      buffer,
      file.type
    );

    if (!blobUrl) {
      return NextResponse.json(
        { error: "Failed to upload avatar" },
        { status: 500 }
      );
    }

    // Update user's avatar URI in Cosmos DB
    const updatedUser = await updateUserAvatar(params.userId, blobUrl);
    if (!updatedUser) {
      // If user update fails, delete the uploaded blob
      await deleteAvatar(blobUrl);
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error in POST /api/users/[userId]/avatar:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[userId]/avatar
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await getUser(params.userId);
    if (!user || !user.avatarUri) {
      return NextResponse.json(
        { error: "User or avatar not found" },
        { status: 404 }
      );
    }

    // Delete from blob storage
    const deleted = await deleteAvatar(user.avatarUri);
    if (!deleted) {
      return NextResponse.json(
        { error: "Failed to delete avatar" },
        { status: 500 }
      );
    }

    // Update user to remove avatar URI
    const updatedUser = await updateUserAvatar(params.userId, "");
    if (!updatedUser) {
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error in DELETE /api/users/[userId]/avatar:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 