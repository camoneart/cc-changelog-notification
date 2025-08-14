import * as notifier from 'node-notifier';
import { ChangelogEntry } from '../types';
import { shell } from 'electron';

export class NotificationService {
  private soundEnabled: boolean;

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
      sound: this.soundEnabled,
      wait: true,
      timeout: false, // 自動削除を無効化、ユーザーが手動で削除
      actions: ['View on GitHub', 'Dismiss'],
    }, (err: any, response: any, metadata: any) => {
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
    const maxChanges = 3;
    const changes = entry.changes.slice(0, maxChanges);
    
    if (changes.length === 0) {
      return `New version ${entry.version} is available. Check the changelog for details.`;
    }

    let message = `What's new:\n${changes.join('\n')}`;
    
    if (entry.changes.length > maxChanges) {
      message += `\n... and ${entry.changes.length - maxChanges} more changes`;
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
    notifier.notify({
      title: 'Claude Code Notifier',
      message: 'Notification test successful! The app is working correctly.',
      icon: this.getIconPath(),
      sound: this.soundEnabled,
      timeout: false, // テスト通知も手動削除に変更
    });
  }
}