const { ethers } = require("hardhat");
const HRE = require('hardhat');
const { expect } = require("chai");
require("bignumber.js");
const { utils } = require("ethers")

const ADMIN_WALLET           = "0x69Ba7E86bbB074Cd5f72693DEb6ADc508D83A6bF";
const MARKETING_WALLET       = 0x69Ba7E86bbB074Cd5f72693DEb6ADc508D83A6bF;

const panCakeV2RouterAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const WETH_ADDRESS           = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const FACTORY_ADDRESS        = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";

const DECIMAL_ZEROS   = "000000000000000000"; // 18 zeros
const formatDecimals  = 1000000000000000000;

const totalSupply     = 21000000;

// Fees
const refections_buy = 500;
const marketing_buy  = 100;
const LP_buy         = 100;
const totalFee_buy   = 700;

const refections_sell = 600;
const marketing_sell  = 100;
const LP_sell         = 200;
const totalFee_sell   = 900;

describe("Quantum Token Scenario", function() {
    let token, rewardToken, admin, users, panCakeRouter, panCakeFactory, pairAddress, panCakePair, funds;

    before(async function() {
        await HRE.network.provider.request({method: 'hardhat_impersonateAccount', params: [ADMIN_WALLET]});
        admin = await ethers.provider.getSigner(ADMIN_WALLET);
        
        users = await ethers.getSigners();

        const QuantumToken = await HRE.ethers.getContractFactory("Quantum");
        token              = await QuantumToken.deploy();
        await token.deployed();
        rewardToken    = await ethers.getContractAt("IERC20", "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56");
    });

    describe('Deployment', () => {
        it('Should set the right name', async() => {
            const tokenName = "Quantum 1"
            expect(await token.name()).to.equal(tokenName);
        });

        it('Should set the right symbol', async() => {
            const tokenSymbol = "QCONE";
            expect(await token.symbol()).to.equal(tokenSymbol);
        });

        it('Should set the right Total Supply', async() => {
            const supply = (await token.totalSupply())/formatDecimals;
            expect(supply).to.equal(totalSupply);
        });

        it('Should set the right owner', async() => {
            expect(await token.owner()).to.equal(ADMIN_WALLET);
        });

        it('Should assign the total supply of tokens to the owner', async() => {
            const ownerBalance = await token.balanceOf(ADMIN_WALLET);
            expect(await token.totalSupply()).to.equal(ownerBalance);
        });

        it('Should set the correct swapTokensAtAmount', async() => {
            expect(await token.swapTokensAtAmount()).to.equal(42);
        });

        it('Should exclude Admin wallet, marketing wallet, and contract from fees', async() => {
            expect(await token.isExcludedFromTxFees(ADMIN_WALLET)).to.equal(true);
            expect(await token.isExcludedFromTxFees(token.address)).to.equal(true);
        });

        it('Should set correct sell fees', async() => {
            const sellFees = await token.sellFees();
            expect(sellFees.reflections).to.equal(refections_sell);
            expect(sellFees.marketingWallet).to.equal(marketing_sell);
            expect(sellFees.LP).to.equal(LP_sell);
            expect(sellFees.totalFee).to.equal(totalFee_sell);
        });

        it('Should set correct buy fees', async() => {
            const buyFees = await token.buyFees();
            expect(buyFees.reflections).to.equal(refections_buy);
            expect(buyFees.marketingWallet).to.equal(marketing_buy);
            expect(buyFees.LP).to.equal(LP_buy);
            expect(buyFees.totalFee).to.equal(totalFee_buy);
        });
    });

    describe('Setter functions', () => {
        it('setSwapTokensAtAmount works', async() => {
            await token.connect(admin).setSwapTokensAtAmount(43);
            expect(await token.swapTokensAtAmount()).to.equal(43);
        });

        it('setSwapTokensAtAmount can be called only by the owner', async() => {
            await expect(token.setSwapTokensAtAmount(43)).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it('setSellFee works', async() => {
            await token.connect(admin).setSellFee(2, 2, 2)
            const sellFees = await token.sellFees();
            expect(sellFees.reflections).to.equal(200);
            expect(sellFees.marketingWallet).to.equal(200);
            expect(sellFees.LP).to.equal(200);
            expect(sellFees.totalFee).to.equal(600);
        });

        it('setSellFee can be called only by the owner', async() => {
            await expect(token.setSellFee(2, 2, 2)).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it('setBuyFee works', async() => {
            await token.connect(admin).setBuyFee(2, 2, 2)
            const buyFees = await token.sellFees();
            expect(buyFees.reflections).to.equal(200);
            expect(buyFees.marketingWallet).to.equal(200);
            expect(buyFees.LP).to.equal(200);
            expect(buyFees.totalFee).to.equal(600);
        });

        it('setBuyFee can be called only by the owner', async() => {
            await expect(token.setBuyFee(2, 2, 2)).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it('setMarketingWallet works', async() => {
            await token.connect(admin).setMarketingWallet(users[2].address);
            expect(await token.MARKETING_WALLET()).to.equal(users[2].address);
        });

        it('setMarketingWallet can be called only by the owner', async() => {
            await expect(token.setMarketingWallet(users[2].address)).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it('setLPRecipient works', async() => {
            await token.connect(admin).setLPRecipient(users[2].address);
            expect(await token.LP_recipient()).to.equal(users[2].address);
        });

        it('setLPRecipient can be called only by the owner', async() => {
            await expect(token.setLPRecipient(users[2].address)).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it('excludeFromFees works', async() => {
            await token.connect(admin).excludeFromFees(users[2].address);
            expect(await token.isExcludedFromTxFees(users[2].address)).to.equal(true);
        });

        it('excludeFromFees can be called only by the owner', async() => {
            await expect(token.excludeFromFees(users[2].address)).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it('includeInFees works', async() => {
            expect(await token.isExcludedFromTxFees(users[2].address)).to.equal(true);
            await token.connect(admin).includeInFees(users[2].address);
            expect(await token.isExcludedFromTxFees(users[2].address)).to.equal(false);
        });

        it('includeInFees can be called only by the owner', async() => {
            await expect(token.includeInFees(users[2].address)).to.be.revertedWith("Ownable: caller is not the owner");
        });

        // antisniper test
        it('antisniper works', async() => {
            expect(await token.testAntiSniper(users[2].address, users[1].address)).to.equal("in");
            await expect(token.testAntiSniper(rewardToken.address, users[1].address)).to.be.revertedWith("Quantum: Sniper Detected");
        });
    }); 

    describe('Setter functions', () => {
        it('setDistributionSettings works', async() => {
            await token.connect(admin).setDistributorSettings(650000);
            expect(await token.distributorGas()).to.equal(650000);
            await expect(token.connect(admin).setDistributorSettings(850000)).to.be.revertedWith("Gas should be less than 750000");
        });
        it('excludeFromFees can be called only by the owner', async() => {
            await expect(token.setDistributorSettings(850000)).to.be.revertedWith("Ownable: caller is not the owner");
        });

    });
});