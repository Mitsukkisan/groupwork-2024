const express = require('express');
const app = express();
app.use(express.static("./public"));
const PORT = process.env.PORT || 5000;

//  webスクレイピング用モジュールをインスタンス化
const puppeteer = require('puppeteer')

//  セブンイレブンの各商品情報の要素
const elements = '.pbNested> div > div.list_inner';

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    //  セブンイレブンの新商品ページに遷移
    await page.goto('https://www.sej.co.jp/products/a/thisweek/');
    //  新商品データを全て取得
    const datas = await page.$$(elements);
    //  各新商品データの商品画像,商品名,価格,販売開始日を取得
    for (data of datas) {
        //  商品画像
        const img = await data.$(' figure > a > img');                                  //  商品名の要素を取得
        const itemImage = await img.evaluate(el => el.getAttribute('data-original'));   //  商品画像のソースを取得
        console.log(itemImage);
        //　商品名
        const name = await data.$(' div.item_ttl > p > a');             //  商品名の要素を取得
        const itemName = await name.evaluate(el => el.textContent);    //  要素のテキスト内容を取得
        console.log(itemName);
        // 商品価格
        const price = await data.$('div > div.item_price > p');             //  商品価格の要素を取得
        const itemPrice = await price.evaluate(el => el.textContent);    //  要素のテキスト内容を取得
        console.log(itemPrice);
        //　販売開始日
        const launch = await data.$('div > div.item_launch > p');             //  商品販売開始日の要素を取得
        const itemLaunch = await launch.evaluate(el => el.textContent);    //  要素のテキスト内容を取得
        console.log(itemLaunch);
        //  販売地域
        const region = await data.$('div > div.item_region > p');             //  商品販売地域の要素を取得
        const itemRegion = await region.evaluate(el => el.textContent);    //  要素のテキスト内容を取得
        console.log(itemRegion);
    }
    await browser.close();
})();
require('dotenv').config();

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
})
app.listen(PORT, () => { console.log(`http://localhost:${PORT}`) });
