import { ethers } from 'ethers';
import { TelemetryEntry, RouterConfig } from '../types';

const ABI = [
  'function logEntry(uint32 _chamberId, uint16 _rootNorm, uint8 _modelTier, uint32 _tokensSaved) external',
  'function logBatch(uint32[] _chamberIds, uint16[] _rootNorms, uint8[] _modelTiers, uint32[] _tokensSaved) external',
  'function getStats(address _agent) view returns (uint256 interactions, uint256 tokensSaved)',
  'function getRecentEntries(address _agent, uint256 _count) view returns (tuple(uint32 chamberId, uint16 rootNorm, uint8 modelTier, uint32 tokensSaved, uint32 timestamp)[])',
];

/**
 * CeloTelemetry: Logs agent telemetry on-chain to the Celo blockchain.
 * If not configured (no private key), all methods gracefully return null.
 */
export class CeloTelemetry {
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;
  private contract: ethers.Contract | null = null;
  private pendingEntries: TelemetryEntry[] = [];

  constructor(private config: RouterConfig) {
    if (this.isConfigured()) {
      try {
        this.provider = new ethers.JsonRpcProvider(config.celoRpcUrl);
        this.wallet = new ethers.Wallet(config.celoPrivateKey, this.provider);
        this.contract = new ethers.Contract(config.telemetryContractAddress, ABI, this.wallet);
      } catch {
        // Silently fail — Celo is optional
      }
    }
  }

  isConfigured(): boolean {
    return !!(this.config.celoPrivateKey && this.config.telemetryContractAddress);
  }

  async logEntry(entry: TelemetryEntry): Promise<string | null> {
    if (!this.contract) return null;
    try {
      const rootNormScaled = Math.min(65535, Math.round(entry.rootNorm * 10000));
      const tx = await this.contract.logEntry(
        entry.chamberId,
        rootNormScaled,
        entry.modelTier,
        entry.tokensSaved
      );
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (err) {
      if (this.config.verbose) console.warn('Celo logEntry failed:', err);
      return null;
    }
  }

  async logBatch(entries: TelemetryEntry[]): Promise<string | null> {
    if (!this.contract || entries.length === 0) return null;
    try {
      const chamberIds = entries.map(e => e.chamberId);
      const rootNorms = entries.map(e => Math.min(65535, Math.round(e.rootNorm * 10000)));
      const modelTiers = entries.map(e => e.modelTier);
      const tokensSaved = entries.map(e => e.tokensSaved);
      const tx = await this.contract.logBatch(chamberIds, rootNorms, modelTiers, tokensSaved);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (err) {
      if (this.config.verbose) console.warn('Celo logBatch failed:', err);
      return null;
    }
  }

  queue(entry: TelemetryEntry): void {
    this.pendingEntries.push(entry);
  }

  async flush(): Promise<string | null> {
    if (this.pendingEntries.length === 0) return null;
    const entries = [...this.pendingEntries];
    this.pendingEntries = [];
    return this.logBatch(entries);
  }

  async getStats(agentAddress: string): Promise<{ interactions: number; tokensSaved: number } | null> {
    if (!this.contract) return null;
    try {
      const [interactions, tokensSaved] = await this.contract.getStats(agentAddress);
      return { interactions: Number(interactions), tokensSaved: Number(tokensSaved) };
    } catch {
      return null;
    }
  }

  async getRecentEntries(agentAddress: string, count: number): Promise<TelemetryEntry[] | null> {
    if (!this.contract) return null;
    try {
      const entries = await this.contract.getRecentEntries(agentAddress, count);
      return entries.map((e: any) => ({
        agentAddress,
        chamberId: Number(e.chamberId),
        rootNorm: Number(e.rootNorm) / 10000,
        modelTier: Number(e.modelTier),
        tokensSaved: Number(e.tokensSaved),
        timestamp: Number(e.timestamp),
      }));
    } catch {
      return null;
    }
  }
}
