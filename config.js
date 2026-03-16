/**
 * Uniswap V3 + V4 LP Rescue 配置
 */
export const CHAIN_CONFIGS = {
    1: {
        chainId: 1,
        name: 'Ethereum',
        tokens: {
            ETH: '0x0000000000000000000000000000000000000000', // V4 native ETH
            WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            wBETH: '0x7C974104df9f059F1367F4A31560B4d0A7dB3E9a',
        },
        v3: {
            positionManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
            executor: '0xAda05B5018D290ba85A99855bc27f47f199cb33c',
            supportedPairs: [
                ['USDC', 'USDT'],
                ['WETH', 'USDT'],
                ['USDC', 'WETH'],
                ['wBETH', 'WETH'],
            ],
        },
        v4: {
            positionManager: '0xbd216513d74c8cf14cf4747e6aaa6420ff64ee9e',
            executor: '0xa33f1B832897F907EFC33BFEd804896AD83e51bc',
            subgraphUrl: 'https://gateway.thegraph.com/api/subgraphs/id/DiYPVdygkfjDWhbxGSqAQxwBKmfKnkWQojqeM2rkLb3G',
            supportedPairs: [
                ['USDC', 'USDT'],
                ['WETH', 'USDT'],
                ['USDC', 'WETH'],
                ['wBETH', 'WETH'],
            ],
        },
    },
    8453: {
        chainId: 8453,
        name: 'Base',
        tokens: {
            ETH: '0x0000000000000000000000000000000000000000', // V4 native ETH 零地址
            WETH: '0x4200000000000000000000000000000000000006',
            USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
            USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
            cbBTC: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
            cbETH: '0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22',
            wstETH: '0x4158734D47Fc9692176B5085E0F52ee0Da5d47F1',
            EURC: '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42',
            BRETT: '0x532f27101965dd16442e59d40670faf5ebb142e4',
        },
        v3: {
            positionManager: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1',
            executor: '0x7B00b5677C2c9068F7DdeA5F8A4463A4BaB163A4',
            supportedPairs: [
                ['ETH', 'USDC'], ['WETH', 'USDC'],
                ['ETH', 'USDbC'], ['WETH', 'USDbC'],
                ['ETH', 'cbBTC'], ['WETH', 'cbBTC'],
                ['cbETH', 'ETH'], ['cbETH', 'WETH'],
                ['EURC', 'USDC'],
                ['ETH', 'wstETH'], ['WETH', 'wstETH'],
                ['USDC', 'USDT'],
                ['ETH', 'BRETT'], ['WETH', 'BRETT'],
            ],
        },
        v4: {
            positionManager: '0x7c5f5a4bbd8fd63184577525326123b519429bdc',
            executor: '0x1201F5Ad5a870e9408F3E0857b8D85d97F43d548',
            subgraphUrl: 'https://gateway.thegraph.com/api/subgraphs/id/6UjxSFHTUa98Y4Uh4Tb6suPVyYxgPHpPEPfmFNihzTHp',
            supportedPairs: [
                ['ETH', 'USDC'], ['WETH', 'USDC'],
                ['ETH', 'USDbC'], ['WETH', 'USDbC'],
                ['ETH', 'cbBTC'], ['WETH', 'cbBTC'],
                ['cbETH', 'ETH'], ['cbETH', 'WETH'],
                ['EURC', 'USDC'],
                ['ETH', 'wstETH'], ['WETH', 'wstETH'],
                ['USDC', 'USDT'],
                ['ETH', 'BRETT'], ['WETH', 'BRETT'],
            ],
        },
    },
};
export const config = { chains: CHAIN_CONFIGS };
