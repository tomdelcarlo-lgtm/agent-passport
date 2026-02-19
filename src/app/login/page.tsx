"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Login is now wallet-based — redirect to home where users connect with MetaMask.
export default function LoginPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/"); }, [router]);
  return null;
}
