import { useEffect, useState } from "react";
import { getCredentials, subscribeCredentials, type Credentials } from "../config/credentials";

/** React view of the stored Alpaca key pair; re-renders when Settings changes it. */
export function useCredentials(): Credentials | undefined {
  const [c, setC] = useState(getCredentials);
  useEffect(() => subscribeCredentials(setC), []);
  return c;
}
