import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  extractEmittedStates2, extractExistingStates, generateNewStates, createMVVMFolderStructure, findStateFile,
} from './utils';

export function activate(context: vscode.ExtensionContext) {

  let disposable = vscode.commands.registerCommand('cubithelper.createCubitFolder', async (uri: vscode.Uri) => {
    // Prompt user for the folder name
    const folderName = await vscode.window.showInputBox({ prompt: 'Enter the folder name' });

    if (!folderName) {
      vscode.window.showErrorMessage('Folder name cannot be empty');
      return;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace folder is open');
      return;
    }
    const folderName2 = filename(folderName);
    const workspaceFolder = workspaceFolders[0].uri.fsPath;
    const folderPath = path.join(uri.fsPath, folderName);
    const folderPath2 = path.join(uri.fsPath, folderName2);

    // Create folder
    if (!fs.existsSync(folderName2)) {
      fs.mkdirSync(folderName2);
    }

    // Create files with content
    const cubitFileName = `${folderName2}_cubit.dart`;
    const stateFileName = `${folderName2}_state.dart`;

    const cubitContent = `
import 'package:bazaid/core/model.dart';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
part '${stateFileName}';

class ${capitalize(folderName)}Cubit extends Cubit<${capitalize(folderName)}State> {
  ${capitalize(folderName)}Cubit() : super(${capitalize(folderName)}Initial());
  static ${capitalize(folderName)}Cubit of(BuildContext context) =>
      BlocProvider.of<${capitalize(folderName)}Cubit>(context);

  final ScrollController ${folderName}scrollController = ScrollController();
  late PaginationState<OneExam> paginationmodel;
  late String courseid;
  List<OneExam>? onetimeexamlist;
  @override
  Future<void> close() {
    ${folderName}scrollController.removeListener(onscroll);
    return super.close();
  }

  void fetch${folderName}Data() async {
    emit(Fetch${folderName}DataLoading());
    //  final res = await examscrollsocialQuestion(); 
    final res = await ExamRepo.fetchexam();

    res.fold(
      (err) {
        emit(Fetch${folderName}DatabFail());
      },
      (res) async {
        paginationmodel = PaginationState(
          data: res.data!,
          status: PaginationStatus.listener,
          currentpage: 1,
          limit: 30,
          totalpage: res.meta!.lastPage!,
          total: res.meta!.total!,
        );
        emit(FetchData${folderName}Success());
        ${folderName}scrollController.addListener(onscroll);
      },
    );
  }

  Future<void> fetchMore${folderName}data() async {
    if (!paginationmodel.canloadmore) {
      return;
    }
    emit(FetchMoreDataloading());

    paginationmodel.status = PaginationStatus.paginating;
    paginationmodel.currentpage++;
    final res = await ExamRepo.fetchexam(page: paginationmodel.currentpage);
    res.fold(
      (err) {
        paginationmodel.status = PaginationStatus.error;
        paginationmodel.currentpage--;
       
        emit(FetchMore${folderName}Datafail());
      },
      (res) async {
        paginationmodel.status = PaginationStatus.listener;
        paginationmodel.data.addAll(res.data!);
        emit(FetchMore${folderName}DataSuccess());
      },
    );
  }

  void onscroll() {
    if (${folderName}scrollController.position.pixels >=
        ${folderName}scrollController.position.maxScrollExtent - 100) {
      fetchMore${folderName}data();
    }
  }
}
`;

    const stateContent = `
part of '${folderName2}_cubit.dart';

sealed class ${capitalize(folderName)}State {}

final class ${capitalize(folderName)}Initial extends ${capitalize(folderName)}State {}




final class FetchDataLoading extends ${capitalize(folderName)}State {}

final class FetchDatabFail extends ${capitalize(folderName)}State {}

final class FetchDataSuccess extends ${capitalize(folderName)}State {}

final class FetchMoreDataloading extends ${capitalize(folderName)}State {}

final class FetchMoreDatafail extends ${capitalize(folderName)}State {}

final class FetchMoreDataSuccess extends ${capitalize(folderName)}State {}
`;

    fs.writeFileSync(path.join(folderPath2, cubitFileName), cubitContent.trim());
    fs.writeFileSync(path.join(folderPath2, stateFileName), stateContent.trim());

    vscode.window.showInformationMessage(`Created folder '${folderName}' with files '${cubitFileName}' and '${stateFileName}'.`);
  });
  let syncCubitStatesCommand = vscode.commands.registerCommand('cubithelper.syncCubitStates', async () => {

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found!');
      return;
    }

    const document = editor.document;
    // Match the state class name from the Cubit class declaration
    const cubitClassMatch = document.getText().match(/class\s+(\w+Cubit)\s+extends\s+Cubit<(\w+)>/); if (!cubitClassMatch) {
      vscode.window.showErrorMessage('No Cubit class found in the current file!');
      return;
    }

    // Extract the state base class name (e.g. "CounterState" from "Cubit<CounterState>")
    const cubitClassName = cubitClassMatch[1];
    const stateBaseClassName = cubitClassMatch[2];
    const stateFilePath = await findStateFile(document.fileName);
    if (!stateFilePath) {
      vscode.window.showErrorMessage('Corresponding state file not found!');
      return;
    }


    const stateFileContent = fs.readFileSync(stateFilePath, 'utf8');
    const emittedStates = await extractEmittedStates2(document.getText(), document);
    const existingStates = extractExistingStates(stateFileContent, stateBaseClassName);

    const missingStates = emittedStates.filter(state => !existingStates.includes(state["state"]));
    if (missingStates.length === 0) {
      vscode.window.showInformationMessage('All emitted states are already defined.');
      return;
    }

    const newStateContent = generateNewStates(missingStates, stateBaseClassName);

    fs.appendFileSync(stateFilePath, newStateContent, 'utf8');
    vscode.window.showInformationMessage(`Added missing states to ${stateFilePath}`);
  });
  let mvvmfolder = vscode.commands.registerCommand('cubithelper.createMVVMFolder', async (uri: vscode.Uri) => {
    if (uri && uri.fsPath) {
      try {
        // Create folder structure
        await createMVVMFolderStructure(uri.fsPath);
        vscode.window.showInformationMessage('MVVM folder structure created successfully!');
      } catch (error) {
        vscode.window.showErrorMessage(`Error creating folder structure: ${error}`);
      }
    }
  });
  context.subscriptions.push(disposable);
  context.subscriptions.push(syncCubitStatesCommand);
  context.subscriptions.push(mvvmfolder);

}

export function deactivate() { }

// Helper function to capitalize the first letter
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function filename(input: string): string {
  return input
    .replace(/([a-z])([A-Z])/g, '$1_$2')  // Insert underscore before each uppercase letter
    .replace(/\s+/g, '_')                 // Replace spaces with underscores (if any)
    .toLowerCase();                       // Convert the entire string to lowercase
}
function snakeCase(text: string): string {
  return text
    .replace(/([A-Z])/g, '_$1')     // Add underscore before capitals
    .replace(/^_/, '')               // Remove leading underscore
    .toLowerCase();                  // Convert to lowercase
}