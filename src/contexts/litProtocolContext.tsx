import { addToast } from "@heroui/react";
import { createSiweMessageWithRecaps, generateAuthSig, LitAccessControlConditionResource } from "@lit-protocol/auth-helpers";
import { LIT_ABILITY, LIT_NETWORK } from "@lit-protocol/constants";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import { decryptToFile, encryptFile as litEncryptFile } from "@lit-protocol/encryption";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { AccessControlConditions, EncryptResponse, LIT_NETWORKS_KEYS, LitResourceAbilityRequest } from "@lit-protocol/types";
import { ethers } from "ethers";
import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from "react";

interface LitProtocolProviderState {
  status: "disconnected" | "connecting" | "connected";
}

const initialState: LitProtocolProviderState = {
  status: "connecting",
}

interface LitProtocolContext extends LitProtocolProviderState {
  litNodeClient?: LitNodeClient;
  switchLitNetwork: (network: LIT_NETWORKS_KEYS) => void;
  encryptFile: (file: Blob) => Promise<EncryptResponse>;
  decryptFile: (ciphertext: string, dataToEncryptHash: string) => Promise<Blob>;
}

const LitProtocolContext = createContext<LitProtocolContext>({
  ...initialState,
  switchLitNetwork: () => { },
  encryptFile: () => { throw new Error("encryptFile not implemented"); },
  decryptFile: () => { throw new Error("decryptFile not implemented"); },
});

export type LitProtocolProviderAction =
  | { type: "DISCONNECTED" }
  | { type: "CONNECTED" }
  | { type: "CONNECTING" };

const litProtocolStateReducer = (state: LitProtocolProviderState, action: LitProtocolProviderAction): LitProtocolProviderState => {
  switch (action.type) {
    case "DISCONNECTED":
      return {
        ...state,
        status: "disconnected",
      };
    case "CONNECTED":
      return {
        ...state,
        status: "connected",
      };
    default:
      return state;
  }
}

export function LitProtocolProvider({ children }: { children: React.ReactNode }) {
  const [litNodeClient, setLitNodeClient] = useState<LitNodeClient>(() => new LitNodeClient({
    litNetwork: LIT_NETWORK.DatilDev,
  }));
  const [state, dispatch] = useReducer(litProtocolStateReducer, initialState);
  const initialized = useRef(false);
  const [usedBlockchain] = useState("sepolia");
  const [accessControlConditions, setAccessControlConditions] = useState<AccessControlConditions>([]);

  useEffect(() => {
    setAccessControlConditions([
      {
        contractAddress: '',
        standardContractType: '',
        chain: usedBlockchain,
        method: 'eth_getBalance',
        parameters: [':userAddress', 'latest'],
        returnValueTest: { comparator: '>', value: '0' },
      },
    ]);
  }, [usedBlockchain]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    (async () => {
      try {
        dispatch({ type: "CONNECTING" });
        await litNodeClient.connect();
        dispatch({ type: "CONNECTED" });
      } catch (error) {
        console.error("Lit client connect error:", error);
        dispatch({ type: "DISCONNECTED" });
        addToast({
          title: "LitNodeClient Connection Failed",
          description: "Error connecting to LitNodeClient",
          color: "danger",
        });
      }
    })();
  }, [litNodeClient]);

  const switchLitNetwork = useCallback((network: LIT_NETWORKS_KEYS) => {
    const newClient = new LitNodeClient({
      litNetwork: network,
    });
    (async () => {
      try {
        dispatch({ type: "CONNECTING" });
        setLitNodeClient(newClient);
        await newClient.connect();
        dispatch({ type: "CONNECTED" });
      } catch (error) {
        console.error("Lit client connect error:", error);
        dispatch({ type: "DISCONNECTED" });
        addToast({
          title: "LitNodeClient Connection Failed",
          description: "Error connecting to LitNodeClient",
          color: "danger",
        });
      }
    })();
  }, []);

  const encryptFile = useCallback(async (file: Blob): Promise<EncryptResponse> => {
    if (state.status !== "connected") {
      addToast({
        title: "LitNodeClient is not connected",
        color: "danger",
      });
      console.error("LitNodeClient is not connected");
      throw new Error("LitNodeClient is not connected");
    }
    try {
      const res = await litEncryptFile({
        chain: usedBlockchain,
        file,
        accessControlConditions
      }, litNodeClient);
      console.log("Res:", res);
      addToast({
        title: "File Encrypted",
        description: "File encrypted successfully",
        color: "success",
      });
      return res;
    } catch (error) {
      addToast({
        title: "Encryption Error",
        description: "Error encrypting file",
        color: "danger",
      })
      console.error("Error encrypting file:", error);
      throw error;
    }
  }, [accessControlConditions, litNodeClient, state, usedBlockchain]);

  const getSessionSignatures = useCallback(async () => {
    const web3Provider = new ethers.providers.Web3Provider(window.ethereum)
    // Connect to the wallet
    web3Provider.send("wallet_addEthereumChain", [{
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
    await web3Provider.send("eth_requestAccounts", []);

    const signer = web3Provider.getSigner();
    console.log("Signer:", signer);
    const walletAddress = await signer.getAddress();
    console.log("Connected account:", walletAddress);

    // Get the latest blockhash
    const latestBlockhash = await litNodeClient.getLatestBlockhash();
    console.log("Latest blockhash:", latestBlockhash);

    const contractClient = new LitContracts({
      signer: web3Provider.getSigner(),
      network: LIT_NETWORK.DatilDev,
    });
    await contractClient.connect();
    console.log("Contract client:", contractClient);
    console.log(contractClient.rateLimitNftContract.read.address);
    addToast({
      title: "LitNodeClient Connected",
      description: "Start Minting Capacity Credits NFT",
      color: "success",
    });
    const { capacityTokenIdStr } = await contractClient.mintCapacityCreditsNFT({
      requestsPerKilosecond: 80,
      // requestsPerDay: 14400,
      // requestsPerSecond: 10,
      daysUntilUTCMidnightExpiration: 2,
    });
    console.log("Capacity token ID:", capacityTokenIdStr);
    addToast({
      title: "Capacity token minted",
      description: `Capacity token minted with ID: ${capacityTokenIdStr}. Start creating capacity delegation auth sig`,
      color: "success",
    });
    const { capacityDelegationAuthSig } = await litNodeClient.createCapacityDelegationAuthSig({
      dAppOwnerWallet: signer,
      uses: '1',
      capacityTokenId: capacityTokenIdStr,
      delegateeAddresses: [await signer.getAddress()],
    });
    console.log("Capacity delegation auth sig:", capacityDelegationAuthSig);
    addToast({
      title: "Capacity delegation auth sig created",
      color: "success",
    });

    // Define the authNeededCallback function
    const authNeededCallback = async (params: {
      uri?: string;
      expiration?: string;
      resourceAbilityRequests?: LitResourceAbilityRequest[]
    }) => {
      if (!params.uri) {
        throw new Error("uri is required");
      }
      if (!params.expiration) {
        throw new Error("expiration is required");
      }

      if (!params.resourceAbilityRequests) {
        throw new Error("resourceAbilityRequests is required");
      }

      // Create the SIWE message
      const toSign = await createSiweMessageWithRecaps({
        uri: params.uri,
        expiration: params.expiration,
        resources: params.resourceAbilityRequests,
        walletAddress: await signer.getAddress(),
        nonce: latestBlockhash,
        litNodeClient,
      });

      // Generate the authSig
      const authSig = await generateAuthSig({
        signer: signer,
        toSign,
      });

      return authSig;
    }

    // Define the Lit resource
    const litResource = new LitAccessControlConditionResource('*');

    // Get the session signatures
    const sessionSigs = await litNodeClient.getSessionSigs({
      chain: usedBlockchain,
      resourceAbilityRequests: [
        {
          resource: litResource,
          ability: LIT_ABILITY.AccessControlConditionDecryption,
        },
      ],
      authNeededCallback,
      capacityDelegationAuthSig,
    });
    return sessionSigs;
  }, [litNodeClient, usedBlockchain]);

  const decryptFile = useCallback(async (ciphertext: string, dataToEncryptHash: string): Promise<Blob> => {
    if (state.status !== "connected") {
      addToast({
        title: "LitNodeClient is not connected",
        color: "danger",
      });
      console.error("LitNodeClient is not connected");
      throw new Error("LitNodeClient is not connected");
    }
    try {
      const sessionSigs = await getSessionSignatures();
      const file = await decryptToFile(
        {
          accessControlConditions,
          chain: usedBlockchain,
          ciphertext,
          dataToEncryptHash,
          sessionSigs
        },
        litNodeClient
      );
      return new Blob([file], { type: "application/octet-stream" });
    } catch (error) {
      addToast({
        title: "Decryption Error",
        description: "Error decrypting file",
        color: "danger",
      });
      console.error("Error decrypting file:", error);
      throw error;
    }
  }, [accessControlConditions, getSessionSignatures, litNodeClient, state, usedBlockchain]);

  return (
    <LitProtocolContext.Provider value={{ ...state, litNodeClient, encryptFile, decryptFile, switchLitNetwork }}>
      {children}
    </LitProtocolContext.Provider>
  );
}

export const useLitProtocol = () => {
  const context = useContext(LitProtocolContext);
  if (!context) {
    throw new Error("useLitProtocolContext must be used within a LitProtocolProvider");
  }
  return context;
}