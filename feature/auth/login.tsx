"use client";
import { Button } from "@/shared/shadcn/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/shadcn/components/ui/card";
import {
  RiArrowDropLeftLine,
  RiLoader2Line,
  RiEyeLine,
  RiEyeOffLine,
} from "@remixicon/react";
import { SiGithub, SiGoogle } from "@icons-pack/react-simple-icons";
import Image from "next/image";
import Link from "next/link";
import { Label } from "@/shared/shadcn/components/ui/label";
import { Input } from "@/shared/shadcn/components/ui/input";

import { LoginMethod } from "./types";
import AuthGlobe from "./components/auth-globe";

import useLogin from "./hooks/useLogin";
import { use, useState } from "react";
import { Suspense } from "react";

export default function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { mutate, isPending, setLoginData, loginData, loadingMethod } =
    useLogin();
  const params = use(searchParams);
  const [showPassword, setShowPassword] = useState(false);
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className=" flex justify-center items-center  md:flex-row  flex-col h-dvh    ">
        <Card className="flex-1 w-full h-full rounded-none bg-background/50 backdrop-blur-xs">
          <CardHeader className="flex flex-row  items-center  gap-4 ">
            <Image
              src="/icons/logo-with-text-light-removebg.png"
              alt="Chat.to Logo"
              width={100}
              height={32}
              className=" aspect-video   object-cover rounded-md"
            />
          </CardHeader>
          <CardContent className="flex flex-col max-w-lg mx-auto w-full items-center justify-center flex-1 space-y-3">
            <CardTitle className="text-center text-3xl ">歡迎</CardTitle>
            <CardDescription className="text-base">
              登入來使用 ZEV
            </CardDescription>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutate({
                  method: LoginMethod.CREDENTIALS,
                });
              }}
              className="  w-10/12 flex flex-col items-center justify-center space-y-3"
            >
              <div className="grid gap-2 w-10/12">
                <Label htmlFor="credentials-email">電子郵件</Label>
                <Input
                  value={loginData.email}
                  onChange={(e) =>
                    setLoginData((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  id="credentials-email"
                  placeholder="輸入您的電子郵件"
                  type="email"
                />
              </div>
              <div className="grid gap-2 w-10/12">
                <Label htmlFor="credentials-password">密碼</Label>
                <div className="relative">
                  <Input
                    id="credentials-password"
                    placeholder="輸入您的密碼"
                    type={showPassword ? "text" : "password"}
                    value={loginData.password}
                    onChange={(e) =>
                      setLoginData((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <RiEyeOffLine size={18} />
                    ) : (
                      <RiEyeLine size={18} />
                    )}
                  </button>
                </div>
              </div>
              {params.error && (
                <p className="text-destructive text-xs">
                  Invalid email or password
                </p>
              )}
              <Button
                disabled={
                  loadingMethod === LoginMethod.CREDENTIALS && isPending
                }
                className="w-10/12  h-10"
                type="submit"
              >
                登入
                {loadingMethod === LoginMethod.CREDENTIALS && isPending && (
                  <RiLoader2Line size={24} className=" animate-spin" />
                )}
              </Button>
            </form>

            <CardAction className="w-10/12 mx-auto flex  gap-2 items-center justify-center lg:flex-row flex-col">
              <Button
                onClick={() => mutate({ method: LoginMethod.GOOGLE })}
                disabled={loadingMethod === LoginMethod.GOOGLE && isPending}
                className="  h-10  max-lg:w-10/12"
              >
                {loadingMethod === LoginMethod.GOOGLE && isPending ? (
                  <RiLoader2Line size={24} className=" animate-spin" />
                ) : (
                  <SiGoogle size={24} />
                )}
                以 Google 帳號繼續
              </Button>
              <Button
                onClick={() => mutate({ method: LoginMethod.GITHUB })}
                variant={"outline"}
                disabled={loadingMethod === LoginMethod.GITHUB && isPending}
                className="  h-10 max-lg:w-10/12"
              >
                {loadingMethod === LoginMethod.GITHUB && isPending ? (
                  <RiLoader2Line size={24} className=" animate-spin" />
                ) : (
                  <SiGithub size={24} />
                )}
                以 Github 帳號繼續
              </Button>
            </CardAction>
            <Link href="/auth/register">
              <Button variant={"link"} className="  h-10">
                <RiArrowDropLeftLine size={24} /> 回到註冊
              </Button>
            </Link>
          </CardContent>
        </Card>
        <AuthGlobe title="Welcome." />
      </div>
    </Suspense>
  );
}
