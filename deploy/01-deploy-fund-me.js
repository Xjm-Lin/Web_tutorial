const { getNamedAccounts, network } = require("hardhat")
const { devlopmentChains,networkConfig,LOCK_TIME,CONFIRMATIONS } = require("../helper-hardhat-config")

module.exports = async({getNamedAccounts,deployments}) => {
    const firstAccount= (await getNamedAccounts()).firstAccount
    // console.log("firstAccount address is ",firstAccount)
    // console.log("this is deploy function")
    const{deploy}=deployments

    let dataFeedAddr
    let confirmations
    if(devlopmentChains.includes(network.name)){
        confirmations=0
        const mockV3Aggregator = await deployments.get("MockV3Aggregator")
        dataFeedAddr = mockV3Aggregator.address
    }else{
        dataFeedAddr=networkConfig[network.config.chainId].ethDataDataFeed
        confirmations=CONFIRMATIONS
    }


    const fundMe = await deploy("FundMe",{
        from:firstAccount,//合约的调用者
        args:[LOCK_TIME,dataFeedAddr],//合约的构造函数的入参
        log:true,
        waitConfirmations:confirmations//等待5个区块
        
    })
    //验证合约,如果是sepolia测试网，则执行下面的代码
    if(hre.network.config.chainId==11155111 && process.env.ETHERSCAN_API_KEY){
        
        await hre.run("verify:verify", {
            address: fundMe.address,//传入合约的地址
            constructorArguments: [LOCK_TIME,dataFeedAddr]//合约的构造函数的入参
        });
    }else{
        console.log("Network is not sepolia,verification skipped...")
    }
    


    
}
module.exports.tags=["all","fundme"]