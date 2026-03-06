import { oauthClient } from "./google-auth";
import { google, meet_v2 } from "googleapis";

export async function googleMeet(refreshToken: string) {
  oauthClient.setCredentials({ refresh_token: refreshToken });
  const meet = google.meet({ version: "v2", auth: oauthClient });
  return meet;
}

export async function createMeetSpace(
  meet: meet_v2.Meet,
  config?: {
    accessType?: "OPEN" | "TRUSTED";
    entryPointAccess?: "ALL" | "CREATOR_APP_ONLY";
  },
) {
  const response = await meet.spaces.create({
    requestBody: {
      config: {
        accessType: config?.accessType ?? "OPEN",
        entryPointAccess: config?.entryPointAccess ?? "ALL",
      },
    },
  });
  return response.data;
}

export async function getMeetSpace(meet: meet_v2.Meet, spaceName: string) {
  const response = await meet.spaces.get({ name: spaceName });
  return response.data;
}

export async function listConferenceRecords(meet: meet_v2.Meet, pageSize = 10) {
  const response = await meet.conferenceRecords.list({
    pageSize,
  });
  return response.data.conferenceRecords || [];
}
