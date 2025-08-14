const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (updates) => ipcRenderer.invoke('update-config', updates),
  testNotification: () => ipcRenderer.invoke('test-notification'),
  checkNow: () => ipcRenderer.invoke('check-now'),
});

// Global functions for the settings HTML
window.addEventListener('DOMContentLoaded', async () => {
  const config = await window.electronAPI.getConfig();
  
  document.getElementById('enabled').checked = config.notification.enabled;
  document.getElementById('soundEnabled').checked = config.notification.soundEnabled;
  document.getElementById('pollInterval').value = config.notification.pollInterval.toString();
});

window.testNotification = () => {
  window.electronAPI.testNotification();
};

window.checkNow = () => {
  window.electronAPI.checkNow();
};

window.saveSettings = async () => {
  const updates = {
    notification: {
      enabled: document.getElementById('enabled').checked,
      soundEnabled: document.getElementById('soundEnabled').checked,
      pollInterval: parseInt(document.getElementById('pollInterval').value),
    },
  };
  
  await window.electronAPI.updateConfig(updates);
  alert('Settings saved successfully!');
  window.close();
};