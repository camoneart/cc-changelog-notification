export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
  sha: string;
}

export interface NotificationConfig {
  enabled: boolean;
  soundEnabled: boolean;
  pollInterval: number; // minutes
}

export interface AppConfig {
  notification: NotificationConfig;
  github: {
    repo: string;
    owner: string;
    filePath: string;
  };
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  html_url: string;
}