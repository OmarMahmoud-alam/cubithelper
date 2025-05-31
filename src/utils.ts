import * as vscode from 'vscode';

import * as fs from 'fs';

import * as path from 'path';




// Assume you have already set up the Dart LanguageClient somewhere in your extension
function getLineNumberFromOffset(text: string, offset: number) {
    // Get substring from start to offset
    const substring = text.slice(0, offset);

    // Count the number of newlines in substring
    const lines = substring.split('\n');

    // lineNumber is zero-based, so return lines.length - 1
    return lines.length - 1;
}

async function getVariableTypeInDartFile(variableName: string): Promise<string> {
    const content = document.getText();


    // Capturing group 2 = variable name
    const regex = new RegExp(
        // Start of line or whitespace, then
        // (type or keyword), whitespace(s), variableName, word boundary
        `(^|\\s)([a-zA-Z0-9_<>]+)\\s+${variableName}\\b`,
        'm' // multiline
    );

    const match = regex.exec(content);
    if (!match) {
        // variable not found, return dynamic as fallback
        return 'dynamic';
    }

    const typeOrKeyword = match[2];

    // If it's one of var/final/const, treat as dynamic
    if (['var', 'final', 'const'].includes(typeOrKeyword)) {
        return 'dynamic';
    }

    // Otherwise return the detected type (e.g., int, String, List<int>)
    return "typeOrKeyword";
}
export async function extractEmittedStates2(cubitContent: string, dd: vscode.TextDocument,): Promise<{ state: string; params: Array<{ name: string; value: string; lineNumber: number }> }[]> {
    // Remove comments to simplify parsing
    const cleanedContent = cubitContent.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');
    document = dd;
    // Extract variable type declarations from cubit content
    //  const variableTypes = extractVariableTypes(cleanedContent);

    // Improved regex to handle parameters with nested parentheses
    // This uses a non-greedy quantifier and properly balances parentheses
    const emitRegex = /emit\s*\(\s*([A-Za-z0-9_]+)\s*\(((?:[^()]|\([^()]*\))*)\)\s*\)/g;

    const states: Map<string, Array<{ name: string; value: string; lineNumber: number }>> = new Map();
    let match;

    while ((match = emitRegex.exec(cleanedContent)) !== null) {
        const stateName = match[1].trim();
        const rawParams = match[2].trim();
        const lineNumber = getLineNumberFromOffset(cleanedContent, match.index);

        const processedParams = processParameters(rawParams, lineNumber);
        states.set(stateName, processedParams);
    }

    return Array.from(states, ([state, params]) => ({ state, params }));
}
function processParameters(rawParams: string, lineNumber: number): Array<{ name: string; value: string, lineNumber: number }> {
    if (!rawParams) return [];

    return rawParams
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map((param, index) => {
            // Split named parameter into name and value, e.g. "error: 'value'"


            const isNamed = param.includes(':');
            let name = "";
            let value = "";
            if (isNamed) {
                [name, value] = splitNamedParameter(param);
            }
            else {
                if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(param)) {
                    name = param;
                    value = ""
                }
                else {
                    name = "";
                    value = param;
                }
            }
            return { name, value, lineNumber };
        });
}


/*f unction extractNameFromValue(value: string): string | null {
    // Try to extract variable name from expressions
    // Case 1: Just a variable name (error)
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
        return value;
    }

    // Case 2: Something like e.toString()
    const toStringMatch = value.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\.toString\(\)/);
    if (toStringMatch) {
        return toStringMatch[1] + 'Message';
    }

    // Case 3: Object property (obj.property)
    const propertyMatch = value.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (propertyMatch) {
        return propertyMatch[2];
    }

    return null;
} */
export let document: vscode.TextDocument;
function splitNamedParameter(param: string): [string, string] {
    // Handle named parameters with proper escaping for string literals
    // This allows for values like error: "some message"
    let inString = false;
    let quoteChar = '';
    let colonPos = -1;

    for (let i = 0; i < param.length; i++) {
        const char = param[i];

        // Toggle string state when we encounter quotes
        if ((char === '"' || char === "'") && (i === 0 || param[i - 1] !== '\\')) {
            if (!inString) {
                inString = true;
                quoteChar = char;
            } else if (char === quoteChar) {
                inString = false;
            }
        }

        // Only consider colons outside of strings
        if (char === ':' && !inString && colonPos === -1) {
            colonPos = i;
            break;
        }
    }

    if (colonPos === -1) return ['', param];

    return [
        param.slice(0, colonPos).trim(),
        param.slice(colonPos + 1).trim()
    ];
}



function inferParameterType(value: any,): string {
    if (!value) return 'dynamic';

    // Handle cases where value has .toString()
    if (value.endsWith(".toString()")) {
        return 'String';
    }

    // Handle exceptions like "e" which are likely exceptions
    if (/^[eE]$/.test(value.trim())) {
        return 'String'; // Assume exceptions are converted to strings
    }

    // Handle cases with double.parse(value) or double.tryParse(value)
    const doubleParseMatch = value.match(/double\.(parse|tryParse)\(([^)]+)\)/);
    if (doubleParseMatch) {
        return "double";
    }

    // Check for string literals
    if (/^["'].*["']$/.test(value)) return 'String';

    // Check for numbers
    if (/^-?\d+$/.test(value)) return 'int';
    if (/^-?\d+\.\d+$/.test(value)) return 'double';

    // Check for booleans
    if (/^true|false$/i.test(value)) return 'bool';

    // Check for lists/maps
    if (/^\[.*\]$/.test(value)) return 'List<dynamic>';
    if (/^\{.*\}$/.test(value)) return 'Map<String, dynamic>';

    // Check if value is a known variable
    // if (variableTypes.has(value)) return variableTypes.get(value)!;

    // Check for common variable names and assign likely types
    if (/error|exception|err/i.test(value)) return 'String';
    if (/id|count|index|size|length/i.test(value)) return 'int';
    if (/is[A-Z]|has[A-Z]|can[A-Z]|should/i.test(value)) return 'bool';
    if (/price|rate|amount/i.test(value)) return 'double';
    if (/name|title|message|text|desc/i.test(value)) return 'String';
    if (/date|time/i.test(value)) return 'DateTime';
    if (/list|items|results/i.test(value)) return 'List<dynamic>';
    if (/map|json|data/i.test(value)) return 'Map<String, dynamic>';

    // Fallback to dynamic if unknown
    return 'dynamic';
}

export function extractExistingStates(stateContent: string, stateBaseClassName: string): string[] {
    const escapedClassName = stateBaseClassName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const stateRegex = new RegExp(`class\\s+([a-zA-Z0-9_]+)\\s+extends\\s+${escapedClassName}`, 'g');

    const states = [];
    let match;
    while ((match = stateRegex.exec(stateContent)) !== null) {
        states.push(match[1]);
    }
    return states;
}
export function generateNewStates(
    missingStates: { state: string; params: Array<{ name: string; value: string, lineNumber: number }> }[],
    baseStateClassName: string
) {
    let code = '\n';
    console.log("missingStates", missingStates);

    missingStates.forEach(({ state: stateName, params }) => {
        // Infer variable types for each param (you can improve inferType if needed)
        // For simplicity, assume all params have type 'dynamic'
        // You can replace this with your own inferType logic if you want
        console.log("stateName", stateName);
        console.log("params", params);


        const fields = params
            .map(({ name, value, lineNumber }, index) => {
                let temptype = value;
                if (value.trim().length < 0) {
                    temptype = name;
                }
                const paramName = name && name.trim().length > 0 ? name : `param${index + 1}`;
                return `final ${inferParameterType(temptype)} ${paramName};`;
            })
            .join('\n  ');

        const constructorParamsWITHREQUIRED: typeof params = [];
        const constructorParamsWITHOUTREQUIRED: typeof params = [];

        params.forEach(p => {
            const hasName = p.name.trim().length > 0;
            const hasValue = p.value.trim().length > 0;

            if (hasName && hasValue) {
                constructorParamsWITHREQUIRED.push(p);
            } else {
                constructorParamsWITHOUTREQUIRED.push(p);
            }
        });

        const constructorParamsWITHREQUIREDFINAL = constructorParamsWITHREQUIRED.map(({ name }) => `required this.${name}`).join(', ');
        const constructorParamsWithoutRequiredFinal = constructorParamsWITHOUTREQUIRED
            .map(({ name }, index) => {
                let paramName = name?.trim();

                // If name is missing or empty, fallback to param{index+1}
                if (!paramName || paramName.length === 0) {
                    paramName = `param${index + 1}`;
                }

                return `this.${paramName}`;
            })
            .join(', ');



        if (params.length <= 0) {
            code += `
    class ${stateName} extends ${baseStateClassName} {}
    `;


        }
        else if (constructorParamsWITHREQUIRED.length > 0 && constructorParamsWITHOUTREQUIRED.length > 0) {
            code += `
  class ${stateName} extends ${baseStateClassName} {
    ${fields}
  
    ${stateName}(${constructorParamsWithoutRequiredFinal},{${constructorParamsWITHREQUIREDFINAL}});
  }
  `;
        }
        else if (constructorParamsWITHREQUIRED.length <= 0 && constructorParamsWITHOUTREQUIRED.length > 0) {
            code += `
  class ${stateName} extends ${baseStateClassName} {
    ${fields}
  
    ${stateName}(${constructorParamsWithoutRequiredFinal});
  }
  `;
        }
        else if (constructorParamsWITHREQUIRED.length > 0 && constructorParamsWITHOUTREQUIRED.length <= 0) {
            code += `
  class ${stateName} extends ${baseStateClassName} {
    ${fields}
  
    ${stateName}({${constructorParamsWITHREQUIREDFINAL}});
  }
  `;
        }

    });

    return code;
}



// Simple type inference from variable value string
function inferType(value: string) {
    if (!value) return 'dynamic';

    value = value.trim();

    // Check for int
    if (/^\d+$/.test(value)) {
        return 'int';
    }

    // Check for String literal
    if (/^["'].*["']$/.test(value)) {
        return 'String';
    }

    // Check if looks like a constructor call, e.g. ReadMoreDataModel(e: e, s: s)
    const constructorMatch = value.match(/^([a-zA-Z0-9_]+)\(/);
    if (constructorMatch) {
        return constructorMatch[1]; // Return the class name
    }

    // fallback
    return 'dynamic';
}


export async function findStateFile(cubitFilePath: string): Promise<string | null> {
    const cubitDir = path.dirname(cubitFilePath);
    const cubitFileName = path.basename(cubitFilePath, '.dart');

    // Try to find a file that follows naming conventions first
    const possibleStateFileNames = [
        `${cubitFileName.replace('_cubit', '')}_state.dart`,
        `${cubitFileName}_state.dart`,
        cubitFileName.replace('cubit', 'state') + '.dart'
    ];

    for (const fileName of possibleStateFileNames) {
        const filePath = path.join(cubitDir, fileName);
        if (fs.existsSync(filePath)) {
            return filePath;
        }
    }

    // Fallback: check any dart file in the same directory
    const files = fs.readdirSync(cubitDir);
    for (const file of files) {
        if (file.endsWith('.dart') && file !== path.basename(cubitFilePath)) {
            const filePath = path.join(cubitDir, file);
            const content = fs.readFileSync(filePath, 'utf8');

            // Check if this file contains the state class
            if (content.includes('abstract class') || content.includes('sealed class')) {
                return filePath;
            }
        }
    }

    return null;
}
export async function createMVVMFolderStructure(basePath: string) {
    const foldersToCreate = [
        path.join(basePath, 'data'),
        path.join(basePath, 'data', 'repo'),
        path.join(basePath, 'data', 'model'),
        path.join(basePath, 'representative'),
        path.join(basePath, 'representative', 'view'),
        path.join(basePath, 'representative', 'view', 'screen'),
        path.join(basePath, 'representative', 'view', 'widget'),
        path.join(basePath, 'representative', 'view_model')
    ];

    for (const folder of foldersToCreate) {
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }
    }
}
