import { oauthClient } from "./google-auth";
import { calendar_v3, google } from "googleapis";

export async function googleCalendar(accessToken: string) {
  oauthClient.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: "v3", auth: oauthClient });
  return calendar;
}
export async function createGoogleCalendarEvent(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  event: calendar_v3.Schema$Event,
) {
  const response = await calendar.events.insert({
    calendarId,
    requestBody: event,
  });
  return response.data;
}
