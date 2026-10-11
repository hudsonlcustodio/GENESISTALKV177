"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

/** Auth forms require their client handler. A native POST only renders the page
 * again and loses the attempt; keep inputs and submit disabled until hydration has finished.
 * The server snapshot also keeps the first hydration render consistent. */
export function useAuthFormReady(): boolean {
  return useSyncExternalStore(subscribe, clientReady, serverReady);
}
