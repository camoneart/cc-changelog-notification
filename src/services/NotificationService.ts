import notifier from 'node-notifier';
import { ChangelogEntry } from '../types';
import { shell } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';

export class NotificationService {
  private soundEnabled: boolean;
  private execAsync = promisify(exec);

  constructor(soundEnabled: boolean = true) {
    this.soundEnabled = soundEnabled;
  }

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  async showChangelogNotification(entry: ChangelogEntry, githubUrl: string): Promise<void> {
    const message = this.formatChangelogMessage(entry);
    
    notifier.notify({
      title: `Claude Code ${entry.version} Released!`,
      message,
      icon: this.getIconPath(),
      sound: this.soundEnabled ? 'Basso' : false, // Bassoに変更
      wait: true,
      timeout: false, // 自動削除を無効化、ユーザーが手動で削除
      actions: ['View on GitHub', 'Dismiss'],
      contentImage: '', // macOS用追加オプション
      appIcon: '', // macOS用追加オプション
    } as any, (err: any, response: any, metadata: any) => {
      if (err) {
        console.error('Notification error:', err);
        return;
      }

      if (metadata?.activationType === 'actionClicked') {
        if (metadata.activationValue === 'View on GitHub') {
          shell.openExternal(githubUrl);
        }
      } else if (response === 'activate') {
        shell.openExternal(githubUrl);
      }
    });
  }

  private formatChangelogMessage(entry: ChangelogEntry): string {
    const maxChanges = 2;
    const changes = entry.changes.slice(0, maxChanges);
    
    if (changes.length === 0) {
      return `New version ${entry.version} is available. Check the changelog for details.`;
    }

    // 改行を避けて、セミコロンで区切る
    let message = changes.map(c => c.substring(0, 100)).join('; ');
    
    if (entry.changes.length > maxChanges) {
      message += ` ... and ${entry.changes.length - maxChanges} more changes`;
    }

    return message;
  }

  private getIconPath(): string {
    // For now, return empty string. In production, you would want to include an icon file
    return '';
  }

  async showErrorNotification(error: string): Promise<void> {
    notifier.notify({
      title: 'Claude Code Notifier Error',
      message: error,
      icon: this.getIconPath(),
      sound: false,
      timeout: false, // エラー通知も手動削除に変更
    });
  }

  async showTestNotification(): Promise<void> {
    // macOSでterminal-notifierを使用
    if (process.platform === 'darwin') {
      try {
        const soundOption = this.soundEnabled ? '-sound Submarine' : '';
        await this.execAsync(`terminal-notifier -title "Claude Code Notifier" -message "Notification test successful! The app is working correctly." ${soundOption}`);
        console.log('✅ terminal-notifier notification sent');
        return;
      } catch (error) {
        console.error('❌ terminal-notifier failed, falling back to node-notifier:', error);
      }
    }

    // フォールバック：通常のnode-notifier
    notifier.notify({
      title: 'Claude Code Notifier',
      message: 'Notification test successful! The app is working correctly.',
      icon: this.getIconPath(),
      sound: this.soundEnabled ? 'Basso' : false, // Bassoに変更
      timeout: false, // テスト通知も手動削除に変更
      contentImage: '', // macOS用追加オプション
      appIcon: '', // macOS用追加オプション
    } as any);
  }
}