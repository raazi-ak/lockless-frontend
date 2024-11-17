"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { MetaMaskInpageProvider } from "@metamask/providers";

// Import ABI (use actual ABI from your project)
import contractABI from "../contractABI.json";

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}

// Replace with your actual contract address
const CONTRACT_ADDRESS = "0x439cE8dD9e8C64857f6C86bc571494E6dF92F3d4";

export default function Home() {
  const [account, setAccount] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState("");
  const [accessGranted, setAccessGranted] = useState(false);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (typeof window.ethereum === "undefined") {
        console.error("MetaMask is not installed!");
        return;
      }

      try {
        // Request account access
        await window.ethereum.request({ method: "eth_requestAccounts" });

        // Create provider and signer
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        // Get connected account
        const userAccount = await signer.getAddress();
        setAccount(userAccount);

        // Initialize the contract
        const vehicleContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          contractABI,
          signer
        );
        setContract(vehicleContract);

        // Set up event listener
        vehicleContract.on("AccessChanged", (vehicleId, newState) => {
          setLogs((prevLogs) => [
            ...prevLogs,
            `Vehicle ${vehicleId} access is now ${
              newState ? "Granted" : "Revoked"
            }`,
          ]);
        });

        console.log("Contract initialized");
      } catch (error) {
        console.error("Error initializing contract:", error);
      }
    };

    init();

    // Cleanup event listener when component unmounts
    return () => {
      contract?.removeAllListeners("AccessChanged");
    };
  }, [contract]);

  const updateLogs = async () => {
    if (!contract) return;
  
    try {
      const eventFilter = contract.filters.AccessChanged();
      const events = await contract.queryFilter(eventFilter);
  
      // Decode the events using the contract interface
      const decodedLogs = events.map((event) => {
        const decoded = contract.interface.decodeEventLog(
          "AccessChanged",
          event.data,
          event.topics
        );
        return `Vehicle ${decoded.vehicleId} access is now ${
          decoded.newState ? "Granted" : "Revoked"
        }`;
      });
  
      setLogs(decodedLogs);
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };
  

  const createVehicle = async () => {
    if (!contract) return;

    try {
      setLoading(true); // Start loader
      const transaction = await contract.createVehicle(vehicleId);
      await transaction.wait();
      console.log("Vehicle created:", vehicleId);
      setLoading(false); // Stop loader
    } catch (error) {
      console.error("Error creating vehicle:", error);
      setLoading(false); // Stop loader in case of error
    }
  };

  const grantAccess = async () => {
    if (!contract) return;

    try {
      setLoading(true); // Start loader
      const transaction = await contract.grantAccess(vehicleId);
      await transaction.wait();
      setAccessGranted(true);
      console.log("Access granted to vehicle:", vehicleId);
      await updateLogs();
      setLoading(false); // Stop loader
    } catch (error) {
      console.error("Error granting access:", error);
      setLoading(false); // Stop loader in case of error
    }
  };

  const revokeAccess = async () => {
    if (!contract) return;

    try {
      setLoading(true); // Start loader
      const transaction = await contract.revokeAccess(vehicleId);
      await transaction.wait();
      setAccessGranted(false);
      console.log("Access revoked from vehicle:", vehicleId);
      await updateLogs();
      setLoading(false); // Stop loader
    } catch (error) {
      console.error("Error revoking access:", error);
      setLoading(false); // Stop loader in case of error
    }
  };

  return (
    <div>
      <h1>Vehicle Access DApp</h1>
      <p>Account: {account}</p>

      <input
        type="text"
        placeholder="Enter vehicle ID"
        value={vehicleId}
        onChange={(e) => setVehicleId(e.target.value)}
      />

      <button onClick={createVehicle} disabled={loading}>
        {loading ? "Creating Vehicle..." : "Create Vehicle"}
      </button>
      <button onClick={grantAccess} disabled={accessGranted || loading}>
        {loading ? "Granting Access..." : "Grant Access"}
      </button>
      <button onClick={revokeAccess} disabled={!accessGranted || loading}>
        {loading ? "Revoking Access..." : "Revoke Access"}
      </button>

      <h3>Access Status: {accessGranted ? "Granted" : "Revoked"}</h3>

      <h3>Logs:</h3>
      <ul>
        {logs.map((log, index) => (
          <li key={index}>{log}</li>
        ))}
      </ul>
    </div>
  );
}
