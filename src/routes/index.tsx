import { createFileRoute } from "@tanstack/react-router";

// Routing is handled by react-router-dom inside src/App.tsx.
// This catch-all file exists so TanStack Start's file-based routing has a single
// entry that delegates everything to App.
export const Route = createFileRoute("/")({
  component: () => null,
});
