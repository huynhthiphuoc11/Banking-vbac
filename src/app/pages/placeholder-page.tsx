import React from "react";

import { SparkleShell } from "../components/layout/sparkle-shell";

export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <SparkleShell greeting={title}>
      <div className="rounded-2xl border border-[#EEF1F6] bg-white p-6">
        <div className="text-lg font-semibold text-[#1C2433]">{title}</div>
        <div className="mt-2 text-sm text-[#6B7383]">
          {description || "This page is a placeholder in the Sparkle dashboard template."}
        </div>
      </div>
    </SparkleShell>
  );
}


