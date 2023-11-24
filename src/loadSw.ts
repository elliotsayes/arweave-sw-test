export const loadSw = () => {
  if ("serviceWorker" in navigator) {
    const swName =
      import.meta.env.MODE === "production" ? "/sw.js" : "/dev-sw.js?dev-sw";
    navigator.serviceWorker.register(swName).then(
      (registration) => {
        console.log("Registered a Service Worker ", registration);
      },
      (error) => {
        console.error("Could not register a Service Worker ", error);
      }
    );
  } else {
    console.error("Service Workers are not supported in this browser.");
  }
};
