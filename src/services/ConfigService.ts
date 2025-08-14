import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { AppConfig } from '../types';

export class ConfigService {
  private configPath: string;
  private defaultConfig: AppConfig = {
    notification: {
      enabled: true,
      soundEnabled: true,
      pollInterval: 30, // 30 minutes
    },
    github: {
      repo: 'claude-code',
      owner: 'anthropics',
      filePath: 'CHANGELOG.md',
    },
  };

  constructor() {
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, 'config.json');
    console.log('📁 Config path:', this.configPath);
  }

  async loadConfig(): Promise<AppConfig> {
    try {
      if (!fs.existsSync(this.configPath)) {
        await this.saveConfig(this.defaultConfig);
        return this.defaultConfig;
      }

      const configData = fs.readFileSync(this.configPath, 'utf-8');
      const config = JSON.parse(configData) as AppConfig;
      
      // Merge with default config to ensure all properties exist
      return {
        ...this.defaultConfig,
        ...config,
        notification: {
          ...this.defaultConfig.notification,
          ...config.notification,
        },
        github: {
          ...this.defaultConfig.github,
          ...config.github,
        },
      };
    } catch (error) {
      console.error('Error loading config:', error);
      return this.defaultConfig;
    }
  }

  async saveConfig(config: AppConfig): Promise<void> {
    try {
      const userDataPath = app.getPath('userData');
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }

      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  async updateConfig(updates: Partial<AppConfig>): Promise<AppConfig> {
    const currentConfig = await this.loadConfig();
    const newConfig = {
      ...currentConfig,
      ...updates,
      notification: {
        ...currentConfig.notification,
        ...updates.notification,
      },
      github: {
        ...currentConfig.github,
        ...updates.github,
      },
    };

    await this.saveConfig(newConfig);
    return newConfig;
  }
}