"use client";
import { useArweave } from "@/contexts/arweaveContext";
import { useLitProtocol } from "@/contexts/litProtocolContext";
import { addToast, Button, Input, Textarea } from "@heroui/react";
import * as CryptoJS from "crypto-js";
import { useEffect, useState } from "react";

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

export default function DecryptPage() {
  const { decryptFile } = useLitProtocol();
  const { fetchFile } = useArweave();

  const [transactionId, setTransactionId] = useState<string>("");
  const [encryptedContent, setEncryptedContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [file, setFile] = useState<Blob | null>(null);
  const [checksum, setChecksum] = useState<string>("");
  useEffect(() => {
    (async () => {
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
          const hash = CryptoJS.MD5(wordArray).toString(CryptoJS.enc.Hex);
          setChecksum(hash);
          console.log("Checksum:", hash);
        };
        reader.readAsArrayBuffer(file);
      }
    })();
  }, [file]);

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Download Zone - Blue */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Download File from Arweave</h2>
        <Input
          placeholder="Input File ID"
          className="w-full p-2 mb-3 border border-gray-300 rounded-md"
          type="text"
          label="Arweave Tx Id"
          value={transactionId}
          onValueChange={setTransactionId} />
        <Button
          className="px-4 py-2 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 transition-colors"
          onPress={async () => {
            if (!transactionId) return;
            const data = await fetchFile(transactionId);
            console.log("Fetched file:", data);
            const decoder = new TextDecoder("utf-8");
            setEncryptedContent(decoder.decode(data));
          }}>Download File</Button>
      </div>
      {/* Decrypt Zone - Green */}
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Decrypt File with Lit</h2>
        <Textarea
          value={encryptedContent}
          onValueChange={setEncryptedContent}
          placeholder="ciphertext..."
          className="w-full p-2 mb-3 border border-gray-300 rounded-md min-h-[150px]"
        ></Textarea>
        <Button
          onPress={async () => {
            const { ciphertext, dataToEncryptHash } = JSON.parse(encryptedContent);
            addToast({
              title: "Success",
              description: "File fetched successfully",
              color: "success",
            });
            setFile(await decryptFile(ciphertext, dataToEncryptHash));
          }}
          className="px-4 py-2 bg-green-500 text-white font-medium rounded-md hover:bg-green-600 transition-colors"
        >
          Decrypt File
        </Button>
      </div>
      {/* Save Zone - Orange */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Save File to Computer</h2>
        <Input type="text" label="File MD5" value={checksum} readOnly />
        <Input
          type="text"
          value={fileName}
          onValueChange={setFileName}
          label="File Name"
          placeholder="Input file name..."
          className="w-full p-2 mb-3 border border-gray-300 rounded-md"
        />
        <Button
          onPress={() => {
            if (!file) return;
            downloadBlob(file, fileName, "application/octet-stream");
          }}
          className="px-4 py-2 bg-amber-500 text-white font-medium rounded-md hover:bg-amber-600 transition-colors"
        >
          Save
        </Button>
      </div>
    </div>
  )
}