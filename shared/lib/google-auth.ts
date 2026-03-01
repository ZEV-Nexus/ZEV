import { google } from "googleapis";
export const oauthClient = new google.auth.OAuth2({
  clientId: process.env.AUTH_GOOGLE_ID,
  clientSecret: process.env.AUTH_GOOGLE_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
});
