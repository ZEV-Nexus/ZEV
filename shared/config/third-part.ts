export interface ThirdPartyProvider {
  id: string;
  label: string;
  provider: string;
  service: string;
  authType: "oauth" | "api_key" | "webhook";
  image: string;
  scope?: string[];
}
export const THIRD_PARTY_PROVIDERS: ThirdPartyProvider[] = [
  {
    id: "google_calendar",
    label: "Google Calendar",
    provider: "google",
    service: "calendar",
    authType: "oauth",
    image: "/provider/google-calendar-icon.svg",
    scope: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.app.created",
      "https://www.googleapis.com/auth/calendar.events",
    ],
  },
  {
    id: "github",
    label: "Github",
    provider: "github",
    service: "repo",
    authType: "oauth",
    image: "/provider/github-icon.svg",
  },
  {
    id: "google_gmail",
    label: "Google Gmail",
    provider: "google",
    service: "gmail",
    authType: "oauth",
    image: "/provider/google-gmail-icon.svg",
    scope: [
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.readonly",
    ],
  },
  {
    id: "google_meet",
    label: "Google Meet",
    provider: "google",
    service: "meet",
    authType: "oauth",
    image: "/provider/google-meet-icon.svg",
    scope: [
      "https://www.googleapis.com/auth/meetings.space.readonly",
      "https://www.googleapis.com/auth/meetings.space.created",
    ],
  },
];
