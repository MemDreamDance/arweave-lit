import { useArweave } from "@/contexts/arweaveContext";
import { useLitProtocol } from "@/contexts/litProtocolContext";
import { Accordion, AccordionItem, addToast, Button, Input, Textarea } from "@heroui/react";
import { ethers } from "ethers";
import { useState } from "react";
import LitDecrypt from "./lit-decrypt";

export default function LitProtocol() {
  const { encryptFile } = useLitProtocol();
  const { uploadFile, fetchFile, balance, walletAddress } = useArweave();
  const [selectedKeys, setSelectedKeys] = useState(new Set(["1"]));
  const [selectedFile, setSelectedFile] = useState<Blob | null>(null);
  const [ciphertext, setCiphertext] = useState<string>("");
  const [dataToEncryptHash, setDataToEncryptHash] = useState<string>("");

  const [latestTransactionId, setLatestTransactionId] = useState<string>("");
  const [latestTransactionData, setLatestTransactionData] = useState<string>("");

  return (
    <div className="flex flex-col gap-3 p-10">
      <Button onPress={() => {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        provider.send("wallet_addEthereumChain", [{
          chainId: "0x2AC54",
          chainName: "Chronicle Yellowstone - Lit Protocol Testnet",
          nativeCurrency: {
            name: "Lit Protocol - Chronicle Yellowstone Testnet Token (tstLPX)",
            symbol: "tstLPX",
            decimals: 18
          },
          rpcUrls: ["https://yellowstone-rpc.litprotocol.com"],
          blockExplorerUrls: ["https://yellowstone-explorer.litprotocol.com"]
        }])
      }}>Add Chronicle Yellowstone To MetaMask</Button>
      <Accordion
        selectedKeys={selectedKeys}
        onSelectionChange={(keys) => setSelectedKeys(new Set(keys as unknown as string[]))}
        variant="splitted"
        isCompact>
        <AccordionItem key="1" title="Encrypt File" >
          <div className="flex flex-col gap-2 p-4">
            <Input type="file" label="File to encrypt" id="fileInput" accept="*" onChange={e => {
              if (!e.target.files || e.target.files.length === 0) return;
              console.log("encryptFile");
              setSelectedFile(e.target.files[0]);
            }} />
            {
              selectedFile && <Button onPress={async () => {
                const { ciphertext, dataToEncryptHash } = await encryptFile(selectedFile);
                setCiphertext(ciphertext);
                setDataToEncryptHash(dataToEncryptHash);
              }}>Encrypt</Button>
            }
          </div>
        </AccordionItem>
        <AccordionItem key="2" title="Upload Data">
          <div className="flex flex-col gap-2 p-4">
            <Textarea label="ciphertext" value={ciphertext} onValueChange={setCiphertext} />
            <Textarea label="dataToEncryptHash" value={dataToEncryptHash} onValueChange={setDataToEncryptHash} />
            <Input type="text" label="Arweave Balance" readOnly value={balance ?? ""} />
            <Input type="text" label="Arweave Wallet Address:" readOnly value={walletAddress ?? ""} />
            <Button onPress={async () => {
              setLatestTransactionData("");
              setLatestTransactionId("");
              const encoder = new TextEncoder();
              const uint8Array = encoder.encode(JSON.stringify({
                ciphertext,
                dataToEncryptHash,
              }));
              const arweaveTransId = await uploadFile(uint8Array.buffer as ArrayBuffer);
              console.log("Arweave transaction ID:", arweaveTransId);
              if (arweaveTransId) {
                setLatestTransactionId(arweaveTransId);
                setSelectedKeys(new Set(["3"]));
              }
            }}>
              <span>Upload to Arweave</span>
            </Button>
          </div>
        </AccordionItem>
        <AccordionItem key="3" title="Fetch Data" disabled={!latestTransactionId}>
          <div className="flex flex-col gap-2 p-4">
            <Textarea label="Transaction ID" value={latestTransactionId} onValueChange={setLatestTransactionId} />
            <Button onPress={async () => {
              setLatestTransactionData("");
              if (latestTransactionId === "") {
                addToast({ title: "Error", description: "Transaction ID is empty", color: "warning" })
                return;
              }
              const data = await fetchFile(latestTransactionId);
              console.log("Fetched file data:", data);
              const decoder = new TextDecoder("utf-8");
              const decryptedData = decoder.decode(data);
              setLatestTransactionData(decryptedData);
              setSelectedKeys(new Set(["4"]));
              addToast({
                title: "Success",
                description: "File fetched successfully",
                color: "success",
              })
            }}>Fetch</Button>
          </div>
        </AccordionItem>
        <AccordionItem key="4" title="Decrypt Data" disabled={!latestTransactionData}>
          <div className="flex flex-col gap-2 p-4">
            <LitDecrypt latestTransactionData={latestTransactionData} />
          </div>
        </AccordionItem>
      </Accordion>
    </div >
  )
}
