 
const moment = require("moment");
const fs = require('fs');
const redis_kline = require("./redis-kline");
const redis = require("./redis");
const data = JSON.parse(fs.readFileSync('binancepair.json', 'utf-8'));
const days = 14; // 获取过去 14 根K线的数据

const calculateTDSequential = (coinHistoricalKline) => {
  let closePrices= [];
  for(let i=0;i<coinHistoricalKline.length;i++){
      closePrices.push(parseFloat(JSON.parse(coinHistoricalKline[i]).close));
  }
  const buySetup = Array(closePrices.length).fill(0);
  const sellSetup = Array(closePrices.length).fill(0);

  for (let i = 4; i < closePrices.length; i++) {
    if (closePrices[i] < closePrices[i - 4]) {
      buySetup[i] = buySetup[i - 1] + 1;
    } else {
      buySetup[i] = 0;
    }

    if (closePrices[i] > closePrices[i - 4]) {
      sellSetup[i] = sellSetup[i - 1] + 1;
    } else {
      sellSetup[i] = 0;
    }
  }

  return { buySetup, sellSetup };
};

const BuySellSetup = (TD) => {
      let res =0;
      if (TD.buySetup[TD.buySetup.length -1]== 9 ) {
        res = 1;
      } else if (TD.sellSetup[TD.sellSetup.length -1]== 9 ) {
        res = 2;
      }
      return res;
};

class TD {
    async find(){
      console.log(`\n[${moment().format("YYYY-MM-DD HH:mm:ss")}] binance- TD`);
      let timenow = Date.now();
      const findaction = [];
      for(let i=0;i<data.length;i++){
        let symbol =data[i];
        let day1TD = this.TD(symbol,"-1d",-14,-1);
        let hour4TD = this.TD(symbol,"-4h",-14,-1);
        findaction.push(day1TD);
        findaction.push(hour4TD);
      }
      await Promise.all(findaction).then(result=>{
        console.log(Date.now()-timenow);
      });
    }

    async TD(symbol,interval,from,to){        
        const coinHistoricalKline = await redis_kline.LRANGE("binance_kline:"+symbol+interval,from,to); //"BTCUSDT"+ "-" + "1d",-30,-1

        if (coinHistoricalKline.length >= days) {
          const TD = calculateTDSequential(coinHistoricalKline);
         // console.log('symbol------:', symbol);
         // console.log('TD values:', TD);
          const BuySell_Setup = BuySellSetup(TD);
          
        // if(symbol == "ETHUSDT"){
        //     let coinclose= [];
        //     for(let i=0;i<coinHistoricalKline.length;i++){
        //         coinclose.push(parseFloat(JSON.parse(coinHistoricalKline[i]).close));
        //     }
        //     console.log(interval,coinclose);
        //     console.log('symbol------:', symbol,interval);
        //     console.log('RSI values:',TD);
        //   }
          let JSONcoininfo = JSON.parse(coinHistoricalKline[coinHistoricalKline.length-1]);
          let nowPrice = JSONcoininfo.close;
          let nowVolume = JSONcoininfo.volume;
          let nowPriceChange = (100*(nowPrice - JSONcoininfo.open)/JSONcoininfo.open).toFixed(2);
          let coin = {"timestamp":Date.now(),nowPrice,nowVolume,nowPriceChange};
          let expireTime = 30;
  
          if(BuySell_Setup == 1){
            await redis.set("binance-TD-buysetup-"+interval+":"+ symbol,JSON.stringify(coin),expireTime); 
          }
          if(BuySell_Setup == 2){
            await redis.set("binance-TD-sellsetup-"+interval+":"+  symbol,JSON.stringify(coin),expireTime);  
          }
     
        } else {
          //console.log('symbol------:', symbol);
         // console.log('Not enough data to calculate TD.');
        } 

      } 

    async start() {   
        await redis_kline.connect(); //连接redis_kline  
        await redis.connect();
        while (true) {
          try {
            await this.find();
          } catch (e) {
            console.error(e);
          }
          await sleep(5000);
        }
    }
}
new TD().start();