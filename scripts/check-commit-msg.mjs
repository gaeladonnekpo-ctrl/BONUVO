import fs from "node:fs";

const commitMsgFile = process.argv[2];
if (!commitMsgFile) {
  console.error("Erreur : chemin du fichier de message de commit manquant.");
  process.exit(1);
}

const rawMessage = fs.readFileSync(commitMsgFile, "utf8").trim();
const firstLine = rawMessage.split(/\r?\n/)[0] ?? "";

// Autoriser les commits de merge/revert générés par Git
if (firstLine.startsWith("Merge ") || firstLine.startsWith("Revert ")) {
  process.exit(0);
}

const conventionalPattern =
  /^(feat|fix|chore|docs|test|refactor|ci|build|perf|style|revert)(\([a-z0-9-]+\))?!?: .{3,}$/;

if (!conventionalPattern.test(firstLine)) {
  console.error(
    [
      "Format de commit invalide (Conventional Commits requis) :",
      `  Reçu : "${firstLine}"`,
      "  Attendu : <type>(<scope optionnel>): <description>",
      "  Types autorisés : feat, fix, chore, docs, test, refactor, ci, build, perf, style, revert",
    ].join("\n"),
  );
  process.exit(1);
}
