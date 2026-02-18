import { useMutation } from "@tanstack/react-query";
import { LoginMethod, LoginPayload } from "../types";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function useLogin() {
  const [loginData, setLoginData] = useState<LoginPayload>({
    email: "",
    password: "",
  });
  const [loadingMethod, setLoadingMethod] = useState<LoginMethod | null>(null);
  const { isPending, error, mutate } = useMutation({
    mutationFn: async (data: { method: LoginMethod }) => {
      setLoadingMethod(data.method);
      if (data.method === LoginMethod.CREDENTIALS) {
        const response = await signIn(data.method, {
          email: loginData.email,
          password: loginData.password,
          callbackUrl: "/c",
        });
        return response;
      } else {
        const response = await signIn(data.method, { callbackUrl: "/c" });
        return response;
      }
    },
  });
  return { isPending, error, mutate, setLoginData, loginData, loadingMethod };
}
