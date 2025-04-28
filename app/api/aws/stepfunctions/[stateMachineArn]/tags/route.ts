import { NextRequest, NextResponse } from "next/server";
import {
  SFNClient,
  ListTagsForResourceCommand,
  TagResourceCommand,
  UntagResourceCommand,
} from "@aws-sdk/client-sfn";

export async function GET(
  request: NextRequest,
  { params }: { params: { stateMachineArn: string } }
) {
  try {
    const { stateMachineArn } = params;
    const region = stateMachineArn.split(':')[3];
    const client = new SFNClient({ region });

    const command = new ListTagsForResourceCommand({
      resourceArn: decodeURIComponent(stateMachineArn),
    });

    const response = await client.send(command);
    return NextResponse.json({ tags: response.tags || [] });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to fetch tags" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { stateMachineArn: string } }
) {
  try {
    const { stateMachineArn } = params;
    const { tags } = await request.json();
    const region = stateMachineArn.split(':')[3];
    const client = new SFNClient({ region });
    const decodedArn = decodeURIComponent(stateMachineArn);

    // First, get existing tags
    const listCommand = new ListTagsForResourceCommand({
      resourceArn: decodedArn,
    });
    const existingTags = (await client.send(listCommand)).tags || [];

    // Remove all existing tags
    if (existingTags.length > 0) {
      const untagCommand = new UntagResourceCommand({
        resourceArn: decodedArn,
        tagKeys: existingTags.map(tag => tag.key),
      });
      await client.send(untagCommand);
    }

    // Add new tags
    if (tags.length > 0) {
      const tagCommand = new TagResourceCommand({
        resourceArn: decodedArn,
        tags: tags,
      });
      await client.send(tagCommand);
    }

    return NextResponse.json({ message: "Tags updated successfully" });
  } catch (error) {
    console.error("Error updating tags:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to update tags" },
      { status: 500 }
    );
  }
} 