const { expect } = require("chai");
const { ethers, web3 } = require("hardhat");
var fs = require('fs');
const { start } = require("repl");
const { defaultAccounts } = require("ethereum-waffle");
const { timeStamp } = require("console");
const joePairABI = (JSON.parse(fs.readFileSync('./artifacts/contracts/IPangolinPair.sol/IPangolinPair.json', 'utf8'))).abi;
const joeRouterABI = (JSON.parse(fs.readFileSync('./artifacts/contracts/IPangolinRouter.sol/IPangolinRouter.json', 'utf8'))).abi;

const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
const CONFIG = require("../credentials.json");
const AVAXprovider = new ethers.providers.JsonRpcProvider(CONFIG["C-CHAIN"]["URL"]);



describe("SMART NODES", function (){

  before(async() => {
    accounts = await ethers.getSigners();

    const iterMap = await ethers.getContractFactory("IterableMapping");
    map = await iterMap.deploy();
    await map.deployed();

    const nodeHandler = await ethers.getContractFactory("nodeHandler", {
      libraries:{
        IterableMapping: map.address,
        },
      });
    node = await nodeHandler.deploy(500, String(10**18));	
    await node.deployed();

    payees = [accounts[1].address, accounts[2].address, accounts[3].address, accounts[4].address];
    shares = [5, 10, 15, 20];
    addresses = [accounts[5].address, accounts[6].address, node.address];
    fees = [20, 70, 10, 10, 50];
    swapAmt = 10;

    const smnToken = await ethers.getContractFactory("SmartNodes");
    smntoken = await smnToken.deploy(
      payees, shares, addresses, fees, swapAmt
    );
    await smntoken.deployed();

  });

    const advanceBlock = () => new Promise((resolve, reject) => {
      web3.currentProvider.send({
          jsonrpc: '2.0',
          method: 'evm_mine',
          id: new Date().getTime(),
      }, async (err, result) => {
          if (err) { return reject(err) }
          // const newBlockhash =await web3.eth.getBlock('latest').hash
          return resolve()
      })
    })

  const advanceBlocks = async (num) => {
      let resp = []
      for (let i = 0; i < num; i += 1) {
          resp.push(advanceBlock())
      }
      await Promise.all(resp)
  }

  const advancetime = (time) => new Promise((resolve, reject) => {
      web3.currentProvider.send({
          jsonrpc: '2.0',
          method: 'evm_increaseTime',
          id: new Date().getTime(),
          params: [time],
      }, async (err, result) => {
          if (err) { return reject(err) }
          const newBlockhash = (await web3.eth.getBlock('latest')).hash

          return resolve(newBlockhash)
      })
  })

  // describe("NODE PreSale", function () {

  //     let wlAddresses =[];
  //     let accounts;
  //     let start, end;
  //     let addr0 = '0x0000000000000000000000000000000000000000';

  //     before(async () => {

  //       accounts = await ethers.getSigners();
  //       // const nodeHandler = await ethers.getContractFactory("nodeHandler");
  //       // node = await nodeHandler.deploy(10, String(10**18));
  //       // await node.deployed();

  //       const preSale = await ethers.getContractFactory("nodePresale");
  //       presale = await preSale.deploy(node.address, smntoken.address);
  //       await presale.deployed();

  //       const testToken = await ethers.getContractFactory("testToken");
  //       usdt = await testToken.deploy();
  //       await usdt.deployed();

  //       wlAddresses = [accounts[15].address, accounts[16].address, accounts[17].address, accounts[18].address, accounts[19].address];
        
  //       start = 1 * 24 * 60 * 60;
  //       end = 3 * 24 * 60 * 60;

  //       const blockNumBefore = await ethers.provider.getBlockNumber();
  //       const blockBefore = await ethers.provider.getBlock(blockNumBefore);
  //       timestamp = blockBefore.timestamp;

  //     });

  //     it ("Should set the correct params for Presale and nodeHandler", async function(){
  //       await node.updatePresale(presale.address);
  //       await smntoken.updatePresale(presale.address);

  //       await presale.updateWlToken(usdt.address);
  //       await presale.updateNodeValue((20 * 10**18).toLocaleString('fullwide', { useGrouping: false }));
  //       await presale.addPresaleWhiteList(wlAddresses);
  //       // await presale.addPresaleWhiteList([accounts[11].address]);
  //       await presale.addPresaleInvaders([accounts[11].address]);
  //       await presale.setPresaleParams(
  //         100, 2, 4,
  //         timestamp + start, timestamp + end,
  //         150 * 10**9, ethers.utils.parseEther("0.1"),
  //         accounts[13].address, accounts[14].address
  //       );

  //       expect(await node.presale()).to.equal(presale.address);
  //       expect(await presale.wlToken()).to.equal(usdt.address);
  //       expect(await presale.nodeValue()).to.equal((20 * 10**18).toLocaleString('fullwide', { useGrouping: false }));
  //       expect(await presale.isWhitelisted(accounts[15].address)).to.equal(true);
  //     });

  //     it("Should tranfer USDT to buyers", async function(){
  //       accountA = accounts[15];
  //       accountB = accounts[16];
  //       accountC = accounts[17];
  //       accountD = accounts[18];
  //       accountE = accounts[19];
  //       accountInvader = accounts[11];
  //       await usdt.transfer(accountA.address, 10000 * 10**9);
  //       await usdt.transfer(accountB.address, 10000 * 10**9);
  //       await usdt.transfer(accountC.address, 10000 * 10**9);
  //       await usdt.transfer(accountD.address, 10000 * 10**9);
  //       await usdt.transfer(accountE.address, 10000 * 10**9);
  //       await usdt.transfer(accountInvader.address, 10000 * 10**9);

  //       expect(await usdt.balanceOf(accountA.address)).to.equal(10000 * 10**9);
  //     });

  //     it("Should fail in changing Presale Params.", async function(){

  //       await expect(presale.connect(accounts[1]).setPresaleParams(
  //         100, 2, 4,
  //         timestamp + start, timestamp + end,
  //         150 * 10**9, ethers.utils.parseEther("0.1"),
  //         accounts[13].address, accounts[14].address
  //         )).to.be.revertedWith("Ownable: caller is not the owner");

  //       await expect(presale.setPresaleParams(
  //         100, 2, 4,
  //         timestamp - start, timestamp + end,
  //         150 * 10**9, ethers.utils.parseEther("0.1"),
  //         accounts[13].address, accounts[14].address
  //         )).to.be.revertedWith("PreSale: Starting time is less than current TimeStamp!");

    

  //     });

  //     it("Should not allow buyers to purchase NODEs", async function(){

  //       await expect(presale.connect(accountA).buyNodes(
  //         usdt.address, 150 * 10**9, "accA1")).to.be.revertedWith("Presale: Sale hasn't started");
  //     });

  //     it("Should allow buyers to purchase NODEs", async function(){
  //       await advancetime(1 * 24 * 60 * 60);
  //       await advanceBlock();

  //       //Invader
  //       await usdt.connect(accounts[11]).approve(presale.address, 750 * 10**9);
  //       await presale.connect(accounts[11]).buyNodes(
  //         usdt.address, 150 * 10**9, "accINV1");
        
  //       await presale.connect(accounts[11]).buyNodes(
  //         usdt.address, 150 * 10**9, "accINV2");

  //       await presale.connect(accounts[11]).buyNodes(
  //         usdt.address, 150 * 10**9, "accINV3");

  //       await presale.connect(accounts[11]).buyNodes(
  //         usdt.address, 150 * 10**9, "accINV4");
        
  //       await expect(presale.connect(accounts[11]).buyNodes(
  //         usdt.address, 150 * 10**9, "INV5")).to.be.revertedWith("PreSale: Max presale nodes per Invader reached");

  //       await expect(presale.connect(accounts[2]).buyNodes(
  //         usdt.address, 150 * 10**9, "accA1")).to.be.revertedWith("PreSale: buyer is not whitelisted");
        
  //       await usdt.connect(accountA).approve(presale.address, 300 * 10**9);
  //       await presale.connect(accountA).buyNodes(
  //         usdt.address, 150 * 10**9, "1111");
        
  //       await expect(presale.connect(accountA).buyNodes(
  //         usdt.address, 140 * 10**9, "accA2")).to.be.revertedWith("PreSale: Not enough USDC.e");
        
  //       await presale.connect(accountA).buyNodes(
  //         usdt.address, 150 * 10**9, "accA2");

  //       await expect(presale.connect(accountA).buyNodes(
  //         addr0, 0, "accA3", {value: ethers.utils.parseEther("0.1")}
  //       )).to.be.revertedWith("PreSale: Max presale nodes per user reached");

  //       await usdt.connect(accountB).approve(presale.address, 300 * 10**9);
  //       await presale.connect(accountB).buyNodes(
  //         usdt.address, 150 * 10**9, "accB1");
  //       await presale.connect(accountB).buyNodes(
  //         addr0, 0, "accB2", {value: ethers.utils.parseEther("0.1")});

  //       await usdt.connect(accountC).approve(presale.address, 300 * 10**9);
  //       await presale.connect(accountC).buyNodes(
  //         usdt.address, 150 * 10**9, "accC1");
  //       await presale.connect(accountC).buyNodes(
  //         addr0, 0, "accC2", {value: ethers.utils.parseEther("0.1")});
      
  //       await usdt.connect(accountD).approve(presale.address, 300 * 10**9);
  //       await presale.connect(accountD).buyNodes(
  //         usdt.address, 150 * 10**9, "accD1");
  //       await presale.connect(accountD).buyNodes(
  //         addr0, 0, "accD2", {value: ethers.utils.parseEther("0.1")});
        
  //       await usdt.connect(accountE).approve(presale.address, 300 * 10**9);


  //       // expect(await usdt.balanceOf(presale.address)).to.equal(750 * 10**9);
        

  //       console.log(await node.totalNodesCreated());

  //       // console.log(await node.getNodeNumberOf(accountA.address));
  //       // console.log(await node.isNodeOwner(accountA.address));
  //       // console.log(await node.getAllNodes(accountA.address));
  //       // console.log(await node.getIndexOfKey(accountA.address));
  //       // console.log(await presale.nodesPerUser(accountA.address));
  //       // console.log(await presale.maxPresaleNodesPerUser());
  //     });

  //     it("Should fail in changing Presale Params.", async function(){

  //         await expect(presale.setPresaleParams(
  //           100, 2, 4,
  //           timestamp + start + 1 * 24 * 60 * 60, timestamp + end,
  //           100 * 10**9, ethers.utils.parseEther("0.1"),
  //           accounts[13].address, accounts[14].address
  //           )).to.be.revertedWith("PreSale: Sale has already started. Cannot change Sale Params!");
      

  //     });

  //     it("Should not allow buyers to purchase NODEs", async function(){

  //       await advancetime(3 * 24 * 60 * 60);
  //       await advanceBlock();

  //       await usdt.connect(accountE).approve(presale.address, 300 * 10**9);
  //       await expect(presale.connect(accountE).buyNodes(
  //         usdt.address, 150 * 10**9, "accE1"
  //         )).to.be.revertedWith("PreSale: Sale has already ended");


  //     });

  //     it("Should display correct rewards", async function(){

  //       const blockNumBefore1 = await ethers.provider.getBlockNumber();
  //       const blockBefore1 = await ethers.provider.getBlock(blockNumBefore1);
  //       timestamp1 = blockBefore1.timestamp;
  //       // console.log((timestamp1 - timestamp)/(24*60*60));
  //       rewardsA = await node.getAllNodesRewards(accountA.address);
  //       // expect(String(rewardsA/10**18)).to.equal("24");

  //       await advancetime(10 * 24 * 60 * 60);
  //       await advanceBlock();

  //       rewardsA = await node.getAllNodesRewards(accountA.address);
  //       // console.log(String(rewardsA/10**18));

  //     });


  //     it("Should allow Owner to withdraw funds", async function(){

  //         await presale.withdrawAll(usdt.address);
  //         expect(await usdt.balanceOf(presale.address)).to.equal(0);

  //         // console.log(await web3.eth.getBalance(presale.address));

  //         await presale.withdrawCurrency(ethers.utils.parseEther("0.3"));
  //         // console.log(await web3.eth.getBalance(presale.address));

  //         // ownerBal = await web3.eth.getBalance(presale.address);

  //         // expect(String(ownerBal)).to.equal(String(10**18));
  //         // expect(await atoken.balanceOf(presale.address)).to.equal("10000000000000000000000");
  //         // expect(await btoken.balanceOf(presale.address)).to.equal(0);
          

  //     });

  // });

  describe("SMN Token", async function(){

    let payees = [], shares = [];
    let addresses = [], fees = [];

    before(async () => {
    //   // accounts = await ethers.getSigners();
  
    //   // payees = [accounts[1].address, accounts[2].address, accounts[3].address, accounts[4].address];
    //   // shares = [5, 10, 15, 20];
    //   // addresses = [accounts[5].address, accounts[6].address, node.address];
    //   // fees = [20, 70, 10, 10, 50];
    //   // swapAmt = 10;
  
    //   // const smnToken = await ethers.getContractFactory("SmartNodesss");
    //   // smntoken = await smnToken.deploy(
    //   //   payees, shares, addresses, fees, swapAmt
    //   // );
    // //   // await smntoken.deployed();
    const airDrop = await ethers.getContractFactory("airDrop");
    airdrop = await airDrop.deploy(node.address, smntoken.address);
    await airdrop.deployed();

    await node.updateAirDrop(airdrop.address);
    await smntoken.updateAirdrop(airdrop.address);
    console.log(await airdrop.nodeName());
  
    });
    
    it("Should set correct params for SMN Token", async function(){

      addresses = [accounts[5].address, accounts[6].address, smntoken.address];
      balances = [1 * 10*6, 19 * 10*6, 5020];

      await smntoken.migrate(addresses, balances);

      expect(await smntoken.balanceOf(accounts[5].address)).to.equal((10*6 * 10*18).toLocaleString('fullwide', { useGrouping: false })) ;
      expect(await smntoken.balanceOf(accounts[6].address)).to.equal((19 * 10*6 * 10*18).toLocaleString('fullwide', { useGrouping: false }));

      await smntoken.updateRefPool(accounts[2].address);
      await smntoken.updateNodeValue((20 * 10**18).toLocaleString('fullwide', { useGrouping: false }));

     //taking 1SMN:$5 and 1AVAX:$65
      await smntoken.addLiquidityJR((5000 * 10**18).toLocaleString('fullwide', { useGrouping: false }), ethers.utils.parseEther("384"), { value: ethers.utils.parseEther("384") });
      await smntoken.updateTaxes([25, 20, 30, 25], [40, 20, 30, 10], 20 * 24 * 3600, 20 * 24 * 3600);

      await node.updateToken(smntoken.address);
      await node.updateBoostTime(4);

    });
    it("Should check for contract ownership", async function(){
        
        expect(await smntoken.owner()).to.equal(accounts[0].address);
  
    });

    it("Should buy SMN token in public sale", async function(){
      const blockNumBefore = await ethers.provider.getBlockNumber();
      const blockBefore = await ethers.provider.getBlock(blockNumBefore);
      timestamp = blockBefore.timestamp;

      joeRouter = await smntoken.joeRouter();
      joePair = await smntoken.joePair();
      const joePairLink = new ethers.Contract(joePair, joePairABI, provider);
      const joeRouterLink = new ethers.Contract(joeRouter, joeRouterABI, provider);

      console.log(joePair)
      // await smntoken.updateSwapLiquify(false);
      bal1 = await smntoken.balanceOf(accounts[9].address);
      console.log(bal1)
      await joeRouterLink.connect(accounts[9]).swapExactAVAXForTokensSupportingFeeOnTransferTokens(
        100, ["0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", smntoken.address], accounts[9].address, timestamp + 100
        , {value : ethers.utils.parseEther("8")}
      );
      bal2 = await smntoken.balanceOf(accounts[9].address);
      console.log((bal2-bal1)/10**18);

      const reserves = await joePairLink.getReserves()
      const token0 = await joePairLink.token0()
      const token1 = await joePairLink.token1()
      console.log({
        token0,
        token1,
        reserve0: String(reserves[0]),
        reserve1: String(reserves[1])
      })

        
    });

    it("Should airdop SMN Token to users", async function(){

      // console.log(await smntoken.maxTransferAmount());
      await smntoken.setExcludedFromTax(accounts[6].address);

      await smntoken.connect(accounts[6]).transfer(accounts[7].address, (10*4 * 10*18).toLocaleString('fullwide', { useGrouping: false }));
      await smntoken.connect(accounts[6]).transfer(accounts[8].address, (10*4 * 10*18).toLocaleString('fullwide', { useGrouping: false }));
      await smntoken.connect(accounts[6]).transfer(accounts[9].address, (10*4 * 10*18).toLocaleString('fullwide', { useGrouping: false }));
      await smntoken.connect(accounts[6]).transfer(accounts[10].address, (10*4 * 10*18).toLocaleString('fullwide', { useGrouping: false }));
      // console.log(await smntoken.balanceOf(accounts[7].address));
      // expect( await smntoken.balanceOf(accounts[7].address)).to.equal((10*4 * 10*18).toLocaleString('fullwide', { useGrouping: false }));
    
    });


    it("Should create nodes", async function(){

      await advancetime(2 * 24 * 60 * 60);
      await advanceBlock();
      const joePairLink = new ethers.Contract(joePair, joePairABI, provider);
      const joeRouterLink = new ethers.Contract(joeRouter, joeRouterABI, provider);
      console.log(joePair, joeRouter);
      // console.log(await joePairLink.getReserves());
      // console.log(await joePairLink.name());
      contractBal1 = await smntoken.balanceOf(smntoken.address);

      await smntoken.connect(accounts[7]).approve(smntoken.address, (20 * 10**18).toLocaleString('fullwide', { useGrouping: false }));
      await smntoken.connect(accounts[7]).createNodeWithTokens("Acc7_1", (20 * 10**18).toLocaleString('fullwide', { useGrouping: false }));

      expect(await node.getNodesNames(accounts[7].address)).to.equal("Acc7_1");
      console.log(await smntoken.balanceOf(smntoken.address));

      await smntoken.connect(accounts[7]).approve(smntoken.address, (20 * 10**18).toLocaleString('fullwide', { useGrouping: false }));
      await smntoken.connect(accounts[7]).createNodeWithTokens("Acc7_2", (20 * 10**18).toLocaleString('fullwide', { useGrouping: false }));

    });
  
    it("Should claim rewards", async function(){

      await advancetime(1 * 24 * 60 * 60);
      await advanceBlock();
      rewards7 = await node.getAllNodesRewards(accounts[7].address);
      console.log(rewards7/10**18);
      // expect(String(rewards7/10**18)).to.equal("12");

      await advancetime(7 * 24 * 60 * 60);
      await advanceBlock();

      rewards7 = await node.getAllNodesRewards(accounts[7].address);
      console.log(rewards7/10**18);
      // expect(rewards7/10**18).to.be.closeTo(28, 0.01);
      
      bal1 = await smntoken.balanceOf(accounts[7].address);
      await smntoken.connect(accounts[7]).cashoutAll();
      bal2 = await smntoken.balanceOf(accounts[7].address);
      // console.log((bal2-bal1)/(10**18));


      // await smntoken.connect(accounts[7]).transfer(accounts[8].address, (10*2 * 10*18).toLocaleString('fullwide', { useGrouping: false }));

    });

    // it("Should sell SMN token with taxes", async function(){

    // })

    // it("Should deduct taxes", async function(){

    //   await smntoken.connect(accounts[7]).transfer(accounts[8].address, (10*2 * 10*18).toLocaleString('fullwide', { useGrouping: false }));
      
    //   expect(await smntoken.balanceOf(accounts[8].address)).to.equal("10070000000000000000000");

    //   await advancetime(21 * 24 * 60 * 60);
    //   await advanceBlock();

    //   await smntoken.connect(accounts[7]).transfer(accounts[8].address, (10*2 * 10*18).toLocaleString('fullwide', { useGrouping: false }));
    //   // await smntoken.connect(accounts[7]).transfer(joePair, (10*2 * 10*18).toLocaleString('fullwide', { useGrouping: false }));

    //   // expect(await smntoken.balanceOf(joePair)).to.equal("5155000000000000000000");
    //   expect(await smntoken.balanceOf(accounts[8].address)).to.equal("10145000000000000000000");

    //   console.log(await node.getTotalNodes());
    //   console.log(await smntoken.refPerNode());
      
    // });
    // return;
    
    it("Should airdrop nodes", async function(){

      names = ["Harry", "Blacky", "Viking", "Eights", "Indica", "XRP"];
      addresses = [accounts[12].address, accounts[13].address, accounts[14].address, accounts[15].address, accounts[16].address, accounts[17].address];
      nodes = 5;

      const data = await airdrop.estimateGas.airdropNodes(names, addresses, nodes);
      await airdrop.airdropNodes(names, addresses, nodes);
      // console.log(data);
      // console.log(await node.getAllNodes(accounts[17].address));
    });

  });

});