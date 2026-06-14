"use client";

import * as React from "react";

type PageActions = {
  onNew?: () => void;
};

interface PageActionsContextValue {
  actions: PageActions;
  setActions: React.Dispatch<React.SetStateAction<PageActions>>;
}

const PageActionsContext = React.createContext<PageActionsContextValue | null>(
  null
);

export function PageActionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [actions, setActions] = React.useState<PageActions>({});

  const value = React.useMemo(
    () => ({ actions, setActions }),
    [actions]
  );

  return (
    <PageActionsContext.Provider value={value}>
      {children}
    </PageActionsContext.Provider>
  );
}

export function usePageActions() {
  const ctx = React.useContext(PageActionsContext);
  if (!ctx) {
    throw new Error("usePageActions must be used within PageActionsProvider");
  }
  return ctx;
}

export function useRegisterPageAction(
  key: keyof PageActions,
  handler: (() => void) | undefined
) {
  const { setActions } = usePageActions();

  React.useEffect(() => {
    setActions((prev) => ({ ...prev, [key]: handler }));
    return () => setActions((prev) => ({ ...prev, [key]: undefined }));
  }, [key, handler, setActions]);
}
