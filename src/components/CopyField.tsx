"use client";

import { useState } from "react";

export function CopyField({ label, value, id }: { label: string; value: string; id: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.getElementById(id) as HTMLInputElement | null;
      el?.select();
      document.execCommand?.("copy");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-bold">
        {label}
      </label>
      <div className="flex gap-2">
        <input id={id} readOnly value={value} className="field min-w-0 flex-1 font-mono text-sm" onFocus={(e) => e.target.select()} />
        <button type="button" onClick={copy} className="btn-ghost shrink-0" aria-live="polite">
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
