// const vscode = require('vscode');
const os = require('os');
const path = require('path');
const fs = require('fs');

function getStoragePath() {
  // 首先检查用户是否在设置中指定了路径
  // const config = vscode.workspace.getConfiguration('cursorFakeMachine');
  // const customPath = config.get('storagePath');

  // if (customPath && fs.existsSync(customPath)) {
  //     return customPath;
  // }

  // 如果没有指定或路径无效，使用默认路径
  const platform = os.platform();
  let basePath;

  switch (platform) {
    case 'win32':
      basePath = path.join(
        os.homedir(),
        'AppData',
        'Roaming',
        'Cursor',
        'User',
        'globalStorage'
      );
      break;
    case 'darwin':
      basePath = path.join(
        os.homedir(),
        'Library',
        'Application Support',
        'Cursor',
        'User',
        'globalStorage'
      );
      break;
    case 'linux':
      basePath = path.join(
        os.homedir(),
        '.config',
        'Cursor',
        'User',
        'globalStorage'
      );
      break;
    default:
      throw new Error('不支持的操作系统');
  }

  return path.join(basePath, 'storage.json');
}

function modifyMacMachineId() {
  try {
    const storagePath = getStoragePath();

    // 检查文件是否存在
    if (!fs.existsSync(storagePath)) {
      throw new Error(`文件不存在: ${storagePath}`);
    }

    // 读取文件
    let data = JSON.parse(fs.readFileSync(storagePath, 'utf8'));

    // 获取用户配置的 machineId 或生成随机 ID
    // const config = vscode.workspace.getConfiguration('cursorFakeMachine');
    // const customMachineId = config.get('customMachineId');
    const newMachineId = generateRandomMachineId();

    data['telemetry.macMachineId'] = newMachineId;

    // 写回文件
    fs.writeFileSync(storagePath, JSON.stringify(data, null, 2), 'utf8');

    return {
      success: true,
      message: '已成功修改 telemetry.macMachineId',
      newId: newMachineId,
      path: storagePath,
    };
  } catch (error) {
    throw new Error(`修改失败: ${error.message}`);
  }
}

function generateRandomMachineId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function activate(context) {
  // let disposable = vscode.commands.registerCommand('cursor-fake-machine.cursor-fake-machine', async function () {
  try {
    const result = modifyMacMachineId();
    console.log(
      `修改成功！\n路径: ${result.path}\n新的 machineId: ${result.newId}`
    );
  } catch (error) {
    // vscode.window.showErrorMessage(`修改失败: ${error.message}`);
    console.log('====================================');
    console.log(error);
    console.log('====================================');
    // 如果是路径不存在的错误，提示用户设置路径
    if (error.message.includes('不存在')) {
      console.log('====================================');
      console.log('路径不存在');
      console.log('====================================');
      // const answer = await vscode.window.showQuestionMessage(
      //     '是否要打开设置页面指定 storage.json 的路径？',
      //     '是',
      //     '否',
      // );
      // if (answer === '是') {
      //     vscode.commands.executeCommand('workbench.action.openSettings', 'cursorFakeMachine.storagePath');
      // }
    }
  }
  // });

  // context.subscriptions.push(disposable);
}

// function deactivate() {}
activate();
// module.exports = {
//   activate,
//   deactivate,
// };
