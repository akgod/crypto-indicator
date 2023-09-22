// 安装redis环境
//sudo apt update
//apt install redis

//导入redis模块
// npm install -g npm@latest
// sudo npm install -g n
// sudo n stable # latest #(升级node.js到最新版) stable #（升级node.js到最新稳定版)
//重启 shell 命令行客户端
//npm install redis

//    /etc/init.d/redis-server restart
//    /etc/init.d/redis-server stop
//    /etc/init.d/redis-server start

const redis = require("redis");
//const url = `redis://${process.env.redisHost}:${process.env.redisPort}`;
const url = `redis://127.0.0.1:6379`;
const client = redis.createClient({ url , password:"******"}); 
global.sleep = async (timeout) => {
    return new Promise((res, rej) =>
      setTimeout(() => {
        return res();
      }, timeout)
    );
  };
class database {
    async connect(){
        console.log("开始连接redis");
        await client.connect(); 
        client.on("error", function (error) {     // 使用事件发射器，检测错误
            console.log("******error*****");
            console.error(error);
        });
        console.log("连接redis成功!!!");
    }
    async quit(){
        console.log("开始断开redis");
        await client.quit(); 
        client.on("error", function (error) {     // 使用事件发射器，检测错误
            console.log("******error*****");
            console.error(error);
        });
        console.log("断开redis成功!!!");
    }

    async set(key,value,time=360){   // 存储一个 key value
        await client.set(key, value,{EX: time});  //string,string  
    }
    async del(key){   //string
        await client.del(key);
    }
    async get(key){   //string
        let value = await client.get(key);
        return value;
    }
    async rpush(key, value){   //string
        await client.RPUSH(key, value);    
   }
   async lsetlastone(key, value){   //string
       await client.LSET(key,-1,value);         
  }
   async LRANGE(key,from,to){   //string
       let value = await client.LRANGE(key,from,to);
       return value;
   }
}

let rds = new database();
module.exports = rds;
//rds.del("name").then(console.log);
//  rds.connect();
// rds.set("fly","killers");
// rds.get("sun").then(console.log);
// rds.get("nonce").then(console.log);
// rds.quit();








        //console.log("🦋🦋🦋🦋");
        // client.set("name", "Condor Hero", redis.print);
        //await client.set("mars", "yangzong").then(console.log);            // 存储一个 key value
        //console.log("🐥🐥🐥🐥");
        //client.get("name", redis.print);
        // await client.get("mars").then(console.log);
        //console.log("🐝🐝🐝🐝");       
        // client.quit();  // 退出 Redis
        //console.log("🦄🦄🦄🦄");