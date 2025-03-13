"use client";
import ArweaveProvider from "@/contexts/arweaveContext";
import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { useRouter } from "next/navigation";

export default function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <HeroUIProvider navigate={router.push}>
      <ToastProvider />
      <ArweaveProvider>
        {children}
      </ArweaveProvider>
    </HeroUIProvider>
  )
}