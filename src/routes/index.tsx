import { createFileRoute, Link, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  component: () => (
    <div className="p-8">
      <Link to="/dashboard" className="text-primary underline">Go to dashboard</Link>
    </div>
  ),
});
