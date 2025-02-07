function sanitizeInput(input) {
  const div = document.createElement("div");
  div.textContent = input;
  return div.innerHTML.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function removeDuplicates(array, columnNumber) {
  const seen = new Set();
  return array.filter((row) => {
    const value = row[columnNumber];
    if (seen.has(value)) {
      return false;
    } else {
      seen.add(value);
      return true;
    }
  });
}

let variablesFromJson = {};

async function loadTemplate() {
  const hash = window.location.hash.substring(1);
  if (!hash) {
    alert("Veuillez spécifier un fichier en ajoutant son hash dans l'URL");
    return;
  }
  const filePath = `./templates/`;
  const templateFile = filePath + `${hash}.liquid`;
  const jsonFile = filePath + `${hash}.json`;
  try {
    // On récupère les infos sur le template
    const responseJson = await fetch(jsonFile);
    if (!responseJson.ok) throw new Error("Fichier introuvable");
    const infosTemplateJson = await responseJson.json();
	 const nameTemplateFromJson = infosTemplateJson.name ? infosTemplateJson.name : "";
	 const nameTemplateElement = document.querySelector("#nameTemplate");
	 nameTemplateElement.textContent = nameTemplateFromJson;
    const descriptionFromJson = infosTemplateJson.description ? infosTemplateJson.description : "";
    const descriptionElement = document.querySelector("#description");
    variablesFromJson = infosTemplateJson.variables;
    descriptionElement.innerHTML = descriptionFromJson;
	 // On récupère le template pour le transformer en formulaire
	 const responseTemplate = await fetch(templateFile);
    if (!responseTemplate.ok) throw new Error("Fichier introuvable");
    const templateText = await responseTemplate.text();
    parseTemplate(templateText);
  } catch (error) {
    alert("Erreur lors du chargement du fichier: " + error.message);
  }
}

function parseTemplate(template) {
  const form = document.getElementById("dynamicForm");
  form.innerHTML = "";

  const variableOrder = new Set();
  const conditionalVars = new Set();
  let variableMatches = [
    ...template.matchAll(/({{\s*(\w+)\s*}}|{%\s*if\s*(\w+)\s*%})/g),
  ];
  variableMatches = removeDuplicates(variableMatches, 0);

  variableMatches.forEach((match) => {
    if (match[2]) {
      variableOrder.add({ name: match[2], type: "text" });
    } else if (match[3]) {
      variableOrder.add({ name: match[3], type: "checkbox" });
      conditionalVars.add(match[3]);
    }
  });

  variableOrder.forEach((variable) => {
    if (variable.type === "checkbox") {
      const div = document.createElement("div");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = variable.name;
      checkbox.name = variable.name;

      const label = document.createElement("label");
		const variableDescription = variablesFromJson[variable.name] ? variablesFromJson[variable.name] :  variable.name;
      label.textContent = variableDescription;
      label.setAttribute("for", variable.name);

      div.appendChild(label);
      div.appendChild(checkbox);
      form.appendChild(div);
    } else {
      const div = document.createElement("div");
      const label = document.createElement("label");
      const variableDescription = variablesFromJson[variable.name] ? variablesFromJson[variable.name] :  variable.name;
      label.textContent = variableDescription;

      const input = document.createElement("input");
      input.type = "text";
      input.id = variable.name;
      input.name = variable.name;

      div.appendChild(label);
      div.appendChild(input);
      form.appendChild(div);
    }
  });

  const button = document.querySelector("#generateOutput");
  button.onclick = () =>
    generateOutput(template, variableOrder, conditionalVars);
}

async function generateOutput(template, variables, conditionalVars) {
  const engine = new liquidjs.Liquid();
  const context = {};

  variables.forEach((variable) => {
    console.log(variable);
    const input = document.getElementById(variable.name);
    if (input.type == "text") {
      context[variable.name] = sanitizeInput(input.value) || "";
    } else {
      context[variable.name] = input.checked ? input.checked : false;
    }
  });

  const resultElement = document.body.querySelector("#result");
  const result = await engine.parseAndRender(template, context);
  resultElement.innerHTML = result.replaceAll("\n", "<br>");
  const copyButton = document.body.querySelector("#copyButton");
  copyButton.addEventListener("click", () => {
    navigator.clipboard
      .writeText(resultElement.innerHTML.replaceAll("<br>", "\n"))
      .then(() => {
        alert("Votre texte généré est copié dans le presse-papier");
      });
  });
}

window.onload = loadTemplate;
