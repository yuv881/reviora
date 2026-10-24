import { useState, useEffect } from "react";
import { Outlet, useLoaderData, useRouteError, Link, useNavigation, useLocation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { authenticate } from "../shopify.server";
import { PageSkeleton } from "../components/PageSkeleton.jsx";

export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const url = new URL(request.url);
  if (url.pathname.startsWith("/app/api/")) {
    return null;
  }

  await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

function PolarisLink({ children, url = "", external, ...rest }) {
  if (external || /^https?:\/\//.test(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }

  return (
    <Link to={url} {...rest}>
      {children}
    </Link>
  );
}

export default function App() {
  const { apiKey } = useLoaderData();
  const navigation = useNavigation();
  const location = useLocation();

  // Route-to-route navigation detection
  const isNavigating =
    navigation.state === "loading" &&
    Boolean(navigation.location && navigation.location.pathname !== location.pathname);

  // Debounce skeleton display by 200ms to eliminate quick-load flicker/blink
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    let timer;
    if (isNavigating) {
      timer = setTimeout(() => {
        setShowSkeleton(true);
      }, 200);
    } else {
      setShowSkeleton(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isNavigating]);

  return (
    <AppProvider embedded apiKey={apiKey}>
      <PolarisAppProvider i18n={enTranslations} linkComponent={PolarisLink}>
        <s-app-nav>
          <s-link href="/app">Dashboard</s-link>
          <s-link href="/app/reviews">Moderation Inbox</s-link>
          <s-link href="/app/requests">Requests</s-link>
          <s-link href="/app/import">Import &amp; Export</s-link>
          <s-link href="/app/widgets">Widgets</s-link>
          <s-link href="/app/billing">Billing</s-link>
        </s-app-nav>
        {showSkeleton ? (
          <PageSkeleton />
        ) : (
          <div
            style={{
              opacity: isNavigating ? 0.6 : 1,
              transition: "opacity 150ms ease",
              pointerEvents: isNavigating ? "none" : "auto",
            }}
          >
            <Outlet />
          </div>
        )}
      </PolarisAppProvider>
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
