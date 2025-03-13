"use client";

import LitProtocol from "@/components/lit-protocol";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { useEffect, useRef, useState } from "react";

export default function Web3Page() {
  const initialized = useRef(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [client, setClient] = useState<LitNodeClient | null>(null);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setConnecting(true);
      setClient(() => {
        const newClient = new LitNodeClient({
          litNetwork: "datil-dev"
        })
        newClient.connect().then(() => {
          setConnected(true);
          setConnecting(false);
        });
        return newClient;
      });
    }
  }, []);

  return (
    <div>
      {
        initialized.current ? (
          connected ? (
            <span className="text-green-500">Connected</span>
          ) : connecting ?(
            <span className="text-yellow-500">Connecting...</span>
          ) : (
            <span className="text-red-500">Not Connected</span>
          )
        ) : (
          <span className="text-blue-500">Initializing...</span>
        )
      }
      {
        client && <LitProtocol client={client} />
      }
    </div>
  )
}