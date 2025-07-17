import fs from 'fs';
import path from 'path';
import * as vscode from 'vscode';

const getConfigPath = () => {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error('No workspace folder found. Please open a project folder in Cursor.');
  }
  return path.join(workspaceFolder.uri.fsPath, '.autopilot.json');
};

const getCursorRulePath = () => {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error('No workspace folder found. Please open a project folder in Cursor.');
  }
  return path.join(workspaceFolder.uri.fsPath, '.cursor', 'rules', 'after_each_chat.mdc');
};

const defaultConfig = {
  enabled: true,
  adapters: ['telegram'],
  
  telegram: {
    token: 'YOUR_BOT_TOKEN_HERE',
    chatId: 'YOUR_CHAT_ID_HERE'
  },
  
  email: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: 'your-email@gmail.com',
    pass: 'your-app-password',
    to: 'recipient@example.com'
  },
  
  feishu: {
    appId: 'cli_xxxxxxxxxxxxxxxxx',
    appSecret: 'your_app_secret_here',
    useWebhook: false
  }
};

const cursorRuleContent = `---
alwaysApply: true
---

At the end of each chat, save a JSON file with:

Path: ./tmp/summary-\${{date:YYYYMMDD-HHmmss}}.json

Fields:

summary: What was done in this chat

current_status: What's completed and what's left to do`;

const ensureConfigFile = () => {
  try {
    const configPath = getConfigPath();
    
    if (!fs.existsSync(configPath)) {
      console.log('[Autopilot] Creating missing .autopilot.json configuration...');
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      console.log('[Autopilot] Created .autopilot.json at:', configPath);
      return true;
    } else {
      console.log('[Autopilot] .autopilot.json already exists at:', configPath);
      return false;
    }
  } catch (error) {
    console.error('[Autopilot] Error ensuring config file:', error);
    return false;
  }
};

const ensureCursorRule = () => {
  try {
    const rulePath = getCursorRulePath();
    const ruleDir = path.dirname(rulePath);
    
    // Create .cursor/rules directory if it doesn't exist
    if (!fs.existsSync(ruleDir)) {
      fs.mkdirSync(ruleDir, { recursive: true });
      console.log('[Autopilot] Created .cursor/rules directory');
    }
    
    // Check if rule file exists and has correct content
    let needsUpdate = false;
    
    if (!fs.existsSync(rulePath)) {
      console.log('[Autopilot] Creating missing .cursor/rules/after_each_chat.mdc...');
      needsUpdate = true;
    } else {
      // Check if content is correct
      const existingContent = fs.readFileSync(rulePath, 'utf8');
      if (existingContent.trim() !== cursorRuleContent.trim()) {
        console.log('[Autopilot] Updating .cursor/rules/after_each_chat.mdc with correct content...');
        needsUpdate = true;
      } else {
        console.log('[Autopilot] .cursor/rules/after_each_chat.mdc already exists with correct content');
      }
    }
    
    if (needsUpdate) {
      fs.writeFileSync(rulePath, cursorRuleContent);
      console.log('[Autopilot] Updated Cursor rule file:', rulePath);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[Autopilot] Error ensuring Cursor rule:', error);
    return false;
  }
};

export const load = () => {
  try {
    console.log('[Autopilot] Checking workspace files...');
    
    // Always check and ensure both files exist
    const configCreated = ensureConfigFile();
    const ruleCreated = ensureCursorRule();
    
    // Show notification if any files were created or updated
    if (configCreated || ruleCreated) {
      let message = 'Cursor Autopilot: ';
      const actions: string[] = [];
      
      if (configCreated) {
        message += 'Created .autopilot.json configuration file. ';
        actions.push('Open Config');
      }
      
      if (ruleCreated) {
        message += 'Created/Updated .cursor/rules/after_each_chat.mdc rule file. ';
        actions.push('Open Rule');
      }
      
      message += 'Files are ready for use.';
      
      vscode.window.showInformationMessage(message, ...actions).then(selection => {
        if (selection === 'Open Config') {
          const configPath = getConfigPath();
          vscode.workspace.openTextDocument(configPath).then(doc => {
            vscode.window.showTextDocument(doc);
          });
        } else if (selection === 'Open Rule') {
          const rulePath = getCursorRulePath();
          vscode.workspace.openTextDocument(rulePath).then(doc => {
            vscode.window.showTextDocument(doc);
          });
        }
      });
    } else {
      console.log('[Autopilot] All required files are present and correct');
    }
    
    // Load and return configuration
    const configPath = getConfigPath();
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('[Autopilot] Configuration loaded successfully');
    return config;
    
  } catch (error) {
    console.error('[Autopilot] Error loading configuration:', error);
    vscode.window.showErrorMessage(`Cursor Autopilot: Failed to load configuration - ${error}`);
    return defaultConfig;
  }
};

export const save = (obj: any) => {
  try {
    const configPath = getConfigPath();
    fs.writeFileSync(configPath, JSON.stringify(obj, null, 2));
    console.log('[Autopilot] Configuration saved to:', configPath);
  } catch (error) {
    console.error('[Autopilot] Error saving config:', error);
    vscode.window.showErrorMessage(`Failed to save configuration: ${error}`);
  }
};
