"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileCode2, ShieldCheck, UploadCloud } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Badge, Button, Card } from "@/components/ui";
import { uploadTerraform } from "@/lib/api";

export default function NewScanPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!file) return;
    if (!file.name.endsWith(".tf")) {
      setError("Please choose a Terraform file ending in .tf");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await uploadTerraform(file);
      router.push(`/scan/${result.scan_id}/agents`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="rounded-xl border border-white/80 bg-slate-950 p-7 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
          <div className="mb-5 grid h-12 w-12 place-items-center rounded-lg bg-teal-400/15">
            <ShieldCheck className="h-6 w-6 text-teal-300" />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">New Terraform scan</h1>
          <p className="mt-3 text-slate-300">Drop in one AWS Terraform file. The scanner will parse HCL, run policy checks, build an attack graph, and prepare paid AI agents.</p>
          <div className="mt-8 space-y-3 text-sm text-slate-300">
            <div className="flex items-center gap-3"><FileCode2 className="h-4 w-4 text-teal-300" /> Terraform `.tf` only</div>
            <div className="flex items-center gap-3"><UploadCloud className="h-4 w-4 text-teal-300" /> Static analysis before payment</div>
          </div>
        </div>
        <Card
          className="flex min-h-[420px] flex-col items-center justify-center border-2 border-dashed border-teal-200 bg-white/85 text-center transition hover:border-teal-400 hover:bg-white"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            setFile(event.dataTransfer.files?.[0] || null);
          }}
        >
          <div className="mb-5 grid h-20 w-20 place-items-center rounded-lg bg-teal-50">
            <UploadCloud className="h-10 w-10 text-teal-700" />
          </div>
          <input
            id="tf-upload"
            className="block w-full max-w-sm cursor-pointer rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-teal-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-teal-800"
            type="file"
            accept=".tf,.hcl"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
          <label htmlFor="tf-upload" className="mt-3 cursor-pointer text-sm font-semibold text-teal-700">Browse from your computer</label>
          <p className="mt-2 text-sm text-slate-600">{file ? file.name : "or drag it into this secure upload zone"}</p>
          {file ? <Badge className="mt-4 bg-slate-100 text-slate-700">{Math.max(1, Math.round(file.size / 1024))} KB ready</Badge> : null}
          <Button className="mt-7 min-w-44" disabled={!file || loading} onClick={submit}>{loading ? "Scanning..." : "Upload and scan"}</Button>
          {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
        </Card>
      </div>
    </Shell>
  );
}
