"use client";

import { useEffect } from "react";
import { blogCardElementId } from "@/types/blog";

/** 共有 URL から開いたとき、強調したカードを画面中央までスクロールする */
export function ScrollToBlogCard({ blogId }: { blogId: string }) {
  useEffect(() => {
    document
      .getElementById(blogCardElementId(blogId))
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [blogId]);

  return null;
}
