 
const moment = require("moment");
const fs = require('fs');
const redis_kline = require("./redis-kline");
const redis = require("./redis");
const data = JSON.parse(fs.readFileSync('binancepair.json', 'utf-8'));
const days = 18; // 获取过去 14 根K线的数据

function calculateCCI(ohlcvData, period = 14) {
  const typicalPrices = ohlcvData.map((bar) => (parseFloat(JSON.parse(bar).high) + parseFloat(JSON.parse(bar).low) + parseFloat(JSON.parse(bar).close)) / 3);

 // console.log(typicalPrices);
  const cci = [];

  for (let i = 0; i < ohlcvData.length; i++) {
    if (i < period - 1) {
      cci.push(NaN);
      continue;
    }

    const periodTypicalPrices = typicalPrices.slice(i - period + 1, i + 1);
    const sma = periodTypicalPrices.reduce((a, b) => a + b, 0) / period;
    const meanDeviation = periodTypicalPrices.reduce((a, b) => a + Math.abs(b - sma), 0) / period;
    const currentCCI = (typicalPrices[i] - sma) / (0.015 * meanDeviation);
    cci.push(currentCCI);
  }

  return cci;
}


const detectCrossovers = (R) => {
      let res =0;
      if (R[R.length-1] > 0 && R[R.length-2] <= 0) {
        res = 1;
      } else if (R[R.length-1] < 0 && R[R.length-2] >= 0) {
        res = 2;
      }
      return res;
};
const superBuySell = (R) => {
      let res =0;
      if (R[R.length-1] > 100 ) {
        res = 1;
      } else if (R[R.length-1] < -100 ) {
        res = 2;
      }
      return res;
};

class CCI {
    async find(){
      console.log(`\n[${moment().format("YYYY-MM-DD HH:mm:ss")}] binance- CCI`);
      let timenow = Date.now();
      const findaction = [];
      for(let i=0;i<data.length;i++){
        let symbol =data[i];
        let day1CCI = this.CCI(symbol,"-1d",-days,-1);
        let hour4CCI = this.CCI(symbol,"-4h",-days,-1);
        findaction.push(day1CCI);
        findaction.push(hour4CCI);
      }
      await Promise.all(findaction).then(result=>{
        console.log(Date.now()-timenow);
      });
    }

    async CCI(symbol,interval,from,to){        
        const coinHistoricalKline = await redis_kline.LRANGE("binance_kline:"+symbol+interval,from,to); //"BTCUSDT"+ "-" + "1d",-30,-1

        if (coinHistoricalKline.length >= days) {
          const CCI = calculateCCI(coinHistoricalKline);
          // if(symbol == "ETHUSDT"){
          //   console.log('symbol------:', symbol,interval);
          //   console.log('CCI values:', CCI);
          // }
          const crossovers = detectCrossovers(CCI);
          const super_BuySell = superBuySell(CCI);

          let JSONcoininfo = JSON.parse(coinHistoricalKline[coinHistoricalKline.length-1]);
          let nowPrice = JSONcoininfo.close;
          let nowVolume = JSONcoininfo.volume;
          let nowPriceChange = (100*(nowPrice - JSONcoininfo.open)/JSONcoininfo.open).toFixed(2);
          let coin = {"timestamp":Date.now(),nowPrice,nowVolume,nowPriceChange};
          let expireTime = 30;
      
         // console.log('Crossover=',crossovers);
          if(crossovers==1){
            await redis.set("binance-CCI-upcrosszero-"+interval+":"+ symbol,JSON.stringify(coin),expireTime);     
                  // console.log(symbol,interval,"golden");
          }
          if(crossovers==2){
            await redis.set("binance-CCI-downcrosszero-"+interval+":"+  symbol,JSON.stringify(coin),expireTime);    

            //console.log(symbol,interval,"death");
          }
          if(super_BuySell==1){
            await redis.set("binance-CCI-superbuy-"+interval+":"+ symbol,JSON.stringify(coin),expireTime);   

          }
          if(super_BuySell==2){
            await redis.set("binance-CCI-supersell-"+interval+":"+  symbol,JSON.stringify(coin),expireTime);  
          }
     
        } else {
          //console.log('symbol------:', symbol);
         // console.log('Not enough data to calculate CCI.');
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
new CCI().start();