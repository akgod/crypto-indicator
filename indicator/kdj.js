 
const moment = require("moment");
const fs = require('fs');
const redis_kline = require("./redis-kline");
const redis = require("./redis");
const data = JSON.parse(fs.readFileSync('binancepair.json', 'utf-8'));
const klineNum = 18; // 获取过去 9 根K线的数据


const RSV = (prices, highs, lows, n) => {
  let rsv = Array(n - 1).fill(0);
  for (let i = n - 1; i < prices.length; i++) {
    const lowInPeriod = Math.min(...lows.slice(i - n + 1, i + 1));
    const highInPeriod = Math.max(...highs.slice(i - n + 1, i + 1));
    rsv.push(((prices[i] - lowInPeriod) / (highInPeriod - lowInPeriod)) * 100);
  }
  return rsv;
};

const calculateKDJ = (coinHistoricalKline, n = 9, m1 = 3, m2 = 3) => {
  let prices= [];
  for(let i=0;i<coinHistoricalKline.length;i++){
    prices.push(parseFloat(JSON.parse(coinHistoricalKline[i]).close));
  }
  let highs= [];
  for(let i=0;i<coinHistoricalKline.length;i++){
    highs.push(parseFloat(JSON.parse(coinHistoricalKline[i]).high));
  }
  let lows= [];
  for(let i=0;i<coinHistoricalKline.length;i++){
    lows.push(parseFloat(JSON.parse(coinHistoricalKline[i]).low));
  }
  const rsv = RSV(prices, highs, lows, n);

  let kValues = Array(n - 1).fill(50);
  let dValues = Array(n - 1).fill(50);

  for (let i = n - 1; i < rsv.length; i++) {
    kValues.push((1 - 1 / m1) * kValues[i - 1] + (1 / m1) * rsv[i]);
    dValues.push((1 - 1 / m2) * dValues[i - 1] + (1 / m2) * kValues[i]);
  }

  return { kValues, dValues };
};
  
const detectCrossovers = (K, D) => {
      let res =0;
      if (K[K.length-1] > D[D.length-1] && K[K.length-2] <= D[D.length-2]) {
        res = 1;
      } else if (K[K.length-1] < D[D.length-1] && K[K.length-2] >= D[D.length-2]) {
        res = 2;
      }
      return res;
};
const superBuySell = (K, D) => {
      let res =0;
      if (K[K.length-1] > 80 && D[D.length-1] > 80) {
        res = 1;
      } else if (K[K.length-1] < 20 && D[D.length-1] < 20) {
        res = 2;
      }
      return res;
};

class KDJ {
    async find(){
      console.log(`\n[${moment().format("YYYY-MM-DD HH:mm:ss")}] binance- KDJ`);
      let timenow = Date.now();
      const findaction = [];
      for(let i=0;i<data.length;i++){
        let symbol =data[i];
        let day1kdj = this.kdj(symbol,"-1d",-klineNum,-1);
        let hour4kdj = this.kdj(symbol,"-4h",-klineNum,-1);
        findaction.push(day1kdj);
        findaction.push(hour4kdj);
      }
      await Promise.all(findaction).then(result=>{
        console.log(Date.now()-timenow);
      });
    }
    async kdj(symbol,interval,from,to){        
        const coinHistoricalKline = await redis_kline.LRANGE("binance_kline:"+symbol+interval,from,to); //"BTCUSDT"+ "-" + "1d",-30,-1

        if (coinHistoricalKline.length >= klineNum) {
          const kdj = calculateKDJ(coinHistoricalKline);
          // if(symbol == "ETHUSDT"){
          //    console.log('symbol------:', symbol,interval);
          //    console.log('KDJ values:', kdj);        
          // }
    
          const crossovers = detectCrossovers(kdj.kValues, kdj.dValues);
          const super_BuySell = superBuySell(kdj.kValues, kdj.dValues);
          let JSONcoininfo = JSON.parse(coinHistoricalKline[coinHistoricalKline.length-1]);
          let nowPrice = JSONcoininfo.close;
          let nowVolume = JSONcoininfo.volume;
          let nowPriceChange = (100*(nowPrice - JSONcoininfo.open)/JSONcoininfo.open).toFixed(2);
          let coin = {"timestamp":Date.now(),nowPrice,nowVolume,nowPriceChange};
          let expireTime = 30;
      
         // console.log('Crossover=',crossovers);
          if(crossovers==1){
            await redis.set("binance-KDJ-golden-"+interval+":"+ symbol,JSON.stringify(coin),expireTime);     
                  // console.log(symbol,interval,"golden");
          }
          if(crossovers==2){
            await redis.set("binance-KDJ-death-"+interval+":"+  symbol,JSON.stringify(coin),expireTime);    

            //console.log(symbol,interval,"death");
          }
          if(super_BuySell==1){
            await redis.set("binance-KDJ-superbuy-"+interval+":"+ symbol,JSON.stringify(coin),expireTime);   

          }
          if(super_BuySell==2){
            await redis.set("binance-KDJ-supersell-"+interval+":"+  symbol,JSON.stringify(coin),expireTime);  
          }
     
        } else {
          //console.log('symbol------:', symbol);
         // console.log('Not enough data to calculate KDJ.');
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
new KDJ().start();