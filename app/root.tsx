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
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0ea5e9" />
        <Meta />
        <Links />
      </head>
      <body className="bg-glacier-50 text-ice-800 antialiased">
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
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <GlaciaLogo size="lg" className="justify-center mb-8" />
        <h1 className="text-3xl font-bold text-slate-800 mb-2">{message}</h1>
        <p className="text-slate-500 mb-8">{details}</p>
        {stack && import.meta.env.DEV && (
          <pre className="text-left text-xs bg-slate-900 text-slate-300 p-4 rounded-xl overflow-x-auto mb-6">
            {stack}
          </pre>
        )}
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-400 to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:from-sky-500 hover:to-cyan-600 transition-all"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
