# LP Rescue 项目说明

本仓库包含两个独立的 LP 赎回项目：

---

## Uniswap V4（根目录）

- **链**：Ethereum、Base
- **合约**：Uniswap V4 PositionManager
- **流程**：2 次签名 + 自动转账（setApprovalForAll → rescueAll）

| 文件/目录 | 说明 |
|----------|------|
| `script.ts` | 前端逻辑 |
| `config.ts` | 链配置、代币、Executor 地址 |
| `contracts/LPRescueExecutorV4.sol` | V4 Executor 合约 |
| `scripts/compile-v4.js` | 编译 V4 合约 |
| `scripts/deploy-v4.js` | 部署到 Ethereum/Base |
| `index.html` | 前端页面 |

**启动**：`npm run build` → `npm start`

---

## PancakeSwap（pancakeswap/ 子目录）

- **链**：BSC（BNB Smart Chain）
- **合约**：PancakeSwap V3 NonfungiblePositionManager
- **流程**：授权 + 赎回（approve → rescueLP）

| 文件/目录 | 说明 |
|----------|------|
| `pancakeswap/script.js` | 前端逻辑 |
| `pancakeswap/contracts/LPRescueExecutor.sol` | BSC Executor 合约 |
| `pancakeswap/scripts/compile.js` | 编译合约 |
| `pancakeswap/scripts/deploy-executor.js` | 部署到 BSC |
| `pancakeswap/index.html` | 前端页面 |

**启动**：进入 `pancakeswap/` 后执行 `npm run compile` → `npm start`，或直接用浏览器打开 `index.html`。

---

## 区分要点

| 项目 | 链 | 合约目录 | 脚本 |
|------|-----|---------|------|
| Uniswap V4 | Ethereum, Base | `contracts/LPRescueExecutorV4.sol` | `compile-v4`, `deploy-v4` |
| PancakeSwap | BSC | `pancakeswap/contracts/LPRescueExecutor.sol` | `pancakeswap/` 下的 compile, deploy |
