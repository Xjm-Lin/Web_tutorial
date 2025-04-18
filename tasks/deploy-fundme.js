//从hardhat/config引入task的包
const {task} =require("hardhat/config")

//定义task的名称并且编写需要执行的代码逻辑
task("deploy-fundme").setAction(async(taskArgs,hre)=>{
    //1、创建合约工厂
        //使用await关键字将该操作进行挂起，意思是这句代码执行完毕之后，才能执行后续的操作
        const fundMeFactory = await ethers.getContractFactory("FundMe")
        
        //输出信息
        console.log("contract deploying");
        
        //2、部署合约
        const fundMe = await fundMeFactory.deploy(300);
        
        //3、合约部署完成之后，等待将该合约发送到区块链上
        await fundMe.waitForDeployment();
        
        //4、记录日志
        //使用1左边的符号可以使用(${变量})的方式进行访问，类似与python中的f'{变量}'格式化字符串
        console.log(`contract has been deployed successfully,contract address is ${fundMe.target}`)
    
        //判断是不是sepolia网络，而且判断etherscanApi为true的时候，则执行对应的代码
        if(hre.network.config.chainId==11155111 && process.env.ETHERSCAN_API_KEY){
    
            console.log("waiting for 5 confirmations")
            //将合约挂起等待5个区块之后再进行执行
            await fundMe.deploymentTransaction().wait(5);
            await verifyFundMe(fundMe.target,[300])
        }else{
            console.log("verification skipped..")
        }
})

//验证部署合约的函数
async function verifyFundMe(fundMeAddr,args){
 
    //验证合约
    await hre.run("verify:verify", {
        address: fundMeAddr,//传入合约的地址
        constructorArguments: args,//合约的构造函数的入参
      });

}


module.exports={}