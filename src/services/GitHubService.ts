import { Octokit } from '@octokit/rest';
import { GitHubCommit, ChangelogEntry } from '../types';
import { ConfigService } from './ConfigService';

export class GitHubService {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private filePath: string;
  private configService: ConfigService;

  constructor(owner: string, repo: string, filePath: string, token?: string, configService?: ConfigService) {
    this.octokit = new Octokit({
      auth: token,
    });
    this.owner = owner;
    this.repo = repo;
    this.filePath = filePath;
    this.configService = configService || new ConfigService();
  }

  async getLatestCommit(): Promise<GitHubCommit | null> {
    try {
      const response = await this.octokit.rest.repos.listCommits({
        owner: this.owner,
        repo: this.repo,
        path: this.filePath,
        per_page: 1,
      });

      if (response.data.length === 0) {
        return null;
      }

      return response.data[0] as GitHubCommit;
    } catch (error) {
      console.error('Error fetching latest commit:', error);
      return null;
    }
  }

  async checkForChanges(): Promise<boolean> {
    const latestCommit = await this.getLatestCommit();
    
    if (!latestCommit) {
      return false;
    }

    const config = await this.configService.loadConfig();
    const lastKnownSha = config.lastKnownSha;
    
    console.log('💾 Last known SHA:', lastKnownSha);
    console.log('📝 Latest commit SHA:', latestCommit.sha);

    // 初回実行または前回と異なる場合は通知する
    const hasChanged = !lastKnownSha || lastKnownSha !== latestCommit.sha;
    
    if (hasChanged) {
      // 新しいSHAを保存
      await this.configService.updateConfig({
        lastKnownSha: latestCommit.sha,
        lastCheckTime: new Date().toISOString()
      });
    }

    return hasChanged;
  }

  async getChangelogContent(): Promise<string | null> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: this.filePath,
      });

      if ('content' in response.data) {
        return Buffer.from(response.data.content, 'base64').toString('utf-8');
      }

      return null;
    } catch (error) {
      console.error('Error fetching changelog content:', error);
      return null;
    }
  }

  parseChangelog(content: string): ChangelogEntry[] {
    const lines = content.split('\n');
    const entries: ChangelogEntry[] = [];
    let currentEntry: Partial<ChangelogEntry> | null = null;

    for (const line of lines) {
      // Match version headers (e.g., "## v1.2.3 - 2023-12-01" or "# Version 1.2.3")
      const versionMatch = line.match(/^#+\s*(?:v?(\d+\.\d+\.\d+)|Version\s+(\d+\.\d+\.\d+))/i);
      
      if (versionMatch) {
        if (currentEntry && currentEntry.version) {
          entries.push(currentEntry as ChangelogEntry);
        }
        
        const version = versionMatch[1] || versionMatch[2];
        const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})/);
        
        currentEntry = {
          version,
          date: dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0],
          changes: [],
          sha: '',
        };
      } else if (currentEntry && line.trim().startsWith('-')) {
        // Collect bullet points as changes
        currentEntry.changes = currentEntry.changes || [];
        currentEntry.changes.push(line.trim().substring(1).trim());
      }
    }

    if (currentEntry && currentEntry.version) {
      entries.push(currentEntry as ChangelogEntry);
    }

    return entries;
  }

  async getLatestVersion(): Promise<ChangelogEntry | null> {
    const content = await this.getChangelogContent();
    if (!content) return null;

    const entries = this.parseChangelog(content);
    return entries.length > 0 ? entries[0] : null;
  }

  getCommitUrl(): string {
    return `https://github.com/${this.owner}/${this.repo}/commits/main/${this.filePath}`;
  }
}