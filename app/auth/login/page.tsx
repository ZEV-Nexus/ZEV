import Login from "@/feature/auth/login";
import { Suspense } from "react";
export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense>
      <Login searchParams={searchParams} />
    </Suspense>
  );
}
