import React from "react";
import ReactDOM from "react-dom/client";
import { contentError } from "./content";
import "./styles.css";
import "./account.css";
const Account = React.lazy(() => import("./Account"));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {contentError ? (
      <main className="account-page">
        <section className="account-card panel" role="alert">
          <h1>Learning content needs a little fix</h1>
          <p>{contentError}</p>
          <p>
            Check the named file in <code>src/content</code>, save your
            corrections, and reload this page. The content editing guide is in
            the app README.
          </p>
        </section>
      </main>
    ) : (
      <React.Suspense
        fallback={
          <main className="account-page" role="status">
            Opening Champion Island…
          </main>
        }
      >
        <Account />
      </React.Suspense>
    )}
  </React.StrictMode>,
);
