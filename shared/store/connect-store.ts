import { create } from "zustand";
import { UserOAuthAccount } from "../types";

type ConnectStore = {
  userOAuthAccounts: UserOAuthAccount[];
};
type ConnectAction = {
  setUserOAuthAccounts: (accounts: UserOAuthAccount[]) => void;
  deleteUserOAuthAccount: (id: string) => void;
};

export const useConnectStore = create<ConnectStore & ConnectAction>((set) => ({
  userOAuthAccounts: [],
  setUserOAuthAccounts: (accounts) => set({ userOAuthAccounts: accounts }),
  deleteUserOAuthAccount: (id) =>
    set((state) => ({
      userOAuthAccounts: state.userOAuthAccounts.filter(
        (account) => account.id !== id,
      ),
    })),
}));
