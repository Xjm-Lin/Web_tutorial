const { ethers, deployments, getNamedAccounts, network }=require("hardhat")
const { assert,expect } = require("chai")
//const { helpers } = require("@nomicfoundation/hardhat-network-helpers")
const helpers = require("@nomicfoundation/hardhat-network-helpers")
const {devlopmentChains} = require("../../../helper-hardhat-config")

//https://1rpc.io/sepolia

!devlopmentChains.includes(network.name)//使用三元运算符用来判断网络是本地网络还是sepolia测试网
? describe.skip//如果是真，则运行该代码跳过
//如果是假的，则运行下面的代码
:describe("test fundme contract", async function(){

    let fundMe
    let fundMeSecondAccount
    let firstAccount//第一个账户
    let secondAccount//第二个账户
    let mockV3Aggregator
    beforeEach(async function(){
        await deployments.fixture(["all"])
        firstAccount=(await getNamedAccounts()).firstAccount
        secondAccount=(await getNamedAccounts()).secondAccount

        const fundMeDeployment= await deployments.get("FundMe")
        mockV3Aggregator = await deployments.get("MockV3Aggregator")
        fundMe=await ethers.getContractAt("FundMe",fundMeDeployment.address)
        fundMeSecondAccount = await ethers.getContract("FundMe",secondAccount)
    })

    it("test if the owner is msg.sender", async function(){
        //创建合约工厂初始化合约，初始化完成之后才能调用合约中的方法
    
        await fundMe.waitForDeployment()
        assert.equal((await fundMe.Owner()), firstAccount)

    })

    it("test if the dataFeed is assigned correctly", async function(){
       
        await fundMe.waitForDeployment()
        assert.equal((await fundMe.dataFeed()), mockV3Aggregator.address)


    })

    //单元测试1
    //测试fundMe合约中的fund函数的功能是否可以正常执行
    it("window closed,value grater than minimum,fund failed",async function(){
        await helpers.time.increase(200)
        await helpers.mine()
        expect(fundMe.fund({value:ethers.parseEther("0.1")}))
            .to.be.revertedWith("window is closed")
        
    })

    it("window open,value is less than minimun,fund failed",async function(){
        expect(fundMe.fund({value:ethers.parseEther("0.001")}))
            .to.be.revertedWith("send more ETH")
    })


    it("window close,value is greater minimun,fund success",async function(){

        await fundMe.fund({value:ethers.parseEther("0.1")})

        const balance = await fundMe.fundersToAmount(firstAccount)
        expect(balance).to.equal(ethers.parseEther("0.1"))
        
    })


    //单元测试1:getFund()
    //测试fundMe合约中的getFund()函数的功能是否可以正常执行
    //测试非Owner调用，并且窗口关闭，
    it("not Owner,windows closed,target reached,getFund failed",async function(){
        await fundMe.fund({value:ethers.parseEther("1")})
        //窗口已经过时
        await helpers.time.increase(200)
        await helpers.mine()

        //使用非owner的第二个账户调用getFund()函数并报出提示信息
        expect(fundMeSecondAccount.getFund())
            .to.be.revertedWith("this function can only be called by owner")

    })

    //单元测试2:getFund()
    it("window open, target reached,getFund failed",async function(){
        await fundMe.fund({value:ethers.parseEther("1")})
        expect(fundMe.getFund())
            .to.be.revertedWith("Window is not closed!")
    })

    //单元测试3:getFund()
    it("window closed, target not reached,getFund failed",async function() {
        await fundMe.fund({value:ethers.parseEther("0.1")})
        await helpers.time.increase(200)
        await helpers.mine()
        expect(fundMe.getFund())
            .to.be.revertedWith("Target is reached")

    })

    //单元测试4:getFund()
    it("window closed, target reached, getFund success",async function() {
        await fundMe.fund({value:ethers.parseEther("1")})
        await helpers.time.increase(200)
        await helpers.mine()
        expect(fundMe.getFund())
            .to.emit("FundWithdrawByOwner")
            .withArgs(ethers.parseEther("1"))
    })


    //单元测试1:reFund()
    it("window open, target not reached, funder has balance",async function(){
        await fundMe.fund({value:ethers.parseEther("0.1")})
        expect(fundMe.reFund())
            .to.be.revertedWith("window is not closed")
    })
    //单元测试2:reFund()
    it("window closed,target reached,funder has balance",async function(){
        await fundMe.fund({value:ethers.parseEther("1")})
        await helpers.time.increase(200)
        await helpers.mine()
        expect(fundMe.reFund())
            .to.be.revertedWith("Target is reached")
    })
    
    //单元测试3:reFund()
    it("window closed,target reached,funder does not has balance",async function(){
        await fundMe.fund({value:ethers.parseEther("0.1")})
        await helpers.time.increase(200)
        await helpers.mine()
        expect(fundMeSecondAccount.reFund())
            .to.be.revertedWith("there is not fund for you!")
    })

    //单元测试4:reFund()
    it("window closed, target not reached, funder has balance",async function(){
        await fundMe.fund({value:ethers.parseEther("0.1")})
        await helpers.time.increase(200)
        await helpers.mine()
        expect(fundMeSecondAccount.reFund())
            .to.emit(fundMe,"RefundByFunder")
            .withArgs(firstAccount,ethers.parseEther("0.1"))
    })

})