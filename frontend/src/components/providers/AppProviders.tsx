"use client";

import "@ant-design/v5-patch-for-react-19";
import "@/lib/i18n"; // initializes i18next globally before any component renders

import type { ReactNode } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { Provider } from "react-redux";
import { QueryClientProvider } from "@tanstack/react-query";
import type { Query } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import { get, set, del } from "idb-keyval";
import store from "@/store/store";
import { queryClient } from "@/lib/react-query";
import { MusicProvider } from "@/components/widgets/music/MusicContext";
import { useCurrencyRoot } from "@/lib/currency";

function createIDBPersister(key: IDBValidKey = "vedicvaibhav-react-query"): Persister {
  let saveTimeout: ReturnType<typeof setTimeout> | undefined;

  return {
    persistClient: async (client: PersistedClient) => {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        set(key, client).catch(() => {
          // ignore persist errors (private mode, quota, etc.)
        });
      }, 500);
    },
    restoreClient: async () => {
      try {
        return await get<PersistedClient>(key);
      } catch {
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await del(key);
      } catch {
        // ignore
      }
    },
  };
}

const persister = createIDBPersister();

/**
 * IndexedDB persistence survives reloads (12h maxAge), which is exactly what
 * makes local development confusing: a backend change can be invisible for
 * hours because the browser is still replaying yesterday's cached response.
 * Production keeps the persisted/offline cache; dev (`next dev`, NODE_ENV
 * !== "production") stays memory-only so a reload always shows live data.
 */
function QueryProviders({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV !== "production") {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 12 * 60 * 60 * 1000, // 12 hours
        buster: "vedic-vaibhav-v1",
        dehydrateOptions: {
          // persist only successful queries
          shouldDehydrateQuery: (q: Query) => q.state.status === "success",
        },
      }}
      onSuccess={() => {
        // Cache restored from IndexedDB — resume any paused mutations (offline/online)
        queryClient.resumePausedMutations();
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

/**
 * Holds the ONLY subscription to the currency store.
 *
 * It sits here rather than in a context provider because ~50 files call a plain
 * `money(price)` function instead of a hook; re-rendering the root is what
 * repaints all of them when the country or the FX table changes. Kept as its own
 * component so a country change re-renders the tree below it without tearing
 * down the query cache or the redux store above.
 */
function CurrencyRoot({ children }: { children: ReactNode }) {
  useCurrencyRoot();
  return <>{children}</>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    /**
     * AntdRegistry collects antd's CSS-in-JS output during the server render and
     * inlines it into the HTML.
     *
     * Without it, antd emits class names like `ant-col-xs-0` server-side but no
     * rules to go with them — nothing defined `display: none` for that class
     * until hydration injected the stylesheet. Every antd grid on the site was
     * therefore laid out twice: once unstyled, then again once the styles
     * arrived. On the homepage that re-layout moved the navbar (and with it the
     * whole page) by 29px, which measured as a 0.384 layout shift — the single
     * largest contributor to CLS.
     */
    <AntdRegistry>
      <Provider store={store}>
        <QueryProviders>
          <MusicProvider>
            <CurrencyRoot>{children}</CurrencyRoot>
          </MusicProvider>
        </QueryProviders>
      </Provider>
    </AntdRegistry>
  );
}
