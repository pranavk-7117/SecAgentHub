"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Mail, Lock, UserPlus, LogIn, Chrome } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAuthAction(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setMessage("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setMessage("");

    try {
      if (activeTab === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage("Signed in successfully. Redirecting...");
        router.push("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Account created! You can now sign in.");
        setActiveTab("signin");
        setPassword("");
      }
    } catch (err: any) {
      setMessage(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/dashboard"
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setMessage(err.message || "Failed to initiate Google sign in.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
      {/* Decorative background gradients */}
      <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-teal-500/10 blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-[100px]" />

      <Card className="w-full max-w-md border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl animate-fadeIn relative z-10">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white shadow-lg shadow-teal-500/20">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">SecAgent Hub</h1>
            <p className="text-sm text-slate-400">AI-powered security scanning marketplace</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="mb-6 flex gap-1 rounded-lg bg-slate-950 p-1">
          <button
            type="button"
            onClick={() => { setActiveTab("signin"); setMessage(""); }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${activeTab === "signin" ? "bg-slate-800 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("signup"); setMessage(""); }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${activeTab === "signup" ? "bg-slate-800 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleAuthAction} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-500" />
            <Input
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-teal-500 focus:ring-teal-500/20"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-500" />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-teal-500 focus:ring-teal-500/20"
              required
            />
          </div>

          <Button type="submit" className="w-full bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white font-medium shadow-lg shadow-teal-600/15" disabled={loading}>
            {loading ? "Processing..." : activeTab === "signin" ? (
              <span className="flex items-center justify-center gap-2"><LogIn className="h-4.5 w-4.5" /> Sign In</span>
            ) : (
              <span className="flex items-center justify-center gap-2"><UserPlus className="h-4.5 w-4.5" /> Sign Up</span>
            )}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900 px-3 text-slate-500">Or continue with</span></div>
        </div>

        <Button
          onClick={handleGoogleSignIn}
          type="button"
          className="w-full border border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-900 hover:text-white flex items-center justify-center gap-2 transition"
          disabled={loading}
        >
          <Chrome className="h-4.5 w-4.5" />
          Google Account
        </Button>

        {message ? (
          <div className={`mt-5 rounded-md p-3 text-sm text-center ${message.toLowerCase().includes("success") || message.toLowerCase().includes("created") ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {message}
          </div>
        ) : null}
      </Card>
    </main>
  );
}

