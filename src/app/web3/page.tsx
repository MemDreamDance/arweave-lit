"use client";
import LitProtocol from "@/components/lit-protocol";
import { useLitProtocol } from "@/contexts/litProtocolContext";

export default function Web3Page() {
  const { status } = useLitProtocol();
  return (
    <div>
      <span>
        Lit node status:
      </span>
      {
        status === "connected" ? (
          <span className="text-green-500">Connected</span>
        ) : status === "disconnected" ? (
          <span className="text-red-500">Disconnected</span>
        ) : (
          <span className="text-blue-500">Connecting...</span>
        )
      }
      <LitProtocol />
    </div>
  )
}