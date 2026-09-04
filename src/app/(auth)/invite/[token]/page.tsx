"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Building2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type InvitePreview = { email: string; companyName: string; companyLogoUrl: string | null };

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Invite not found");
        setInvite(data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Invite not found"))
      .finally(() => setLoading(false));

    supabase.auth.getUser().then(({ data }) => setSessionEmail(data.user?.email ?? null));
  }, [token, supabase]);

  async function handleAccept() {
    setAccepting(true);
    try {
      const res = await fetch(`/api/invites/${token}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to accept invite");
      toast.success("You're in! Welcome to the team.");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept invite");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-md p-6 text-center">
        {loading ? (
          <Loader2 size={28} className="text-brand-600 animate-spin mx-auto my-8" />
        ) : error ? (
          <>
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="text-red-500" size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invite unavailable</h2>
            <p className="text-sm text-gray-500 mb-6">{error}</p>
            <Button variant="outline" fullWidth onClick={() => router.push("/login")}>
              Back to Sign In
            </Button>
          </>
        ) : invite ? (
          <>
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
              {invite.companyLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={invite.companyLogoUrl} alt={invite.companyName} className="w-full h-full object-contain" />
              ) : (
                <Building2 className="text-brand-600" size={24} />
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Join {invite.companyName}</h2>
            <p className="text-sm text-gray-500 mb-6">
              You've been invited to join <strong>{invite.companyName}</strong>&apos;s team on Furniche as{" "}
              <strong>{invite.email}</strong>.
            </p>

            {sessionEmail && sessionEmail.toLowerCase() === invite.email.toLowerCase() ? (
              <Button fullWidth onClick={handleAccept} disabled={accepting}>
                {accepting ? (
                  <><Loader2 size={16} className="animate-spin" /> Joining...</>
                ) : (
                  <><CheckCircle2 size={16} /> Accept Invite</>
                )}
              </Button>
            ) : sessionEmail ? (
              <div className="space-y-3">
                <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
                  You're signed in as {sessionEmail}. Log out and sign in with {invite.email} to accept.
                </p>
                <Button variant="outline" fullWidth onClick={() => router.push("/login")}>
                  Switch Account
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Button asChild fullWidth>
                  <Link href={`/register?email=${encodeURIComponent(invite.email)}`}>Create Account</Link>
                </Button>
                <Button variant="outline" fullWidth asChild>
                  <Link href="/login">I already have an account</Link>
                </Button>
                <p className="text-xs text-gray-400">
                  Come back to this link after signing in to finish joining.
                </p>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
