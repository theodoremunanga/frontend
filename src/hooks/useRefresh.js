// hooks/useRefresh.js
import { useState } from "react";

export default function useRefresh() {
  const [key, setKey] = useState(0);

  const refresh = () => setKey(prev => prev + 1);

  return { key, refresh };
}