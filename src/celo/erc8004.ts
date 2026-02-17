import { ethers } from 'ethers';
import { RouterConfig } from '../types';

const IDENTITY_REGISTRY_ABI = [
  'function register(string domain, string agentCardUri) external returns (uint256)',
  'function isRegistered(address agent) view returns (bool)',
];

/**
 * ERC8004Registration: ERC-8004 compatible agent registration on Celo.
 * If not configured, all methods gracefully return null.
 */
export class ERC8004Registration {
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;
  private readonly IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';

  constructor(private config: RouterConfig) {
    if (this.isConfigured()) {
      try {
        this.provider = new ethers.JsonRpcProvider(config.celoRpcUrl);
        this.wallet = new ethers.Wallet(config.celoPrivateKey, this.provider);
      } catch {
        // Silently fail
      }
    }
  }

  isConfigured(): boolean {
    return !!(this.config.celoPrivateKey);
  }

  generateAgentCard(params: {
    name: string;
    description: string;
    githubUrl: string;
  }): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'SoftwareAgent',
      name: params.name,
      description: params.description,
      url: params.githubUrl,
      capabilities: [
        'context-filtering',
        'model-routing',
        'swarm-coordination',
        'telemetry-logging',
      ],
      infrastructure: {
        type: 'RootRouter',
        version: '0.1.0',
        features: [
          'root-pair-telemetry',
          'weyl-chamber-classification',
          'interaction-knowledge-graph',
          'algebraic-reflection-retrieval',
        ],
      },
      blockchain: {
        network: 'celo',
        standard: 'ERC-8004',
      },
    };
  }

  async register(params: {
    domain: string;
    agentCardUri: string;
  }): Promise<{ agentId: string; txHash: string } | null> {
    if (!this.wallet) return null;
    try {
      const contract = new ethers.Contract(this.IDENTITY_REGISTRY, IDENTITY_REGISTRY_ABI, this.wallet);
      const tx = await contract.register(params.domain, params.agentCardUri);
      const receipt = await tx.wait();
      return {
        agentId: receipt.hash,
        txHash: receipt.hash,
      };
    } catch (err) {
      if (this.config.verbose) console.warn('ERC-8004 registration failed:', err);
      return null;
    }
  }

  async isRegistered(address: string): Promise<boolean> {
    if (!this.provider) return false;
    try {
      const contract = new ethers.Contract(this.IDENTITY_REGISTRY, IDENTITY_REGISTRY_ABI, this.provider);
      return await contract.isRegistered(address);
    } catch {
      return false;
    }
  }
}
