import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { writeFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
const __dirname = fileURLToPath(new URL("data:application/octet-stream;base64,", import.meta.url));
let mainWindow;
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, "../dist/index.html"));
  }
};
app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
ipcMain.handle("select-directory", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"]
  });
  return result.filePaths[0];
});
ipcMain.handle("save-logs", async (event, { content, filename, directory }) => {
  try {
    const filePath = join(directory, filename);
    await writeFile(filePath, content);
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
