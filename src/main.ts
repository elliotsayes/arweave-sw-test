import "./style.css";
import typescriptLogo from "./typescript.svg";
import viteLogo from "/vite.svg";
import { setupCounter } from "./counter.ts";
import { loadSw } from "./loadSw.ts";

loadSw().then(async () => {
  document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
    <div>
      <a href="https://vitejs.dev" target="_blank">
        <img src="${viteLogo}" class="logo" alt="Vite logo" />
      </a>
      <a href="https://www.typescriptlang.org/" target="_blank">
        <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
      </a>
      <img src="https://arweave.net/1fRFS50wWSb5wb7ccj8pIwfVrePQwJ7DEUi7ErvR7Hg" />
      <h1>Vite + TypeScript</h1>
      <div class="card">
        <button id="counter" type="button"></button>
      </div>
      <p class="read-the-docs">
        Click on the Vite and TypeScript logos to learn more
      </p>
      <code id="report">
      </code>
    </div>
  `;
  setupCounter(document.querySelector<HTMLButtonElement>("#counter")!);
  console.log("Fetching report");
  const res = await fetch(
    "https://arweave.net/I3Zl-d-WgKD9InzyZhZZjc9_MqEFq5kPE0Ce0KmgzPk"
  );
  const data = await res.text();
  document.querySelector<HTMLPreElement>("#report")!.innerHTML = data;
});
