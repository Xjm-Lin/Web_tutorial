// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
//导入chainLink预言机的Aggregator合约
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";



//1、创建一个收款的函数
//2、记录投资人并且查看
//3、在锁定期间，达到目标值的话，生产商可以进行提款
//4、在锁定期间，没有达到目标值的话，投资人在锁定期以后可以进行退款

contract FundMe {
    //定义一个mapping属性用于记录用户的地址(addreee)和投资金额，address是Key，uint是金额
    mapping (address => uint256) public fundersToAmount;

    //用于存储用户输入的WEI和ETH进行比较
    uint256 constant MINIMUM_VALUE = 100 * 10 ** 18;

    //定义一个常量用于存储筹集到的用户的资金
    uint256 constant TARGET=1000 * 10 ** 18;

    //定义一个所有者，用于后续的权限控制使用，只有提取人的地址和Owner的地址相同的时候，才能提取这笔资金
    //放到构造函数中进行初始化
    //后续提供一个修改所有者的函数，transferOwnership()函数
    address public Owner;

    //创建一个记录时间的变量
    uint256 deploymentTimeStamp;//记录当前的筹集时间
    uint256 lockTime;//记录时间的锁定周期

    //记录ERC20合约地址的变量
    address erc20Addr;

    //记录getFund是否执行成功,默认为false
    bool public getFundSuccess =false;
    
    //预言机合约中需要用到的变量
    AggregatorV3Interface internal dataFeed;

    constructor(uint256 _lockTime){
        //在构造器中初始化变量dataFeed，调用AggregatorV3Interface函数
        //传入的参数是ETH对比USD的价格
        dataFeed=AggregatorV3Interface(0x694AA1769357215DE4FAC081bf1f309aDC325306);
        //初始化当前用户
        Owner=msg.sender;
        //定义当前的筹集时间
        deploymentTimeStamp=block.timestamp;
        //定义当前锁定的周期
        lockTime=_lockTime;
    }

    //创建一个收款函数用于进行收款，需要定义payable关键字才可以进行收款
    function fund() external payable{
        require(converEthToUsd(msg.value)>=MINIMUM_VALUE,"send more ETH");
        require(block.timestamp<deploymentTimeStamp+lockTime,"windows is closed");
        fundersToAmount[msg.sender]=msg.value;
    }

    //chainlink预言机中的合约
    //通过调用latestRoundData函数返回的answer值是价格的意思
    function getChainlinkDataFeedLatestAnswer() public view returns (int) {
        // prettier-ignore
        (
            /* uint80 roundID */,
            int answer,
            /*uint startedAt*/,
            /*uint timeStamp*/,
            /*uint80 answeredInRound*/
        ) = dataFeed.latestRoundData();
        return answer;
    }

    //定义一个转换函数，用于计算ETH对比USD（美元）以太币此时的价格
    //计算的公式为:(用户输入的数量 * ETH的价格 = USD总价格)
    //参数ethAmount只的是用户输入的数量
    function converEthToUsd(uint256 ethAmount) internal view returns(uint256){
        //调用getChainlinkDataFeedLatestAnswer函数获取ETH此时的价格是多少
        uint256 ethPrice = uint(getChainlinkDataFeedLatestAnswer());
        //根据公式将最终的USD总价格进行返回，因为对比的是美元USD，所以返回值ethPrice/10**8
        return ethAmount*ethPrice/(10**8);
    }

    //定义修改提取资金的所有者
    function transferOwnership(address newOwner) public onlyOwner {
        //校验当前的提取者地址和构造函数中初始化的地址是不是相同
        //require(msg.sender==Owner,"this function can only be called by owner");
        //将新的所有者赋值给Owner变量
        Owner=newOwner;
    }

    //定义一个修改fundersToAmount变量值的函数，只能指定ERC20合约进行调用
    function setFundersToAmount(address funder,uint256 amountToUpdate) external {
        //添加校验，只有调用者的地址和ERC20合约的地址一样的情况下，才能执行后续的才做
        require(msg.sender==erc20Addr,"you do not have permission to call this function");
        //校验通过，则执行修改fundersToAmount变量的value的操作
        fundersToAmount[funder]=amountToUpdate;
    }
    
    //修改ERC20合约地址的函数，用于权限控制，只能是ERC合约地址才能调用上面的setFundersToAmount函数
    function setErc20Addr(address _erc20Addr) public onlyOwner {
        //只有合约的创建者才能修改ERC20合约的地址
        erc20Addr=_erc20Addr;
    }


    //提款函数：该函数表示获取筹集到的资金，只能通过外部调取该函数
    function getFund() external windowClosed onlyOwner {
        //使用require进行判断，判断本合约地址中筹集到资金是否大于最大值(TARGET)，如果满足就执行该代码
        require(converEthToUsd(address(this).balance)>=TARGET,"Target is not reached");
        

        //(1)transfer的用法：使用当前用户的address进行transfer转账操作，payable是进行类型转换，使它可以进行转账交易
        //payable(msg.sender).transfer(address(this).balance);

        //(2)call的用法：定义一个布尔类型的变量用于存储116
        bool success;
        //call的使用语法：[调用者的address].call{value:[传入的余额]}("[需要调用的函数，如果不需要则不用写]")
        (success,)=payable(msg.sender).call{value:address(this).balance}("");

        //将该地址的用户的value值清0，防止BUG
        fundersToAmount[msg.sender]=0;

        //getFund函数执行完成之后，修改getFundSuccess变量状态
        getFundSuccess=true;
    }
    

    //退款函数：该函数表示没有获取筹集到的资金的话进行退款的操作
    function reFund() external windowClosed {
        //使用require进行判断，判断本合约地址中筹集到资金是否小于最大值(TARGET)，如果满足就执行下面的操作
        require(converEthToUsd(address(this).balance)<TARGET,"Target is reached");


        //根据地址查找value的值(既存入的资金)，并且存入到变量amount中
        uint256 amount=fundersToAmount[msg.sender];

        //判断该用户存入的资金是不是等于0
        require( amount != 0,"there is not fund for you!");

        //退款操作
        bool success;
         (success,)=payable(msg.sender).call{value:amount}("");

        require(success,"transfer tx failed");

        //将该地址的中的value值清0，防止重复提款
        fundersToAmount[msg.sender]=0;
    }

    //定义一个modifier用于存储require的校验
    modifier windowClosed(){
         //判断当前的退回余额的时间是不是在锁定期内，如果超过这个锁定时间，则报错
        require(block.timestamp>=deploymentTimeStamp+lockTime,"Window is not closed!");
        _;
    }

    //定义一个判断提款退款地址的校验
    modifier onlyOwner(){
        //如果当前的提款人的地址和最初的发起人地址一致，才能进行提款
         require(msg.sender==Owner,"this function can only be called by owner");
         _;
    } 

}