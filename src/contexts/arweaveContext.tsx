"use client";
import { addToast } from "@heroui/react";
import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const ArweaveContext = createContext<{
  privateKey: JWKInterface | null;
  walletAddress: string | null;
  balance: string;
  generateKey: () => Promise<void>;
  uploadFile: (data: ArrayBuffer) => Promise<string | undefined>;
  fetchFile: (transactionId: string) => Promise<ArrayBuffer>;
}>({
  privateKey: null,
  walletAddress: null,
  balance: "",
  generateKey: async () => { },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  uploadFile: async (data: ArrayBuffer) => { throw new Error("uploadFile not implemented"); },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fetchFile: async (transactionId: string) => { throw new Error("fetchFile not implemented"); },
});

export default function ArweaveProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => Arweave.init({
    host: '127.0.0.1',
    port: 1984,
    protocol: 'http',
  }));

  const [privateKey, setPrivateKey] = useState<JWKInterface | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState("");

  const generateKey = useCallback(async () => {
    const generatedKey = await client.wallets.generate();
    console.log("Generated Key:", generatedKey);
    setPrivateKey(generatedKey);
    localStorage.setItem("arweaveKey", JSON.stringify(generatedKey));
  }, [client]);

  useEffect(() => {
    const storedKey = localStorage.getItem("arweaveKey");
    console.log("Stored Key:", storedKey);
    if (storedKey) {
      setPrivateKey(JSON.parse(storedKey));
    } else {
      generateKey();
    }
  }, [generateKey]);

  useEffect(() => {
    if (privateKey) {
      client.wallets.jwkToAddress(privateKey).then((address) => {
        setWalletAddress(address);
        console.log("Wallet Address:", address);
      });
    }
  }, [privateKey, client]);

  const updateBalance = useCallback(() => {
    client.wallets.getBalance(walletAddress ?? "").then((balance) => {
      console.log("Wallet Balance:", client.ar.winstonToAr(balance), "AR");
      setBalance(balance);
    });
  }, [client, walletAddress]);

  const uploadFile = useCallback(async (data: ArrayBuffer) => {
    try {
      console.log("Uploading file to Arweave...", data);
      if (!privateKey) {
        console.error("Private key not available");
        throw new Error("Private key not available");
      }
      const transation = await client.createTransaction({ data: data }, privateKey);
      await client.transactions.sign(transation, privateKey);
      const res = await client.transactions.post(transation);
      console.log("Transaction:", transation);
      console.log("Response:", res);
      if (res.status === 200) {
        addToast({
          title: "Success",
          description: `File uploaded successfully! Transaction ID: ${transation.id}`,
          color: "success",
        })
        updateBalance();
        return transation.id;
      } else {
        console.error("Transaction failed:", res.statusText);
        throw new Error("Transaction failed");
      }
    } catch (error) {
      addToast({
        title: "Error",
        description: `Error uploading file to Arweave: ${error}`,
      })
      console.log(error);
    }
  }, [client, privateKey, updateBalance]);

  const fetchFile = useCallback(async (transactionId: string) => {
    try {
      const data = await client.transactions.getData(transactionId, { decode: true, string: false });
      console.log("Fetched file data:", data);
      if (data instanceof Uint8Array) {
        return data.buffer as ArrayBuffer;
      };
      const encoder = new TextEncoder()
      return encoder.encode(data).buffer as ArrayBuffer;
    } catch (error) {
      console.error("Error fetching file:", error);
      throw error;
    }
  }, [client]);

  useEffect(() => {
    if (walletAddress) {
      updateBalance();
    }
  }, [updateBalance, walletAddress]);

  return (
    <ArweaveContext.Provider value={{
      privateKey,
      walletAddress,
      balance,
      fetchFile,
      uploadFile,
      generateKey
    }}>
      {children}
    </ArweaveContext.Provider>
  );
}

export function useArweave() {
  return useContext(ArweaveContext);
}