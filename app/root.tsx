import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  Link,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { GlaciaLogo } from "./components/GlaciaLogo";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:wght@400;500;700&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#06B6D4" />
        <Meta />
        <Links />
      </head>
      <body className="bg-bg text-ink antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Something went wrong";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "Page Not Found" : `Error ${error.status}`;
    details =
      error.status === 404
        ? "The page you're looking for doesn't exist."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="bevel hard-shadow max-w-md w-full p-8">
        <GlaciaLogo size="lg" className="mb-6" />
        <p className="eyebrow mb-2">ERROR{isRouteErrorResponse(error) ? ` · ${error.status}` : ""}</p>
        <h1 className="display text-3xl text-ink mb-2">{message}</h1>
        <p className="text-ink-2 mb-8">{details}</p>
        {stack && import.meta.env.DEV && (
          <pre className="text-left text-xs bg-ink text-bg p-4 overflow-x-auto mb-6 font-mono border-2 border-rule">
            {stack}
          </pre>
        )}
        <Link
          to="/"
          className="bevel-accent bevel-press inline-flex items-center gap-2 px-6 py-3 font-bold text-sm uppercase tracking-wide font-mono"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
