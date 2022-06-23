const { ethers } = require("hardhat");
const HRE = require('hardhat');
const { expect } = require("chai");
require("bignumber.js");
const { utils } = require("ethers");

const ADMIN_WALLET           = "0x69Ba7E86bbB074Cd5f72693DEb6ADc508D83A6bF";
const panCakeV2RouterAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const WETH_ADDRESS           = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const FACTORY_ADDRESS        = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";

const DECIMAL_ZEROS   = "000000000000000000"; // 18 zeros
const formatDecimals  = 1000000000000000000;

describe("Quantum Token Scenario", function() {
    let token, rewardToken, admin, users, panCakeRouter, panCakeFactory, pairAddress, panCakePair, funds;
    beforeEach(async function() {
        funds = ethers.utils.parseEther('9000');

        const TestToken = await HRE.ethers.getContractFactory("BUSDtest");
        token              = await TestToken.deploy();
        await token.deployed();
        users = await ethers.getSigners();
        panCakeRouter  = await ethers.getContractAt("IPancakeV2Router02", panCakeV2RouterAddress);
        panCakeFactory = await ethers.getContractAt("IPancakeV2Factory", FACTORY_ADDRESS);
        pairAddress = await panCakeFactory.getPair(WETH_ADDRESS, token.address);
        panCakePair = await HRE.ethers.getContractAt("IPancakeV2Pair", pairAddress);


        //await users[0].sendTransaction({to: ADMIN_WALLET, value: funds}); // Send some funds to admin wallet
        await users[1].sendTransaction({to: users[0].address, value: funds}); // Send some funds to admin wallet
        //await users[2].sendTransaction({to: users[0].address, value: funds}); // Send some funds to admin wallet

/*         await token.approve(panCakeV2RouterAddress, '40000000' + DECIMAL_ZEROS); // 40M to pancake router
        await panCakeRouter.addLiquidityETH(token.address, '100000' + DECIMAL_ZEROS, 0, 0, ADMIN_WALLET, (Date.now() + 100000), 
        {value: ethers.utils.parseEther('1000')}); // provide 1000 BNB + 100000 token liquidity to pancakeswap */

    });

    it('Should set the right name', async() => {
        const tokenName = "BUSDTest"
        expect(await token.name()).to.equal(tokenName);
    });

    it('Should set the right amount', async() => {
        const tokenName = "BUSDTest"
        console.log(await token.balanceOf(users[0].address));
        console.log(await token.pancakeV2Pair());
        //expect(await token.blanceOf(users[0].address)).to.equal(tokenName);
    });
});