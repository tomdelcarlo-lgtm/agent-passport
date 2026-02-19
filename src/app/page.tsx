import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Agent Passport</h1>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="container mx-auto px-4 py-20 text-center max-w-3xl">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            Identity for AI Agents
          </div>
          <h2 className="text-5xl font-bold tracking-tight mb-6">
            Give your AI agents a trusted identity
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Create passports for your AI agents. Control their permissions. Let services verify them
            with a single API call.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg">Create your first passport</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Sign in
              </Button>
            </Link>
          </div>

          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="p-6 rounded-lg border bg-card">
              <div className="text-2xl mb-3">&#128274;</div>
              <h3 className="font-semibold mb-2">Secure by Design</h3>
              <p className="text-sm text-muted-foreground">
                API keys are hashed with bcrypt. Sessions encrypted with iron-session. Your agents&apos; credentials are never stored in plain text.
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <div className="text-2xl mb-3">&#9989;</div>
              <h3 className="font-semibold mb-2">Granular Permissions</h3>
              <p className="text-sm text-muted-foreground">
                Define exactly what each agent can do. Scopes like email:read, social:post, payment:create - you decide.
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <div className="text-2xl mb-3">&#128640;</div>
              <h3 className="font-semibold mb-2">Simple Verification</h3>
              <p className="text-sm text-muted-foreground">
                Services verify agents with one GET request. Unknown scopes trigger approval requests - you stay in control.
              </p>
            </div>
          </div>

          <div className="mt-16 p-6 rounded-lg border bg-muted/50 text-left">
            <p className="text-sm font-mono text-muted-foreground mb-2">Verify an agent:</p>
            <code className="text-sm font-mono">
              GET /api/verify?key=ap_XXXXXXXX...&amp;scope=email:read
            </code>
          </div>
        </div>
      </main>
    </div>
  );
}
