export enum LoginMethod {
  GOOGLE = "google",
  GITHUB = "github",
  CREDENTIALS = "credentials",
}

export interface RegisterPayload {
  email: string;
  password: string;
  nickname: string;
  confirmPassword: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
