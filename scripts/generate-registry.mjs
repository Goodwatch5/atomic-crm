#!/usr/bin/env node

import { globSync } from "glob";
import fs from "node:fs";
import path from "node:path";

const registryPath = "registry.json";
const basePath = "src";
const atomicCrmComponentsPath = path.join(basePath, "components", "atomic-crm");
const supabaseComponentsPath = path.join(basePath, "components", "supabase");
const hooksPath = path.join(basePath, "hooks");
const libPath = path.join(basePath, "lib");

const excludedHooks = [
  "filter-context.tsx",
  "saved-queries.tsx",
  "use-mobile.ts",
  "useSupportCreateSuggestion.tsx",
];

const excludedLibFiles = [
  "field.type.ts",
  "genericMemo.ts",
  "i18nProvider.ts",
  "sanitizeInputRestProps.ts",
  "utils.ts",
];

const testFilePattern = "**/*.{test,spec}.*";
const storyFilePattern = "**/*.stories.*";

function globFiles(pattern, options) {
  return globSync(pattern.split(path.sep).join("/"), options).map((file) =>
    file.split(path.sep).join("/"),
  );
}

function preserveFileOrder(existingFiles, generatedFiles) {
  const generatedByPath = new Map(
    generatedFiles.map((file) => [file.path, file]),
  );
  const orderedFiles = [];
  const existingPaths = new Set();

  for (const file of existingFiles) {
    const generatedFile = generatedByPath.get(file.path);
    if (generatedFile) {
      orderedFiles.push(generatedFile);
      existingPaths.add(file.path);
    }
  }

  const newFiles = generatedFiles
    .filter((file) => !existingPaths.has(file.path))
    .sort((first, second) =>
      first.path < second.path ? -1 : first.path > second.path ? 1 : 0,
    );

  return [...orderedFiles, ...newFiles];
}

const atomicCrmComponents = globFiles(
  path.join(atomicCrmComponentsPath, "**", "*.ts*"),
  { ignore: [testFilePattern, storyFilePattern] },
);
const supabaseComponents = globFiles(
  path.join(supabaseComponentsPath, "**", "*.ts*"),
  { ignore: [testFilePattern, storyFilePattern] },
);
const hooks = globFiles(path.join(hooksPath, "**", "*.ts*")).filter(
  (hook) => !excludedHooks.includes(path.basename(hook)),
);
const libFiles = globFiles(path.join(libPath, "**", "*.ts*")).filter(
  (file) => !excludedLibFiles.includes(path.basename(file)),
);
const changelogPath = "CHANGELOG.md";

const registryContent = JSON.parse(fs.readFileSync(registryPath, "utf-8"));

const files = [
  ...atomicCrmComponents.map((path) => {
    return {
      path,
      type: "registry:component",
    };
  }),
  ...supabaseComponents.map((path) => {
    return {
      path,
      type: "registry:component",
    };
  }),
  ...hooks.map((path) => {
    return {
      path,
      type: "registry:hook",
    };
  }),
  ...libFiles.map((path) => {
    return {
      path,
      type: "registry:lib",
    };
  }),
  {
    path: changelogPath,
    type: "registry:file",
    target: "~/CHANGELOG.md",
  },
];

const newRegistryContent = {
  ...registryContent,
  items: registryContent.items.map((item) => {
    if (item.name === "atomic-crm") {
      return {
        ...item,
        files: preserveFileOrder(item.files, files),
      };
    }

    return item;
  }),
};

fs.writeFileSync(
  registryPath,
  `${JSON.stringify(newRegistryContent, null, 2)}\n`,
  "utf-8",
);
