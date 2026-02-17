/**
 * Deploy RootRouterTelemetry contract to Celo.
 *
 * Supports:
 * - Celo mainnet  (CELO_RPC_URL_MAINNET, CELO_PRIVATE_KEY_MAINNET)
 * - Alfajores     (CELO_RPC_URL,         CELO_PRIVATE_KEY)
 *
 * Usage:
 *   npm run deploy:contract
 *
 * This script:
 *  - Compiles contracts/RootRouterTelemetry.sol using solc
 *  - Deploys with ethers.js
 *  - Prints the deployed address so you can copy it into:
 *      TELEMETRY_CONTRACT_ADDRESS_MAINNET=0x...
 *      or
 *      TELEMETRY_CONTRACT_ADDRESS=0x...
 */

import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import solc from 'solc';
import { ethers } from 'ethers';

type NetworkConfig = {
  name: string;
  rpcUrl: string;
  privateKey: string;
  telemetryEnvKey: string;
};

function getNetworkConfig(): NetworkConfig {
  // Prefer explicit mainnet config for hackathon
  const mainnetRpc = process.env.CELO_RPC_URL_MAINNET;
  const mainnetKey = process.env.CELO_PRIVATE_KEY_MAINNET;

  if (mainnetRpc && mainnetKey) {
    return {
      name: 'celo-mainnet',
      rpcUrl: mainnetRpc,
      privateKey: mainnetKey,
      telemetryEnvKey: 'TELEMETRY_CONTRACT_ADDRESS_MAINNET',
    };
  }

  const testnetRpc = process.env.CELO_RPC_URL;
  const testnetKey = process.env.CELO_PRIVATE_KEY;

  if (testnetRpc && testnetKey) {
    return {
      name: 'celo-alfajores',
      rpcUrl: testnetRpc,
      privateKey: testnetKey,
      telemetryEnvKey: 'TELEMETRY_CONTRACT_ADDRESS',
    };
  }

  throw new Error(
    'No Celo RPC/private key configured. Set either:\n' +
      '  - CELO_RPC_URL_MAINNET and CELO_PRIVATE_KEY_MAINNET  (for mainnet)\n' +
      '  - or CELO_RPC_URL and CELO_PRIVATE_KEY                (for Alfajores)',
  );
}

function compileContract() {
  const contractsDir = path.resolve(__dirname, '..', 'contracts');
  const sourcePath = path.join(contractsDir, 'RootRouterTelemetry.sol');

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Could not find contract at ${sourcePath}`);
  }

  const source = fs.readFileSync(sourcePath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'RootRouterTelemetry.sol': {
        content: source,
      },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors && output.errors.length) {
    const fatal = output.errors.filter((e: any) => e.severity === 'error');
    if (fatal.length) {
      throw new Error(
        'Solidity compilation failed:\n' +
          fatal.map((e: any) => e.formattedMessage ?? e.message).join('\n'),
      );
    }
  }

  const contractOutput =
    output.contracts['RootRouterTelemetry.sol']?.['RootRouterTelemetry'];

  if (!contractOutput) {
    throw new Error('Compiled contract RootRouterTelemetry not found in output');
  }

  const abi = contractOutput.abi;
  const bytecode = contractOutput.evm?.bytecode?.object;

  if (!bytecode || bytecode === '0x') {
    throw new Error('No bytecode produced for RootRouterTelemetry');
  }

  return { abi, bytecode };
}

async function main() {
  const net = getNetworkConfig();

  console.log('🌿 Deploying RootRouterTelemetry...');
  console.log(`  Network:  ${net.name}`);
  console.log(`  RPC URL:  ${net.rpcUrl}`);

  const { abi, bytecode } = compileContract();

  const provider = new ethers.JsonRpcProvider(net.rpcUrl);
  const wallet = new ethers.Wallet(net.privateKey, provider);

  const balance = await provider.getBalance(wallet.address);
  console.log(`  Deployer: ${wallet.address}`);
  console.log(`  Balance:  ${ethers.formatEther(balance)} CELO`);

  if (balance === 0n) {
    throw new Error('Deployer has 0 CELO. Fund this address before deploying.');
  }

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  console.log('\n  Deploying contract...');
  const contract = await factory.deploy();
  console.log(`  Tx hash:  ${contract.deploymentTransaction()?.hash}`);

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('\n✅ RootRouterTelemetry deployed!');
  console.log(`  Address:  ${address}`);
  console.log(
    `\nNext steps:\n  - Add this to your .env:\n      ${net.telemetryEnvKey}=${address}\n  - Re-run your demos with telemetry enabled.`,
  );
}

main().catch((err) => {
  console.error('Deployment failed:', err);
  process.exitCode = 1;
});

