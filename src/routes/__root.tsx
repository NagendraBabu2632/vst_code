import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import App from "@/App";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Digital Factory System" },
      { name: "description", content: "VST Industries Digital Factory System dashboards" },
      { property: "og:title", content: "Digital Factory System" },
      { name: "twitter:title", content: "Digital Factory System" },
      { property: "og:description", content: "VST Industries Digital Factory System dashboards" },
      { name: "twitter:description", content: "VST Industries Digital Factory System dashboards" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/34077e8d-b89f-4bf0-b801-f68decf36f22/id-preview-84a07f51--4dd90251-efee-4678-95fa-235433d28569.lovable.app-1780297047941.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/34077e8d-b89f-4bf0-b801-f68decf36f22/id-preview-84a07f51--4dd90251-efee-4678-95fa-235433d28569.lovable.app-1780297047941.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: App,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('dfs_theme');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
