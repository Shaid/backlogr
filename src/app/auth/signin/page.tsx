"use client";

import { LogIn, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const providers = [
  {
    id: "github",
    label: "Continue with GitHub",
    icon: ShieldCheck,
  },
  {
    id: "google",
    label: "Continue with Google",
    icon: LogIn,
  },
];

export default function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl">Sign in to Backlogr</CardTitle>
          <CardDescription>
            Use your GitHub or Google account to access your catalog.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {providers.map((provider) => {
            const Icon = provider.icon;
            return (
              <Button
                key={provider.id}
                type="button"
                variant="outline"
                className="w-full justify-center gap-2"
                onClick={() => signIn(provider.id, { redirectTo: callbackUrl })}
              >
                <Icon className="size-4" />
                {provider.label}
              </Button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
