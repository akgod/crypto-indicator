 
const moment = require("moment");
const fs = require('fs');
const redis_kline = require("./redis-kline");
const redis = require("./redis");
const data = JSON.parse(fs.readFileSync('binancepair.json', 'utf-8'));
const days = 68; // 获取过去 26 天的数据以计算 26 日 EMA
const EMA = (prices, period) => {
    const alpha = 2 / (period + 1);
    let result = [prices[0]];
    for (let i = 1; i < prices.length; i++) {
      result[i] = alpha * prices[i] + (1 - alpha) * result[i - 1];
    }
    return result;
};


const detectCrossovers = (fastLine, slowLine) => {
      let res =0;
      if (fastLine[fastLine.length-1] > slowLine[slowLine.length-1] && fastLine[fastLine.length-2] <= slowLine[slowLine.length-2]) {
        res = 1;
      } else if (fastLine[fastLine.length-1] < slowLine[slowLine.length-1] && fastLine[fastLine.length-2] >= slowLine[slowLine.length-2]) {
        res = 2;
      }
      return res;
};
const detectZero = (fastLine) => {
  let res =0;
  if (fastLine[fastLine.length-1] > 0 && fastLine[fastLine.length-2] <= 0) {
    res = 1;
  } else if (fastLine[fastLine.length-1] < 0 && fastLine[fastLine.length-2] >= 0) {
    res = 2;
  }
  return res;
};
class MACD {
    async find(){
      console.log(`\n[${moment().format("YYYY-MM-DD HH:mm:ss")}] binance- MACD`);
      let timenow = Date.now();
      const findaction = [];
      for(let i=0;i<data.length;i++){
        let symbol =data[i];
        let day1crossover = this.crossover(symbol,"-1d",-days,-1);
        let hour4crossover = this.crossover(symbol,"-4h",-days,-1);
        findaction.push(day1crossover);
        findaction.push(hour4crossover);
      }
      await Promise.all(findaction).then(result=>{
        console.log(Date.now()-timenow);
      });
    }
    async crossover(symbol,interval,from,to){        
        const coinHistoricalKline = await redis_kline.LRANGE("binance_kline:"+symbol+interval,from,to); //"BTCUSDT"+ "-" + "1d",-30,-1
        if(coinHistoricalKline ==null || coinHistoricalKline.length <26){
           // console.log(symbol,'~~~~~~~~~~~~Not enough data to calculate MACD.');
        }
        let coinclosePirces= [];
        for(let i=0;i<coinHistoricalKline.length;i++){
            coinclosePirces.push(parseFloat(JSON.parse(coinHistoricalKline[i]).close));
        }
        //console.log(coinclosePirces);

      
        if (coinclosePirces.length >= days) {
          const EMA12 = EMA(coinclosePirces, 12);
          const EMA26 = EMA(coinclosePirces, 26);      
          const DIF = EMA12.map((_, index) => EMA12[index] - EMA26[index]);
          const DEA = EMA(DIF, 9);
          // if(symbol == "ETHUSDT"){
          //   let coinclosePirces= [];
          //   for(let i=0;i<coinHistoricalKline.length;i++){
          //       coinclosePirces.push(parseFloat(JSON.parse(coinHistoricalKline[i]).close));
          //   }
          //   console.log(interval,coinclosePirces);
          //   console.log('symbol------:', symbol,interval);
          //   console.log('EMA12 values:', EMA12);
          //   console.log('DIF values:', DIF);
          //   console.log('DEA values:', DEA);

          // }
          const crossovers = detectCrossovers(DIF, DEA);
          const zero = detectZero(DIF);
          let JSONcoininfo = JSON.parse(coinHistoricalKline[coinHistoricalKline.length-1]);
          let nowPrice = JSONcoininfo.close;
          let nowVolume = JSONcoininfo.volume;
          let nowPriceChange = (100*(nowPrice - JSONcoininfo.open)/JSONcoininfo.open).toFixed(2);
          let coin = {"timestamp":Date.now(),nowPrice,nowVolume,nowPriceChange};
          let expireTime = 30;
      
         // console.log('Crossover=',crossovers);
          if(crossovers==1){
            await redis.set("binance-MACD-golden-"+interval+":"+ symbol,JSON.stringify(coin),expireTime);     
                  // console.log(symbol,interval,"golden");
          }
          if(crossovers==2){
            await redis.set("binance-MACD-death-"+interval+":"+  symbol,JSON.stringify(coin),expireTime);     

            //console.log(symbol,interval,"death");
          }
          if(zero==1){
            await redis.set("binance-MACD-upcrosszero-"+interval+":"+ symbol,JSON.stringify(coin),expireTime);     

           // console.log(symbol,interval,"dif up cross zero");
          }
          if(zero==2){
            await redis.set("binance-MACD-downcrosszero-"+interval+":"+  symbol,JSON.stringify(coin),expireTime);  
           // console.log(symbol,interval,"dif down cross zero");
          }

        } else {
          //  console.log(symbol,interval,'Not enough data to calculate MACD.');
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
new MACD().start();