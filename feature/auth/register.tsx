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

import { Input } from "@/shared/shadcn/components/ui/input";
import { Label } from "@/shared/shadcn/components/ui/label";
import {
  RiArrowDropRightLine,
  RiLoader2Fill,
  RiEyeLine,
  RiEyeOffLine,
} from "@remixicon/react";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import useRegister from "./hooks/ussRegister";

import AuthGlobe from "./components/auth-globe";
import { useTranslations } from "next-intl";
import LogoImage from "@/shared/components/logo-image";
export default function Register() {
  const { mutate, isPending, error, registerData, setRegisterData } =
    useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const t = useTranslations("auth");
  return (
    <div className="flex justify-center items-center  md:flex-row  flex-col h-dvh  ">
      <AuthGlobe title={t("firstTime")} />
      <Card className="flex-1 w-full h-full rounded-none bg-background/50 backdrop-blur-xs ">
        <CardHeader className="flex flex-row  items-center  gap-4 ">
          <LogoImage withText={true} size="lg" />
        </CardHeader>
        <CardContent className="flex flex-col max-w-lg mx-auto w-full items-center justify-center flex-1 space-y-3">
          <CardTitle className="text-center text-3xl ">
            {t("firstTime")}
          </CardTitle>
          <CardDescription className="text-base">
            {t("joinZev")}
          </CardDescription>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutate(registerData);
            }}
            className=" space-y-2 w-10/12 flex flex-col items-center justify-center"
          >
            <div className="grid gap-2 w-10/12">
              <Label htmlFor="nickname">{t("nickname")}</Label>
              <Input
                id="nickname"
                placeholder={t("nicknamePlaceholder")}
                type="text"
                value={registerData.nickname}
                onChange={(e) =>
                  setRegisterData((prev) => ({
                    ...prev,
                    nickname: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2 w-10/12">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                placeholder={t("emailPlaceholder")}
                type="email"
                value={registerData.email}
                onChange={(e) =>
                  setRegisterData((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2 w-10/12">
              <Label htmlFor="password">{t("password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  placeholder={t("setPassword")}
                  type={showPassword ? "text" : "password"}
                  value={registerData.password}
                  onChange={(e) =>
                    setRegisterData((prev) => ({
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
            <div className="grid gap-2 w-10/12">
              <Label htmlFor="confirm_password">{t("confirmPassword")}</Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  placeholder={t("confirmPasswordPlaceholder")}
                  type={showConfirmPassword ? "text" : "password"}
                  value={registerData.confirmPassword}
                  onChange={(e) =>
                    setRegisterData((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <RiEyeOffLine size={18} />
                  ) : (
                    <RiEyeLine size={18} />
                  )}
                </button>
              </div>
            </div>
            <p className="text-xs text-destructive">{error?.message}</p>
            <Button
              type="submit"
              disabled={isPending}
              className="w-10/12  h-10"
            >
              {t("register")}
              {isPending && (
                <RiLoader2Fill size={24} className="animate-spin" />
              )}
            </Button>
          </form>

          <CardAction className="w-full flex flex-col space-y-2 items-center justify-center">
            <Link href="/auth/login">
              <Button variant={"link"} className="  h-10">
                {t("goToLogin")} <RiArrowDropRightLine size={24} />
              </Button>
            </Link>
          </CardAction>
        </CardContent>
      </Card>
    </div>
  );
}
