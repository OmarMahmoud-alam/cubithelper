import * as vscode from 'vscode';

import * as fs from 'fs';
import * as path from 'path';

export function extractEmittedStates(cubitContent: string): string[] {
    // Remove single-line and multi-line comments before processing
    const cleanedContent = cubitContent.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');

    // Match emit(StateName());
    const emitRegex = /emit\s*\(\s*([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\)/g;

    const states = new Set<string>(); // Use Set to store unique values

    let match;
    while ((match = emitRegex.exec(cleanedContent)) !== null) {
        states.add(match[1]); // Automatically avoids duplicates
    }

    return Array.from(states); // Convert Set back to array
}/*
export function extractEmittedStates2(cubitContent: string): { state: string; params: string }[] {
    // Remove single-line and multi-line comments before processing
    const cleanedContent = cubitContent.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');

    // Match emit(StateName(...)) where (...) can be empty or contain arguments
    const emitRegex = /emit\s*\(\s*([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*\)/g;

    const states = new Map<string, string>(); // Use a Map to store unique state names and parameters

    let match;
    while ((match = emitRegex.exec(cleanedContent)) !== null) {
        const stateName = match[1].trim(); // Extract state name
        const params = match[2].trim(); // Extract parameters inside ()

        states.set(stateName, params); // Store unique state with parameters
    }

    // Convert Map to an array of objects
    return Array.from(states, ([state, params]) => ({ state, params }));
}
*/export function extractEmittedStates2(cubitContent: string): { state: string; params: string }[] {
    // Remove single-line and multi-line comments before processing
    const cleanedContent = cubitContent.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');

    // Match emit(StateName(...)) where (...) can contain values, variables, or be empty
    const emitRegex = /emit\s*\(\s*([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*\)/g;

    const states = new Map<string, string>(); // Store unique state names and parameters

    let match;
    while ((match = emitRegex.exec(cleanedContent)) !== null) {
        const stateName = match[1].trim(); // Extract state name
        const rawParams = match[2].trim(); // Extract parameters inside ( ... )

        // Process parameters correctly
        const paramList = rawParams
            ? rawParams.split(",").map(param => {
                param = param.trim();

                // Check if param is a string, number, or a variable
                let type: string;
                let tempname: string=`param${Math.random().toString(36).substring(7)}`;
                if (/^".*"$/.test(param) || /^'.*'$/.test(param)) {
                    type = "String"; // It's a string
                } else if (/^\d+$/.test(param)) {
                    type = "int"; // It's an integer
                } else if (/^\d+\.\d+$/.test(param)) {
                    type = "double"; // It's a floating-point number
                } else {
                    tempname=param;
                    type = "dynamic"; // It's a variable, assume dynamic
                }

                return { type, name: tempname }; // Generate unique param name
            })
            : [];

        // Convert parameters into a string format like "String message"
        const paramString = paramList.map(({ type, name }) => `${type} ${name}`).join(", ");

        states.set(stateName, paramString); // Store state with inferred types
    }

    // Convert Map to an array of objects
    return Array.from(states, ([state, params]) => ({ state, params }));
}
export function extractExistingStates(stateContent: string, stateBaseClassName: string): string[] {
    const stateRegex = new RegExp(`class\\s+([a-zA-Z0-9_]+)\\s+extends\\s+${stateBaseClassName}`, 'g');
    const states = [];
    let match;
    while ((match = stateRegex.exec(stateContent)) !== null) {
        states.push(match[1]);
    }
    return states;
}
/*
export function generateNewStates(states: string[], stateBaseClassName: string): string {
    return states.map(state => `
final class ${state} extends ${stateBaseClassName} {}`).join('\n');
}*/
export function generateNewStates(states: { state: string; params: string }[], stateBaseClassName: string): string {
    return states.map(({ state, params }) => {
        // Parse the parameter list into field declarations and constructor parameters
        const paramList = params
            ? params.split(",").map(param => {
                // Extract type and name dynamically (e.g., from "String message" or "message")
                let [type, name] = param.trim().split(/\s+/);
                
                // If no type is given (e.g., "message"), set a default type (we'll infer later)
                if (!name) {
                    name = type;
                    type = "dynamic"; // Default type if unknown
                }

                return { type, name };
            })
            : [];

        // Generate class fields (only if there are params)
        const fields = paramList.length
            ? paramList.map(({ type, name }) => `  final ${type} ${name};`).join("\n")
            : "";

        // Generate constructor (only if there are params)
        const constructor = paramList.length
            ? `  ${state}(${paramList.map(({ name }) => ` this.${name}`).join(", ")});`
            : "";

        // If no fields or constructor, return an empty class definition
        return paramList.length > 0
            ? `class ${state} extends ${stateBaseClassName} {\n${fields}\n\n  ${constructor}\n}`
            : `class ${state} extends ${stateBaseClassName} {}`;
    }).join('\n\n');
}

export async function findStateFile(cubitFilePath: string): Promise<string | null> {
    const cubitDir = path.dirname(cubitFilePath);
    const files = fs.readdirSync(cubitDir);
    for (const file of files) {
        if (path.join(cubitDir, file) === cubitFilePath) { 
            continue;
        }
        
        if (file.endsWith('.dart')) {
            return path.join(cubitDir, file);
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
 