const { ethers } = require("hardhat");
const HRE = require('hardhat');
const { expect } = require("chai");
require("bignumber.js");
const { utils } = require("ethers");

const ADMIN_WALLET           = "0x69Ba7E86bbB074Cd5f72693DEb6ADc508D83A6bF";
const panCakeV2RouterAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const WETH_ADDRESS           = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const FACTORY_ADDRESS        = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";

 
// const ADMIN_WALLET           = "0x69Ba7E86bbB074Cd5f72693DEb6ADc508D83A6bF";
// const panCakeV2RouterAddress = "0xd99d1c33f9fc3444f8101754abc46c52416550d1";
// const WETH_ADDRESS           = "0xae13d989dac2f0debff460ac112a837c89baa7cd ";
// const FACTORY_ADDRESS        = "0x6725f303b657a9451d8ba641348b6761a6cc7a17";

const DECIMAL_ZEROS   = "000000000000000000"; // 18 zeros
const formatDecimals  = 1000000000000000000;

const totalSupply     = 21000000;

describe("Quantum Token Scenario", function() {
    let token, rewardToken, admin, users, panCakeRouter, panCakeFactory, pairAddress, panCakePair, funds;
    before(async function() {
        funds = ethers.utils.parseEther('9000');

        await HRE.network.provider.request({method: 'hardhat_impersonateAccount', params: [ADMIN_WALLET]});
        admin = await ethers.provider.getSigner(ADMIN_WALLET);
        
        const QuantumToken = await HRE.ethers.getContractFactory("Quantum");
        token              = await QuantumToken.deploy();
        await token.deployed();

        rewardToken    = await ethers.getContractAt("IERC20", "0xC7a7C693586EA12B09fc4613cC398B47A96517F9");
        panCakeRouter  = await ethers.getContractAt("IPancakeV2Router02", panCakeV2RouterAddress);
        panCakeFactory = await ethers.getContractAt("IPancakeV2Factory", FACTORY_ADDRESS);
        pairAddress = await panCakeFactory.getPair(WETH_ADDRESS, token.address);

        panCakePair = await HRE.ethers.getContractAt("IPancakeV2Pair", pairAddress);

        users = await ethers.getSigners();
        await users[0].sendTransaction({to: ADMIN_WALLET, value: funds}); // Send some funds to admin wallet
        await users[2].sendTransaction({to: ADMIN_WALLET, value: funds}); // Send some funds to admin wallet
        await users[3].sendTransaction({to: ADMIN_WALLET, value: funds}); // Send some funds to admin wallet

        await token.connect(admin).approve(panCakeV2RouterAddress, '40000000' + DECIMAL_ZEROS); // 40M to pancake router
        await panCakeRouter.connect(admin).addLiquidityETH(token.address, '100000' + DECIMAL_ZEROS, 0, 0, ADMIN_WALLET, (Date.now() + 100000), 
        {value: ethers.utils.parseEther('1000')}); // provide 1000 BNB + 100000 token liquidity to pancakeswap
        
    });

    describe('Deployment', () => {
        it("Scenario where user buy's 100 tokens and sells 100 tokens ", async() => {

            // set lp recipient 
            await token.connect(admin).setLPRecipient(users[19].address);
            expect(await token.LP_recipient()).to.equal(users[19].address);
            
            // set marketing wallet
            await token.connect(admin).setMarketingWallet(users[18].address);
            expect(await token.MARKETING_WALLET()).to.equal(users[18].address);

            let MARKETING_WALLET = await token.MARKETING_WALLET();
            let LP_recipient     = await token.LP_recipient();

            console.log("Admin Wallet - ", await token.ADMIN_WALLET());
            console.log("Marketing Wallet - ", MARKETING_WALLET);
            console.log("LP Wallet - ", LP_recipient);
            console.log("LP Balance - ", await panCakePair.balanceOf(LP_recipient));

            //////////////////

            console.log("transaction 1 - no tax since from admin");
            await token.connect(admin).transfer(users[0].address, '10000' + DECIMAL_ZEROS);
            console.log(await token.balanceOf(users[0].address));

            console.log("transaction 2 - 1% transfer tax");
            await token.connect(users[0]).approve(users[1].address, '4000' + DECIMAL_ZEROS);
            await token.connect(users[1]).transferFrom(users[0].address, users[1].address, '4000' + DECIMAL_ZEROS);
            console.log(await token.balanceOf(users[1].address));

            console.log("--------------------");
            
            //////////////////

            let QCONEPrice, BNBReserve, QCONEReserve;
            const path = [token.address, WETH_ADDRESS];

            console.log("\nInitial price and liquidity");

            let reserves = await panCakePair.getReserves();
            QCONEReserve = reserves['reserve0']/formatDecimals;
            BNBReserve   = reserves['reserve1']/formatDecimals;

            QCONEPrice = ((await panCakeRouter.getAmountsOut(ethers.utils.parseEther('1'), path))[1]) / formatDecimals;
            printTable(QCONEReserve, BNBReserve, QCONEPrice);

            //////////////////

            console.log("After sale price and liquidity");
            await token.connect(users[0]).approve(panCakeV2RouterAddress, '800' + DECIMAL_ZEROS);
            await panCakeRouter.connect(users[0]).swapExactTokensForETHSupportingFeeOnTransferTokens(
                '800' + DECIMAL_ZEROS,
                0, // accept any amount of ETH
                path,
                users[0].address,
                new Date().getTime()
            )

            reserves = await panCakePair.getReserves();
            QCONEReserve = reserves['reserve0']/formatDecimals;
            BNBReserve   = reserves['reserve1']/formatDecimals;

            QCONEPrice = ((await panCakeRouter.getAmountsOut(ethers.utils.parseEther('1'), path))[1]) / formatDecimals;
            printTable(QCONEReserve, BNBReserve, QCONEPrice);
            let marketingFee = (await token.balanceOf(users[18].address)) / formatDecimals; 
            let contractBalance = (await token.balanceOf(token.address)) / formatDecimals;
            console.log("contract balance: ", contractBalance);
            console.log("marketing balance: ", marketingFee);

            await token.connect(users[0]).approve(panCakeV2RouterAddress, '800' + DECIMAL_ZEROS);
            await panCakeRouter.connect(users[0]).swapExactTokensForETHSupportingFeeOnTransferTokens(
                '800' + DECIMAL_ZEROS,
                0, // accept any amount of ETH
                path,
                users[0].address,
                new Date().getTime()
            )

            reserves = await panCakePair.getReserves();
            QCONEReserve = reserves['reserve0']/formatDecimals;
            BNBReserve   = reserves['reserve1']/formatDecimals;

            QCONEPrice = ((await panCakeRouter.getAmountsOut(ethers.utils.parseEther('1'), path))[1]) / formatDecimals;
            printTable(QCONEReserve, BNBReserve, QCONEPrice);
            marketingFee = (await token.balanceOf(users[18].address)) / formatDecimals; 
            contractBalance = (await token.balanceOf(token.address)) / formatDecimals;
            console.log("contract balance: ", contractBalance);
            console.log("marketing balance: ", marketingFee);
            console.log("busd balance, address", await rewardToken.balanceOf(ADMIN_WALLET), ADMIN_WALLET);
            console.log("busd balance", await rewardToken.balanceOf(users[0].address), users[0].address);
            console.log("busd balance", await rewardToken.balanceOf(users[1].address), users[1].address);
            console.log("busd balance", await rewardToken.balanceOf(users[5].address), users[5].address);

            console.log("After buy price and liquidity");
            console.log("busd balance", await rewardToken.balanceOf(ADMIN_WALLET));
            console.log("------------------------balance = ", await token.balanceOf(users[4].address));

            //////////////////////
            // BUY
            console.log("After buy price and liquidity");
            await panCakeRouter.connect(users[4]).swapExactETHForTokensSupportingFeeOnTransferTokens(
                0, // accept any amount of Tokens
                path.reverse(),
                users[4].address,
                new Date().getTime(), {
                    value: ethers.utils.parseEther((parseFloat(QCONEPrice)*3100).toString())
                }
            )

            reserves = await panCakePair.getReserves();
            QCONEReserve = reserves['reserve0']/formatDecimals;
            BNBReserve   = reserves['reserve1']/formatDecimals;

            QCONEPrice = ((await panCakeRouter.getAmountsOut(ethers.utils.parseEther('1'), path.reverse()))[1]) / formatDecimals;
            printTable(QCONEReserve, BNBReserve, QCONEPrice);
            marketingFee = (await token.balanceOf(users[18].address)) / formatDecimals; 
            contractBalance = (await token.balanceOf(token.address)) / formatDecimals;
            console.log("contract balance: ", contractBalance);
            console.log("marketing balance: ", marketingFee);
            console.log("busd balance, address", await rewardToken.balanceOf(ADMIN_WALLET), ADMIN_WALLET);
            console.log("busd balance", await rewardToken.balanceOf(users[0].address), users[0].address);
            console.log("busd balance", await rewardToken.balanceOf(users[1].address), users[1].address);
            console.log("busd balance", await rewardToken.balanceOf(users[4].address), users[4].address);

                        //////////////////////
            // BUY
            console.log("After buy price and liquidity");
            await panCakeRouter.connect(users[4]).swapExactETHForTokensSupportingFeeOnTransferTokens(
                0, // accept any amount of Tokens
                path.reverse(),
                users[1].address,
                new Date().getTime(), {
                    value: ethers.utils.parseEther((parseFloat(QCONEPrice)*3100).toString())
                }
            )

            reserves = await panCakePair.getReserves();
            QCONEReserve = reserves['reserve0']/formatDecimals;
            BNBReserve   = reserves['reserve1']/formatDecimals;

            QCONEPrice = ((await panCakeRouter.getAmountsOut(ethers.utils.parseEther('1'), path.reverse()))[1]) / formatDecimals;
            printTable(QCONEReserve, BNBReserve, QCONEPrice);
            marketingFee = (await token.balanceOf(users[18].address)) / formatDecimals; 
            contractBalance = (await token.balanceOf(token.address)) / formatDecimals;
            console.log("contract balance: ", contractBalance);
            console.log("marketing balance: ", marketingFee);
            console.log("busd balance, address", await rewardToken.balanceOf(ADMIN_WALLET), ADMIN_WALLET);
            console.log("busd balance", await rewardToken.balanceOf(users[0].address), users[0].address);
            console.log("busd balance", await rewardToken.balanceOf(users[1].address), users[1].address);
            console.log("busd balance", await rewardToken.balanceOf(users[4].address), users[4].address);
        });
    });

    function printTable(QCONEReserve, BNBReserve, price) {
        console.table([
            ["LP QCONE", "LP WBNB Amount", "Price"],
            [QCONEReserve, BNBReserve, `${price} BNB/QCONE`]
        ]);
    }
});
