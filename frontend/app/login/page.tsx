"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error ? error.message : "Signed in. You can continue to the dashboard.");
  }

  async function magicLink() {
    const { error } = await supabase.auth.signInWithOtp({ email });
    setMessage(error ? error.message : "Magic link sent.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-teal-700" />
          <div>
            <h1 className="text-2xl font-semibold">SecAgent Hub</h1>
            <p className="text-sm text-slate-600">Sign in to manage Terraform security scans.</p>
          </div>
        </div>
        <div className="space-y-3">
          <Input placeholder="email@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Input type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <Button className="w-full" onClick={signIn}>Sign in</Button>
          <Button className="w-full bg-slate-700 hover:bg-slate-800" onClick={magicLink}>Send magic link</Button>
          {message ? <p className="text-sm text-slate-600">{message}</p> : null}
        </div>
      </Card>
    </main>
  );
}
