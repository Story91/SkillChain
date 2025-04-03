import type { FrameNotificationDetails } from "@farcaster/frame-sdk";
import { redis } from "./redis";

const notificationServiceKey =
  process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME ?? "minikit";

function getUserNotificationDetailsKey(fid: number): string {
  return `${notificationServiceKey}:user:${fid}`;
}

export async function getUserNotificationDetails(
  fid: number,
): Promise<FrameNotificationDetails | null> {
  if (!redis) {
    return null;
  }

  try {
    const data = await redis.get(getUserNotificationDetailsKey(fid));
    if (!data) return null;
    
    return JSON.parse(data as string);
  } catch (error) {
    console.error("Error in getUserNotificationDetails:", error);
    return null;
  }
}

export async function setUserNotificationDetails(
  fid: number,
  notificationDetails: FrameNotificationDetails,
): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    await redis.set(
      getUserNotificationDetailsKey(fid), 
      JSON.stringify(notificationDetails)
    );
  } catch (error) {
    console.error("Error in setUserNotificationDetails:", error);
  }
}

export async function deleteUserNotificationDetails(
  fid: number,
): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    await redis.del(getUserNotificationDetailsKey(fid));
  } catch (error) {
    console.error("Error in deleteUserNotificationDetails:", error);
  }
}
