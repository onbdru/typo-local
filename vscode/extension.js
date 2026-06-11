const vscode = require('vscode');
const Typograf = require('./core/typograf');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  let disposable = vscode.commands.registerCommand('local-typograf.format', function () {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const document = editor.document;
    const config = vscode.workspace.getConfiguration('local-typograf');
    
    // Create options object from VS Code settings
    const options = {
      primaryQuotes: config.get('primaryQuotes', 'laquo_raquo'),
      secondaryQuotes: config.get('secondaryQuotes', 'bdquo_ldquo'),
      outputFormat: config.get('outputFormat', 'raw'),
      insertLineBreaks: config.get('insertLineBreaks', false),
      wrapParagraphs: config.get('wrapParagraphs', false),
      removeTabs: config.get('removeTabs', false),
      punctuationSpaces: config.get('punctuationSpaces', true),
      cleanAfterScan: config.get('cleanAfterScan', false)
    };

    const typograf = new Typograf(options);

    editor.edit((editBuilder) => {
      const selections = editor.selections;

      // Check if there is any selection that is not empty
      const hasSelection = selections.some(s => !s.isEmpty);

      if (hasSelection) {
        // Format each selection
        selections.forEach(selection => {
          if (!selection.isEmpty) {
            const text = document.getText(selection);
            const formatted = typograf.process(text);
            editBuilder.replace(selection, formatted);
          }
        });
      } else {
        // Format entire document
        const lastLine = document.lineCount - 1;
        const lastLineLen = document.lineAt(lastLine).text.length;
        const entireRange = new vscode.Range(0, 0, lastLine, lastLineLen);
        const text = document.getText(entireRange);
        const formatted = typograf.process(text);
        editBuilder.replace(entireRange, formatted);
      }
    }).then(success => {
      if (success) {
        vscode.window.showInformationMessage('Текст успешно отформатирован типографом.');
      }
    });
  });

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
