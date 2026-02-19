"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Registration is now wallet-based — redirect to home where users connect with MetaMask.
export default function RegisterPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/"); }, [router]);
  return null;
}
