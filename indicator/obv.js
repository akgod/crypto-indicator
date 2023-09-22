 
const moment = require("moment");
const fs = require('fs');
const redis_kline = require("./redis-kline");
const redis = require("./redis");
const data = JSON.parse(fs.readFileSync('binancepair.json', 'utf-8'));
const days = 18; // 获取过去 8 根K线的数据
// function calculateOBV(ohlcvData) {
//   const obv = [0];
//   for (let i = 1; i < ohlcvData.length; i++) {
//     const prevClose = parseFloat(JSON.parse(ohlcvData[i - 1]).close);
//     const currClose = parseFloat(JSON.parse(ohlcvData[i]).close);
//     const currVolume = parseFloat(JSON.parse(ohlcvData[i]).volume);

//     if (currClose > prevClose) {
//       obv.push(obv[obv.length - 1] + currVolume);
//     } else if (currClose < prevClose) {
//       obv.push(obv[obv.length - 1] - currVolume);
//     } else {
//       obv.push(obv[obv.length - 1]);
//     }
//   }
//   return obv;
// }

function calculateOBV(ohlcvData, ignoreFirstN = 0) {
  const obv = [0];
  let prices = [];
  let volumes = [];
  for(let i=0;i<ohlcvData.length;i++){
     prices.push(parseFloat(JSON.parse(ohlcvData[i]).close));
    volumes.push(parseFloat(JSON.parse(ohlcvData[i]).volume));
  }


  const effectivePrices = prices.slice(ignoreFirstN);
  const effectiveVolumes = volumes.slice(ignoreFirstN);

  for (let i = 1; i < effectivePrices.length; i++) {
    if (effectivePrices[i] > effectivePrices[i - 1]) {
      obv[i] = obv[i - 1] + effectiveVolumes[i];
    } else if (effectivePrices[i] < effectivePrices[i - 1]) {
      obv[i] = obv[i - 1] - effectiveVolumes[i];
    } else {
      obv[i] = obv[i - 1];
    }
  }

  return obv;
}

function obvTrendConfirmation(ohlcvData, obv) {
    const prev3Close = parseFloat(JSON.parse(ohlcvData[ohlcvData.length - 6]).close);
    const prev2Close = parseFloat(JSON.parse(ohlcvData[ohlcvData.length - 5]).close);
    const prev1Close = parseFloat(JSON.parse(ohlcvData[ohlcvData.length - 4]).close);
    const prev0Close = parseFloat(JSON.parse(ohlcvData[ohlcvData.length - 3]).close);
    const currClose = parseFloat(JSON.parse(ohlcvData[ohlcvData.length-2]).close);
    const prev3Obv = obv[obv.length-6];
    const prev2Obv = obv[obv.length-5];
    const prev1Obv = obv[obv.length-4];
    const prev0Obv = obv[obv.length-3];
    const currObv = obv[obv.length-2];

    let res5 =0;
    let res4 =0;
    if (currClose > prev0Close && currObv > prev0Obv && prev0Close > prev1Close && prev0Obv > prev1Obv && prev1Close > prev2Close && prev1Obv > prev2Obv && prev2Close > prev3Close && prev2Obv > prev3Obv) {
        res5 = 1;
    } else if (currClose < prev0Close && currObv < prev0Obv && prev0Close < prev1Close && prev0Obv < prev1Obv && prev1Close < prev2Close && prev1Obv < prev2Obv && prev2Close < prev3Close && prev2Obv < prev3Obv) {
        res5 = 2
    }
    if (currClose > prev0Close && currObv > prev0Obv && prev0Close > prev1Close && prev0Obv > prev1Obv && prev1Close > prev2Close && prev1Obv > prev2Obv) {
        res4 = 3;
    } else if (currClose < prev0Close && currObv < prev0Obv && prev0Close < prev1Close && prev0Obv < prev1Obv && prev1Close < prev2Close && prev1Obv < prev2Obv) {
        res4 = 4;
    }
    return {res5,res4};
}

class OBV {
    async find(){
      console.log(`\n[${moment().format("YYYY-MM-DD HH:mm:ss")}] binance- OBV`);
      let timenow = Date.now();
      const findaction = [];
      for(let i=0;i<data.length;i++){
        let symbol =data[i];
        let day1OBV = this.OBV(symbol,"-1d",-days,-1);
        let hour4OBV = this.OBV(symbol,"-4h",-days,-1);
        findaction.push(day1OBV);
        findaction.push(hour4OBV);
      }
      await Promise.all(findaction).then(result=>{
        console.log(Date.now()-timenow);
      });
    }

    async OBV(symbol,interval,from,to){        
        const coinHistoricalKline = await redis_kline.LRANGE("binance_kline:"+symbol+interval,from,to); //"BTCUSDT"+ "-" + "1d",-30,-1

        if (coinHistoricalKline.length >= days) {      
          const OBV =  calculateOBV(coinHistoricalKline);
          // if(symbol == "ETHUSDT"){
          //   let coinVolume= [];
          //   for(let i=0;i<coinHistoricalKline.length;i++){
          //       coinVolume.push(parseFloat(JSON.parse(coinHistoricalKline[i]).volume));
          //   }
          //   console.log(interval,coinVolume);
          //   console.log('symbol------:', symbol,interval);
          //   console.log('OBV values:', JSON.stringify(OBV));
          // }
          const BuySell_Singal =obvTrendConfirmation(coinHistoricalKline,OBV);
 
          let JSONcoininfo = JSON.parse(coinHistoricalKline[coinHistoricalKline.length-1]);
          let nowPrice = JSONcoininfo.close;
          let nowVolume = JSONcoininfo.volume;
          let nowPriceChange = (100*(nowPrice - JSONcoininfo.open)/JSONcoininfo.open).toFixed(2);
          let coin = {"timestamp":Date.now(),nowPrice,nowVolume,nowPriceChange};
          let expireTime = 60;
  
   
          if(BuySell_Singal.res5 == 1){
            await redis.set("binance-OBV-5increase-"+interval+":"+ symbol,JSON.stringify(coin),expireTime); 
          }
          if(BuySell_Singal.res5 == 2){
            await redis.set("binance-OBV-5decline-"+interval+":"+  symbol,JSON.stringify(coin),expireTime);  
          }
          if(BuySell_Singal.res4 == 3){
            await redis.set("binance-OBV-4increase-"+interval+":"+ symbol,JSON.stringify(coin),expireTime); 
          }
          if(BuySell_Singal.res4 == 4){
            await redis.set("binance-OBV-4decline-"+interval+":"+  symbol,JSON.stringify(coin),expireTime);  
          }
     
        } else {
          //console.log('symbol------:', symbol);
         // console.log('Not enough data to calculate OBV.');
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
new OBV().start();