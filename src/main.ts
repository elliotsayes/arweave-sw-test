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
      <img src="https://ardrive/c7c3572e-f43b-4a6f-b747-89974ea90909" />
      <img src="https://ardrive/80d488b4-21c1-41ca-9785-52dfc36c1fd1#J2RQJRH07ogvGJzkO73W0r_49yMilO691kGi3xrRhCk" style="width: 200px; height: 200px" />
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
