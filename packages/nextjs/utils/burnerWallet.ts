import { rainbowkitBurnerWallet } from "burner-connector";

const BURNER_WALLET_PK_KEY = "burnerWallet.pk";

export const setBurnerWalletPrivateKey = (privateKey: string) => {
  try {
    const storage = rainbowkitBurnerWallet.useSessionStorage ? sessionStorage : localStorage;
    storage.setItem(BURNER_WALLET_PK_KEY, privateKey);
    console.log("Burner wallet private key set successfully");
  } catch (error) {
    console.error("Failed to set burner wallet private key:", error);
  }
};

export const getBurnerWalletPrivateKey = (): string | null => {
  try {
    const storage = rainbowkitBurnerWallet.useSessionStorage ? sessionStorage : localStorage;
    return storage.getItem(BURNER_WALLET_PK_KEY);
  } catch (error) {
    console.error("Failed to get burner wallet private key:", error);
    return null;
  }
};