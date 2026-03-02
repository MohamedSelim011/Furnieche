"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { toast.error("Enter your email address"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="7" width="20" height="14" rx="2" className="fill-brand-600" />
            <rect x="6" y="3" width="12" height="6" rx="1" className="fill-brand-400" />
            <rect x="9" y="11" width="6" height="4" rx="1" fill="white" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Furniche</h1>
        <p className="text-sm text-gray-500 mt-1">Engineer Project Documentation</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-md p-6">
        {sent ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="text-brand-600" size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Check your inbox</h2>
            <p className="text-sm text-gray-500 mb-6">
              We sent a password reset link to <strong>{email}</strong>. Check your spam folder if you don&apos;t see it.
            </p>
            <Link href="/login">
              <Button variant="outline" fullWidth>
                <ArrowLeft size={16} /> Back to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <Link href="/login" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-5">
              <ArrowLeft size={14} /> Back to Sign In
            </Link>

            <h2 className="text-xl font-bold text-gray-900 mb-1">Reset Password</h2>
            <p className="text-sm text-gray-500 mb-6">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>

            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="engineer@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail size={16} />}
                  required
                />
              </div>

              <Button type="submit" fullWidth loading={loading} disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link →"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
