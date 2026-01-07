// The extension imports are optional for the web app build; silence TS when vscode types not present
// @ts-ignore: vscode types are only available in VS Code extension environment
import * as vscode from 'vscode';

const COPILOT_ID = 'GitHub.copilot-chat';
const GEMINI_ID = 'google.geminicodeassist';

// คำสั่งที่เป็นไปได้จากรายการที่คุณให้มา (เรียงลำดับความสำคัญ)
const COPILOT_COMMANDS = [
  'github.copilot.chat.generate',
  'github.copilot.chat.explain', // ใส่ prompt เป็น arg อาจไม่รองรับ แต่จะลอง
  'github.copilot.chat.showAsChatSession',
  'github.copilot.chat.openModelPicker',
  'github.copilot.chat.startCopilotDebugCommand',
];

const GEMINI_COMMANDS = [
  'geminicodeassist.chat.new',
  'geminicodeassist.chat.resume',
  'geminicodeassist.chat.fork',
  'geminicodeassist.generateCode',
  'geminicodeassist.showinEditor',
  'cloudcode.duetAI.actionsMenu', // generic menu command
];

// ชื่อ method candidates ที่อาจถูก export โดย extension
const API_METHOD_CANDIDATES = [
  'sendPrompt',
  'handlePrompt',
  'createChat',
  'sendMessage',
  'ask',
  'chat',
];

export async function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('aiMediator.sendToAIs', async () => {
      const prompt = await vscode.window.showInputBox({
        prompt: 'ข้อความที่จะส่งให้ Gemini & Copilot',
      });
      if (!prompt) {
        return;
      }

      vscode.window.showInformationMessage(
        'AI Mediator: กำลังพยายามส่ง prompt ให้ Copilot และ Gemini (ดู console สำหรับผล)',
      );

      // 1) Try exported APIs
      await tryCallExtensionApi(COPILOT_ID, prompt);
      await tryCallExtensionApi(GEMINI_ID, prompt);

      // 2) Try executing known commands (with prompt arg)
      await tryExecuteCommandsArray(COPILOT_COMMANDS, prompt);
      await tryExecuteCommandsArray(GEMINI_COMMANDS, prompt);

      // 3) If nothing accepted prompt, fallback: open chat UIs and put prompt to clipboard for manual paste
      await fallbackOpenAndClipboard(COPILOT_ID, COPILOT_COMMANDS, prompt);
      await fallbackOpenAndClipboard(GEMINI_ID, GEMINI_COMMANDS, prompt);

      vscode.window.showInformationMessage(
        'AI Mediator: เสร็จสิ้นการพยายามส่ง prompt — ตรวจสอบ console/log เพื่อดูรายละเอียด',
      );
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('aiMediator.listAICommands', async () => {
      const all = await vscode.commands.getCommands(true);
      const filtered = all.filter((c: any) => /copilot|gemini|duet|cloudcode|gemini/i.test(c));
      vscode.window.showInformationMessage(
        `พบ ${filtered.length} คำสั่งที่เกี่ยวข้อง (ดู console)`,
      );
      console.log('=== AI-related commands ===');
      console.log(filtered.join('\n'));
    }),
  );

  console.log('AI Mediator activated. Commands: aiMediator.sendToAIs, aiMediator.listAICommands');
}

async function tryCallExtensionApi(extId: string, prompt: string) {
  const ext = vscode.extensions.getExtension(extId);
  if (!ext) {
    console.log(`(API) Extension ${extId} not installed.`);
    return false;
  }
  try {
    const api = await ext.activate();
    if (!api) {
      console.log(`(API) ${extId} activated but returned no exports.`);
      return false;
    }
    for (const name of API_METHOD_CANDIDATES) {
      if (typeof api[name] === 'function') {
        try {
          await api[name](prompt);
          console.log(`(API) Called ${extId}.exports.${name} successfully.`);
          return true;
        } catch (err) {
          console.warn(`(API) Calling ${extId}.exports.${name} failed:`, err);
        }
      }
    }
    console.log(`(API) No known export method found on ${extId}.`);
  } catch (err) {
    console.warn(`(API) Activating ${extId} failed:`, err);
  }
  return false;
}

async function tryExecuteCommandsArray(commands: string[], prompt: string) {
  const all = await vscode.commands.getCommands(true);
  for (const cmd of commands) {
    if (all.includes(cmd)) {
      try {
        // many chat commands may accept arguments but many do not — we still try
        await vscode.commands.executeCommand(cmd, prompt);
        console.log(`(CMD) Executed ${cmd} with prompt.`);
        return true;
      } catch (err) {
        console.warn(`(CMD) Execute ${cmd} failed:`, err);
        try {
          // try without args
          await vscode.commands.executeCommand(cmd);
          console.log(`(CMD) Executed ${cmd} without args (opened UI).`);
          return true;
        } catch (err2) {
          console.warn(`(CMD) Execute ${cmd} without args failed too:`, err2);
        }
      }
    } else {
      // command not present — skip
    }
  }
  console.log('(CMD) No candidate command executed from list.');
  return false;
}

async function fallbackOpenAndClipboard(extId: string, commands: string[], prompt: string) {
  // ถ้าเปิด UI ได้ จะเขียน prompt ลง clipboard และแจ้งให้ผู้ใช้วาง (paste) ใน chat input
  const all = await vscode.commands.getCommands(true);
  let opened = false;
  for (const cmd of commands) {
    if (all.includes(cmd)) {
      try {
        await vscode.commands.executeCommand(cmd);
        console.log(`(FB) Opened UI via ${cmd}`);
        opened = true;
        break;
      } catch (err) {
        console.warn(`(FB) Open ${cmd} failed:`, err);
      }
    }
  }
  if (opened) {
    try {
      await vscode.env.clipboard.writeText(prompt);
      vscode.window.showInformationMessage(
        'AI Mediator: ใส่ prompt ลง clipboard แล้ว — ให้ไปวาง (Ctrl+V) ในช่อง chat ของ AI ที่เปิดไว้',
      );
      console.log('(FB) Wrote prompt to clipboard as fallback.');
    } catch (err) {
      console.warn('(FB) Failed to write clipboard:', err);
    }
  } else {
    console.log(`(FB) Could not open UI for ${extId} via candidate commands.`);
  }
}

export function deactivate() {}
