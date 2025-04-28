import { NextRequest, NextResponse } from "next/server";
import { DeleteStateMachineCommand, SFNClient } from "@aws-sdk/client-sfn";
import { getRegionFromArn } from "@/lib/utils/aws";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { stateMachineArn: string } }
) {
  try {
    const { stateMachineArn } = params;
    const region = getRegionFromArn(stateMachineArn);
    
    const client = new SFNClient({ region });
    const command = new DeleteStateMachineCommand({
      stateMachineArn: decodeURIComponent(stateMachineArn),
    });

    await client.send(command);

    return NextResponse.json({ message: "State machine deleted successfully" });
  } catch (error) {
    console.error("Error deleting state machine:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to delete state machine" },
      { status: 500 }
    );
  }
} 