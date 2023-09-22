# 中文
运行提醒：
安装redis数据库。
获取相关加密货币的K线数据存到redis中。
通过K线数据计算4h /1d的上述技术指标买卖点
node 对应技术指标的js文件即可
其中const data = JSON.parse(fs.readFileSync('****.json', 'utf-8'));可以换成你想要计算的交易对的json文件。


加密货币每种技术指标都有经典的买卖点，计算并筛选出八大主流技术指标(如MACD、MA、KDJ、EMA、CCI、OBV、RSI、TD)符合买卖点要求的交易对。
1 MACD指标是由两线一柱组合起来形成，快速线为DIF，慢速线为DEA。MACD金叉，DIF由下向上突破 DEA，为买入信号；MACD死叉，DIF由上向下突破 DEA，为卖出信号。快线DIF由下穿破0轴，为买入信号；快线DIF由上而下穿破0轴，为卖出信号。

2 MA（Moving Average，移动平均线）用于平滑价格数据以识别趋势。MA 是通过计算给定周期内价格的平均值来计算的。当短周期的 MA 上穿过长周期的 MA 时，这可能是一个买入信号(5_10金叉，10_30金叉)，表示市场趋势可能从下跌转为上升。相反，当短周期的 MA 下穿过长周期的 MA 时，这可能是一个卖出信号（5_10死叉，10_30死叉），表示市场趋势可能从上升转为下跌。有时交易者会使用多条不同周期的 MA。例如，可以使用 5 日、10 日和 30 日的 MA。当MA5 >MA10>MA30，多头排列（5_10_30多头排列），市场可能处于强烈上升趋势。5_10_30空头排列同理。

3 KDJ又叫随机指标，由3根曲线组成，移动速度最快的是J线，其次是K线，最慢的是D线。当 K线和D线均位于 80 以上时，市场被认为是超买状态，可能会出现回落。当 K线和D线均位于 20 以下时，市场被认为是超卖状态，可能会出现上涨。当K线从下方突破D线（金叉），这通常被视为买入信号。当K线从上方跌破D线（死叉），这通常被视为卖出信号。

4 指数移动平均线（EMA）是一种平滑价格数据的技术，赋予近期数据更高的权重。这使得 EMA 更敏感于价格变动，从而有助于识别趋势的转变.。当短周期的 EMA 上穿过长周期的 EMA 时，这可能是一个买入信号(5_10金叉，10_30金叉)，表示市场趋势可能从下跌转为上升。相反，当短周期的 EMA 下穿过长周期的 MA 时，这可能是一个卖出信号（5_10死叉，10_30死叉），表示市场趋势可能从上升转为下跌。有时交易者会使用多条不同周期的E MA。例如，可以使用 5 日、10 日和 30 日的 EMA。当EMA5 >EMA10>EMA30，多头排列（5_10_30多头排列），市场可能处于强烈上升趋势。5_10_30空头排列同理。

5 CCI（Commodity Channel Index，商品频道指数）是一种动量指标，CCI 的值通常在 -100 到 +100 之间。当 CCI 超过 +100 时，表示资产可能被超买，可能会出现回调。当 CCI 低于 -100 时，表示资产可能被超卖，可能会出现上涨。当 CCI 从负值上穿过零轴时，这可能是一个买入信号。相反，当 CCI 从正值下穿过零轴时，这可能是一个卖出信号。

6 OBV（On Balance Volume，平衡量）用于衡量资金流入和流出。它通过将每日成交量添加到一个累计总和中，根据价格上涨还是下跌来确定资金流的方向。当价格和 OBV 同时上涨时，这可能意味着上涨趋势较强，交易者可以考虑买入。相反，当价格和 OBV 同时下跌时，这可能意味着下跌趋势较强，交易者可以考虑卖出。此处的量价5连升，是值obv和价格最近连续5根K线都在上涨，其他同理。

7 相对强弱指数（Relative Strength Index，简称 RSI）是一种常用的动量指标，用于衡量资产价格变化的速度和幅度。RSI 的取值范围在 0 到 100 之间。RSI 值高于 70 时，被认为是超买状态，可能会出现回落。当 RSI 值低于 30 时，被认为是超卖状态，可能会出现上涨。RSI 的中线为 50。当 RSI 从下方突破 50，表明市场上涨的力量较强，可能继续上涨。当 RSI 从上方跌破 50，表明市场下跌的力量较强，可能继续下跌。

8 汤姆·德马克（Tom DeMark）指数旨在确定资产价格趋势疲劳和可能的反转点。在一个上涨趋势中，当今天的收盘价低于四天前的收盘价时，计算一个购买设定。如果该条件连续满足 9 天，形成一个完整的购买设定。当形成一个完整的九天买入设定时，可能表明趋势即将反转，市场即将出现反弹。此时可以考虑买入。。在一个下跌趋势中，当今天的收盘价高于四天前的收盘价时，计算一个售出设定。如果该条件连续满足 9 天，形成一个完整的售出设定。当形成一个完整的九天卖出设定时，可能表明趋势即将反转，市场即将出现回落。此时可以考虑卖出。

# English
Reminder to Run:
Install the Redis database.
Retrieve K-line data for relevant cryptocurrencies and store it in Redis.
Calculate technical indicators for 4-hour (4h) and 1-day (1d) timeframes based on the K-line data.
Execute the corresponding JavaScript file for the technical indicators using Node.js.
You can replace `const data = JSON.parse(fs.readFileSync('****.json', 'utf-8'));` with the JSON file for the trading pair you want to calculate.

Please note that you'll need to replace '****.json' with the actual filename and path of the JSON file containing the trading data you want to use.
Each technical indicator has its classic buy and sell points. We filter all trading pairs that meet the criteria of the top eight mainstream technical indicators (MACD, MA, KDJ, EMA, CCI, OBV, RSI, TD)

1 The MACD indicator consists of two lines and a histogram. The fast line is called the DIF, and the slow line is called the DEA. When the DIF crosses above the DEA from below, it generates a bullish signal known as a MACD bullish crossover,indicating a buy signal. Conversely, when the DIF crosses below the DEA from above, it generates a bearish signal known as a MACD bearish crossover,indicating a sell signal. Additionally, when the DIF crosses below the zero axis, it generates a buy signal, and when the DIF crosses above the zero axis, it generates a sell signal.

2 The Moving Average (MA) is used to smooth price data and identify trends. It is calculated by averaging the prices over a given period. When a shorter-term MA crosses above a longer-term MA, it may generate a buy signal (such as a 5_10 golden cross or a 10_30 golden cross), indicating a potential shift from a downtrend to an uptrend in the market. Conversely, when a shorter-term MA crosses below a longer-term MA, it may generate a sell signal (such as a 5_10 death cross or a 10_30 death cross), indicating a potential shift from an uptrend to a downtrend. Traders sometimes use multiple MA lines with different periods. For example, they may use 5-day, 10-day, and 30-day MAs. When MA5 > MA10 > MA30, it is called a bullish alignment (5_10_30 bullish alignment), suggesting a strong upward trend in the market. The same principle applies to bearish alignments in a 5_10_30 bearish alignment.

3 KDJ, also known as the stochastic oscillator, consists of three lines. The fastest line is the J line, followed by the K line, and the slowest line is the D line. When both the K line and D line are above 80, the market is considered overbought, indicating a potential downturn. When both the K line and D line are below 20, the market is considered oversold, suggesting a possible upward movement. A bullish signal is generated when the K line crosses above the D line (bullish crossover), indicating a buy signal. Conversely, a bearish signal is generated when the K line crosses below the D line (bearish crossover), indicating a sell signal.

4 Exponential Moving Average (EMA) is a smoothing technique used for price data that assigns higher weightage to recent data. This makes EMA more responsive to price changes and helps in identifying trend transitions. When a shorter-term EMA crosses above a longer-term EMA, it may generate a buy signal (such as a 5_10 golden cross or a 10_30 golden cross), indicating a potential shift from a downtrend to an uptrend in the market. Conversely, when a shorter-term EMA crosses below a longer-term EMA, it may generate a sell signal (such as a 5_10 death cross or a 10_30 death cross), indicating a potential shift from an uptrend to a downtrend. Traders sometimes use multiple EMAs with different periods. For example, they may use 5-day, 10-day, and 30-day EMAs. When EMA5 > EMA10 > EMA30, it is called a bullish alignment (5_10_30 bullish alignment), suggesting a strong upward trend in the market. The same principle applies to bearish alignments in a 5_10_30 bearish alignment.

5 CCI (Commodity Channel Index) is a momentum indicator. The CCI value typically ranges between -100 and +100. When the CCI surpasses +100, it indicates that the asset may be overbought, suggesting a potential pullback. When the CCI falls below -100, it indicates that the asset may be oversold, suggesting a potential uptrend. A buy signal is generated when the CCI crosses above the zero line from negative values. Conversely, a sell signal is generated when the CCI crosses below the zero line from positive values.

6 On Balance Volume (OBV) is used to measure the flow of funds in and out of a security. It does this by adding the daily trading volume to a cumulative total based on whether the price closes higher or lower. When both the price and OBV are rising, it may indicate a strong uptrend, and traders may consider buying. Conversely, when both the price and OBV are falling, it may indicate a strong downtrend, and traders may consider selling. In the context of volume and price 5 consecutive up, it means that the OBV and price have been continuously rising for the past five candles on the chart. The same principle applies to other scenarios, such as volume and price 5 consecutive down.

7 The Relative Strength Index (RSI) is a commonly used momentum indicator that measures the speed and magnitude of price changes in an asset. The RSI value ranges from 0 to 100. When the RSI value is above 70, it is considered overbought, indicating a potential downturn. When the RSI value is below 30, it is considered oversold, suggesting a possible upward movement. The midline of the RSI is at 50. When the RSI crosses above 50 from below, it indicates strong buying pressure in the market and suggests a potential continuation of an upward trend. When the RSI crosses below 50 from above, it indicates strong selling pressure in the market and suggests a potential continuation of a downward trend.

8 The Tom DeMark Sequential Indicator is designed to identify potential trend exhaustion and reversal points in asset prices. In an uptrend, a buy setup is calculated when today's closing price is lower than the closing price four days ago. If this condition is met for nine consecutive days, it forms a complete buy setup. The formation of a complete nine-day buy setup suggests a potential trend reversal and an upcoming market rebound. It may be considered a buying opportunity at this point. In a downtrend, a sell setup is calculated when today's closing price is higher than the closing price four days ago. If this condition is met for nine consecutive days, it forms a complete sell setup. The formation of a complete nine-day sell setup suggests a potential trend reversal and an upcoming market decline. It may be considered a selling opportunity at this point.



