import { useMutation } from "@tanstack/react-query";
import type { RegisterPayload } from "../types";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function useRegister() {
  const [registerData, setRegisterData] = useState<RegisterPayload>({
    nickname: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const { isPending, error, mutate } = useMutation({
    mutationFn: async (data: RegisterPayload) => {
      if (data.password !== data.confirmPassword) {
        throw new Error("Passwords do not match");
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result);
      }
      await signIn("credentials", {
        callbackUrl: "/c",
        email: data.email,
        password: data.password,
      });
      return result;
    },
  });
  return { isPending, error, mutate, setRegisterData, registerData };
}
