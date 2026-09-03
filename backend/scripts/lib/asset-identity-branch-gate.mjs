import ts from "typescript";

const IDENTITY_FIELD_NAMES = new Set([
  "fixtureId",
  "subjectId",
  "assetId",
  "appearanceId",
  "appearanceType",
  "rowId",
  "label",
  "resRef",
  "resourceRef"
]);
const COMPARISON_OPERATORS = new Set([
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken
]);
const NAME_MATCH_METHODS = new Set(["includes", "startsWith", "endsWith"]);

export function findAssetIdentityBranchViolations({ sourceText, fileName, functionNames = null }) {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFor(fileName)
  );
  const violations = [];

  function visit(node, currentFunctionName = null) {
    const nextFunctionName = functionNameForNode(node) ?? currentFunctionName;
    const inScope = functionNames === null || functionNames.has(nextFunctionName);

    if (inScope && ts.isBinaryExpression(node) && COMPARISON_OPERATORS.has(node.operatorToken.kind)) {
      const identitySide = isIdentityExpression(node.left) || isIdentityExpression(node.right);
      const assetLiteral = assetIdentityLiteral(node.left) ?? assetIdentityLiteral(node.right);
      if (identitySide && assetLiteral) {
        violations.push(toViolation(sourceFile, node, `identity comparison against ${JSON.stringify(assetLiteral)}`));
      }
    }

    if (inScope && ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const methodName = node.expression.name.text;
      const receiver = node.expression.expression;
      if (
        NAME_MATCH_METHODS.has(methodName) &&
        isIdentityExpression(receiver) &&
        node.arguments.some((argument) => ts.isStringLiteralLike(argument))
      ) {
        violations.push(toViolation(sourceFile, node, `identity naming-pattern call .${methodName}(...)`));
      }
    }

    ts.forEachChild(node, (child) => visit(child, nextFunctionName));
  }

  visit(sourceFile);
  return violations;
}

export function findPythonAssetIdentityBranchViolations({ sourceText, fileName, functionName }) {
  const lines = sourceText.split(/\r?\n/u);
  const violations = [];
  let inFunction = false;
  let functionIndent = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const functionMatch = /^(\s*)def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/u.exec(line);
    if (functionMatch) {
      inFunction = functionMatch[2] === functionName;
      functionIndent = functionMatch[1].length;
      continue;
    }
    if (inFunction && line.trim() && leadingWhitespace(line) <= functionIndent) {
      inFunction = false;
    }
    if (!inFunction) continue;

    if (
      /\b(label|fixture_id|subject_id|asset_id|resref|resource_ref)\b.*(?:\bin\b|\.startswith\(|\.endswith\()/iu.test(line) ||
      /["'][^"']+["']\s+in\s+(?:label|fixture_id|subject_id|asset_id|resref|resource_ref)\b/iu.test(line) ||
      /re\.(?:search|match|fullmatch)\([^,]+,\s*(?:label|fixture_id|subject_id|asset_id|resref|resource_ref)\b/iu.test(line)
    ) {
      violations.push({
        fileName,
        line: index + 1,
        column: Math.max(1, line.search(/\S/u) + 1),
        reason: "identity naming-pattern branch"
      });
    }
  }

  return violations;
}

function functionNameForNode(node) {
  if (ts.isFunctionDeclaration(node) && node.name) return node.name.text;
  if (
    (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
    ts.isVariableDeclaration(node.parent) &&
    ts.isIdentifier(node.parent.name)
  ) {
    return node.parent.name.text;
  }
  if (ts.isMethodDeclaration(node) && node.name && ts.isIdentifier(node.name)) return node.name.text;
  return null;
}

function isIdentityExpression(node) {
  if (ts.isIdentifier(node)) return IDENTITY_FIELD_NAMES.has(node.text);
  if (ts.isPropertyAccessExpression(node)) return IDENTITY_FIELD_NAMES.has(node.name.text);
  if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) {
    return IDENTITY_FIELD_NAMES.has(node.argumentExpression.text);
  }
  return false;
}

function assetIdentityLiteral(node) {
  if (!ts.isStringLiteralLike(node)) return null;
  return /^(?:vfx[-_]|catalog[-_]|plc_|creature[-_]|tile[-_]|VFX_)/iu.test(node.text)
    ? node.text
    : null;
}

function toViolation(sourceFile, node, reason) {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return {
    fileName: sourceFile.fileName,
    line: position.line + 1,
    column: position.character + 1,
    reason
  };
}

function scriptKindFor(fileName) {
  if (fileName.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (fileName.endsWith(".ts")) return ts.ScriptKind.TS;
  if (fileName.endsWith(".jsx")) return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
}

function leadingWhitespace(line) {
  return /^\s*/u.exec(line)?.[0].length ?? 0;
}
