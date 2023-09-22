 
const moment = require("moment");
const fs = require('fs');
const redis_kline = require("./redis-kline");
const redis = require("./redis");
const data = JSON.parse(fs.readFileSync('binancepair.json', 'utf-8'));
const days = 32; // 获取过去 200 根K线的数据



const SMA = (coinHistoricalKline, period) => {
  let coinclosePirces= [];
  for(let i=0;i<coinHistoricalKline.length;i++){
      coinclosePirces.push(parseFloat(JSON.parse(coinHistoricalKline[i]).close));
  }
  const smaValues = [];
  for (let i = 0; i < coinclosePirces.length; i++) {
    if (i < period - 1) {
      smaValues.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += coinclosePirces[i - j];
      }
      const average = sum / period;
      smaValues.push(average);
    }
  }
  return smaValues;
};

const detectCrossovers = (smaShort, smaLong) => {
  let res =0;
  if (smaShort[smaShort.length-1] > smaLong[smaLong.length-1] && smaShort[smaShort.length-2] <= smaLong[smaLong.length-2]) {
    res = 1;
  } else if (smaShort[smaShort.length-1] < smaLong[smaLong.length-1] && smaShort[smaShort.length-2] >= smaLong[smaLong.length-2]) {
    res = 2;
  }
  return res;
};
const bullbear = (smaShort, smaMid,smaLong) => {
  let res =0;
  if (smaShort[smaShort.length-1] > smaMid[smaMid.length-1] > smaLong[smaLong.length-1]) {
    res = 1;
  } else if (smaShort[smaShort.length-1] < smaMid[smaMid.length-1] < smaLong[smaLong.length-1]) {
    res = 2;
  }
  return res;
};


class MA {
    async find(){
      console.log(`\n[${moment().format("YYYY-MM-DD HH:mm:ss")}] binance- MA`);
      let timenow = Date.now();
      const findaction = [];
      for(let i=0;i<data.length;i++){
        let symbol =data[i];
        let day1MA = this.MA(symbol,"-1d",-days,-1);
        let hour4MA = this.MA(symbol,"-4h",-days,-1);
        findaction.push(day1MA);
        findaction.push(hour4MA);
      }
      await Promise.all(findaction).then(result=>{
        console.log(Date.now()-timenow);
      });
    }

    async MA(symbol,interval,from,to){        
        const coinHistoricalKline = await redis_kline.LRANGE("binance_kline:"+symbol+interval,from,to); //"BTCUSDT"+ "-" + "1d",-30,-1

        if (coinHistoricalKline.length >= days) {
          const MA5 = SMA(coinHistoricalKline,5);
          const MA10 = SMA(coinHistoricalKline,10);
          const MA30 = SMA(coinHistoricalKline,30);
          // if(symbol == "ETHUSDT"){
          //   let coinclosePirces= [];
          //   for(let i=0;i<coinHistoricalKline.length;i++){
          //       coinclosePirces.push(parseFloat(JSON.parse(coinHistoricalKline[i]).close));
          //   }
          //   console.log(interval,coinclosePirces);
          //   console.log('symbol------:', symbol,interval);
          //   console.log('MA5 values:', MA5);
          //   console.log('MA10 values:', MA10);
          //   console.log('MA30 values:', MA30);
          //   const crossovers5_10 = detectCrossovers(MA5,MA10);
          //   const crossovers10_30 = detectCrossovers(MA10,MA30);
          //   console.log(crossovers5_10,crossovers10_30);
          // }
          const crossovers5_10 = detectCrossovers(MA5,MA10);
          const crossovers10_30 = detectCrossovers(MA10,MA30);
          const bullbear_res = bullbear(MA5,MA10,MA30);

          let JSONcoininfo = JSON.parse(coinHistoricalKline[coinHistoricalKline.length-1]);
          let nowPrice = JSONcoininfo.close;
          let nowVolume = JSONcoininfo.volume;
          let nowPriceChange = (100*(nowPrice - JSONcoininfo.open)/JSONcoininfo.open).toFixed(2);
          let coin = {"timestamp":Date.now(),nowPrice,nowVolume,nowPriceChange};
          let expireTime = 60;
      
         // console.log('Crossover=',crossovers);
          if(crossovers5_10==1){
            await redis.set("binance-MA-5_10golden-"+interval+":"+ symbol,JSON.stringify(coin),expireTime);     
                  // console.log(symbol,interval,"golden");
          }
          if(crossovers5_10==2){
            await redis.set("binance-MA-5_10death-"+interval+":"+  symbol,JSON.stringify(coin),expireTime);   
            //console.log(symbol,interval,"death");
          }
          if(crossovers10_30==1){
            await redis.set("binance-MA-10_30golden-"+interval+":"+ symbol,JSON.stringify(coin),expireTime);
          }
          if(crossovers10_30==2){
            await redis.set("binance-MA-10_30death--"+interval+":"+  symbol,JSON.stringify(coin),expireTime);  
          }
          if(bullbear_res==1){
            await redis.set("binance-MA-5_10_30Bull-"+interval+":"+ symbol,JSON.stringify(coin),expireTime);
          }
          if(bullbear_res==2){
            await redis.set("binance-MA-5_10_30Bear-"+interval+":"+  symbol,JSON.stringify(coin),expireTime);  
          }
     
        } else {
          //console.log('symbol------:', symbol);
         // console.log('Not enough data to calculate MA.');
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
new MA().start();