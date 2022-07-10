Basic Sample Hardhat Project

Testnet:
BUSDT - 0xC7a7C693586EA12B09fc4613cC398B47A96517F9
QCONE - 0x70f31d36C7BDA9b1F417f6b4ec7A74bCD2eD5A03

Use this to get deadline and add a bunch of 9 after the value
https://www.unixtimestamp.com/


###############
# Mainnet deployment 
1. setup .env file according to .envExample
2. In the code change line 40,41,42. Fill in admin mallet, LP_recipient, and marketing wallet addresses
3. to compile run : npx hardhat compile
4. to deploy run :  npx hardhat run ./deploy.js --network BSCMainnet
5. to verify run : npx hardhat verify --network BSCMainnet {address of contract}

-----
### To add liquidity
https://docs.pancakeswap.finance/products/pancakeswap-exchange/liquidity-guide

https://www.youtube.com/watch?v=poBT9IXJpfY


-------
### When you change either admin, marketing or lp address
1. run excludeFromFees(address)

-------
### When you create a new pair
1. setIsDividendExempt
2. setExcludedFromAntiSniper