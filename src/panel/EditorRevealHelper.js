/*******************************************************************************
 * Copyright: SELab.AI (c) 2026
 *******************************************************************************/

const vscode = require('vscode');

function revealRangeInEditor(document, range) {
    const editor = vscode.window.visibleTextEditors.find(
        (candidate) => candidate.document.uri.toString() === document.uri.toString()
    ) || vscode.window.activeTextEditor;

    const targetEditorPromise = editor
        ? Promise.resolve(editor)
        : vscode.window.showTextDocument(document, {
            preserveFocus: true,
            viewColumn: vscode.ViewColumn.One,
        });

    void targetEditorPromise.then((resolvedEditor) => {
        if (!resolvedEditor) {
            return;
        }
        resolvedEditor.selection = new vscode.Selection(range.start, range.end);
        resolvedEditor.revealRange(range, vscode.TextEditorRevealType.InCenter);

        const decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
            border: '1px solid',
            borderColor: new vscode.ThemeColor('editor.findMatchBorder'),
            rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
        });
        resolvedEditor.setDecorations(decorationType, [range]);
        setTimeout(() => decorationType.dispose(), 1500);
    });
}

function revealNameInEditor(document, name) {
    const text = document.getText();
    const escapedName = String(name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const blockPattern = new RegExp(
        `^\\s*(?:part\\s+def|part|port\\s+def|port|attribute|package)\\b[^\\n]*?\\b${escapedName}\\b`,
        'mi'
    );
    const match = blockPattern.exec(text) || new RegExp(`\\b${escapedName}\\b`, 'i').exec(text);
    if (!match) {
        console.log('[revealNameInEditor] could not locate name in source:', name);
        return;
    }

    const start = document.positionAt(match.index);
    const end = document.positionAt(match.index + String(name || '').length);
    revealRangeInEditor(document, new vscode.Range(start, end));
}

module.exports = {
    revealRangeInEditor,
    revealNameInEditor,
};
