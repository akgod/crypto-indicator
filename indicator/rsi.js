 
const moment = require("moment");
const fs = require('fs');
const redis_kline = require("./redis-kline");
const redis = require("./redis");
const data = JSON.parse(fs.readFileSync('binancepair.json', 'utf-8'));
const days = 79; // 获取过去 14 根K线的数据

const calculateRSI = (coinHistoricalKline, period = 14) => {
  const gains = [];
  const losses = [];
  let closePrices= [];
  for(let i=0;i<coinHistoricalKline.length;i++){
      closePrices.push(parseFloat(JSON.parse(coinHistoricalKline[i]).close));
  }

  for (let i = 1; i < closePrices.length; i++) {
    const change = closePrices[i] - closePrices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b) / period;

  const rsi = [100 - 100 / (1 + avgGain / avgLoss)];

  for (let i = period; i < gains.length; i++){
      const gain = gains[i];
      const loss = losses[i];

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      const rs = avgGain / avgLoss;
      const currentRsi = 100 - 100 / (1 + rs);
      rsi.push(currentRsi);
    }

    return rsi;
  };

  
const detectCrossovers = (R) => {
      let res =0;
      if (R[R.length-1] > 50 && R[R.length-2] <= 50) {
        res = 1;
      } else if (R[R.length-1] < 50 && R[R.length-2] >= 50) {
        res = 2;
      }
      return res;
};
const superBuySell = (R) => {
      let res =0;
      if (R[R.length-1] > 70 ) {
        res = 1;
      } else if (R[R.length-1] < 30 ) {
        res = 2;
      }
      return res;
};

class RSI {
    async find(){
      console.log(`\n[${moment().format("YYYY-MM-DD HH:mm:ss")}] binance- rsi`);
      let timenow = Date.now();
      const findaction = [];
      for(let i=0;i<data.length;i++){
        let symbol =data[i];
        let day1rsi = this.rsi(symbol,"-1d",-days,-1);
        let hour4rsi = this.rsi(symbol,"-4h",-days,-1);
        findaction.push(day1rsi);
        findaction.push(hour4rsi);
      }
      await Promise.all(findaction).then(result=>{
        console.log(Date.now()-timenow);
      });
    }

    async rsi(symbol,interval,from,to){        
        const coinHistoricalKline = await redis_kline.LRANGE("binance_kline:"+symbol+interval,from,to); //"BTCUSDT"+ "-" + "1d",-30,-1

        if (coinHistoricalKline.length >= days) {
          const rsi = calculateRSI(coinHistoricalKline);
         // console.log('symbol------:', symbol);
         // console.log('rsi values:', rsi);
          const crossovers = detectCrossovers(rsi);
          const super_BuySell = superBuySell(rsi);
        // if(symbol == "ETHUSDT"){
        //     let coinclose= [];
        //     for(let i=0;i<coinHistoricalKline.length;i++){
        //         coinclose.push(parseFloat(JSON.parse(coinHistoricalKline[i]).close));
        //     }
        //     console.log(interval,coinclose);
        //     console.log('symbol------:', symbol,interval);
        //     console.log('RSI values:',rsi);
        //   }

          let JSONcoininfo = JSON.parse(coinHistoricalKline[coinHistoricalKline.length-1]);
          let nowPrice = JSONcoininfo.close;
          let nowVolume = JSONcoininfo.volume;
          let nowPriceChange = (100*(nowPrice - JSONcoininfo.open)/JSONcoininfo.open).toFixed(2);
          let coin = {"timestamp":Date.now(),nowPrice,nowVolume,nowPriceChange};
          let expireTime = 30;
      
         // console.log('Crossover=',crossovers);
          if(crossovers==1){
            await redis.set("binance-RSI-golden-"+interval+":"+ symbol,JSON.stringify(coin),expireTime);     
                  // console.log(symbol,interval,"golden");
          }
          if(crossovers==2){
            await redis.set("binance-RSI-death-"+interval+":"+  symbol,JSON.stringify(coin),expireTime);    

            //console.log(symbol,interval,"death");
          }
          if(super_BuySell==1){
            await redis.set("binance-RSI-superbuy-"+interval+":"+ symbol,JSON.stringify(coin),expireTime);   

          }
          if(super_BuySell==2){
            await redis.set("binance-RSI-supersell-"+interval+":"+  symbol,JSON.stringify(coin),expireTime);  
          }
     
        } else {
          //console.log('symbol------:', symbol);
         // console.log('Not enough data to calculate rsi.');
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
new RSI().start();