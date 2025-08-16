import { app, ipcMain, Tray, Menu, nativeImage, shell } from 'electron';
import { GitHubService } from '../services/GitHubService';
import { NotificationService } from '../services/NotificationService';
import { ConfigService } from '../services/ConfigService';
import { AppConfig } from '../types';

class ChangelogMonitor {
  private githubService!: GitHubService;
  private notificationService!: NotificationService;
  private configService!: ConfigService;
  private config!: AppConfig;
  private tray: Tray | null = null;
  private pollInterval: NodeJS.Timeout | null = null;

  async init(): Promise<void> {
    this.configService = new ConfigService();
    this.config = await this.configService.loadConfig();
    
    this.githubService = new GitHubService(
      this.config.github.owner,
      this.config.github.repo,
      this.config.github.filePath,
      process.env.GITHUB_TOKEN,
      this.configService
    );
    
    this.notificationService = new NotificationService(this.config.notification.soundEnabled);
    
    this.createTray();
    this.setupIPC();
    this.startPolling();
  }

  private createTray(): void {
    try {
      // macOSでは、テキストのみのトレイアイコンを作成
      if (process.platform === 'darwin') {
        // macOSではアイコンなしでタイトルのみ表示も可能
        this.tray = new Tray(nativeImage.createEmpty());
        this.tray.setTitle('CC'); // メニューバーにテキストを表示
        console.log('✅ Tray created with text title for macOS');
      } else {
        // 他のプラットフォーム用のアイコン
        const iconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAA' +
                          'CXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5wgPBhgAK8ER8AAAAB1pVFh0Q29tbWVudAAA' +
                          'AAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAAdUlEQVQ4y8WTQQrAIAwEZ/tg/7+kPbRQFCQq' +
                          'LXjZgyCbbJKNAP7KzFARwSmlUsISEW2ttZsxxiGilIrI5r03ABARF1LKFTNfkiQppdBa42it' +
                          '0VqjtUZrjdYarTVaa7TWaK3hHAAiGgbuvaN5npFSCjHGy9P+AGhXT7Ch8hopAAAAAElFTkSu' +
                          'QmCC';
        const icon = nativeImage.createFromDataURL(`data:image/png;base64,${iconBase64}`);
        this.tray = new Tray(icon);
        console.log('✅ Tray created with icon');
      }
      
      this.tray.setToolTip('Claude Code Changelog Notifier');
      this.updateTrayMenu();
    } catch (error) {
      console.error('❌ Failed to create tray:', error);
    }
  }

  private updateTrayMenu(): void {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '🔔 Claude Code Notifier',
        enabled: false
      },
      { type: 'separator' },
      {
        label: '🔄 Check for Updates Now',
        click: () => {
          console.log('🔍 Manual update check triggered');
          this.checkForUpdates();
        }
      },
      { type: 'separator' },
      {
        label: `🔔 Notifications: ${this.config.notification.enabled ? 'ON' : 'OFF'}`,
        click: () => {
          this.config.notification.enabled = !this.config.notification.enabled;
          this.configService.updateConfig(this.config);
          this.updateTrayMenu();
          console.log(`🔔 Notifications ${this.config.notification.enabled ? 'enabled' : 'disabled'}`);
        }
      },
      {
        label: `🔊 Sound: ${this.config.notification.soundEnabled ? 'ON' : 'OFF'}`,
        click: () => {
          this.config.notification.soundEnabled = !this.config.notification.soundEnabled;
          this.notificationService.setSoundEnabled(this.config.notification.soundEnabled);
          this.configService.updateConfig(this.config);
          this.updateTrayMenu();
          console.log(`🔊 Sound ${this.config.notification.soundEnabled ? 'enabled' : 'disabled'}`);
        }
      },
      { type: 'separator' },
      {
        label: '🎯 Test Notification',
        click: () => {
          console.log('🎯 Sending test notification');
          this.notificationService.showTestNotification();
        }
      },
      {
        label: '🌐 View on GitHub',
        click: () => {
          shell.openExternal('https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md');
        }
      },
      { type: 'separator' },
      {
        label: '❌ Quit',
        click: () => {
          this.cleanup();
          app.quit();
        }
      }
    ]);
    
    this.tray?.setContextMenu(contextMenu);
  }

  private setupIPC(): void {
    ipcMain.handle('get-config', () => {
      return this.config;
    });

    ipcMain.handle('update-config', async (_, updates) => {
      this.config = await this.configService.updateConfig(updates);
      this.notificationService.setSoundEnabled(this.config.notification.soundEnabled);
      this.restartPolling();
      return this.config;
    });

    ipcMain.handle('test-notification', () => {
      this.notificationService.showTestNotification();
    });

    ipcMain.handle('check-now', () => {
      this.checkForUpdates();
    });
  }

  private async checkForUpdates(): Promise<void> {
    try {
      console.log('🔍 Checking for CHANGELOG.md updates...');
      const hasChanges = await this.githubService.checkForChanges();
      console.log('📊 Changes detected:', hasChanges);
      
      if (hasChanges && this.config.notification.enabled) {
        const latestVersion = await this.githubService.getLatestVersion();
        console.log('📦 Latest version:', latestVersion?.version);
        
        if (latestVersion) {
          const githubUrl = this.githubService.getCommitUrl();
          console.log('🔔 Sending notification for version:', latestVersion.version);
          await this.notificationService.showChangelogNotification(latestVersion, githubUrl);
        }
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      await this.notificationService.showErrorNotification(
        'Failed to check for updates. Please check your internet connection.'
      );
    }
  }

  private startPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    const intervalMs = this.config.notification.pollInterval * 60 * 1000; // Convert minutes to milliseconds
    
    this.pollInterval = setInterval(() => {
      this.checkForUpdates();
    }, intervalMs);

    // Check immediately on start
    setTimeout(() => this.checkForUpdates(), 2000); // Wait 2 seconds after startup
  }

  private restartPolling(): void {
    this.startPolling();
  }

  // Settings functionality disabled with tray removal
  // openSettings method removed - no UI access without tray

  cleanup(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    if (this.tray) {
      this.tray.destroy();
    }
  }
}

// App event handlers
app.whenReady().then(async () => {
  const monitor = new ChangelogMonitor();
  await monitor.init();
  
  // macOSでDockアイコンを隠す（メニューバーアプリとして動作）
  // Tray作成後に実行
  // 一時的にコメントアウトして、Dockに表示させる
  // if (process.platform === 'darwin') {
  //   app.dock.hide();
  // }

  app.on('before-quit', () => {
    monitor.cleanup();
  });
});

app.on('window-all-closed', (event: Event) => {
  // Prevent the app from quitting when all windows are closed
  // We want to keep running in the system tray
  event.preventDefault();
});

app.on('activate', () => {
  // On macOS, re-create a window when the dock icon is clicked
  // and there are no other windows open (not applicable here since we use tray)
});

// Ensure only one instance of the app runs
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
}