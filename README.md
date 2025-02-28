# CubitHelper VS Code Extension

The CubitHelper extension for Visual Studio Code provides tools to streamline the development process for Flutter applications using the Cubit state management library. This extension helps with creating Cubit classes, synchronizing emitted states with state files, and setting up MVVM folder structures.

## 0.0.3

1. **what's new?**:
   -  fix bugs
   -  install variable inside it 
   
## Features

1. **Create Cubit Class**:
   - Generates a new Cubit class along with a corresponding state file.
   - The class and state files are created in a user-specified folder within the workspace.

2. **Synchronize Cubit States**:
   - Extracts emitted states from the currently active Cubit class.
   - Updates the state file with any missing states based on the emitted states.

3. **Create MVVM Folder Structure**:
   - Automatically generates a folder structure for MVVM architecture.

## Commands

### `cubithelper.createCubit`

Creates a new folder and generates two Dart files: a Cubit file and a State file. The folder and file names are based on user input.

#### Usage

1. Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS).
2. Search for `CubitHelper: Create Cubit` and select it.
3. Enter the desired folder name when prompted.

### `cubithelper.syncCubitStates`

Synchronizes the states in a Cubit class with the state file. It adds any missing states to the state file.

#### Usage

1. Open the Dart file containing the Cubit class in the editor.
2. Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS).
3. Search for `CubitHelper: Sync Cubit States` and select it.

### `cubithelper.createMVVMFolder`

Creates an MVVM folder structure at the specified location.

#### Usage

1. Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS).
2. Search for `CubitHelper: Create MVVM Folder` and select it.
3. Choose the folder where you want to create the MVVM structure.

## Requirements

- [Visual Studio Code](https://code.visualstudio.com/) - Ensure you have VS Code installed.
- [Flutter](https://flutter.dev/) - This extension assumes you are working with Flutter projects.

## Installation

1. Open VS Code.
2. Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X` on macOS).
3. Search for `CubitHelper` and install it.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request if you have suggestions or improvements.
