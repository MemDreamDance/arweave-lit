"use client";
import { LitProtocolProvider } from "@/contexts/litProtocolContext";

export default function Web3Layout({ children }: { children: React.ReactNode }) {
  return (
    <LitProtocolProvider>
      {children}
    </LitProtocolProvider>
  );
}