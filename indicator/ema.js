 
const moment = require("moment");
const fs = require('fs');
const redis_kline = require("./redis-kline");
const redis = require("./redis");
const data = JSON.parse(fs.readFileSync('binancepair.json', 'utf-8'));
const days = 31; // 获取过去 200 根K线的数据

const calculateEMA = (coinHistoricalKline, days) => {
  let coinclosePirces= [];
  for(let i=0;i<coinHistoricalKline.length;i++){
      coinclosePirces.push(parseFloat(JSON.parse(coinHistoricalKline[i]).close));
  }
  const alpha = 2 / (days + 1);
  let result = [coinclosePirces[0]];
  for (let i = 1; i < coinclosePirces.length; i++) {
    result[i] = alpha * coinclosePirces[i] + (1 - alpha) * result[i - 1];
  }
  return result;
}; 



const detectCrossovers = (EEMAShort, EEMALong) => {
  let res =0;
  if (EEMAShort[EEMAShort.length-1] > EEMALong[EEMALong.length-1] && EEMAShort[EEMAShort.length-2] <= EEMALong[EEMALong.length-2]) {
    res = 1;
  } else if (EEMAShort[EEMAShort.length-1] < EEMALong[EEMALong.length-1] && EEMAShort[EEMAShort.length-2] >= EEMALong[EEMALong.length-2]) {
    res = 2;
  }
  return res;
};
const bullbear = (emaShort, emaMid,emaLong) => {
  let res =0;
  if (emaShort[emaShort.length-1] > emaMid[emaMid.length-1] > emaLong[emaLong.length-1]) {
    res = 1;
  } else if (emaShort[emaShort.length-1] < emaMid[emaMid.length-1] < emaLong[emaLong.length-1]) {
    res = 2;
  }
  return res;
};

class EMA {
    async find(){
      console.log(`\n[${moment().format("YYYY-MM-DD HH:mm:ss")}] binance- EMA`);
      let timenow = Date.now();
      const findaction = [];
      for(let i=0;i<data.length;i++){
        let symbol =data[i];
        let day1EMA = this.EMA(symbol,"-1d",-days,-1);
        let hour4EMA = this.EMA(symbol,"-4h",-days,-1);
        findaction.push(day1EMA);
        findaction.push(hour4EMA);
      }
      await Promise.all(findaction).then(result=>{
        console.log(Date.now()-timenow);
      });
    }

    async EMA(symbol,interval,from,to){        
        const coinHistoricalKline = await redis_kline.LRANGE("binance_kline:"+symbol+interval,from,to); //"BTCUSDT"+ "-" + "1d",-30,-1

        if (coinHistoricalKline.length >= days) {
          const EMA5 = calculateEMA(coinHistoricalKline,5);
          const EMA10 = calculateEMA(coinHistoricalKline,10);
          const EMA30 = calculateEMA(coinHistoricalKline,30);
          // if(symbol == "ETHUSDT"){
          //   console.log('symbol------:', symbol,interval);
          //   console.log('EMA5 values:', EMA5);
          //   console.log('EMA10 values:', EMA10);
          //   console.log('EMA30 values:', EMA30);
          //   const crossovers5_10 = detectCrossovers(EMA5,EMA10);
          //   const crossovers10_30 = detectCrossovers(EMA10,EMA30);
          //   console.log(crossovers5_10,crossovers10_30);
          // }
          const crossovers5_10 = detectCrossovers(EMA5,EMA10);
          const crossovers10_30 = detectCrossovers(EMA10,EMA30);
          const bullbear_res = bullbear(EMA5,EMA10,EMA30);

          let JSONcoininfo = JSON.parse(coinHistoricalKline[coinHistoricalKline.length-1]);
          let nowPrice = JSONcoininfo.close;
          let nowVolume = JSONcoininfo.volume;
          let nowPriceChange = (100*(nowPrice - JSONcoininfo.open)/JSONcoininfo.open).toFixed(2);
          let coin = {"timestamp":Date.now(),nowPrice,nowVolume,nowPriceChange};
          let expireTime = 30;
      
         // console.log('Crossover=',crossovers);
          if(crossovers5_10==1){
            await redis.set("binance-EMA-5_10golden-"+interval+":"+ symbol,JSON.stringify(coin),expireTime);     
                  // console.log(symbol,interval,"golden");
          }
          if(crossovers5_10==2){
            await redis.set("binance-EMA-5_10death-"+interval+":"+  symbol,JSON.stringify(coin),expireTime);   
            //console.log(symbol,interval,"death");
          }
          if(crossovers10_30==1){
            await redis.set("binance-EMA-10_30golden-"+interval+":"+ symbol,JSON.stringify(coin),expireTime);
          }
          if(crossovers10_30==2){
            await redis.set("binance-EMA-10_30death--"+interval+":"+  symbol,JSON.stringify(coin),expireTime);  
          }
          if(bullbear_res==1){
            await redis.set("binance-EMA-5_10_30Bull-"+interval+":"+ symbol,JSON.stringify(coin),expireTime);
          }
          if(bullbear_res==2){
            await redis.set("binance-EMA-5_10_30Bear-"+interval+":"+  symbol,JSON.stringify(coin),expireTime);  
          }
        } else {
          //console.log('symbol------:', symbol);
         // console.log('Not enough data to calculate EMA.');
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
new EMA().start();