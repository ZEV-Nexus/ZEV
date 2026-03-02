import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/shared/shadcn/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/shared/shadcn/components/ui/empty";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Empty>
        <EmptyHeader>
          <EmptyMedia>
            <FileQuestion className="size-20 text-muted-foreground" />
          </EmptyMedia>
          <EmptyTitle className="text-4xl font-bold">404</EmptyTitle>
          <EmptyDescription className="text-base">
            找不到您請求的頁面，它可能已被移動或刪除。
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/">返回首頁</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
