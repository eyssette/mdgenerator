const messageBackToHomePage = `<a href="./index.html">(voir d'autres templates)</a>`

// Pour purifier un input afin d'éviter des injections malveillantes
function sanitizeInput(input) {
  const div = document.createElement("div");
  div.textContent = input;
  return div.innerHTML.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Pour supprimer les doublons dans un tableau, en prenant en compte comme critère de vérification un numéro de colonnes particulier
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
  // On récupère le paramètre t qui indique le template à utiliser
  const params = new URLSearchParams(document.location.search);
  const templateName = params.get("t");
  if (!templateName) {
    const mainElement = document.body.querySelector("main");
    mainElement.innerHTML=""
    return;
  }
  const filePath = `./templates/`;
  const templateFile = filePath + `${templateName}.liquid`;
  const jsonFile = filePath + `${templateName}.json`;

  try {
    // On récupère les infos sur le template
    const responseJson = await fetch(jsonFile);
    if (!responseJson.ok) throw new Error("Fichier introuvable");
    // Récupération du nom du template
    const infosTemplateJson = await responseJson.json();
    const nameTemplateFromJson = infosTemplateJson.name
      ? infosTemplateJson.name
      : "";
    const nameTemplateElement = document.querySelector("#nameTemplate");
    nameTemplateElement.innerHTML = nameTemplateFromJson + messageBackToHomePage;
    // Récupération de la description du template
    const descriptionFromJson = infosTemplateJson.description
      ? infosTemplateJson.description
      : "";
    const descriptionElement = document.querySelector("#description");
    descriptionElement.innerHTML = descriptionFromJson;
    // Récupération de la description de chaque variable
    variablesFromJson = infosTemplateJson.variables;
    // On récupère le template
    const responseTemplate = await fetch(templateFile);
    if (!responseTemplate.ok) throw new Error("Fichier introuvable");
    const templateText = await responseTemplate.text();
    // On transforme le template en formulaire
    parseTemplate(templateText);
  } catch (error) {
    alert("Erreur lors du chargement du fichier: " + error.message);
  }
}

// Pour parcourir le template et créer le formulaire
function parseTemplate(template) {
  const form = document.getElementById("dynamicForm");
  form.innerHTML = "";

  // On récupère les variables dans le template
  const variableOrder = new Set();
  let variableMatches = [
    ...template.matchAll(/({{\s*(\w+)\s*}}|{%\s*if\s*(\w+)\s*%})/g),
  ];
  // On supprime les doublons (variables qui sont utilisées à plusieurs reprises dans le template)
  variableMatches = removeDuplicates(variableMatches, 0);

  // On identifie pour chaque variable son type
  variableMatches.forEach((match) => {
    if (match[2]) {
      // Premières variables capturées : les variables textes (qui donneront lieu à un champ input de type "texte à rentrer" dans le formulaire)
      variableOrder.add({ name: match[2], type: "text" });
    } else if (match[3]) {
      // Deuxième variables capturées : les variables qui définissent des conditions dans un bloc "if" (elles donneront lieu à un champ input de type "case à cocher" dans le formulaire)
      variableOrder.add({ name: match[3], type: "checkbox" });
    }
  });

  // On crée le formulaire en parcourant les variables du template
  variableOrder.forEach((variable) => {
    if (variable.type === "checkbox") {
      // Si on a une variable qui définit une condition dans un bloc if : on crée une case à cocher
      const div = document.createElement("div");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = variable.name;
      checkbox.name = variable.name;
      const label = document.createElement("label");
      const variableDescription = variablesFromJson[variable.name]
        ? variablesFromJson[variable.name]
        : variable.name;
      label.textContent = variableDescription;
      label.setAttribute("for", variable.name);
      div.appendChild(label);
      div.appendChild(checkbox);
      form.appendChild(div);
    } else {
      // Si on a une variable simple dont la valeur doit être du texte : on crée un champ input avec du texte à compléter
      const div = document.createElement("div");
      const label = document.createElement("label");
      const variableDescription = variablesFromJson[variable.name]
        ? variablesFromJson[variable.name]
        : variable.name;
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

  // Quand on clique sur le bouton "Générer", on génère le résultat
  const button = document.querySelector("#generateOutput");
  button.onclick = () => generateOutput(template, variableOrder);
}

// Pour générer le résultat à partir du template et des variables
async function generateOutput(template, variables) {
  const engine = new liquidjs.Liquid();
  const context = {};

  // On parcourt les variables
  variables.forEach((variable) => {
    // Pour chaque variable, on récupère la valeur de la variable dans le formulaire
    const input = document.getElementById(variable.name);
    if (input.type == "text") {
      // Pour un champ input de type texte, on récupère le texte de l'input
      context[variable.name] = sanitizeInput(input.value) || "";
    } else {
      // Pour un champ de type checkbox, on regarde si la case est cochée ou pas
      context[variable.name] = input.checked ? input.checked : false;
    }
  });

  // On génère le résultat grâce à Liquid
  const resultElement = document.body.querySelector("#result");
  const result = await engine.parseAndRender(template, context);

  // On place le résultat dans l'élément html correspondant
  window.jar.updateCode(result.replaceAll('&#39;',"'"))
  const buttons = document.body.querySelector('#buttons')
  buttons.scrollIntoView();
  // Si on clique sur le bouton pour copier, le résultat est mis dans le presse-papier
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
