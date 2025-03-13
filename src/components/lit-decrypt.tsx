"use client";

import { useLitProtocol } from "@/contexts/litProtocolContext";
import { Button, Input, Textarea } from "@heroui/react";
import { useState } from "react";

const downloadURL = (data: string, fileName: string) => {
  const a = document.createElement('a')
  a.href = data
  a.download = fileName
  document.body.appendChild(a)
  a.style.display = 'none'
  a.click()
  a.remove()
}

const downloadBlob = function (data: BlobPart, fileName: string, mimeType: string) {
  const blob = new Blob([data], {
    type: mimeType
  });
  const url = window.URL.createObjectURL(blob);
  downloadURL(url, fileName);
  setTimeout(function () {
    return window.URL.revokeObjectURL(url);
  }, 1000);
};

export default function LitDecrypt({
  latestTransactionData,
}: {
  latestTransactionData: string;
}) {
  const { decryptFile } = useLitProtocol();
  const [decryptedFile, setDecryptedFile] = useState<Blob | null>(null);

  return (
    <>
      <Textarea label="Transaction Data" value={latestTransactionData} readOnly />
      <Button onPress={async () => {
        if (!latestTransactionData) return;
        setDecryptedFile(null);
        const { ciphertext, dataToEncryptHash } = JSON.parse(latestTransactionData);
        const file = await decryptFile(ciphertext, dataToEncryptHash);
        setDecryptedFile(file);
        console.log("Decrypted file:", file);
      }}>Decrypt</Button>
      {
        decryptedFile && (
          <>
            <Input type="text" label="Decrypted File Size" readOnly value={decryptedFile ? decryptedFile.size.toFixed() : ""} />
            <Button onPress={() => {
              downloadBlob(decryptedFile, "decryptedFile.txt", "application/octet-stream");
            }}>Save</Button>
          </>
        )
      }
    </>
  );
}